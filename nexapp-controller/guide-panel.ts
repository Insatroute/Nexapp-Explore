/**
 * A deep section for a device tab that changes something.
 *
 * One renderer for all of them. Checks was written up by hand and that told me
 * two things: the shape is the same every time, and the useful content is
 * already on the screen — the hint under a control, the confirmation before a
 * destructive act, the message afterwards. So this reads those and lays them
 * out, rather than paraphrasing them into something a reader would then have to
 * reconcile with what they see.
 *
 * A panel that says little gets a short section. Padding the quiet ones would
 * make them indistinguishable from the thorough ones.
 */
import { readPanelFacts, type PanelFacts } from './extract-panel.ts';
import { CURATED } from './console-descriptions.ts';
import { cell } from './mdx.ts';


/** `${credName(conn.credentials)}` reads as a placeholder, not as code. */
const human = (s: string) => s.replace(/\$\{[^}]+\}/g, '‹name›');

const DETAIL = CURATED['/devices/:id'];

function panelSection(p: PanelFacts): string[] {
  const L: string[] = [];
  const authored = DETAIL?.tabs?.[p.label];
  const opNote = (verb: string) => DETAIL?.notes?.[verb];

  L.push('', `## Working with the ${cell(p.label)} tab`, '');
  if (authored) L.push(cell(authored), '');
  else if (p.intro) L.push(cell(p.intro), '');
  L.push(`Open it from **Network › Devices**, open a device, then **${cell(p.label)}**.`, '');

  if (p.actions.length) {
    L.push('### What you can do here', '');
    for (const a of p.actions) {
      const n = opNote(a);
      L.push(`- **${cell(a)}**${n ? ` — ${cell(n)}` : ''}`);
    }
    L.push('');
  }

  if (p.labels.length) {
    L.push(`**The form asks for:** ${p.labels.map((l) => `**${cell(l)}**`).join(', ')}.`, '');
  }

  if (p.hints.length) {
    L.push('### What the panel tells you', '', 'Its own wording, because it is what you will see:', '');
    for (const h of p.hints) L.push(`- ${cell(h)}`);
    L.push('');
  }

  if (p.placeholders.length) {
    L.push(
      `**Empty fields read:** ${p.placeholders.map((x) => `“${cell(x)}”`).join(', ')}.`,
      '',
    );
  }

  if (p.confirms.length) {
    L.push(
      '### Before anything is undone',
      '',
      `${p.confirms.length === 1 ? 'One action asks first' : `${p.confirms.length} actions ask first`}, and the wording says what is actually lost:`,
      '',
    );
    for (const c of p.confirms) {
      L.push(`> **${cell(human(c.title))}**  \n> ${cell(c.message)}`, '');
    }
  }

  if (p.ok.length || p.err.length) {
    L.push('### What it tells you afterwards', '');
    if (p.ok.length) {
      L.push('**When it worked**', '');
      for (const m of p.ok) L.push(`- ${cell(m)}`);
      L.push('');
    }
    if (p.err.length) {
      L.push('**When it did not**', '');
      for (const m of p.err) L.push(`- ${cell(m)}`);
      L.push(
        '',
        'Each of these carries the API’s own reason after it, rather than a status code.',
        '',
      );
    }
  }

  if (!p.hints.length && !p.confirms.length && !p.ok.length && !p.err.length) {
    L.push(
      '<Callout type="info">This panel prints little for itself — no hints, confirmations or messages to quote. What it does is listed above; how it behaves is not written down in the source, so it is not written down here either.</Callout>',
      '',
    );
  }

  L.push(
    '---',
    '',
    `<small>Read from: \`components/${p.component}.jsx\` — its own hints, placeholders, confirmations and messages, and the API calls it makes.</small>`,
    '',
  );
  return L;
}

export async function panelGuides(keys: string[]): Promise<string> {
  const L: string[] = [];
  for (const k of keys) {
    const p = await readPanelFacts(k);
    if (p) L.push(...panelSection(p));
  }
  return L.join('\n');
}
