/**
 * The console's navigation, read from the SPA source.
 *
 * WHY THERE IS NO BROWSER CRAWLER HERE.
 *
 * The SDWAN Lite knowledge base drives a headless browser and reads the rendered
 * DOM, because in Vue + Ant Design source a tab and a dropdown filter are both
 * `{ key, label }` — the text does not carry the distinction, and four separate
 * extraction bugs came from pretending it did.
 *
 * This console does not have that problem. `Sidebar.jsx` declares one `NAV`
 * literal in which a section, an item, a disclosure and an external hand-off are
 * each a DIFFERENT shape:
 *
 *   { section: 'Network', items: [...] }   a group
 *   { label: 'Devices', to: '/devices' }   a route in this SPA
 *   { label: 'Firmware', href: '/admin/…' }an intentional hand-off to Django admin
 *   { label: 'Configuration', children: [] }a disclosure, not a link
 *
 * The ambiguity that forced a browser simply is not present, so reading source is
 * both correct AND has no live dependency: no console to run, no credentials, no
 * risk of clicking something destructive on a production system.
 *
 * It stays honest by EVALUATING the literal rather than pattern-matching it — if
 * NAV ever stops being a plain literal, this throws instead of quietly returning
 * a partial menu.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';

export interface NavLeaf {
  label: string;
  to?: string;
  href?: string;
  icon?: string;
  children?: NavLeaf[];
  alsoActive?: string[];
}
export interface NavSection {
  section: string | null;
  icon?: string;
  items: NavLeaf[];
}

/**
 * Slice out `const NAV = [ … ]` by matching brackets, ignoring anything inside a
 * comment or a string. Counting raw brackets would stop early on the first `]`
 * that appears in a comment, of which this file has several.
 */
function sliceLiteral(src: string, decl: string): string {
  const start = src.indexOf(decl);
  if (start < 0) throw new Error(`could not find \`${decl}\` in Sidebar.jsx`);
  const open = src.indexOf('[', start);
  let depth = 0;
  let inLine = false;
  let inBlock = false;
  let quote: string | null = null;

  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    const prev = src[i - 1];

    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && next === '/') { inBlock = false; i++; } continue; }
    if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }

    if (c === '/' && next === '/') { inLine = true; i++; continue; }
    if (c === '/' && next === '*') { inBlock = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }

    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced brackets while reading \`${decl}\``);
}

/** Evaluate the literal. Throws if it is not pure data. */
function evalLiteral<T>(text: string, what: string): T {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`"use strict"; return (${text});`)() as T;
  } catch (e) {
    throw new Error(
      `${what} is no longer a plain literal and cannot be read safely.\n` +
        `  ${(e as Error).message}\n` +
        `  Reading it would risk a partial menu, so this stops instead.`,
    );
  }
}

export async function readNav(): Promise<NavSection[]> {
  const file = path.join(FE, 'components', 'Sidebar.jsx');
  const src = await readFile(file, 'utf8');
  const nav = evalLiteral<NavSection[]>(sliceLiteral(src, 'const NAV'), 'NAV in Sidebar.jsx');

  if (!Array.isArray(nav) || !nav.length) throw new Error('NAV came back empty');
  for (const s of nav) {
    if (!Array.isArray(s.items)) {
      throw new Error(`NAV section ${JSON.stringify(s.section)} has no items[]`);
    }
  }
  return nav;
}


/**
 * Descriptions authored in the NAV array itself.
 *
 * This codebase has no product tour and its page files carry no header comments
 * (0 of 76 checked), so the SDWAN Lite description ladder has nothing to stand
 * on here. What it does have is a NAV array whose entries are commented by the
 * team explaining WHY each one exists and what it covers — real authored prose,
 * attached to the exact entry it describes:
 *
 *   // The hosts BEHIND the routers — a PLC, camera or NVR on a site LAN.
 *   { icon: 'globe', label: 'SD-LAN', to: '/sdlan' },
 *
 * So that is the top of the ladder here. It is authored, attributable and sits
 * beside the thing it describes, which is exactly the property the tour had.
 */
export async function navComments(): Promise<Map<string, string>> {
  const file = path.join(FE, 'components', 'Sidebar.jsx');
  const block = sliceLiteral(await readFile(file, 'utf8'), 'const NAV');
  const out = new Map<string, string>();
  let buf: string[] = [];

  // Short fragments are usually a note to the next maintainer ("third, as on the
  // admin page"), not a description of the feature. Requiring a real sentence
  // keeps navigation trivia out of the docs.
  const attach = (label: string | null) => {
    const text = buf.join(' ').replace(/\s+/g, ' ').trim();
    buf = [];
    if (!label || text.length <= 55) return;
    const prev = out.get(label);
    out.set(label, prev ? `${prev} ${text}` : text);
  };

  let lastLabel: string | null = null;

  for (const line of block.split('\n')) {
    const t = line.trim();
    if (t.startsWith('//')) { buf.push(t.replace(/^\/\/\s?/, '')); continue; }

    const m = /label:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
    if (m) {
      const label = m[1].replace(/\\'/g, "'");
      attach(label);
      lastLabel = label;
      continue;
    }

    // A comment sitting between an entry's own `label:` and its `children:`
    // describes THAT ENTRY, not the first child. Reading it as the child's was
    // wrong on every disclosure in the menu: "Templates and VPN servers are
    // both what gets pushed to a device" was printed on VPN Servers, and
    // "a disclosure, not a link" on HA Devices.
    if (/\bchildren\s*:/.test(line)) {
      attach(lastLabel);
      continue;
    }

    // A closing brace ends the entry a comment could have belonged to. Bare `{`
    // and other property lines do NOT reset, because a multi-line entry puts its
    // comment above the opening brace, not above `label:`.
    if (t.includes('}')) buf = [];
  }
  return out;
}

/** Flatten to the addressable entries: every leaf that is a route or a hand-off. */
export function flatten(nav: NavSection[]): {
  section: string | null;
  parent?: string;
  leaf: NavLeaf;
}[] {
  const out: { section: string | null; parent?: string; leaf: NavLeaf }[] = [];
  for (const s of nav) {
    for (const item of s.items) {
      if (item.children?.length) {
        for (const kid of item.children) out.push({ section: s.section, parent: item.label, leaf: kid });
      } else {
        out.push({ section: s.section, leaf: item });
      }
    }
  }
  return out;
}

// Run directly for a quick look: node --experimental-strip-types scripts/extract-nav.ts
// pathToFileURL, not string concat: this repo's path contains a space, which the
// URL form percent-encodes, so a raw `file://${argv[1]}` comparison never matches.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const nav = await readNav();
  const flat = flatten(nav);
  const notes = await navComments();
  console.log(`${nav.length} sections, ${flat.length} entries, ${notes.size} authored notes\n`);
  if (process.argv[2] === '--notes') {
    for (const [label, text] of notes) console.log(`${label}\n    ${text}\n`);
    process.exit(0);
  }
  for (const s of nav) {
    console.log(`${s.section ?? '(top)'}`);
    for (const i of s.items) {
      const tgt = i.to ? `-> ${i.to}` : i.href ? `=> ${i.href} (admin)` : i.children ? '(disclosure)' : '(?)';
      console.log(`   ${i.label.padEnd(24)} ${tgt}`);
      for (const k of i.children ?? []) {
        console.log(`      - ${k.label.padEnd(21)} ${k.to ? `-> ${k.to}` : `=> ${k.href} (admin)`}`);
      }
    }
  }
}
