/**
 * Task guides for the Administration pages: Users, Organizations, Allowed
 * Serial Numbers, Permission Groups, Device Groups, Hierarchy and License.
 *
 * The same split as the CPE handbook. The FIELDS — label, required flag, help
 * text, placeholder, the error a field shows — are read from the form's JSX on
 * every build, so a field added or renamed in the console appears here without
 * anyone touching this file. What source cannot say — a good example value,
 * which rule the server adds on top, the order to do things in — comes from
 * `admin-notes.ts`, pinned to the files it was written against so a change to
 * them is flagged by `npm run check:descriptions`.
 *
 * Two kinds of form markup exist on these pages:
 *   - `<label className="lab">` rows (UserForm, OrgForm, GroupForm), read by
 *     the shared `readFormFields`;
 *   - `<Field label=…>` / `<Toggle label=…>` components (the drawers), read by
 *     `componentFields` below.
 * A note naming a field the source does not have is reported at build time and
 * left out, so the page never documents a control that is not on screen.
 */
import { readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { readFormFields, quotedStrings, clean } from './read-form-fields.ts';
import { ADMIN_NOTES, type AdminForm, type AdminNotes, type AdminShot } from './admin-notes.ts';
import { OVERLAY_NOTES } from './overlay-notes.ts';
import { INTEL_NOTES } from './intel-notes.ts';
import { ACCESS_NOTES } from './access-notes.ts';
import { NETWORK_NOTES } from './network-notes.ts';
import { HA_NOTES } from './ha-notes.ts';
import { FABRIC_NOTES, DASHBOARD_NOTES, RECOVER_NOTES } from './fabric-notes.ts';
import { REPORTS_NOTES } from './reports-notes.ts';

/**
 * Every notes file this renderer serves, with the image root its shots live
 * under (`public/img/<root>/…`). The root is also the prefix the lock pins an
 * entry under (`<root>:<route>`), so check-descriptions reads this same list.
 */
export const GUIDE_REGISTRY: { root: string; notes: Record<string, AdminNotes> }[] = [
  { root: 'admin', notes: ADMIN_NOTES },
  { root: 'overlay', notes: OVERLAY_NOTES },
  { root: 'overlay', notes: FABRIC_NOTES },
  { root: 'intel', notes: INTEL_NOTES },
  { root: 'intel', notes: RECOVER_NOTES },
  { root: 'access', notes: ACCESS_NOTES },
  { root: 'network', notes: NETWORK_NOTES },
  { root: 'network', notes: HA_NOTES },
  { root: 'dashboard', notes: DASHBOARD_NOTES },
  { root: 'reports', notes: REPORTS_NOTES },
];
import { APP_ROOT, FE } from './config.ts';
import { cell, code } from './mdx.ts';

/** One row of a form, whichever markup it came from. */
interface Row {
  label: string;
  required: 'yes' | 'sometimes' | 'no';
  hints: string[];
  placeholder?: string;
  /** Messages the control itself shows when it is wrong. */
  errors: string[];
  /** Checkboxes sharing this row, each with its own caption. */
  checks: { label: string; hint?: string }[];
  /** A data-defined field's own default and choices. */
  starts?: string;
  choices?: string[];
}

// ---------------------------------------------------------------- JSX reading

/** Index just past the `>` that closes the tag opening at `at`, braces and strings respected. */
function tagEnd(src: string, at: number): number {
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i + 1;
  }
  return src.length;
}

/** The value of `name=` inside a tag: the literal, or the `{ … }` expression with its braces. */
function prop(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\s${name}=`).exec(tag);
  if (!m) return undefined;
  let i = m.index + m[0].length;
  const c = tag[i];
  if (c === '"' || c === "'") return tag.slice(i + 1, tag.indexOf(c, i + 1));
  if (c !== '{') return undefined;
  const start = i;
  for (let depth = 0; i < tag.length; i++) {
    const ch = tag[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      for (i++; i < tag.length && tag[i] !== ch; i++) if (tag[i] === '\\') i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return tag.slice(start, i + 1);
  }
  return undefined;
}

/** Sentences a prop can show: a literal as is, an expression's quoted alternatives. */
function sentences(v: string | undefined): string[] {
  if (v === undefined) return [];
  if (!v.startsWith('{')) return [clean(v)].filter(Boolean);
  // `'a' + 'b'` concatenations are one sentence, not two.
  const joined = v.replace(/['"]\s*\+\s*['"]/g, '');
  return quotedStrings(joined).map(clean).filter((t) => /^[A-Z]/.test(t) && /\s/.test(t));
}

/** `<Field label=…>` and `<Toggle label=…>` components, in source order. */
function componentFields(src: string): Row[] {
  const out: Row[] = [];
  for (const m of src.matchAll(/<(Field|Toggle)\b/g)) {
    const at = m.index!;
    const end = tagEnd(src, at);
    const tag = src.slice(at, end);
    const label = prop(tag, 'label');
    if (!label || label.startsWith('{')) continue;
    const kind = m[1];
    let body = '';
    if (kind === 'Field' && !tag.endsWith('/>')) {
      const close = src.indexOf('</Field>', end);
      body = close > 0 ? src.slice(end, close) : '';
    }
    const ph = /placeholder="([^"]*)"/.exec(body)?.[1];
    out.push({
      label,
      required: /\srequired\b(?!=)/.test(tag) ? 'yes' : 'no',
      hints: [...sentences(prop(tag, 'hint')), ...sentences(prop(tag, 'info'))],
      placeholder: ph,
      errors: sentences(prop(tag, 'error')),
      checks: [],
    });
  }
  return out;
}

/** The balanced `{…}` / `[…]` literal starting at `at`, strings and comments respected. */
function literalAt(src: string, at: number): string {
  const open = src[at];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return src.slice(at, i + 1);
  }
  return src.slice(at);
}

/** Top-level items of an array literal: `{…}`, `IDENT` or `...IDENT`. */
function arrayItems(arr: string): string[] {
  const out: string[] = [];
  let i = 1;
  while (i < arr.length - 1) {
    while (i < arr.length - 1 && /[\s,]/.test(arr[i])) i++;
    if (arr[i] === '/' && arr[i + 1] === '/') { i = arr.indexOf('\n', i); if (i < 0) break; continue; }
    if (arr[i] === '/' && arr[i + 1] === '*') { i = arr.indexOf('*/', i) + 2; continue; }
    if (i >= arr.length - 1) break;
    if (arr[i] === '{' || arr[i] === '[') { const lit = literalAt(arr, i); out.push(lit); i += lit.length; continue; }
    const m = /^(\.\.\.)?\s*([A-Za-z_$][\w$]*)/.exec(arr.slice(i));
    if (!m) break;
    out.push(m[0].replace(/\s+/g, ''));
    i += m[0].length;
  }
  return out;
}

/**
 * Fields declared as data — the `fields: [ … ]` array a `ResourceTable` page
 * hands the shared form. Entries may be inline objects, named constants
 * (`NAME_FIELD`) or spreads (`...SCOPE_FIELDS`, `...KEY`), resolved in the
 * file itself or in the files it imports them from. `model` picks one entry
 * in a file that declares several — by its `key:` or its exported name.
 */
async function modelFields(src: string, file: string, model?: string): Promise<Row[]> {
  // Where named constants can come from: this file, then its local imports.
  const sources = [src];
  for (const m of src.matchAll(/import\s*\{[^}]*\}\s*from\s*'(\.[^']+)'/g)) {
    const t = await readFile(path.join(path.dirname(file), m[1]), 'utf8').catch(() => '');
    if (t) sources.push(t);
  }
  const resolve = (name: string): string | undefined => {
    for (const t of sources) {
      const d = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*`).exec(t);
      if (d) return literalAt(t, d.index + d[0].length);
    }
    return undefined;
  };

  let from = 0;
  if (model) {
    const byKey = new RegExp(`\\bkey:\\s*'${model}'`).exec(src);
    const byName = new RegExp(`export\\s+const\\s+${model}\\b`).exec(src);
    const hit = byKey ?? byName;
    if (!hit) return [];
    from = hit.index;
  }
  const at = /\bfields:\s*\[/.exec(src.slice(from));
  if (!at) return [];
  const arr = literalAt(src, from + at.index + at[0].length - 1);

  const objects: string[] = [];
  const expand = (items: string[], depth = 0) => {
    for (const it of items) {
      if (it.startsWith('{')) objects.push(it);
      else if (it.startsWith('...')) {
        const lit = resolve(it.slice(3));
        if (lit?.startsWith('[') && depth < 4) expand(arrayItems(lit), depth + 1);
      } else {
        const lit = resolve(it);
        if (lit?.startsWith('{')) objects.push(lit);
        else if (lit?.startsWith('[') && depth < 4) expand(arrayItems(lit), depth + 1);
      }
    }
  };
  expand(arrayItems(arr));

  const out: Row[] = [];
  for (const obj of objects) {
    // Only this object's own keys: nested `choices` labels must not be read as its label.
    const own = obj.replace(/\bchoices:\s*\[[\s\S]*?\]/, '');
    const str = (k: string) => new RegExp(`\\b${k}:\\s*(['"])(.*?)\\1`).exec(own)?.[2];
    const label = str('label');
    if (!label) continue;
    const choiceBlock = /\bchoices:\s*\[([\s\S]*?)\]/.exec(obj)?.[1] ?? '';
    const choices = [...choiceBlock.matchAll(/label:\s*(['"])(.*?)\1/g)].map((m) => m[2]);
    const valueOf = new Map([...choiceBlock.matchAll(/value:\s*(['"])(.*?)\1\s*,\s*label:\s*(['"])(.*?)\3/g)].map((m) => [m[2], m[4]]));
    const def = str('default');
    out.push({
      label,
      required: /\brequired:\s*true/.test(own) ? 'yes' : 'no',
      hints: [str('help')].filter((x): x is string => Boolean(x)),
      placeholder: str('placeholder'),
      errors: [],
      checks: [],
      starts: def === undefined ? undefined : valueOf.get(def) ?? def,
      choices: choices.length ? choices : undefined,
    });
  }
  return out;
}

async function rowsOf(form: AdminForm): Promise<Row[]> {
  const file = path.join(FE, form.source);
  const src = await readFile(file, 'utf8');
  if (form.model) return modelFields(src, file, form.model);
  const lab = readFormFields(src).map<Row>((f) => ({
    label: f.label,
    required: f.requiredSometimes ? 'sometimes' : f.required ? 'yes' : 'no',
    hints: f.hints.map((h) => h.text),
    placeholder: f.placeholder,
    errors: [],
    checks: (f.checks ?? []).map((c) => ({ label: c.label, hint: c.hint })),
  }));
  if (lab.length) return lab;
  const comp = componentFields(src);
  return comp.length ? comp : modelFields(src, file);
}

// -------------------------------------------------------------- password rules

/** The messages `validatePassword` returns, in the order it tries them. */
async function passwordRules(): Promise<string[]> {
  const src = await readFile(path.join(FE, 'utils', 'passwordStrength.js'), 'utf8').catch(() => '');
  const min = /MIN_PASSWORD_LENGTH\s*=\s*(\d+)/.exec(src)?.[1];
  const body = /export function validatePassword[\s\S]*?\n}/.exec(src)?.[0] ?? '';
  const out: string[] = [];
  for (const m of body.matchAll(/return\s+(['`])(.*?)\1/g)) {
    out.push(m[2].replace(/\$\{MIN_PASSWORD_LENGTH\}/g, min ?? '?'));
  }
  return out;
}

// ------------------------------------------------------------------- rendering

/** JSX text keeps its HTML entities (`&ldquo;Disk usage&rdquo;`); a table cell wants the characters. */
const ENTITIES: Record<string, string> = {
  '&ldquo;': '\u201c', '&rdquo;': '\u201d', '&lsquo;': '\u2018', '&rsquo;': '\u2019',
  '&apos;': '\u2019', '&quot;': '"', '&amp;': '&', '&nbsp;': ' ', '&mdash;': '\u2014', '&ndash;': '\u2013', '&hellip;': '\u2026',
};
const decode = (t: string) => t.replace(/&[a-z]+;/g, (m) => ENTITIES[m] ?? m);

/** A checkbox caption's hint: literal text, or the sentences a conditional chooses between. */
function checkHints(h: string | undefined): string[] {
  if (!h) return [];
  return h.trim().startsWith('{') ? sentences(h.trim()) : [h];
}

// A note's `required` wins: some forms enforce a field (the save stays
// disabled without it) without marking its label.
const yes = (r: Row, f: AdminForm, key = r.label) =>
  f.fields[key]?.required ?? (r.required === 'yes' ? 'Yes' : r.required === 'sometimes' ? (f.fields[key]?.requiredWhen ?? 'Sometimes') : '—');

function joinChecks(list: string[]): string {
  const seen = new Set<string>();
  const kept = list.filter((x) => x && !seen.has(x) && seen.add(x));
  return kept.length ? kept.map((x) => `*${cell(x)}*`).join(' · ') : '—';
}

function fieldTable(form: AdminForm, rows: Row[], warn: (m: string) => void): string[] {
  // A label used by more than one row is addressed as `Label#2`, `Label#3`… so
  // each row carries its own notes — UserForm has an add-mode and an
  // edit-mode "Password", and one set of notes cannot describe both.
  const count = new Map<string, number>();
  const keyed = rows.map((r) => {
    const n = (count.get(r.label) ?? 0) + 1;
    count.set(r.label, n);
    return { r, key: n === 1 ? r.label : `${r.label}#${n}` };
  });
  const known = new Set(keyed.flatMap(({ r, key }) => [key, ...r.checks.map((c) => `${r.label} › ${c.label}`)]));
  for (const k of Object.keys(form.fields)) {
    if (!known.has(k) && !form.fields[k].extra) warn(`${form.source}: note for "${k}" matches no field`);
  }
  const L = [
    '| Field | Required | Example | Starts at | Checked on save | What it is for |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  const line = (label: string, req: string, n: AdminForm['fields'][string] | undefined, said: string[], errors: string[], ph?: string, row?: Row) => {
    // A note can say which of the source's sentences are really errors (shown
    // in red under the control) or empty-state text, not help.
    said = said.map(decode);
    const hints = said.filter((h) => !n?.drop?.includes(h) && !n?.errorHints?.includes(h));
    errors = [...errors, ...said.filter((h) => n?.errorHints?.includes(h))];
    const ex = n?.example ?? (ph && !/^[—–-]/.test(ph) && !/…$/.test(ph) && !/^(defaults?|select|choose|leave)\b/i.test(ph) && ph !== n?.starts ? ph : undefined);
    const what = [n?.when ? `*${n.when}.*` : '', row?.choices ? `One of: ${row.choices.map((c) => `**${c}**`).join(', ')}.` : '', ...hints, n?.what ?? ''].filter(Boolean).join(' ');
    const starts = n?.starts ?? row?.starts;
    L.push(
      `| ${cell(label)} | ${req} | ${ex ? `\`${code(ex)}\`` : '—'} | ${starts ? cell(starts) : '—'} | ${joinChecks([...errors, ...(n?.checks ?? [])])} | ${cell(what) || '—'} |`,
    );
  };
  const seen = new Set<string>();
  for (const { r, key } of keyed) {
    const n = form.fields[key];
    if (n?.skip) continue;
    // A row whose hints all belong to its checkboxes says nothing of its own.
    const own = r.hints.filter((h) => !r.checks.some((c) => checkHints(c.hint).includes(h)));
    // A second row under a label already used — UserForm's "Email" holding
    // only "Mark email as verified" — is just a caption for its checkboxes;
    // repeating the label would pin the first row's notes on it too.
    const repeat = seen.has(r.label);
    seen.add(r.label);
    // A row that is only a caption over its checkboxes ("Status", "Registration")
    // says nothing a reader needs; its checkboxes follow as their own rows.
    const caption = r.checks.length && !own.length && !n && r.required === 'no';
    if (!(repeat && r.checks.length) && !caption) line(r.label, yes(r, form, key), n, own, r.errors, r.placeholder, r);
    for (const c of r.checks) {
      const key = `${r.label} › ${c.label}`;
      line(key, '—', form.fields[key], checkHints(c.hint), []);
    }
  }
  for (const [label, n] of Object.entries(form.fields)) {
    if (n.extra) line(label, n.required ?? '—', n, [], []);
  }
  return L;
}

/**
 * A file on disk is not enough — the notes have to DECLARE it too.
 *
 * Two pages can share a `shotDir` (the device group list and its tree), so the
 * directory holds images that only one of them should show. Emitting whatever
 * is on disk put the list's screenshot on the tree page, with an empty `alt`
 * and no caption, because the notes that describe it belong to the other page.
 */
function figure(root: string, dir: string, have: Set<string>, shots: AdminShot[], file: string | undefined): string[] {
  if (!file || !have.has(file)) return [];
  const sh = shots.find((x) => x.file === file);
  if (!sh) return [];
  return [`<img src="/kb/img/${root}/${dir}/${file}" alt=${JSON.stringify(sh.alt)} />`, '', `*${sh.what}*`, ''];
}

/**
 * Render a guide from notes. Exported for other sidebar sections built the same
 * way (list page + form): give them their own notes file and image root
 * (`public/img/<root>/<shotDir>/`) and they share this layout.
 */
export async function renderNotes(n: AdminNotes, warn: (m: string) => void, root = 'admin'): Promise<string> {
  const have = new Set(await readdir(path.join(APP_ROOT, 'public', 'img', root, n.shotDir)).catch(() => [] as string[]));
  const L: string[] = ['', `## ${n.title}`, ''];
  for (const p of n.intro) L.push(p, '');
  // The page as it opens sits under the introduction, before any step refers to it.
  // Pictures no step refers to — the page as it opens, or a read-only page's
  // only shot — belong under the introduction.
  for (const sh of n.shots) {
    if (!n.tasks.some((t) => t.shot === sh.file)) L.push(...figure(root, n.shotDir, have, n.shots, sh.file));
  }

  if (n.before.length) {
    L.push('### Before you start', '');
    for (const b of n.before) L.push(`- ${b}`);
    L.push('');
  }

  for (const t of n.tasks) {
    L.push(`### ${t.title}`, '');
    t.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
    L.push('');
    for (const a of t.after ?? []) L.push(a, '');
    L.push(...figure(root, n.shotDir, have, n.shots, t.shot));
  }

  for (const form of n.forms) {
    const rows = await rowsOf(form);
    if (!rows.length) warn(`${form.source}: no fields read`);
    L.push(`## Every field — ${form.title}`, '');
    if (form.opens) L.push(form.opens, '');
    L.push(...fieldTable(form, rows, warn), '');
    for (const p of form.after ?? []) L.push(p, '');
    if (form.passwordRules) {
      const rules = await passwordRules();
      if (rules.length) {
        L.push(
          '### Password rules',
          '',
          'Checked in the browser as you type, in this order — the first rule a password breaks is the message shown beside the button. The server runs its own password validators too; these rules were written to mirror them, and if the server still refuses a password its reason appears in the red bar at the top of the form.',
          '',
          '| If the password… | The form says |',
          '| --- | --- |',
          ...rules.map((r, i) => `| ${cell(PASSWORD_RULE_MEANING[i] ?? '—')} | *${cell(r)}* |`),
          '',
        );
      }
    }
  }

  for (const s of n.sections ?? []) {
    L.push(`## ${s.title}`, '');
    for (const p of s.body) L.push(p, '');
  }

  if (n.verify.length) {
    L.push('## Check that it worked', '');
    for (const v of n.verify) L.push(`- ${v}`);
    L.push('');
  }

  if (n.trouble.length) {
    L.push('## When it does not work', '', '| What you see | Why | What to do |', '| --- | --- | --- |');
    for (const [a, b, c] of n.trouble) L.push(`| ${cell(a)} | ${cell(b)} | ${cell(c)} |`);
    L.push('');
  }

  const missing = n.shots.filter((s) => !have.has(s.file));
  if (missing.length) {
    L.push(
      '## Screenshots',
      '',
      `<Callout type="warn">${missing.length === n.shots.length ? 'None captured yet. Screenshots have to come from a running controller, so they are taken by hand rather than generated. ' : ''}Drop these into \`public/img/${root}/${n.shotDir}/\` and each appears beside the step it illustrates on the next build.</Callout>`,
      '',
    );
    for (const s of missing) L.push(`- \`${s.file}\` — ${s.what}`);
    L.push('');
  }

  // Notes are prose, and prose says things like "Invalid param in <key>". MDX
  // reads any `<word>` as a JSX tag and the whole build fails, so placeholders
  // become ‹word›. The two tags this renderer emits on purpose are left alone.
  const safe = (line: string) =>
    line.replace(/<(?!\/?(?:Callout|img|small)\b)([a-z][\w-]*)>/g, '\u2039$1\u203a');
  for (let i = 0; i < L.length; i++) L[i] = safe(L[i]);

  L.push('---', '', `<small>Fields read from: ${n.forms.map((f) => `\`${f.source}\``).join(', ') || '—'}. Guide notes written against: ${n.from.map((f) => `\`${f}\``).join(', ')}.</small>`, '');
  return L.join('\n');
}

/**
 * What each `validatePassword` return means, by position. Positional on
 * purpose: if the function gains or reorders a rule, the count stops matching
 * and the build says so rather than pairing a message with the wrong reason.
 */
const PASSWORD_RULE_MEANING = [
  'is empty',
  'is shorter than the minimum',
  'is longer than 128 characters',
  'is digits only',
  'starts or ends with a space',
  'is on the common-passwords list (password123, qwerty123, nexapp123, …)',
  'resembles the username, email, first or last name',
  'repeats one character four or more times in a row',
  'lacks either a letter or a digit',
];

/** The guide for an Administration route, or '' when it has none. */
export async function adminGuide(route: string): Promise<string> {
  const hit = GUIDE_REGISTRY.find((g) => g.notes[route]);
  const root = hit?.root ?? null;
  const n = hit?.notes[route];
  if (!n || !root) return '';
  const warnings: string[] = [];
  const warn = (m: string) => warnings.push(m);
  if (n.forms.some((f) => f.passwordRules)) {
    const rules = await passwordRules();
    if (rules.length !== PASSWORD_RULE_MEANING.length) {
      warn(`passwordStrength.js has ${rules.length} rules; PASSWORD_RULE_MEANING describes ${PASSWORD_RULE_MEANING.length}`);
    }
  }
  const out = await renderNotes(n, warn, root);
  for (const w of warnings) console.warn(`  ! admin guide ${route}: ${w}`);
  return out;
}
