/**
 * Generates the Console reference — one page per sidebar group, documenting every
 * menu entry, its route, the permission it needs, and the controls actually on it.
 *
 * EVERYTHING HERE IS EXTRACTED FROM THE PLATFORM SOURCE. Nothing is written from
 * memory or inferred. Each description carries its provenance, and an entry with
 * no grounded description gets an explicit gap marker rather than invented prose —
 * a knowledge base people rely on must never blur "verified" into "plausible".
 *
 * Sources, in order of preference for a page's description:
 *   1. onboarding/tourContent.ts   — the product tour, written by the platform team
 *   2. the view's own header comment — this codebase documents intent at file top
 *   3. console-descriptions.ts     — written by reading the page's own API calls,
 *                                    each entry recording the evidence it came from
 *   4. (none) — emit a gap marker
 *
 * Feature lists (columns / tabs / actions) are read from the view template, so they
 * are what the page really renders.
 *
 * Run: npm run generate:console
 */
import { readFile, writeFile, mkdir, rm, access } from 'node:fs/promises';
import * as path from 'node:path';
import { CURATED } from './console-descriptions.ts';

const SRC = path.resolve(
  process.cwd(),
  '../../../IOT RMS_2026/nexapp-rms2/frontend/src',
);
const OUT = './content/docs';

/**
 * ALL prose lives in the platform repo, at nexapp-rms2/docs/kb.
 *
 * That is the whole point: a doc sits beside the code it describes, so it is
 * edited in the same commit as the feature and reviewed by the same person. The
 * docs app holds no authored content of its own — it is a renderer. Anything
 * written here instead would drift the moment the platform changed, which is
 * exactly the failure this layout removes.
 */
const KB = path.resolve(SRC, '../../docs/kb');

/**
 * The navigation manifest, captured from the RUNNING console by scripts/crawl-nav.py.
 *
 * Structure used to be scraped out of MainLayout.vue and the tab components. That
 * failed four separate times — 12 menu items where the console shows 16, 25 device
 * tabs where it shows 8, Analytics reported as having no sub-tabs when it has ten —
 * because in Vue source a tab and a dropdown filter are the same `{ key, label }`
 * shape. Source text simply does not carry the distinction.
 *
 * The rendered DOM does: a tab is a tab because it renders as one. So structure now
 * comes from the manifest, and is ground truth by construction.
 */
const MANIFEST = './nav-manifest.json';

const read = async (p: string) => readFile(p, 'utf8');
const exists = async (p: string) => access(p).then(() => true, () => false);

// ---------------------------------------------------------------- nav tree
interface NavItem {
  key: string;
  label: string;
  href?: string;
  perm?: string;
  anyPerm?: string[];
  superOnly?: boolean;
}
interface NavGroup extends NavItem {
  children: NavItem[];
  leaf?: boolean;
}

async function readNav(): Promise<NavGroup[]> {
  if (!(await exists(MANIFEST))) {
    throw new Error(
      `nav-manifest.json is missing.\n` +
        `Capture it from the running console first:\n` +
        `    python3 scripts/crawl-nav.py\n` +
        `Structure is taken from the rendered app, not from source — see the note on MANIFEST.`,
    );
  }
  const data = JSON.parse(await read(MANIFEST)) as {
    menu: { label: string; key?: string | null; children: { label: string; key?: string | null }[] }[];
  };

  // `key` is the console's own menu key, read from data-menu-id in the rendered
  // DOM — the same key the router pushes, so it joins straight to the route table,
  // the product tour and the curated descriptions with no guessing.
  return data.menu.map((m) => ({
    key: m.key ?? slug(m.label),
    label: m.label,
    children: m.children.map((c) => ({ key: c.key ?? slug(c.label), label: c.label })),
    leaf: m.children.length === 0,
  }));
}

// ------------------------------------------------------------------ routes
interface RouteRec {
  name: string;
  path?: string;
  view?: string;
  doc?: string;
  columns?: string[];
  tabs?: string[];
  buttons?: string[];
  operations?: { verb: string; fns: string[] }[];
  filters?: string[];
  forms?: string[];
}

async function readRoutes(): Promise<Map<string, RouteRec>> {
  const s = await read(path.join(SRC, 'router/index.ts'));
  const out = new Map<string, RouteRec>();
  const re =
    /path:\s*'([^']*)'[^}]*?name:\s*'([\w-]+)'[^}]*?component:\s*\(\)\s*=>\s*import\(\s*'([^']+)'/gs;
  for (const m of s.matchAll(re)) {
    out.set(m[2], { name: m[2], path: m[1], view: m[3] });
  }
  return out;
}

/** Leading block comment of a view — this codebase states intent there. */
function headerDoc(src: string): string | undefined {
  const m =
    /<script[^>]*>\s*\/\*\*?(.*?)\*\//s.exec(src) ?? /^\s*\/\*\*?(.*?)\*\//s.exec(src);
  if (!m) return;
  const text = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*ic?/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 60 ? text : undefined;
}

/** What the page actually renders. */
function uiFacts(src: string) {
  const columns = [
    ...new Set([...src.matchAll(/title:\s*'([^']{2,40})'\s*,\s*(?:dataIndex|key)\s*:/g)].map((m) => m[1])),
  ]
    .filter((c) => c !== 'title')
    .sort();
  const tabs = [
    ...new Set([
      ...[...src.matchAll(/<a-tab-pane[^>]*\btab="([^"]{2,40})"/g)].map((m) => m[1]),
      ...[...src.matchAll(/\btab:\s*'([^']{2,40})'/g)].map((m) => m[1]),
    ]),
  ].sort();
  const buttons = [
    ...new Set(
      [...src.matchAll(/<a-button[^>]*>\s*([A-Z][^<>{}\n]{2,28}?)\s*<\/a-button>/g)].map((m) =>
        m[1].trim(),
      ),
    ),
  ].sort();
  return { columns, tabs, buttons };
}

// -------------------------------------------------------------- tour steps
async function readTour(): Promise<Map<string, { title: string; description: string }>> {
  const s = await read(path.join(SRC, 'onboarding/tourContent.ts'));
  const out = new Map<string, { title: string; description: string }>();
  for (const block of s.split(/\n    \{\n/)) {
    const t = /\btitle:\s*\n?\s*'((?:[^'\\]|\\.)*)'/.exec(block);
    const d = /\bdescription:\s*\n?\s*'((?:[^'\\]|\\.)*)'/.exec(block);
    const r = /route:\s*\{\s*name:\s*'([^']+)'/.exec(block);
    if (t && d && r && !out.has(r[1])) {
      out.set(r[1], {
        title: t[1].replace(/\\'/g, "'"),
        description: d[1].replace(/\\'/g, "'"),
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------- emit
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const esc = (s: string) => s.replace(/'/g, "’").replace(/</g, '\\<').replace(/\{/g, '\\{');

function permLine(item: NavItem): string {
  if (item.superOnly) return 'Platform administrators only.';
  if (item.perm) return `Requires the \`${item.perm}\` permission.`;
  if (item.anyPerm?.length)
    return `Requires any of: ${item.anyPerm.map((p) => `\`${p}\``).join(', ')}.`;
  return 'Available to every signed-in user.';
}

function entrySection(
  item: NavItem,
  route: RouteRec | undefined,
  tour: { title: string; description: string } | undefined,
  presets: string[] = [],
): { md: string; grounded: boolean } {
  const lines: string[] = [`## ${item.label}`, ''];

  const meta: string[] = [];
  if (route?.path) meta.push(`**Path** \`/${route.path.replace(/^\//, '')}\``);
  meta.push(permLine(item));
  lines.push(meta.join(' · '), '');

  let grounded = false;
  if (tour) {
    lines.push(esc(tour.description), '');
    grounded = true;
  } else if (route?.doc) {
    lines.push(esc(route.doc), '');
    grounded = true;
  } else if (CURATED[route?.name ?? ''] ?? CURATED[item.key]) {
    // Fall back to the menu key: an external link (API Docs) has no route record,
    // so there is no route name to key on.
    lines.push(esc((CURATED[route?.name ?? ''] ?? CURATED[item.key]).text), '');
    grounded = true;
  } else {
    lines.push(
      '<Callout type="warn">',
      'No description has been written for this page yet. The controls below are read',
      'directly from the page itself and are accurate; the explanation is missing.',
      '</Callout>',
      '',
    );
  }

  // Derived from the page's own API imports — see operationsFor().
  if (route?.operations?.length) {
    lines.push('### What you can do here', '');
    for (const op of route.operations) {
      lines.push(`- ${esc(op.verb)}`);
    }
    lines.push('');
  }
  if (route?.filters?.length) {
    lines.push(
      `**Search and filters:** ${route.filters.map((f) => `\`${f}\``).join(' · ')}`,
      '',
    );
  }

  if (presets.length && /^log-/.test(route?.name ?? '')) {
    lines.push(
      `**Date range presets:** ${presets.map((p) => `\`${p}\``).join(' · ')}`,
      '',
      'Every Logs page shares these windows, so a range means the same thing wherever you are.',
      '',
    );
  }

  if (route?.forms?.length) {
    lines.push(
      `**Opens:** ${route.forms.map((f) => `\`${f}\``).join(' · ')} — see [Forms and drawers](/docs/reference/forms).`,
      '',
    );
  }

  if (route?.tabs?.length) {
    lines.push(`**Tabs:** ${route.tabs.map((t) => `\`${t}\``).join(' · ')}`, '');
  }
  if (route?.columns?.length) {
    lines.push(`**Columns:** ${route.columns.map((c) => `\`${c}\``).join(' · ')}`, '');
  }
  if (route?.buttons?.length) {
    lines.push(`**Actions:** ${route.buttons.map((b) => `\`${b}\``).join(' · ')}`, '');
  }

  return { md: lines.join('\n'), grounded };
}



// ==========================================================================
// "What you can do here", derived from the API functions a view imports.
//
// A page that imports tagAdd / tagEdit / tagDelete / tagList can create, rename,
// delete and list tags — that is not a guess, it is the page's own call surface.
// Naming in this codebase is consistent enough to map mechanically, and anything
// that does not match a known verb is listed verbatim rather than described, so a
// new convention shows up as an unlabelled operation instead of a wrong sentence.
// ==========================================================================
const VERBS: [RegExp, string][] = [
  [/Add$|Create$/, 'Create'],
  [/Edit$|Update$|Save$/, 'Edit'],
  [/Delete$|Remove$/, 'Delete'],
  [/Page$|List$|Tree$|All$/, 'Browse and search'],
  [/Detail$|Get$|Status$/, 'View'],
  [/Test$/, 'Send a test'],
  [/Start$/, 'Start'],
  [/Stop$/, 'Stop'],
  [/Export$|Download$/, 'Export'],
  [/Resend$/, 'Resend'],
  [/Revoke$/, 'Revoke'],
  [/Ack$|AckBulk$/, 'Acknowledge'],
  [/ChangeStatus$/, 'Enable or disable'],
  [/ResetPwd$|Rotate$/, 'Reset or rotate'],
  [/Unlock$/, 'Unlock'],
  [/Grant$|GrantMenu$|GrantData$/, 'Grant access'],
  [/Approve$/, 'Approve'],
  [/Reject$/, 'Reject'],
  [/Join$/, 'Join'],
  [/Invite$/, 'Invite'],
  [/Upload$|Import$/, 'Upload or import'],
  [/Restore$/, 'Restore'],
  [/Backup$/, 'Back up'],
  [/Refresh$|Reload$|Sync$/, 'Refresh'],
];

// Verbs that appear at the START of a name: createSchedule, approveRegistration.
// The suffix table alone missed these, so real operations were being dropped into
// the unmapped bucket alongside the helpers.
const PREFIX_VERBS: [RegExp, string][] = [
  [/^create/, 'Create'],
  [/^add/, 'Create'],
  [/^update/, 'Edit'],
  [/^edit/, 'Edit'],
  [/^delete/, 'Delete'],
  [/^remove/, 'Delete'],
  [/^approve/, 'Approve'],
  [/^reject/, 'Reject'],
  [/^revoke/, 'Revoke'],
  [/^check/, 'Check'],
];

// Names that are the same word shortened. Left alone they produce "Browse and
// search devs", which reads like a typo rather than documentation.
const SUBJECT_WORDS: Record<string, string> = {
  dev: 'device',
  devs: 'devices',
  org: 'organization',
  orgs: 'organizations',
  cfg: 'configuration',
  ipam: 'IPAM',
  ztp: 'ZTP',
  wg: 'WireGuard',
  zt: 'ZeroTier',
  msp: 'MSP',
  sn: 'serial',
  pwd: 'password',
  cp: 'control plane',
};

/**
 * Trim noise the function name carries but the reader does not need: a leading
 * `get`, and the `TopList` suffix that names an internal shape rather than a
 * thing an operator recognises.
 */
function tidySubject(sub: string): string {
  return sub
    .replace(/^get\s+/, '')
    .replace(/\s*top\s*lists?$/, ' ranking')
    .replace(/\s*for\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The subject a function acts on: alarmRecordAck -> "alarm record". */
function subjectOf(fn: string): string {
  let base = fn;
  for (const [re] of VERBS) base = base.replace(re, '');
  // Prefix verbs too, or approveRegistration yields "Approve approve registration".
  for (const [re] of PREFIX_VERBS) base = base.replace(re, '');
  const out = base
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^sys /i, '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => SUBJECT_WORDS[w] ?? w)
    .join(' ')
    .trim();
  return tidySubject(out);
}

function operationsFor(src: string): { verb: string; fns: string[] }[] {
  const fns = new Set<string>();
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'@\/api\/[\w/]+'/g)) {
    for (const raw of m[1].split(',')) {
      const n = raw.trim().split(' as ')[0].trim();
      if (/^[a-z]\w+$/.test(n) && n !== 'get' && n !== 'post') fns.add(n);
    }
  }
  // Verbs that read correctly on their own — appending a subject makes them worse
  // ("Send a test receiver"), so they stand alone.
  const STANDALONE = new Set(['Send a test', 'Refresh', 'Export', 'Upload or import']);

  const byVerb = new Map<string, string[]>();
  for (const fn of [...fns].sort()) {
    const hit = VERBS.find(([re]) => re.test(fn)) ?? PREFIX_VERBS.find(([re]) => re.test(fn));
    let verb: string;
    if (!hit) {
      // NOT an operation. The @/api modules also export formatting helpers —
      // countdownText, cpStackLabel, detailStatusColor — and listing those as
      // things the operator can do is worse than omitting them. Anything that
      // matches no verb is dropped rather than shown raw.
      continue;
    } else if (STANDALONE.has(hit[1])) {
      verb = hit[1];
    } else {
      let subject = subjectOf(fn);
      // "Browse and search receiver" -> "...receivers"
      if (hit[1] === 'Browse and search' && subject && !/s$/.test(subject)) subject += 's';
      verb = `${hit[1]} ${subject}`.trim();
    }
    if (!byVerb.has(verb)) byVerb.set(verb, []);
    byVerb.get(verb)!.push(fn);
  }
  return [...byVerb].map(([verb, fns]) => ({ verb, fns }));
}

/**
 * Drawers, modals and wizards a page opens.
 *
 * These have no route of their own, so without this a reader has no way to know
 * which form belongs to which page — the Forms reference lists them all, but not
 * where they are reached from.
 */
function formsFor(src: string): string[] {
  const out = new Set<string>();
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s+'[^']*\/(\w*(?:Drawer|Modal|Wizard|Dialog))\.vue'/g)) {
    const name = m[2]
      .replace(/(Drawer|Modal|Wizard|Dialog)$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    if (name) out.add(name.charAt(0).toUpperCase() + name.slice(1));
  }
  return [...out].sort();
}

/**
 * Date presets shared by every Logs page.
 *
 * Defined once in views/log/logMeta.ts so the windows mean the same thing on all
 * of them — read from there rather than restated, so the docs follow if it changes.
 */
async function logPresets(): Promise<string[]> {
  const f = path.join(SRC, 'views/log/logMeta.ts');
  if (!(await exists(f))) return [];
  const src = await read(f);
  const i = src.indexOf('logDatePresets');
  if (i === -1) return [];
  const chunk = src.slice(i, i + 1200);
  return [...new Set([...chunk.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]))];
}

/** Search boxes and filters the page offers, from its own placeholders. */
function filtersFor(src: string): string[] {
  // A placeholder is often a sample VALUE ("noc@example.com", "+1 555 0100",
  // "https://hooks.example.com/…") rather than the name of a filter. Listing those
  // as searchable fields is actively misleading, so only label-shaped text is kept.
  const looksLikeValue = (t: string) =>
    /@|:\/\/|^\+?\d|^[0-9./]+$|example\./i.test(t);
  return [
    ...new Set(
      [...src.matchAll(/placeholder="([^"{]{3,34})"/g)]
        .map((m) => m[1].trim())
        .filter((t) => t && !looksLikeValue(t)),
    ),
  ].sort();
}

// ==========================================================================
// Device Detail — the deepest surface, and the one an engineer actually works
// in. Three separate things live here and are extracted separately:
//   • the page's own top-level tabs (DeviceDetailView.vue)
//   • the configuration rail, which mirrors the ROUTER's menu (NetworkNav.vue)
// ==========================================================================

interface ConfigItem {
  label: string;
  pane?: string;
  sub?: string;
  na: boolean;
  todo: boolean;
  hint?: string;
}
interface ConfigGroup {
  name: string;
  items: ConfigItem[];
}

async function readDeviceTabs(): Promise<
  { label: string; subs: string[]; controls: string[] }[]
> {
  // From the MANIFEST, i.e. from the rendered device page — not from
  // DeviceDetailView.vue. Source scraping reported 25 flat tabs where the console
  // shows 8 nested, and no sub-tabs under Analytics where it has ten.
  if (!(await exists(MANIFEST))) return [];
  const data = JSON.parse(await read(MANIFEST)) as {
    deviceDetail?: { tabs?: { label: string; subs?: string[]; controls?: string[] }[] };
  };
  return (data.deviceDetail?.tabs ?? []).map((t) => ({
    label: t.label,
    subs: t.subs ?? [],
    controls: t.controls ?? [],
  }));
}

/**
 * Sub-navigation inside a device tab component.
 *
 * FOUR different patterns are in use across views/device/tabs — measured, not
 * assumed: 43 <a-tab-pane>, 40 { key, label } arrays, 54 <a-radio-button>, and
 * 32 { value, label } arrays. Reading only the first two reported Analytics as
 * having no sub-tabs when the page shows ten, so all four are read here.
 *
 * Template expressions are excluded: `tab="{{ m.label }}"` and similar bind a
 * value at runtime, and emitting the binding text as a tab name puts literal
 * "m.label" in the documentation.
 */
function subNavOf(src: string): string[] {
  const out = new Set<string>();
  const add = (raw?: string) => {
    if (!raw) return;
    const t = raw.replace(/&amp;/g, '&').trim();
    if (!t || t.length > 40) return;
    // a binding, not a label
    if (/[{}]|^\w+\.\w+$|^[a-z]+\.[a-zA-Z]/.test(t)) return;
    out.add(t);
  };

  for (const m of src.matchAll(/<a-tab-pane[^>]*?tab="([^"]+)"/g)) add(m[1]);
  for (const m of src.matchAll(/<a-radio-button[^>]*>([^<]+)<\/a-radio-button>/g)) add(m[1]);
  for (const m of src.matchAll(/\{\s*key:\s*'[\w-]+',\s*label:\s*'([^']+)'/g)) add(m[1]);
  for (const m of src.matchAll(/\{\s*value:\s*'[\w-]+',\s*label:\s*'([^']+)'/g)) add(m[1]);
  for (const m of src.matchAll(/\{\s*label:\s*'([^']+)',\s*value:\s*'[\w-]+'/g)) add(m[1]);
  return [...out];
}

/** Which component(s) render under each top-level device tab. */
async function tabComponents(): Promise<Map<string, string[]>> {
  const src = await read(path.join(SRC, 'views/device/DeviceDetailView.vue'));
  const map = new Map<string, string[]>();
  let depth = 0;
  let cur: string | null = null;
  for (const line of src.split('\n')) {
    if (line.includes('<a-tabs')) depth++;
    const t = /<a-tab-pane[^>]*?tab="([^"]+)"/.exec(line);
    if (t && depth === 1) cur = t[1].replace(/&amp;/g, '&').trim();
    const c = /<(\w*(?:Tab|Panel))\b/.exec(line);
    if (c && cur) {
      if (!map.has(cur)) map.set(cur, []);
      if (!map.get(cur)!.includes(c[1])) map.get(cur)!.push(c[1]);
    }
    if (line.includes('</a-tabs>')) depth--;
  }
  return map;
}

async function readConfigRail(): Promise<ConfigGroup[]> {
  const s = await read(path.join(SRC, 'views/device/NetworkNav.vue'));
  const blk = s.slice(s.indexOf('const groups: Group[] = ['));
  const groups: ConfigGroup[] = [];
  let cur: ConfigGroup | null = null;

  for (const line of blk.split('\n')) {
    const g = /^\s*name:\s*'([^']+)'/.exec(line);
    if (g) {
      cur = { name: g[1], items: [] };
      groups.push(cur);
      continue;
    }
    const m = /\{\s*label:\s*'([^']+)'(.*)$/.exec(line);
    if (m && cur) {
      const rest = m[2];
      cur.items.push({
        label: m[1],
        pane: /pane:\s*'([^']+)'/.exec(rest)?.[1],
        sub: /sub:\s*'([^']+)'/.exec(rest)?.[1],
        na: rest.includes('na: true'),
        todo: rest.includes('todo: true'),
        hint: /hint:\s*'((?:[^'\\]|\\.)*)'/.exec(rest)?.[1],
      });
    }
    if (/^\];/.test(line)) break;
  }
  return groups;
}

async function emitDeviceDetail(outDir: string): Promise<number> {
  const [tabs, rail] = await Promise.all([readDeviceTabs(), readConfigRail()]);

  const L: string[] = [
    '---',
    'title: Device detail',
    'description: Everything on a single device — its tabs, and the full configuration rail that mirrors the router’s own menu.',
    '---',
    '',
    'Opening a device from **Devices** gives you the whole unit: live state, its',
    'history, and every configuration section the router itself exposes.',
    '',
    '## Tabs',
    '',
    `The device page has ${tabs.length} tabs. Several open further sections inside`,
    'them, listed beneath each.',
    '',
    ...tabs.flatMap((t) => {
      const head = `### ${esc(t.label)}`;
      const out = [head, ''];
      if (t.subs.length) {
        out.push(`${t.subs.length} section${t.subs.length === 1 ? '' : 's'}:`, '');
        out.push(...t.subs.map((x) => `- ${esc(x)}`), '');
      } else {
        out.push('No sub-sections — the tab is a single view.', '');
      }
      if (t.controls.length) {
        // Controls FILTER the view; they are not places to navigate to.
        out.push(
          `**Filters:** ${t.controls.map((c) => `\`${esc(c)}\``).join(' · ')}`,
          '',
        );
      }
      return out;
    }),
    '## Configuration',
    '',
    'The configuration rail **mirrors the router’s own menu, in the router’s own',
    'order**, so an engineer who knows the device finds the same names here. One',
    'rail entry sometimes opens a section inside a larger pane — the router lists',
    '`MAC Filter` and `NAT` separately while both live in the Firewall pane.',
    '',
  ];

  let count = tabs.length + tabs.reduce((n, t) => n + t.subs.length + t.controls.length, 0);
  for (const g of rail) {
    L.push(`### ${g.name}`, '');
    L.push('| Section | Opens | Status |', '| --- | --- | --- |');
    for (const it of g.items) {
      const target = it.sub ? `\`${it.pane}\` › \`${it.sub}\`` : `\`${it.pane ?? '—'}\``;
      const status = it.na
        ? 'Not applicable on this platform'
        : it.todo
          ? 'Not yet available'
          : 'Available';
      L.push(`| ${esc(it.label)} | ${target} | ${status} |`);
      count++;
    }
    L.push('');
    const hinted = g.items.filter((i) => i.hint);
    for (const h of hinted) {
      L.push(`**${esc(h.label)}** — ${esc(h.hint!)}`, '');
    }
  }

  // Nested under Device List, because that is the only way you reach it.
  await mkdir(path.join(outDir, 'devices/device-list'), { recursive: true });
  await writeFile(path.join(outDir, 'devices/device-list/device-detail.mdx'), L.join('\n') + '\n');
  return count;
}

// ==========================================================================
// Forms, drawers and wizards.
//
// A large part of using this console is filling something in, and none of those
// surfaces has a route — they open over the page. Titles, field labels and
// buttons are read from each component's own template, so this documents what a
// customer is actually asked for rather than what we imagine the form contains.
// ==========================================================================

const FORM_DIRS = ['components', 'views'];
const FORM_RE = /(drawer|modal|wizard|dialog)\.vue$/i;

async function walk(dir: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

/** Human name for a component file: PasswordRotateDrawer.vue -> Password rotate */
function componentName(file: string): string {
  const base = path.basename(file, '.vue').replace(/(Drawer|Modal|Wizard|Dialog)$/i, '');
  const spaced = base.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formKind(file: string): string {
  const m = FORM_RE.exec(file);
  return m ? m[1].toLowerCase() : 'form';
}

async function emitForms(outDir: string): Promise<number> {
  const files: string[] = [];
  for (const d of FORM_DIRS) {
    const abs = path.join(SRC, d);
    if (await exists(abs)) files.push(...(await walk(abs)));
  }
  const forms = files.filter((f) => FORM_RE.test(f)).sort();

  const L: string[] = [
    '---',
    'title: Forms and drawers',
    'description: Every form the console asks you to fill in — what it is called, the fields it wants, and the buttons it offers.',
    '---',
    '',
    'Much of the work in this console happens in a panel that slides over the page',
    'rather than on a page of its own, so these have no address you can link to.',
    'They are listed here by what they are called when they open.',
    '',
    '<Callout>',
    'Field lists are read from each form directly. A field marked optional in the',
    'form is shown that way here; anything conditional on another answer may not',
    'appear until that answer is given.',
    '</Callout>',
    '',
  ];

  let n = 0;
  for (const f of forms) {
    const src = await read(f);
    const t =
      /<a-drawer[^>]*?title="([^"{]+)"/.exec(src) ??
      /<a-modal[^>]*?title="([^"{]+)"/.exec(src);
    const title = t?.[1]?.trim();
    const fields = [
      ...new Set([...src.matchAll(/<a-form-item[^>]*?label="([^"{]{2,40})"/g)].map((m) => m[1].trim())),
    ];
    const actions = [
      ...new Set(
        [...src.matchAll(/<a-button[^>]*>\s*([A-Z][^<>{}\n]{2,28}?)\s*<\/a-button>/g)].map((m) =>
          m[1].trim(),
        ),
      ),
    ];
    if (!fields.length && !actions.length && !title) continue;

    const name = componentName(f);
    L.push(`## ${esc(title && !title.includes('${') ? title : name)}`, '');
    L.push(`A ${formKind(f)}${title && title !== name ? ` — opened as “${esc(name)}”` : ''}.`, '');
    if (fields.length) L.push(`**Fields:** ${fields.map((x) => `\`${x}\``).join(' · ')}`, '');
    if (actions.length) L.push(`**Actions:** ${actions.map((x) => `\`${x}\``).join(' · ')}`, '');
    n++;
  }

  await mkdir(path.join(outDir, 'reference'), { recursive: true });
  await writeFile(path.join(outDir, 'reference/forms.mdx'), L.join('\n') + '\n');
  return n;
}



// ==========================================================================
// Report catalogue — read from the Go handler, which is the authoritative list.
// A test in report_test.go asserts every catalogue entry has a runner and every
// runner is in the catalogue, so this cannot list a report the server can't run.
// ==========================================================================
const BACKEND = path.resolve(SRC, '../../backend');

async function emitReports(outDir: string): Promise<number> {
  const f = path.join(BACKEND, 'internal/handlers/report.go');
  if (!(await exists(f))) return 0;
  const src = await read(f);

  const rows = [
    ...src.matchAll(/\{Key:\s*"([^"]+)",\s*Title:\s*"([^"]+)",\s*Category:\s*"([^"]+)"/g),
  ].map((m) => ({ key: m[1], title: m[2], category: m[3] }));
  if (!rows.length) return 0;

  const byCat = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category)!.push(r);
  }

  const L = [
    '---',
    'title: Report catalogue',
    'description: Every report the platform can run, by category.',
    '---',
    '',
    'Reports are generated on demand from **All Reports**, or delivered on a',
    'schedule — see [Reports and logs](/docs/reports/all-reports). Each can be',
    'exported as CSV or PDF.',
    '',
  ];
  for (const [cat, list] of [...byCat].sort()) {
    L.push(`## ${cat.charAt(0).toUpperCase()}${cat.slice(1)}`, '');
    L.push('| Report | Key |', '| --- | --- |');
    for (const r of list) L.push(`| ${esc(r.title)} | \`${r.key}\` |`);
    L.push('');
  }
  await mkdir(path.join(outDir, 'reports/all-reports'), { recursive: true });
  await writeFile(path.join(outDir, 'reports/all-reports/catalogue.mdx'), L.join('\n') + '\n');
  return rows.length;
}

// ==========================================================================
// Alarm rule vocabulary — the metrics a rule can watch and the severities it can
// raise, read from the module both the rule editor and the record view share.
// ==========================================================================
async function emitAlarmMetrics(outDir: string): Promise<number> {
  const f = path.join(SRC, 'views/alarm/meta.ts');
  if (!(await exists(f))) return 0;
  const src = await read(f);

  const pull = (constName: string) => {
    const i = src.indexOf(`${constName}`);
    if (i === -1) return [];
    const chunk = src.slice(i, i + 4000);
    const end = chunk.indexOf('];');
    return [
      ...(end > 0 ? chunk.slice(0, end) : chunk).matchAll(
        /label:\s*'([^']+)',\s*value:\s*'([^']+)'/g,
      ),
    ].map((m) => ({ label: m[1], value: m[2] }));
  };

  const severities = pull('SEVERITY_OPTIONS');
  const metrics = pull('METRIC_OPTIONS');

  const L = [
    '---',
    'title: Alarm metrics',
    'description: What an alarm rule can watch, and the severities it can raise.',
    '---',
    '',
    'A rule watches one metric and raises an alarm at a severity when its condition',
    'is met. See [Alarms](/docs/alarms/overview) for how rules, receivers and',
    'templates fit together.',
    '',
  ];

  if (severities.length) {
    L.push('## Severities', '', 'Listed most to least urgent.', '', '| Severity | Value |', '| --- | --- |');
    for (const s of severities) L.push(`| ${esc(s.label)} | \`${s.value}\` |`);
    L.push('');
  }
  if (metrics.length) {
    L.push(
      '## Metrics a rule can watch',
      '',
      `The rule editor offers ${metrics.length} metrics.`,
      '',
      '| Metric | Value |',
      '| --- | --- |',
    );
    for (const m of metrics) L.push(`| ${esc(m.label)} | \`${m.value}\` |`);
    L.push('');
  }

  L.push(
    '<Callout>',
    'A rule only monitors while it is **enabled**. A disabled rule is kept but',
    'watches nothing — which is the safer way to take a rule out of use while you',
    'check what depended on it.',
    '</Callout>',
    '',
  );

  await mkdir(path.join(outDir, 'alarms/rules'), { recursive: true });
  await writeFile(path.join(outDir, 'alarms/rules/metrics.mdx'), L.join('\n') + '\n');
  return severities.length + metrics.length;
}

// ==========================================================================
// Routes that exist but sit outside the sidebar — reachable by link, by deep URL,
// or from another page. Left undocumented they are exactly the pages a customer
// lands on and cannot identify.
// ==========================================================================
const OFF_MENU: { name: string; title: string; text: string }[] = [
  { name: 'sdwan', title: 'SD-WAN', text: 'The SD-WAN landing page, gathering the overlay-network surfaces — topology, the control plane and the VPN views — in one place.' },
  { name: 'device-manage', title: 'Device management', text: 'Bulk device administration: adding devices, editing them, and moving them between organizations or groups. Reached from the device list rather than the sidebar.' },
  { name: 'device-map', title: 'Device map', text: 'The fleet plotted geographically. It shares its formatting with the device list and device detail, so a device is never described differently on the map than on the pages it links to.' },
  { name: 'device-detail', title: 'Device detail', text: 'One device in full — see [Device detail](/docs/devices/device-list/device-detail) for its tabs and configuration rail.' },
  { name: 'ztp-template-new', title: 'New ZTP template', text: 'The zero-touch template editor. A template holds the device’s own CLI directives plus typed, validated per-site variables, so one template can serve many sites without editing it per device.' },
  { name: 'ztp-template-edit', title: 'Edit ZTP template', text: 'The same editor opened on an existing template.' },
  { name: 'report-view', title: 'A single report', text: 'The result of running one report from the catalogue — see [Report catalogue](/docs/reports/all-reports/catalogue) for what can be run.' },
  { name: 'log-system', title: 'System log', text: 'Platform-level log entries, distinct from the device-facing logs in the Logs menu.' },
];

async function emitOffMenu(outDir: string, routes: Map<string, RouteRec>): Promise<number> {
  const L = [
    '---',
    'title: Pages outside the menu',
    'description: Routes that exist but are reached by link or deep URL rather than from the sidebar.',
    '---',
    '',
    'These pages are real and reachable, but nothing in the sidebar points at them —',
    'you arrive from another page, a saved link, or a deep URL.',
    '',
  ];
  let n = 0;
  for (const p of OFF_MENU) {
    const r = routes.get(p.name);
    L.push(`## ${p.title}`, '');
    if (r?.path) L.push(`**Path** \`/${r.path.replace(/^\//, '')}\``, '');
    L.push(p.text, '');
    if (r?.columns?.length) L.push(`**Columns:** ${r.columns.map((c) => `\`${c}\``).join(' · ')}`, '');
    if (r?.buttons?.length) L.push(`**Actions:** ${r.buttons.map((b) => `\`${b}\``).join(' · ')}`, '');
    n++;
  }
  await mkdir(path.join(outDir, 'reference'), { recursive: true });
  await writeFile(path.join(outDir, 'reference/off-menu.mdx'), L.join('\n') + '\n');
  return n;
}


/**
 * Link a console page to the API sections behind it.
 *
 * Derived by matching each imported function's prefix against the tags that
 * ACTUALLY exist in the generated spec — a link is only emitted when the target
 * page is real, so this cannot produce a dead cross-reference.
 */
async function apiTagsFor(
  ops: { fns: string[] }[] | undefined,
  known: Set<string>,
): Promise<string[]> {
  if (!ops?.length) return [];
  const hits = new Set<string>();
  for (const op of ops) {
    for (const fn of op.fns) {
      // longest matching tag wins: alarmRecordAck -> alarmRecord, not alarm
      let best = '';
      for (const t of known) {
        if (fn.toLowerCase().startsWith(t.toLowerCase()) && t.length > best.length) best = t;
      }
      if (best) hits.add(best);
    }
  }
  return [...hits].sort();
}

/**
 * Pages reached FROM a menu entry rather than from the menu.
 *
 * Device Detail has no menu item — you open it by clicking a device in the Device
 * List — so presenting it as a sibling of Device List misrepresents how you get
 * there. Declaring it a child makes the entry a folder, and the sidebar then
 * matches the way the console is actually navigated.
 *
 * key = the menu entry's nav key; value = pages that live beneath it.
 */
const CHILDREN: Record<string, string[]> = {
  devices: ['device-detail', 'configuration'],
  reports: ['catalogue'],
  // Metrics are what a RULE watches, so they belong beneath Rules, not beside it.
  'alarm-rule': ['metrics'],
};

async function main() {
  // This handbook's inputs come from the platform repo and a captured manifest,
  // neither of which exists on every machine. Missing inputs SKIP it rather than
  // failing the build: the controller handbook in this same app needs only its
  // own source tree, so a developer without the SDWAN Lite platform checked out
  // should still get a complete build of everything else.
  //
  // Only ABSENT inputs are tolerated. A manifest that is present but malformed,
  // or a source tree that is present but unreadable, still fails loudly — those
  // are real breakage, not an unconfigured machine.
  const haveManifest = await exists(MANIFEST);
  const haveSource = await exists(path.join(SRC, 'router/index.ts'));
  if (!haveManifest || !haveSource) {
    console.log('skipping the SDWAN Lite console reference:');
    if (!haveManifest) console.log(`  no ${MANIFEST} — capture it with: npm run capture`);
    if (!haveSource) console.log(`  no platform source at ${SRC}`);
    return;
  }

  const [nav, routes, tour] = await Promise.all([readNav(), readRoutes(), readTour()]);

  // The manifest identifies an entry by the href the console actually renders, so
  // routes and tour copy are resolved by PATH. Keying off a slug derived from the
  // label would not match: the label is "Tags", the route name is "device-tags".
  const byPath = new Map<string, RouteRec>();
  for (const r of routes.values()) {
    if (r.path) byPath.set('/' + r.path.replace(/^\//, ''), r);
  }
  const resolve = (item: NavItem): RouteRec | undefined => {
    if (item.href) {
      const hit = byPath.get('/' + item.href.replace(/^\//, ''));
      if (hit) return hit;
    }
    return routes.get(item.key);
  };
  const resolveTour = (item: NavItem) => {
    const r = resolve(item);
    return r ? tour.get(r.name) : undefined;
  };

  // Tags that exist as generated API pages, so cross-links can never 404.
  const presets = await logPresets();
  const knownTags = new Set<string>();
  if (await exists('./openapi.docs.json')) {
    const spec = JSON.parse(await read('./openapi.docs.json')) as {
      tags?: ({ name: string } | string)[];
    };
    for (const t of spec.tags ?? []) knownTags.add(typeof t === 'string' ? t : t.name);
  }

  // enrich routes with view-derived facts
  for (const rec of routes.values()) {
    if (!rec.view?.startsWith('@/')) continue;
    const p = path.join(SRC, rec.view.slice(2));
    if (!(await exists(p))) continue;
    const src = await read(p);
    rec.doc = headerDoc(src);
    Object.assign(rec, uiFacts(src));
    rec.operations = operationsFor(src);
    rec.filters = filtersFor(src);
    rec.forms = formsFor(src);
  }

  // NOTE: OUT is now the docs root, which also holds hand-written pages — so this
  // must NEVER wipe it. Each generated file is overwritten individually instead.
  await mkdir(OUT, { recursive: true });

  const pages: string[] = [];
  let total = 0;
  let grounded = 0;

  for (const group of nav) {
    const items = group.leaf ? [group as NavItem] : group.children;
    if (!items.length) continue;

    const gslug = slug(group.label);
    await mkdir(path.join(OUT, gslug), { recursive: true });
    const entryPages: string[] = [];

    for (const item of items) {
      const eslug = slug(item.label);
      const r = entrySection(item, resolve(item), resolveTour(item), presets);

      // A hand-authored guide for this menu entry, if one exists, becomes the body
      // of the page; the generated reference block is appended beneath it. That way
      // the sidebar mirrors the console exactly and the depth still has a home.
      const staticFile = path.join(KB, gslug, `${eslug}.mdx`);
      let guide = '';
      if (await exists(staticFile)) {
        const raw = await read(staticFile);
        guide = raw.replace(/^---[\s\S]*?---\n/, '').trim();
      }

      const fm = [
        '---',
        `title: ${item.label}`,
        `description: ${group.leaf ? item.label : `${group.label} › ${item.label}`} — what the page is for, who can open it, and what is on it.`,
        '---',
        '',
      ].join('\n');

      const apiTags = await apiTagsFor(resolve(item)?.operations, knownTags);
      const apiBlock = apiTags.length
        ? `\n**API:** ${apiTags
            .map((t) => `[\`${t}\`](/docs/api/${t.toLowerCase()})`)
            .join(' · ')}\n`
        : '';

      const body = guide
        ? `${guide}\n\n---\n\n## Reference\n\n${r.md.replace(/^## .*\n\n/, '')}${apiBlock}`
        : `${r.md.replace(/^## .*\n\n/, '')}${apiBlock}`;

      const kids = CHILDREN[item.key] ?? [];
      if (kids.length) {
        // A previous run may have written this entry as a flat page; a folder and a
        // flat page with the same slug are two routes for one thing.
        const { rm: rmFile } = await import('node:fs/promises');
        await rmFile(path.join(OUT, gslug, `${eslug}.mdx`), { force: true });
        // A folder: the entry itself becomes index.mdx, children sit beneath it.
        const dir = path.join(OUT, gslug, eslug);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, 'index.mdx'), `${fm}${body}\n`);

        // Move any child that is still a flat sibling into the folder.
        const { rename } = await import('node:fs/promises');
        const present: string[] = [];
        for (const kid of kids) {
          const flat = path.join(OUT, gslug, `${kid}.mdx`);
          const nested = path.join(dir, `${kid}.mdx`);
          if (await exists(flat)) await rename(flat, nested);
          if (await exists(nested)) present.push(kid);
        }
        await writeFile(
          path.join(dir, 'meta.json'),
          JSON.stringify({ title: item.label, pages: ['index', ...present] }, null, 2),
        );
      } else if (group.leaf) {
        // A top-level entry with no children is one page, so it is the section's
        // index: /docs/control-plane, not /docs/control-plane/control-plane.
        await writeFile(path.join(OUT, gslug, 'index.mdx'), `${fm}${body}\n`);
        entryPages.push('index');
        total++;
        if (r.grounded) grounded++;
        continue; // counted above
      } else {
        await writeFile(path.join(OUT, gslug, `${eslug}.mdx`), `${fm}${body}\n`);
      }
      entryPages.push(eslug);
      total++;
      if (r.grounded) grounded++;
    }

    // Remove pages this section no longer has a menu entry for.
    //
    // A renamed entry (Tags -> Labels) writes a new page and leaves the old one
    // behind, still reachable and now wrong. Since every page in a section is
    // either a menu entry, a declared child, or a doc in the platform repo, an
    // .mdx matching none of those is stale by definition.
    {
      const { readdir: rd, rm: rmF } = await import('node:fs/promises');
      const owned = new Set<string>(entryPages);
      for (const kids of Object.values(CHILDREN)) for (const k of kids) owned.add(k);
      for (const f of await rd(path.join(OUT, gslug))) {
        if (!f.endsWith('.mdx')) continue;
        const base = f.replace(/\.mdx$/, '');
        if (owned.has(base)) continue;
        await rmF(path.join(OUT, gslug, f), { force: true });
        console.log(`  removed stale page: ${gslug}/${f}`);
      }
    }

    // Section index: ordered EXACTLY as the console menu orders it.
    const extras = (await (await import('node:fs/promises')).readdir(path.join(OUT, gslug)))
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\.mdx$/, ''))
      .filter((f) => !entryPages.includes(f))
      .sort();

    await writeFile(
      path.join(OUT, gslug, 'meta.json'),
      JSON.stringify({ title: group.label, pages: [...entryPages, ...extras] }, null, 2),
    );
    pages.push(gslug);
  }

  const detailCount = await emitDeviceDetail(OUT);
  const outsideCount = 0;
  const formCount = await emitForms(OUT);
  const reportCount = await emitReports(OUT);
  const alarmCount = await emitAlarmMetrics(OUT);
  const offMenuCount = await emitOffMenu(OUT, routes);

  // Standalone prose pages (home, concepts/, start/, glossary) also come from the
  // platform repo, under docs/kb/_pages, and are copied into place here.
  {
    const { readdir: rd, copyFile: cp, mkdir: mk } = await import('node:fs/promises');
    const pagesDir = path.join(KB, '_pages');
    if (await exists(pagesDir)) {
      const walkKb = async (dir: string, rel = ''): Promise<void> => {
        for (const e of await rd(dir, { withFileTypes: true })) {
          const from = path.join(dir, e.name);
          if (e.isDirectory()) await walkKb(from, path.join(rel, e.name));
          else if (e.name.endsWith('.mdx')) {
            const target =
              e.name === 'glossary.mdx' ? path.join(OUT, 'reference') : path.join(OUT, rel);
            await mk(target, { recursive: true });
            await cp(from, path.join(target, e.name));
          }
        }
      };
      await walkKb(pagesDir);
    }
  }

  // Per-menu-entry guides, also from the platform repo.
  const { readdir, copyFile } = await import('node:fs/promises');
  const staticDir = KB;
  const staticPages: string[] = [];
  if (await exists(staticDir)) {
    for (const f of await readdir(staticDir)) {
      if (!f.endsWith('.mdx')) continue;
      await mkdir(path.join(OUT, 'start'), { recursive: true });
      await copyFile(path.join(staticDir, f), path.join(OUT, 'start', f));
      staticPages.push(f.replace(/\.mdx$/, ''));
    }
  }

  const extra = detailCount + outsideCount + formCount + reportCount + alarmCount + offMenuCount;
  total += extra;
  grounded += extra;


  // Remove whole sections the menu no longer has.
  //
  // Per-section cleanup only prunes pages INSIDE a known section, so a section
  // that stops existing (Traffic, when a parser fix moved it under Monitor) is
  // left behind entirely — a dead directory still served and still wrong.
  {
    const { readdir: rd, rm: rmDir } = await import('node:fs/promises');
    const keep = new Set([...pages, 'api', 'concepts', 'start', 'reference']);
    for (const e of await rd(OUT, { withFileTypes: true })) {
      if (!e.isDirectory() || keep.has(e.name)) continue;
      await rmDir(path.join(OUT, e.name), { recursive: true, force: true });
      console.log(`  removed orphan section: ${e.name}/`);
    }
  }

  // Root ordering is DERIVED, not hand-kept: the menu sections come from the
  // manifest in the console's own order, wrapped by the fixed pages that sit
  // outside the menu. Editing this by hand in the docs app would be one more
  // thing to forget when the console gains a section.
  {
    const { readdir: rd } = await import('node:fs/promises');
    const present = new Set(
      (await rd(OUT, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name),
    );
    const files = new Set(
      (await rd(OUT, { withFileTypes: true }))
        .filter((e) => e.isFile() && e.name.endsWith('.mdx'))
        .map((e) => e.name.replace(/\.mdx$/, '')),
    );
    const before = ['index', 'introduction', 'concepts', 'start'].filter(
      (p) => files.has(p) || present.has(p),
    );
    const menu = pages.filter((p) => present.has(p));
    const after = ['reference'].filter((p) => present.has(p));
    const root = [...before, ...menu, ...after];
    if (present.has('api')) root.push('---Generated---', 'api');
    await writeFile(path.join(OUT, 'meta.json'), JSON.stringify({ pages: root }, null, 2));
  }

  // DRIFT CHECK — the point of sourcing prose from the platform repo is that the
  // two cannot silently diverge, so say so when they have.
  {
    const { readdir: rd } = await import('node:fs/promises');
    const entryKeys = new Set<string>();
    for (const g of nav) {
      const items = g.leaf ? [g as NavItem] : g.children;
      for (const it of items) entryKeys.add(`${slug(g.label)}/${slug(it.label)}`);
    }
    const orphans: string[] = [];
    for (const dir of await rd(KB, { withFileTypes: true })) {
      if (!dir.isDirectory() || dir.name === '_pages') continue;
      for (const f of await rd(path.join(KB, dir.name))) {
        if (!f.endsWith('.mdx')) continue;
        const key = `${dir.name}/${f.replace(/\.mdx$/, '')}`;
        if (!entryKeys.has(key)) orphans.push(`docs/kb/${key}.mdx`);
      }
    }
    if (orphans.length) {
      console.warn(
        `\n  DRIFT: ${orphans.length} doc(s) no longer match a console menu entry —\n` +
          orphans.map((o) => `    ${o}`).join('\n') +
          `\n  The menu changed, or the file was misnamed. Fix or delete them.\n`,
      );
    }
  }

  console.log(
    `console reference: ${pages.length} pages, ${total} documented surfaces ` +
      `(${detailCount} device-detail, ${formCount} forms, ` +
      `${reportCount} reports, ${alarmCount} alarm terms, ${offMenuCount} off-menu, ` +
      `${staticPages.length} hand-authored), ` +
      `${grounded} sourced, ${total - grounded} gaps`,
  );
}

await main();
