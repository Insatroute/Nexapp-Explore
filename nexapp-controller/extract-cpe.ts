/**
 * The CPE tab's own navigation, read from `components/cpe/cpeMenu.js`.
 *
 * The CPE tab is the router's own web UI rebuilt inside the controller, and it
 * carries a menu of its own — seven sections and forty-five pages, which is the
 * largest single surface in the console and the only one the sidebar never
 * shows. Nothing else in this generator reaches it, because it is nested two
 * levels below a menu entry: Devices → a device → the CPE tab.
 *
 * `CPE_MENU` is a literal like `NAV`, with one wrinkle: its entries hold
 * `component:` references to lazily-imported React components, which are not
 * data and cannot be evaluated here. They are rewritten to a boolean before the
 * literal is read, because the only thing this needs from them is WHETHER a page
 * has been rebuilt — the file's own note says an entry with no component is a
 * hand-off to the router's classic page rather than a dead row.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';

export interface CpePage {
  key: string;
  label: string;
  /**
   * The RPCD methods this page calls on the router, verbatim.
   *
   * Read from the positions a method actually occupies: the third argument of
   * `nsbondProxy`/`useProxy`, a `method=` prop handed to a child component, and
   * the first argument of a local helper that forwards to the proxy. A name
   * standing in for a method is followed to its definition, so a lookup table
   * like `DELETE_METHOD` yields the methods it holds.
   *
   * The string match this replaced required a leading verb (`add-`, `get-`), so
   * it silently dropped every method named after a noun (`dns-list-settings`,
   * `dos-stats`, `bayes-train`) and every snake_case one (`create_zone`,
   * `drop_all`, `list`). That was 46 of 263 distinct methods — pages reported
   * fewer calls than they make, and five reported none at all.
   *
   * Empty is still a real answer: a page can reach the router another way, and
   * CpeSlaSettingsPage says so itself — "This page is NOT a straight RPCD proxy".
   */
  calls: string[];
  /**
   * Call sites whose method is computed rather than literal — `nsbondProxy(id,
   * 'ns.redirects', method, payload)`. The page makes these calls; which method
   * is decided at runtime, so it cannot be named here. Counted rather than
   * guessed, so a page that has them does not read as fully documented.
   */
  dynamicCalls: number;
  /** The (tab, subtab) pair of the classic admin page this mirrors. */
  admin?: { tab: string; subtab?: string };
  /** False when the page is still a hand-off to the router's classic UI. */
  built: boolean;
  /** Set when the page sits in a sub-group inside its section. */
  group?: string;
}
export interface CpeSection {
  key: string;
  label: string;
  pages: CpePage[];
}

/** Bracket-match the literal, ignoring brackets inside comments and strings. */
function sliceLiteral(src: string, decl: string): string {
  const start = src.indexOf(decl);
  if (start < 0) throw new Error(`could not find \`${decl}\` in cpeMenu.js`);
  const open = src.indexOf('[', start);
  let depth = 0, inLine = false, inBlock = false, quote: string | null = null;

  for (let i = open; i < src.length; i++) {
    const c = src[i], next = src[i + 1], prev = src[i - 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
    if (c === '/' && next === '/') { inLine = true; i++; continue; }
    if (c === '/' && next === '*') { inBlock = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error(`unbalanced brackets while reading \`${decl}\``);
}

/** The two ways a CPE page reaches the router's RPCD bridge. */
const PROXY_CALL = /\b(?:api\.)?(?:nsbondProxy|useProxy)\s*\(/g;

/** Text between `(` at `open` and its match, brackets in strings ignored. */
function sliceArgs(src: string, open: number): string {
  let depth = 0, inLine = false, inBlock = false, quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i], next = src[i + 1], prev = src[i - 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
    if (c === '/' && next === '/') { inLine = true; i++; continue; }
    if (c === '/' && next === '*') { inBlock = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return '';
}

/** Split an argument list on its top-level commas. */
function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0, quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], prev = s[i - 1];
    if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out.map((x) => x.trim());
}

/**
 * The initializer of `const NAME = …` in this file, or '' if there is none.
 *
 * A method argument is often not a literal but a name: `DELETE_METHOD[kind]`,
 * where the file holds `const DELETE_METHOD = { neighbor: 'delete-bgp-neighbor',
 * … }`. The methods are literal, one hop away — so the hop is followed rather
 * than the call written off as unresolvable.
 */
function initializerOf(src: string, id: string): string {
  const m = new RegExp(`\\b(?:const|let|var)\\s+${id}\\s*=\\s*`).exec(src);
  if (!m) return '';
  const at = m.index + m[0].length;
  const c = src[at];
  if (c === '{' || c === '[' || c === '(') return sliceArgs(src, at);

  // A plain expression. This codebase omits semicolons, so the end is a newline
  // the next line does not continue — a line opening with `?`, `:`, `&&` and the
  // like is still the same expression. Looking for `;` or a leading keyword
  // instead ran `const method = isNew ? … : …` on into the next statement and
  // collected the toast copy beside it as if it were a method name.
  let depth = 0;
  let quote: string | null = null;
  for (let i = at; i < src.length; i++) {
    const ch = src[i], prev = src[i - 1];
    if (quote) { if (ch === quote && prev !== '\\') quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) return src.slice(at, i);
      depth--;
    } else if (ch === ';' && depth === 0) return src.slice(at, i);
    else if (ch === '\n' && depth === 0) {
      const next = /^\s*(\?\.|\?|:|&&|\|\||\.|\+|-|\*|\/|,)/.exec(src.slice(i + 1));
      if (!next) return src.slice(at, i);
    }
  }
  return src.slice(at);
}

/**
 * A plausible RPCD method name: lowercase words joined by `-` or `_`.
 *
 * Applied only to literals reached THROUGH a method argument, so it is a shape
 * check rather than the guess the old extractor made across a whole file. A bare
 * word passes, because `list`, `scan` and `drop` are all real methods.
 */
const METHOD_SHAPE = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;

/**
 * Strip the operands of equality tests.
 *
 * `drawer.kind === 'allowed' ? 'edit-allowed' : 'edit-blocked'` names the method
 * in its branches; `'allowed'` is what decides between them. Reading it as a
 * method invented `allowed`, `input` and `output` as RPCD calls.
 */
const withoutComparisons = (s: string) =>
  s
    .replace(/(?:===|!==|==|!=)\s*(['"])[^'"\\]*\1/g, ' ')
    .replace(/(['"])[^'"\\]*\1\s*(?:===|!==|==|!=)/g, ' ');

/** Every single- or double-quoted literal in an expression. */
const literalsIn = (s: string): string[] =>
  [...s.matchAll(/'([^'\\]*)'|"([^"\\]*)"/g)].map((m) => m[1] ?? m[2]).filter(Boolean);

/**
 * Methods the old extractor could find: a kebab name led by a known verb.
 *
 * Kept as a FLOOR, not as the method. Everything it matches is real — the verb
 * list is why it had no false positives — so keeping it guarantees this cannot
 * report less than it used to, while the passes above add the names it could
 * never see.
 */
const VERB_LED =
  /'((?:add|edit|delete|remove|create|get|set|list|enable|disable|start|stop|restart|reload|apply|clear|flush|import|export|upload|download|test|run|scan|update|reset|renew|revoke|generate|check|save)-[a-z0-9-]+)'/g;

async function callsIn(
  dir: string,
  componentFile: string,
): Promise<{ calls: string[]; dynamicCalls: number }> {
  let src: string;
  try {
    src = await readFile(path.join(dir, componentFile), 'utf8');
  } catch {
    return { calls: [], dynamicCalls: 0 };
  }

  const found = new Set<string>();
  const add = (lit: string) => {
    if (METHOD_SHAPE.test(lit)) found.add(lit);
  };
  let dynamic = 0;

  // 1. the call sites themselves: nsbondProxy(id, service, method, …)
  //    A method can be a literal, a ternary naming both branches, or a name
  //    that resolves to a table of literals one hop away.
  const wrappers = new Set<string>();
  for (const m of src.matchAll(PROXY_CALL)) {
    const open = m.index + m[0].length - 1;
    const args = splitArgs(sliceArgs(src, open));
    const slot = args[2] ?? '';
    const direct = literalsIn(withoutComparisons(slot));
    if (direct.length) {
      for (const lit of direct) add(lit);
      continue;
    }
    let resolved = 0;
    for (const id of slot.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []) {
      for (const lit of literalsIn(withoutComparisons(initializerOf(src, id)))) {
        if (METHOD_SHAPE.test(lit)) {
          found.add(lit);
          resolved++;
        }
      }
      // A bare name that resolves to nothing is a parameter: this call sits
      // inside a local helper, and the methods are at ITS call sites.
      if (!resolved && /^[a-z][\w$]*$/.test(id)) wrappers.add(id);
    }
    if (!resolved) dynamic++;
  }

  // 2. a child component is handed the call to make: method={…} or method: …
  for (const m of src.matchAll(/\bmethod\s*[=:]\s*(?:(\{)|(['"])([^'"\\]*)\2)/g)) {
    if (m[1]) {
      // method={ … } — a whole expression, possibly a nested ternary.
      for (const lit of literalsIn(withoutComparisons(sliceArgs(src, m.index + m[0].length - 1)))) {
        add(lit);
      }
    } else {
      // method="x" or method: 'x' — exactly this literal. Reading a fixed window
      // instead walked into the next property and collected its values too.
      add(m[3]);
    }
  }

  // 3. local helpers — `write('delete-user', payload, 'Access removed')`.
  //    Only the first argument is read: the method is conventionally first, and
  //    the rest are payloads and toast copy that must not be mistaken for one.
  for (const name of wrappers) {
    for (const m of src.matchAll(new RegExp(`\\b${name}\\s*\\(`, 'g'))) {
      const args = splitArgs(sliceArgs(src, m.index + m[0].length - 1));
      for (const lit of literalsIn(withoutComparisons(args[0] ?? ''))) add(lit);
    }
  }

  // 4. the floor
  for (const m of src.matchAll(VERB_LED)) found.add(m[1]);

  return { calls: [...found].sort(), dynamicCalls: dynamic };
}

export async function readCpeMenu(): Promise<CpeSection[]> {
  const dir = path.join(FE, 'components', 'cpe');
  const file = path.join(dir, 'cpeMenu.js');
  const src = await readFile(file, 'utf8');

  // component identifier -> the file it is lazily imported from
  const byComponent = new Map<string, string>();
  for (const m of src.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*'\.\/([^']+)'/g)) {
    byComponent.set(m[1], m[2]);
  }

  // `component: CpeBgpPage` is a React component, not data. Only its PRESENCE
  // matters here, so it becomes a boolean the literal can carry.
  // Keep the component's NAME as data so its file — and so its RPCD calls —
  // can be resolved after the literal is read.
  const text = sliceLiteral(src, 'export const CPE_MENU').replace(
    /\bcomponent:\s*([A-Za-z0-9_]+)/g,
    (_m, name) => `built: true, componentName: ${JSON.stringify(name)}`,
  );

  let raw: any[];
  try {
    raw = new Function(`"use strict"; return (${text});`)();
  } catch (e) {
    throw new Error(
      `CPE_MENU is no longer a literal this can read safely.\n  ${(e as Error).message}\n` +
        `  Reading it would risk a partial menu, so this stops instead.`,
    );
  }

  const out: CpeSection[] = [];
  for (const sec of raw) {
    const pages: CpePage[] = [];
    for (const item of sec.items ?? []) {
      // Two shapes, per the file's own note: a page, or a sub-group of pages.
      const make = async (e: any, group?: string): Promise<CpePage> => {
        const found = e.componentName
          ? await callsIn(dir, byComponent.get(e.componentName) ?? '')
          : { calls: [], dynamicCalls: 0 };
        return {
          key: e.key,
          label: e.label,
          admin: e.admin,
          built: !!e.built,
          calls: found.calls,
          dynamicCalls: found.dynamicCalls,
          ...(group ? { group } : {}),
        };
      };
      if (Array.isArray(item.items)) {
        for (const kid of item.items) pages.push(await make(kid, item.label));
      } else {
        pages.push(await make(item));
      }
    }
    if (pages.length) out.push({ key: sec.key, label: sec.label, pages });
  }
  if (!out.length) throw new Error('CPE_MENU came back empty');
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const menu = await readCpeMenu();
  const all = menu.flatMap((s) => s.pages);
  const withCalls = all.filter((p) => p.calls.length);
  const dyn = all.reduce((n, p) => n + p.dynamicCalls, 0);
  console.log(
    `${menu.length} sections · ${all.length} pages · ` +
      `${withCalls.length} expose RPCD calls ` +
      `(${withCalls.reduce((n, p) => n + p.calls.length, 0)} distinct service/method pairs` +
      `${dyn ? `, ${dyn} call sites computed at runtime` : ''})\n`,
  );
  for (const s of menu) {
    console.log(`${s.label} (${s.pages.length})`);
    for (const p of s.pages) {
      console.log(
        `   ${(p.group ? p.group + ' › ' : '') + p.label}`.padEnd(34) +
          (p.calls.length ? `${p.calls.length} calls` : '—') +
          (p.dynamicCalls ? ` (+${p.dynamicCalls} dynamic)` : ''),
      );
    }
  }
}
