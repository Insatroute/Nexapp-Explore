/**
 * A guide for every tab on the device page.
 *
 * One renderer for all of them, built from two sources that answer different
 * questions and are better together than either alone:
 *
 *   - the AUTHORED note for each tab, from the device page's own description.
 *     Someone read the tab and wrote down what it is for, and that prose is
 *     pinned to the component it was written from, so it is checked when the
 *     component changes.
 *   - the EXTRACTED facts: its sub-views, its table headings, the calls it
 *     makes, and what it says when it has nothing to show. These cannot drift,
 *     because they are re-read on every build.
 *
 * Status and Traffic are excluded and have sections of their own above: each
 * carries a rule that generalises badly, and a generic pass flattened both.
 *
 * Each tab is an accordion rather than a run of headings. Fifteen tabs of
 * detail is a long page to scroll past when you came for one of them, and the
 * content is in the document either way.
 */
import { readTabDocs, type TabDoc } from './extract-tabs.ts';
import { CURATED } from './console-descriptions.ts';
import { cell } from './mdx.ts';


const BESPOKE = new Set(['status', 'traffic']);
const DETAIL = CURATED['/devices/:id'];

function tabEntry(t: TabDoc): string[] {
  const L: string[] = [];
  // The authored note is the explanation; the component's own comment is the
  // fallback for a tab nobody has written up yet.
  const explanation = DETAIL?.tabs?.[t.label] ?? t.doc;
  const opNote = (verb: string) => DETAIL?.notes?.[verb];

  L.push(`<Accordion title="${cell(t.label)}">`, '');
  if (explanation) L.push(cell(explanation), '');
  else {
    L.push(
      '<Callout type="warn">Nothing in the source describes this tab, and it is rendered by the device page itself rather than by a component with its own notes. Listed for completeness; what it shows is not written up yet.</Callout>',
      '',
    );
  }

  if (t.subs.length) {
    L.push(`**Views inside it:** ${t.subs.map((s) => `**${cell(s)}**`).join(' · ')}.`, '');
  }

  if (t.panels.length) {
    L.push(
      `**Cards on it:** ${t.panels.map((p) => `**${cell(p)}**`).join(' \u00b7 ')}.`,
      '',
    );
  }

  if (t.ranges.length) {
    L.push(
      `**Windows you can choose:** ${t.ranges.map((r) => `**${cell(r)}**`).join(', ')}, or a start and end of your own.`,
      '',
    );
  }

  if (t.columns.length) {
    L.push(
      `**Each row shows** ${t.columns.map((c) => `**${cell(c)}**`).join(', ')}.`,
      '',
    );
  }

  if (t.behind) {
    L.push(
      `This tab is the router\u2019s own interface rebuilt inside the controller \u2014 ${cell(t.behind)} of it. It is documented in full under **Network \u203a Devices \u203a CPE**, page for page, rather than summarised here.`,
      '',
    );
  }

  if (t.actions.length) {
    L.push('**What you can do here**', '');
    for (const a of t.actions) {
      const n = opNote(a);
      L.push(`- **${cell(a)}**${n ? ` — ${cell(n)}` : ''}`);
    }
    L.push('');
  }

  if (t.reads.length) {
    L.push('**What it loads**', '');
    for (const r of t.reads) {
      const n = opNote(r);
      L.push(`- ${cell(r)}${n ? ` — ${cell(n)}` : ''}`);
    }
    L.push('');
  }

  if (t.note) L.push(`<Callout type="info">${cell(t.note)}</Callout>`, '');

  if (t.empty) {
    L.push(
      `**When there is nothing to show:** “${cell(t.empty.title)}” — ${cell(t.empty.detail)}`,
      '',
    );
  }

  L.push(
    t.mutates
      ? '_Changes here take effect on save. If the API rejects one, the console shows its reply rather than a status code._'
      : '_Read-only: nothing is created, saved or applied on this tab._',
    '',
    '</Accordion>',
    '',
  );
  return L;
}

export async function tabsGuide(): Promise<string> {
  const docs = await readTabDocs();
  if (!docs.length) return '';

  const covered = docs.filter((d) => !BESPOKE.has(d.key));
  const changes = covered.filter((d) => d.mutates);
  const reads = covered.filter((d) => !d.mutates);
  const bespoke = docs.filter((d) => BESPOKE.has(d.key));

  const L: string[] = ['', '## Every tab, one by one', ''];
  L.push(
    `The device page carries ${docs.length} tabs, and they run roughly in the order you would ask questions in: is it healthy, what is it carrying, what has it been doing, then what it is configured with.`,
    '',
    `${bespoke.map((d) => `**${cell(d.label)}**`).join(' and ')} have sections of their own above, because each needs more than a summary. The other ${covered.length} are below — **${changes.length}** that change something, and **${reads.length}** that only report.`,
    '',
  );

  L.push(
    '### Tabs that change something',
    '',
    `Opening one of these can alter the device or its configuration: ${changes
      .map((d) => `**${cell(d.label)}**`)
      .join(', ')}.`,
    '',
    '<Accordions type="single">',
    '',
  );
  for (const t of changes) L.push(...tabEntry(t));
  L.push('</Accordions>', '');

  L.push(
    '### Tabs that only report',
    '',
    `These show what the device or the controller already knows. Nothing on them changes anything: ${reads
      .map((d) => `**${cell(d.label)}**`)
      .join(', ')}.`,
    '',
    '<Accordions type="single">',
    '',
  );
  for (const t of reads) L.push(...tabEntry(t));
  L.push('</Accordions>', '');

  L.push(
    '',
    '---',
    '',
    '<small>Read from: the `TABS` literal in `pages/DeviceDetail.jsx`; for each tab the component it mounts — its sub-view list, table headings, empty-state wording and the API calls it makes; and the per-tab notes on this page’s own description, which are pinned to those components.</small>',
    '',
  );
  return L.join('\n');
}
