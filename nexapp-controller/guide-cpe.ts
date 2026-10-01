/**
 * One CPE screen, written up for someone standing in front of it.
 *
 * The catalogue half of these pages — which classic tab a screen mirrors, which
 * RPCD methods it calls — is provenance. It tells a reader the page is real and
 * where it came from, and tells them nothing about using it. This is the other
 * half: what the screen is divided into, what its list shows, what every field
 * in its form is for, what you can do to a row, and what has to happen before
 * any of it reaches the router.
 *
 * Generated for all 45 screens from one kit, so it cannot drift from the
 * console the way 45 hand-written pages would. What the code cannot say —
 * what a protocol option means, a worked example, why a saved peer never comes
 * up — is layered on from `cpe-field-notes.ts`, which is pinned to the source
 * it was written against.
 */
import type { CpePage } from './extract-cpe.ts';
import type {
  CpeApplyFacts,
  CpeCard,
  CpePageDetail,
  CpeSlaHealthFacts,
  CpeSubPage,
} from './extract-cpe-page.ts';
import { CPE_NOTES, type CpeFieldNote, type CpeScreenNotes } from './cpe-field-notes.ts';
import { cell } from './mdx.ts';

type Form = CpePageDetail['forms'][number];
type FormField = Form['fields'][number];

/**
 * A shot the page will show if someone captures it.
 *
 * Screenshots cannot be generated from source — they need a running controller
 * with real devices on it. What CAN be generated is the slot: each page names
 * the shots it wants, in the console's own words, at a path the generator
 * checks for. Drop the file in and the picture appears where it helps — beside
 * the step it illustrates; leave it out and the page prints the capture list
 * instead. Neither state is broken, which is why this is here rather than a
 * TODO nobody acts on.
 */
export interface Shot {
  /** File under `public/img/cpe/<section>/<screen>/`. */
  file: string;
  /** What to capture, and why that framing. */
  what: string;
  alt: string;
}

/** The drawer forms that belong to a card's **Add** button, in card order. */
const cardForms = (d: CpePageDetail) =>
  d.cards
    .filter((c) => c.form)
    .map((c) => ({ card: c, form: d.forms.find((f) => f.title === c.form && !f.inline) }))
    .filter((x): x is { card: CpeCard; form: Form } => Boolean(x.form));

/**
 * Does a save on this screen stage UCI, or take effect at once?
 *
 * Only the services cpeKit lists as staging leave anything for the pending bar.
 * A screen that writes to any other service commits as it saves, and telling
 * its reader to press Apply sends them looking for a bar that never appears.
 *
 * Restored after a concurrent full-file rewrite dropped it; the generator
 * imports it.
 */
export function stagesUci(
  d: CpePageDetail | undefined,
  apply: CpeApplyFacts | undefined,
): boolean {
  if (!d || !apply) return false;
  // What the screen WRITES decides it; a service it only reads — Interfaces'
  // SD-WAN status from ns.bonding — says nothing about its saves.
  const writes = d.formWriteServices?.length
    ? d.formWriteServices
    : d.writeServices?.length
      ? d.writeServices
      : d.services;
  return writes.some((sv) => apply.stagingServices.includes(sv));
}

/** A form's name as the reader will see it on the page. */
const formName = (f: CpePageDetail['forms'][number]) =>
  f.title ?? (f.inline ? (f.subTab ? `${f.subTab} tab` : 'Settings on the screen') : f.saveLabel ?? 'Form');

/** `Add neighbour` → `add-neighbour`, for a per-form screenshot file. */
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function shotsFor(d: CpePageDetail, label: string, stagesUci: boolean): Shot[] {
  const settings = d.forms.find((f) => f.inline);
  const drawers = d.forms.filter((f) => !f.inline);
  const perCard = cardForms(d);
  // A screen that hides its lists behind a switch has to be photographed with
  // the switch on, or the shot shows two cards and none of the lists.
  const gate = d.cards.find((c) => c.shownWhen)?.shownWhen;

  const out: Shot[] = [
    {
      file: 'list.png',
      what: `${d.tables.length ? `**${cell(label)}** as it opens, with a few real records in the list.` : `**${cell(label)}** as it opens.`}${gate ? ` Capture it with ${gate.replace(/\*\*/g, '')}, so the lists are on screen.` : ''}`,
      alt: `The ${label} screen`,
    },
  ];

  if (settings && settings.fields.length > 6) {
    // No drawer to open: the fields ARE the screen, and one shot cannot hold
    // twenty of them, so the ask is for the part the first shot cuts off.
    out.push({
      file: 'settings.png',
      what: `The settings part of the screen with every optional field showing${settings.fields.some((x) => x.shownWhen?.length) ? ' (switch on the options that reveal more fields)' : ''}.`,
      alt: `The ${label} settings`,
    });
  }

  if (perCard.length > 1) {
    for (const { card, form } of perCard) {
      out.push({
        file: `form-${card.kind}.png`,
        what: `The **${cell(form.title ?? card.title)}** drawer, opened with **${cell(card.addLabel ?? 'Add')}** under **${cell(card.title)}**, on a NEW record so the starting values are visible.`,
        alt: `The ${form.title ?? card.title} form`,
      });
    }
  } else if (drawers.length > 1) {
    // One drawer per list: each is its own shot, named after the drawer.
    for (const f of drawers) {
      out.push({
        file: `form-${slug(formName(f))}.png`,
        what: `The **${cell(formName(f))}** drawer, open on a new record.`,
        alt: `The ${formName(f)} form`,
      });
    }
  } else if (drawers.length) {
    const form = drawers[0];
    out.push({
      file: 'form.png',
      what: `The **${cell(form.title ?? form.saveLabel ?? 'form')}** drawer open on a NEW record, so the starting values in the table above are visible.`,
      alt: `The ${form.title ?? label} form`,
    });
  }

  // A banner with no Retry is a state of the device, not a hiccup — worth a
  // picture, because the reader who meets it is looking for this page.
  const permanent = d.warnings.find((w) => d.warningNotes[w] && !d.warningNotes[w].retry);
  if (permanent) {
    out.push({
      file: 'unavailable.png',
      what: `The screen on a device where it shows \u201c${cell(permanent.replace(/\.$/, ''))}\u201d.`,
      alt: permanent,
    });
  }

  if (d.confirms.some((c) => c.removes)) {
    out.push({
      file: 'delete.png',
      what: 'The confirmation dialog, showing what it warns before deleting.',
      alt: 'The delete confirmation',
    });
  }

  // Only where a save actually stages UCI. A controller-stored screen has no
  // pending bar to photograph.
  if (stagesUci && (d.forms.length || d.rowActions.length)) {
    out.push({
      file: 'applied.png',
      what: 'The staged-changes bar, captured after a save and before Apply — the state this page warns about.',
      alt: 'The staged-changes bar',
    });
  }
  return out;
}

/** Where the page's pictures are, and which of them exist. */
export interface ShotPlace {
  dir: string;
  have: Set<string>;
  shots: Shot[];
}

/** The picture for `file`, if it was captured — and nothing if it was not. */
/** Pictures already placed beside a step, per screen — so the closing section shows only the rest. */
const placed = new Map<string, Set<string>>();

function figure(place: ShotPlace | undefined, file: string): string[] {
  if (!place?.have.has(file)) return [];
  if (!placed.has(place.dir)) placed.set(place.dir, new Set());
  placed.get(place.dir)!.add(file);
  const sh = place.shots.find((x) => x.file === file);
  // Captioned, because a picture with no words under it leaves the reader to
  // work out which state it shows.
  return [
    `<img src="/kb/img/cpe/${place.dir}/${file}" alt=${JSON.stringify(sh?.alt ?? '')} />`,
    '',
    ...(sh ? [`*${sh.what}*`, ''] : []),
  ];
}

/**
 * The capture list for what is still missing. Captured shots are not repeated
 * here: each one is shown beside the step it illustrates.
 */
export function screenshotSection(
  shots: Shot[],
  dir: string,
  have: Set<string>,
): string[] {
  const missing = shots.filter((sh) => !have.has(sh.file));
  // Captured, but no step on the page shows it — a drawer reached from a
  // sub-tab or a card the step text does not walk through. Shown here rather
  // than dropped, which is what happened once it stopped being "missing".
  const done = placed.get(dir);
  const unplaced = shots.filter((sh) => have.has(sh.file) && !done?.has(sh.file));
  if (!missing.length && !unplaced.length) return [];
  const L = ['## Screenshots', ''];
  for (const sh of unplaced) {
    L.push(`<img src="/kb/img/cpe/${dir}/${sh.file}" alt=${JSON.stringify(sh.alt)} />`, '', `*${sh.what}*`, '');
  }
  if (!missing.length) return L;
  L.push(
    missing.length === shots.length
      ? '<Callout type="warn">None captured yet. Screenshots have to come from a running controller with real devices on it, so they are taken by hand rather than generated. These are the shots this page is waiting for — drop them in `public/img/cpe/' +
          dir +
          '/` and each appears beside the step it illustrates on the next build.</Callout>'
      : '<Callout type="warn">Still to capture, into `public/img/cpe/' + dir + '/`:</Callout>',
    '',
  );
  for (const sh of missing) L.push(`- \`${sh.file}\` — ${sh.what}`);
  L.push('');
  return L;
}

/** `5000` → `five seconds`, for the cadences the screens actually use. */
function seconds(ms: number): string {
  const s = ms / 1000;
  const words: Record<number, string> = {
    1: 'second', 2: 'two seconds', 3: 'three seconds', 5: 'five seconds',
    10: 'ten seconds', 15: 'fifteen seconds', 20: 'twenty seconds', 30: 'thirty seconds',
    60: 'minute',
  };
  const w = words[s];
  if (!w) return `${s} seconds`;
  return s === 1 || s === 60 ? `every ${w}` : `every ${w}`;
}

const list = (xs: string[]) => xs.map((x) => `**${cell(x)}**`).join(' · ');

/** The notes for one form of one screen, by field label. */
function notesFor(notes: CpeScreenNotes | undefined, f: Form): Record<string, CpeFieldNote> {
  const key = f.inline ? 'Settings' : f.title ?? '';
  // A tab's form is filed as `Tab › Form title`.
  const tabbed = Object.entries(notes?.fields ?? {}).find(([k]) => k.endsWith(` \u203a ${key}`))?.[1];
  return notes?.fields?.[key] ?? tabbed ?? {};
}

/**
 * A placeholder that only repeats the field's name — `Name` in a box labelled
 * Name, "Enter IP Start" under IP Start — is a prompt, not an example, and
 * printed as `e.g. Name` it read as a suggested value.
 */
const echoesLabel = (fl: FormField) => {
  const words = (t: string) =>
    t.toLowerCase().replace(/^(e\.g\.|enter|type)\s+/, '').split(/[^a-z0-9]+/).filter((w) => w && w !== 'or' && w !== 'and');
  const p = words(fl.placeholder ?? '');
  // Not the label's own bracketed example: "Auto-release after (e.g. 5m, 1h,
  // 1d)" with placeholder `5m` is an example, not an echo.
  const l = new Set(words(fl.label.replace(/\([^)]*\)/g, ' ')));
  // "username or email" under "Username / Email", "password or token" under
  // "Password / API Token": every word of the prompt is already in the label,
  // so it names the field rather than giving a value.
  return p.length > 0 && p.every((w) => l.has(w));
};

/** The standing notices a screen or a tab prints above its content. */
function noticeLines(notices: CpePageDetail['notices']): string[] {
  if (!notices.length) return [];
  return [
    ...notices.map(
      (n) => `<Callout type="info">**${cell(n.title)}** — ${cell(n.text)}</Callout>`,
    ),
    '',
  ];
}

/** The "Accepts" cell: what the control will actually take. */
function valuesCell(fl: FormField, note?: CpeFieldNote): string {
  const eg = note?.example ? `e.g. \`${note.example}\`` : '';
  // A list field says so first: what one entry looks like matters less than
  // knowing you can give several, and which button adds the next one.
  if (fl.repeatable) {
    const one = eg || (fl.placeholder ? `e.g. \`${fl.placeholder.replace(/^e\.g\.\s*/i, '')}\`` : '');
    return `a list, one per row${one ? ` \u2014 ${one}` : ''}`;
  }
  if (fl.options?.length) {
    const fixed = fl.options.map((o) => (o === '…' ? o : `\`${o}\``)).join(' · ');
    // `[{ label: 'All members' }, ...members.map(…)]` — one fixed choice, the
    // rest from the router.
    return fl.optionsAreLive ? `${fixed}, or one of the records the router reports` : fixed;
  }
  // The list is whatever the router currently has, so there is nothing to
  // write down — only the fact that it is filled from the device.
  if (fl.optionsAreLive) return 'one of the records the router reports';
  if (fl.min !== undefined || fl.max !== undefined) {
    const unit = fl.unit ? ` ${fl.unit}` : '';
    const range =
      fl.min !== undefined && fl.max !== undefined
        ? `${fl.min}–${fl.max}${unit}`
        : fl.min !== undefined
          ? `${fl.min} or more${unit}`
          : `up to ${fl.max}${unit}`;
    return eg ? `${range}, ${eg}` : range;
  }
  // The placeholders are written as "e.g. 8.8.8.8"; prefixing another "e.g."
  // gave every one of them a stutter.
  // A pinned note's example wins over the placeholder: GRE's placeholder
  // offers a private address for a field that must hold a public one.
  if (eg) return fl.unit ? `in ${fl.unit}, ${eg}` : eg;
  if (fl.placeholder && !echoesLabel(fl)) {
    const p = fl.placeholder.replace(/^e\.g\.\s*/i, '');
    return `e.g. \`${p}\``;
  }
  if (eg) return fl.unit ? `in ${fl.unit}, ${eg}` : eg;
  return fl.unit ? `in ${fl.unit}` : '';
}

/**
 * The "Checked on save" cell: every message the save can put under this
 * field, then what it does instead of refusing.
 */
function validationCell(fl: FormField): string {
  const isSwitch = fl.options?.length === 2 && fl.options[0] === 'On';
  const all = [...new Set([...(fl.rules ?? []), ...(fl.rejects ?? [])])];
  // A range check on an On/Off control is about the number the toggle stores,
  // not about anything the reader can type. IPsec's NAT Traversal switch —
  // which writes 20 or 0 seconds — was carrying "Must be between 0 and 3600",
  // a rule no operator of that control can break or satisfy.
  const msgs = isSwitch
    ? all.filter((m) => !/^Must be between\b|^Must be a (whole )?number\b/i.test(m))
    : all;
  // The rule reader appends its qualifiers in brackets; they are the page's
  // words, not the console's, so they come out of the italics.
  const parts = msgs.map((m) => {
    const q: string[] = [];
    const text = m
      .replace(/ \(may be left empty\)/, () => (q.push('blank is allowed'), ''))
      .replace(/ \(checked only when the field applies\)/, () => (q.push('only checked in some configurations'), ''));
    return `*${text}*${q.length ? ` (${q.join('; ')})` : ''}`;
  });
  if (fl.clamped && fl.min !== undefined && fl.max !== undefined) {
    // `clampNum` in cpeKit.jsx: out of range goes to the nearest limit, and a
    // blank or non-number goes to the minimum.
    parts.push(`Never refused: out of range saves as ${fl.min} or ${fl.max}, blank saves as ${fl.min}.`);
  }
  return parts.join(' · ');
}

/**
 * An example record, from the form's own placeholders and starting values,
 * and the pinned examples in `cpe-field-notes.ts`.
 *
 * Nothing here is invented on the spot: a placeholder is the console's own
 * example of what to type, a starting value is what the router itself fills
 * in, and a note's example was written against this form and is re-checked
 * whenever the form changes. A field with none of the three is left for the
 * reader.
 */
function exampleRows(f: Form, notes: Record<string, CpeFieldNote> = {}): string[] {
  // A one-field form needs no table: its one value is the example.
  if (f.fields.length === 1) {
    const ph = notes[f.fields[0].label]?.example ?? f.fields[0].placeholder?.replace(/^e\.g\.\s*/i, '');
    return ph ? [`For example: \`${cell(ph)}\`.`, ''] : [];
  }
  const rows: string[] = [];
  for (const fl of f.fields) {
    // Hidden or greyed out on a new record: an example for it is a value the
    // reader cannot type without first changing something else.
    if (fl.shownWhen?.length || fl.editableWhen) continue;
    // "8.8.8.8 or aws.amazon.com", "1.1.1.1 — fallback probe target": the
    // first alternative is the example; the rest is commentary.
    const ph =
      notes[fl.label]?.example ??
      (echoesLabel(fl) ? undefined : fl.placeholder)?.replace(/^e\.g\.\s*/i, '').split(/\s+(?:or|—|-)\s+/)[0]?.trim();
    // Only what the reader has to type. A field already filled in says so in
    // the field table; listing it again padded this with the defaults.
    if (!ph) continue;
    rows.push(`| ${cell(fl.label)} | \`${cell(ph)}\` |`);
  }
  return rows.length >= 2
    ? ['For example (the other fields keep their starting values):', '', '| Field | Example value |', '| --- | --- |', ...rows, '']
    : [];
}

/**
 * The section a form becomes.
 *
 * A screen with one form gets a plain table; a screen with several gets one
 * accordion each, because Anti-Spam has five and a page of five stacked tables
 * is unreadable.
 */
function formSection(
  f: Form,
  heading: string,
  collapsed: boolean,
  notes: Record<string, CpeFieldNote> = {},
): string[] {
  // A settings screen bands its fields — "Good", "Degraded", "Voice" — and
  // repeats the same three labels in each. Without the band the table reads as
  // "RTT (ms)" four times over.
  const grouped = f.fields.some((x) => x.group);
  let lastGroup: string | undefined;
  const rows = f.fields.map((fl) => {
    const note = notes[fl.label];
    const what = [
      // First, because a field that is not on the form is the first thing a
      // reader following the table will trip over.
      fl.shownWhen?.length ? `*Only shown when ${fl.shownWhen.join(' and ')}.*` : '',
      fl.editableWhen ? `*Greyed out until ${fl.editableWhen}.*` : '',
      fl.lockedWhen ? `*Greyed out while the screen says “${fl.lockedWhen}”*` : '',
      // The placeholder used to be repeated here as "Example: …" when a field
      // had no hint; it is already the Accepts cell, so it said it twice.
      ...fl.hints,
      note?.what ?? '',
      fl.lockedOnEdit ? 'Cannot be changed after the record is added.' : '',
    ]
      .filter(Boolean)
      // The console's hints often end without a full stop; joined to the next
      // sentence they ran on — "(1-4294967295) This router's own AS".
      .map((x) => (/[.!?*]$/.test(x.trim()) ? x : `${x}.`))
      .join(' ');
    const values = valuesCell(fl, note);
    const checks = validationCell(fl);
    const required = fl.requiredWhen ? `When ${fl.requiredWhen}` : fl.required ? 'Yes' : '—';
    // Only on the row that starts a band, so the column reads as a heading
    // rather than the same sentence repeated down the table.
    const g = grouped ? (fl.group !== lastGroup ? ((lastGroup = fl.group), cell(fl.group ?? '')) : '') : '';
    return (
      (grouped ? `| ${g} | ` : '| ') +
      `${cell(fl.label)} | ${cell(required)}` +
      ` | ${values ? cell(values) : '—'}` +
      ` | ${fl.fallback ? `\`${cell(fl.fallback)}\`` : '—'}` +
      ` | ${checks ? cell(checks) : '—'}` +
      ` | ${what ? cell(what) : '—'} |`
    );
  });

  // What each band is for, said once above the table rather than repeated in
  // every row of it.
  const bandLines = Object.entries(f.groupNotes ?? {})
    .filter(([name]) => f.fields.some((x) => x.group === name))
    .map(([name, note]) => `- **${cell(name)}** — ${cell(note)}`);

  const formNotes = noticeLines(f.notices ?? []);
  // What the form says before its first field. It describes what saving will
  // DO — build a certificate authority, take a few seconds — which no field
  // can say for itself.
  const lead = f.lead ? [cell(f.lead), ''] : [];
  // A wizard is completed in stages: the reader needs to know that before the
  // table, or they fill in everything looking for a save button two steps away.
  const stepLine = f.steps?.length
    ? [
        `Filled in over ${f.steps.length} steps — ${f.steps.map((x) => `**${cell(x)}**`).join(' \u2192 ')}. **Next** moves on; the last step commits it.`,
        '',
      ]
    : [];

  const body = [
    ...(f.shownWhen
      ? [`*Only available while ${f.shownWhen} — the list and its **Add** button are hidden otherwise.*`, '']
      : []),
    ...(f.instant
      ? ['*Each switch writes to the router the moment you flip it. There is no Save button on this part of the screen.*', '']
      : []),
    ...stepLine,
    ...lead,
    ...formNotes,
    ...(grouped
      ? ['| Group | Field | Required | Accepts | Starts at | Checked on save | What it is for |', '| --- | --- | --- | --- | --- | --- | --- |']
      : ['| Field | Required | Accepts | Starts at | Checked on save | What it is for |', '| --- | --- | --- | --- | --- | --- |']),
    ...rows,
    '',
    ...(bandLines.length
      ? ['The form is in bands:', '', ...bandLines, '']
      : []),
    // An inline settings screen gets its own "Saving it" section below; saying
    // it here as well said the same thing twice on the same page.
    ...(f.inline ? [] : [`Commit it with **${cell(f.saveLabel ?? 'Save')}**.`, '']),
  ];

  return collapsed
    ? [`<Accordion title=${JSON.stringify(heading)}>`, '', ...body, '</Accordion>', '']
    : [...body];
}

/**
 * What a router refusal looks like on this form.
 *
 * Most screens report it in a pop-up rather than under the field, and the
 * page used to say "under the field" for all of them — sending the reader to
 * look in the one place the reason is not.
 */
function refusalSentence(f: Form): string {
  if (f.routerErrorsOnField) {
    return 'If the router refuses a value the form accepted, its reason is shown under the field it names.';
  }
  if (f.failToast !== undefined) {
    return `If the router refuses it, a pop-up says *${cell(f.failToast)} ‹the router’s reason›*${f.inline ? '' : ' and the drawer stays open with what you typed'}.`;
  }
  return '';
}

/**
 * The "What it is for" of a card that does not describe itself, built from
 * what the card holds — in the console's own words where it has any.
 */
function cardPurpose(c: CpeCard, d: CpePageDetail): string {
  // What a reader will actually be looking at, when the card shows a state
  // instead of rows. Appended to the blurb rather than replacing it: the blurb
  // says what the card is for, this says what is on it.
  // The console's own strings end in a full stop; joining them with "; or"
  // and appending another produced "…after the portal.; or".
  const trim = (t: string) => t.replace(/[.\u2026]\s*$/, '');
  const states = c.states?.length
    ? `Shows ${c.states
        .map(
          (st) =>
            `**${cell(st.title)}**${st.note ? ` — ${cell(trim(st.note))}` : ''}${st.action ? `, with **${cell(st.action)}**` : ''}`,
        )
        .join('; or ')}.`
    : '';
  // The buttons in the card's own header, after whatever it says about itself.
  // These act on the service or the whole list — Clear Cache, Restart Proxy,
  // Empty quarantine — and were documented nowhere.
  const acts = c.actions?.length
    ? `Its header carries ${list(c.actions)}.`
    : '';
  const tail = [states, acts].filter(Boolean).join(' ');
  if (c.blurb) return tail ? `${c.blurb} ${tail}` : c.blurb;
  if (tail) return tail;
  if (c.readouts?.length) {
    return `The router’s live figures: ${list(c.readouts)}. Read-only.`;
  }
  if (c.holdsSettings) {
    const f = d.forms.find((x) => x.inline);
    return `The screen’s own settings, saved together with **${cell(f?.saveLabel ?? 'Save')}**.`;
  }
  // NOT the table's emptyHint. That sentence describes the screen with nothing
  // on it — "Nothing behind this router is reachable from the internet." — and
  // printing it as what the section is FOR tells a reader with two port
  // forwards configured the opposite of the truth. It is already stated, in
  // its proper place, on the "With nothing configured it reads…" line.
  // A card with no list shows one of a small set of states instead of rows.
  // The blurb says what the card is; these say what a reader will actually be
  // looking at, and which of them offers a way on.
  if (c.columns) return `A list: ${list(c.columns)}.`;
  return '—';
}

export function cpePageGuide(
  pg: CpePage,
  d: CpePageDetail | undefined,
  apply: CpeApplyFacts | undefined,
  sla?: CpeSlaHealthFacts,
  place?: ShotPlace,
): string[] {
  if (!d) return [];
  const L: string[] = [];
  const writes = d.forms.length > 0 || d.rowActions.length > 0;
  const notes = notesKeyFor(pg) ? CPE_NOTES[notesKeyFor(pg)!] : undefined;
  const stages = stagesUci(d, apply);
  const perCard = cardForms(d);
  if (notes) reportStaleNotes(notesKeyFor(pg)!, notes, d);

  // ---- what is on the screen
  const onScreen: string[] = [];
  if (d.subTabs.length) {
    onScreen.push(
      `It is divided into ${d.subTabs.length} sub-tabs, which the CPE menu does not list: ${list(d.subTabs)}.`,
      '',
    );
  }
  if (d.emptyTabs?.length) {
    onScreen.push(
      `<Callout type="warn">${list(d.emptyTabs)} ${d.emptyTabs.length === 1 ? 'is' : 'are'} on the tab strip, but the screen has no content for ${d.emptyTabs.length === 1 ? 'it' : 'them'}: opening ${d.emptyTabs.length === 1 ? 'it' : 'either'} shows an empty page.</Callout>`,
      '',
    );
  }
  if (d.cards.length) {
    const gated = d.cards.some((c) => c.shownWhen);
    const purposes = d.cards.map((c) => cardPurpose(c, d));
    // A screen that is one card holding one list needs no Section table: the
    // only row it can produce restates the "The list shows …" line directly
    // beneath it. Worth a table as soon as there is a second card, or a
    // condition, or anything the card says about itself.
    const onlyRestatesTheList =
      !gated && d.cards.length === 1 && purposes[0].startsWith('A list:');
    if (purposes.some((p) => p !== '—') && !onlyRestatesTheList) {
      onScreen.push(
        gated ? '| Section | What it is for | On screen |' : '| Section | What it is for |',
        gated ? '| --- | --- | --- |' : '| --- | --- |',
      );
      for (const [i, c] of d.cards.entries()) {
        onScreen.push(
          `| ${cell(c.title)} | ${cell(purposes[i])}${gated ? ` | ${c.shownWhen ? cell(`Only when ${c.shownWhen}`) : 'Always'}` : ''} |`,
        );
      }
      onScreen.push('');
    } else {
      onScreen.push(`Its sections are ${list(d.cards.map((c) => c.title))}.`, '');
    }
    // Only where the gate really IS a switch. A card gated on how many records
    // exist — "only when there is more than one server" — is not flipped by
    // anybody, and telling a reader to flip a switch that is not there is
    // worse than saying nothing.
    const gate = d.cards.find((c) => c.shownWhen && /\bis (on|off)$/.test(c.shownWhen))?.shownWhen;
    if (gate) {
      onScreen.push(
        `<Callout type="info">A freshly opened screen can look almost empty. Everything marked *Only when ${gate}* is hidden until the switch is flipped — and it appears as soon as you flip it, before you save.</Callout>`,
        '',
      );
    }
  }
  for (const b of d.banners ?? []) {
    onScreen.push(
      `<Callout type="warn">On some devices the screen carries a notice: **${cell(b.title)}** ${b.text ? `*${cell(b.text)}*` : ''}${b.locks.length ? ` While it shows, ${list(b.locks)} ${b.locks.length === 1 ? 'is' : 'are'} greyed out.` : ''}</Callout>`,
      '',
    );
  }
  onScreen.push(...figure(place, 'list.png'));
  const inCard = new Set(d.cards.flatMap((c) => (c.readouts ?? [])));
  const loose = d.readouts.filter((r) => !inCard.has(r.label));
  if (loose.length) {
    onScreen.push(
      `It reports ${list(loose.map((r) => r.unit ? `${r.label} (${r.unit})` : r.label))}.`,
      '',
      'Those are the device’s own figures. They are deliberately not written down here — they change on every read.',
      '',
    );
  }
  if (d.switches.length) {
    onScreen.push(
      `${d.switches.length} setting${d.switches.length === 1 ? '' : 's'} can be turned on or off directly on the screen, without opening a form: ${list(d.switches)}.`,
      '',
    );
  }
  // Lists that sit in a card with its own add-edit-delete section are
  // described there, under the card's name; only the others are listed here.
  const describedWithCard = new Set(perCard.map((x) => x.card.title));
  for (const t of d.tables) {
    if (t.card && describedWithCard.has(t.card)) continue;
    onScreen.push(
      t.dynamic
        ? `The table has **one row per ${cell(t.rowsPer ?? 'entry')}** and **one column per ${cell(t.dynamic)}** the router reports, with ${list(t.columns)} as the corner heading. The rows and columns are named after your own configuration, so they differ from device to device.`
        : `${t.card && d.tables.length > 1 ? `**${cell(t.card)}** shows` : 'The list shows'} ${list(t.columns)}.`,
      '',
    );
    if (t.empty) {
      // The console's own strings already end in a full stop about half the
      // time; appending one gave the sentence two.
      const stop = /[.!?]$/.test(t.emptyHint ?? t.empty ?? '') ? '' : '.';
      onScreen.push(
        `With nothing configured it reads *${cell(t.empty)}*${t.emptyHint ? ` — *${cell(t.emptyHint)}*` : ''}${stop}`,
        '',
      );
    }
  }
  if (d.cell && d.tables.some((t) => t.dynamic)) {
    const figs = d.cell.figures;
    onScreen.push(
      `Each cell is one pair${d.cell.badge ? `: a **${cell(d.cell.badge)}** badge on top` : ''}, and under it ${figs.map((x) => `**${cell(x)}**`).join(' / ')}, in that order.`,
      '',
      ...(d.cell.badge
        ? [
            `**N/A** means the router returned no ${cell(d.cell.badge)} for that pair: the pair does not currently qualify for any tier. The figures under it are still the router’s latest measurement, so a high loss under N/A explains the N/A. A figure the router did not report at all prints as 0, so \`0ms\` does not mean a perfect path.`,
            '',
          ]
        : []),
    );
  }
  if (d.legend.length) {
    onScreen.push(
      'The colour of each badge is explained by the legend under the table:',
      '',
      ...d.legend.map((l) => `- ${cell(l)}`),
      '',
    );
  }
  if (d.refreshMs) {
    onScreen.push(
      `The screen re-reads the router ${seconds(d.refreshMs)} on its own, so the figures move without you reloading the page. They are still the router's own readings, not the controller's.`,
      '',
    );
  }
  // A state the whole screen can be in, said before its contents: on four of
  // Instashield DNS's five tabs this is all a reader will see until the
  // service is switched on.
  for (const st of d.screenStates) {
    onScreen.push(
      `<Callout type="warn">There is a state where none of the above is on screen: instead it reads **${cell(st.title)}**${
        st.note ? ` — ${cell(st.note.replace(/[.\u2026]\s*$/, ''))}` : ''
      }${st.action ? `, with **${cell(st.action)}** to get there` : ''}.</Callout>`,
      '',
    );
  }

  if (onScreen.length) {
    // Notices first: they qualify everything under them. Antivirus's Profiles
    // tab says the feature is not wired up yet, which a reader needs before
    // the field table, not after it.
    L.push('## What is on this screen', '', ...noticeLines(d.notices), ...onScreen);
  }

  if (sla) L.push(...slaHealthSection(sla));

  // ---- the fields
  if (d.forms.length) {
    L.push('## Every field', '');
    if (d.forms.length === 1) {
      const f = d.forms[0];
      L.push(
        f.inline
          ? 'These sit on the screen itself, not in a drawer: there is nothing to add or delete here, only values to change and save.'
          : `Opened from the row's **Edit**, or from the button that adds one. The form calls itself **${cell(f.title ?? f.saveLabel ?? 'the form')}**.`,
        '',
        ...formSection(f, '', false, notesFor(notes, f)),
      );
    } else {
      L.push(
        `This screen has ${d.forms.length} forms. Each one is below, under the name it gives itself${perCard.length ? ', with the section it is opened from' : ''}.`,
        '',
        '<Accordions>',
        '',
      );
      for (const f of d.forms) {
        const home = d.cards.find((c) => c.holdsSettings)?.title;
        const name = f.inline
          ? f.instant || !home
            ? formName(f)
            : `${home} — saved with ${f.saveLabel ?? 'Save'}`
          : `${formName(f)}${f.card ? ` — from ${f.card}` : ''}`;
        L.push(...formSection(f, name, true, notesFor(notes, f)));
      }
      L.push('</Accordions>', '');
    }
    L.push(...figure(place, 'settings.png'));
    // Only where something IS required — on a screen of optional settings the
    // note explained a column that says "—" all the way down.
    if (d.forms.some((f) => f.fields.some((x) => x.required))) {
      const refusals = [...new Set(d.forms.map(refusalSentence).filter(Boolean))];
      L.push(
        `<Callout type="info">A field marked **Yes** is refused empty. One marked **When …** is refused empty only in that case. Every message in **Checked on save** is shown under its field when the save is refused, word for word as it appears here. A range in **Accepts** is only enforced where **Checked on save** says so; otherwise the value is sent as typed and the router has the final say. ${refusals.length === 1 ? refusals[0] : ''}</Callout>`,
        '',
      );
    }
  }

  // ---- saving a settings screen
  const onlyInline = d.forms.length === 1 && d.forms[0].inline && !d.rowActions.length;
  const settings = d.forms.find((f) => f.inline && !f.instant);
  if (settings && (onlyInline || perCard.length)) {
    const toast = settings.savedToast?.add;
    L.push(
      onlyInline ? '## Saving it' : `## Saving ${d.cards.find((c) => c.holdsSettings)?.title ?? 'the settings'}`,
      '',
      `Change what you need and press **${cell(settings.saveLabel ?? 'Save')}**. It is one save for the whole ${onlyInline ? 'screen' : 'section'} — there is no per-field commit, and nothing is written until you press it.`,
      '',
      ...(toast ? [`A pop-up confirms it: *${cell(toast)}*.`, ''] : []),
      ...(refusalSentence(settings) ? [refusalSentence(settings), ''] : []),
      'A value the form refuses is marked under the field it belongs to; the rest of the screen is left as you typed it rather than reset.',
      '',
    );
  }

  // ---- add, edit, delete
  if (perCard.length > 1) {
    L.push('## Adding, editing and deleting', '');
    L.push(
      `Each list has its own **Add** button, drawer and row menu. They work the same way; what differs is below, one tab per list.`,
      '',
      '<Tabs items={' + JSON.stringify(perCard.map((x) => x.card.title)) + '}>',
      '',
    );
    for (const { card, form } of perCard) {
      L.push(`<Tab value=${JSON.stringify(card.title)}>`, '');
      L.push(...crudSteps(d, card, form, notes, place, perCard.length));
      L.push('</Tab>', '');
    }
    L.push('</Tabs>', '');
    if (writes && stages) {
      L.push(
        '<Callout type="warn">None of this has reached the device yet. Every add, change and delete is staged — see below.</Callout>',
        '',
      );
    }
  } else if (!perCard.length && (d.launchers?.filter((l) => l.form).length ?? 0) > 1) {
    // Several buttons at the top, each opening its own drawer — Interfaces'
    // "Create VLAN device" and "Configure logical interface". One tab each,
    // so no button is described as opening another one's drawer.
    const ls = d.launchers.filter((l) => l.form);
    L.push('## Adding', '', `The buttons at the top of the screen each open their own drawer: ${list(ls.map((l) => l.label))}.`, '');
    L.push('<Tabs items={' + JSON.stringify(ls.map((l) => l.label)) + '}>', '');
    for (const l of ls) {
      const form = d.forms.find((f) => f.title === l.form && !f.inline);
      const card: CpeCard = { title: l.label, addLabel: l.label, kind: slug(l.label), ...(form?.title ? { form: form.title } : {}) };
      L.push(`<Tab value=${JSON.stringify(l.label)}>`, '', ...crudSteps(d, card, form, notes, place, ls.length, true), '</Tab>', '');
    }
    L.push('</Tabs>', '');
  } else if (!d.shell && !onlyInline && (d.rowActions.length || d.addLabel)) {
    const form = perCard[0]?.form ?? d.forms.find((f) => !f.inline);
    L.push('## Adding, editing and deleting', '');
    L.push(...crudSteps(d, perCard[0]?.card, form, notes, place, 1));
    if (writes && stages) {
      L.push(
        '<Callout type="warn">None of the three has reached the device yet. Every one of them is staged — see below.</Callout>',
        '',
      );
    }
  }

  // ---- dialogs no row menu owns
  //
  // Interfaces asks before Unconfigure and Delete from a per-device menu the
  // kit's RowActions does not describe, so the steps above cannot place them.
  // They are still the console's own words, so they are listed as they are.
  if (!d.shell && !d.rowActions.length && d.confirms.some((c) => c.removes) && !perCard.length) {
    L.push(
      '## What it asks before removing anything',
      '',
      '| Dialog | What it says | Button |',
      '| --- | --- | --- |',
      ...d.confirms.filter((c) => c.removes).map(
        (c) => `| ${cell(c.titles?.['*'] ?? Object.values(c.titles ?? {})[0] ?? '—')} | *${cell(c.message)}* | **${cell(c.confirmLabel)}** |`,
      ),
      '',
      ...figure(place, 'delete.png'),
    );
  }
  for (const x of notes?.sections ?? []) {
    L.push(`## ${x.title}`, '', ...x.body.flatMap((b) => [b, '']));
  }

  // ---- the thing every writable screen has to say
  //
  // Except the ones that do not write UCI. SLA Settings stores on the
  // controller — its own hints say "not pushed to this device yet" — and it
  // names no RPCD methods at all, so telling its reader to press Apply would
  // send them looking for a bar that never appears.
  if (writes && !stages && apply?.banner && d.services.length) {
    // The console makes no staging claim for this service, so neither does
    // the handbook — but the bar still appears if anything was left staged,
    // and that is the one thing worth checking.
    L.push(
      '## After saving',
      '',
      `The console does not say that a save on this screen waits for Apply. For ${d.services.map((sv) => `\`${sv}\``).join(' and ')}, its message after a save says only what was saved. If the router does leave anything staged, the bar **${cell(apply.banner)}** appears by itself${apply.pollMs ? ` within about ${Math.round(apply.pollMs / 1000)} seconds` : ''}. Press **${cell(apply.apply ?? 'Apply changes')}** when it does. If no bar appears, nothing is waiting to be applied.`,
      '',
    );
  }
  if (writes && stages && apply?.banner) {
    L.push(
      '## Saving is not applying',
      '',
      `Saving here writes the change into the router's UCI configuration and stops. The device keeps running what it was running. A bar appears saying **${cell(apply.banner)}** — *${cell(apply.hint ?? '')}*`,
      '',
      `Press **${cell(apply.apply ?? 'Apply changes')}** to commit it, or **${cell(apply.revert ?? 'Revert')}** to throw the staged edits away.`,
      '',
      ...figure(place, 'applied.png'),
      `<Callout type="warn">A screen can say it saved while the device is still running the old configuration. That is what the bar is for, and it is the one thing to check before walking away from this page. It polls${apply.pollMs ? ` ${seconds(apply.pollMs)}` : ''}, so it can take a moment to appear after a save.</Callout>`,
      '',
      ...(apply.raced
        ? [
            `If someone else committed first you get *${cell(apply.raced)}* — your change went out with theirs.`,
            '',
          ]
        : []),
      'A failed commit deliberately leaves the changes staged rather than discarding them, so it can be retried once the device is reachable.',
      '',
    );
  }

  // ---- a task done end to end, with values
  if (notes?.walkthrough) {
    const w = notes.walkthrough;
    L.push(`## ${w.title}`, '', w.intro, '', '<Steps>', '');
    for (const st of w.steps) {
      L.push('<Step>', '', `### ${st.title}`, '', ...st.body.flatMap((b) => [b, '']), '</Step>', '');
    }
    L.push('<Step>', '', '### Check that it worked', '', ...w.verify.flatMap((v) => [`- ${v}`]), '', '</Step>', '', '</Steps>', '');
  }

  // ---- when it does not work
  const trouble: string[] = [];
  if (notes?.trouble?.length) {
    trouble.push(
      '| What you see | Why | What to do |',
      '| --- | --- | --- |',
      ...notes.trouble.map(([a, b, c]) => `| ${cell(a)} | ${cell(b)} | ${cell(c)} |`),
      '',
    );
  }
  if (d.warnings.length) {
    trouble.push(
      '| What you see | What it means |',
      '| --- | --- |',
      ...d.warnings.map((w) => {
        const n = d.warningNotes[w];
        return n && !n.retry
          ? `| ${cell(w)} | Not a passing fault, so there is no **Retry**.${n.message ? ` ${cell(n.message)}` : ''} |`
          : `| ${cell(w)} | The read failed. The banner carries the router's own reason and a **Retry**. |`;
      }),
      ...[...new Set(d.forms.map((f) => f.shownWhen).filter(Boolean))].map(
        (c) => `| Only part of the screen is showing | The rest is hidden until ${c}. |`,
      ),
      `| The screen is empty | The router answered, with nothing configured. |`,
      `| Nothing loads at all | The device is unreachable. Everything here is a live call to it — unlike the other tabs, there is no stored copy to fall back on. |`,
      '',
    );
  }
  if (trouble.length) L.push('## When it does not work', '', ...trouble, ...figure(place, 'unavailable.png'));

  return L;
}

/**
 * Add, change and remove for one list: the button, the drawer, the example,
 * what pops up afterwards, and the delete dialog word for word.
 */
function crudSteps(
  d: CpePageDetail,
  card: CpeCard | undefined,
  form: Form | undefined,
  notes: CpeScreenNotes | undefined,
  place: ShotPlace | undefined,
  lists: number,
  addOnly = false,
  /** The caller has already printed the list's columns and empty text. */
  listShown = false,
): string[] {
  // Each list gets its own tab, and each tab its own steps. The headings are
  // the same four words every time, so on a screen with two lists the page
  // outline listed "Add one / Change one / Remove one" twice with nothing to
  // say which list either set belonged to — and only one tab is on screen to
  // disambiguate them. Named where there is more than one.
  const of = lists > 1 && card ? ` — ${card.title}` : '';
  const L: string[] = [];
  const addLabel = card?.addLabel ?? d.addLabel;
  const shot = lists > 1 && card?.kind ? `form-${card.kind}.png` : 'form.png';

  if (card && !listShown) {
    const t = d.tables.find((x) => x.card === card.title);
    if (t) {
      L.push(`The list shows ${list(t.columns)}.`, '');
      if (t.empty) {
        const stop = /[.!?]$/.test(t.emptyHint ?? t.empty) ? '' : '.';
        L.push(`With nothing in it, it reads *${cell(t.empty)}*${t.emptyHint ? ` — *${cell(t.emptyHint)}*` : ''}${stop}`, '');
      }
    }
    if (card.shownWhen) {
      L.push(`<Callout type="info">This list is only on screen when ${card.shownWhen}.</Callout>`, '');
    }
  }

  L.push('<Steps>', '');

  const drawerForms = d.forms.filter((f) => !f.inline);
  if (!card && drawerForms.length > 1 && drawerForms.every((f) => f.kind)) {
    // One drawer per list — RIP's Neighbour and Network. Each is its own
    // procedure with its own value to type, so each gets its own paragraph.
    L.push('<Step>', '', `### Add one${of}`, '');
    if (drawerForms[0].shownWhen) {
      L.push(`Turn on ${drawerForms[0].shownWhen.replace(/ is on$/, '')} first — until it is on, the lists below it are not shown at all.`, '');
    }
    L.push(
      `Each list has its own **${cell(d.addLabel ?? 'Add')}** button, and the drawer it opens depends on the list:`,
      '',
    );
    for (const f of drawerForms) {
      const req = f.fields.filter((x) => x.required).map((x) => x.label);
      L.push(
        `**${cell(formName(f))}** — fill in ${req.length ? list(req) : 'the fields'} and press **${cell(f.saveLabel ?? 'Save')}**.`,
        '',
        ...figure(place, `form-${slug(formName(f))}.png`),
        ...exampleRows(f, notesFor(notes, f)),
      );
    }
    L.push(
      'A value that is refused stays in the drawer with the reason under it; nothing is sent to the router until the form accepts it.',
      '',
      '</Step>',
      '',
    );
  } else if (addLabel || form) {
    // Required on every new record, and required only when another choice
    // shows them — OpenVPN's VPN network is there for Subnet only.
    const required = form?.fields.filter((x) => x.required && !x.shownWhen?.length).map((x) => x.label) ?? [];
    const requiredWhen = form?.fields.filter((x) => x.required && x.shownWhen?.length) ?? [];
    // Not marked required, but the save still refuses them in some case —
    // "Give an IP or pick an interface". "The only required field" was false
    // without these.
    const refused = (form?.fields ?? []).filter((x) => !x.required && (x.rejects?.length || x.rules?.length));
    L.push(
      '<Step>',
      '',
      `### Add one${of}`,
      '',
      addLabel
        ? `Press **${cell(addLabel)}**${card && !addOnly ? ` in the **${cell(card.title)}** header` : addOnly ? ' at the top of the screen' : ''}. A drawer opens${form?.title ? ` titled **${cell(form.title)}**` : ''}, with the starting values from the field table already filled in.`
        : 'Open the form from the button above the list.',
      '',
      ...figure(place, shot),
      form
        ? `Fill in ${required.length ? list(required) : 'the fields you need'}${required.length && !refused.length && !requiredWhen.length ? ` — ${required.length === 1 ? 'it is' : 'they are'} the only required ${required.length === 1 ? 'field' : 'fields'}` : ''}${
            requiredWhen.length
              ? `, and ${requiredWhen.map((x) => `**${cell(x.label)}** when ${x.shownWhen!.join(' and ')}`).join(', ')}`
              : ''
          }${refused.length ? `. The save also checks ${refused.map((x) => `**${cell(x.label)}** (*${cell([...(x.rejects ?? []), ...(x.rules ?? [])][0])}*)`).join(', ')}` : ''}. Then press **${cell(form.saveLabel ?? 'Save')}**.`
        : '',
      '',
      ...(form ? exampleRows(form, notesFor(notes, form)) : []),
      ...(form?.savedToast?.add
        ? [`The drawer closes, the new row appears in the list, and a pop-up says *${cell(form.savedToast.add)}*.`, '']
        : []),
      ...(form && refusalSentence(form) ? [refusalSentence(form), ''] : []),
      '</Step>',
      '',
    );
  }

  if (!addOnly && d.rowActions.includes('Edit')) {
    const locked = form?.fields.filter((x) => x.lockedOnEdit) ?? [];
    L.push(
      '<Step>',
      '',
      `### Change one${of}`,
      '',
      `Open the row’s menu and choose **Edit**. The same drawer opens on the existing record${form?.editTitle ? `, titled **${cell(form.editTitle)}**` : ''}. Change what you need and press **${cell(form?.editSaveLabel ?? form?.saveLabel ?? 'Save')}**.`,
      '',
      ...(locked.length
        ? [
            `${list(locked.map((x) => x.label))} ${locked.length === 1 ? 'is' : 'are'} greyed out — settable when adding and fixed afterwards, because it is the record’s identity on the router. To change it, delete this one and add another.`,
            '',
          ]
        : []),
      ...(form?.savedToast?.edit ? [`A pop-up says *${cell(form.savedToast.edit)}*.`, ''] : []),
      '</Step>',
      '',
    );
  }

  const removals = d.confirms.filter((c) => c.removes);
  const del = removals.find((c) => !c.kind || c.kind === card?.kind) ?? removals[0];
  if (!addOnly && (d.rowActions.includes('Delete') || del)) {
    const title = del?.titles ? (del.titles[card?.kind ?? ''] ?? del.titles['*']) : undefined;
    L.push(
      '<Step>',
      '',
      `### Remove one${of}`,
      '',
      !card && d.confirms.length > 1 && d.confirms.every((c) => c.kind)
        ? [
            `**Delete** at the end of the row asks first, in words that depend on the list. Confirm with **${cell(d.confirms[0].confirmLabel)}**.`,
            '',
            '| List | What the dialog says |',
            '| --- | --- |',
            ...d.confirms.map((c) => `| ${cell(c.kind!.charAt(0).toUpperCase() + c.kind!.slice(1))} | *${cell(c.message)}* |`),
          ].join('\n')
        : del
        ? `Open the row’s menu and choose **Delete**. A dialog asks${title ? ` **${cell(title)}**` : ' first'}: *${cell(del.message)}* Confirm with **${cell(del.confirmLabel)}**, or cancel to keep it.`
        : 'Open the row’s menu and choose **Delete**. It asks for confirmation first.',
      '',
      ...figure(place, 'delete.png'),
      '</Step>',
      '',
    );
  }

  const rest = d.rowActions.filter((a) => a !== 'Edit' && a !== 'Delete');
  if (!addOnly && rest.length) {
    L.push(
      '<Step>',
      '',
      `### The other row actions${of}`,
      '',
      `${list(rest)}.`,
      '',
      d.rowActions.includes('Reorder')
        ? 'Order is not cosmetic: the router evaluates these top to bottom, so moving a row changes which one matches first.'
        : '',
      '',
      '</Step>',
      '',
    );
  }

  L.push('</Steps>', '');
  return L;
}

/**
 * A note keyed to a field or form this screen no longer has. Reported, not
 * dropped: a renamed field would otherwise quietly lose its explanation.
 */
function reportStaleNotes(file: string, notes: CpeScreenNotes, d: CpePageDetail): void {
  for (const [formKey, byField] of Object.entries(notes.fields ?? {})) {
    // A sub-tab's form (`Tab › Form`) is checked by the sub-page reader's
    // output, which this function does not see.
    if (formKey.includes(' \u203a ')) continue;
    const form = d.forms.find((f) => (f.inline ? 'Settings' : f.title) === formKey);
    if (!form) {
      console.warn(`  cpe-field-notes: ${file} has notes for a form "${formKey}" the screen no longer has`);
      continue;
    }
    for (const label of Object.keys(byField)) {
      if (!form.fields.some((x) => x.label === label)) {
        console.warn(`  cpe-field-notes: ${file} › ${formKey} has a note for "${label}", which is not on the form`);
      }
    }
  }
}

/**
 * The SLA Health Dashboard reads as four numbers and a colour until someone
 * says what the colour means. This is that section.
 */
function slaHealthSection(h: CpeSlaHealthFacts): string[] {
  const L = ['## Reading a WAN member card', ''];

  if (h.badges.length) {
    L.push(
      `Each card carries one badge: ${list(h.badges)}. **${cell(h.badges[h.badges.length - 1] ?? 'Unknown')}** means the router has not classified the link yet, which is not the same as a failure.`,
      '',
    );
  }
  if (h.breach.length) {
    L.push(
      `A card reads as violated when any one of these is true: ${h.breach.join(', ')}. That test is the console\u2019s, deliberately \u2014 the router keeps an SLA verdict of its own against its configured thresholds, and when the numbers on screen say the link is bad, the badge says so too rather than the two disagreeing.`,
      '',
    );
  }
  if (h.mosBands.length) {
    L.push(
      '**MOS** is a voice-quality score from 1 to 5, derived from jitter and loss when the router does not report one itself. The word under the figure is this:',
      '',
      '| Word | MOS |',
      '| --- | --- |',
      ...h.mosBands.map(([w, r]) => `| ${cell(w)} | ${cell(r)} |`),
      '',
    );
  }
  if (h.minSamples || h.windowSeconds) {
    L.push(
      `The **RTT trend** and **SLA timeline** appear once the page has collected ${h.minSamples ?? 3} samples \u2014 below that a trace says nothing, so the card shows the figures alone. The trace holds about ${Math.round((h.windowSeconds ?? 300) / 60)} minutes and is kept in the browser only: leaving the page starts it again, exactly as the router\u2019s own sparkline does. The heading says how much history it is actually showing.`,
      '',
      'The trend is scaled to each member\u2019s own range, not a shared axis, so a link sitting at a steady low latency still draws a readable line rather than a flat one.',
      '',
      '**Weight** in the footer is the member\u2019s share of the load; **Carrier up / Carrier down** is the physical link, which can be up while the SLA is violated \u2014 that is the case worth recognising, because the cable is fine and the path is not.',
      '',
    );
  }
  return L;
}

/** The shared explanation, for the CPE index. */
export function cpeOverviewGuide(apply: CpeApplyFacts | undefined): string[] {
  const L = [
    '## How every screen here works',
    '',
    'These screens are not like the rest of the handbook. Everything else describes the',
    'controller’s own database; this describes the router. Three consequences, and they apply',
    'to all 45 screens:',
    '',
    '<Steps>',
    '',
    '<Step>',
    '',
    '### Every reading is a live call',
    '',
    'Opening a screen calls the router over RPCD, there and then. Nothing here is a stored copy,',
    'so an unreachable device shows nothing at all rather than a stale value — the opposite of the',
    'Status tab, which happily shows you what the device said an hour ago.',
    '',
    '</Step>',
    '',
  ];

  if (apply?.banner) {
    L.push(
      '<Step>',
      '',
      '### Some saves are not applied yet',
      '',
      `On some screens a save writes into the router’s UCI configuration and stops there: the`,
      `device carries on running its previous configuration until you press`,
      `**${cell(apply.apply ?? 'Apply changes')}** on the bar that appears: **${cell(apply.banner)}** — *${cell(apply.hint ?? '')}*`,
      '',
      `The console only says this of ${apply.stagingServices.length ? apply.stagingServices.map((sv) => `\`${sv}\``).join(', ') : 'some services'}; other services may commit`,
      'as soon as you save. Each screen’s page says which applies to it. Either way, the bar',
      'appears by itself whenever something is left staged, so it is the thing to check.',
      '',
      `**${cell(apply.revert ?? 'Revert')}** throws the staged edits away instead. A commit that fails leaves them`,
      'staged on purpose, so it can be retried rather than retyped.',
      '',
      '</Step>',
      '',
    );
  }

  L.push(
    '<Step>',
    '',
    '### This is one router',
    '',
    'Every change is to the device whose page you are on. The controller’s own sidebar carries a',
    'Policy Engine with the same seven protocol names, and that one is a fleet tool — a policy',
    'there can be scoped fleet-wide, to an organization, or to one device. Check which sidebar you',
    'are in before following a procedure.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );
  return L;
}

/**
 * A screen that is really eight screens behind a tab strip.
 *
 * Adaptive QoS is the case: its tab strip dispatches to components in two other
 * files, so the page itself has no fields and read as "it is divided into 8
 * sub-tabs" and nothing more. Each tab gets its own accordion here, because
 * eight expanded sections of tables is a page nobody scrolls.
 */
/**
 * The key a screen's notes are filed under: the component file, or
 * `file#Export` when the menu loads one named export of a file that holds
 * several — Instashield IP, Instashield DNS and DDoS share one file.
 */
export const notesKeyFor = (pg: CpePage): string | undefined =>
  pg.component ? (pg.exportName ? `${pg.component}#${pg.exportName}` : pg.component) : undefined;

export function cpeSubPagesGuide(subs: CpeSubPage[], staged: boolean, notes?: CpeScreenNotes): string[] {
  if (!subs.length) return [];

  // A form the SHELL renders — the service toggle above the tab strip — is
  // read into every tab, because every tab's block contains it. Repeating it
  // eight times said the same thing eight times and made each tab look like it
  // had a form it does not. Lifted out and stated once.
  const sig = (f: CpePageDetail['forms'][number]) =>
    `${f.title ?? f.saveLabel}\u241f${f.fields.map((x) => x.label).join('\u241f')}`;
  const shared = subs.length > 1
    ? subs[0].detail.forms.filter((f) => subs.every((sp) => sp.detail.forms.some((g) => sig(g) === sig(f))))
    : [];
  const sharedSigs = new Set(shared.map(sig));

  const L = [
    '## The sub-tabs',
    '',
    `The tab strip carries ${subs.length}, and they are separate screens rather than views of one: each has its own list, its own form and its own save. They are below, in the order the strip shows them.`,
    '',
  ];

  for (const f of shared) {
    L.push(
      `Above the strip, on every tab: ${list(f.fields.map((x) => x.label))}.`,
      '',
      ...f.fields
        .filter((x) => x.hints.length)
        .map((x) => `- **${cell(x.label)}** \u2014 ${cell(x.hints.join(' '))}`),
      '',
    );
  }

  L.push('<Accordions>', '');

  for (const { label, detail: d } of subs) {
    L.push(`<Accordion title=${JSON.stringify(label)}>`, '');

    if (d.cards.length) {
      const described = d.cards.filter((c) => c.blurb);
      // Through cardPurpose, not `c.blurb` directly: this duplicated the page
      // renderer's logic and so dropped everything cardPurpose adds — the
      // states a card shows, and the buttons in its header. SSL Inspection's
      // Statistics tab said nothing about Clear Cache or Restart Proxy.
      const purposes = d.cards.map((c) => cardPurpose(c, d));
      if (purposes.some((x) => x && x !== '—')) {
        L.push('| Section | What it is for |', '| --- | --- |');
        for (const [i, c] of d.cards.entries()) {
          L.push(`| ${cell(c.title)} | ${purposes[i] ? cell(purposes[i]) : '—'} |`);
        }
        L.push('');
      } else {
        L.push(`Sections: ${list(d.cards.map((c) => c.title))}.`, '');
      }
    }

    for (const t of d.tables) {
      L.push(`The list shows ${list(t.columns)}.`, '');
      if (t.empty) {
        const stop = /[.!?]$/.test(t.emptyHint ?? t.empty) ? '' : '.';
        L.push(
          `With nothing configured it reads *${cell(t.empty)}*${t.emptyHint ? ` — *${cell(t.emptyHint)}*` : ''}${stop}`,
          '',
        );
      }
    }

    if (d.readouts.length) {
      L.push(
        `It reports ${list(d.readouts.map((r) => (r.unit ? `${r.label} (${r.unit})` : r.label)))}.`,
        '',
      );
    }

    // A tab whose whole content is a state — DPI's Policy tab is one line
    // saying the feature needs the SD-WAN Controller. Rendered here as well as
    // at page level, because a sub-tab's state belongs to that tab.
    L.push(...noticeLines(d.notices));

    for (const st of d.screenStates) {
      L.push(
        `This tab shows **${cell(st.title)}**${
          st.note ? ` — ${cell(st.note.replace(/[.\u2026]\s*$/, ''))}` : ''
        }${st.action ? `, with **${cell(st.action)}**` : ''}.`,
        '',
      );
    }

    for (const [i, f] of d.forms.entries()) {
      if (sharedSigs.has(sig(f))) continue;
      const name = f.title ?? (f.inline ? 'Settings on this tab' : f.saveLabel ?? 'Form');
      // The button that OPENS the form, said once, here — stating it again
      // after the table read as a stutter when the two labels match, which on
      // half these tabs they do.
      const opener = i === 0 && d.addLabel && !f.inline
        ? [`Opened with **${cell(d.addLabel)}**.`, '']
        : [];
      // Notes for a tab's form are filed as `Tab › Form title` (`Tab ›
      // Settings` for its inline settings).
      const tabNotes =
        notes?.fields?.[`${label} \u203a ${f.inline ? 'Settings' : f.title ?? ''}`] ??
        // Notes written before the screen was split into tabs keep applying.
        notes?.fields?.[f.inline ? 'Settings' : f.title ?? ''] ??
        {};
      L.push(`**${cell(name)}**`, '', ...opener, ...formSection(f, name, false, tabNotes));
      // formSection leaves the commit line off an inline form, because a page
      // whose whole content is settings gets a "Saving it" section instead.
      // Inside a sub-tab there is no such section, so the Save button on the
      // DNS tab went unnamed.
      if (f.inline) L.push(`Save it with **${cell(f.saveLabel ?? 'Save')}**.`, '');
    }
    // A tab with a drawer and an add button or row menu gets the same
    // add / change / remove walkthrough a whole page does — NAT's two lists
    // lost their steps and examples when the screen was split into tabs.
    const drawerForms = d.forms.filter((f) => !f.inline);
    const pairs = cardForms(d).length
      ? cardForms(d)
      : drawerForms.length && (d.addLabel || d.rowActions.length)
        ? [{ card: undefined as CpeCard | undefined, form: drawerForms[0] }]
        : [];
    if (pairs.length) {
      for (const { card, form } of pairs) {
        if (pairs.length > 1 && card) L.push(`**${cell(card.title)}**`, '');
        L.push(...crudSteps(d, card, form, notes, undefined, pairs.length, false, true));
      }
    } else {
      if (d.rowActions.length) {
        L.push(`Each row offers ${list(d.rowActions)}.`, '');
      }
      const del = d.confirms.find((c) => c.removes);
      if (del) {
        L.push(
          `Deleting asks first: *${cell(del.message)}* Confirm with **${cell(del.confirmLabel)}**.`,
          '',
        );
      }
    }
    if (d.warnings.length) {
      // The console's own warning strings already end in a full stop.
      const joined = d.warnings.map((w) => cell(w)).join('* / *');
      L.push(`If the read fails it says *${joined}*${/[.!?]$/.test(d.warnings[d.warnings.length - 1]) ? '' : '.'}`, '');
    }

    L.push('</Accordion>', '');
  }

  L.push('</Accordions>', '');
  if (staged) {
    L.push(
      '<Callout type="warn">Every save above is staged, whichever tab it came from — see **Saving is not applying** below.</Callout>',
      '',
    );
  }
  return L;
}
