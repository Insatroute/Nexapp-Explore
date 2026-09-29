/**
 * What one device tab's panel tells the operator, read from the panel.
 *
 * The tabs that change something all explain themselves on screen — a hint
 * under a control, a placeholder, a confirmation before anything destructive,
 * a message afterwards saying what happened. Those sentences are the best
 * documentation of the tab that exists, because they were written for the
 * person using it and they are what that person will actually see.
 *
 * Generic on purpose. Checks was written up one panel at a time and that does
 * not scale to the rest; what each of them exposes is the same handful of
 * things in the same shapes.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { factsForFile } from './extract-page-facts.ts';
import { clean } from './read-form-fields.ts';

export interface PanelFacts {
  key: string;
  label: string;
  component: string;
  /** The component's leading comment, first paragraph. */
  intro?: string;
  /** Sentences the panel prints to explain itself. */
  hints: string[];
  placeholders: string[];
  /** Every confirmation it asks before acting. */
  confirms: { title: string; message: string }[];
  /** What it says when something worked, and when it did not. */
  ok: string[];
  err: string[];
  labels: string[];
  actions: string[];
  reads: string[];
}

const PAGE = path.join(FE, 'pages', 'DeviceDetail.jsx');
const READ_VERB = /^(Browse and search|View|Search|Count|Preview|Download|Export)\b/;

/**
 * The messages a toast call can produce.
 *
 * Three shapes, and reading only the first missed two: a plain string; a
 * template whose static half comes AFTER the value, as in
 * "${name} alert updated."; and a conditional holding one string per branch.
 * An interpolated value becomes a placeholder, so the sentence still reads as
 * the sentence the operator sees.
 */
function messagesIn(raw: string): string[] {
  const out: string[] = [];
  for (const m of raw.matchAll(/`((?:[^`\\]|\\.)*)`|'((?:[^'\\]|\\.)*)'/g)) {
    const lit = m[1] ?? m[2] ?? '';
    const t = clean(lit.replace(/\$\{[^}]*\}/g, '‹…›').replace(/\\'/g, '’'))
      .replace(/[:\s]+$/, '');
    if (t.length >= 8 && /[a-z]{3}/i.test(t)) out.push(t);
  }
  return out;
}

export async function readPanelFacts(tabKey: string): Promise<PanelFacts | undefined> {
  const page = await readFile(PAGE, 'utf8').catch(() => '');
  if (!page) return undefined;

  const label =
    new RegExp(`key:\\s*'${tabKey}'\\s*,\\s*label:\\s*'([^']+)'`).exec(page)?.[1] ?? tabKey;
  const component = new RegExp(`tab === '${tabKey}'[\\s\\S]{0,120}?<([A-Z][A-Za-z0-9_]*)`).exec(page)?.[1];
  if (!component) return undefined;
  const rel = new RegExp(`import\\s+${component}\\s+from\\s+'([^']+)'`).exec(page)?.[1];
  if (!rel) return undefined;

  const file = path.join(FE, 'pages', rel);
  const src = await readFile(file, 'utf8').catch(() => '');
  if (!src) return undefined;
  const facts = await factsForFile(file).catch(() => undefined);

  const own = /((?:^\/\/[^\n]*\n)+)export default function/m.exec(src)?.[1];
  const intro = own
    ? clean(own.replace(/^\s*\/\/\s?/gm, '').split(/\n\s*\n/)[0])
    : undefined;

  const hints = [
    ...src.matchAll(/<(?:span|p) className="hint"[^>]*>([^<{][^<]*?)<\/(?:span|p)>/g),
  ]
    .map((m) => clean(m[1]))
    // A hint that carries an expression is not prose. One reads
    // `{ifaces.error || '…'}`, and passing that through put a live JSX
    // expression into the page, which the MDX parser then tried to evaluate.
    .filter((h, i, a) => h.length >= 20 && !/[{}]/.test(h) && a.indexOf(h) === i);

  const placeholders = [...src.matchAll(/placeholder=(?:"([^"]+)"|\{[^}]*?'([^']{6,})')/g)]
    .map((m) => clean(m[1] ?? m[2] ?? ''))
    .filter((p, i, a) => p && a.indexOf(p) === i);

  const confirms: { title: string; message: string }[] = [];
  for (const m of src.matchAll(/confirm\(\{([\s\S]*?)\}\)/g)) {
    const body = m[1];
    const title = /title:\s*[`']([^`']+)[`']/.exec(body)?.[1];
    const parts = /message:\s*((?:[`'](?:[^`'\\]|\\.)*[`']\s*\+?\s*)+)/.exec(body)?.[1];
    const message = parts
      ? clean([...parts.matchAll(/[`']((?:[^`'\\]|\\.)*)[`']/g)].map((x) => x[1].replace(/\\'/g, '’')).join(''))
      : undefined;
    if (title && message) confirms.push({ title: clean(title), message });
  }

  const ok: string[] = [];
  const err: string[] = [];
  for (const m of src.matchAll(/toast\.(success|error)\(([\s\S]{0,200}?)\)\s*\n/g)) {
    for (const t of messagesIn(m[2])) (m[1] === 'success' ? ok : err).push(t);
  }

  const labels = [...src.matchAll(/<label className="lab(?: req)?"[^>]*>([^<]+)<\/label>/g)]
    .map((m) => clean(m[1]))
    .filter((l, i, a) => a.indexOf(l) === i);

  const actions: string[] = [];
  const reads: string[] = [];
  for (const op of facts?.operations ?? []) (READ_VERB.test(op.verb) ? reads : actions).push(op.verb);

  const uniq = (a: string[]) => a.filter((x, i) => a.indexOf(x) === i);
  return {
    key: tabKey,
    label,
    component,
    intro,
    hints,
    placeholders,
    confirms,
    ok: uniq(ok),
    err: uniq(err),
    labels,
    actions,
    reads,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const k of process.argv.slice(2)) {
    const p = await readPanelFacts(k);
    if (!p) { console.log(`${k}: nothing`); continue; }
    console.log(`\n=== ${p.label} (${p.component}) ===`);
    if (p.intro) console.log(`intro   : ${p.intro.slice(0, 100)}`);
    console.log(`actions : ${p.actions.join(', ') || '—'}`);
    console.log(`hints   : ${p.hints.length}  confirms: ${p.confirms.length}  ok: ${p.ok.length}  err: ${p.err.length}  labels: ${p.labels.length}`);
    for (const c of p.confirms) console.log(`   confirm: ${c.title} / ${c.message.slice(0, 70)}`);
  }
}
