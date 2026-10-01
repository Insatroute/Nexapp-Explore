# Screenshots for the CPE handbook

Drop a PNG in here and the matching page picks it up on the next
`npm run generate` — nothing else to edit. A page with no file for a shot
prints a short capture list instead, so the pages are valid either way.

## Where a file goes

    public/img/cpe/<section>/<screen>/<shot>.png

`<section>` and `<screen>` are the last two segments of the page's own URL.
For `/controller/network/cpe/performance-sla/path-monitors/` that is:

    public/img/cpe/performance-sla/path-monitors/list.png

## The shots each page asks for

| File | What to capture |
| --- | --- |
| `list.png`    | the screen as it opens, with a few real records on it |
| `form.png`    | the drawer open on a NEW record, so the defaults are visible |
| `delete.png`  | the delete confirmation dialog |
| `applied.png` | the staged-changes bar, after a save and before Apply |

A page only asks for the shots it can actually show: a read-only screen asks
for `list.png` alone.

## Before you capture

These come from a live controller, so treat them as published data:

- use a lab device, or blur anything that identifies a customer — hostnames,
  serials, public addresses, organization names;
- no credentials, tokens or session cookies in frame;
- capture at a normal window width so the drawer is not cropped.
