/**
 * The API reference, generated from the controller's own schema.
 *
 * content/docs/api is wiped and rebuilt on every run, so a route deleted from the
 * backend disappears here too: a stale endpoint in the docs is worse than a
 * missing one, because someone will build against it.
 *
 * If no spec is present this SKIPS rather than fails. The console reference is
 * useful on its own and needs nothing but the source tree, so a developer without
 * a running Django should still get a complete build of everything else.
 *
 * Run: npm run generate:api
 */
import { generateFiles } from 'fumadocs-openapi';
import { readFile, writeFile, rm, access, mkdir } from 'node:fs/promises';
import { openapiController as openapi } from '../lib/openapi.controller.ts';

const SPEC = './controller-openapi.json';
const DOCS_SPEC = './controller-openapi.docs.json';
const OUT = './content/controller/api';

const exists = (p: string) => access(p).then(() => true, () => false);

if (!(await exists(SPEC))) {
  console.log(
    `no ${SPEC} — skipping the API reference.\n` +
      `  To build it:  npm run spec && npm run convert`,
  );
  // Leave no half-built section behind from an earlier run that did have a spec.
  await rm(OUT, { recursive: true, force: true });
  process.exit(0);
}

const spec = JSON.parse(await readFile(SPEC, 'utf8')) as {
  paths: Record<string, unknown>;
  tags?: ({ name: string } | string)[];
};

// Keep only the tags a surviving operation still carries. generateFiles emits a
// page per DECLARED tag, so an orphaned declaration becomes an empty page in the
// sidebar.
const used = new Set<string>();
for (const item of Object.values(spec.paths ?? {})) {
  for (const op of Object.values(item as Record<string, unknown>)) {
    const tags = (op as { tags?: string[] })?.tags;
    if (Array.isArray(tags)) for (const t of tags) used.add(t);
  }
}
if (Array.isArray(spec.tags)) {
  const before = spec.tags.length;
  spec.tags = spec.tags.filter((t) => used.has(typeof t === 'string' ? t : t.name));
  const pruned = before - spec.tags.length;
  if (pruned) console.log(`pruned ${pruned} orphaned tag declarations`);
} else if (used.size) {
  // drf-yasg emits no top-level `tags` block — every tag exists only on the
  // operations that carry it. generateFiles writes one page per DECLARED tag,
  // so with none declared it wrote nothing at all and the run died trying to
  // put meta.json in a directory that was never created. Declaring exactly the
  // tags already in use is derived from the spec, not invented for it.
  spec.tags = [...used].sort().map((name) => ({ name }));
  console.log(`declared ${spec.tags.length} tags from operation usage`);
}

await writeFile(DOCS_SPEC, JSON.stringify(spec, null, 2));
await rm(OUT, { recursive: true, force: true });

await generateFiles({
  input: openapi,
  output: OUT,
  // One page per TAG, not per operation.
  //
  // Every generated page inlines the entire bundled schema, so total site size
  // scales with the PAGE COUNT, not with operations-per-page. On a comparable
  // spec, per-operation measured 738 pages / 2.0 GB against ~56 pages per-tag.
  per: 'tag',
  includeDescription: true,
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

console.log(`generated API reference from ${Object.keys(spec.paths ?? {}).length} paths`);
