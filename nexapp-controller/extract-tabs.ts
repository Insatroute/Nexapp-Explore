/**
 * Every tab on the device page, read from the component behind it.
 *
 * Fifteen tabs is too many to describe one module at a time, and they do not
 * need it: what a reader wants from each is the same handful of things, and all
 * of them are already in the source.
 *
 *   - what it is for            the component's own leading comment
 *   - what it shows             its table headings and field readouts
 *   - what you can do on it     the API calls it makes, already verb-classified
 *   - its sub-views             the `{ key, label }` list it renders as sub-tabs
 *   - what it says when empty   its empty-state wording
 *
 * A tab that yields little is described as yielding little, rather than padded
 * out to match the others. Status and Traffic have their own modules: both carry
 * rules that generalise badly, and a generic pass would have flattened them.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { factsForFile } from './extract-page-facts.ts';
import { clean } from './read-form-fields.ts';
import { readCpeMenu } from './extract-cpe.ts';

export interface TabDoc {
  key: string;
  label: string;
  /** '' when the tab is rendered inline by the device page itself. */
  component: string;
  /** The component's leading comment, first paragraph. */
  doc?: string;
  subs: string[];
  columns: string[];
  /** Cards the tab lays out, for a tab the device page renders itself. */
  panels: string[];
  /** Time ranges it offers. */
  ranges: string[];
  /** For the tab that mounts the router's own UI: how much is behind it. */
  behind?: string;
  /** Things the tab can do, as the facts extractor phrases them. */
  actions: string[];
  reads: string[];
  note?: string;
  empty?: { title: string; detail: string };
  /** True when anything here changes state on the device or the controller. */
  mutates: boolean;
}

const PAGE = path.join(FE, 'pages', 'DeviceDetail.jsx');

/** A verb the facts extractor uses for a read rather than a change. */
const READ_VERB = /^(Browse and search|View|Search|Count|Preview|Download|Export)\b/;

export async function readTabDocs(): Promise<TabDoc[]> {
  const page = await readFile(PAGE, 'utf8').catch(() => '');
  if (!page) return [];

  const tabsLit = /const TABS\s*=\s*\[([\s\S]*?)\n\]/.exec(page)?.[1] ?? '';
  const tabs = [...tabsLit.matchAll(/key:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g)].map((m) => ({
    key: m[1],
    label: clean(m[2]),
  }));

  const mounts = new Map<string, string>();
  for (const m of page.matchAll(/tab === '([a-z-]+)'[\s\S]{0,120}?<([A-Z][A-Za-z0-9_]*)/g)) {
    if (!mounts.has(m[1])) mounts.set(m[1], m[2]);
  }
  const imports = new Map<string, string>();
  for (const m of page.matchAll(/import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+'([^']+)'/g)) {
    imports.set(m[1], m[2]);
  }

  const out: TabDoc[] = [];
  for (const t of tabs) {
    const component = mounts.get(t.key) ?? '';
    const rel = component ? imports.get(component) : undefined;
    const doc: TabDoc = {
      key: t.key,
      label: t.label,
      component,
      subs: [],
      columns: [],
      panels: [],
      ranges: [],
      actions: [],
      reads: [],
      mutates: false,
    };

    if (rel) {
      const file = path.join(FE, 'pages', rel);
      const src = await readFile(file, 'utf8').catch(() => '');
      const facts = await factsForFile(file).catch(() => undefined);

      // The facts extractor reads a leading BLOCK comment; these components
      // state their intent in a run of `//` lines after the imports instead,
      // which is why every tab came back with nothing to say for itself.
      // Prefer the block attached to the component itself. Taking whatever
      // followed the imports gave Firmware its flag table's comment and CPE a
      // helper's — both true sentences about the wrong thing.
      const own = /((?:^\/\/[^\n]*\n)+)export default function/m.exec(src)?.[1];
      const after = (/\n((?:\/\/[^\n]*\n)+)/.exec(src.slice(src.lastIndexOf('import'))) ?? [])[1];
      // A block that follows the imports is only the component's own when it
      // talks about this tab. Firmware's flag table and one of CpeShell's
      // helpers both sit there, and both are true sentences about the wrong
      // thing — an absent description is better than a confident wrong one.
      const aboutThisTab =
        after && new RegExp(`^Device\\b|\u203a|\\b${t.label}\\b`, 'i').test(clean(after.replace(/^\s*\/\/\s?/gm, '')));
      const lead = own ?? facts?.doc ?? (aboutThisTab ? after : undefined);
      if (lead) {
        const text = lead
          .split('\n')
          .map((l) => l.replace(/^\s*\/\/\s?/, ''))
          .join('\n');
        // First paragraph only: the rest is usually implementation reasoning
        // written for whoever edits the file next, not for a reader.
        doc.doc = clean(text.split(/\n\s*\n/)[0]);
      }
      for (const op of facts?.operations ?? []) {
        (READ_VERB.test(op.verb) ? doc.reads : doc.actions).push(op.verb);
      }
      doc.mutates = doc.actions.length > 0;

      // Sub-views: a `{ key, label }` list the component renders as sub-tabs.
      const subsBlock = /const (?:SUBS|TABS|SUB_TABS)\s*=\s*\[([\s\S]*?)\n\]/.exec(src)?.[1] ?? '';
      doc.subs = [...subsBlock.matchAll(/label:\s*'([^']+)'/g)].map((m) => clean(m[1]));

      // Columns come two ways. A table writes `<th>`; a panel that builds its
      // own table describes them as a `{ key, label }` list instead — which is
      // why Sessions, whose columns are entirely of the second kind, looked as
      // though it showed nothing at all.
      const fromTh = [...src.matchAll(/<th[^>]*>([^<{][^<]*)<\/th>/g)].map((m) => clean(m[1]));
      // Any constant whose name ends in COLS or COLUMNS: Sessions calls its
      // list SESSION_COLUMNS, so matching only the bare names found nothing.
      const colsBlock =
        /const [A-Z_]*(?:COLS|COLUMNS|HEADS?)\s*=\s*\[([\s\S]*?)\n\]/.exec(src)?.[1] ?? '';
      const fromList = [...colsBlock.matchAll(/label:\s*'([^']+)'/g)].map((m) => clean(m[1]));
      doc.columns = [...fromTh, ...fromList].filter((c, i, a) => c && a.indexOf(c) === i);

      const note = /<p className="[^"]*hint[^"]*">\s*([^<{][^<]*?)\s*<\/p>/.exec(src)?.[1];
      if (note) doc.note = clean(note);

      const em = /<div className="msg[^"]*">[\s\S]{0,400}?<strong>([^<{]+)<\/strong>\s*<span>([^<{]+)<\/span>/.exec(src);
      if (em) doc.empty = { title: clean(em[1]), detail: clean(em[2]) };
    } else {
      // A tab the device page renders itself: its content is in that file, in
      // the block guarded by this tab's key.
      const at = page.indexOf(`tab === '${t.key}'`);
      if (at >= 0) {
        // Bounded by the next tab's block, not a character count: reading a
        // fixed window from Charts ran into Summary and reported Summary's
        // cards as if they were on Charts.
        const nextAt = page.slice(at + 10).search(/\{tab === '/);
        // Summary is rendered last, so there is no following block to stop at
        // and the fallback has to reach its final card.
        const block = page.slice(at, nextAt < 0 ? at + 14000 : at + 10 + nextAt);
        doc.panels = [...block.matchAll(/<Panel[^>]{0,80}?title="([^"]+)"/g)]
          .map((m) => clean(m[1]))
          .filter((c, i, a) => a.indexOf(c) === i);
        if (!doc.panels.length) {
          doc.panels = [...block.matchAll(/title="([^"]{3,30})"/g)]
            .map((m) => clean(m[1]))
            .filter((c, i, a) => a.indexOf(c) === i)
            .slice(0, 6);
        }
      }
      const rangeBlock = /const RANGES\s*=\s*\[([\s\S]*?)\n\]/.exec(page)?.[1] ?? '';
      if (/chart/i.test(t.key)) {
        doc.ranges = [...rangeBlock.matchAll(/label:\s*'([^']+)'/g)].map((m) => clean(m[1]));
      }
    }
    // The CPE tab mounts the router's own interface, which is documented in
    // full elsewhere. Saying how much is behind it is more use than repeating
    // any of it here.
    if (t.key === 'cpe') {
      const menu = await readCpeMenu().catch(() => []);
      const pages = menu.reduce((n, sec) => n + sec.pages.length, 0);
      if (pages) doc.behind = `${menu.length} sections and ${pages} pages`;
    }
    out.push(doc);
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const docs = await readTabDocs();
  console.log(`${docs.length} tabs\n`);
  for (const d of docs) {
    console.log(
      `${d.label.padEnd(14)}${(d.component || '(inline)').padEnd(24)}` +
        `${d.mutates ? 'changes ' : 'read    '}` +
        `acts:${String(d.actions.length).padStart(2)} reads:${String(d.reads.length).padStart(2)} ` +
        `cols:${String(d.columns.length).padStart(2)} subs:${d.subs.length}`,
    );
    if (d.doc) console.log(`    ${d.doc.slice(0, 96)}`);
  }
}
