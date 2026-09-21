/**
 * Reports descriptions whose source has changed since they were written.
 *
 * THE GAP THIS CLOSES. Everything structural in this handbook is extracted, so
 * it cannot drift: rename a route and the page changes with it. The prose cannot
 * do that. Over a thousand lines of description are written by hand, and nothing
 * noticed when the code they describe moved on — which is a strange hole in a
 * project whose whole premise is documentation that cannot quietly go stale.
 *
 * So each description is pinned to the files it was written from — the page's
 * own component and the components it opens, which is the same set the facts
 * extractor reads — and their hashes are recorded. When one changes, the
 * description is flagged for a human to re-read. Not failed: a source change
 * usually means the description needs a look, not that it is wrong, and a check
 * that cries wolf on every commit gets switched off.
 *
 *   npm run check:descriptions            report what has moved
 *   npm run check:descriptions -- --accept  re-pin after reviewing
 *
 * The lock file IS committed. It is a record of what was reviewed and when,
 * which is the one thing here that must not be regenerated silently.
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTROLLER, requireController } from './config.ts';
import { readRouteTable } from './extract-routes.ts';
import { sourceFilesFor } from './extract-page-facts.ts';
import { CURATED } from './console-descriptions.ts';

// fileURLToPath, not `new URL(...).pathname`: this repo's path contains a space,
// which the URL form percent-encodes into a directory that does not exist.
const LOCK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'description-sources.lock.json');

type Lock = Record<string, Record<string, string>>;

const exists = (p: string) => access(p).then(() => true, () => false);
const rel = (p: string) => path.relative(CONTROLLER, p);

async function hash(file: string): Promise<string | null> {
  try {
    return createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

/** route -> { source file (repo-relative) : hash } */
/** route -> the component the route itself resolves to, repo-relative. */
const primaryOf = new Map<string, string>();

async function currentState(): Promise<Lock> {
  const table = await readRouteTable();
  // Every description, not every menu entry.
  //
  // This walked the nav and then named `/devices/:id` by hand, because device
  // detail is not a menu entry. That worked until there were six more of those —
  // the screens reached only from a button on another page — and each would have
  // had to be remembered here as well. A description exists to be checked, so
  // the list of things to pin is the descriptions themselves.
  const routes = Object.keys(CURATED);

  const state: Lock = {};
  for (const route of routes) {
    if (!CURATED[route]) continue;
    const r = table.match(route);
    if (!r?.file) continue;
    primaryOf.set(route, rel(r.file));
    const files: Record<string, string> = {};
    for (const f of await sourceFilesFor(r.file)) {
      const h = await hash(f);
      if (h) files[rel(f)] = h;
    }
    if (Object.keys(files).length) state[route] = files;
  }
  return state;
}

await requireController();
const accept = process.argv.includes('--accept');
const now = await currentState();
const before: Lock = (await exists(LOCK)) ? JSON.parse(await readFile(LOCK, 'utf8')) : {};

if (accept) {
  await writeFile(LOCK, JSON.stringify(now, null, 2) + '\n');
  console.log(`pinned ${Object.keys(now).length} descriptions to their current sources`);
  process.exit(0);
}

/**
 * A file most pages import is not evidence that any one page changed.
 *
 * The first version of this check pinned each description to its component AND
 * everything that component imports, then reported any movement equally. Icon.jsx
 * is imported by fifty pages, EmptyState by forty-three, the scope slice by
 * thirty-eight — so a single tweak to a shared control reported all 77
 * descriptions as stale, which is the same as reporting nothing. A check that
 * cries wolf is a check that gets switched off, which is exactly what this was
 * built to avoid.
 *
 * So changes are split by where they landed. A change in the page's OWN
 * component means the page itself moved and its description is worth re-reading.
 * A change confined to shared controls is worth knowing and nothing more.
 */
const usage = new Map<string, number>();
for (const files of Object.values(now)) {
  for (const f of Object.keys(files)) usage.set(f, (usage.get(f) ?? 0) + 1);
}
// Shared by proportion rather than a fixed count, so the line holds as the
// handbook grows.
const SHARED_AT = Math.max(5, Math.ceil(Object.keys(now).length * 0.15));
const isShared = (f: string) => (usage.get(f) ?? 0) >= SHARED_AT;

const unpinned: string[] = [];
const changed: { route: string; own: string[]; shared: string[] }[] = [];
const gone: { route: string; files: string[] }[] = [];

for (const [route, files] of Object.entries(now)) {
  const was = before[route];
  if (!was) { unpinned.push(route); continue; }
  const moved = Object.entries(files).filter(([f, h]) => was[f] && was[f] !== h).map(([f]) => f);
  const missing = Object.keys(was).filter((f) => !(f in files));
  const primary = primaryOf.get(route);
  // The page's own component counts as its own; so does anything else that is
  // not shared, since a drawer used by one page is still that page's behaviour.
  const own = moved.filter((f) => f === primary || !isShared(f));
  const shared = moved.filter((f) => f !== primary && isShared(f));
  if (own.length || shared.length) changed.push({ route, own, shared });
  if (missing.length) gone.push({ route, files: missing });
}

const pinned = Object.keys(now).length - unpinned.length;
console.log(`descriptions: ${Object.keys(now).length} with resolvable sources, ${pinned} pinned`);

if (unpinned.length) {
  console.log(`\n  ${unpinned.length} not yet pinned (run with --accept once reviewed):`);
  for (const r of unpinned) console.log(`    ${r}`);
}
if (gone.length) {
  console.log(`\n  ${gone.length} description(s) whose source file no longer exists:`);
  for (const g of gone) console.log(`    ${g.route}  ->  ${g.files.join(', ')}`);
}
const needsReading = changed.filter((c) => c.own.length);
const sharedOnly = changed.filter((c) => !c.own.length);

if (needsReading.length) {
  console.log(`\n  ${needsReading.length} description(s) to RE-READ — the page's own source changed:`);
  for (const c of needsReading) console.log(`    ${c.route}\n        ${c.own.join('\n        ')}`);
}
if (sharedOnly.length) {
  const which = [...new Set(sharedOnly.flatMap((c) => c.shared))].sort();
  console.log(
    `\n  ${sharedOnly.length} description(s) touched only by shared controls ` +
      `(used by ${SHARED_AT}+ pages) — usually nothing to do:`,
  );
  for (const f of which) console.log(`    ${f}  (${usage.get(f)} pages)`);
}
if (needsReading.length || sharedOnly.length) {
  console.log(`\n  Once re-read: npm run check:descriptions -- --accept`);
}
if (!unpinned.length && !changed.length && !gone.length) {
  console.log('  every description still matches the source it was written from');
}
