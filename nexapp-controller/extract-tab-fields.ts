/**
 * The fields each device-detail tab puts on screen, read from the panel that
 * renders it.
 *
 * The device page is fourteen tabs deep and the handbook described each one in
 * a sentence, which told a reader what a tab is FOR but not what it actually
 * shows. The labels are not hidden: every readout is a `<Field label="Uptime">`
 * literal in the panel component, the same kind of ground truth the route table
 * and the permission map already give.
 *
 * The VALUES are deliberately not read. `8.2 GB`, `4d 17h 51m` and `99.79%` come
 * from the device's own NetJSON at request time, so writing them down would
 * freeze a snapshot that is wrong by the next check-in — the exact failure this
 * generator exists to avoid. What the code guarantees is the INVENTORY: which
 * readouts a tab can show, and how they are grouped.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';

export interface TabCard {
  /** The card's heading, or '' when the section draws no card around its fields. */
  title: string;
  fields: string[];
}
export interface TabGroup {
  label: string;
  cards: TabCard[];
  /** True when the panel only renders this group for devices that report it. */
  conditional: boolean;
}
export interface TabFields {
  key: string;
  label: string;
  component: string;
  groups: TabGroup[];
}

/** Slice from `open` to its matching close, ignoring comments and strings. */
function sliceBody(src: string, from: number, open: '{' | '[' | '(' = '{'): string {
  const close = open === '{' ? '}' : open === '[' ? ']' : ')';
  const start = src.indexOf(open, from);
  if (start < 0) return '';
  let depth = 0, inLine = false, inBlock = false, quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i], next = src[i + 1], prev = src[i - 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
    if (c === '/' && next === '/') { inLine = true; i++; continue; }
    if (c === '/' && next === '*') { inBlock = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return '';
}

/**
 * `<Field label="Uptime" …>` — in source order, first occurrence wins.
 *
 * Scoped to `<Field>` on purpose. Matching every `label=` in the file swept up
 * `<Loading label="Loading checks…">` and the Firmware tab's two checkboxes,
 * which are a placeholder and two controls — neither is a reading the tab shows
 * about the device.
 */
const labelsIn = (src: string): string[] => [
  ...new Set([...src.matchAll(/<Field\b[^>]{0,300}?\blabel="([^"]{1,40})"/g)].map((m) => m[1])),
];

/** The body of `function Name(...) {...}`, or '' when the file has no such function. */
function functionBody(src: string, name: string): string {
  const re = new RegExp(`function\\s+${name}\\s*\\(`);
  const m = re.exec(src);
  if (!m) return '';
  const paren = src.indexOf('(', m.index);
  const params = sliceBody(src, paren, '(');
  return sliceBody(src, paren + params.length);
}

/**
 * Components a section renders that live in the same file — `<PortRow …>` inside
 * `NetworkSection`. One level only: the readouts a reader sees on the tab sit
 * either in the section or in the row it repeats, and going deeper starts
 * pulling in shared chrome that is not a readout at all.
 */
function nestedLabels(src: string, body: string, skip: Set<string>): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)) {
    const name = m[1];
    if (skip.has(name)) continue;
    skip.add(name);
    const nested = functionBody(src, name);
    if (nested) out.push(...labelsIn(nested));
  }
  return out;
}

/**
 * Split a section into the cards the reader sees.
 *
 * A section is one entry in the panel's `sections` list, but on screen it is
 * several cards — the System section draws System, CPU and Memory. Grouping only
 * by section put seventeen readouts in one undifferentiated row; grouping by
 * `<StatusCard title="…">` matches what is actually on the page.
 */
function cardsIn(src: string, body: string, skip: Set<string>): TabCard[] {
  const marks = [...body.matchAll(/<StatusCard\b[^>]{0,200}?\btitle="([^"]+)"/g)];
  if (!marks.length) {
    const fields = [...new Set([...labelsIn(body), ...nestedLabels(src, body, skip)])];
    return fields.length ? [{ title: '', fields }] : [];
  }
  const out: TabCard[] = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].index ?? 0;
    const end = i + 1 < marks.length ? marks[i + 1].index ?? body.length : body.length;
    const chunk = body.slice(start, end);
    const fields = [...new Set([...labelsIn(chunk), ...nestedLabels(src, chunk, skip)])];
    if (fields.length) out.push({ title: marks[i][1], fields });
  }
  return out;
}

export async function readTabFields(): Promise<TabFields[]> {
  const pageFile = path.join(FE, 'pages', 'DeviceDetail.jsx');
  const page = await readFile(pageFile, 'utf8');

  // ---- the tab list, in the order the page shows it
  const tabsLit = sliceBody(page, page.indexOf('const TABS'), '[');
  const tabs: { key: string; label: string }[] = [];
  for (const m of tabsLit.matchAll(/key:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'/g)) {
    tabs.push({ key: m[1], label: m[2] });
  }

  // ---- which component each tab mounts: `{tab === 'status' && <DeviceStatusPanel`
  const mounts = new Map<string, string>();
  for (const m of page.matchAll(/tab === '([a-z-]+)'[\s\S]{0,120}?<([A-Z][A-Za-z0-9_]*)/g)) {
    if (!mounts.has(m[1])) mounts.set(m[1], m[2]);
  }

  // ---- component -> file, from the page's own imports
  const importedFrom = new Map<string, string>();
  for (const m of page.matchAll(/import\s+([A-Z][A-Za-z0-9_]*)\s+from\s+'([^']+)'/g)) {
    importedFrom.set(m[1], m[2]);
  }

  const out: TabFields[] = [];
  for (const t of tabs) {
    const comp = mounts.get(t.key);
    const rel = comp ? importedFrom.get(comp) : undefined;
    if (!comp || !rel) continue;

    let src: string;
    try {
      src = await readFile(path.join(FE, 'pages', rel), 'utf8');
    } catch {
      continue;
    }

    const groups: TabGroup[] = [];
    // A panel that groups its readouts says so in a `sections` literal; one that
    // does not is read whole, as a single unnamed group.
    const secIdx = src.search(/const\s+sections\s*=\s*\[/);
    if (secIdx >= 0) {
      const lit = sliceBody(src, secIdx, '[');
      for (const m of lit.matchAll(
        /label:\s*'([^']+)'([\s\S]{0,400}?)render:\s*\(\)\s*=>\s*<([A-Z][A-Za-z0-9_]*)/g,
      )) {
        const [, label, between, sectionComp] = m;
        const body = functionBody(src, sectionComp);
        if (!body) continue;
        const seen = new Set<string>([sectionComp]);
        const cards = cardsIn(src, body, seen);
        if (cards.length) {
          groups.push({ label, cards, conditional: /show:\s*(?!true\b)/.test(between) });
        }
      }
    }
    if (!groups.length) {
      // Ungrouped panel: still worth listing, but only if it has real readouts.
      const cards = cardsIn(src, src, new Set<string>());
      if (cards.length) groups.push({ label: '', cards, conditional: false });
    }
    if (groups.length) out.push({ key: t.key, label: t.label, component: comp, groups });
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tabs = await readTabFields();
  const n = tabs.reduce(
    (a, t) => a + t.groups.reduce((b, g) => b + g.cards.reduce((c, k) => c + k.fields.length, 0), 0),
    0,
  );
  console.log(`${tabs.length} tabs carry readouts · ${n} labels\n`);
  for (const t of tabs) {
    console.log(`${t.label}  (${t.component})`);
    for (const g of t.groups) {
      console.log(`   ${g.label}${g.conditional ? '  · conditional' : ''}`);
      for (const k of g.cards) console.log(`      ${(k.title || '—').padEnd(16)}${k.fields.join(', ')}`);
    }
  }
}
