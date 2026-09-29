/**
 * How a firmware upgrade runs, read from the code that runs it.
 *
 * Firmware is the one area of the console where the interesting part is not the
 * screen. The Firmware page lists builds, categories and batches; what an
 * operator actually needs to know — which sysupgrade flags a flash is sent with,
 * what each status means, what the router reports back and which of those raise
 * an alert — lives in four files, three of them in the Django app rather than in
 * the React page. The facts extractor reads a page's own component and the API
 * calls it makes, so none of it was visible and none of it was documented.
 *
 * All of it is literal:
 *   - the sysupgrade flags are a `UPGRADE_FLAGS` array in the device panel,
 *     mirroring the upgrader's own SCHEMA
 *   - both status vocabularies are `STATUS_CHOICES` tuples on the upgrade models
 *   - the router event -> alert signal map is `EVENT_TO_SIGNAL_NAME`, and the
 *     log's outcome groups are the frozensets beside it
 *
 * Read on every run rather than copied into a description: three of these files
 * are backend, and a description is pinned only to the frontend files it was
 * written from, so a copy would drift with nothing to notice.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTROLLER, FE } from './config.ts';

export interface UpgradeFlag {
  flag: string;
  label: string;
  /** On unless the operator turns it off. */
  on: boolean;
  /** The upgrader marks this one as dangerous. */
  danger: boolean;
}
export interface StatusValue {
  value: string;
  label: string;
}
export interface FirmwareEvent {
  event: string;
  signal: string;
  severity: string;
}
export interface FirmwareFacts {
  flags: UpgradeFlag[];
  batchStatuses: StatusValue[];
  deviceStatuses: StatusValue[];
  events: FirmwareEvent[];
  /** Signal name -> the wording the alert policy form shows. */
  signalLabels: Record<string, string>;
  successEvents: string[];
  failedEvents: string[];
  checkEvents: string[];
  /** Seconds of history suppressed on a device's first pull. */
  firstPullGuard?: number;
}

const PANEL = path.join(FE, 'components', 'DeviceFirmwarePanel.jsx');
const CONSTANTS = path.join(CONTROLLER, 'nexapp_firmware', 'constants.py');
const MODELS = path.join(CONTROLLER, 'nexapp_firmware', 'models.py');
const UPGRADER = path.join(
  CONTROLLER, 'vendor', 'nexapp-firmware-upgrader', 'nexapp_firmware_upgrader', 'base', 'models.py',
);

const read = (f: string) => readFile(f, 'utf8').catch(() => '');

/** `("scheduled", _("scheduled")), …` inside the named class's STATUS_CHOICES. */
function statusChoices(src: string, className: string): StatusValue[] {
  const at = src.indexOf(`class ${className}`);
  if (at < 0) return [];
  const block = /STATUS_CHOICES\s*=\s*\(([\s\S]*?)\n\s*\)/.exec(src.slice(at));
  if (!block) return [];
  return (
    [...block[1].matchAll(/^\s*\(\s*"([^"]+)"\s*,\s*_\(\s*"([^"]*)"\s*\)/gm)]
      .map((m) => ({ value: m[1], label: m[2] }))
  );
}

/** The quoted strings in a `frozenset({...})`, comments stripped. */
function frozenset(src: string, name: string): string[] {
  const m = new RegExp(`${name}\\s*=\\s*frozenset\\(\\{([\\s\\S]*?)\\}\\)`).exec(src);
  if (!m) return [];
  return [...m[1].replace(/#[^\n]*/g, '').matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

export async function readFirmwareFacts(): Promise<FirmwareFacts | undefined> {
  const [panel, constants, models, upgrader] = await Promise.all(
    [PANEL, CONSTANTS, MODELS, UPGRADER].map(read),
  );
  if (!panel && !constants) return undefined;

  // --- sysupgrade flags, from the array the form is built out of
  const flagsBlock = /const UPGRADE_FLAGS\s*=\s*\[([\s\S]*?)\n\]/.exec(panel);
  const flags: UpgradeFlag[] = flagsBlock
    ? [...flagsBlock[1].matchAll(/\{[^{}]*?flag:\s*'([^']+)'[^{}]*?\}/g)].map((m) => {
        const row = m[0];
        const label = /label:\s*'((?:[^'\\]|\\.)*)'/.exec(row)?.[1] ?? '';
        return {
          flag: m[1],
          label: label.replace(/\\'/g, "’"),
          on: /\bdef:\s*true\b/.test(row),
          danger: /\bdanger:\s*true\b/.test(row),
        };
      })
    : [];

  // --- router event -> alert signal and severity
  const evBlock = /EVENT_TO_SIGNAL_NAME\s*=\s*\{([\s\S]*?)\n\}/.exec(constants);
  const events: FirmwareEvent[] = evBlock
    ? [...evBlock[1].replace(/#[^\n]*/g, '').matchAll(
        /"([^"]+)"\s*:\s*\(\s*\n?\s*"([^"]+)"\s*,\s*\n?\s*"([^"]+)"/g,
      )].map((m) => ({ event: m[1], signal: m[2], severity: m[3] }))
    : [];

  const sigBlock = /SIGNAL_CHOICES\s*=\s*\[([\s\S]*?)\n\]/.exec(models);
  const signalLabels: Record<string, string> = {};
  if (sigBlock) {
    for (const m of sigBlock[1].matchAll(/\(\s*"([^"]+)"\s*,\s*_\(\s*"([^"]*)"\s*\)/g)) {
      signalLabels[m[1]] = m[2];
    }
  }

  const guard = /FIRST_PULL_GUARD_SECONDS\s*=\s*([0-9*\s]+)/.exec(constants)?.[1];
  const firstPullGuard = guard
    ? guard.split('*').reduce((a, b) => a * Number(b.trim()), 1)
    : undefined;

  return {
    flags,
    batchStatuses: statusChoices(upgrader, 'AbstractBatchUpgradeOperation'),
    deviceStatuses: statusChoices(upgrader, 'AbstractUpgradeOperation'),
    events,
    signalLabels,
    successEvents: frozenset(constants, 'UPGRADE_SUCCESS_EVENTS'),
    failedEvents: frozenset(constants, 'UPGRADE_FAILED_EVENTS'),
    checkEvents: frozenset(constants, 'SYSTEM_CHECK_EVENTS'),
    firstPullGuard: Number.isFinite(firstPullGuard) ? firstPullGuard : undefined,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const f = await readFirmwareFacts();
  if (!f) console.log('no firmware source found');
  else {
    console.log(`sysupgrade flags (${f.flags.length}):`);
    for (const x of f.flags) console.log(`   ${x.flag.padEnd(4)}${x.on ? 'on ' : '   '}${x.danger ? '! ' : '  '}${x.label}`);
    console.log(`\nbatch statuses : ${f.batchStatuses.map((s) => `${s.value}=${s.label}`).join(', ')}`);
    console.log(`device statuses: ${f.deviceStatuses.map((s) => `${s.value}=${s.label}`).join(', ')}`);
    console.log(`\nevents (${f.events.length}):`);
    for (const e of f.events) console.log(`   ${e.event.padEnd(38)}${e.severity.padEnd(9)}${f.signalLabels[e.signal] ?? e.signal}`);
    console.log(`\nsuccess: ${f.successEvents.join(', ')}`);
    console.log(`failed : ${f.failedEvents.join(', ')}`);
    console.log(`checks : ${f.checkEvents.join(', ')}`);
    console.log(`first-pull guard: ${f.firstPullGuard}s`);
  }
}
