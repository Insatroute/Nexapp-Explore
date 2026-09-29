/**
 * Every field on a Policy Engine form, read from the table the form is built from.
 *
 * `pages/policy/tabs.js` describes each protocol as data — label, type, help,
 * placeholder, choices, which fields are required and which only appear when
 * another is on — and the file's own note records that the names "were read
 * from each endpoint's OPTIONS response, not guessed". That is the field
 * reference the knowledge base needs, already written down and already true.
 *
 * Child collections (a BGP config's neighbours, networks, prefix lists, route
 * maps) live beside it in `<proto>Children.js` in the same shape.
 *
 * Generated rather than transcribed: a field added to the console appears here
 * on the next build, and one removed disappears. A hand-written field table
 * would be wrong the first time someone edits the form.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';

export interface PolicyField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  help?: string;
  placeholder?: string;
  choices?: { value: string; label: string }[];
  /** Only shown while this other field is on. */
  showIf?: string;
}
export interface PolicySection {
  title: string;
  fields: PolicyField[];
}
export interface PolicyChild {
  key: string;
  label: string;
  resource: string;
  blurb?: string;
  empty?: string;
  /** What the console warns will happen if the row is deleted. */
  consequence?: string;
  sections: PolicySection[];
}
export interface PolicyTab {
  key: string;
  label: string;
  resource: string;
  blurb?: string;
  sections: PolicySection[];
  children: PolicyChild[];
}

const DIR = path.join(FE, 'pages', 'policy');

/** Slice a balanced `[` … `]` or `{` … `}` starting at or after `from`. */
function slice(src: string, from: number, open: '[' | '{' = '['): string {
  const close = open === '[' ? ']' : '}';
  const start = src.indexOf(open, from);
  if (start < 0) return '';
  let depth = 0, line = false, block = false, quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i], n = src[i + 1], p = src[i - 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
    if (quote) { if (c === quote && p !== '\\') quote = null; continue; }
    if (c === '/' && n === '/') { line = true; i++; continue; }
    if (c === '/' && n === '*') { block = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return '';
}

const str = (row: string, key: string): string | undefined =>
  new RegExp(`\\b${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(row)?.[1]?.replace(/\\'/g, '’');
const bool = (row: string, key: string): boolean =>
  new RegExp(`\\b${key}:\\s*true\\b`).test(row);

/** Split a `fields: [...]` body into its top-level `{ … }` entries. */
function entries(body: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < body.length) {
    const at = body.indexOf('{', i);
    if (at < 0) break;
    const e = slice(body, at, '{');
    if (!e) break;
    out.push(e);
    i = at + e.length;
  }
  return out;
}

/**
 * Turn a field list into sections.
 *
 * A `{ section: 'BGP timers' }` entry is a heading, not a field — the form
 * renders it as one, and the fields after it belong under it. Fields before any
 * heading go in an untitled leading section.
 */
function sectionsOf(body: string, shared: Record<string, string>): PolicySection[] {
  // `...SCOPE_FIELDS` and a bare `ENABLED` are references to shared definitions.
  const expanded = body
    .replace(/\.\.\.([A-Z_]+),?/g, (_m, name) => shared[name] ?? '')
    .replace(/^\s*([A-Z][A-Z_]*),\s*$/gm, (_m, name) => shared[name] ?? '');

  const out: PolicySection[] = [{ title: '', fields: [] }];
  for (const e of entries(expanded)) {
    const section = str(e, 'section');
    if (section) { out.push({ title: section, fields: [] }); continue; }
    const name = str(e, 'name');
    const label = str(e, 'label');
    if (!name || !label) continue;

    const choicesBlock = /choices:\s*\[/.test(e) ? slice(e, e.indexOf('choices:')) : '';
    const choices = choicesBlock
      ? [...choicesBlock.matchAll(/\{\s*value:\s*'([^']*)'\s*,\s*label:\s*'([^']*)'/g)]
          .map((m) => ({ value: m[1], label: m[2] }))
      : undefined;

    out[out.length - 1].fields.push({
      name,
      label,
      type: str(e, 'type') ?? 'text',
      required: bool(e, 'required'),
      help: str(e, 'help'),
      placeholder: str(e, 'placeholder'),
      showIf: str(e, 'showIf'),
      ...(choices?.length ? { choices } : {}),
    });
  }
  return out.filter((s) => s.fields.length);
}

/** `const NAME = { … }` / `= [ … ]`, as the raw text of its body. */
function sharedConsts(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/const ([A-Z][A-Z_]*)\s*=\s*([[{])/g)) {
    const body = slice(src, m.index + m[0].length - 1, m[2] as '[' | '{');
    // An array's brackets are dropped so it splices in; an object keeps its own.
    out[m[1]] = m[2] === '[' ? body.slice(1, -1) : body;
  }
  return out;
}

export async function readPolicyTab(key: string): Promise<PolicyTab | undefined> {
  let tabs: string;
  try {
    tabs = await readFile(path.join(DIR, 'tabs.js'), 'utf8');
  } catch {
    return undefined;
  }

  const at = tabs.indexOf(`key: '${key}'`);
  if (at < 0) return undefined;
  const shared = sharedConsts(tabs);

  // The tab object runs from the `{` before its key to the matching `}`.
  const openAt = tabs.lastIndexOf('{', at);
  const tab = slice(tabs, openAt, '{');
  const fieldsAt = tab.indexOf('fields:');
  const sections = fieldsAt < 0 ? [] : sectionsOf(slice(tab, fieldsAt), shared);

  const children: PolicyChild[] = [];
  const childRef = /children:\s*([A-Z][A-Z_]*)/.exec(tab)?.[1];
  if (childRef) {
    const file = `${key}Children.js`;
    const src = await readFile(path.join(DIR, file), 'utf8').catch(() => '');
    if (src) {
      const listAt = src.indexOf(`export const ${childRef}`);
      const list = listAt < 0 ? '' : slice(src, listAt);
      const childShared = sharedConsts(src);
      for (const c of entries(list.slice(1, -1))) {
        const ckey = str(c, 'key');
        const clabel = str(c, 'label');
        if (!ckey || !clabel) continue;
        const cf = c.indexOf('fields:');
        children.push({
          key: ckey,
          label: clabel,
          resource: str(c, 'resource') ?? '',
          blurb: str(c, 'blurb'),
          empty: str(c, 'empty'),
          consequence: str(c, 'consequence'),
          sections: cf < 0 ? [] : sectionsOf(slice(c, cf), childShared),
        });
      }
    }
  }

  return {
    key,
    label: str(tab, 'label') ?? key,
    resource: str(tab, 'resource') ?? '',
    blurb: str(tab, 'blurb'),
    sections,
    children,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t = await readPolicyTab(process.argv[2] ?? 'bgp');
  if (!t) console.log('not found');
  else {
    console.log(`${t.label} — ${t.resource}\n${t.blurb ?? ''}\n`);
    for (const s of t.sections) {
      console.log(`  [${s.title || '(top)'}]`);
      for (const f of s.fields) {
        console.log(
          `     ${f.label.padEnd(30)}${f.type.padEnd(8)}${f.required ? 'req ' : '    '}` +
            `${f.showIf ? `if:${f.showIf} ` : ''}${f.choices ? `(${f.choices.length} choices) ` : ''}${f.help ?? ''}`,
        );
      }
    }
    for (const c of t.children) {
      const n = c.sections.reduce((a, s) => a + s.fields.length, 0);
      console.log(`\n  child: ${c.label} (${c.resource}) — ${n} fields`);
    }
  }
}
