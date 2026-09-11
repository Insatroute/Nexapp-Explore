# Nexapp Controller Explore

The knowledge base for the **Nexapp Controller** — the Django + React SD-WAN
controller in `nexapp-controller-new-ui`.

Almost none of this documentation is written by hand. The pages are generated
from the controller itself, so they cannot quietly fall out of date:

| What | Where it comes from |
|---|---|
| Menu structure, sections, disclosures | The `NAV` literal in `frontend/src/components/Sidebar.jsx` |
| Routes and components | The `<Route>` table in `frontend/src/App.jsx` |
| Permissions | `ROUTE_PERM` in `frontend/src/auth/navPermissions.js` |
| What a page can do | The API calls the page makes, in **both** API layers |
| Columns and tabs | The page's own literals |
| API reference | The schema drf-yasg generates from the live URLConf |
| Explanatory prose | `console-descriptions.ts`, each entry recording its evidence |

## Why there is no browser crawler

The SDWAN Lite knowledge base drives a headless browser and reads the rendered
DOM, because in Vue + Ant Design source a tab and a dropdown filter are both
`{ key, label }` — the text does not carry the distinction, and four separate
extraction bugs came from pretending it did.

**This console does not have that problem.** `Sidebar.jsx` declares one `NAV`
literal in which every kind of entry is a *different shape*:

```js
{ section: 'Network', items: [...] }      // a group
{ label: 'Devices',  to: '/devices' }     // a route in the SPA
{ label: 'Firmware', href: '/admin/…' }   // a hand-off to the Django admin
{ label: 'Configuration', children: [] }  // a disclosure, not a link
```

So reading the source is both correct *and* has no live dependency: no console to
run, no credentials, nothing that could click a destructive control on a
production system. The extractor **evaluates** the literal rather than
pattern-matching it — if `NAV` ever stops being plain data, it throws instead of
quietly returning a partial menu.

## Running it

```bash
npm install

# optional — defaults to ../nexapp-controller-new-ui
export NXC_SRC=/path/to/nexapp-controller-new-ui

npm run generate     # rebuild every page from the controller source
npm run check:links  # fail on a dead internal link
npm run dev          # http://localhost:3002/kb
```

The console reference needs **only the source tree** — no database, no running
Django, no credentials. The API reference additionally needs a schema:

```bash
npm run spec       # boots Django in-process, drf-yasg -> swagger.json
npm run convert    # Swagger 2.0 -> OpenAPI 3.0 -> openapi.json
```

`npm run spec` needs the controller's Python environment. The reliable way is
inside the running container:

```bash
docker compose exec web python /code/scripts/dump-schema.py -o /code/swagger.json
# then copy swagger.json into this repo and run: npm run convert
```

If no spec is present the API reference is **skipped**, not failed — everything
else still builds.

## What it guarantees

The build fails rather than publishing something wrong:

- **A broken internal link fails the build** (`scripts/check-links.ts`).
- **A page with no written description renders a visible gap marker**, never
  invented prose. `npm run generate:console` lists every gap by name.
- **A page whose menu entry disappeared is deleted**, and so is a whole section
  that stops existing. A stale page is worse than a missing one, because it still
  reads as current.
- **Placement rationale is never printed as function.** The `NAV` array carries
  authored comments, but they explain *why an entry sits where it does* — a
  different claim from what the page does. They render under "Why it sits here",
  labelled as authored notes, never as the description.

## Layout

```
scripts/
  config.ts                     where the controller source is (NXC_SRC)
  extract-nav.ts                the NAV literal -> sections, entries, authored notes
  extract-routes.ts             App.jsx routes + ROUTE_PERM permissions
  extract-page-facts.ts         operations, columns and tabs, from each page
  generate-console-reference.ts one page per menu entry
  generate-docs.ts              API reference from the OpenAPI spec
  dump-schema.py                drf-yasg schema dump (read-only)
  convert-spec.ts               Swagger 2.0 -> OpenAPI 3.0
  check-links.ts                fails the build on a dead link
  console-descriptions.ts       descriptions, each recording its evidence
  publish.sh                    refresh and publish
app/ components/ lib/           the Fumadocs renderer
```

`content/docs/` is generated and intentionally not committed — run the generators.

Built on [Fumadocs](https://fumadocs.dev).
