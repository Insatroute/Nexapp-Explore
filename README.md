# Nexapp Explore

The knowledge base for **SDWAN Lite**, the Nexapp router management platform.

Almost none of this documentation is written by hand. The pages are generated
from the platform itself, so they cannot quietly fall out of date:

| What | Where it comes from |
|---|---|
| Menu structure, tabs, sub-tabs | Captured from the **running console's DOM** |
| Routes, permissions, columns, actions, filters | The platform's Vue source |
| API reference (700+ endpoints) | The OpenAPI document the backend generates |
| Explanatory prose | `nexapp-rms2/docs/kb/`, beside the code it describes |

## Why the structure is read from the DOM

Reading it from the Vue source was tried first, and was wrong four times over:
12 menu items where the console shows 16, 25 device tabs where it shows 8, and no
sub-tabs under Analytics where it has ten.

The cause is not fixable by better parsing. In source, a tab and a dropdown
filter are the same `{ key, label }` shape — the distinction simply is not in the
text. In the rendered page it is obvious: a tab is a tab because it renders as
one. So `scripts/crawl-nav.py` signs in and reads the real thing.

It is strictly read-only. It navigates and expands menus; it never clicks a
control that creates, edits, deletes, reboots, rotates or pushes anything.

## Running it

```bash
npm install

export KB_USER=<console user>
export KB_PASSWORD=<password>       # never committed

npm run capture      # read the live console  -> nav-manifest.json
npm run spec         # dump the platform's OpenAPI document
npm run generate     # rebuild every page from those two
npm run build        # generate + link check + static export
```

`npm run sync` does all of it in one go. `npm run publish` also rsyncs the result
to the host, where the console's nginx serves it at `/kb`.

## What it guarantees

The build fails rather than publishing something wrong:

- **A broken internal link fails the build** (`scripts/check-links.ts`), because a
  dead link found by a reader is found too late.
- **A menu entry with no description renders a visible gap marker**, never
  invented prose. A knowledge base people rely on must not blur "verified" into
  "plausible".
- **A page whose menu entry disappeared is deleted**, and an orphaned doc is
  reported by name. A stale page is worse than a missing one, because it still
  reads as current.

## Layout

```
scripts/
  crawl-nav.py                  read the running console (structure)
  generate-console-reference.ts one page per menu entry
  generate-docs.ts              API reference from the OpenAPI spec
  check-links.ts                fails the build on a dead link
  console-descriptions.ts       descriptions written by reading each page's API calls
  publish.sh                    refresh and publish
app/ components/ lib/           the Fumadocs renderer
```

`content/docs/` is generated and intentionally not committed — run the generators.

Built on [Fumadocs](https://fumadocs.dev).
