/**
 * The fields of a hand-written form, read from its JSX.
 *
 * The Policy Engine describes its forms as data, so they need none of this. The
 * older screens — VPN servers, templates — are written out by hand, and the only
 * description of their fields is the markup itself: a label, the control under
 * it, and a hint that is often a conditional rather than a sentence.
 *
 * Shared because getting it wrong is easy and the same three mistakes recur:
 *
 *   - reading a fixed window after a label runs into the NEXT field, so one
 *     field ends up documented with its neighbour's help text;
 *   - matching quoted strings with a regex straddles real boundaries, because
 *     in `n === 1 ? '' : 's'` one literal's closing quote pairs with the next
 *     one's opening quote, and fragments of code come back looking like prose;
 *   - stripping JSX tags before expressions breaks on `onClick={() => f(x)}>`,
 *     whose arrow closes the tag early.
 *
 * Fixed once here rather than three times badly.
 */

export interface FormHint {
  text: string;
}
export interface FormField {
  label: string;
  required: boolean;
  /** Required only under some condition — the control's `required` is an expression. */
  requiredSometimes?: boolean;
  hints: FormHint[];
  placeholder?: string;
  /** What a select's blank option says, e.g. "Shared (all organizations)". */
  blank?: string;
  /**
   * Checkboxes that share one row label, each with its own caption and hint.
   *
   * The organization form's "Registration" row holds two: "Registration
   * enabled" and "Require serial admission". Read as one field they collapsed
   * into a row label with somebody else's help text attached — the KB told a
   * reader that a field called **Registration** meant "only devices with a
   * pre-approved serial number may register", which is the OTHER checkbox.
   */
  checks?: Array<{ label: string; hint?: string }>;
  readOnly?: boolean;
}

export const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Every quoted string in a JSX expression, skipping template literals whole —
 * including the quotes that live inside their `${ … }` interpolations.
 */
export function quotedStrings(s: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '`') {
      i++;
      for (let depth = 0; i < s.length; i++) {
        if (s[i] === '\\') { i++; continue; }
        if (s[i] === '{') depth++;
        else if (s[i] === '}') depth--;
        else if (s[i] === '`' && depth <= 0) break;
      }
      continue;
    }
    if (c !== "'" && c !== '"') continue;
    let text = '';
    for (i++; i < s.length && s[i] !== c; i++) {
      // `\u2019` is one character, not a `u` and four digits.
      if (s[i] === '\\' && s[i + 1] === 'u' && /^[0-9a-fA-F]{4}$/.test(s.slice(i + 2, i + 6))) {
        text += String.fromCharCode(parseInt(s.slice(i + 2, i + 6), 16));
        i += 5;
        continue;
      }
      if (s[i] === '\\') { i++; text += s[i] ?? ''; continue; }
      text += s[i];
    }
    out.push(text);
  }
  return out;
}

/** JSX reduced to the words it renders: expressions out first, then tags. */
export function plainText(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') { out += s[i]; continue; }
    for (let depth = 0; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}' && --depth === 0) break;
    }
    out += ' ';
  }
  return out.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Hints inside one field's block, in the order the form declares them. */
function hintsIn(block: string): FormHint[] {
  const out: FormHint[] = [];
  for (const m of block.matchAll(/<span className="hint"[^>]*>([\s\S]*?)<\/span>/g)) {
    const body = m[1];
    if (!body.includes('{')) {
      const t = clean(body);
      if (t) out.push({ text: t });
      continue;
    }
    // Prefer the sentences the expression chooses between.
    const said = quotedStrings(body).map(clean).filter((t) => /^[A-Z]/.test(t) && /\s/.test(t));
    if (said.length) {
      for (const t of said) out.push({ text: t });
      continue;
    }
    // Otherwise it is prose with markup running through it.
    const t = plainText(body);
    if (t.length >= 12) out.push({ text: t });
  }
  // A conditional names its special cases first and its default last, so the
  // wording that applies normally would otherwise arrive at the end.
  out.reverse();
  const seen = new Set<string>();
  return out.filter((h) => !seen.has(h.text) && seen.add(h.text));
}

/**
 * Read a form's fields.
 *
 * `pickers` names components that carry their own `label=` and `hint=` props —
 * `IpamPicker` in the VPN form — so they are read as fields too.
 */
export function readFormFields(src: string, pickers: string[] = []): FormField[] {
  const alt = pickers.length ? `|<(?:${pickers.join('|')})\\b([\\s\\S]*?)\\/>` : '';
  const re = new RegExp(`<label className="lab( req)?"[^>]*>([^<]+)<\\/label>${alt}`, 'g');
  const boundary = new RegExp(`<label className="lab${pickers.length ? `|<(?:${pickers.join('|')})\\b` : ''}`);

  const fields: FormField[] = [];
  const seen = new Set<string>();
  for (const m of src.matchAll(re)) {
    const picker = m[3];
    const label = clean(picker ? (/label="([^"]+)"/.exec(picker)?.[1] ?? '') : (m[2] ?? ''));
    if (!label || seen.has(label)) continue;
    seen.add(label);

    const field: FormField = {
      label,
      required: picker ? /\brequired=\{[^}]+\}/.test(picker) : Boolean(m[1]),
      requiredSometimes: picker ? /\brequired=\{[^}]+\}/.test(picker) : false,
      hints: [],
    };

    if (picker) {
      const h = /hint="([^"]+)"/.exec(picker)?.[1];
      if (h) field.hints.push({ text: clean(h) });
    } else {
      // Bounded by where the next field starts, never a fixed window.
      const rest = src.slice(m.index + m[0].length);
      const stop = rest.search(boundary);
      const block = m[0] + (stop < 0 ? rest.slice(0, 1400) : rest.slice(0, stop));

      field.hints = hintsIn(block);
      const ph = /placeholder="([^"]+)"/.exec(block)?.[1];
      if (ph) field.placeholder = clean(ph);
      const blank = /\{\s*value:\s*''\s*,\s*label:\s*'([^']+)'/.exec(block)?.[1];
      if (blank) field.blank = clean(blank);

      // Each checkbox in the row, with the hint that sits under IT rather than
      // the first one found anywhere in the block.
      const checks: Array<{ label: string; hint?: string }> = [];
      const marks = [...block.matchAll(/<label className="check__t"[^>]*>([^<]+)<\/label>/g)];
      for (const [i, cm] of marks.entries()) {
        const until = i + 1 < marks.length ? marks[i + 1].index : block.length;
        const own = block.slice(cm.index, until);
        const hint = /className="hint">\s*([^<]+?)\s*</.exec(own)?.[1];
        checks.push({ label: clean(cm[1]), ...(hint ? { hint: clean(hint) } : {}) });
      }
      if (checks.length) field.checks = checks;
      if (/\breadOnly\b/.test(block)) field.readOnly = true;
    }
    fields.push(field);
  }
  return fields;
}

/** The table cell form of a field's description, or '' when the form says nothing. */
export function describeField(f: FormField): string {
  return [
    f.readOnly && 'Read-only — set by the controller.',
    ...f.hints.map((h) => h.text),
    f.blank && `Left blank: ${f.blank}.`,
    f.placeholder && !f.hints.length && `Example: \`${f.placeholder}\``,
  ]
    .filter(Boolean)
    .join(' ');
}
