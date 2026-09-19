/**
 * The API reference, generated from the controller's own schema.
 *
 * content/controller/api is wiped and rebuilt on every run, so a route deleted
 * from the backend disappears here too: a stale endpoint in the docs is worse
 * than a missing one, because someone will build against it.
 *
 * If no spec is present this SKIPS rather than fails. The console reference is
 * useful on its own and needs nothing but the source tree, so a developer
 * without a running Django should still get a complete build of everything else.
 *
 * ---------------------------------------------------------------------------
 * Why this writes one spec file per tag
 *
 * A generated page inlines every path its schema declares, not just the ones it
 * renders. Against the whole 645-path spec that was a flat ~1.0 MB on EVERY
 * page: `sd-wan-topology`, which documents a single operation, shipped 1.01 MB.
 *
 * So the section paid twice. `api` — drf-yasg's catch-all, which 835 of 1154
 * operations fell into because they carry no explicit `tags` — rendered all 835
 * on one 19.7 MB page. And splitting that tag alone would have made things
 * worse: 33 more pages x 1.0 MB of duplicated schema is ~33 MB added to save
 * 19 MB.
 *
 * Both halves are fixed here:
 *   - operations left in the catch-all are re-tagged by their own path segment,
 *     so `/api/v1/dpi/...` documents itself under `dpi` rather than `api`
 *   - each tag gets a spec holding ONLY its paths and the schemas those paths
 *     reach, so a page inlines what it renders and nothing else
 *
 * The subsets are derived from the spec on every run and are never edited by
 * hand; `lib/openapi.controller.ts` reads the same directory so the runtime
 * loads exactly what the build wrote.
 *
 * Run: npm run controller:api
 */
import { generateFiles } from 'fumadocs-openapi';
import { createOpenAPI } from 'fumadocs-openapi/server';
import { readFile, writeFile, rm, access, mkdir } from 'node:fs/promises';

const SPEC = './controller-openapi.json';
const DOCS_SPEC = './controller-openapi.docs.json';
/** Per-tag subsets. Generated; see the note above. */
const SPEC_DIR = './controller-openapi';
const OUT = './content/controller/api';

/**
 * drf-yasg's default tag: the first path segment, which is `api` for nearly
 * every route. It carries no meaning, so an operation holding only this one is
 * treated as untagged.
 */
const CATCH_ALL = 'api';

/**
 * A path item holds operations keyed by HTTP method, but it can also hold
 * `parameters` — an ARRAY, and `typeof [] === 'object'`, so a plain object check
 * let it through and tagged it as if it were an operation. That inflated the
 * count to 1480 of 1154 and put a `parameters` key in the subsets where a verb
 * belongs. Only these keys are operations.
 */
const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

const exists = (p: string) => access(p).then(() => true, () => false);

type Op = { tags?: string[] };
type Spec = {
  openapi?: string;
  info?: unknown;
  servers?: unknown;
  security?: unknown;
  paths: Record<string, Record<string, Op>>;
  components?: { schemas?: Record<string, unknown>; [k: string]: unknown };
  tags?: ({ name: string } | string)[];
};

/**
 * How a path segment is written in the sidebar.
 *
 * Presentation only. A label may case a segment properly or expand an acronym
 * that has exactly one meaning — `ipam` is IPAM, `ha` is high availability — but
 * it never invents a description of what the endpoints do. `nsbond` stays
 * NSBond rather than becoming "Router bridge": the segment is what the URL says
 * and what a reader greps for, and a fuller name would be this file's opinion
 * rather than the controller's.
 *
 * A segment with no entry falls back to sentence case, so a route group added
 * later reads acceptably without anyone touching this map.
 */
const LABELS: Record<string, string> = {
  accesslog: 'Access log',
  account: 'Account',
  admin: 'Admin',
  'config-compare': 'Config compare',
  'config-sync': 'Config sync',
  'control-plane': 'Control plane',
  cpeusers: 'CPE users',
  dcdr: 'DC-DR',
  dpi: 'DPI',
  'firmware-audit': 'Firmware audit',
  'firmware-pre-upgrade-backup': 'Firmware pre-upgrade backup',
  'firmware-upgrader': 'Firmware upgrader',
  freeradius: 'FreeRADIUS',
  fullmesh: 'Full mesh',
  ha: 'High availability',
  ipam: 'IPAM',
  'network-topology': 'Network topology',
  nsbond: 'NSBond',
  radius: 'RADIUS',
  'radius-admin': 'RADIUS admin',
  sdwan_tunnel: 'SD-WAN dashboard',
  'serial-admission': 'Serial admission',
  sla: 'SLA',
  // No '+': the tag becomes the URL, and a plus in a path is decoded as a space
  // by enough software to be a bad trade for one character of precision.
  tacacs: 'TACACS',
  'users-admin': 'Users admin',
};

/** Sentence case for a segment the map does not name. */
const sentenceCase = (seg: string) => {
  const words = seg.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const labelFor = (seg: string) => LABELS[seg] ?? sentenceCase(seg);

/** `/api/v1/dpi/rules/` -> `dpi`. The version segment is noise to a reader. */
function tagFromPath(p: string): string {
  const segs = p.split('/').filter(Boolean);
  let i = 0;
  if (segs[i] === 'api') i++;
  if (segs[i] && /^v\d+$/.test(segs[i])) i++;
  return segs[i] ?? CATCH_ALL;
}

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Every `#/components/schemas/X` reachable from `node`, followed through. */
function collectRefs(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const v of node) collectRefs(v, out);
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === '$ref' && typeof v === 'string') {
      const name = v.startsWith('#/components/schemas/') ? v.slice(21) : null;
      if (name) out.add(name);
    } else collectRefs(v, out);
  }
}

if (!(await exists(SPEC))) {
  console.log(
    `no ${SPEC} — skipping the API reference.\n` +
      `  To build it:  npm run controller:spec && npm run controller:convert`,
  );
  // Leave no half-built section behind from an earlier run that did have a spec.
  await rm(OUT, { recursive: true, force: true });
  await rm(SPEC_DIR, { recursive: true, force: true });
  process.exit(0);
}

const spec = JSON.parse(await readFile(SPEC, 'utf8')) as Spec;

// ---- re-tag whatever fell into the catch-all -------------------------------
//
// An operation that carries a real tag keeps it, and merely loses `api` if it
// somehow carries both. One that has nothing left is named by its own path.
let retagged = 0;
for (const [p, item] of Object.entries(spec.paths ?? {})) {
  for (const [verb, op] of Object.entries(item)) {
    if (!METHODS.has(verb.toLowerCase()) || !op || typeof op !== 'object') continue;
    const real = (op.tags ?? []).filter((t) => t !== CATCH_ALL);
    if (real.length) {
      op.tags = real;
    } else {
      op.tags = [labelFor(tagFromPath(p))];
      retagged++;
    }
  }
}
if (retagged) console.log(`re-tagged ${retagged} operations out of "${CATCH_ALL}" by path`);

// A label can also rename a tag the spec declared. drf-yasg emits `admin`, `sla`
// and `sdwan_tunnel` in lowercase, and they sat in the sidebar that way beside
// "SD-WAN Fabric". Only an exact entry applies here — the sentence-case fallback
// is for path segments, and would rewrite "SD-WAN Fabric" as "SD WAN Fabric".
for (const item of Object.values(spec.paths ?? {})) {
  for (const [verb, op] of Object.entries(item)) {
    if (!METHODS.has(verb.toLowerCase()) || !op || typeof op !== 'object') continue;
    op.tags = (op.tags ?? []).map((t) => LABELS[t] ?? t);
  }
}

// ---- group paths by tag ----------------------------------------------------
const byTag = new Map<string, Record<string, Record<string, Op>>>();
for (const [p, item] of Object.entries(spec.paths ?? {})) {
  for (const [verb, op] of Object.entries(item)) {
    if (!METHODS.has(verb.toLowerCase()) || !op || typeof op !== 'object') continue;
    for (const tag of op.tags ?? []) {
      const paths = byTag.get(tag) ?? {};
      // A path can hold operations under different tags; each subset keeps only
      // the verbs that belong to it, so no page documents someone else's route.
      // The path-level `parameters` come along, because the operations kept here
      // inherit them — dropping them would lose arguments the endpoint requires.
      const entry = (paths[p] ??= {});
      entry[verb] = op;
      const shared = (item as Record<string, unknown>).parameters;
      if (shared !== undefined) (entry as Record<string, unknown>).parameters = shared;
      byTag.set(tag, paths);
    }
  }
}

// ---- one spec per tag, carrying only the schemas it reaches ----------------
await rm(SPEC_DIR, { recursive: true, force: true });
await mkdir(SPEC_DIR, { recursive: true });

const allSchemas = spec.components?.schemas ?? {};

// Two tags that slug the same would write one spec over the other and lose a
// page without a word about it. Cheaper to refuse than to explain later.
const bySlug = new Map<string, string>();
for (const tag of byTag.keys()) {
  const clash = bySlug.get(slug(tag));
  if (clash) {
    throw new Error(
      `tags "${clash}" and "${tag}" both slug to "${slug(tag)}" — ` +
        `one page would overwrite the other. Rename one in LABELS.`,
    );
  }
  bySlug.set(slug(tag), tag);
}

const byNorm = new Map(
  [...bySlug].map(([s, tag]) => [s.toLowerCase().replace(/[^a-z0-9]/g, ''), tag]),
);

const inputs: string[] = [];
const sizes: { tag: string; ops: number; kb: number }[] = [];

for (const tag of [...byTag.keys()].sort()) {
  const paths = byTag.get(tag)!;

  // Follow $refs until the set stops growing: a schema can reference another.
  const names = new Set<string>();
  collectRefs(paths, names);
  for (let added = true; added; ) {
    added = false;
    for (const n of [...names]) {
      const before = names.size;
      collectRefs(allSchemas[n], names);
      if (names.size !== before) added = true;
    }
  }

  const schemas: Record<string, unknown> = {};
  for (const n of [...names].sort()) if (n in allSchemas) schemas[n] = allSchemas[n];

  const subset: Spec = {
    openapi: spec.openapi,
    info: spec.info,
    servers: spec.servers,
    security: spec.security,
    tags: [{ name: tag }],
    // Sorted so a rebuild from an unchanged spec is byte-identical.
    paths: Object.fromEntries(Object.keys(paths).sort().map((p) => [p, paths[p]])),
    components: { ...spec.components, schemas },
  };

  const file = `${SPEC_DIR}/${slug(tag)}.json`;
  const json = JSON.stringify(subset, null, 2);
  await writeFile(file, json);
  inputs.push(file);
  sizes.push({
    tag,
    ops: Object.values(paths).reduce(
      (n, v) => n + Object.keys(v).filter((k) => METHODS.has(k.toLowerCase())).length,
      0,
    ),
    kb: Math.round(json.length / 1024),
  });
}

// Kept for reference and for anything still pointing at the whole document.
await writeFile(DOCS_SPEC, JSON.stringify(spec, null, 2));

await rm(OUT, { recursive: true, force: true });

await generateFiles({
  input: createOpenAPI({ input: inputs }),
  output: OUT,
  // One page per TAG. Each input declares exactly one, so this is also one page
  // per input — which is what keeps a page's inlined schema down to its own.
  per: 'tag',
  includeDescription: true,
  /**
   * Write the tag's own name as the page title.
   *
   * The generated title is the tag put through a camelCase splitter, which
   * treats a run of capitals as separate words: `SD-WAN Fabric` came out as
   * "S D W A N Fabric", and `IPAM` as "I P A M". That has been the sidebar's
   * reading of every SD-WAN tag all along — the acronyms this file now uses only
   * made it impossible to miss.
   *
   * The tag is already the name a reader should see, so it is written verbatim.
   */
  beforeWrite(files) {
    for (const f of files) {
      if (!f.path.endsWith('.mdx')) continue;
      const base = (f.path.split('/').pop() ?? '').replace(/\.mdx$/, '');
      // Compared on letters and digits alone: the file name is slugged by the
      // library, not by `slug()` here, and the two need not agree character for
      // character. A mismatch would silently skip the rename.
      const tag = byNorm.get(base.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (!tag) continue;
      // Quoted: a tag may hold a character YAML would otherwise read, like the
      // `+` in TACACS+.
      f.content = f.content.replace(/^title: .*$/m, `title: ${JSON.stringify(tag)}`);
    }
  },
});

// The folder's sidebar label is otherwise derived from its directory name, which
// renders as "Api". The directory is wiped each run, so this cannot be a
// checked-in file. mkdir first: if generateFiles produced nothing the directory
// will not exist, and the failure should be the empty result, not a stray ENOENT.
await mkdir(OUT, { recursive: true });
await writeFile(
  `${OUT}/meta.json`,
  JSON.stringify({ title: 'API reference', pages: ['...'] }, null, 2),
);

const totalKb = sizes.reduce((n, s) => n + s.kb, 0);
const biggest = [...sizes].sort((a, b) => b.ops - a.ops)[0];
console.log(
  `generated API reference from ${Object.keys(spec.paths ?? {}).length} paths\n` +
    `  ${sizes.length} tags · ${totalKb} KB of per-tag schema ` +
    `(largest: ${biggest.tag}, ${biggest.ops} operations, ${biggest.kb} KB)`,
);
