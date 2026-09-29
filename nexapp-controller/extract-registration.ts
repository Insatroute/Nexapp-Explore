/**
 * How a device gets into the controller, read from the code that lets it in.
 *
 * This is the one workflow the handbook had nothing on. Every page described a
 * screen, and registration is not a screen — a router presents a shared secret
 * and the controller creates the row. The settings that govern it sit on the
 * organization, the key is derived in the device model, and the admission gate
 * is applied in the register view.
 *
 * All of it is declarative: model fields with their own help text, two Django
 * settings with defaults, and the field list the register view will update on a
 * device that already exists.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTROLLER } from './config.ts';
import { clean } from './read-form-fields.ts';

export interface OrgSetting {
  name: string;
  label: string;
  /** 'on', 'off', or '' when it is not a boolean. */
  def: string;
  help: string;
}
export interface RegistrationFacts {
  settings: OrgSetting[];
  /** Django settings that shape how the key is made. */
  consistent?: boolean;
  hardwareId?: boolean;
  /** The inputs the key is derived from. */
  keyInputs?: string[];
  keyLength?: number;
  /** Fields the controller refreshes when a known device registers again. */
  updatable: string[];
  /** The path the agent posts its registration to. */
  endpoint?: string;
  /** Exactly what the controller answers when it refuses. */
  refusals: string[];
  /** The UCI config packages the agent has used, newest first. */
  agentPackages: string[];
  /** The agent's own settings, as UCI keys under its package. */
  agentKeys: string[];
}

const BASE = path.join(CONTROLLER, 'nexapp_controller', 'config');
const MULTI = path.join(BASE, 'base', 'multitenancy.py');
const DEVICE = path.join(BASE, 'base', 'device.py');
const SETTINGS = path.join(BASE, 'settings.py');
const VIEWS = path.join(BASE, 'controller', 'views.py');
const URLS = path.join(BASE, 'utils.py');
// The firmware upgrader probes the agent's config across firmware generations,
// and the monitoring agent's own script names the settings it reads. Between
// them they describe the router half of registration, which nothing in the
// controller's own code does.
const UPGRADER = path.join(
  CONTROLLER, 'vendor', 'nexapp-firmware-upgrader', 'nexapp_firmware_upgrader', 'upgraders', 'openwrt.py',
);
const AGENT = path.join(
  CONTROLLER, 'vendor', 'nexapp-monitoring', 'nexapp_monitoring', 'device', 'migrations', '__init__.py',
);

const read = (f: string) => readFile(f, 'utf8').catch(() => '');

export async function readRegistrationFacts(): Promise<RegistrationFacts | undefined> {
  const [multi, device, settings, views, urls, upgrader, agent] = await Promise.all(
    [MULTI, DEVICE, SETTINGS, VIEWS, URLS, UPGRADER, AGENT].map(read),
  );
  if (!multi) return undefined;

  // Model fields on the organization's config settings. Only the ones that
  // govern registration — the rest of the model is templates and variables.
  const wanted = ['registration_enabled', 'require_serial_admission', 'shared_secret'];
  const out: OrgSetting[] = [];
  for (const name of wanted) {
    const m = new RegExp(`${name}\\s*=\\s*[\\w.]+\\(([\\s\\S]*?)\\n    \\)`).exec(multi);
    if (!m) continue;
    const body = m[1];
    const label = /_\(\s*"([^"]+)"/.exec(body)?.[1] ?? name.replace(/_/g, ' ');
    // help_text is often split across lines by the formatter.
    const helpBlock = /help_text=_\(\s*([\s\S]*?)\n?\s*\)/.exec(body)?.[1] ?? '';
    const help = clean([...helpBlock.matchAll(/"([^"]*)"/g)].map((x) => x[1]).join(''));
    const d = /default=(True|False)/.exec(body)?.[1];
    out.push({ name, label: clean(label), def: d === 'True' ? 'on' : d === 'False' ? 'off' : '', help });
  }

  const flag = (n: string) =>
    new RegExp(`${n}\\s*=\\s*get_setting\\("${n}",\\s*(True|False)\\)`).exec(settings)?.[1];

  // `sha256("{}+{}".format(keybase, shared_secret))`, truncated.
  // Scoped to generate_key: `else self.<field>` appears elsewhere in the model,
  // and reading the file as a whole gave the key a field it is not made from.
  const keyFn = /def generate_key\([\s\S]*?\n    def /.exec(device)?.[0] ?? '';
  const keyInputs = /hash_key = sha256/.test(keyFn)
    ? [
        /keybase = \(\s*self\.(\w+)/.exec(keyFn)?.[1] ?? 'hardware_id',
        /else self\.(\w+)/.exec(keyFn)?.[1] ?? 'mac_address',
      ]
    : undefined;
  const keyLength = Number(/hexdigest\(\)\[:(\d+)\]/.exec(keyFn)?.[1]) || undefined;

  const updatable = (/UPDATABLE_FIELDS\s*=\s*\[([^\]]*)\]/.exec(views)?.[1] ?? '')
    .split(',')
    .map((x) => clean(x).replace(/^"|"$/g, ''))
    .filter(Boolean);

  const endpoint = /path\(\s*"([^"]*device\/register\/)"/.exec(urls)?.[1];

  // The exact text the router gets back, so the page can quote it.
  const refusals = [...views.matchAll(/"(error: [^"]+)"/g)]
    .map((m) => m[1])
    .filter((x, i, a) => a.indexOf(x) === i);

  const agentPackages = [...(/AGENT_UUID_UCI_KEYS\s*=\s*\(([\s\S]*?)\)/.exec(upgrader)?.[1] ?? '')
    .matchAll(/"([\w]+)\.http\.uuid"/g)].map((m) => m[1]);

  const agentKeys = [...agent.matchAll(/uci get \w+\.(http\.\w+)/g)]
    .map((m) => m[1])
    .filter((x, i, a) => a.indexOf(x) === i);

  return {
    settings: out,
    endpoint,
    refusals,
    agentPackages,
    agentKeys,
    consistent: flag('CONSISTENT_REGISTRATION') === 'True',
    hardwareId: flag('HARDWARE_ID_ENABLED') === 'True',
    keyInputs,
    keyLength,
    updatable,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await readRegistrationFacts();
  if (!r) console.log('no registration source found');
  else {
    for (const s of r.settings) console.log(`  ${s.label.padEnd(30)}${s.def.padEnd(5)}${s.help}`);
    console.log(`\nconsistent registration: ${r.consistent}   hardware id: ${r.hardwareId}`);
    console.log(`key from: ${r.keyInputs?.join(' or ')} + shared secret, ${r.keyLength} chars`);
    console.log(`refreshed on re-register: ${r.updatable.join(', ')}`);
    console.log(`endpoint: ${r.endpoint}`);
    console.log(`refusals: ${r.refusals.join(' | ')}`);
    console.log(`agent packages: ${r.agentPackages.join(', ')}`);
    console.log(`agent keys: ${r.agentKeys.join(', ')}`);
  }
}
