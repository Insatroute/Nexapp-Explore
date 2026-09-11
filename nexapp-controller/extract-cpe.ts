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
   * A CPE page is a front end for the router's own RPCD surface, and it names
   * the methods it calls as plain strings — `add-bgp-neighbor`, `enable-rule`.
   * That is the same kind of ground truth the console pages' API imports give,
   * so it is read rather than described.
   *
   * Empty is a real answer, not a failure: seven pages call the router some
   * other way, and CpeSlaSettingsPage says so itself — "This page is NOT a
   * straight RPCD proxy".
   */
  calls: string[];
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

/** Only a leading verb makes a kebab string an RPCD method rather than a CSS class. */
const RPCD_VERB =
  /^(add|edit|delete|remove|create|get|set|list|enable|disable|start|stop|restart|reload|apply|clear|flush|import|export|upload|download|test|run|scan|update|reset|renew|revoke|generate|check|save)-/;

async function callsIn(dir: string, componentFile: string): Promise<string[]> {
  try {
    const src = await readFile(path.join(dir, componentFile), 'utf8');
    return [
      ...new Set([...src.matchAll(/'([a-z][a-z0-9]*(?:-[a-z0-9]+)+)'/g)].map((m) => m[1])),
    ]
      .filter((c) => RPCD_VERB.test(c))
      .sort();
  } catch {
    return [];
  }
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
      const make = async (e: any, group?: string): Promise<CpePage> => ({
        key: e.key,
        label: e.label,
        admin: e.admin,
        built: !!e.built,
        calls: e.componentName ? await callsIn(dir, byComponent.get(e.componentName) ?? '') : [],
        ...(group ? { group } : {}),
      });
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
  console.log(
    `${menu.length} sections · ${all.length} pages · ` +
      `${withCalls.length} expose RPCD calls (${withCalls.reduce((n, p) => n + p.calls.length, 0)} methods)\n`,
  );
  for (const s of menu) {
    console.log(`${s.label} (${s.pages.length})`);
    for (const p of s.pages) {
      console.log(
        `   ${(p.group ? p.group + ' › ' : '') + p.label}`.padEnd(34) +
          (p.calls.length ? `${p.calls.length} calls` : '—'),
      );
    }
  }
}
