/**
 * Generates the Console reference — one page per menu entry, documenting its
 * route, the permission it needs, and the controls actually on it.
 *
 * EVERYTHING HERE IS EXTRACTED FROM THE CONTROLLER SOURCE. Nothing is written
 * from memory or inferred. Each page states where its description came from, and
 * an entry with no grounded description gets an explicit gap marker rather than
 * invented prose.
 *
 * Sources, in order of preference for a page's description:
 *   1. console-descriptions.ts  — written by reading the page's own API calls,
 *                                 each entry recording that evidence
 *   2. (none) — emit a gap marker
 *
 * Separately, a note authored in the NAV array is rendered under "Why it sits
 * here". It is NOT used as the description: those comments explain menu
 * PLACEMENT ("top level, not under Overlay Networks, because…"), which is a
 * different claim from what the page does. Printing rationale under a heading
 * that promises function would be the exact "plausible presented as verified"
 * failure this generator exists to avoid.
 *
 * Run: npm run generate:console
 */
import { writeFile, mkdir, readdir, rm, access, copyFile } from 'node:fs/promises';
import * as path from 'node:path';
import { readNav, navComments, type NavSection, type NavLeaf } from './extract-nav.ts';
import { readRouteTable, type RouteRec, type RouteTable } from './extract-routes.ts';
import { factsForFile, type PageFacts } from './extract-page-facts.ts';
import { readCpeMenu } from './extract-cpe.ts';
import { readTabFields } from './extract-tab-fields.ts';
import { readReportCatalog } from './extract-report-catalog.ts';
import { CURATED, COMMON_NOTES } from './console-descriptions.ts';
import { OUT, KB, URL_BASE, requireController } from './config.ts';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
/**
 * Escape MDX-significant characters — but NOT inside code spans.
 *
 * A backslash is literal inside backticks: MDX prints it rather than consuming
 * it. Escaping blindly rendered `?subnet=<cidr>` as a visible `?subnet=\<cidr>`,
 * so the split below keeps the odd-indexed (code-span) parts untouched.
 */
const esc = (s: string) =>
  s
    .split(/(`[^`]*`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(/</g, '\\<').replace(/\{/g, '\\{').replace(/\}/g, '\\}'),
    )
    .join('');
const exists = (p: string) => access(p).then(() => true, () => false);

/**
 * Text safe to put in a JSX attribute: no markdown, no quote that would end it.
 * Card's `description` prop is a plain string — backticks would render literally.
 */
const plain = (s: string) => s.replace(/`/g, '').replace(/"/g, '\u201d').trim();

/**
 * Text safe inside a markdown table cell.
 *
 * A pipe would end the column and a newline would end the row, so both are
 * neutralised before the MDX escaping runs.
 */
const cell = (s: string) => esc(s.replace(/\s*\n\s*/g, ' ')).replace(/\|/g, '\\|').trim();

/**
 * Which heading an operation sits under.
 *
 * Fourteen alphabetical bullets is a wall: "Delete device" and "Browse and search
 * organizations" are very different things, and sorting by verb put the six
 * picker loads in among the four that change something. Grouping is derived from
 * the verb the operation already carries, so it stays mechanical.
 */
function groupOf(verb: string): 'Actions' | 'Bulk actions' | 'Reading and lookups' {
  if (/\(in bulk\)/.test(verb)) return 'Bulk actions';
  if (/^(Browse and search|View|Search|Count|Preview)\b/.test(verb)) return 'Reading and lookups';
  return 'Actions';
}
const GROUP_ORDER = ['Actions', 'Bulk actions', 'Reading and lookups'] as const;

/** Notes in console-descriptions.ts whose key matches no real operation. */
const orphanNotes: string[] = [];

interface Entry {
  section: string | null;
  parent?: string;
  leaf: NavLeaf;
}

/** One menu entry's page body. */
function entryBody(
  e: Entry,
  route: RouteRec | undefined,
  facts: PageFacts | undefined,
  note: string | undefined,
  permLine: string,
): { md: string; grounded: boolean } {
  const L: string[] = [];

  // --- where it is and who can open it, as a scannable band rather than a
  // sentence: these are the two questions asked most often about any page.
  const cards: string[] = [];
  if (e.leaf.to) cards.push(`  <Card title="Path" description="${plain(e.leaf.to)}" />`);
  if (e.leaf.href) cards.push(`  <Card title="Opens" description="${plain(e.leaf.href)} (Django admin)" />`);
  cards.push(`  <Card title="Who can open it" description="${plain(permLine)}" />`);
  L.push('<Cards>', ...cards, '</Cards>', '');

  // --- description
  const curated = e.leaf.to ? CURATED[e.leaf.to] : undefined;
  let grounded = false;
  if (curated) {
    L.push(esc(curated.text), '');
    grounded = true;
  } else if (e.leaf.href) {
    // A hand-off to the Django admin is fully described by where it goes. There
    // is no React page to read, so this is not a gap — it is the whole story.
    L.push(
      `This entry is a hand-off: it leaves the new UI and opens the existing Django admin at \`${e.leaf.href}\`. It has not been ported to a React page yet.`,
      '',
    );
    grounded = true;
  }
  // No else-branch marker here, deliberately.
  //
  // A warning above the content made every undescribed page read as BROKEN, when
  // in fact its path, permission, operations and columns are all extracted and
  // correct — only the prose summary is absent. So the facts lead, and the note
  // that prose is still to come sits quietly in the footer beside the provenance
  // line. Same statement, no false alarm.
  const needsOverview = !curated && !e.leaf.href;

  // --- authored placement note, labelled for what it is
  if (note) {
    L.push('## Why it sits here', '', `${esc(note)}`, '');
    L.push(`<Callout type="info">Authored note, from the \`NAV\` array in \`Sidebar.jsx\`.</Callout>`, '');
  }

  // --- a hub component serves many tabs; its facts are the hub's, not this
  // entry's, so say which route actually matched rather than implying the whole
  // call surface below belongs to this one page.
  if (route?.viaPattern) {
    L.push(
      `<Callout type="info">Served by the shared \`${route.component}\` component via the \`${route.viaPattern}\` route. Facts below describe that component, which renders several tabs.</Callout>`,
      '',
    );
  }

  // --- what the page can do, from its own call surface
  if (facts?.operations.length) {
    L.push('## What you can do here', '');
    const byGroup = new Map<string, typeof facts.operations>();
    for (const op of facts.operations) {
      const g = groupOf(op.verb);
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(op);
    }
    const used = GROUP_ORDER.filter((g) => byGroup.has(g));
    for (const g of used) {
      // One group means the heading says nothing the section above did not.
      if (used.length > 1) L.push(`### ${g}`, '');
      for (const op of byGroup.get(g)!) {
        // A page's own note wins; COMMON_NOTES is the fallback for operations
        // that mean the same thing wherever they appear.
        const note = curated?.notes?.[op.verb] ?? COMMON_NOTES[op.verb];
        L.push(note ? `- **${esc(op.verb)}** — ${esc(note)}` : `- ${esc(op.verb)}`);
      }
      L.push('');
    }
  }

  // A note keyed to an operation that no longer exists is a silent hole: the
  // explanation stops rendering and nothing says so. Collect it for the run's
  // report instead.
  if (curated?.notes) {
    const real = new Set(facts?.operations.map((o) => o.verb) ?? []);
    for (const key of Object.keys(curated.notes)) {
      if (!real.has(key)) orphanNotes.push(`${e.leaf.to ?? e.leaf.label}: note "${key}"`);
    }
  }
  if (curated?.tabs) {
    const realTabs = new Set(facts?.tabs ?? []);
    for (const key of Object.keys(curated.tabs)) {
      if (!realTabs.has(key)) orphanNotes.push(`${e.leaf.to ?? e.leaf.label}: tab "${key}"`);
    }
  }
  // Actions with no call of their own — see CuratedDescription.alsoOnPage.
  if (curated?.alsoOnPage && Object.keys(curated.alsoOnPage).length) {
    L.push('## Also on the page', '');
    for (const [label, text] of Object.entries(curated.alsoOnPage)) {
      L.push(`- **${esc(label)}** — ${esc(text)}`);
    }
    L.push(
      '',
      '<Callout type="info">These make no API call of their own, so they do not appear above: the list of operations is derived from the page’s call surface.</Callout>',
      '',
    );
  }

  if (facts?.unmapped.length) {
    L.push(
      `**Also calls:** ${facts.unmapped.map((u) => `\`${u}\``).join(' · ')} — listed verbatim because the name does not match a known verb.`,
      '',
    );
  }
  if (facts?.opens.length) {
    L.push(
      `**Opens:** ${facts.opens.map((o) => `\`${o}\``).join(' · ')} — some actions above are performed in ${facts.opens.length === 1 ? 'it' : 'these'}.`,
      '',
    );
  }
  // Tabs get a section of their own once they are described — a page with
  // fourteen of them is mostly ITS TABS, and listing the names on one line says
  // nothing about what any of them is for.
  const describedTabs = curated?.tabs && facts?.tabs.length ? curated.tabs : undefined;
  if (describedTabs && facts?.tabs.length) {
    L.push('## The tabs', '', `The page has ${facts.tabs.length}, in this order:`, '');
    for (const t of facts.tabs) {
      const d = describedTabs[t];
      L.push(d ? `- **${esc(t)}** — ${esc(d)}` : `- **${esc(t)}**`);
    }
    L.push('');
  }

  if ((facts?.tabs.length && !describedTabs) || facts?.columns.length) {
    L.push('## What the page shows', '');
    if (facts?.tabs.length && !describedTabs) {
      L.push(`**Tabs** — ${facts.tabs.map((t) => `\`${t}\``).join(' · ')}`, '');
    }
    if (facts?.columns.length) {
      L.push(`**Columns** — ${facts.columns.map((c) => `\`${c}\``).join(' · ')}`, '');
    }
  }

  // --- footer: what is still missing, then where the facts came from
  const prov: string[] = [];
  if (route?.component) prov.push(`component \`${route.component}\``);
  if (curated) prov.push(`description from \`${curated.from}\``);

  if (needsOverview || prov.length) {
    L.push('---', '');
    if (needsOverview) {
      L.push(
        '<small>A written overview of this page is still to come. Everything above is read from the controller source.</small>',
        '',
      );
    }
    if (prov.length) L.push(`<small>Read from: ${esc(prov.join('; '))}.</small>`, '');
  }

  return { md: L.join('\n'), grounded };
}

async function main() {
  await requireController();

  const nav = await readNav();
  const notes = await navComments();
  const table = await readRouteTable();
  const routes = table.routes;
  const navTargets = new Set<string>();
  for (const s of nav) {
    for (const i of s.items) {
      if (i.to) navTargets.add(i.to);
      for (const k of i.children ?? []) if (k.to) navTargets.add(k.to);
    }
  }

  await mkdir(OUT, { recursive: true });

  const sectionDirs: string[] = [];
  const rootOrder: string[] = [];
  const topLevel: string[] = [];
  // Collected as we go, so the handbook's front page is the menu — not a second
  // list of sections that has to be remembered when the console gains one.
  const topLinks: { label: string; href: string }[] = [];
  const toc: { section: string; links: { label: string; href: string }[] }[] = [];
  let total = 0;
  let grounded = 0;
  const gaps: string[] = [];

  for (const section of nav) {
    // `section: null` is NOT a group — it is an ungrouped entry that renders at
    // the sidebar's top level, and there are two of them (Dashboard, Firmware).
    // Folding both into a synthetic "Overview" folder collided them: the second
    // overwrote the first's meta.json and then deleted its page as stale.
    if (section.section === null) {
      for (const item of section.items) {
        const r = item.to ? table.match(item.to) : undefined;
        const facts = r?.file ? await factsForFile(r.file) : undefined;
        const body = entryBody(
          { section: null, leaf: item },
          r, facts, notes.get(item.label),
          item.to ? table.permSentence(item.to, navTargets.has(item.to)) : 'Not a routed entry.',
        );
        const s = slug(item.label);
        await writeFile(path.join(OUT, `${s}.mdx`), `${frontmatter(item.label, item.label)}${body.md}\n`);
        rootOrder.push(s);
        topLevel.push(s);
        topLinks.push({ label: item.label, href: `${URL_BASE}/${s}` });
        total++;
        if (body.grounded) grounded++; else gaps.push(item.to ?? item.label);
      }
      continue;
    }

    const label = section.section;
    const sslug = slug(label);
    const dir = path.join(OUT, sslug);
    await mkdir(dir, { recursive: true });

    const pageOrder: string[] = [];
    const links: { label: string; href: string }[] = [];

    for (const item of section.items) {
      // A disclosure becomes a folder; its children become the pages inside it.
      const kids = item.children ?? [];
      if (kids.length) {
        const gdir = path.join(dir, slug(item.label));
        await mkdir(gdir, { recursive: true });
        const kidOrder: string[] = [];

        for (const kid of kids) {
          const r = kid.to ? table.match(kid.to) : undefined;
          const facts = r?.file ? await factsForFile(r.file) : undefined;
          const body = entryBody(
            { section: label, parent: item.label, leaf: kid },
            r, facts, notes.get(kid.label),
            kid.to ? table.permSentence(kid.to, navTargets.has(kid.to)) : 'Not a routed entry.',
          );
          const fm = frontmatter(kid.label, `${label} › ${item.label} › ${kid.label}`);
          await writeFile(path.join(gdir, `${slug(kid.label)}.mdx`), `${fm}${body.md}\n`);
          kidOrder.push(slug(kid.label));
          total++;
          if (body.grounded) grounded++; else gaps.push(kid.to ?? kid.label);
        }

        // The disclosure itself is not a page in the console — it only opens.
        // So its index does not invent one. It carries the authored note that
        // explains why these entries were grouped, then the two facts the reader
        // is actually choosing on — where each child goes, and whether they may
        // open it — and finally each child's own one-line summary.
        //
        // Repeating path and permission here duplicates the child pages, which is
        // the point: without it, choosing between three entries means opening all
        // three. The duplication is generated from the same source on every run,
        // so it cannot drift from the page it summarises.
        const groupNote = notes.get(item.label);
        const idx: string[] = [frontmatter(item.label, `${label} › ${item.label}`)];
        if (groupNote) idx.push(esc(groupNote), '');
        idx.push(
          `\`${item.label}\` is a disclosure in the sidebar — it opens, it does not navigate. It covers:`,
          '',
        );
        idx.push('| Page | Path | Who can open it |', '| --- | --- | --- |');
        for (const k of kids) {
          const href = `${URL_BASE}/${sslug}/${slug(item.label)}/${slug(k.label)}`;
          const where = k.to
            ? `\`${k.to}\``
            : k.href
              ? `\`${k.href}\` (Django admin)`
              : '—';
          const perm = k.to
            ? table.permSentence(k.to, navTargets.has(k.to))
            : 'Not a routed entry.';
          idx.push(`| [${cell(k.label)}](${href}) | ${where} | ${cell(perm)} |`);
        }
        idx.push('');

        // First sentence of each child's own description — one line, not a copy
        // of the whole page.
        for (const k of kids) {
          const kt = k.to ? CURATED[k.to]?.text : undefined;
          const first = kt ? kt.split('\n')[0].split(/(?<=\.)\s/)[0].trim() : '';
          if (first) idx.push(`**${esc(k.label)}** — ${esc(first)}`, '');
        }
        if (groupNote) {
          idx.push(
            '',
            '<Callout type="info">The note above is authored, from the `NAV` array in `Sidebar.jsx`.</Callout>',
          );
        }
        await writeFile(path.join(gdir, 'index.mdx'), idx.join('\n') + '\n');
        await writeFile(
          path.join(gdir, 'meta.json'),
          JSON.stringify({ title: item.label, pages: ['index', ...kidOrder] }, null, 2),
        );
        pageOrder.push(slug(item.label));
        links.push({ label: item.label, href: `${URL_BASE}/${sslug}/${slug(item.label)}` });
        continue;
      }

      const r = item.to ? table.match(item.to) : undefined;
      const facts = r?.file ? await factsForFile(r.file) : undefined;
      const body = entryBody(
        { section: label, leaf: item },
        r, facts, notes.get(item.label),
        item.to ? table.permSentence(item.to, navTargets.has(item.to)) : 'Not a routed entry.',
      );
      await writeFile(
        path.join(dir, `${slug(item.label)}.mdx`),
        `${frontmatter(item.label, `${label} › ${item.label}`)}${body.md}\n${await extrasFor(item.to)}`,
      );
      pageOrder.push(slug(item.label));
      links.push({ label: item.label, href: `${URL_BASE}/${sslug}/${slug(item.label)}` });
      total++;
      if (body.grounded) grounded++; else gaps.push(item.to ?? item.label);
    }

    // Drop pages this section no longer has an entry for. A renamed entry writes
    // a new page and leaves the old one behind, still served and now wrong.
    const owned = new Set(pageOrder);
    for (const f of await readdir(dir)) {
      const base = f.replace(/\.mdx$/, '');
      if (f.endsWith('.mdx') && !owned.has(base) && base !== 'index') {
        await rm(path.join(dir, f), { force: true });
        console.log(`  removed stale page: ${sslug}/${f}`);
      }
    }

    await writeFile(
      path.join(dir, 'meta.json'),
      JSON.stringify({ title: label, pages: pageOrder }, null, 2),
    );
    sectionDirs.push(sslug);
    rootOrder.push(sslug);
    toc.push({ section: label, links });
  }

  await emitIndex(topLinks, toc, gaps.length, total);
  const detail = await emitDeviceDetail(table);
  const cpe = await emitCpe();
  total += detail + cpe;
  grounded += detail + cpe;

  const orphans = await emitOrphans(table);
  total += orphans.total;
  grounded += orphans.grounded;
  gaps.push(...orphans.gaps);

  await copyAuthoredPages();
  await removeOrphanSections(sectionDirs);
  await removeStaleTopLevel(topLevel);
  await writeRootMeta(rootOrder);

  console.log(
    `console reference: ${sectionDirs.length} sections, ${total} pages ` +
      `(${grounded} grounded, ${gaps.length} gaps)`,
  );
  if (orphanNotes.length) {
    console.warn(
      `\n  ${orphanNotes.length} note(s) in console-descriptions.ts no longer match an operation —\n` +
        orphanNotes.map((o) => `    ${o}`).join('\n') +
        `\n  The verb was renamed or the call removed. Fix the key or drop the note.\n`,
    );
  }
  if (gaps.length) {
    console.log(`\n  ${gaps.length} page(s) still need a description in scripts/console-descriptions.ts:`);
    for (const g of gaps) console.log(`    ${g}`);
    console.log('');
  }
}

/**
 * Page-specific sections that come from somewhere the facts extractor cannot see.
 *
 * The extractor reads a page's own component and the API calls it makes. Some
 * pages are governed by rules that live in the BACKEND instead, and are invisible
 * to it — the report catalogue is decided in `controller_reports/catalog.py`, not
 * in `ReportsHub.jsx`.
 *
 * Generated rather than written into a description, deliberately. A description
 * is pinned to the frontend files it was read from, so backend rules copied into
 * one would drift with nothing to notice. Read on every run, they cannot.
 */
async function extrasFor(route: string | undefined): Promise<string> {
  if (route !== '/reports') return '';
  const c = await readReportCatalog();
  if (!c) return '';

  const L: string[] = ['', '## How the catalogue is put together', ''];
  L.push(
    'The reports themselves are database rows — migrations seed them and an operator can add, rename or remove one — so they are not listed here. What decides how they are presented does not vary, and is read from `controller_reports/catalog.py`.',
    '',
    '### Which category a report lands in',
    '',
    'Taken from the report\u2019s slug: the first keyword below that appears in it wins. The order is the rule, not a presentation choice \u2014 `wan_uplink` has to be tried before `wan`. A slug matching nothing falls to Other.',
    '',
    '| Category | Shown as | Keywords, in match order |',
    '| --- | --- | --- |',
  );
  for (const k of c.categories) {
    L.push(`| \`${cell(k.key)}\` | ${cell(k.label)} | ${k.keywords.map((w) => `\`${w}\``).join(', ')} |`);
  }
  if (c.unreachable.length) {
    L.push(
      '',
      `<Callout type="warn">\`${c.unreachable.join('`, `')}\` ${c.unreachable.length === 1 ? 'is a chip the catalogue offers' : 'are chips the catalogue offers'} that no keyword selects, so ${c.unreachable.length === 1 ? 'it can never match a report' : 'they can never match a report'}. The file notes the opposite direction \u2014 that a category cannot be left unfilterable \u2014 but not this one.</Callout>`,
    );
  }

  if (c.hideSlugs.length) {
    L.push('', '### Reports no listing shows', '', esc(c.hideNote), '');
    L.push(c.hideSlugs.map((x) => `\`${x}\``).join(' \u00b7 '), '');
    if (c.hideTitles.length) {
      L.push(`Matched by title as well as slug: ${c.hideTitles.map((x) => `\u201c${x}\u201d`).join(', ')}.`, '');
    }
  }

  if (c.noCustomize.length) {
    L.push('### Visible, but not offered in Customize', '', esc(c.noCustomizeNote), '');
    L.push(c.noCustomize.map((x) => `\`${x}\``).join(' \u00b7 '), '');
  }

  if (c.accessNote) {
    L.push('### Who can see a report', '', esc(c.accessNote), '');
  }

  L.push(
    '---',
    '',
    '<small>Read from: `controller_reports/catalog.py` \u2014 its `SLUG_CATEGORY_MAP`, `CATEGORY_ORDER`, `CATEGORY_LABELS`, `HIDE_SLUGS`, `HIDE_TITLES`, `HIDDEN_FROM_CUSTOMIZE` and the docstring of `visible_templates`.</small>',
    '',
  );
  return L.join('\n');
}

/**
 * The handbook's front page, built from the same menu everything else is.
 *
 * Hand-keeping it would be one more thing to forget when the console gains a
 * section — the failure this whole generator exists to remove.
 */
async function emitIndex(
  topLinks: { label: string; href: string }[],
  toc: { section: string; links: { label: string; href: string }[] }[],
  gaps: number,
  total: number,
): Promise<void> {
  const L = [
    frontmatter('Nexapp Controller handbook', 'Every page in the console: what it is for, who can open it, and what is on it.'),
    'Every page below is generated from the controller source — the sidebar it mirrors,',
    'the route table, the permission map, and the API calls each page makes.',
    '',
  ];
  if (gaps) {
    L.push(
      '<Callout type="info">',
      `  ${total - gaps} of ${total} pages carry a written overview so far. The rest list their`,
      '  route, permission, operations and columns — all read from source and accurate —',
      '  and note in the footer that the written overview is still to come.',
      '</Callout>',
      '',
    );
  }
  for (const t of topLinks) L.push(`- [${t.label}](${t.href})`);
  if (topLinks.length) L.push('');
  for (const { section, links } of toc) {
    if (!links.length) continue;
    L.push(`## ${section}`, '');
    for (const l of links) L.push(`- [${l.label}](${l.href})`);
    L.push('');
  }
  await writeFile(path.join(OUT, 'index.mdx'), L.join('\n'));
}

function frontmatter(title: string, description: string): string {
  // Quoted, because a title containing ':' ("TACACS+: servers") is invalid YAML
  // unquoted and would fail the MDX parse at build time rather than here.
  return ['---', `title: ${JSON.stringify(title)}`, `description: ${JSON.stringify(description)}`, '---', '', ''].join('\n');
}

/**
 * The device detail page — the deepest surface in the console and the one with
 * its own tab bar. TABS is a plain literal in DeviceDetail.jsx, so unlike the
 * SDWAN Lite equivalent this needs no browser to enumerate correctly.
 */
/**
 * Screens the sidebar never points at.
 *
 * `NAV` is this generator's map of the console, so a page reached only by a
 * button on another page is invisible to it. Six were, and the handbook
 * described a console that did not have them.
 *
 * The list is written out because nothing in the source enumerates it — a route
 * being absent from `NAV` is the only thing these have in common. Everything
 * ABOUT them is still read: the label and the placement are the app's own, from
 * the `TITLES` map in `layouts/AppLayout.jsx`, which names each route and gives
 * the breadcrumb it sits under.
 *
 * `/reports/custom/:id` is deliberately not here. It renders the same component
 * in custom mode, so it is described on the Report page rather than given a
 * second page saying the same things.
 */
const ORPHANS: {
  to: string;
  label: string;
  /** Folder under content/controller, from the route's crumbs in AppLayout. */
  dir: string;
  crumbs: string;
  /** The page it is placed after in that folder's meta.json. */
  after: string;
}[] = [
  { to: '/devices/map', label: 'Fleet map', dir: 'network', crumbs: 'Network › Devices › Map', after: 'device-detail' },
  { to: '/devices/:id/sdlan', label: 'SDLAN Access', dir: 'network', crumbs: 'Network › Devices › SDLAN Access', after: 'fleet-map' },
  { to: '/device-groups/tree', label: 'Device group tree', dir: 'administration', crumbs: 'Administration › Device Groups › Tree', after: 'device-groups' },
  { to: '/network-topology/topologies/:id/graph', label: 'Topology graph', dir: 'network-topology', crumbs: 'Network Topology › Topologies › Graph', after: 'topologies' },
  { to: '/monitoring/metrics/recover', label: 'Recover deleted metrics', dir: 'intelligence/monitoring', crumbs: 'Intelligence › Monitoring › Metrics › Recover', after: 'metrics' },
  { to: '/reports/:slug', label: 'Report', dir: 'reports-logs', crumbs: 'Reports & Logs › Reports › one report', after: 'reports' },
];

/** Put `page` after `after` in a folder's meta.json, without disturbing the rest. */
async function placeInMeta(dir: string, page: string, after: string): Promise<void> {
  const metaPath = path.join(dir, 'meta.json');
  if (!(await exists(metaPath))) return;
  const { readFile: rf } = await import('node:fs/promises');
  const meta = JSON.parse(await rf(metaPath, 'utf8')) as { pages: string[] };
  if (meta.pages.includes(page)) return;
  const at = meta.pages.indexOf(after);
  meta.pages.splice(at < 0 ? meta.pages.length : at + 1, 0, page);
  await writeFile(metaPath, JSON.stringify(meta, null, 2));
}

async function emitOrphans(table: RouteTable): Promise<{ total: number; grounded: number; gaps: string[] }> {
  let total = 0;
  let grounded = 0;
  const gaps: string[] = [];

  for (const o of ORPHANS) {
    const r = table.match(o.to);
    if (!r?.file) {
      // The route is gone from App.jsx. Say so rather than quietly emitting
      // nothing — a screen that has been removed should be removed here too.
      gaps.push(`${o.to} (no longer in App.jsx)`);
      continue;
    }
    const facts = await factsForFile(r.file);
    const body = entryBody(
      { section: o.crumbs, leaf: { label: o.label, to: o.to } },
      r,
      facts,
      undefined,
      // Not a menu entry: `ROUTE_PERM` does not govern it, and permSentence
      // says exactly that when told the route is not a nav target.
      table.permSentence(o.to, false),
    );

    const dir = path.join(OUT, ...o.dir.split('/'));
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `${slug(o.label)}.mdx`),
      `${frontmatter(o.label, o.crumbs)}${body.md}\n`,
    );
    await placeInMeta(dir, slug(o.label), o.after);

    total++;
    if (body.grounded) grounded++;
    else gaps.push(o.to);
  }
  return { total, grounded, gaps };
}

async function emitDeviceDetail(table: RouteTable): Promise<number> {
  const r = table.match('/devices/:id');
  if (!r?.file) return 0;
  const facts = await factsForFile(r.file);
  if (!facts?.tabs.length) return 0;

  // Rendered through entryBody like every other page rather than by a private
  // emitter: it was the one page that missed the cards, the grouped operations
  // and the curated notes, purely because it had grown its own code path.
  const body = entryBody(
    { section: 'Network', leaf: { label: 'Device detail', to: '/devices/:id' } },
    r,
    facts,
    undefined,
    // Not a menu entry — it is reached by opening a row.
    table.permSentence('/devices/:id', false),
  );

  // --- what each tab actually puts on screen.
  //
  // The tab list above says what each tab is FOR in a sentence. That left the
  // largest page in the console describing fourteen tabs without naming a single
  // thing any of them shows, while the page itself shows dozens.
  //
  // The readings are listed; the values are not. `8.2 GB` and `4d 17h 51m` come
  // from the device's own check-in, so writing one down freezes a snapshot that
  // is wrong by the next one — the failure this generator exists to avoid.
  const tabFields = await readTabFields();
  const extra: string[] = [];
  for (const t of tabFields) {
    extra.push(
      '',
      `## What the ${esc(t.label)} tab shows`,
      '',
      'The readings this tab puts on screen. Values are not listed here: the device reports them at check-in, so any figure written down would be stale by the next one.',
      '',
      '| Where | Readings |',
      '| --- | --- |',
    );
    for (const g of t.groups) {
      for (const k of g.cards) {
        const where = k.title && k.title !== g.label ? `${g.label} › ${k.title}` : g.label || k.title;
        extra.push(`| ${cell(where)} | ${cell(k.fields.join(', '))} |`);
      }
    }
    const conditional = t.groups.some((g) => g.conditional);
    extra.push(
      '',
      `<small>Read from: \`${t.component}\` — its \`sections\` list, the \`<StatusCard>\` headings inside each, and the \`<Field label>\` readings under those.` +
        (conditional ? ' A section renders only for a device that reports it.' : '') +
        '</small>',
    );
  }

  const dir = path.join(OUT, 'network');
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'device-detail.mdx'),
    `${frontmatter('Device detail', 'Network › Devices › a single device — every tab on the page.')}${body.md}\n${extra.join('\n')}\n`,
  );

  // Keep it beside Devices in the section order rather than letting it sort away.
  const metaPath = path.join(dir, 'meta.json');
  if (await exists(metaPath)) {
    const { readFile: rf } = await import('node:fs/promises');
    const meta = JSON.parse(await rf(metaPath, 'utf8'));
    if (!meta.pages.includes('device-detail')) {
      const at = meta.pages.indexOf('devices');
      meta.pages.splice(at < 0 ? meta.pages.length : at + 1, 0, 'device-detail');
      await writeFile(metaPath, JSON.stringify(meta, null, 2));
    }
  }
  return 1;
}

/**
 * The CPE tab's own navigation — the largest surface in the console and the only
 * one the sidebar never reaches, because it sits two levels down: Devices → a
 * device → the CPE tab.
 */
async function emitCpe(): Promise<number> {
  const menu = await readCpeMenu();
  const all = menu.flatMap((s) => s.pages);
  const withCalls = all.filter((p) => p.calls.length);
  const methods = withCalls.reduce((n, p) => n + p.calls.length, 0);
  // Call sites whose method is computed rather than written down. Counted, not
  // guessed: a page that has them is not fully described, and saying so is the
  // difference between a gap and a silent omission.
  const dynamic = all.reduce((n, p) => n + p.dynamicCalls, 0);

  const dir = path.join(OUT, 'network', 'cpe');
  await mkdir(dir, { recursive: true });

  // An earlier run emitted this as a single flat page; a folder and a flat page
  // of the same name are two routes for one thing.
  await rm(path.join(OUT, 'network', 'cpe-pages.mdx'), { force: true });

  // ---- index
  const idx = [
    frontmatter('CPE', 'Network \u203a Devices \u203a a device \u203a the CPE tab \u2014 the router\u2019s own UI, page for page.'),
    '<Cards>',
    '  <Card title="Where it is" description="Devices \u203a a device \u203a the CPE tab" />',
    `  <Card title="Size" description="${menu.length} sections, ${all.length} pages" />`,
    '</Cards>',
    '',
    'The CPE tab is the router\u2019s own web interface rebuilt inside the controller. Everything else in',
    'this handbook describes CONTROLLER state; these pages talk to the device itself, over RPCD.',
    '',
    'Each entry mirrors a page the classic device form already ships and names the `(tab, subtab)` pair',
    'that page switches on \u2014 which is what lets an entry not yet rebuilt in React open the real,',
    'working classic page instead of being a dead menu row.',
    '',
    `<Callout type="info">${all.length - all.filter((p) => !p.built).length} of ${all.length} pages are rebuilt in React. ${withCalls.length} of them name the RPCD methods they call, ${methods} in total; the remaining ${all.length - withCalls.length} reach the router another way \u2014 \`CpeSlaSettingsPage\` says so itself: \u201cThis page is NOT a straight RPCD proxy\u201d.${dynamic ? (dynamic === 1 ? ' One further call site picks its method at runtime, so it cannot be named here.' : ` A further ${dynamic} call sites pick their method at runtime, so they cannot be named here.`) : ''}</Callout>`,
    '',
  ];
  for (const sec of menu) {
    const n = sec.pages.reduce((a, p) => a + p.calls.length, 0);
    idx.push(
      `- [${sec.label}](${URL_BASE}/network/cpe/${slug(sec.label)}) \u2014 ${sec.pages.length} pages` +
        (n ? `, ${n} RPCD methods` : ''),
    );
  }
  idx.push('', '---', '', '<small>Read from: the `CPE_MENU` literal in `components/cpe/cpeMenu.js`, and the RPCD method names each page component calls.</small>', '');
  await writeFile(path.join(dir, 'index.mdx'), idx.join('\n'));

  // ---- one page per section
  const order: string[] = ['index'];
  for (const sec of menu) {
    const n = sec.pages.reduce((a, p) => a + p.calls.length, 0);
    const L = [
      frontmatter(sec.label, `CPE \u203a ${sec.label}`),
      '<Cards>',
      `  <Card title="Pages" description="${sec.pages.length}" />`,
      `  <Card title="RPCD methods" description="${n}" />`,
      '</Cards>',
      '',
    ];
    let group: string | undefined;
    for (const pg of sec.pages) {
      if (pg.group && pg.group !== group) { L.push(`## ${esc(pg.group)}`, ''); group = pg.group; }
      L.push(`### ${esc(pg.label)}`, '');
      if (pg.admin?.tab) {
        const sub = pg.admin.subtab ? `, subtab \`${pg.admin.subtab}\`` : '';
        L.push(`Mirrors the classic device form\u2019s \`${pg.admin.tab}\` tab${sub}.`, '');
      }
      if (pg.dynamicCalls) {
        L.push(
          pg.dynamicCalls === 1
            ? 'One further call site on this page picks its method at runtime.'
            : `${pg.dynamicCalls} further call sites on this page pick their method at runtime.`,
          '',
        );
      }
      if (pg.calls.length) {
        L.push(
          `Calls ${pg.calls.length} RPCD method${pg.calls.length === 1 ? '' : 's'} on the router:`,
          '',
          pg.calls.map((c) => `\`${c}\``).join(' \u00b7 '),
          '',
        );
      } else {
        L.push('Reaches the router without naming RPCD methods in its own source, so none are listed here.', '');
      }
    }
    L.push('---', '', '<small>Read from: `components/cpe/cpeMenu.js` and each page component.</small>', '');
    await writeFile(path.join(dir, `${slug(sec.label)}.mdx`), L.join('\n'));
    order.push(slug(sec.label));
  }
  await writeFile(path.join(dir, 'meta.json'), JSON.stringify({ title: 'CPE', pages: order }, null, 2));

  // Sits after Device detail, which is where the tab actually lives.
  const metaPath = path.join(OUT, 'network', 'meta.json');
  if (await exists(metaPath)) {
    const { readFile: rf } = await import('node:fs/promises');
    const meta = JSON.parse(await rf(metaPath, 'utf8'));
    meta.pages = meta.pages.filter((x: string) => x !== 'cpe-pages');
    if (!meta.pages.includes('cpe')) {
      const at = meta.pages.indexOf('device-detail');
      meta.pages.splice(at < 0 ? meta.pages.length : at + 1, 0, 'cpe');
    }
    await writeFile(metaPath, JSON.stringify(meta, null, 2));
  }
  return 1 + menu.length;
}

/** Prose authored in the controller repo, if that directory exists yet. */
async function copyAuthoredPages(): Promise<void> {
  const pages = path.join(KB, '_pages');
  if (!(await exists(pages))) return;
  const walk = async (from: string, rel = ''): Promise<void> => {
    for (const e of await readdir(from, { withFileTypes: true })) {
      const p = path.join(from, e.name);
      if (e.isDirectory()) await walk(p, path.join(rel, e.name));
      else if (e.name.endsWith('.mdx')) {
        const target = path.join(OUT, rel);
        await mkdir(target, { recursive: true });
        await copyFile(p, path.join(target, e.name));
      }
    }
  };
  await walk(pages);
}

/** A section that stops existing must not stay served. */
async function removeOrphanSections(keep: string[]): Promise<void> {
  const allowed = new Set([...keep, 'api', 'concepts', 'start', 'reference']);
  for (const e of await readdir(OUT, { withFileTypes: true })) {
    if (!e.isDirectory() || allowed.has(e.name)) continue;
    await rm(path.join(OUT, e.name), { recursive: true, force: true });
    console.log(`  removed orphan section: ${e.name}/`);
  }
}

/** Root order is DERIVED from the menu, never hand-kept. */
async function writeRootMeta(menuOrder: string[]): Promise<void> {
  const ents = await readdir(OUT, { withFileTypes: true });
  const dirs = new Set(ents.filter((e) => e.isDirectory()).map((e) => e.name));
  const files = new Set(
    ents.filter((e) => e.isFile() && e.name.endsWith('.mdx')).map((e) => e.name.replace(/\.mdx$/, '')),
  );
  // menuOrder already carries the console's own ordering, with sections and
  // ungrouped items interleaved exactly as the sidebar renders them.
  const menu = menuOrder.filter((p) => dirs.has(p) || files.has(p));
  const before = ['index', 'start', 'concepts'].filter(
    (p) => (files.has(p) || dirs.has(p)) && !menu.includes(p),
  );
  const after = ['reference'].filter((p) => dirs.has(p));
  const root = [...before, ...menu, ...after];
  if (dirs.has('api')) root.push('---Generated---', 'api');
  await writeFile(path.join(OUT, 'meta.json'), JSON.stringify({ pages: root }, null, 2));
}

/** A top-level entry that left the menu must not stay served. */
async function removeStaleTopLevel(owned: string[]): Promise<void> {
  const keep = new Set([...owned, 'index']);
  for (const e of await readdir(OUT, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith('.mdx')) continue;
    const base = e.name.replace(/\.mdx$/, '');
    if (keep.has(base)) continue;
    await rm(path.join(OUT, e.name), { force: true });
    console.log(`  removed stale top-level page: ${e.name}`);
  }
}

await main();
