/**
 * What a page actually does, read from the page's own file.
 *
 * The strongest signal in this codebase is the RTK Query hook. A page that calls
 * useListNasQuery / useCreateNasMutation / useDeleteNasMutation can browse,
 * create and delete NAS entries — that is not a guess about the page, it is the
 * page's own call surface, and the naming (`use<Verb><Subject><Query|Mutation>`)
 * is regular enough to map mechanically.
 *
 * Anything whose verb is not recognised is reported VERBATIM rather than
 * described, so a new naming convention shows up as an unlabelled operation
 * instead of a confidently wrong sentence.
 */
import { readFile, access } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface PageFacts {
  operations: { verb: string; evidence: string[] }[];
  unmapped: string[];
  columns: string[];
  tabs: string[];
  /**
   * Components the page opens that perform their own API calls — the drawers and
   * modals its buttons lead to. Their operations are merged into `operations`,
   * because to a user they are actions on this page.
   */
  opens: string[];
  /** Leading block comment of the file — this codebase states intent there. */
  doc?: string;
}

const VERBS: [RegExp, string][] = [
  [/^List/, 'Browse and search'],
  [/^Get|^Fetch/, 'View'],
  [/^Create|^Add/, 'Create'],
  [/^Update|^Edit|^Save|^Patch/, 'Edit'],
  [/^Delete|^Remove|^Destroy/, 'Delete'],
  [/^Export|^Download/, 'Export'],
  [/^Import|^Upload/, 'Import or upload'],
  [/^Test/, 'Run a test'],
  [/^Send/, 'Send'],
  [/^Start|^Run|^Trigger/, 'Start'],
  [/^Stop|^Cancel|^Abort/, 'Stop'],
  [/^Restart|^Reboot/, 'Restart'],
  [/^Reset/, 'Reset'],
  [/^Rotate/, 'Rotate'],
  [/^Enable|^Disable|^Toggle/, 'Enable or disable'],
  [/^Assign|^Attach/, 'Assign'],
  [/^Unassign|^Detach/, 'Unassign'],
  [/^Approve/, 'Approve'],
  [/^Reject|^Deny/, 'Reject'],
  [/^Revoke/, 'Revoke'],
  [/^Sync|^Refresh|^Reload/, 'Refresh'],
  [/^Apply|^Push|^Deploy/, 'Apply or push'],
  [/^Upgrade/, 'Upgrade'],
  [/^Backup/, 'Back up'],
  [/^Restore/, 'Restore'],
  [/^Search/, 'Search'],
  [/^Count/, 'Count'],
  [/^Change/, 'Change'],
  [/^Validate|^Check/, 'Validate'],
  [/^Generate/, 'Generate'],
  [/^Preview/, 'Preview'],
  [/^Move/, 'Move'],
  [/^Clone|^Copy|^Duplicate/, 'Duplicate'],
  [/^Recover/, 'Recover'],
  // `^Setup` MUST precede `^Set`: otherwise setupHaDevice matches `^Set` and the
  // remainder renders as "Set up ha device" with the verb cut mid-word.
  [/^Setup/, 'Set up'],
  [/^Set/, 'Set'],
  [/^Open/, 'Open'],
  [/^Close/, 'Close'],
  [/^Poll/, 'Poll'],
];

/** Abbreviations this codebase uses. Left alone they read like typos. */
const WORDS: Record<string, string> = {
  nas: 'NAS', ha: 'HA', dr: 'DR', ca: 'certificate authority', ip: 'IP',
  ips: 'IPS', vpn: 'VPN', vrf: 'VRF', bgp: 'BGP', ospf: 'OSPF', rip: 'RIP',
  pim: 'PIM', qos: 'QoS', sla: 'SLA', dpi: 'DPI', acl: 'ACL', cpe: 'CPE',
  fw: 'firewall', pki: 'PKI', ztp: 'ZTP', wifi: 'Wi-Fi', dns: 'DNS',
  dhcp: 'DHCP', nat: 'NAT', pbr: 'PBR', mwan: 'MWAN', tacacs: 'TACACS+',
  radius: 'RADIUS', sdwan: 'SD-WAN', sdlan: 'SD-LAN', ipam: 'IPAM',
  org: 'organization', orgs: 'organizations', cfg: 'configuration',
  pwd: 'password', auth: 'authentication', perm: 'permission',
};

function humanise(subject: string): string {
  const words = subject
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => WORDS[w.toLowerCase()] ?? w.toLowerCase());
  return words.join(' ').trim();
}

/**
 * `useCreateDeviceGroupMutation` -> Create device group
 * `api.deleteDevice`             -> Delete device
 *
 * BOTH API layers are read, deliberately. This SPA fetches through two of them —
 * RTK Query in services/api.js and the plain client in api/client.js — and a page
 * that uses only the second (DeviceList is one) would otherwise be documented as
 * having no operations at all, which is worse than saying nothing.
 */
function classify(name: string): { verb: string; subject: string; bulk: boolean } | null {
  const core = name.replace(/^use/, '').replace(/(Query|Mutation)$/, '');
  // client.js methods are camelCase (`listDevices`); hooks are PascalCase after
  // `use` is stripped. Normalise so one verb table serves both.
  let norm = core.charAt(0).toUpperCase() + core.slice(1);

  // `Bulk` modifies a verb, it is not one. Treating it as a verb turned
  // bulkBackupConfig into "Act on many at once backup config" — the real verb
  // (back up) was swallowed and the sentence stopped being English.
  let bulk = false;
  if (/^Bulk/.test(norm)) { bulk = true; norm = norm.replace(/^Bulk/, ''); }

  for (const [re, verb] of VERBS) {
    if (re.test(norm)) {
      const subject = humanise(norm.replace(re, ''));
      return { verb, subject, bulk };
    }
  }
  return null;
}

/**
 * Every API call made in a source file, in either layer.
 *
 * A call paren is REQUIRED. Without it the bare hook name on an `import { … }`
 * line counted as usage, so a page that imported a hook and never called it was
 * documented as performing that operation.
 */
export function rawCalls(src: string): Set<string> {
  return new Set([
    ...[...src.matchAll(/\b(use[A-Z][A-Za-z0-9]*(?:Query|Mutation))\s*\(/g)].map((m) => m[1]),
    ...[...src.matchAll(/\bapi\.([a-z][A-Za-z0-9]*)\s*\(/g)].map((m) => m[1]),
  ]);
}

export function factsFromSource(src: string, indirect?: Map<string, string>): PageFacts {
  // ---- operations, from every API call the page makes, in either layer
  const own = rawCalls(src);
  const opens = [...new Set([...(indirect?.values() ?? [])])].sort();
  const grouped = new Map<string, Set<string>>();
  const unmapped: string[] = [];
  for (const h of [...new Set([...own, ...(indirect?.keys() ?? [])])].sort()) {
    const c = classify(h);
    if (!c) { unmapped.push(h); continue; }
    const phrase = (c.subject ? `${c.verb} ${c.subject}` : c.verb) + (c.bulk ? ' (in bulk)' : '');
    if (!grouped.has(phrase)) grouped.set(phrase, new Set());
    grouped.get(phrase)!.add(h);
  }
  const operations = [...grouped.entries()]
    .map(([verb, set]) => ({ verb, evidence: [...set] }))
    .sort((a, b) => a.verb.localeCompare(b.verb));

  // ---- columns: `{ key: 'x', title: 'Human label' … }`
  const columns = [
    ...new Set([...src.matchAll(/key:\s*'[^']*'\s*,\s*title:\s*'([^']{2,40})'/g)].map((m) => m[1])),
  ];

  // ---- tabs: a `TABS`-style array of { key, label }
  const tabs: string[] = [];
  const tabsBlock = /const\s+(?:TABS|SUBTABS|TAB_LIST)\s*=\s*\[([\s\S]*?)\n\]/.exec(src);
  if (tabsBlock) {
    for (const m of tabsBlock[1].matchAll(/label:\s*'([^']{2,40})'/g)) tabs.push(m[1]);
  }

  // ---- header comment
  const head = /^\s*\/\*\*?([\s\S]*?)\*\//.exec(src);
  let doc: string | undefined;
  if (head) {
    const text = head[1].split('\n').map((l) => l.replace(/^\s*\*ic?/, '').trim()).join(' ').replace(/\s+/g, ' ').trim();
    if (text.length > 60) doc = text;
  }

  return { operations, unmapped, columns, tabs, opens, doc };
}

/**
 * The API modules DEFINE every method; importing one is not calling them all.
 * Following them attributed the whole 380-method surface to every page.
 */
const API_MODULE = /(services[/\\]api|api[/\\]client)\.js$/;

const fileExists = (p: string) => access(p).then(() => true, () => false);

/** Resolve a relative import the way the bundler would. */
async function resolveImport(fromFile: string, spec: string): Promise<string | undefined> {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const cand of [base, `${base}.jsx`, `${base}.js`, path.join(base, 'index.jsx'), path.join(base, 'index.js')]) {
    if (await fileExists(cand)) return cand;
  }
  return undefined;
}

/**
 * A page's facts, INCLUDING the components it opens.
 *
 * Reading only the route's own file missed 63 real operations across 19 pages:
 * "Add device", "Recover deleted devices" and "Apply template" live in the
 * drawers DeviceList opens, not in DeviceList itself — but to someone using the
 * console they are buttons on the devices page.
 *
 * One level deep only. Two levels reaches shared primitives (tables, pickers)
 * whose calls belong to those components rather than to this page.
 */
export async function factsForFile(file: string): Promise<PageFacts | undefined> {
  let src: string;
  try {
    src = await readFile(file, 'utf8');
  } catch {
    return undefined;
  }

  const own = rawCalls(src);
  const indirect = new Map<string, string>();

  for (const m of src.matchAll(/import\s+[^;]*?\s+from\s+'(\.[^']+)'/g)) {
    const target = await resolveImport(file, m[1]);
    if (!target || API_MODULE.test(target) || target === file) continue;
    let sub: string;
    try {
      sub = await readFile(target, 'utf8');
    } catch {
      continue;
    }
    for (const c of rawCalls(sub)) {
      // Keep the FIRST component found to contribute a call, so the provenance
      // list names one real source rather than the last one scanned.
      if (!own.has(c) && !indirect.has(c)) indirect.set(c, path.basename(target, path.extname(target)));
    }
  }

  return factsFromSource(src, indirect);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readRoutes } = await import('./extract-routes.ts');
  const routes = await readRoutes();
  let withOps = 0, totalUnmapped = 0;
  for (const r of routes.values()) {
    if (!r.file) continue;
    const f = await factsForFile(r.file);
    if (!f) continue;
    if (f.operations.length) withOps++;
    totalUnmapped += f.unmapped.length;
  }
  console.log(`${withOps}/${routes.size} routes expose recognised operations · ${totalUnmapped} unmapped hooks\n`);
  for (const p of ['/devices', '/radius/nas', '/groups']) {
    const r = routes.get(p);
    if (!r?.file) continue;
    const f = await factsForFile(r.file);
    console.log(`${p}  (${r.component})`);
    for (const o of f?.operations.slice(0, 6) ?? []) console.log(`   - ${o.verb}`);
    if (f?.columns.length) console.log(`   columns: ${f.columns.slice(0, 8).join(', ')}`);
    if (f?.tabs.length) console.log(`   tabs: ${f.tabs.join(', ')}`);
    if (f?.unmapped.length) console.log(`   unmapped: ${f.unmapped.slice(0, 4).join(', ')}`);
    console.log();
  }
}
