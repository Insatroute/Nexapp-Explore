import { createOpenAPI } from 'fumadocs-openapi/server';
import { readdirSync } from 'node:fs';

// One spec file per tag, written by nexapp-controller/generate-docs.ts.
//
// The whole document is not loaded here on purpose: a page inlines every path
// its schema declares, so pointing every page at the full 645-path spec put a
// flat ~1 MB of schema on all of them. Each page now preloads only the subset
// for its own tag.
//
// The directory is read rather than listed by hand so the runtime always loads
// exactly what the last generate wrote. It is absent before the first run, and
// when the controller spec is missing the generator skips and removes it — in
// both cases an empty input is correct, and the API section simply has no pages.
const SPEC_DIR = 'controller-openapi';

function specFiles(): string[] {
  try {
    return readdirSync(SPEC_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => `./${SPEC_DIR}/${f}`);
  } catch {
    return [];
  }
}

export const openapiController = createOpenAPI({ input: specFiles() });
