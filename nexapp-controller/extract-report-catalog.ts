/**
 * How the report catalogue is assembled, read from `controller_reports/catalog.py`.
 *
 * The reports THEMSELVES are not read, and deliberately. `ReportTemplate` is a
 * database model: migrations seed rows, and an operator can add, rename or
 * delete them afterwards. A list of titles written here would describe one
 * installation on one day — the snapshot this generator exists to avoid. Four
 * attempts at reconstructing that list from the migrations produced three
 * different answers, none of them matching a live console, which is the
 * argument made concrete.
 *
 * What does not vary is the RULES: how a category is decided, which reports no
 * listing shows, which are withheld from the Customize wizard, and who may see
 * one. They live in one module — the file's own docstring records that they used
 * to live in three and had already drifted — so they are read from it.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTROLLER } from './config.ts';

export interface ReportCategory {
  key: string;
  /** How the UI writes it. */
  label: string;
  /** Slug keywords that select this category, in match order. */
  keywords: string[];
}
export interface ReportCatalog {
  categories: ReportCategory[];
  /** Categories the UI offers that no keyword can select. */
  unreachable: string[];
  hideSlugs: string[];
  hideTitles: string[];
  hideNote: string;
  noCustomize: string[];
  noCustomizeNote: string;
  accessNote: string;
}

const FILE = path.join(CONTROLLER, 'controller_reports', 'catalog.py');

/** The `# …` block immediately above a top-level name, as prose. */
function noteAbove(src: string, name: string): string {
  const at = src.search(new RegExp(`^${name}\\s*=`, 'm'));
  if (at < 0) return '';
  const before = src.slice(0, at).split('\n');
  const lines: string[] = [];
  for (let i = before.length - 2; i >= 0; i--) {
    const l = before[i].trim();
    if (!l.startsWith('#')) break;
    lines.unshift(l.replace(/^#\s?/, ''));
  }
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

/** The quoted strings inside `NAME = (...)` or `NAME = frozenset({...})`. */
function stringsIn(src: string, name: string): string[] {
  const m = new RegExp(`^${name}\\s*=\\s*([\\s\\S]*?)\\n(?=[A-Za-z_#]|$)`, 'm').exec(src);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((x) => x[1] ?? x[2]);
}

/**
 * A function's docstring, as markdown.
 *
 * The whole thing, not the summary line: for `visible_templates` the summary is
 * "ReportTemplates `user` may see" and the two rules that actually answer the
 * question sit in the paragraph beneath it. Sphinx's double backticks become
 * single ones, and its `*` bullets become `-`.
 */
function docstringOf(src: string, fn: string): string {
  const m = new RegExp(`def ${fn}\\([\\s\\S]*?"""([\\s\\S]*?)"""`).exec(src);
  if (!m) return '';
  const out: string[] = [];
  for (const raw of m[1].split('\n')) {
    const l = raw.trim().replace(/^\*\s+/, '- ').replace(/``([^`]+)``/g, '`$1`');
    const prev = out[out.length - 1];
    // A docstring is wrapped for the source file, not for here. A line that
    // continues the one above it is joined back on, or a bullet arrives split
    // across two list items.
    if (l && prev && !l.startsWith('- ') && !prev.endsWith(':')) out[out.length - 1] = `${prev} ${l}`;
    else out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function readReportCatalog(): Promise<ReportCatalog | undefined> {
  let src: string;
  try {
    src = await readFile(FILE, 'utf8');
  } catch {
    return undefined;
  }

  // SLUG_CATEGORY_MAP — insertion order IS the match order, so the pairs are
  // kept in the order the file writes them rather than sorted.
  const mapBlock = /SLUG_CATEGORY_MAP\s*=\s*\{([\s\S]*?)\n\}/.exec(src);
  const pairs = mapBlock
    ? [...mapBlock[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)].map((m) => ({ kw: m[1], cat: m[2] }))
    : [];

  const labelBlock = /CATEGORY_LABELS\s*=\s*\{([\s\S]*?)\n\}/.exec(src);
  const labels = new Map(
    labelBlock ? [...labelBlock[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]) : [],
  );
  const order = stringsIn(src, 'CATEGORY_ORDER');

  const byCat = new Map<string, string[]>();
  for (const p of pairs) (byCat.get(p.cat) ?? byCat.set(p.cat, []).get(p.cat)!).push(p.kw);

  const categories: ReportCategory[] = [];
  for (const key of order.length ? order : [...byCat.keys()]) {
    const keywords = byCat.get(key) ?? [];
    if (keywords.length) categories.push({ key, label: labels.get(key) ?? key, keywords });
  }
  // A category the chips offer that no keyword selects. The file says the order
  // is "derived from the map so adding a keyword above cannot leave a category
  // unfilterable" — this is the other direction, and worth stating rather than
  // quietly dropping.
  const unreachable = order.filter((k) => !(byCat.get(k) ?? []).length);

  return {
    categories,
    unreachable,
    hideSlugs: stringsIn(src, 'HIDE_SLUGS'),
    hideTitles: stringsIn(src, 'HIDE_TITLES'),
    hideNote: noteAbove(src, 'HIDE_SLUGS'),
    noCustomize: stringsIn(src, 'HIDDEN_FROM_CUSTOMIZE'),
    noCustomizeNote: noteAbove(src, 'HIDDEN_FROM_CUSTOMIZE'),
    accessNote: docstringOf(src, 'visible_templates'),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const c = await readReportCatalog();
  if (!c) {
    console.log('no controller_reports/catalog.py — nothing to read');
  } else {
    console.log(`categories (${c.categories.length}):`);
    for (const k of c.categories) console.log(`   ${k.key.padEnd(9)}${k.label.padEnd(26)}${k.keywords.join(', ')}`);
    if (c.unreachable.length) console.log(`   offered but unreachable: ${c.unreachable.join(', ')}`);
    console.log(`\nhidden from every listing (${c.hideSlugs.length}): ${c.hideSlugs.join(', ')}`);
    console.log(`  titles: ${c.hideTitles.join(', ')}`);
    console.log(`  why: ${c.hideNote}`);
    console.log(`\nnot offered in Customize (${c.noCustomize.length}): ${c.noCustomize.join(', ')}`);
    console.log(`  why: ${c.noCustomizeNote}`);
    console.log(`\naccess: ${c.accessNote}`);
  }
}
