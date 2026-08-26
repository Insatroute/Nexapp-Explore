import { generateFiles } from 'fumadocs-openapi';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { openapi } from '../lib/openapi.ts';

// The API reference is GENERATED, never edited. content/docs/api is wiped and
// rebuilt on every run so a route deleted from the backend disappears here too:
// a stale endpoint in the docs is worse than a missing one, because someone will
// build against it.
//
// openapi.json itself comes from the platform:
//   backend $ go run ./cmd/openapi-dump -o <here>/openapi.json
// which walks the live chi router, so this can never drift from what the API
// actually serves.

const SPEC = './openapi.json';
const DOCS_SPEC = './openapi.docs.json';
const OUT = './content/docs/api';

// ---------------------------------------------------------------------------
// Drop the mirrored northbound namespace.
//
// The platform exposes almost its entire console API a second time under
// /api/v1/* for northbound integrators. Measured against the real spec: 366 such
// paths, of which 364 are BYTE-IDENTICAL mirrors of a console path — only
// /api/v1/docs and /api/v1/openapi.json are unique to it.
//
// Documenting both doubles the reference for no new information, and because
// every generated page inlines the whole bundled schema, it also doubled the
// built site. The endpoints remain fully documented under their console paths.
// ---------------------------------------------------------------------------
const spec = JSON.parse(await readFile(SPEC, 'utf8')) as {
  paths: Record<string, unknown>;
  tags?: ({ name: string } | string)[];
};

const V1 = '/api/v1/';
let dropped = 0;
for (const path of Object.keys(spec.paths)) {
  if (!path.startsWith(V1)) continue;
  // Only drop it when the console equivalent is actually present, so a
  // genuinely v1-only endpoint is never silently lost from the docs.
  if (`/api/${path.slice(V1.length)}` in spec.paths) {
    delete spec.paths[path];
    dropped++;
  }
}

// Removing paths orphans their tag declarations, and generateFiles emits a page
// per DECLARED tag — leaving 57 empty "v1/*" pages in the sidebar. Keep only the
// tags still carried by a surviving operation.
const used = new Set<string>();
for (const item of Object.values(spec.paths)) {
  for (const op of Object.values(item as Record<string, unknown>)) {
    if (op && typeof op === 'object' && Array.isArray((op as { tags?: string[] }).tags)) {
      for (const t of (op as { tags: string[] }).tags) used.add(t);
    }
  }
}
if (Array.isArray(spec.tags)) {
  const before = spec.tags.length;
  spec.tags = spec.tags.filter((t) => used.has(typeof t === 'string' ? t : t.name));
  console.log(`pruned ${before - spec.tags.length} orphaned tag declarations`);
}

await writeFile(DOCS_SPEC, JSON.stringify(spec, null, 2));
console.log(`filtered spec: dropped ${dropped} mirrored /api/v1/* paths`);

await rm(OUT, { recursive: true, force: true });

await generateFiles({
  input: openapi,
  output: OUT,
  // One page per TAG, not per operation.
  //
  // Every generated page inlines the entire bundled schema, so total site size
  // scales with the PAGE COUNT, not with operations-per-page. Per-operation was
  // measured at 738 pages / 2.0 GB; per-tag is ~56 pages. The backend's tag
  // derivation was also fixed (see internal/docs/openapi.go tagOf) so no single
  // tag holds more than ~39 operations.
  per: 'tag',
  includeDescription: true,
});

// generateFiles() derives the folder's sidebar label from its directory name,
// which renders as "Api". The directory is wiped on every run, so this has to be
// written here rather than kept as a checked-in file.
await writeFile(
  `${OUT}/meta.json`,
  JSON.stringify({ title: 'API reference', pages: ['...'] }, null, 2),
);

console.log('generated API reference');
