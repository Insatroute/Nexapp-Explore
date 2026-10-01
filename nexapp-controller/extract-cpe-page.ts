/**
 * What one CPE screen actually puts in front of an operator.
 *
 * `extract-cpe.ts` reads the CPE menu — which screens exist, what they mirror,
 * which RPCD methods they call. That is provenance, and it is not what someone
 * standing in front of the screen needs. This reads the screen itself: the
 * sections it is divided into, the columns of its tables, the fields of its
 * forms, what each field is for, and what it says when it cannot reach the
 * router.
 *
 * It works generically across all 45 screens because they are all built from
 * one kit (`components/cpe/cpeKit.jsx`) — `Card`, `CpeTable`, `EntityDrawer`,
 * `Field`, `RowActions`, `Warn`. Documenting them one at a time would mean 45
 * hand-written pages that go stale separately; reading the kit means they are
 * all as current as the last build.
 *
 * Nothing here records a VALUE. Rows, readings and statuses come from the
 * router at check-in, and writing one down would freeze a snapshot.
 */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FE } from './config.ts';
import { clean, quotedStrings } from './read-form-fields.ts';

export interface CpeCard {
  title: string;
  /** The card's own one-line explanation of itself, when it has one. */
  blurb?: string;
  /**
   * When the card is on screen at all — "**BGP Service** is on". BGP hides its
   * four lists until the service is switched on, and a reader looking for an
   * **Add Neighbor** button on a screen that has not got one yet needs to be
   * told why.
   */
  shownWhen?: string;
  /**
   * The states a card with no list shows instead of rows, each with the line
   * under it — "No hotspot configured / Configure the WiFi hotspot in the
   * Settings tab to get started."
   *
   * A status card is the whole content of its tab. Documented only by its own
   * one-line blurb, the Hotspot Status tab said nothing about what it actually
   * puts on screen, or that it offers a way through to Settings.
   */
  states?: Array<{ title: string; note?: string; action?: string }>;
  /**
   * Other buttons in the card's header — Clear Cache, Restart Proxy,
   * Configure, Update Blocklists.
   *
   * `addLabel` takes the one that opens a form; these act on the service or
   * the list as a whole and were documented nowhere, so a reader had no idea
   * the screen could restart its proxy or refresh its feeds.
   */
  actions?: string[];
  /** The button in the card's header that starts a new record. */
  addLabel?: string;
  /** Which of the screen's drawers that button opens: `setDrawer({ kind: 'neighbor' })`. */
  kind?: string;
  /** The title of the form that button opens, when it can be matched. */
  form?: string;
  /** The columns of the list inside this card, when it holds one. */
  columns?: string[];
  /** Figures printed rather than asked for: `State`, `Established Peers`. */
  readouts?: string[];
  /** True when the screen's own settings — its inline form — sit in this card. */
  holdsSettings?: boolean;
}
export interface CpeField {
  label: string;
  required: boolean;
  hints: string[];
  placeholder?: string;
  /** The choices, when the control is a select and they are fixed. */
  options?: string[];
  /**
   * Set when the choices come from the router rather than from the code —
   * `options={monitors.map(…)}`. There is no list to write down, only where
   * the list is filled from.
   */
  optionsAreLive?: boolean;
  /** The accepted range of a number, from the input or from its clamp. */
  min?: string;
  max?: string;
  /** `ms`, `check(s)` — printed beside the control. */
  unit?: string;
  /** What a new record starts at. */
  fallback?: string;
  /** What the form says when it refuses the value. */
  rejects?: string[];
  /**
   * A field that holds a LIST rather than one value, with the console's own
   * wording for the button that adds a row — "Add DNS server".
   *
   * Fifteen screens have one. Documented as an ordinary text box, a reader
   * has no idea they can give more than one, or how.
   */
  repeatable?: string;
  /** Settable when adding, fixed when editing — the record's identity. */
  lockedOnEdit?: boolean;
  /**
   * Greyed out while a banner on the screen says something else owns the
   * value — BGP's Router ID and AS under an SD-WAN topology. Names the banner.
   */
  lockedWhen?: string;
  /** The form-state key the control writes — `f.interval` → `interval`. */
  key?: string;
  /**
   * `{ value: 'udp-echo', label: 'UDP echo' }` as value → word, so a
   * condition written against the stored value can be printed as the choice
   * the operator actually sees.
   */
  valueLabels?: Record<string, string>;
  /**
   * Every check the save runs on this field, in the console's own words —
   * from the shared `validate(f, { … })` rule table as well as the
   * hand-written `found.x = '…'` lines. Required-ness alone told a reader
   * nothing about a CIDR field that refuses `10.0.0.1`.
   */
  rules?: string[];
  /**
   * When the field is on the form at all: "**Protocol** is `UDP echo`". A
   * field that only appears for one protocol, documented as always present,
   * sends the reader looking for a control that is not there.
   */
  shownWhen?: string[];
  /** When the control is present but greyed out until something else is set. */
  editableWhen?: string;
  /** When `required={…}` is an expression: the case in which it applies. */
  requiredWhen?: string;
  /**
   * The save pulls an out-of-range value to the nearest limit rather than
   * refusing it — so typing 20000 into a 0–10000 box saves 10000, silently.
   */
  clamped?: boolean;
  /**
   * The band the field sits in on screen — "Good — Full LB Weight". Without
   * it, a settings page repeats "RTT (ms)" four times with nothing to say
   * which is which.
   */
  group?: string;
}
export interface CpeForm {
  /**
   * A wizard's steps, when the form is completed in stages rather than one
   * screen. IPsec's tunnel form is Connection → Authentication → Encryption
   * with a **Next** button; documented flat, a reader fills in twenty-one
   * fields looking for a save button that is two steps away.
   */
  steps?: string[];
  /**
   * The line the form opens with, before its first field — "Creating the
   * server also builds its certificate authority and server certificate.
   * That takes a few seconds." It explains what saving will DO, which no
   * field can.
   */
  lead?: string;
  /** Band name -> what the form says that band is for. */
  groupNotes?: Record<string, string>;
  /**
   * Standing notices the FORM prints, as opposed to the screen — "Bypasses
   * are often required, not just permitted." sits inside the Add bypass
   * drawer. Kept here rather than dropped when they are excluded from the
   * page's own notices.
   */
  notices?: Array<{ title: string; text: string }>;
  /** What the drawer calls itself, e.g. "Add Path Monitor". */
  title?: string;
  /**
   * One drawer can serve two lists — RIP's opens as "Add neighbour" or "Add
   * network" and takes an IP in one case and a CIDR in the other. Each case is
   * documented as its own form, and this names the list it belongs to.
   */
  kind?: string;
  /** When the whole form, or the list it is opened from, is on screen at all. */
  shownWhen?: string;
  /**
   * Switches that save the moment they are flipped. There is no Save button
   * to press, and telling a reader to find one sends them hunting.
   */
  instant?: boolean;
  /**
   * True when the fields are on the page rather than in a drawer — a settings
   * screen, which has no add-edit-delete cycle and one Save for the lot.
   */
  inline?: boolean;
  /** The button that commits it. */
  saveLabel?: string;
  /**
   * The same drawer opened from a row's **Edit**: its title and its button.
   * Every drawer here is written once for both, and the edit half says
   * "Edit neighbor: hub1" and "Save changes" where the add half says "Add BGP
   * neighbor" and "Add neighbor".
   */
  editTitle?: string;
  editSaveLabel?: string;
  /** The confirmation that pops up after a save, for a new and an edited record. */
  savedToast?: { add?: string; edit?: string };
  /**
   * What the save says when the ROUTER refuses it — the prefix in front of the
   * router's own reason, `Failed: …`. Most screens report it this way rather
   * than under a field, and telling a reader to look under the field sent them
   * to the wrong place.
   */
  failToast?: string;
  /** True when a router refusal is mapped back onto the field it names. */
  routerErrorsOnField?: boolean;
  /** For a settings form that is one sub-tab's content: that tab's label. */
  subTab?: string;
  /** The card whose button opens this drawer. */
  card?: string;
  fields: CpeField[];
}
export interface CpeTableSpec {
  columns: string[];
  /** The card the list sits in, so the guide can put it under its own heading. */
  card?: string;
  /**
   * Set when the header is built from router data — `monitors.map((mon) =>
   * <th>{mon}</th>)` — so there is one column per record rather than a fixed
   * name. The value is what each column stands for ("monitor").
   */
  dynamic?: string;
  /** With `dynamic`: what each row stands for ("member"), from the body's own loop. */
  rowsPer?: string;
  empty?: string;
  emptyHint?: string;
}
export interface CpeConfirm {
  /** What the dialog explains before it acts. */
  message: string;
  /**
   * The dialog's heading, per list when one dialog serves several —
   * `Delete ${NOUN[kind]} "${row.name}"?` becomes `Delete neighbor "‹name›"?`
   * under `neighbor`. `*` holds the heading when it does not vary.
   */
  titles?: Record<string, string>;
  /**
   * True when the dialog removes something — Delete, Remove, Drop,
   * Unconfigure. Adaptive QoS also asks before **Apply profile**, and a guide
   * that took every dialog for a delete wrote "Deleting asks first" over it.
   */
  removes?: boolean;
  /** Which list it belongs to, when one dialog words itself per list. */
  kind?: string;
  /** The button that goes through with it. */
  confirmLabel: string;
}
export interface CpeReadout {
  label: string;
  /** `ms`, `%` — the unit printed beside the figure. */
  unit?: string;
}
/** One sub-tab of a screen that is really eight screens behind a tab strip. */
export interface CpeSubPage {
  label: string;
  detail: CpePageDetail;
}

export interface CpePageDetail {
  /** Milliseconds between automatic re-reads, when the screen polls. */
  refreshMs?: number;
  /** Sub-tabs inside the screen, which the CPE menu does not list. */
  subTabs: string[];
  /**
   * Tabs on the strip with no content anywhere in the screen — DDoS lists
   * "Address Scope & Service Filter" and "DDoS Alert", and opening either
   * shows an empty page. Said so, rather than left for the reader to find.
   */
  emptyTabs?: string[];
  /**
   * True for the frame of a screen whose content is all in inline tabs: its
   * add buttons, rows and dialogs belong to the tabs, which are documented
   * one by one, so the frame itself describes none of them.
   */
  shell?: boolean;
  cards: CpeCard[];
  tables: CpeTableSpec[];
  forms: CpeForm[];
  /** Per-row verbs the screen offers: Edit, Duplicate, Delete… */
  rowActions: string[];
  /** The button that opens an empty form, in the console's own words. */
  addLabel?: string;
  /** What a destructive action warns before doing it. */
  confirms: CpeConfirm[];
  /** What it says when a read fails. */
  warnings: string[];
  /**
   * Standing notices the screen prints in some circumstances, with the fields
   * each one locks — "BGP is managed by this device's SD-WAN topology."
   */
  banners: Array<{ title: string; text?: string; locks: string[] }>;
  /**
   * A state the whole screen shows instead of its tabs, declared once and
   * reused — "Instashield DNS is disabled / Enable it in the Settings tab".
   *
   * Not a card's state: it is a top-level const in the component, shown by
   * every tab but Settings while the service is off. Bounded to cards, the
   * card reader could not see it, and four of the five tabs documented as
   * though they were always usable.
   */
  screenStates: Array<{ title: string; note?: string; action?: string }>;
  /**
   * Standing notices a tab prints above its content — a heading and a line.
   *
   * Distinct from `banners`, which are conditional and lock fields. These are
   * always there and say something the fields cannot: Antivirus's Profiles tab
   * warns "Per-flow dispatch coming soon — every flow uses the default
   * profile", which is the difference between a feature that works and one
   * that does not yet.
   */
  notices: Array<{ title: string; text: string }>;
  /**
   * Per warning title: whether it offers **Retry**, and its own explanation.
   * A banner without Retry is a permanent condition — RIP's "not available on
   * this firmware" — and the troubleshooting table used to tell the reader to
   * retry it.
   */
  warningNotes: Record<string, { retry: boolean; message?: string }>;
  /**
   * The router services this screen reads and writes — `ns.bonding`, `rip`.
   * Whether a save waits for Apply depends on the service, not the screen.
   */
  services: string[];
  /**
   * The services the screen WRITES to (`nsbondProxy`), as opposed to reads.
   * Interfaces reads SD-WAN status from `ns.bonding` and writes `ns.devices`;
   * judging Apply by every service it touched told its reader to wait for a
   * bar that its saves never raise.
   */
  writeServices: string[];
  /**
   * The services the screen's FORMS save to — its drawers' and settings'
   * save handlers — as opposed to one-off actions. DPI's **Update All** writes
   * `ns.bonding` once; its forms write `ns.dpi`, and only the forms decide
   * whether a save waits for Apply.
   */
  formWriteServices?: string[];
  /**
   * Buttons on the page itself that open a drawer — "Create VLAN device",
   * "Configure logical interface" — each with the title of the form it
   * opens. A screen with two of them documented the first button as opening
   * the other one's drawer.
   */
  launchers: Array<{ label: string; form?: string }>;
  /**
   * Figures the screen prints rather than asks for.
   *
   * A screen with no form and no table is not empty — the SLA Health Dashboard
   * is four numbers per WAN member — and without these such a screen documents
   * as if there were nothing on it.
   */
  readouts: CpeReadout[];
  /**
   * On/off settings that sit on the screen itself rather than in a drawer.
   *
   * Most Security and Policy Engine screens are mostly these, and a screen
   * whose whole content is twelve toggles reads as empty without them.
   */
  switches: string[];
  /**
   * A colour key the screen prints under its data — `const LEGEND = [{ label:
   * 'Tier 1-2 (Good)' }, …]`. It is what makes a badge's hue mean something.
   */
  legend: string[];
  /**
   * What one cell of a grid carries, when each cell is a record of its own —
   * the Quality Matrix prints a tier badge over three figures. Without this
   * the page says there is a table and nothing about how to read a square of it.
   */
  cell?: { badge?: string; figures: string[] };
}

/** `latency_ms` → "latency (ms)", `loss_pct` → "loss (%)". */
const figureName = (k: string) =>
  k.replace(/_ms$/, ' (ms)').replace(/_pct$/, ' (%)').replace(/_/g, ' ');

/**
 * `const cell = matrix?.[mem]?.[mon] || {}` and what is read off it. The key
 * pulled into its own constant (`const tier = cell.tier`) is the badge; the
 * rest, in the order the cell prints them, are the figures under it.
 */
function cellOf(src: string): CpePageDetail['cell'] {
  const at = /\bconst\s+cell\s*=/.exec(src);
  if (!at) return undefined;
  const body = src.slice(at.index, at.index + 1500);
  const badge = /\bconst\s+(\w+)\s*=\s*cell\.(\w+)/.exec(body)?.[2];
  const figures: string[] = [];
  for (const m of body.matchAll(/\bcell\.(\w+)/g)) {
    if (m[1] !== badge && !figures.includes(m[1])) figures.push(m[1]);
  }
  return figures.length ? { ...(badge ? { badge } : {}), figures: figures.map(figureName) } : undefined;
}

/**
 * From `<` at `open`, the text of that opening tag up to its own `>`.
 *
 * Depth-aware, because a prop's value is an expression that contains both
 * braces and `>` — `render: (s) => s.name` closes the tag early on a naive
 * scan, which is the bug that produced fields documented with their
 * neighbour's help text in an earlier reader.
 */
function openingTag(src: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const prev = src[i - 1];
    if (quote) {
      if (c === quote && prev !== '\\') quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === '>' && depth === 0) return src.slice(open, i + 1);
  }
  return src.slice(open);
}

/** Every `<Name` position in the source. */
function tagsNamed(src: string, name: string): number[] {
  const out: number[] = [];
  const re = new RegExp(`<${name}\\b`, 'g');
  for (const m of src.matchAll(re)) out.push(m.index);
  return out;
}

/**
 * The attributes of one opening tag, at ITS level only.
 *
 * A prop's value can be a whole element — `action={<button title="Refresh">…}`
 * — and a regex for `title=` over the tag's text finds the button's, not the
 * card's. Every card on a page then comes back called "Refresh". So the tag is
 * walked and only depth-0 attributes are collected; the value is kept raw, as
 * either the contents of a quoted string or the text of a braced expression.
 */
interface Attr {
  /** True when the value was written as "a string" rather than {an expression}. */
  quoted: boolean;
  value: string;
}
function attrsOf(tag: string): Map<string, Attr> {
  const out = new Map<string, Attr>();
  // Past `<Name`.
  let i = /^<[A-Za-z][\w.]*/.exec(tag)?.[0].length ?? 1;

  while (i < tag.length) {
    const m = /^\s*([A-Za-z_][\w:-]*)/.exec(tag.slice(i));
    if (!m) break;
    const name = m[1];
    i += m[0].length;

    const eq = /^\s*=/.exec(tag.slice(i));
    if (!eq) {
      // A bare prop — `required`, `wide`. Presence is the whole value.
      out.set(name, { quoted: false, value: '' });
      continue;
    }
    i += eq[0].length;
    while (i < tag.length && /\s/.test(tag[i])) i++;

    const open = tag[i];
    if (open === '"' || open === "'") {
      const end = tag.indexOf(open, i + 1);
      if (end < 0) break;
      if (!out.has(name)) out.set(name, { quoted: true, value: tag.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (open === '{') {
      let depth = 0;
      let quote: string | null = null;
      let end = tag.length;
      for (let j = i; j < tag.length; j++) {
        const c = tag[j];
        const prev = tag[j - 1];
        if (quote) {
          if (c === quote && prev !== '\\') quote = null;
          continue;
        }
        if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
        if (c === '{') depth++;
        else if (c === '}' && --depth === 0) { end = j; break; }
      }
      if (!out.has(name)) out.set(name, { quoted: false, value: tag.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    break;
  }
  return out;
}

/**
 * A heading prop's value, which is as often markup as it is a string.
 *
 * `title={<span className="antispam__titleSub">Quarantine<span …>…</span></span>}`
 * renders the word "Quarantine"; reading the first quoted literal out of it
 * returns the CSS class instead, and a card called `antispam__titleSub` is
 * worse than no card at all. So markup is reduced to the words it renders,
 * and only a plain expression falls back to its literals.
 */
function heading(attrs: Map<string, Attr>, name: string): string | undefined {
  const a = attrs.get(name);
  if (!a) return undefined;
  if (a.quoted) return clean(a.value) || undefined;
  if (/^\s*</.test(a.value)) {
    // JSX. The heading is the text the wrapper holds directly; what follows it
    // is a nested span carrying a live count — "Quarantine" then "12 messages
    // held". Taking all the text made the card's name include its own tally.
    const inner = a.value.replace(/^\s*<[^>]*>/, '');
    const own = clean(plainTextOf(inner.slice(0, inner.search(/</) < 0 ? undefined : inner.search(/</))));
    return own || clean(plainTextOf(a.value)) || undefined;
  }
  return quotedStrings(a.value).map(clean).filter((s) => s && !looksLikeClassName(s))[0];
}

/** JSX reduced to the words it renders: expressions out first, then tags. */
function plainTextOf(s: string): string {
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

/** `antispam__titleSub`, `cardacts` — a CSS class, not a heading. */
const looksLikeClassName = (s: string): boolean =>
  !/\s/.test(s) && /^[a-z][a-z0-9]*(?:[-_]+[a-zA-Z0-9]+)*$/.test(s);

/** A string prop's value: `p="x"` or `p={…'x'…}`, the first literal either way. */
/** `server\u2019s` in a JS string, as the character it stands for. */
const unescapeJs = (t: string) => t.replace(/\\u([0-9a-fA-F]{4})/g, (_x, h: string) => String.fromCharCode(parseInt(h, 16)));

/**
 * A flag that names a thing being WRONG, not a setting.
 *
 * `empty={unsupported ? 'Unavailable on this firmware' : 'No L2TP client
 * tunnels configured'}` — taking the first literal gave the handbook the
 * firmware-missing message as though it were what a working screen shows with
 * nothing configured, next to the hint from the other branch. Two mutually
 * exclusive states in one sentence.
 */
const EXCEPTION_FLAG = /^!?\s*(un\w+|no\w+|missing|absent|error\w*|failed|broken|disabled|offline|stale|loading|busy|pending)$/i;

function prop(attrs: Map<string, Attr>, name: string): string | undefined {
  const a = attrs.get(name);
  if (!a) return undefined;
  if (a.quoted) return clean(a.value) || undefined;

  // `flag ? 'exceptional' : 'normal'` — the normal branch is the one to
  // document, and a leading `!` flips which that is.
  const tern = /^\s*(!?\s*[A-Za-z_$][\w$]*)\s*\?([\s\S]*)$/.exec(a.value);
  if (tern && EXCEPTION_FLAG.test(tern[1].replace(/\s+/g, ''))) {
    const negated = tern[1].trimStart().startsWith('!');
    const lits = quotedStrings(tern[2]).map((x) => clean(unescapeJs(x))).filter(Boolean);
    // Branch order is [then, else]; a negated flag swaps which one is normal.
    const normal = negated ? lits[0] : lits[lits.length - 1];
    if (normal) return normal;
  }

  return quotedStrings(a.value).map((x) => clean(unescapeJs(x))).filter(Boolean)[0];
}

/** Every string a prop can take — a conditional names one per branch. */
function propAll(attrs: Map<string, Attr>, name: string): string[] {
  const a = attrs.get(name);
  if (!a) return [];
  if (a.quoted) return [clean(a.value)].filter(Boolean);
  const seen = new Set<string>();
  return quotedStrings(a.value)
    .map((x) => clean(unescapeJs(x)))
    // A className or a one-word flag is not prose; help text is a sentence.
    .filter((s) => s.length >= 12 && /\s/.test(s) && !seen.has(s) && seen.add(s));
}

/** The initializer of `const NAME = [ … ]`, for a tab list held in a constant. */
function arrayConst(src: string, id: string): string {
  const m = new RegExp(`\\b(?:const|let|var)\\s+${id}\\s*=\\s*\\[`).exec(src);
  if (!m) return '';
  const open = src.indexOf('[', m.index);
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const prev = src[i - 1];
    if (quote) {
      if (c === quote && prev !== '\\') quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return src.slice(open, i + 1);
  }
  return '';
}

/** `label: 'X'` / `label: "X"` inside a literal, in order. */
const labelsIn = (block: string): string[] =>
  [...block.matchAll(/\blabel:\s*'([^']+)'|\blabel:\s*"([^"]+)"/g)]
    .map((m) => clean(m[1] ?? m[2]))
    .filter(Boolean);

/**
 * Is this branch of a `hint` describing the field, or reporting a moment?
 *
 * A hint is often a conditional, and its branches are not equals: one explains
 * what the field is for, the others say the list is still loading, or failed,
 * or came back empty. Only the first is documentation — the rest describe a
 * state the reader is not in while reading.
 */
const usefulHint = (s: string): boolean =>
  !/…/.test(s) &&
  !/^(Could not|Reading|Loading|Fetching)\b/i.test(s) &&
  !/^No\b.*\b(reported|available|found|configured|yet)\b/i.test(s);

/**
 * The fields of one form.
 *
 * Bounded by where the NEXT field starts, never by a fixed window — the
 * recurring failure in every reader of this kind is a field documented with
 * its neighbour's hint.
 */
/**
 * What a new record starts at, per state key.
 *
 * A screen seeds its "add" form from a literal of router defaults —
 * `NEW_MONITOR`, whose own comment says they are "the values the router's own
 * Add form starts at, not zeros". Telling a reader a field defaults to 1000 ms
 * is worth more than telling them it is optional. The right literal is the one
 * that covers the most of the form's own state keys, so a page with several
 * constants does not pick the wrong one.
 */
function defaultsFor(src: string, keys: Set<string>, topOnly = false): Map<string, string> {
  let best = new Map<string, string>();
  // Any object literal in the file is a candidate — a screen may name its
  // defaults `NEW_RULE`, `emptyRule`, or write them straight into
  // `useState({ … })`. Picking the one that covers the most state keys means
  // the name does not have to be guessed.
  //
  // `topOnly` keeps the file-level constants alone. A screen with four drawers
  // has four `useState` literals that share keys — every one has an `enabled` —
  // and letting the largest win gave the page's own BGP Service switch the
  // neighbor drawer's `true` when the page itself starts it at `false`.
  const atLineStart = (i: number) => src.lastIndexOf('\n', i - 1) + 1 === i;
  const candidates = [
    ...[...src.matchAll(/\b(?:const|let)\s+[A-Za-z_$][\w$]*\s*=\s*\{/g)].filter(
      (m) => !topOnly || atLineStart(m.index),
    ),
    ...(topOnly ? [] : src.matchAll(/\buseState\(\s*\(?\s*\)?\s*=?>?\s*\(?\s*\{/g)),
  ];
  // `setForm({ ping_timeout: String(cfg.ping_timeout ?? 4), … })` — a settings
  // tab fills its form from the router's answer, and the value after `??` is
  // what it shows when the router has none. Read LAST and only for keys
  // nothing else gave: a whole-form reset elsewhere would otherwise outrank a
  // drawer's own useState, and `setErrors({ hashes: 'Enter at least one
  // hash.' })` is an error, never a value — so only form setters count.
  const fillers = topOnly ? [] : [...src.matchAll(/\bset(?:Form|F|Cfg|Config|Values|Draft)\(\s*\{/g)];
  for (const m of candidates) {
    const open = src.indexOf('{', m.index);
    let depth = 0;
    let end = open;
    let quote: string | null = null;
    for (let i = open; i < src.length; i++) {
      const c = src[i];
      const prev = src[i - 1];
      if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
      // A `// the router's …` comment inside the literal is not a string.
      if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { end = i; break; }
    }
    const found = new Map<string, string>();
    // Through the closing brace: the last key of `{ …, leasetime: '12h' }`
    // is followed by `}`, not a comma, and cutting the brace off lost it.
    const lit = src.slice(open, end + 1);
    for (const kv of lit.matchAll(/(\w+):\s*(?:'([^']*)'|(true|false|\d+(?:\.\d+)?))\s*[,}]/g)) {
      if (keys.has(kv[1])) found.set(kv[1], kv[2] ?? kv[3]);
    }
    // An edit form seeds itself from the record and falls back to the default:
    // `latency_max: String(row?.latency_max || 100)`. The value after the `||`
    // (or `??`) is what a NEW record starts at, and reading only bare literals
    // missed every default on every screen that shares one form for both.
    for (const kv of lit.matchAll(
      /(\w+):\s*[^,\n]*?(?:\|\||\?\?)\s*(?:'([^']*)'|(true|false|\d+(?:\.\d+)?))/g,
    )) {
      if (keys.has(kv[1]) && !found.has(kv[1])) found.set(kv[1], kv[2] ?? kv[3]);
    }
    // `proto: ['tcp']` — a multi-select's default is a list, and reading only
    // scalars left the Port forward protocols with no starting value while the
    // form opens with TCP already ticked.
    for (const kv of lit.matchAll(/(\w+):\s*\[\s*((?:'[^']*'\s*,?\s*)+)\]/g)) {
      if (!keys.has(kv[1]) || found.has(kv[1])) continue;
      const items = [...kv[2].matchAll(/'([^']*)'/g)].map((x) => x[1]).filter(Boolean);
      if (items.length) found.set(kv[1], items.join(', '));
    }
    // `enabled: row ? row.enabled !== '0' : true` — the same idea written as a
    // ternary on the record. The else branch is what a NEW record gets, and it
    // is the only branch that is a constant.
    for (const kv of lit.matchAll(
      /(\w+):\s*(?:row|device|target)\b[^,\n]*?\?[^:\n]*:\s*(?:'([^']*)'|(true|false|\d+(?:\.\d+)?))/g,
    )) {
      if (keys.has(kv[1]) && !found.has(kv[1])) found.set(kv[1], kv[2] ?? kv[3]);
    }
    // `next_hop_self: toBool(row?.next_hop_self)` — a new record has no row,
    // and the kit's `toBool` reads undefined as off.
    // `masq: row?.masq === '1' || row?.masq === true` — true only when the
    // record says so, so a new record starts off.
    for (const kv of lit.matchAll(/(\w+):\s*(?:row|device|iface)\??\.\w+\s*===\s*(?:'1'|true)[^,\n]*,/g)) {
      if (keys.has(kv[1]) && !found.has(kv[1])) found.set(kv[1], 'false');
    }
    // `auto_negotiation: device?.auto_negotiation !== 'no'` — on unless the
    // record says otherwise, so a new one starts on.
    for (const kv of lit.matchAll(/(\w+):\s*(?:row|device)\?\.\w+\s*!==\s*'[^']*'\s*,/g)) {
      if (keys.has(kv[1]) && !found.has(kv[1])) found.set(kv[1], 'true');
    }
    // `sticky: Boolean(row?.sticky)` — a new record has no row, so false.
    for (const kv of lit.matchAll(/(\w+):\s*Boolean\(\s*row\?\.\w+\s*\)\s*[,}]/g)) {
      if (keys.has(kv[1]) && !found.has(kv[1])) found.set(kv[1], 'false');
    }
    for (const kv of lit.matchAll(/(\w+):\s*toBool\(\s*row\?\.\w+\s*\)/g)) {
      if (keys.has(kv[1]) && !found.has(kv[1])) found.set(kv[1], 'false');
    }
    if (found.size > best.size) best = found;
  }
  for (const m of fillers) {
    const open = src.indexOf('{', m.index);
    let depth = 0;
    let end = open;
    let quote: string | null = null;
    for (let i = open; i < src.length; i++) {
      const c = src[i];
      const prev = src[i - 1];
      if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
      // A `// the router's …` comment inside the literal is not a string.
      if (c === '/' && src[i + 1] === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { end = i; break; }
    }
    const lit = src.slice(open, end + 1);
    for (const kv of lit.matchAll(/(\w+):\s*[^,\n]*?(?:\|\||\?\?)\s*(?:'([^']*)'|(true|false|\d+(?:\.\d+)?))\s*\)?\s*[,}\n]/g)) {
      if (keys.has(kv[1]) && !best.has(kv[1])) best.set(kv[1], kv[2] ?? kv[3]);
    }
  }
  return best;
}

/** The message the form sets when a field is refused: `found.name = 'Required'`. */
function rejectionsFor(src: string, key: string): string[] {
  const out: string[] = [];
  const add = (raw: string) => {
    const t = clean(raw);
    if (/^[A-Z]/.test(t) && !out.includes(t)) out.push(t);
  };
  // `found.name = 'Required'`
  for (const m of src.matchAll(new RegExp(`\\.${key}\\s*=\\s*'([^']{3,})'`, 'g'))) add(m[1]);
  // `found.remote = { 0: 'Required' }` — a list field, refused at its first row.
  for (const m of src.matchAll(new RegExp(`\\.${key}\\s*=\\s*\\{\\s*0\\s*:\\s*'([^']{3,})'\\s*\\}`, 'g'))) add(m[1]);
  // `setErrors({ path_monitor: 'Required' })` — the same thing written as an
  // object, which half the screens do.
  for (const m of src.matchAll(
    new RegExp(`setErrors\\(\\{[^}]*?\\b${key}:\\s*'([^']{3,})'`, 'g'),
  )) add(m[1]);
  return out;
}

/** The state key a field is bound to: `f.interval`, `setText('interval')`. */
function stateKeyOf(body: string): string | undefined {
  return (
    /\bvalue=\{f\.(\w+)\s*\}/.exec(body)?.[1] ??
    /\bchecked=\{f\.(\w+)/.exec(body)?.[1] ??
    // `value={f.mtu_mode === 'auto' ? '' : f.ip4_mtu}` names the switch that
    // blanks the box before the key it holds; the setter names the key.
    /\bset(?:Text)?\('(\w+)'\)/.exec(body)?.[1] ??
    /\bvalue=\{f\.(\w+)/.exec(body)?.[1] ??
    // State kept outside `f`: `setTkText('interval')` on `track.interval`,
    // `sel('ping_timeout', SEC_OPTS)`, and `error={errors.members}`, which
    // names the key the save validates even when nothing else does.
    /\bset[A-Z]\w*\('(\w+)'\)/.exec(body)?.[1] ??
    /\b[a-z]\w*\(\s*'(\w+)'\s*,\s*[A-Z][A-Z0-9_]*\s*\)/.exec(body)?.[1] ??
    /\berror=\{errors\.(\w+)\}/.exec(body)?.[1] ??
    // `value={name}` — a field held in its own useState.
    /\bvalue=\{([a-z]\w*)\}/.exec(body)?.[1]
  );
}

/**
 * Ranges kept in a table rather than on the control: `const RANGES = {
 * good_rtt: [1, 10000], … }`, read by a helper that renders the input. Without
 * this the whole SLA Settings screen documents as sixteen numbers with no
 * accepted range, because not one of them carries `min`/`max` in the markup.
 */
function rangeTables(src: string): Map<string, [string, string]> {
  const out = new Map<string, [string, string]>();
  for (const m of src.matchAll(/\b(?:const|let)\s+[A-Za-z_$][\w$]*\s*=\s*\{([\s\S]{0,3000}?)\n\}/g)) {
    for (const kv of m[1].matchAll(/(\w+):\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g)) {
      if (!out.has(kv[1])) out.set(kv[1], [kv[2], kv[3]]);
    }
  }
  return out;
}

/** `const CONTROLLER_ONLY = '…'` — a sentence a hint interpolates. */
function stringConstants(src: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of src.matchAll(/\b(?:const|let)\s+([A-Z][A-Z0-9_]*)\s*=\s*\n?\s*'([^']{10,})'/g)) {
    out.set(m[1], clean(m[2]));
  }
  return out;
}

/**
 * The nearest band or card heading above `at` — "Good — Full LB Weight",
 * "Failover". A settings screen repeats the same field names in each band, so
 * without this the table reads as "RTT (ms)" four times over.
 */
function groupAt(src: string, at: number): string | undefined {
  const before = src.slice(0, at);

  // A coloured band inside a card: "Good — Full LB Weight".
  const bandMatches = [...before.matchAll(/__head">([^<{]{3,60})</g)];
  const band = bandMatches.pop();

  // The enclosing card. Read off `<Card` specifically, not off any `title=`
  // attribute: `<Warn title="Could not read alert configuration.">` sits above
  // the fields on several screens and was being used as their heading.
  let cardAt = -1;
  let card: string | undefined;
  for (const pos of tagsNamed(before, 'Card')) {
    const t = heading(attrsOf(openingTag(before, pos)), 'title');
    if (t) { cardAt = pos; card = t; }
  }

  const bandAt = band ? band.index : -1;
  const pick = bandAt > cardAt ? band?.[1] : card;
  return pick ? clean(pick) : undefined;
}

/**
 * Fields laid out on the page itself: a label, a control and a hint in a
 * `<div className="fld">`, with no `<Field>` wrapper and no drawer.
 *
 * SLA Settings is entirely this shape, which is why it documented as a screen
 * with no fields at all while carrying twenty of them.
 */
function inlineFieldsIn(
  src: string,
  consts: Map<string, string>,
  ranges: Map<string, [string, string]>,
): Array<CpeField & { at: number }> {
  const out: Array<CpeField & { at: number }> = [];
  const seen = new Set<string>();
  const marks = [...src.matchAll(/<label className="cpepg__lab"[^>]*>([\s\S]{0,120}?)<\/label>/g)];

  for (const [i, m] of marks.entries()) {
    const label = clean(plainTextOf(m[1]));
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const until = i + 1 < marks.length ? marks[i + 1].index : Math.min(src.length, m.index + 1200);
    const body = src.slice(m.index, until);

    const hintRaw = /className="hint">([\s\S]{0,400}?)<\/span>/.exec(body)?.[1] ?? '';
    const hint = clean(
      hintRaw
        // `{CONTROLLER_ONLY}` is a sentence the file defines once and appends
        // to several hints; dropped with the other expressions it took the
        // "not pushed to this device" warning with it.
        .replace(/\{([A-Z][A-Z0-9_]*)\}/g, (_x, n) => consts.get(n) ?? '')
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/<[^>]*>/g, ' '),
    );

    const f: CpeField & { at: number } = { at: m.index, label, required: false, hints: hint ? [hint] : [] };
    Object.assign(f, valuesIn(body, src));
    const key = /\bvalue=\{form\.(\w+)/.exec(body)?.[1] ?? /\bset\('(\w+)'/.exec(body)?.[1];
    if (key && f.min === undefined && ranges.has(key)) {
      [f.min, f.max] = ranges.get(key)!;
    }
    if (key) {
      f.key = key;
      // The markup reader found no default for these: they bind `form.x`, and
      // the page's defaults are a file-level constant, not the drawer's state.
      const raw = FALLBACKS.get(key);
      if (raw !== undefined && f.fallback === undefined) f.fallback = raw;
    }
    Object.assign(f, lockLocalOf(body));
    out.push(f);
  }

  // A local helper that renders one of those rows, called once per field:
  // `num('good_rtt', 'RTT (ms)')`. Sixteen of this screen's fields exist only
  // as call sites, so the markup scan above cannot see them.
  for (const h of src.matchAll(/\bconst\s+([a-z][\w$]*)\s*=\s*\([^)]*\)\s*=>\s*\(?\s*\n?\s*</g)) {
    const helper = h[1];
    // The helper renders a row either directly or through a named component.
    // Requiring a named one missed the QoS Alerts helper, which opens a plain
    // `<div>` — and with it the three fields that screen actually has.
    const window = src.slice(h.index, h.index + 700);
    const renders = /^\s*<([A-Z][\w]*)/.exec(src.slice(h.index + h[0].length - 1))?.[1];
    const isRow =
      /cpepg__lab/.test(window) ||
      (renders !== undefined &&
        new RegExp(`function ${renders}\\b[\\s\\S]{0,900}?cpepg__lab`).test(src));
    if (!isRow) continue;
    for (const call of src.matchAll(new RegExp(`\\b${helper}\\(`, 'g'))) {
      // Balanced and quote-aware: `num('good_rtt', 'RTT (ms)')` closes on the
      // bracket inside its own label, and a `[^)]*` match cut every label at
      // "RTT (ms".
      const open = call.index + call[0].length - 1;
      let depth = 0;
      let end = open;
      let quote: string | null = null;
      for (let i = open; i < src.length && i < open + 400; i++) {
        const c = src[i];
        const prev = src[i - 1];
        if (quote) { if (c === quote && prev !== '\\') quote = null; continue; }
        if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
        if (c === '(') depth++;
        else if (c === ')' && --depth === 0) { end = i; break; }
      }
      const args = quotedStrings(src.slice(open + 1, end)).map(clean);
      const key = args[0];
      const label = args[1];
      const group = groupAt(src, call.index);
      const id = `${group ?? ''}\u241f${label}`;
      if (!label || seen.has(id)) continue;
      seen.add(id);
      const f: CpeField & { at: number } = {
        at: call.index,
        label,
        required: false,
        hints: args[2] ? [args[2]] : [],
        ...(group ? { group } : {}),
      };
      if (key && ranges.has(key)) [f.min, f.max] = ranges.get(key)!;
      if (key) {
        const rejects = rejectionsFor(src, key);
        if (rejects.length) f.rejects = rejects;
        const raw = FALLBACKS.get(key);
        if (raw !== undefined) f.fallback = raw;
      }
      out.push(f);
    }
  }
  return out;
}

/**
 * A test against the form's own state — `f.protocol === 'udp-echo'`,
 * `!f.latency_on`, `form.sla_enabled`. Anything more involved than one key
 * compared with one literal is left unread: a half-understood condition
 * printed as fact is worse than none.
 */
interface Cond {
  key: string;
  op: '===' | '!==' | 'truthy' | 'falsy';
  value?: string;
  /**
   * For a bare local — `{serviceOn && (…)}` — the expression it stands for,
   * `isOn(cfg.service)`, so it can be matched to the switch bound to the same
   * expression and printed as "**RIP Service** is on".
   */
  expr?: string;
  /**
   * A section folded behind a button — `{advanced && (…)}` over `const
   * [advanced, setAdvanced] = useState(false)`. The value is what the button
   * says while the section is closed: "Show advanced options".
   */
  disclosure?: string;
}
const COND = String.raw`(!?)\s*(?:f|form)\.(\w+)(?:\s*(===|!==)\s*'([^']*)')?`;
function condOf(m: RegExpExecArray | RegExpMatchArray): Cond {
  if (m[3]) {
    // `!f.x === 'y'` is not a thing anyone writes; a leading `!` here would be
    // a misread, so it is ignored rather than inverted.
    return { key: m[2], op: m[3] as Cond['op'], value: m[4] };
  }
  return { key: m[2], op: m[1] ? 'falsy' : 'truthy' };
}
function parseCond(expr: string): Cond | undefined {
  const m = new RegExp(`^\\s*${COND}\\s*$`).exec(expr);
  return m ? condOf(m) : undefined;
}
const negate = (c: Cond): Cond => ({
  ...c,
  op: c.op === '===' ? '!==' : c.op === '!==' ? '===' : c.op === 'truthy' ? 'falsy' : 'truthy',
});

/**
 * The `)` that closes the `(` at `open`, in JSX.
 *
 * JSX text is full of apostrophes — "the router's own" — so a `'` only opens
 * a string where JavaScript could start one, after an operator or bracket.
 * Treating every apostrophe as a quote swallowed the rest of the form into
 * the first conditional that contained one.
 */
function closeParen(s: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote && s[i - 1] !== '\\') quote = null;
      continue;
    }
    // Comments are not code: IPS's `{/* … \`last_update\` does not exist … */}`
    // opened a fake template string and ran the Settings tab to the end of
    // the file. A `//` counts only at the start of a line — in JSX text it is
    // as likely to be part of a URL.
    if (c === '/' && s[i + 1] === '*') {
      const end = s.indexOf('*/', i + 2);
      i = end < 0 ? s.length : end + 1;
      continue;
    }
    if (c === '/' && s[i + 1] === '/' && /(^|\n)[ \t]*$/.test(s.slice(Math.max(0, i - 200), i))) {
      const nl = s.indexOf('\n', i);
      i = nl < 0 ? s.length : nl;
      continue;
    }
    if (c === '"' || c === '`') { quote = c; continue; }
    if (c === "'" && /[=(,:?[{&|!+]\s*$/.test(s.slice(Math.max(0, i - 3), i))) { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return s.length;
}

/**
 * Every region of a form rendered only under a condition: `{f.x === 'y' &&
 * ( … )}` and the then-branch of `{f.x ? ( … ) : …}`.
 */
function condSpans(block: string, src = block): Array<{ from: number; to: number; cond: Cond }> {
  const out: Array<{ from: number; to: number; cond: Cond }> = [];
  for (const m of block.matchAll(new RegExp(String.raw`\{\s*${COND}\s*(&&|\?)\s*\(`, 'g'))) {
    const open = m.index + m[0].length - 1;
    const end = closeParen(block, open);
    const cond = condOf(m);
    out.push({ from: open, to: end, cond });

    // The ELSE branch of a ternary is a condition too, and the fields in it
    // are the ones shown the rest of the time. Reverse proxy is exactly this:
    // `{kind === 'domain' ? (<Field label="Domain" …>) : (<Field label="Path"
    // …>)}`. Reading only the true branch listed Domain and Path as two
    // ordinary required fields, when a reader will only ever see one of them.
    if (m[m.length - 1] === '?') {
      const tail = block.slice(end + 1, end + 40);
      const colon = /^\s*:\s*\(/.exec(tail);
      if (colon) {
        const elseOpen = end + 1 + colon[0].length - 1;
        out.push({ from: elseOpen, to: closeParen(block, elseOpen), cond: negate(cond) });
      }
    }
  }
  // `{kind === 'domain' ? (…) : (…)}` — a ternary on a LOCAL rather than on
  // `f.x`. COND deliberately requires the `f.`/`form.` prefix, so this shape
  // was invisible: Reverse proxy listed Domain and Path as two ordinary
  // required fields when only ever one of them is on screen. The local is
  // usually the state behind a field (`value={kind}` on Type), and condText
  // resolves it to that field's label and option word on its own.
  for (const m of block.matchAll(/\{\s*([a-z]\w*)\s*(===|!==)\s*'([^']*)'\s*\?\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const end = closeParen(block, open);
    const cond: Cond = { key: m[1], op: m[2] as Cond['op'], value: m[3] };
    out.push({ from: open, to: end, cond });

    const tail = block.slice(end + 1, end + 40);
    const colon = /^\s*:\s*\(/.exec(tail);
    if (colon) {
      const elseOpen = end + 1 + colon[0].length - 1;
      out.push({ from: elseOpen, to: closeParen(block, elseOpen), cond: negate(cond) });
    }
  }

  // `<AdvancedSection>` — a folded `<details>` the kit uses on 22 screens.
  // Its fields are on the form, but not until the reader opens it.
  for (const at of tagsNamed(block, 'AdvancedSection')) {
    const tag = openingTag(block, at);
    if (/\/>\s*$/.test(tag)) continue;
    const end = block.indexOf('</AdvancedSection>', at);
    if (end < 0) continue;
    const label = prop(attrsOf(tag), 'label') ?? ADVANCED_LABEL();
    out.push({ from: at, to: end, cond: { key: 'advanced', op: 'truthy', disclosure: label } });
  }
  for (const m of block.matchAll(/\{\s*(!?)\s*([a-z]\w*)\s*(&&|\?)\s*\(/g)) {
    const expr = localExpr(src, m[2]);
    if (!expr) {
      const disclosure = !m[1] && m[3] === '&&' ? disclosureButton(src, m[2]) : undefined;
      if (disclosure) {
        const open = m.index + m[0].length - 1;
        out.push({ from: open, to: closeParen(block, open), cond: { key: m[2], op: 'truthy', disclosure } });
      }
      continue;
    }
    const open = m.index + m[0].length - 1;
    const end = closeParen(block, open);
    // `const isSubnet = f.topology === 'subnet'` — the local IS a test on a
    // field, so it is read as that test ("**Topology** is `Subnet`").
    const direct = parseCond(expr);
    const base: Cond = direct ?? { key: m[2], op: 'truthy', expr };
    const cond = m[1] ? negate(base) : base;
    out.push({ from: open, to: end, cond });
    // …and the else branch of `{isSubnet ? (…) : (…)}` is the opposite case:
    // OpenVPN's P2P addresses, documented as always required.
    if (m[3] === '?') {
      const colon = /^\s*:\s*\(/.exec(block.slice(end + 1, end + 40));
      if (colon) {
        const elseOpen = end + 1 + colon[0].length - 1;
        out.push({ from: elseOpen, to: closeParen(block, elseOpen), cond: negate(cond) });
      }
    }
  }
  return out;
}

/**
 * The words on the button that unfolds `{name && (…)}`, read the way the
 * button shows them while the section is still closed.
 *
 * `{advanced ? 'Hide' : 'Show'} advanced options` → "Show advanced options".
 * Only a boolean `useState(false)` toggled by a button counts; anything else
 * is a condition this reader does not understand, and is left unprinted.
 */
function disclosureButton(src: string, name: string): string | undefined {
  const setter = `set${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  if (!new RegExp(`\\[\\s*${name}\\s*,\\s*${setter}\\s*\\]\\s*=\\s*useState\\(\\s*false\\s*\\)`).test(src)) return undefined;
  for (const at of tagsNamed(src, 'button')) {
    const tag = openingTag(src, at);
    if (!new RegExp(`\\b${setter}\\(`).test(tag)) continue;
    const close = src.indexOf('</button>', at);
    if (close < 0) continue;
    const inner = src
      .slice(at + tag.length, close)
      .replace(new RegExp(`\\{\\s*${name}\\s*\\?\\s*'([^']*)'\\s*:\\s*'([^']*)'\\s*\\}`, 'g'), '$2');
    const text = clean(plainTextOf(inner));
    if (text && text.length <= 40) return text;
  }
  return undefined;
}

/** The kit's own default caption for `<AdvancedSection>`, read from cpeFields.jsx. */
let ADV_CACHE: string | undefined;
function ADVANCED_LABEL(): string {
  if (ADV_CACHE) return ADV_CACHE;
  try {
    const kit = readFileSync(path.join(FE, 'components', 'cpe', 'cpeFields.jsx'), 'utf8');
    ADV_CACHE = /function AdvancedSection\(\{\s*label\s*=\s*'([^']+)'/.exec(kit)?.[1];
  } catch {
    // fall through
  }
  return (ADV_CACHE ??= 'Advanced Settings');
}

/** `const serviceOn = isOn(cfg.service)` → `isOn(cfg.service)`, for one-line locals. */
function localExpr(src: string, id: string): string | undefined {
  return new RegExp(`\\bconst\\s+${id}\\s*=\\s*([^\\n;]+)`).exec(src)?.[1]?.trim();
}

/** The disabling expression of a control, when it is a plain test. */
function disabledCond(body: string): Cond | undefined {
  const m = /\bdisabled=\{([^}]*)\}/.exec(body);
  return m ? parseCond(m[1]) : undefined;
}

type Found = CpeField & {
  at: number;
  /** `disabled={managed}` — a local a banner on the screen is keyed to. */
  _lockLocal?: string;
  /** A switch's raw `on={…}` / `checked={…}`, to match a bare-local condition. */
  _bound?: string;
  _shown?: Cond[];
  _disabled?: Cond;
  _required?: Cond;
  _caseHints?: Array<{ cond: Cond; text: string }>;
};

/**
 * The band a drawer's field sits in, and what that band is for.
 *
 * A long form is broken up by `<div className="cpepg__sec">Match</div>`,
 * usually followed by a line explaining the band — "Select which traffic this
 * policy route applies to." Eight fields listed flat lose that structure
 * entirely, and the reader cannot tell which ones describe the traffic and
 * which decide where it goes.
 *
 * Only bands INSIDE the block count. Unlike `groupAt` there is no fall back to
 * the nearest card: a drawer has no card of its own, so the nearest one is
 * whatever happened to be above it on the page.
 */
function bandsIn(block: string): Array<{ at: number; name: string; note?: string }> {
  const out: Array<{ at: number; name: string; note?: string }> = [];
  // Two markups for the same idea: a `cpepg__sec` caption, and a `mwangs__sec`
  // section whose `<h3>` is the caption. The DDoS quarantine settings use the
  // second and had no band at all.
  const re =
    /className="cpepg__sec"[^>]*>([^<{]{2,40})<|className="mwangs__sec"[\s\S]{0,200}?<h3>([^<{]{2,40})<\/h3>/g;
  for (const m of block.matchAll(re)) {
    const name = clean(m[1] ?? m[2] ?? '');
    if (!name) continue;
    // The explanation the band carries, when the next thing is a hint line.
    const after = block.slice(m.index, m.index + 500);
    const note = /className="hint"[^>]*>\s*([^<{]{10,300}?)\s*</.exec(after)?.[1];
    out.push({ at: m.index, name, ...(note ? { note: clean(note) } : {}) });
  }
  return out;
}

function fieldsIn(block: string, src: string): Found[] {
  const starts = tagsNamed(block, 'Field');
  // Position-tagged, because the two shapes below are collected in two passes
  // and the table has to read in the order the form lays them out.
  const out: Found[] = [];
  const seen = new Set<string>();
  const spans = condSpans(block, src);
  // The bands this form is divided into — "Match", "Action".
  const bands = bandsIn(block);
  const bandAt = (at: number) => {
    const b = [...bands].reverse().find((x) => x.at < at);
    // A band belongs to the card it is written in. DDoS declares "Address
    // family" in its first card and its quarantine settings live in the
    // second, which put three unrelated fields under it.
    if (!b) return {};
    const crossesCard = /<Card\b/.test(block.slice(b.at, at));
    return crossesCard ? {} : { group: b.name };
  };
  const shownAt = (at: number) => {
    const cs = spans.filter((s) => at > s.from && at < s.to).map((s) => s.cond);
    return cs.length ? { _shown: cs } : {};
  };
  // `{!device && false && (…)}` — switched off in the source. A field inside
  // one never renders, and Interfaces' Port was documented as required.
  const dead: Array<[number, number]> = [];
  for (const m of block.matchAll(/\{[^{}()]*?&&\s*false\s*&&\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    dead.push([open, closeParen(block, open)]);
  }
  for (const [i, at] of starts.entries()) {
    const attrs = attrsOf(openingTag(block, at));
    const label = prop(attrs, 'label');
    if (!label || seen.has(label)) continue;
    if (dead.some(([a, b]) => at > a && at < b)) continue;
    seen.add(label);

    // `hint={f.protocol === 'dns' ? 'Leave blank…' : 'The probe target…'}` —
    // two hints for two situations. Printed side by side they contradicted
    // each other, so each is kept with the case it belongs to.
    const hintAttr = attrs.get('hint');
    const split = hintAttr && !hintAttr.quoted
      ? new RegExp(String.raw`^\s*${COND}\s*\?\s*'([^']+)'\s*:\s*'([^']+)'\s*$`).exec(hintAttr.value)
      : null;
    const caseHints = split
      ? [
          { cond: condOf(split), text: clean(split[5]) },
          { cond: negate(condOf(split)), text: clean(split[6]) },
        ]
      : undefined;
    // `info="…"` is the same help text behind an ⓘ icon instead of under the box.
    const hints = caseHints ? [] : [...propAll(attrs, 'hint'), ...propAll(attrs, 'info')].filter(usefulHint);
    const reqAttr = attrs.get('required');
    const reqCond = reqAttr && reqAttr.value ? parseCond(reqAttr.value) : undefined;
    // The placeholder lives on the control inside the field, not on the field,
    // so it is read from the field's own body. Bounded by `</Field>` first and
    // the next field second: some screens lay controls out by hand between two
    // fields, and one of those gave "Participants" the placeholder of a
    // threshold input several rows below it.
    const next = i + 1 < starts.length ? starts[i + 1] : block.length;
    const close = block.indexOf('</Field>', at);
    const body = block.slice(at, Math.min(next, close < 0 ? next : close + 8));
    const phm = /placeholder=(?:"([^"]+)"|\{\s*'([^']+)'\s*\})/.exec(body);
    const ph = phm?.[1] ?? phm?.[2];

    out.push({
      at,
      label,
      // `required` bare, or `required={f.protocol !== 'dns'}` — either way the
      // field can be mandatory, which is what a reader needs to be told.
      required: attrs.has('required'),
      hints,
      ...(ph ? { placeholder: clean(ph) } : {}),
      ...valuesIn(body, src),
      ...shownAt(at),
      ...bandAt(at),
      ...(caseHints ? { _caseHints: caseHints } : {}),
      ...(reqCond ? { _required: reqCond } : {}),
      ...(() => {
        const d = disabledCond(body);
        return d ? { _disabled: d } : {};
      })(),
      ...lockLocalOf(body),
    });
  }

  // A toggle inside the form is one of its fields, not a setting on the
  // screen behind it. The Tenants drawer ends in `<Toggle label="Enabled">`,
  // which was being listed as something you flip on the list page while the
  // field table that should hold it said nothing about it at all.
  for (const m of block.matchAll(/<(Toggle\w*|Switch)\b/g)) {
    const attrs = attrsOf(openingTag(block, m.index));
    const label = prop(attrs, 'label');
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({
      at: m.index,
      label,
      required: false,
      hints: [...propAll(attrs, 'hint'), ...propAll(attrs, 'info')].filter(usefulHint),
      options: ['On', 'Off'],
      ...(() => {
        // The band it is written in first, and only then the enclosing card.
        // Mixing the two put a card title in the Group column between two real
        // band names on the DDoS quarantine settings.
        //
        // `m.index` indexes BLOCK, so both lookups take block: reading it out
        // of `src` made the offsets meaningless as soon as the two differed,
        // and a QoS toggle came back grouped under a heading from another tab.
        const band = bandAt(m.index);
        if ('group' in band) return band;
        const g = groupAt(block, m.index);
        return g ? { group: g } : {};
      })(),
      ...(() => {
        // `checked={f.enabled}` / `on={Boolean(form.carrier_failover)}` — the
        // bound key is read straight out of the expression, since these carry
        // it bare rather than in the `value={f.x}` shape the inputs use.
        const bound = `${attrs.get('checked')?.value ?? ''} ${attrs.get('on')?.value ?? ''}`;
        const key = /\b(?:f|form)\.(\w+)/.exec(bound)?.[1];
        const raw = key ? FALLBACKS.get(key) : undefined;
        // `checked={!f.disabled}` — the switch shows the opposite of the key it
        // writes, so `disabled: false` is a switch that starts ON.
        const inverted = /!\s*(?:f|form)\.\w+/.test(bound);
        // `enabled: '1'` in a create-defaults constant is on, too.
        const on = raw === 'true' || raw === '1' ? !inverted : raw === 'false' || raw === '0' ? inverted : undefined;
        return {
          _bound: bound.trim(),
          ...(key ? { key } : {}),
          ...(on !== undefined ? { fallback: on ? 'On' : 'Off' } : {}),
        };
      })(),
      ...shownAt(m.index),
    });
  }

  // Controls laid out by hand rather than wrapped in a `<Field>`. They carry
  // their name as an `aria-label`, and they are real fields — the Path Monitor
  // form's whole "Link Status" group is four of them, and documenting the form
  // without them left out the check interval and the failure counts.
  for (const m of block.matchAll(/<(?:input|select|textarea|Select)\b/g)) {
    const attrs = attrsOf(openingTag(block, m.index));
    const label = prop(attrs, 'aria-label') ?? prop(attrs, 'ariaLabel');
    if (!label || seen.has(label)) continue;
    // A row's own caption sits just before the control; the aria-label often
    // repeats it with the unit appended, which is the better name of the two.
    seen.add(label);
    const body = block.slice(m.index, m.index + 400);
    const d = disabledCond(openingTag(block, m.index));
    out.push({
      at: m.index,
      label,
      required: false,
      hints: [],
      ...valuesIn(body, src, attrs),
      ...shownAt(m.index),
      ...(d ? { _disabled: d } : {}),
      ...lockLocalOf(openingTag(block, m.index)),
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The values half of a field: its choices, range, unit and default. */
function valuesIn(
  body: string,
  src: string,
  own?: Map<string, Attr>,
): Partial<CpeField> {
  const outer: Partial<CpeField> = {};
  // Set when the choices are generated from a template rather than listed.
  let generated = '';
  /** A checkbox/radio list resolved below, for the value→label pass. */
  let mappedPairs = '';

  // A select's choices, named or inline.
  const optId =
    /\boptions=\{([A-Za-z_$][\w$]*)\}/.exec(body)?.[1] ??
    // `{() => sel('ping_timeout', SEC_OPTS)}` — the choices handed to a helper.
    /\b[a-z]\w*\(\s*'\w+'\s*,\s*([A-Z][A-Z0-9_]*)\s*\)/.exec(body)?.[1];
  // `const SEC_OPTS = secondsOpts([1, 2, 5])` over `label: `${v} second…``,
  // or `[1, 2].map((v) => ({ label: `${v} ping test…` }))` — the numbers are
  // the choices; the template names the unit.
  const numbered = optId ? numberedOptions(src, optId) ?? stringListOptions(src, optId) : undefined;
  const optBlock = optId ? arrayConst(src, optId) : /\boptions=\{\[/.test(body) ? body : '';
  const options = labelsIn(optBlock);
  if (numbered) {
    outer.options = numbered.map((x) => x.label);
    // Fed to the value→label pass below, so a default of `4` prints as the
    // choice the reader sees, "4 seconds".
    mappedPairs = numbered.map((x) => `value: '${x.value}', label: '${x.label}'`).join('\n');
  } else if (options.length) {
    outer.options = options;
    // `const ifaceOptions = [{ label: 'Any' }].concat(interfaces.map(…))` —
    // the literal is the one fixed choice; the rest are the router's.
    if (optId && new RegExp(`\\b${optId}\\s*=\\s*\\[[\\s\\S]{0,200}?\\]\\s*\\.concat\\([\\s\\S]{0,200}?\\.map\\(`).test(src)) {
      outer.optionsAreLive = true;
    }
    // `options={[{ label: 'All members' }, ...names.map(…)]}` — the literal is
    // only the first choice; the rest are the router's.
    if (!optId && /\boptions=\{\[[\s\S]{0,300}?\.\.\.[\w.]+\.map\(/.test(body)) outer.optionsAreLive = true;
    // `options={[{ label: 'Auto' }].concat(optionsFrom(lookups.digest))}`.
    if (!optId && /\boptions=\{\[[^\]]*\]\s*\.concat\(/.test(body)) outer.optionsAreLive = true;
  }
  else if (optId) {
    // A generated run: `Array.from({ length: 8 }, (_, i) => ({ … label:
    // `Tier ${i + 1}` }))`. There are no literals to read, but the shape says
    // exactly what the list is, and "Tier 1 … Tier 8" is the answer a reader
    // wants — the alternative was an empty cell on a select with 8 choices.
    const gen = new RegExp(
      `\\b(?:const|let)\\s+${optId}\\s*=\\s*Array\\.from\\(\\s*\\{\\s*length:\\s*(\\d+)[\\s\\S]{0,240}?label:\\s*\`([^\`$]*)\\$\\{`,
    ).exec(src);
    if (gen) {
      const n = Number(gen[1]);
      // NOT cleaned: the template is `Tier ${i + 1}`, and trimming its trailing
      // space turned "Tier 1" into "Tier1".
      const prefix = gen[2].replace(/\s+/g, ' ');
      outer.options = [`${prefix}1`, '\u2026', `${prefix}${n}`];
      // The value stored is the bare number, so the default reads as "1"
      // unless it is put back through the template the list was built from.
      generated = prefix;
    } else if (new RegExp(`\\bconst\\s+${optId}\\s*=[^\\n]*\\.map\\(`).test(src)) {
      // `const forwardOptions = allZones.filter(…).map(…)` — built from what
      // the router reported, so there is no list to write down.
      outer.optionsAreLive = true;
    }
  } else if (/\boptions=\{[^}]*\.map\(/.test(body)) {
    outer.optionsAreLive = true;
  } else {
    // A checkbox or radio group, written as a map over a local list rather
    // than handed to a Select: `{PROTOS.map((p) => <input type="checkbox" …>)}`
    // is how Port forward offers TCP / UDP / ICMP / ESP, and reading only
    // `options=` left that field with no choices at all.
    const mapped = /\{\s*([A-Z][A-Z0-9_]*)\.map\(/.exec(body)?.[1];
    if (mapped) {
      const block = arrayConst(src, mapped);
      const labels = labelsIn(block);
      if (labels.length) {
        outer.options = labels;
        // The same list also resolves the default, which is stored as values
        // (`proto: ['tcp']`) and would otherwise print as `tcp` beside a
        // choice list that says `TCP`.
        mappedPairs = block;
      }
    }
    // Choice buttons written inline: `{[{ value: 'custom', label: 'Custom' },
    // …].map((t) => <button onClick={() => pickType(t.value)}>)}` — Zones'
    // Custom / Guest / DMZ, which documented as a field with no choices.
    const inlineArr = /\{\s*(\[\s*\{\s*value:[\s\S]*?\])\s*\.map\(/.exec(body)?.[1];
    if (!mapped && inlineArr) {
      const labels = labelsIn(inlineArr);
      if (labels.length) {
        outer.options = labels;
        mappedPairs = inlineArr;
      }
    }
  }
  // `{ value: 'g711', label: 'G.711' }` — the default is stored as the value,
  // and a reader told the default is "g711" has to go and find which choice
  // that is. So the pairs are kept, and the value is resolved to its word.
  const byValue = new Map<string, string>();
  for (const m of `${optBlock}\n${mappedPairs}`.matchAll(
    /value:\s*'([^']*)'\s*,\s*label:\s*(?:'([^']+)'|"([^"]+)")/g,
  )) {
    byValue.set(m[1], clean(m[2] ?? m[3]));
  }

  const key =
    stateKeyOf(body) ??
    (own ? stateKeyOf(own.get('value')?.value ?? '') : undefined) ??
    // `f.type === t.value` — a choice button marks itself selected against
    // the key it sets.
    (mappedPairs ? /\b(?:f|form)\.(\w+)\s*===\s*\w+\.value\b/.exec(body)?.[1] : undefined);

  // The range, from the control or from the clamp the save applies.
  const min = /\bmin="([^"]+)"/.exec(body)?.[1];
  const max = /\bmax="([^"]+)"/.exec(body)?.[1];
  if (min !== undefined) outer.min = min;
  if (max !== undefined) outer.max = max;
  if (key && (min === undefined || max === undefined)) {
    const clamp = new RegExp(`clampNum\\(\\s*f\\.${key}\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)`).exec(src);
    if (clamp) {
      outer.min ??= clamp[1];
      outer.max ??= clamp[2];
    }
  }
  // Whether or not the markup carries the range, a save that runs the value
  // through `clampNum` never refuses it — it quietly stores the nearest limit.
  if (key && new RegExp(`clampNum\\(\\s*f\\.${key}\\b`).test(src)) outer.clamped = true;

  // `disabled={!isNew}` — the control accepts a value on the way in and is
  // fixed afterwards, which is how a record's key behaves. Read rather than
  // assumed from the field being called "Name".
  if (/\bdisabled=\{\s*(?:!\s*isNew|isEdit|editing)\s*\}/.test(body)) outer.lockedOnEdit = true;

  // `<RepeatableList addLabel="Add DNS server">` — the field takes a list.
  const rep = tagsNamed(body, 'RepeatableList')[0];
  if (rep !== undefined) {
    const add = prop(attrsOf(openingTag(body, rep)), 'addLabel');
    outer.repeatable = add ?? 'Add';
  }

  const unit = /__unit">([^<]{1,12})</.exec(body)?.[1];
  // "Select a monitor…", "Choose one or more" — a prompt on an empty select,
  // not an example of what to type. Printed as an example it read as though
  // the literal words were a valid value.
  if (outer.placeholder === undefined) {
    const phm = /placeholder=(?:"([^"]+)"|\{\s*'([^']+)'\s*\})/.exec(body);
    const ph = phm?.[1] ?? phm?.[2];
    // "Select a monitor…", "Search applications…", "Enter profile name",
    // "Describe the purpose of this profile" — an instruction to the operator,
    // not an example of a valid value. Printed as one it read as though those
    // literal words were what to type.
    if (ph && /^(Select|Choose|Pick|Search|Enter|Type|Describe|Add)\b/i.test(ph)) {
      outer.placeholder = '';
    }
  }
  if (unit && clean(unit)) outer.unit = clean(unit);

  if (byValue.size) outer.valueLabels = Object.fromEntries(byValue);
  if (key) {
    outer.key = key;
    const rejects = rejectionsFor(src, key);
    if (rejects.length) outer.rejects = rejects;
    const raw = FALLBACKS.get(key);
    if (raw !== undefined) {
      outer.fallback =
        byValue.get(raw) ??
        (generated && /^\d+$/.test(raw) ? `${generated}${raw}` : undefined) ??
        // Live options have no literal list to name the value from, but a
        // `const AUTH_LABELS = { certificate: 'Certificate', … }` does.
        (outer.optionsAreLive || !outer.options?.length ? labelFromMaps(src, raw) : undefined) ??
        raw;
    }
  }
  return outer;
}

/**
 * Choices generated from a list of numbers: `const SEC_OPTS = secondsOpts([1,
 * 2, 5])` where `secondsOpts` labels each `${v} second${v === 1 ? '' : 's'}`,
 * or `const TEST_OPTS = [1, 2].map((v) => ({ label: `${v} ping test…` }))`.
 * Spelled out with the unit, pluralised the way the template does it.
 */
function numberedOptions(src: string, id: string): Array<{ value: string; label: string }> | undefined {
  let nums: string | undefined;
  let tmpl: string | undefined;
  const viaFn = new RegExp(`\\bconst\\s+${id}\\s*=\\s*(\\w+)\\(\\s*\\[([\\d.,\\s]+)\\]\\s*\\)`).exec(src);
  if (viaFn) {
    nums = viaFn[2];
    tmpl = new RegExp(`\\bconst\\s+${viaFn[1]}\\s*=[\\s\\S]{0,300}?label:\\s*\`([^\`]*)\``).exec(src)?.[1];
  } else {
    const viaMap = new RegExp(`\\bconst\\s+${id}\\s*=\\s*\\[([\\d.,\\s]+)\\]\\.map\\([\\s\\S]{0,200}?label:\\s*\`([^\`]*)\``).exec(src);
    if (viaMap) [nums, tmpl] = [viaMap[1], viaMap[2]];
  }
  if (!nums || !tmpl) return undefined;
  const out: Array<{ value: string; label: string }> = [];
  for (const n of nums.split(',').map((x) => x.trim()).filter(Boolean)) {
    const label = tmpl
      .replace(/\$\{\s*\w+\s*===\s*1\s*\?\s*''\s*:\s*'(\w*)'\s*\}/g, (_x, pl: string) => (n === '1' ? '' : pl))
      .replace(/\$\{\s*\w+\s*\}/g, n);
    if (/\$\{/.test(label)) return undefined;
    out.push({ value: n, label: clean(label) });
  }
  return out.length ? out : undefined;
}

/** A value's word from any `const …_LABELS = { value: 'Word' }` map in the file. */
function labelFromMaps(src: string, raw: string): string | undefined {
  if (!/^[\w-]+$/.test(raw)) return undefined;
  for (const m of src.matchAll(/\bconst\s+[A-Z_]*LABELS?\s*=\s*\{([^{}]*)\}/g)) {
    const hit = new RegExp(`(?:^|[\\s,])'?${raw}'?\\s*:\\s*'([^']+)'`).exec(m[1])?.[1];
    if (hit) return clean(hit);
  }
  return undefined;
}

/**
 * `const IPSEC_PROPOSALS = ['aes256-…', …].map((v) => ({ value: v, label: v }))`
 * — a list of plain strings, each its own label.
 */
function stringListOptions(src: string, id: string): Array<{ value: string; label: string }> | undefined {
  const m = new RegExp(`\\bconst\\s+${id}\\s*=\\s*\\[([^\\]]*)\\]\\s*\\.map\\(\\s*\\(?(\\w+)\\)?\\s*=>\\s*\\(\\{\\s*value:\\s*\\2\\s*,\\s*label:\\s*\\2\\s*\\}\\)`).exec(src);
  if (!m) return undefined;
  const vals = quotedStrings(m[1]);
  return vals.length ? vals.map((v) => ({ value: v, label: v })) : undefined;
}

/** Per-file, set before the forms are read. */
let FALLBACKS = new Map<string, string>();
/** Per-screen: the local a banner is shown under → the banner's heading. */
let BANNERS = new Map<string, string>();

/** `disabled={managed}` → `managed`; the busy flags every form has are not locks. */
function lockLocalOf(body: string): { _lockLocal?: string } {
  const m = /\bdisabled=\{\s*([a-z]\w*)\s*\}/.exec(body)?.[1];
  return m && !/^(busy|saving|loading\w*|pending|submitting)$/i.test(m) ? { _lockLocal: m } : {};
}

/**
 * Defaults for one form: the file's own top-level constants first, then the
 * literals inside the form's component, which win.
 *
 * Falls back to the whole-file reading when neither says anything, so a
 * screen laid out some other way documents exactly as it did before.
 */
function scopedDefaults(scope: string, src: string): Map<string, string> {
  // The objects state lives in: `f`, `form`, and any other `const [track,
  // setTrack] = useState(…)` — MultiWAN keeps a policy's tracking in `track`.
  const objs = ['f', 'form', ...[...scope.matchAll(/const\s*\[\s*([a-z]\w*)\s*,\s*set\w+\s*\]\s*=\s*useState\(/g)].map((m) => m[1])];
  const keys = new Set([
    ...[...scope.matchAll(new RegExp(`\\b(?:${objs.join('|')})\\.(\\w+)`, 'g'))].map((m) => m[1]),
    // `sel('ping_timeout', SEC_OPTS)` — a helper handed the key by name.
    ...[...scope.matchAll(/\b[a-z]\w*\(\s*'(\w+)'\s*,\s*[A-Z][A-Z0-9_]*\s*\)/g)].map((m) => m[1]),
  ]);
  const top = defaultsFor(src, keys, true);
  const local = defaultsFor(scope, keys);
  // A field held in its own state: `const [behaviour, setBehaviour] =
  // useState(() => (isNew ? 'balance' : …))` — the new-record branch is the
  // default. A plain literal counts too.
  for (const m of scope.matchAll(
    /const\s*\[\s*([a-z]\w*)\s*,\s*set\w+\s*\]\s*=\s*useState\(\s*(?:\(\)\s*=>\s*\(?\s*)?(?:isNew\s*\?\s*)?(?:row\?\.\w+\s*\|\|\s*)?(?:'([^']*)'|(true|false|\d+))\s*[):]/g,
  )) {
    // Only a state a field is bound to — `busy` and `open` are not fields.
    if (!local.has(m[1]) && new RegExp(`\\b(?:value|checked)=\\{\\s*${m[1]}\\s*\\}`).test(scope)) {
      local.set(m[1], m[2] ?? m[3]);
    }
  }
  // `cipher: cfg.cipher || ''` is the EDIT fallback of a drawer that a new
  // record opens with a file-level constant — OpenVPN's Create server gets
  // `CREATE_DEFAULTS` (AES-256-GCM), not the blank. Only a fallback on `row`,
  // which a new record does not have, is the new record's value; any other
  // fallback gives way to the file's own constant.
  for (const k of [...local.keys()]) {
    if (!top.has(k)) continue;
    const decl = new RegExp(`\\b${k}:\\s*([^,\\n]*?)(?:\\|\\||\\?\\?)`).exec(scope)?.[1];
    if (decl !== undefined && !/\brow\b/.test(decl)) local.delete(k);
  }
  const merged = new Map([...top, ...local]);
  return merged.size
    ? merged
    : defaultsFor(src, new Set([...src.matchAll(/\bf\.(\w+)/g)].map((m) => m[1])));
}

/** HTML entities the console writes in prose: `device&rsquo;s`. */
const decodeEntities = (s: string) =>
  s
    .replace(/&rsquo;|&lsquo;/g, '\u2019')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');

/**
 * A literal or template, the way the screen renders it: `${row.name}` becomes
 * ‹name›, a constant is spelled out, and a ternary on `flag` takes the branch
 * `pick` chooses.
 */
function renderLiteral(
  lit: string,
  consts: Map<string, string>,
  flag?: { name: string; pick: boolean },
): string {
  let t = lit.trim().replace(/^[`'"]|[`'"]$/g, '');
  if (flag) {
    t = t.replace(
      new RegExp(`\\$\\{\\s*${flag.name}\\s*\\?\\s*'([^']*)'\\s*:\\s*'([^']*)'\\s*\\}`, 'g'),
      (_x, a: string, b: string) => (flag.pick ? a : b),
    );
  }
  t = t
    .replace(/\$\{\s*([A-Z][A-Z0-9_]*)\s*\}/g, (x, n: string) => consts.get(n) ?? x)
    // `Add ${isSource ? 'source' : 'destination'} NETMAP` \u2014 either word can
    // appear, so both are said: "Add source or destination NETMAP".
    .replace(/\$\{\s*!?[\w.?]+\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}/g, '$1 or $2')
    .replace(/\$\{\s*[\w?.]*\.name\s*\}/g, '\u2039name\u203a')
    .replace(/\$\{\s*[\w?.]*\.message\s*\}/g, '\u2039the router\u2019s reason\u203a')
    .replace(/\$\{[^}]*\}/g, '\u2039\u2026\u203a');
  return clean(t);
}

/**
 * `isNew ? 'Add BGP neighbor' : `Edit neighbor: ${row.name}`` → the add
 * wording and the edit wording. Which branch is which is read from the words
 * themselves first, and from the flag's name only when they do not say.
 */
function addEditPair(
  raw: string | undefined,
  consts: Map<string, string>,
): { add?: string; edit?: string } {
  if (!raw) return {};
  const m = /^\s*(!?)\s*([\w?.]+)\s*\?\s*('[^']*'|`[^`]*`|"[^"]*")\s*:\s*('[^']*'|`[^`]*`|"[^"]*")\s*$/.exec(raw);
  if (!m) return {};
  const a = renderLiteral(m[3], consts);
  const b = renderLiteral(m[4], consts);
  const isAdd = (x: string) => /^(Add|New|Create)\b/i.test(x);
  // Only a ternary on the record's newness is an add/edit pair. Shield's
  // `dns ? 'Search domain in blocklists' : 'Search IP in blocklists'` is two
  // drawers, not two moods of one, and reading it as add/edit dropped one.
  const flagIsNewness = /^(isNew|creating|isCreate|adding|row|existing|editing|isEdit|edit)$/.test(
    m[2].replace(/^.*\./, '').replace(/\?$/, ''),
  );
  if (!flagIsNewness && isAdd(a) === isAdd(b) && !/^Edit\b/i.test(a) && !/^Edit\b/i.test(b)) return {};
  if (isAdd(a) !== isAdd(b)) return isAdd(a) ? { add: a, edit: b } : { add: b, edit: a };
  const thenIsAdd = /^(isNew|creating|isCreate|adding)$/.test(m[2]) !== Boolean(m[1]);
  return thenIsAdd ? { add: a, edit: b } : { add: b, edit: a };
}

/** What a save handler pops up: on success for a new and an edited record, and on a router refusal. */
function toastsIn(scope: string, consts: Map<string, string>): Pick<CpeForm, 'savedToast' | 'failToast' | 'routerErrorsOnField'> {
  const out: Pick<CpeForm, 'savedToast' | 'failToast' | 'routerErrorsOnField'> = {};
  // `toast.success(savedMsg('ns.firewall', `Zone ${…}`))` — the kit adds the
  // staged suffix only for a staging service, so it is added here on the same
  // terms.
  const viaKit = /\btoast\.success\(\s*savedMsg\(\s*'([\w.-]+)'\s*,\s*(`[^`]*`|'[^']*')\s*\)/.exec(scope);
  const staged = viaKit && STAGING().has(viaKit[1]) && consts.get('STAGED');
  const ok = viaKit
    ? staged
      ? viaKit[2].replace(/[`']$/, ` \u2014 ${staged}$&`)
      : viaKit[2]
    : /\btoast\.success\(\s*(`[^`]*`|'[^']*')/.exec(scope)?.[1];
  if (ok) {
    const flag = /\$\{\s*(\w+)\s*\?/.exec(ok)?.[1];
    // `${isEdit ? 'updated' : 'configured'}` — the then-branch is the EDIT
    // wording when the flag names editing rather than newness.
    const thenIsAdd = !flag || !/^(isEdit|editing|existing|row)$/.test(flag);
    const add = renderLiteral(ok, consts, flag ? { name: flag, pick: thenIsAdd } : undefined);
    const edit = renderLiteral(ok, consts, flag ? { name: flag, pick: !thenIsAdd } : undefined);
    out.savedToast = add === edit ? { add } : { add, edit };
  }
  const bad = /\btoast\.error\(\s*`([^`$]*)\$\{\s*\w+\.message\s*\}`/.exec(scope)?.[1];
  if (bad !== undefined) out.failToast = bad.trim();
  if (/\brouterFieldErrors\(/.test(scope)) out.routerErrorsOnField = true;
  return out;
}

/**
 * The shared validators' default messages, read from `cpeValidate.js`.
 *
 * Thirty screens check their fields through one rule table — `validate(f, {
 * target: [req(), cidr()] })` — and what the operator sees on a bad value is
 * whatever message the rule carries. Reading the messages from the validator
 * file, not copying them here, is what keeps a changed wording from leaving
 * the handbook quoting an error the console no longer shows.
 */
let VALIDATORS: Map<string, string> | undefined;
// Synchronous, and read once: it is one small file, and the screen reader
// that needs it is itself synchronous.
function validatorMessages(): Map<string, string> {
  if (VALIDATORS) return VALIDATORS;
  let src = '';
  try {
    src = readFileSync(path.join(FE, 'components', 'cpe', 'cpeValidate.js'), 'utf8');
  } catch {
    // No validator file: the rule tables are left unread rather than failing.
  }
  const out = new Map<string, string>();
  for (const m of src.matchAll(/export const (\w+) = \(([^)]*)\) =>([\s\S]*?)(?=\nexport |\n\/\/|$)/g)) {
    const msg = /o\.message \|\| (['`])(.*?)\1/.exec(m[3])?.[2];
    if (msg) out.set(m[1], msg);
  }
  const reqDefault = /'(This field is required\.?)'/.exec(src)?.[1];
  if (reqDefault) out.set('req', reqDefault);
  VALIDATORS = out;
  return out;
}

/** Split `a, b(c, d), e` at its top-level commas. */
function topLevel(s: string, sep = ','): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote && s[i - 1] !== '\\') quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === sep && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
  }
  out.push(s.slice(start));
  return out.map((x) => x.trim()).filter(Boolean);
}

/** The text between the bracket at `open` and its partner, quote-aware. */
function inside(s: string, open: number): string {
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const want = pairs[s[open]];
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote && s[i - 1] !== '\\') quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === s[open]) depth++;
    else if (c === want && --depth === 0) return s.slice(open + 1, i);
  }
  return '';
}

/**
 * `req('IP address')` says "IP address is required."; `req('Pick a zone')`
 * says exactly that. This is the validator's own rule for telling the two
 * apart, restated because the message is built at run time.
 */
function reqMessage(arg: string | undefined, fallback: string): string {
  if (!arg) return fallback;
  const t = arg.trim();
  const sentence =
    /[.!?]$/.test(t) ||
    /\brequired\b/i.test(t) ||
    /^(a|the|this|these|those|both|give|pick|which|what|where|when|why|how|enter|choose|select|required|e\.g\.)\b/i.test(t) ||
    t.split(/\s+/).length > 4;
  return sentence ? t : `${t} is required.`;
}

/** One rule call — `cidr({ optional: true })` — as the sentence it shows. */
function ruleText(name: string, args: string, messages: Map<string, string>): string | undefined {
  const own = /\bmessage:\s*'([^']+)'/.exec(args)?.[1];
  const optional = /\boptional:\s*true\b/.test(args);
  let text: string | undefined;
  if (name === 'req') {
    text = reqMessage(quotedStrings(args)[0], messages.get('req') ?? 'This field is required.');
  } else if (name === 'range') {
    const [a, b] = topLevel(args);
    const tmpl = own ?? messages.get('range');
    text = tmpl?.replace('${min}', a ?? '').replace('${max}', b ?? '');
  } else {
    text = own ?? messages.get(name);
  }
  if (!text) return undefined;
  return optional ? `${text} (may be left empty)` : text;
}

/**
 * Every check a save runs, per state key.
 *
 * Two shapes: the rule table handed to `validate(f, { … })`, and a rule
 * applied on its own — `portSpec({ optional: true })(f.dest_port)` — which
 * screens use for the fields that are only checked in some modes.
 */
function validationRules(src: string, messages: Map<string, string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (key: string, text: string | undefined, conditional: boolean) => {
    if (!text) return;
    const t = conditional ? `${text} (checked only when the field applies)` : text;
    const list = out.get(key) ?? [];
    if (!list.includes(t)) list.push(t);
    out.set(key, list);
  };
  const names = [...messages.keys()].join('|');
  const call = new RegExp(`\\b(${names})\\(`, 'g');

  // `validate(f, {…})`, or `validate({ v }, {…})` for a drawer holding one
  // value in local state.
  // `const R = req()` then `username: [R]` — an alias for a rule call.
  const aliases = new Map<string, string>();
  for (const al of src.matchAll(new RegExp(`\\bconst\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*((?:${names})\\([^()]*\\))`, 'g'))) {
    aliases.set(al[1], al[2]);
  }
  for (const m of src.matchAll(/\bvalidate\(\s*(?:\w+|\{[^{}]*\})\s*,\s*\{/g)) {
    let table = inside(src, m.index + m[0].length - 1)
      // A comment in the table is prose — "…from the other end, and the
      // daemon…" — and its comma split an entry in two.
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
    for (const [al, call] of aliases) table = table.replace(new RegExp(`([\\[,]\\s*)${al}(?=\\s*[,\\]])`, 'g'), `$1${call}`);
    for (const entry of topLevel(table)) {
      const kv = /^(\w+)\s*:\s*([\s\S]*)$/.exec(entry);
      if (!kv) continue;
      // `gateway: needsGateway ? [ipv4()] : []` — checked in one case only.
      const conditional = /\?[\s\S]*:/.test(kv[2].replace(/'[^']*'/g, ''));
      for (const c of kv[2].matchAll(call)) {
        add(kv[1], ruleText(c[1], inside(kv[2], c.index + c[0].length - 1), messages), conditional);
      }
    }
  }
  // `validate(f, rules)` over `const rules = { … }` and `rules.server = [R,
  // cidr()]` set in an `if` — OpenVPN's server drawer builds its table so.
  for (const v of src.matchAll(/\bvalidate\(\s*\w+\s*,\s*([a-z]\w*)\s*\)/g)) {
    const tv = v[1];
    const decl = new RegExp(`\\bconst\\s+${tv}\\s*=\\s*\\{`).exec(src);
    if (decl) {
      const table = inside(src, decl.index + decl[0].length - 1);
      for (const entry of topLevel(table.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1'))) {
        const kv = /^(\w+)\s*:\s*([\s\S]*)$/.exec(entry);
        if (!kv) continue;
        let rhs = kv[2];
        for (const [al, callTxt] of aliases) rhs = rhs.replace(new RegExp(`([\\[,]\\s*)${al}(?=\\s*[,\\]])`, 'g'), `$1${callTxt}`);
        for (const c of rhs.matchAll(call)) add(kv[1], ruleText(c[1], inside(rhs, c.index + c[0].length - 1), messages), false);
      }
    }
    for (const a of src.matchAll(new RegExp(`\\b${tv}\\.(\\w+)\\s*=\\s*(\\[[^\\]\\n]*\\])`, 'g'))) {
      let rhs = a[2];
      for (const [al, callTxt] of aliases) rhs = rhs.replace(new RegExp(`([\\[,]\\s*)${al}(?=\\s*[,\\]])`, 'g'), `$1${callTxt}`);
      for (const c of rhs.matchAll(call)) add(a[1], ruleText(c[1], inside(rhs, c.index + c[0].length - 1), messages), true);
    }
  }
  for (const c of src.matchAll(new RegExp(`\\b(${names})\\(`, 'g'))) {
    const open = c.index + c[0].length - 1;
    const args = inside(src, open);
    const after = src.slice(open + args.length + 2, open + args.length + 40);
    const key = /^\(\s*(?:f|form)\.(\w+)\s*\)/.exec(after)?.[1];
    if (key) add(key, ruleText(c[1], args, messages), true);
  }
  return out;
}

/** `sla_enabled` → "Sla enabled", for a condition on a key no field shows. */
const humanKey = (k: string) => {
  const s = k.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * A raw condition, in the form's own words: "**Protocol** is `UDP echo`",
 * "**Latency threshold** is on".
 */
function condText(c: Cond, fields: Found[]): string {
  const f =
    fields.find((x) => x.key === c.key) ??
    (c.expr ? fields.find((x) => x._bound === c.expr) : undefined);
  if (c.disclosure) return `you open **${c.disclosure}**`;
  // `const needsGateway = ['unicast', 'local'].includes(f.type)` — named by
  // the field it tests and the values that pass, not by the local's name.
  const inc = c.expr ? /^\[([^\]]*)\]\.includes\(\s*(?:f|form)\.(\w+)\s*\)$/.exec(c.expr) : null;
  if (inc) {
    const ctl = fields.find((x) => x.key === inc[2]);
    const vals = quotedStrings(inc[1]).map((v) => `\`${ctl?.valueLabels?.[v] ?? v}\``);
    const name = `**${ctl?.label ?? humanKey(inc[2])}**`;
    return c.op === 'truthy' ? `${name} is one of ${vals.join(', ')}` : `${name} is not one of ${vals.join(', ')}`;
  }
  // `{isNew && (…)}` over `const isNew = !row`: part of the add form only.
  // …or named for it: `const isNew = !server` on the Road Warrior drawers.
  if (c.expr && (/^!\s*(row|existing|editing)\b/.test(c.expr) || /^(isNew|creating|isCreate|adding)$/.test(c.key))) {
    return c.op === 'truthy' ? 'you are adding a new record' : 'you are editing an existing record';
  }
  // The same thing said the other way round: `const editing = !!existing`,
  // `Boolean(row)`. Left unresolved it printed as "**Editing** is off", which
  // names a field the form has not got.
  if (c.expr && /^(?:!!|Boolean\()?\s*(row|existing)\b/.test(c.expr)) {
    return c.op === 'truthy' ? 'you are editing an existing record' : 'you are adding a new record';
  }
  // `const isSubnet = f.topology === 'subnet'` — a local aliasing a test on a
  // field. Named by the field and the option word, like the `.includes` case
  // above; otherwise it read as "**IsSubnet** is on".
  const eq = c.expr ? /^\s*(?:f|form)\.(\w+)\s*(===|!==)\s*'([^']*)'\s*$/.exec(c.expr) : null;
  if (eq) {
    const ctl = fields.find((x) => x.key === eq[1]);
    const word = ctl?.valueLabels?.[eq[3]] ?? eq[3];
    const name = `**${ctl?.label ?? humanKey(eq[1])}**`;
    // The local's own sense, then the condition's, so `!isSubnet` reads as
    // "is not".
    const positive = (eq[2] === '===') === (c.op !== 'falsy');
    return `${name} ${positive ? 'is' : 'is not'} \`${word}\``;
  }
  // A local that matches no field and is named like a view selector is the
  // sub-tab the reader is on, not something they set. `mwSub === 'hashes'`
  // was rendering as "**MwSub** is `hashes`", which invents a field.
  if (!f && /(?:sub|tab|view|panel)$/i.test(c.key) && c.value) {
    return c.op === '!=='
      ? `you are not on the \`${c.value}\` view`
      : `you are on the \`${c.value}\` view`;
  }

  const name = `**${f?.label ?? humanKey(c.key)}**`;
  const isSwitch = f?.options?.length === 2 && f.options[0] === 'On';
  if (c.op === 'truthy') return `${name} ${isSwitch || !f ? 'is on' : 'is set'}`;
  if (c.op === 'falsy') return `${name} ${isSwitch || !f ? 'is off' : 'is empty'}`;
  const word = f?.valueLabels?.[c.value ?? ''] ?? c.value;
  return `${name} ${c.op === '===' ? 'is' : 'is not'} \`${word}\``;
}

/** The switches laid out on the page, so a condition on one can be named. */
function pageSwitches(block: string, src: string): Found[] {
  return fieldsIn(block, src).filter((f) => f._bound !== undefined);
}

/** Turn the raw conditions collected while reading into sentences. */
function resolveFields(fields: Found[], rules: Map<string, string[]>): CpeField[] {
  // A field shown only for a value its controlling select does not offer can
  // never appear — PPPoE's two fields under a Protocol of Static or DHCP.
  const impossible = (c: Cond) => {
    if (c.op !== '===' || c.value === undefined) return false;
    const ctl = fields.find((x) => x.key === c.key);
    return Boolean(ctl?.valueLabels && Object.keys(ctl.valueLabels).length && !(c.value in ctl.valueLabels));
  };
  fields = fields.filter((x) => !(x._shown ?? []).some(impossible));
  return fields.map((raw) => {
    const { at: _at, _shown, _disabled, _required, _caseHints, _bound, _lockLocal, ...f } = raw;
    const out: CpeField = { ...f, hints: f.hints.map(unescapeJs) };
    const lockedBy = _lockLocal ? BANNERS.get(_lockLocal) : undefined;
    if (lockedBy) out.lockedWhen = lockedBy;
    if (_shown?.length) out.shownWhen = _shown.map((c) => condText(c, fields));
    if (_disabled) out.editableWhen = condText(negate(_disabled), fields);
    if (_required) out.requiredWhen = condText(_required, fields);
    if (_caseHints) {
      out.hints = _caseHints.map((h) => `When ${condText(h.cond, fields)}: ${h.text}`);
    }
    const r = f.key ? rules.get(f.key) : undefined;
    if (r?.length) out.rules = r;
    // Per-case hints are set above too; decode `\u2019` in all of them.
    out.hints = out.hints.map(unescapeJs);
    return out;
  });
}

/**
 * One top-level function's source: from its declaration to the start of the
 * next top-level declaration.
 *
 * Deliberately NOT brace-matched. These files are JSX, and a brace matcher has
 * to decide whether a `'` opens a string literal or is an apostrophe in prose
 * — "the router's own value" — and gets it wrong often enough that one
 * component swallowed the next. Every declaration in this codebase starts at
 * column zero, so the next one is a reliable end marker and needs no parsing.
 */
function functionBody(src: string, name: string): string {
  const start = new RegExp(`^(?:export\\s+)?(?:async\\s+)?function ${name}\\b`, 'm').exec(src);
  if (!start) return '';
  const from = start.index;
  const rest = src.slice(from + 1);
  const next = /^(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|const|class)\s/m.exec(rest);
  return rest.slice(0, next?.index).length ? src.slice(from, from + 1 + (next?.index ?? rest.length)) : src.slice(from);
}
/**
 * Locally-defined components that `block` renders, so their forms count as its.
 *
 * Anything behind `!hideChrome` is skipped. That is the convention these pages
 * use for "I am NOT inside the shell": the eight QoS sub-pages each render the
 * service banner and page head for when they are opened standalone, and the
 * shell passes `hideChrome` so they do not. Counting them anyway put the same
 * service toggle in all eight tabs of the write-up, where the real screen shows
 * it once, above the strip.
 */
function renderedLocals(src: string, block: string): string[] {
  let scan = block;
  for (const g of block.matchAll(/\{\s*!\s*hideChrome\s*&&\s*/g)) {
    // From the guard to the end of the expression it guards.
    let depth = 0;
    let end = g.index;
    for (let i = g.index; i < block.length; i++) {
      const c = block[i];
      if (c === '{' || c === '(') depth++;
      else if (c === '}' || c === ')') {
        if (--depth === 0) { end = i + 1; break; }
      }
    }
    scan = scan.slice(0, g.index) + ' '.repeat(end - g.index) + scan.slice(end);
  }

  const out: string[] = [];
  for (const m of scan.matchAll(/<([A-Z][\w]*)\b/g)) {
    const name = m[1];
    if (out.includes(name)) continue;
    if (!new RegExp(`\\bfunction ${name}\\s*\\(`).test(src)) continue;
    out.push(name);
  }
  return out;
}

/**
 * The sub-tabs of a screen whose tab strip dispatches to OTHER components.
 *
 * `CpeQosSectionPage` is fifty lines: a tab strip over `QOS_TABS`, whose eight
 * entries name components exported from two other files. Reading that shell
 * found a list of eight labels and not one field — which is exactly what the
 * Adaptive QoS page said, while the real screen carries four drawers, a class
 * grid and an alerts form.
 *
 * Returns [] for an ordinary screen, so callers need no special case.
 */
export async function readCpeSubPages(componentFile: string, exportName?: string): Promise<CpeSubPage[]> {
  const dir = path.join(FE, 'components', 'cpe');
  const src = await readFile(path.join(dir, componentFile), 'utf8').catch(() => '');
  if (!src) return [];

  // A third shape, and the one the shield, gateway and several VPN screens
  // use: no component per tab at all — `{tab === 'feeds' && (…)}` sections in
  // one function. Checked first, and only for a named export, so every screen
  // the two shapes below already read is left exactly as it was.
  // The file's default export stands in when the menu loads the default —
  // IPS, Anti-Spam, NAT… lay their tabs out as inline sections too.
  const inlineExport = exportName ?? defaultExportName(src);
  if (inlineExport) {
    const inline = inlineTabPages(src, inlineExport, exportName ? 2 : 3);
    if (inline.length) {
      const out: CpeSubPage[] = [];
      // Option lists and defaults a sibling-file drawer declares live in that
      // file, so it is searched alongside this one.
      const full = [src, ...IMPORTED_SRC].join('\n');
      for (const t of inline) out.push({ label: t.label, detail: await detailFrom(t.block, full) });
      return out;
    }
  }

  // Shape 4: one layout whose words switch on the tab —
  // `tab === 'server' ? 'Server tunnel' : 'Client tunnel'`.
  if (inlineExport) {
    const perTab = ternaryTabPages(src, inlineExport);
    if (perTab.length) {
      const full = [src, ...IMPORTED_SRC].join('\n');
      const out: CpeSubPage[] = [];
      for (const t of perTab) out.push({ label: t.label, detail: await detailFrom(t.block, full) });
      return out;
    }
  }

  // The tab table, and the component each entry renders. Searched in this
  // screen's own export when there is one — the file may hold several — with
  // the table constant itself still resolved against the whole file.
  const own0 = exportName ? functionBody(src, exportName) : '';
  const tabsAt = own0 ? own0.indexOf('<CpeSubTabs') : -1;
  const at = tabsAt >= 0 ? src.indexOf(own0) + tabsAt : src.indexOf('<CpeSubTabs');
  if (at < 0) return [];
  const named = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(
    attrsOf(openingTag(src, at)).get('tabs')?.value ?? '',
  )?.[1];
  if (!named) return [];
  const table = arrayConst(src, named);
  let entries = [...table.matchAll(/label:\s*'([^']+)'[^}]*?\bComponent:\s*([A-Za-z_$][\w$]*)/g)].map(
    (m) => [m[1], m[2]] as [string, string],
  );

  // A second shape, and the one DNS and DHCP uses: the tab table carries only
  // `{ key, label }`, and a lookup object elsewhere in the file maps the key to
  // the component — `{ dhcp: DhcpTab, static: StaticTab, … }[tab]`. Six screens
  // of forms hid behind that, because the tab table alone names no component.
  if (!entries.length) {
    const lookup = /\{([^{}]*:\s*[A-Z][\w$]*[^{}]*)\}\s*\[\s*tab\s*\]/.exec(src)?.[1];
    if (lookup) {
      const byKey = new Map<string, string>();
      for (const m of lookup.matchAll(/([\w-]+)\s*:\s*([A-Z][\w$]*)/g)) byKey.set(m[1], m[2]);
      entries = [...table.matchAll(/key:\s*'([^']+)'[^}]*?label:\s*'([^']+)'/g)]
        .map((m) => [m[2], byKey.get(m[1])] as [string, string | undefined])
        .filter((e): e is [string, string] => Boolean(e[1]));
    }
  }
  if (!entries.length) return [];

  // component identifier -> the file it is imported from
  const from = new Map<string, string>();
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/([^']+)'/g)) {
    for (const name of m[1].split(',').map((x) => x.trim()).filter(Boolean)) {
      from.set(name, m[2]);
    }
  }

  const cache = new Map<string, string>();
  const out: CpeSubPage[] = [];
  for (const [label, comp] of entries) {
    const file = from.get(comp) ?? componentFile;
    let text = cache.get(file);
    if (text === undefined) {
      text = await readFile(path.join(dir, file), 'utf8').catch(() => '');
      cache.set(file, text);
    }
    if (!text) continue;

    // The function's OWN body, brace-matched — not everything up to the next
    // export. The drawers live between the page components as plain top-level
    // functions, so slicing export-to-export gave Overview the Interfaces
    // drawer and Rules the interface fields.
    const own = functionBody(text, comp);
    if (!own) continue;

    // Then the local components it actually renders, which is where its own
    // form lives: `<InterfaceDrawer …/>` inside CpeQosInterfacesPage.
    const block = [own, ...renderedLocals(text, own).map((n) => functionBody(text, n) ?? '')].join('\n');

    out.push({ label: clean(label), detail: await detailFrom(block, text) });
  }
  return out;
}

export async function readCpePageDetail(
  componentFile: string,
  exportName?: string,
): Promise<CpePageDetail | undefined> {
  const src = await readFile(path.join(FE, 'components', 'cpe', componentFile), 'utf8').catch(
    () => '',
  );
  if (!src) return undefined;
  // One file, several screens: Instashield IP, Instashield DNS and DDoS are
  // three named exports of CpeSecShieldPage.jsx. Reading the whole file gave
  // each of them all fourteen tabs and every form of the other two.
  // A screen whose tabs are inline sections: the page itself is only what is
  // outside them, and each tab is documented on its own as a sub-page.
  const inlineExport = exportName ?? defaultExportName(src);
  const shell = inlineExport ? inlineTabShell(src, inlineExport, exportName ? 2 : 3) : '';
  if (shell) {
    const d = await detailFrom(shell, src);
    const body = declBody(src, inlineExport!);
    const t = inlineTabTable(src, body);
    const empty = t ? t.tabs.filter((x) => !inlineTabSpans(body, t.state, x.key).length).map((x) => x.label) : [];
    return { ...d, shell: true, ...(empty.length ? { emptyTabs: empty } : {}) };
  }
  // Shape 4's frame: the heading, the notices and the read warning — the
  // part above the tab strip. Everything below it is the tabs'.
  const t4 = inlineExport && ternaryTabPages(src, inlineExport).length ? declBody(src, inlineExport) : '';
  if (t4) {
    const cut = t4.indexOf('<CpeSubTabs');
    return { ...(await detailFrom(t4.slice(0, cut) + '\n</div>)\n}\n', src)), shell: true };
  }
  const scoped = exportName ? exportScope(src, exportName) : '';
  return detailFrom(scoped || src, src);
}

/**
 * Shape 4: one layout, worded per tab. Each tab is the export with every
 * `state === 'x'` test decided for that tab — ternaries resolved, `{state ===
 * 'x' && …}` for another tab blanked, `kind: state` spelled as the tab's key,
 * and drawers another tab opens left out.
 */
function ternaryTabPages(src: string, exportName: string): Array<{ label: string; block: string }> {
  const body = declBody(src, exportName);
  if (!body) return [];
  const t = inlineTabTable(src, body);
  if (!t || t.tabs.length < 2) return [];
  if (!new RegExp(`\\b${t.state}\\s*===\\s*'\\w+'\\s*\\?`).test(body)) return [];
  // Sections per tab are shape 3's, not this.
  if (t.tabs.filter((x) => inlineTabSpans(body, t.state, x.key).length).length >= 2) return [];
  const out: Array<{ label: string; block: string }> = [];
  for (const tab of t.tabs) {
    let text = body;
    const lits = new Set([...text.matchAll(new RegExp(`\\b${t.state}\\s*===\\s*'(\\w+)'`, 'g'))].map((m) => m[1]));
    for (const x of lits) {
      const tok = `__tab_${x}`;
      text = text.replace(new RegExp(`\\b${t.state}\\s*===\\s*'${x}'`, 'g'), tok);
      text = resolveTernary(text, tok, x === tab.key);
      // `{__tab_client && (…)}` — another tab's part: blanked; this tab's: kept.
      for (let guard = 0; guard < 30; guard++) {
        const g = new RegExp(`\\{\\s*(?:[\\w.!?]+\\s*&&\\s*)*${tok}\\s*&&\\s*`).exec(text);
        if (!g) break;
        const from = g.index + g[0].length;
        let end = from;
        if (text[from] === '(') end = closeParen(text, from) + 1;
        else if (text[from] === '<') {
          const tag = openingTag(text, from);
          const name = /^<([A-Za-z][\w.]*)/.exec(tag)?.[1] ?? '';
          const close = /\/>\s*$/.test(tag) ? -1 : text.indexOf(`</${name}>`, from);
          end = close < 0 ? from + tag.length : close + name.length + 3;
        }
        text = x === tab.key
          ? text.slice(0, g.index) + '{' + text.slice(from, end) + text.slice(end)
          : text.slice(0, g.index) + '{' + ' '.repeat(end - from) + text.slice(end);
      }
    }
    // `setDrawer({ kind: tab })` opens this tab's drawer.
    text = text.replace(new RegExp(`\\bkind:\\s*${t.state}\\b`, 'g'), `kind: '${tab.key}'`);
    // `<Icon /> {'Add server tunnel'}` — a resolved label is text again.
    text = text.replace(/(?<![=\w])\{\s*'([^'{}\n]*)'\s*\}/g, '$1');
    // Drawers opened only from another tab are not this tab's.
    const opened = new Set([...text.matchAll(/\bkind:\s*'(\w+)'/g)].map((m) => m[1]));
    for (let guard = 0; guard < 30; guard++) {
      const g = [...text.matchAll(/\{\s*(?:[\w.!?]+\s*&&\s*)*\w+\??\.kind\s*===\s*'(\w+)'\s*&&\s*\(/g)].find((m) => !opened.has(m[1]));
      if (!g) break;
      const open = g.index + g[0].length - 1;
      const end = closeParen(text, open) + 1;
      text = text.slice(0, g.index) + '{' + ' '.repeat(end - g.index - 1) + text.slice(end);
    }
    out.push({ label: tab.label, block: withLocals(src, text, new Set([exportName])) });
  }
  return out;
}

/**
 * Components documented from their call site rather than their body: the
 * one-field `EntryDrawer` is read as the form its caller describes. Reading
 * its body as well turned its optional Description into a stray form of its own.
 */
const CALL_SITE_FORMS = new Set(['EntryDrawer']);

/**
 * A top-level function's source, `export default function` included — which
 * `functionBody` does not match, so a default export read as empty.
 */
function declBody(src: string, name: string): string {
  const at = new RegExp(`^(?:export\\s+(?:default\\s+)?)?(?:async\\s+)?function\\s+${name}\\b`, 'm').exec(src);
  if (!at) return '';
  const next = /^(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|const|class)\s/m.exec(src.slice(at.index + 1));
  return src.slice(at.index, next ? at.index + 1 + next.index : src.length);
}

/** `export default function CpeSecIpsPage` → `CpeSecIpsPage`. */
function defaultExportName(src: string): string | undefined {
  return /^export\s+default\s+function\s+([A-Za-z_$][\w$]*)/m.exec(src)?.[1];
}

/** `{ key: 'feeds', label: 'Blocklist feeds' }` rows of the tab table a `<CpeSubTabs>` in `body` uses, and the state it switches. */
function inlineTabTable(src: string, body: string): { state: string; tabs: Array<{ key: string; label: string }> } | undefined {
  const at = body.indexOf('<CpeSubTabs');
  if (at < 0) return undefined;
  const attrs = attrsOf(openingTag(body, at));
  const raw = attrs.get('tabs')?.value ?? '';
  const named = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(raw)?.[1];
  const state = /^\s*([a-z]\w*)\s*$/.exec(attrs.get('active')?.value ?? '')?.[1];
  // `tabs={[{ key: 'server', label: 'Server tunnel' }, …]}` — written inline.
  const inlineTable = /^\s*\[/.test(raw) ? raw : '';
  if ((!named && !inlineTable) || !state) return undefined;
  const table = named ? arrayConst(src, named) : inlineTable;
  // A table that names a component per tab is one of the other two shapes.
  if (/\bComponent:/.test(table)) return undefined;
  const tabs = [...table.matchAll(/key:\s*'([^']+)'[^}]*?label:\s*'([^']+)'/g)].map((m) => ({ key: m[1], label: clean(m[2]) }));
  return tabs.length ? { state, tabs } : undefined;
}

/** Where `{state === 'key' && …}` sits in `body`, to the end of what it guards. */
function inlineTabSpans(body: string, state: string, key: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  // `{on && tab === 'policy' && (…)}` — a guard before the tab test is fine.
  // …and after it: `{tab === 'settings' && on && <BayesSummaryCard />}`.
  const re = new RegExp(`\\{\\s*(?:[\\w.!?]+\\s*&&\\s*)*${state}\\s*===\\s*'${key}'\\s*&&\\s*(?:[\\w.!?]+\\s*&&\\s*)*`, 'g');
  for (const m of body.matchAll(re)) {
    const from = m.index + m[0].length;
    let end: number;
    if (body[from] === '(') end = closeParen(body, from) + 1;
    else if (body[from] === '<') {
      const tag = openingTag(body, from);
      const name = /^<([A-Za-z][\w.]*)/.exec(tag)?.[1] ?? '';
      if (/\/>\s*$/.test(tag)) end = from + tag.length;
      else {
        const close = body.indexOf(`</${name}>`, from);
        end = close < 0 ? from + tag.length : close + name.length + 3;
      }
    } else continue;
    out.push([m.index, end]);
  }
  return out;
}

/**
 * The drawers a piece of a screen opens, and the markup that renders them.
 *
 * `onAdd={() => setDrawer({ kind: 'allowed' })}` inside a tab opens the
 * `{drawer && (<EntryDrawer … />)}` rendered outside every tab. The render is
 * resolved for that kind — `drawer.kind === 'allowed' ? 'Allowed address' :
 * 'Blocked address'` becomes 'Allowed address' — so a drawer shared by two
 * tabs reads as the one each tab actually opens.
 */
function drawersOpenedBy(part: string, body: string): string[] {
  const out: string[] = [];
  const opened = new Map<string, Set<string>>();
  // Also `setProfileDrawer({})` / `setProfileDrawer(p)`: a drawer state set
  // to anything but null opens it, with no kind to tell drawers apart.
  for (const m of part.matchAll(/\bset([A-Z]\w*)\(\s*(?:\{[^{}]*?\bkind:\s*'(\w+)'|true\b|(?=[\w{])(?!null\b|false\b|undefined\b)(?<=\bset(?:[A-Z]\w*)?(?:Drawer|Modal|Dialog)\(\s*))/g)) {
    const v = m[1].charAt(0).toLowerCase() + m[1].slice(1);
    const kinds = opened.get(v) ?? new Set<string>();
    if (m[2]) kinds.add(m[2]);
    opened.set(v, kinds);
  }
  for (const [v, kinds] of opened) {
    // `{drawer && (…)}`, `{drawer?.kind === 'x' && (…)}`, and DNS's
    // `{drawer && drawer.kind !== 'bypass' && (…)}`.
    // Further guards may follow: `{serverDrawer && !wgSrvDefsPending && (…)}`.
    const re = new RegExp(`\\{\\s*${v}\\b((?:\\s*&&\\s*${v})?\\??\\.kind\\s*(===|!==)\\s*'(\\w+)')?\\s*&&\\s*(?:!?[\\w.?]+\\s*&&\\s*)*`, 'g');
    for (const m of body.matchAll(re)) {
      if (m[1] && kinds.size) {
        const match = m[2] === '===' ? kinds.has(m[3]) : [...kinds].some((k) => k !== m[3]);
        if (!match) continue;
      }
      const from = m.index + m[0].length;
      let text: string;
      if (body[from] === '(') text = body.slice(from, closeParen(body, from) + 1);
      else if (body[from] === '<') text = openingTag(body, from);
      else continue;
      if (!kinds.size) { out.push(text); continue; }
      for (const k of kinds) {
        if (m[1] && (m[2] === '===' ? k !== m[3] : k === m[3])) continue;
        out.push(bindKind(text, v, k));
      }
    }
  }
  return out;
}

/** Resolve every `v.kind === 'X' ? A : B` in `text` as though `v.kind` were `k`. */
function bindKind(text: string, v: string, k: string): string {
  let t = text;
  const lits = new Set([...t.matchAll(new RegExp(`\\b${v}\\??\\.kind\\s*===\\s*'(\\w+)'`, 'g'))].map((m) => m[1]));
  for (const x of lits) {
    const tok = `__kind_${x}`;
    t = t.replace(new RegExp(`\\b${v}\\??\\.kind\\s*===\\s*'${x}'`, 'g'), tok);
    t = resolveTernary(t, tok, x === k);
  }
  // `kind={profileDrawer.kind}` handed on as a prop: the value is now known.
  t = t.replace(new RegExp(`\\b${v}\\??\\.kind\\b(?!\\s*[=!]==)`, 'g'), `'${k}'`);
  return t;
}

/**
 * `text` plus every top-level function of `src` it renders or calls, followed
 * until nothing new turns up. A component rendered with a fixed prop —
 * `<SearchDrawer dns={false} />` — has its ternaries on that prop resolved, so
 * it reads as the drawer this screen shows rather than the first branch.
 */
function withLocals(src: string, text: string, skip: Set<string>): string {
  const declared = new Set(
    [...src.matchAll(/^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]),
  );
  const seen = new Set<string>(skip);
  const parts = [text];
  const queue: Array<[string, string]> = [['', text]];
  // Components imported from a sibling file — DDoS's `import DosProfileDrawer
  // from './CpeSecDosProfile.jsx'` — are this screen's drawers too.
  const imported = new Map<string, string>();
  for (const m of src.matchAll(/^import\s+(?:([A-Z][\w$]*)|\{([^}]*)\})\s+from\s+'\.\/([\w.-]+\.jsx)'/gm)) {
    for (const n of m[1] ? [m[1]] : m[2].split(',').map((x) => x.trim().split(/\s+as\s+/).pop()!).filter(Boolean)) {
      if (/^[A-Z]/.test(n)) imported.set(n, m[3]);
    }
  }
  const bodyOf = (ref: string): string => {
    if (declared.has(ref)) return functionBody(src, ref);
    const file = imported.get(ref);
    if (!file) return '';
    const other = siblingSource(file);
    const at = new RegExp(`^export\\s+(?:default\\s+)?function\\s+${ref}\\b`, 'm').exec(other);
    if (!at) return '';
    const next = /^(?:export\s+(?:default\s+)?)?(?:async\s+)?(?:function|const|class)\s/m.exec(other.slice(at.index + 1));
    IMPORTED_SRC.add(other);
    return other.slice(at.index, next ? at.index + 1 + next.index : other.length);
  };
  while (queue.length) {
    const [, from] = queue.shift()!;
    for (const m of from.matchAll(/<([A-Z][\w$]*)\b|\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const ref = m[1] ?? m[2];
      if (!ref || !(declared.has(ref) || imported.has(ref)) || CALL_SITE_FORMS.has(ref)) continue;
      // Once per component — or once per set of literal props it is rendered
      // with: Anti-Spam renders ProfileDrawer as kind 'antispam' and kind
      // 'action', and those are two different drawers.
      const litProps = m[1]
        ? [...openingTag(from, m.index).matchAll(/\b(\w+)=(?:"([^"]*)"|\{\s*'([^']*)'\s*\}|\{\s*(true|false)\s*\})/g)]
            .map((p) => `${p[1]}=${p[2] ?? p[3] ?? p[4]}`)
            .join('&')
        : '';
      const seenKey = litProps ? `${ref}?${litProps}` : ref;
      if (seen.has(seenKey) || (seen.has(ref) && !litProps)) continue;
      seen.add(seenKey);
      seen.add(ref);
      let body = bodyOf(ref);
      if (!body) continue;
      if (m[1]) {
        const attrs = attrsOf(openingTag(from, m.index));
        // Defaults from the signature — `function SearchIpDrawer({ kind = 'ip' })`
        // — stand in for any prop the call site leaves out.
        const sig = /^[^(]*\(\s*\{([^}]*)\}/.exec(body)?.[1] ?? '';
        for (const d of sig.matchAll(/(\w+)\s*=\s*(?:'([^']*)'|(true|false))/g)) {
          if (!attrs.has(d[1])) attrs.set(d[1], d[2] !== undefined ? { quoted: true, value: d[2] } : { quoted: false, value: d[3] });
        }
        for (const [name, a0] of attrs) {
          // `kind={'antispam'}` — a literal in braces is a string prop.
          const lit = !a0.quoted ? /^\s*'([^']*)'\s*$/.exec(a0.value)?.[1] : undefined;
          const a = lit !== undefined ? { quoted: true, value: lit } : a0;
          const bool = a.quoted ? undefined : a.value === '' || a.value.trim() === 'true' ? true : a.value.trim() === 'false' ? false : undefined;
          if (bool !== undefined) {
            const tok = `__prop_${name}`;
            body = body.replace(new RegExp(`\\b${name}\\s*\\?(?![.?])`, 'g'), `${tok} ?`);
            body = resolveTernary(body, tok, bool);
          } else if (a.quoted) {
            // `const dns = kind === 'domain'` — a local that is now a constant.
            // Read before the prop itself is substituted below, which rewrites
            // the very expression this looks for.
            for (const x of [...body.matchAll(new RegExp(`\\bconst\\s+(\\w+)\\s*=\\s*${name}\\s*===\\s*'(\\w+)'`, 'g'))]) {
              const tok = `__local_${x[1]}`;
              body = body.replace(new RegExp(`\\b${x[1]}\\s*\\?(?![.?])`, 'g'), `${tok} ?`);
              body = resolveTernary(body, tok, x[2] === a.value);
            }
            for (const x of new Set([...body.matchAll(new RegExp(`\\b${name}\\s*===\\s*'(\\w+)'`, 'g'))].map((y) => y[1]))) {
              const tok = `__prop_${name}_${x}`;
              body = body.replace(new RegExp(`\\b${name}\\s*===\\s*'${x}'`, 'g'), tok);
              body = resolveTernary(body, tok, x === a.value);
            }
          }
        }
      }
      // `const colLabel = 'Allowed address'` (what a resolved ternary leaves)
      // used as `label: colLabel` — spelled out, so the column is named.
      for (const c of [...body.matchAll(/\bconst\s+(\w+)\s*=\s*'([^']+)'\s*\n/g)]) {
        body = body.replace(new RegExp(`\\b(label|title):\\s*${c[1]}\\b`, 'g'), `$1: '${c[2]}'`);
        // …and inside a template: `Add ${title}` → `Add AntiSpam profile`.
        body = body.replace(new RegExp(`\\$\\{\\s*${c[1]}\\s*\\}`, 'g'), c[2]);
      }
      parts.push(body);
      queue.push([ref, body]);
    }
  }
  return parts.join('\n');
}

/** A sibling component file, read once. */
const SIBLINGS = new Map<string, string>();
function siblingSource(file: string): string {
  if (!SIBLINGS.has(file)) {
    let t = '';
    try {
      t = readFileSync(path.join(FE, 'components', 'cpe', file), 'utf8');
    } catch {
      // not there: nothing to add
    }
    SIBLINGS.set(file, t);
  }
  return SIBLINGS.get(file)!;
}
/** Sibling files a walk pulled bodies from, so their constants resolve too. */
const IMPORTED_SRC = new Set<string>();

/**
 * The handlers a tab calls that ask before acting: `const clearCache = async
 * () => { confirm({…}) }` in the screen's body, used as `onClick={clearCache}`
 * inside the tab; or a hook's returned function — `const { remove } =
 * useEntryActions(…)` — whose confirm lives in the hook. Defined once above
 * the tabs, they are still what each tab's Delete asks.
 */
function handlersUsedBy(part: string, body: string, src: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/\bconst\s+(\w+)\s*=\s*async\b[\s\S]*?\n  \}\n/g)) {
    if (!/\bconfirm\(\s*\{/.test(m[0])) continue;
    if (new RegExp(`\\b${m[1]}\\b`).test(part)) out.push(m[0]);
  }
  for (const m of body.matchAll(/\bconst\s*\{([^}]*)\}\s*=\s*(use[A-Z]\w*)\(/g)) {
    const names = m[1].split(',').map((x) => x.trim().split(/\s*:\s*/).pop()!).filter(Boolean);
    if (!names.some((n) => new RegExp(`\\b${n}\\(`).test(part))) continue;
    const hook = functionBody(src, m[2]);
    if (hook && /\bconfirm\(\s*\{/.test(hook)) out.push(hook);
  }
  return out;
}

/** Each inline tab of an export, as the block that documents it. */
/**
 * `min` is how many inline sections make it this shape. A default export needs
 * three: a two-tab screen such as MultiWAN (a manager tab and a settings tab)
 * already reads well as one page, and splitting it lost its per-list steps.
 */
function inlineTabPages(src: string, exportName: string, min = 2): Array<{ label: string; block: string }> {
  const body = declBody(src, exportName);
  if (!body) return [];
  const t = inlineTabTable(src, body);
  if (!t) return [];
  const out: Array<{ label: string; block: string }> = [];
  for (const tab of t.tabs) {
    const spans = inlineTabSpans(body, t.state, tab.key);
    if (!spans.length) continue;
    const part = spans.map(([a, b]) => body.slice(a, b)).join('\n');
    const drawers = drawersOpenedBy(part, body);
    out.push({
      label: tab.label,
      block: withLocals(src, [part, ...drawers, ...handlersUsedBy(part, body, src)].join('\n'), new Set([exportName])),
    });
  }
  // Too few tabs found as sections: not this shape after all.
  return out.length >= min ? out : [];
}

/** The export with its inline tabs and the drawers they open blanked out. */
function inlineTabShell(src: string, exportName: string, min = 2): string {
  const body = declBody(src, exportName);
  if (!body) return '';
  const t = inlineTabTable(src, body);
  if (!t) return '';
  const spans = t.tabs.flatMap((tab) => inlineTabSpans(body, t.state, tab.key));
  if (t.tabs.filter((tab) => inlineTabSpans(body, t.state, tab.key).length).length < min) return '';
  let shell = body;
  const blank = (a: number, b: number) => { shell = shell.slice(0, a) + ' '.repeat(b - a) + shell.slice(b); };
  for (const [a, b] of spans) blank(a, b);
  // Drawers opened from inside a tab are that tab's, not the page's.
  const inside = spans.map(([a, b]) => body.slice(a, b)).join('\n');
  for (const d of drawersOpenedBy(inside, body)) {
    const at = shell.indexOf(d);
    if (at >= 0) blank(at, at + d.length);
  }
  for (const m of body.matchAll(/\{\s*(\w+)\b(?:(?:\s*&&\s*\w+)?\??\.kind\s*(?:===|!==)\s*'\w+')?\s*&&\s*(?:!?[\w.?]+\s*&&\s*)*[(<]/g)) {
    // `{drawer && (…)}` whose opener lives in a tab.
    const setter = `set${m[1].charAt(0).toUpperCase()}${m[1].slice(1)}(`;
    if (!inside.includes(setter)) continue;
    const from = m.index + m[0].length - 1;
    const end = body[from] === '(' ? closeParen(body, from) + 1 : from + openingTag(body, from).length;
    blank(m.index, end);
  }
  return withLocals(src, shell, new Set([exportName]));
}

/**
 * One export and every top-level function it uses — the components it
 * renders (`<LocalListTab`) and the hooks and helpers it calls
 * (`useEntryActions(…)`, where the delete dialog lives) — followed until
 * nothing new turns up. Empty when the export is not in the file, so a caller
 * falls back to reading the whole file rather than nothing.
 */
export function exportScope(src: string, exportName: string): string {
  const declared = new Set(
    [...src.matchAll(/^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]),
  );
  if (!declared.has(exportName)) return '';
  const seen = new Set<string>([exportName]);
  const queue = [exportName];
  const parts: string[] = [];
  while (queue.length) {
    const name = queue.shift()!;
    const body = functionBody(src, name);
    if (!body) continue;
    parts.push(body);
    for (const m of body.matchAll(/<([A-Z][\w$]*)\b|\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const ref = m[1] ?? m[2];
      if (ref && declared.has(ref) && !seen.has(ref) && !CALL_SITE_FORMS.has(ref)) {
        seen.add(ref);
        queue.push(ref);
      }
    }
  }
  return parts.join('\n');
}

/**
 * `isX ? A : B` with `isX` fixed, everywhere in `text`.
 *
 * For a drawer written once for two lists, where every prop is a ternary on
 * which list it was opened from. Resolving the ternaries gives two ordinary
 * drawers the rest of the reader already understands.
 */
function resolveTernary(text: string, id: string, pick: boolean): string {
  const re = new RegExp(`\\b${id}\\s*\\?`, 'g');
  let out = text;
  for (let guard = 0; guard < 50; guard++) {
    re.lastIndex = 0;
    const m = re.exec(out);
    if (!m) break;
    const thenAt = m.index + m[0].length;
    const [thenEnd, elseEnd] = ternaryEnds(out, thenAt);
    if (thenEnd < 0) break;
    const chosen = pick ? out.slice(thenAt, thenEnd) : out.slice(thenEnd + 1, elseEnd);
    out = out.slice(0, m.index) + chosen.trim() + out.slice(elseEnd);
  }
  return out;
}
/** From just after `?`: where the `:` is, and where the else-branch ends. */
function ternaryEnds(s: string, from: number): [number, number] {
  let depth = 0;
  let quote: string | null = null;
  let colon = -1;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === quote && s[i - 1] !== '\\') quote = null; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) { depth++; continue; }
    if (')]}'.includes(c)) {
      if (depth === 0) return colon < 0 ? [-1, -1] : [colon, i];
      depth--;
      continue;
    }
    if (depth !== 0) continue;
    // A nested `a ? b : c` in the then-branch would need its own colon; none
    // of the drawers this is for nest them, so the first depth-0 colon wins.
    if (c === ':' && colon < 0) { colon = i; continue; }
    if (colon >= 0 && (c === ',' || c === ';' || c === '\n')) {
      // A newline only ends the branch when the next line does not continue it.
      if (c === '\n' && /^\s*[.?:&|+]/.test(s.slice(i + 1, i + 40))) continue;
      return [colon, i];
    }
  }
  return colon < 0 ? [-1, -1] : [colon, s.length];
}

/**
 * A drawer title written as a template — `${existing ? 'Edit' : 'Add'}
 * neighbour` — read the way a NEW record shows it: "Add neighbour".
 */
function templateTitle(raw: string): string | undefined {
  const t = /^\s*`([^`]*)`\s*$/.exec(raw)?.[1];
  if (t === undefined) return undefined;
  const text = t
    // `${'neighbour'}` — what a resolved ternary leaves behind.
    .replace(/\$\{\s*'([^']*)'\s*\}/g, '$1')
    .replace(/\$\{[^}]*?\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}/g, (_x, a: string, b: string) =>
      /^(Add|New|Create)\b/i.test(b) ? b : a,
    );
  return /\$\{/.test(text) ? undefined : clean(text);
}

/**
 * A card heading or description written as a template.
 *
 * `` `Access${users.length ? ` (${users.length})` : ''}` `` is just "Access";
 * `` `Accounts allowed to dial into ${active.server_name}.` `` is that
 * sentence with a slot in it. `templateTitle` gives up on any leftover `${}`,
 * which is right for a form title but wrong here — it dropped the card that
 * holds WireGuard's account list from the screen's contents entirely, while
 * its columns were still listed underneath.
 */
function templateProse(raw: string): string | undefined {
  const t = /^\s*`([\s\S]*)`\s*$/.exec(raw)?.[1];
  if (t === undefined) return undefined;
  // Brace-matched, not regexed: `${users.length ? ` (${users.length})` : ''}`
  // nests a template inside a slot, and a non-greedy `\$\{[^}]*\}` stops at the
  // first inner `}`, leaving ")`: ''}" in the heading.
  let out = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== '$' || t[i + 1] !== '{') {
      out += t[i];
      continue;
    }
    let depth = 0;
    let j = i + 1;
    for (; j < t.length; j++) {
      if (t[j] === '{') depth++;
      else if (t[j] === '}' && --depth === 0) break;
    }
    const slot = t.slice(i + 2, j);
    // `${active.server_name || 'this server'}` — the code's own fallback is
    // the best word for the slot, and it is already written for a reader.
    const fallback = /(?:\|\||\?\?)\s*'([^']+)'\s*$/.exec(slot.trim())?.[1];
    out += fallback ?? ' ';
    i = j;
  }
  const text = clean(out)
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/\(\s*\)/g, '');
  return text.length >= 3 ? clean(text) : undefined;
}

/** Where the `<Card` at `at` closes, counting the cards nested inside it. */
function cardEnd(src: string, at: number): number {
  let depth = 0;
  const re = /<Card\b|<\/Card>/g;
  re.lastIndex = at;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[0] === '</Card>') {
      if (--depth === 0) return m.index;
    } else if (!/\/>\s*$/.test(openingTag(src, m.index))) depth++;
  }
  return src.length;
}

/** `const NOUN = { neighbor: 'neighbor', … }` → key → string. */
function objectConst(src: string, id: string): Map<string, string> {
  const m = new RegExp(`\\bconst\\s+${id}\\s*=\\s*\\{([^}]*)\\}`).exec(src);
  const out = new Map<string, string>();
  for (const kv of m?.[1].matchAll(/(\w+):\s*'([^']*)'/g) ?? []) out.set(kv[1], kv[2]);
  return out;
}

/** `STAGING_SERVICES` in cpeKit.jsx — the services whose saves wait for Apply. */
let STAGING_CACHE: Set<string> | undefined;
function STAGING(): Set<string> {
  if (STAGING_CACHE) return STAGING_CACHE;
  try {
    const kit = readFileSync(path.join(FE, 'components', 'cpe', 'cpeKit.jsx'), 'utf8');
    STAGING_CACHE = new Set(quotedStrings(/STAGING_SERVICES\s*=\s*new Set\(\[([^\]]*)\]/.exec(kit)?.[1] ?? ''));
  } catch {
    STAGING_CACHE = new Set();
  }
  return STAGING_CACHE;
}

/** The string constants the kit exports — `STAGED`, spelled out in every toast. */
let KIT_CACHE: Map<string, string> | undefined;
function KIT_CONSTS(): Map<string, string> {
  if (KIT_CACHE) return KIT_CACHE;
  try {
    KIT_CACHE = stringConstants(readFileSync(path.join(FE, 'components', 'cpe', 'cpeKit.jsx'), 'utf8'));
  } catch {
    KIT_CACHE = new Map();
  }
  return KIT_CACHE;
}

/**
 * A state a card shows instead of rows, in either of the two markups: the
 * hand-written `cpepg__emptyT` block, and the `<EmptyBlock title hint>`
 * component. DPI's Policy tab is the second kind, and its whole content —
 * "DPI Policy Not Available / Application control policies require the SD-WAN
 * Controller" — went unread because only the first was looked for.
 */
function statesIn(body: string): Array<{ title: string; note?: string; action?: string }> {
  const out: Array<{ title: string; note?: string; action?: string }> = [];
  const push = (title: string, note?: string, action?: string) => {
    const t = clean(title);
    if (!t || out.some((x) => x.title === t)) return;
    out.push({ title: t, ...(note ? { note: clean(note) } : {}), ...(action ? { action } : {}) });
  };

  for (const em of body.matchAll(/cpepg__emptyT">([^<{]{3,60})</g)) {
    const after = body.slice(em.index, em.index + 500);
    const note = /className="hint">\s*([^<{]{10,300}?)\s*</.exec(after)?.[1];
    const btn = /<button[\s\S]{0,200}?>([\s\S]{0,80}?)<\/button>/.exec(after);
    push(em[1], note, btn ? clean(plainTextOf(btn[1])) : undefined);
  }

  for (const at of tagsNamed(body, 'EmptyBlock')) {
    const attrs = attrsOf(openingTag(body, at));
    const title = prop(attrs, 'title');
    if (title) push(title, prop(attrs, 'hint') ?? prop(attrs, 'sub'));
  }
  return out;
}

/**
 * A standing notice: a bold heading followed immediately by a hint line.
 *
 * The wrapper's class differs per screen (`antispam__how`, `geoblk__warn`,
 * `cpepg__managed`), so the shape is matched rather than the class. Requiring
 * the hint to follow the heading directly is what keeps a `<strong>` in a
 * table cell out of it.
 */
function noticesIn(body: string, insideForm = false): Array<{ title: string; text: string }> {
  const out: Array<{ title: string; text: string }> = [];

  // A notice written inside a drawer belongs to that form, not to the screen.
  // OpenVPN Road Warrior's "Dynamic range IP" box sits above the drawer's
  // range fields and was being lifted to the top of the page, where it reads
  // as something about the screen as a whole.
  const drawers: Array<[number, number]> = [];
  for (const name of ['EntityDrawer', 'EntryDrawer']) {
    for (const at of tagsNamed(body, name)) {
      const close = body.indexOf(`</${name}>`, at);
      drawers.push([at, close < 0 ? body.length : close]);
    }
  }

  const re = /<strong>([^<{]{3,60})<\/strong>\s*<div className="hint">\s*([^<{]{10,400}?)\s*<\/div>/g;
  for (const m of body.matchAll(re)) {
    if (!insideForm && drawers.some(([a, b]) => m.index > a && m.index < b)) continue;
    const title = clean(decodeEntities(m[1]));
    const text = clean(decodeEntities(m[2]));
    if (!title || !text || out.some((n) => n.title === title)) continue;
    out.push({ title, text });
  }
  return out;
}

/**
 * Read one screen out of `block`, using `src` for whatever is declared outside
 * it — the option lists, the defaults literal, the validation messages.
 *
 * The two are the same file for an ordinary screen. They differ for a sub-tab:
 * Adaptive QoS is a shell whose eight tabs are separate exported functions in
 * two other files, so each tab is read as its own block against the file that
 * declares it. Without the split, the biggest screen in the tab documented as
 * "it is divided into 8 sub-tabs" and nothing else.
 */
/** Where the `<div` at `at` closes, counting the divs nested in it. */
function divEnd(s: string, at: number): number {
  let depth = 0;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = at;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m[0] === '</div>') {
      if (--depth === 0) return m.index + 6;
    } else if (!/\/>\s*$/.test(openingTag(s, m.index))) depth++;
  }
  return s.length;
}

/**
 * `{FAMILIES.map((fam) => (<Field label={`${fam.label} — packets per second`}>…))}`
 * written out once per entry of the constant, with `fam.label` / `fam.hint`
 * spelled in. Only loops that render a `<Field>` with a template label: a
 * checkbox group mapped over PROTOS is read by its own rule.
 */
function unrollFieldMaps(block: string, src: string): string {
  let out = block;
  for (let guard = 0; guard < 20; guard++) {
    const m = /\{\s*([A-Z][A-Z0-9_]*)\.map\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\(?/.exec(out);
    if (!m) break;
    const open = out.indexOf('(', m.index + m[0].indexOf('.map') + 4);
    const close = closeParen(out, open);
    // Past the `)}` that ends the map expression.
    const end = out.indexOf('}', close) + 1;
    const inner = out.slice(m.index + m[0].length, close);
    const v = m[2];
    if (!new RegExp(`<Field\\b[^>]*label=\\{\\s*\`[^\`]*\\$\\{\\s*${v}\\.`).test(inner)) {
      // Not a field loop: hide it from this search without changing it.
      out = out.slice(0, m.index) + out.slice(m.index, end).replace('.map(', '.\u200bmap(') + out.slice(end);
      continue;
    }
    const table = arrayConst(src, m[1]);
    const items = [...table.matchAll(/\{([^{}]*)\}/g)].map((it) => {
      const props = new Map<string, string>();
      for (const kv of it[1].matchAll(/(\w+):\s*'([^']*)'/g)) props.set(kv[1], kv[2]);
      return props;
    });
    const copies = items.map((props) =>
      inner
        .replace(new RegExp(`\\$\\{\\s*${v}\\.(\\w+)\\s*\\}`, 'g'), (_x, k: string) => props.get(k) ?? '')
        .replace(new RegExp(`\\{\\s*${v}\\.(\\w+)\\s*\\}`, 'g'), (_x, k: string) => props.get(k) ?? '')
        // A template with nothing left to fill is a plain string now.
        .replace(/=\{\s*`([^`$"]*)`\s*\}/g, '="$1"'),
    );
    out = out.slice(0, m.index) + copies.join('\n') + out.slice(end);
  }
  return out.replace(/\.\u200bmap\(/g, '.map(');
}

async function detailFrom(block: string, src: string): Promise<CpePageDetail> {
  block = unrollFieldMaps(block, src);
  // ---- standing notices, and the fields each one locks
  //
  // Read first: the forms below mark a field locked by the banner it is
  // keyed to, and they are resolved as they are read.
  const banners: CpePageDetail['banners'] = [];
  BANNERS = new Map();
  for (const m of block.matchAll(/\{\s*([a-z]\w*)\s*&&\s*\(\s*<div className="cpepg__managed">/g)) {
    const body = block.slice(m.index, m.index + 1500);
    const title = clean(decodeEntities(plainTextOf(/<strong>([\s\S]*?)<\/strong>/.exec(body)?.[1] ?? '')));
    if (!title) continue;
    const text = clean(decodeEntities(plainTextOf(/className="hint">([\s\S]*?)<\/div>/.exec(body)?.[1] ?? '')));
    BANNERS.set(m[1], title);
    banners.push({ title, ...(text ? { text } : {}), locks: [] });
  }
  const kitConsts = new Map([...KIT_CONSTS(), ...stringConstants(src)]);

  // ---- how often it re-reads the router
  const refresh = /\bconst\s+POLL_MS\s*=\s*(\d+)/.exec(block)?.[1];

  // ---- sub-tabs, which the CPE menu does not know about
  const subTabs: string[] = [];
  for (const at of tagsNamed(block, 'CpeSubTabs')) {
    const tabs = attrsOf(openingTag(block, at)).get('tabs')?.value ?? '';
    const named = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(tabs)?.[1];
    const list = named ? arrayConst(src, named) : tabs;
    for (const l of labelsIn(list)) if (!subTabs.includes(l)) subTabs.push(l);
  }

  // ---- the sections of the page
  // A state declared outside any card and reused by several tabs. Collected
  // before the cards so their own spans can be subtracted from it below.
  const screenStates: CpePageDetail['screenStates'] = [];

  const cards: CpeCard[] = [];
  const seenCard = new Set<string>();
  for (const at of tagsNamed(block, 'Card')) {
    const attrs = attrsOf(openingTag(block, at));
    const title =
      heading(attrs, 'title') ?? templateProse(attrs.get('title')?.value ?? '');
    if (!title || looksLikeClassName(title) || seenCard.has(title)) continue;
    seenCard.add(title);
    // `desc` and `info` are the same thing worn two ways: one prints under the
    // heading, the other behind an info icon.
    const blurb =
      prop(attrs, 'desc') ??
      prop(attrs, 'info') ??
      templateProse(attrs.get('desc')?.value ?? '') ??
      templateProse(attrs.get('info')?.value ?? '');

    // A card with no list shows a state instead of rows, often one per
    // branch of a ternary: "Hotspot is running" / "No hotspot configured".
    // Bounded to this card so a later card's empty state is not read as this
    // one's.
    const cardEnd = (() => {
      const next = tagsNamed(block, 'Card').find((p) => p > at);
      const close = block.indexOf('</Card>', at);
      return Math.min(next ?? block.length, close < 0 ? block.length : close);
    })();
    const body = block.slice(at, cardEnd);
    const states = statesIn(body);

    // Buttons in the card's own header. Icon-only ones carry their meaning in
    // `title`/`aria-label` and are named by it; the rest by their text.
    const header = attrsOf(openingTag(block, at)).get('action')?.value ?? '';
    const actions: string[] = [];
    for (const bt of tagsNamed(header, 'button')) {
      const tag = openingTag(header, bt);
      const close = header.indexOf('</button>', bt);
      const text = close < 0 ? '' : clean(plainTextOf(header.slice(bt + tag.length, close)));
      const label = text || prop(attrsOf(tag), 'title') || prop(attrsOf(tag), 'aria-label') || '';
      // The add button is already reported on its own, and a bare Refresh is
      // on every card in the tab — neither is worth a line.
      // Collapse/Expand are ways of looking at the card, not things it does.
      if (!label || /^(Add|New|Create|Refresh|Reload|Collapse|Expand|Close)\b/i.test(label)) continue;
      if (label.length <= 40 && !actions.includes(label)) actions.push(label);
    }

    cards.push({
      title,
      ...(blurb ? { blurb } : {}),
      ...(states.length ? { states } : {}),
      ...(actions.length ? { actions } : {}),
    });
  }

  // Whatever `cpepg__emptyT` the cards did not claim belongs to the screen.
  {
    const claimed = new Set<string>(cards.flatMap((c) => (c.states ?? []).map((st) => st.title)));
    for (const st of statesIn(block)) {
      if (claimed.has(st.title) || screenStates.some((x) => x.title === st.title)) continue;
      screenStates.push(st);
    }
  }

  // ---- the tables and what they say when empty
  const tables: CpeTableSpec[] = [];
  const tableAt: number[] = [];
  for (const at of tagsNamed(block, 'CpeTable')) {
    const attrs = attrsOf(openingTag(block, at));
    const cols = labelsIn(attrs.get('columns')?.value ?? '');
    if (!cols.length) continue;
    const empty = prop(attrs, 'empty');
    const emptyHint = prop(attrs, 'emptyHint');
    tableAt.push(at);
    tables.push({
      columns: cols,
      ...(empty ? { empty } : {}),
      ...(emptyHint ? { emptyHint } : {}),
    });
  }

  // A hand-written `<table>` rather than the shared one. Six screens lay their
  // list out directly, and reading only `CpeTable` documented them as having
  // no list at all.
  for (const m of block.matchAll(/<thead>([\s\S]{0,1200}?)<\/thead>/g)) {
    const heads = [...m[1].matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map((x) => clean(x[1])).filter(Boolean);
    // `{monitors.map((mon) => <th>{mon}</th>)}` — a header per record the
    // router returned. Printed as a column it read as a column called
    // "{mon}"; what it actually says is "one column per monitor".
    let dynamic: string | undefined;
    const cols = heads.filter((h) => {
      const v = /^\{\s*(\w+)\s*\}$/.exec(h)?.[1];
      if (!v) return true;
      const arr = new RegExp(`(\\w+)\\.map\\(\\s*\\(?\\s*${v}\\b`).exec(m[1])?.[1];
      if (arr) dynamic = arr.replace(/ies$/, 'y').replace(/s$/, '').replace(/_/g, ' ');
      return false;
    });
    if (cols.length + (dynamic ? 1 : 0) < 2) continue;
    const after = block.slice(m.index, m.index + 2500);
    const er = /<EmptyRows\b/.exec(after);
    const erAttrs = er ? attrsOf(openingTag(after, er.index)) : undefined;
    let empty = erAttrs ? prop(erAttrs, 'title') : undefined;
    let emptyHint = erAttrs ? prop(erAttrs, 'sub') : undefined;
    // The hand-drawn empty state — `cpepg__emptyT` and a hint under it — sits
    // BEFORE the table it replaces, not after. Taken only when the file has one
    // of each, since a screen with seven of them cannot be matched up by eye.
    const emptyTs = [...block.matchAll(/cpepg__emptyT">([^<{]+)</g)];
    if (!empty && emptyTs.length === 1 && [...block.matchAll(/<thead>/g)].length === 1) {
      empty = clean(emptyTs[0][1]);
      const h = /^[\s\S]{0,200}?className="hint">\s*([^<{]+?)\s*</.exec(block.slice(emptyTs[0].index))?.[1];
      if (h) emptyHint = clean(h);
    }
    tableAt.push(m.index);
    tables.push({
      columns: cols,
      ...(dynamic ? { dynamic } : {}),
      ...(() => {
        if (!dynamic) return {};
        const body = /<tbody>([\s\S]{0,400})/.exec(block.slice(m.index))?.[1] ?? '';
        const arr = /(\w+)\.map\(/.exec(body)?.[1];
        return arr ? { rowsPer: arr.replace(/ies$/, 'y').replace(/s$/, '').replace(/_/g, ' ') } : {};
      })(),
      ...(empty ? { empty } : {}),
      ...(emptyHint ? { emptyHint } : {}),
    });
  }

  // ---- the forms
  //
  // The defaults literal is resolved once for the file, against every state key
  // the JSX binds to, so each field can say what a new record starts at.
  FALLBACKS = defaultsFor(src, new Set([...src.matchAll(/\bf\.(\w+)/g)].map((m) => m[1])));
  const rules = validationRules(src, validatorMessages());
  const forms: CpeForm[] = [];
  /** form → the component that renders it, to match it to the card that opens it. */
  const formComponent = new Map<CpeForm, string>();
  /** The services the forms' own save handlers write to. */
  const formServices = new Set<string>();
  const drawers = tagsNamed(block, 'EntityDrawer');
  for (const [i, at] of drawers.entries()) {
    const attrs = attrsOf(openingTag(block, at));
    // Bounded by the drawer's own close, not by the next drawer: the last one
    // otherwise ran to the end of the file, and every setting laid out on the
    // page below it was documented as a field of that drawer.
    const next = i + 1 < drawers.length ? drawers[i + 1] : block.length;
    const close = block.indexOf('</EntityDrawer>', at);
    const until = close > at && close < next ? close : next;
    // The component the drawer lives in, from its `function` line: its save
    // handler — the validation — sits above the `<EntityDrawer>` tag.
    const fnAt = [...block.slice(0, at).matchAll(/\bfunction\s+[A-Z]\w*\s*\(/g)].pop()?.index;
    const fn = fnAt === undefined ? '' : block.slice(fnAt, until);
    // Each drawer's own starting values. One file-wide reading gave every
    // drawer on a four-drawer screen whichever literal happened to be largest.
    if (fn) FALLBACKS = scopedDefaults(fn, src);
    const fnName = fnAt === undefined ? undefined : /function\s+([A-Z]\w*)/.exec(block.slice(fnAt))?.[1];
    const flag = /\bconst\s+(is[A-Z]\w*)\s*=\s*\w+\s*===\s*'(\w+)'/.exec(fn);
    if (fnAt !== undefined && flag && new RegExp(`\\b${flag[1]}\\s*\\?`).test(fn.slice(at - fnAt))) {
      // Which lists open it: `{serviceOn && listCard('neighbour', …)}`.
      const opened = [...block.matchAll(/\{\s*(!?)\s*([a-z]\w*)\s*&&\s*\w+\(\s*'(\w+)'/g)];
      const kinds = [...new Set(opened.map((o) => o[3]))];
      const other = kinds.length === 2 ? kinds.find((k) => k !== flag[2]) : undefined;
      for (const pick of [true, false]) {
        const v = resolveTernary(fn, flag[1], pick);
        const drawerAt = v.indexOf('<EntityDrawer');
        const vAttrs = attrsOf(openingTag(v, drawerAt));
        const found = fieldsIn(v.slice(drawerAt), src);
        const vRules = validationRules(v, validatorMessages());
        // The drawer's one field is bound to local state, not `f.x`, so its
        // rules are filed under the validator's own key (`{ v: [...] }`).
        // Also when the field's own key is not one the rules know: the new
        // `value={v}` / `error={errors.x}` key readers give it one now.
        if (found.length === 1 && (!found[0].key || !vRules.has(found[0].key))) {
          const all = [...vRules.values()].flat();
          if (all.length) vRules.set('__single', all);
          found[0].key = '__single';
          const own = [...v.matchAll(/\bsetError\(\s*'([^']{3,})'\s*\)/g)].map((x) => clean(x[1]));
          if (own.length) found[0].rejects = [...new Set([...(found[0].rejects ?? []), ...own])];
        }
        const fields = resolveFields(found, vRules).map(({ key, ...f }) =>
          key === '__single' ? f : { ...f, ...(key ? { key } : {}) },
        );
        if (!fields.length) continue;
        const kind = pick ? flag[2] : other;
        const gate = kind ? opened.find((o) => o[3] === kind) : undefined;
        const gateExpr = gate ? localExpr(src, gate[2]) : undefined;
        forms.push({
          title: templateTitle(vAttrs.get('title')?.value ?? '') ?? heading(vAttrs, 'title'),
          saveLabel: prop(vAttrs, 'saveLabel') ?? 'Save',
          fields,
          ...(kind ? { kind } : {}),
          ...(gate && gateExpr
            ? { shownWhen: condText({ key: gate[2], op: gate[1] ? 'falsy' : 'truthy', expr: gateExpr }, pageSwitches(block, src)) }
            : {}),
        });
      }
      continue;
    }
    // A drawer rendered under `drawer?.kind === 'bond'` that nothing on the
    // screen ever opens with `kind: 'bond'` is dead code, not a form.
    // Only provable when every opener names its kind literally: OpenVPN opens
    // with `setDrawer({ kind: tab })`, and a computed kind can be any of them.
    if (fnName && !/setDrawer\(\s*\{\s*kind:\s*[A-Za-z_$][\w.$]*\s*[,}]/.test(block)) {
      const gate = new RegExp(`kind\\s*===\\s*'(\\w+)'\\s*&&\\s*\\(?\\s*<${fnName}\\b`).exec(block)?.[1];
      if (gate && !new RegExp(`\\bkind:\\s*'${gate}'`).test(block)) continue;
    }
    // `{settings && (<SettingsDrawer …/>)}` where `setSettings` is only ever
    // called with false — IPS's settings drawer, which nothing opens.
    if (fnName) {
      const v = new RegExp(`\\{\\s*([a-z]\\w*)\\s*&&\\s*\\(?\\s*<${fnName}\\b`).exec(block)?.[1];
      const setter = v ? `set${v.charAt(0).toUpperCase()}${v.slice(1)}` : '';
      // Only a real piece of state — `const [settings, setSettings] =
      // useState(false)`. IPsec guards its drawer with a computed `ready`,
      // which has no setter at all and is not "never opened".
      if (v && new RegExp(`\\[\\s*${v}\\s*,\\s*${setter}\\s*\\]\\s*=\\s*useState\\b`).test(src)) {
        const opens = [...block.matchAll(new RegExp(`\\b${setter}\\(\\s*([^)]*)\\)`, 'g'))].some(
          (c) => !/^\s*(false|null|undefined)?\s*$/.test(c[1]),
        );
        if (!opens) continue;
      }
    }
    // This drawer's own checks first. Rules read from the whole file are keyed
    // by state key alone, so two drawers that both have a `hostname` — DNS and
    // DHCP's lease and record drawers — each got the other's rules as well.
    const own = fn ? validationRules(fn, validatorMessages()) : new Map<string, string[]>();
    const scoped = new Map([...rules, ...own]);
    // A drawer with its own checks uses only those: IPS's Disable-rule drawer
    // requires a description, its bypass and suppress drawers do not, and the
    // file-wide table keyed by `description` gave all three the requirement.
    void scoped;
    const fields = resolveFields(fieldsIn(block.slice(at, until), src), fn && own.size ? own : rules);
    // One error state for the whole drawer — `error={error}` on its field and
    // `setError('A network ID is 16 hexadecimal characters.')` in the save —
    // which no per-key reader can see. OOBM's join drawer is written so.
    // Only while ONE field owns that error state, and only messages that are
    // rules about its value — "Could not reach…", "Save failed" are outcomes,
    // and stating them as the field's validation would invent a check.
    if (fn && (fn.match(/\berror=\{\s*error\s*\}/g) ?? []).length === 1) {
      const msgs = [...fn.matchAll(/\bsetError\(\s*'([^']{3,})'\s*\)/g)]
        .map((x) => clean(x[1]))
        .filter((t) => !/^(could not|couldn|failed|unable|cannot reach|save failed|error\b|the router)/i.test(t));
      const at2 = /<Field\b[^>]*?\blabel="([^"]+)"[^>]*?\berror=\{\s*error\s*\}/s.exec(fn)?.[1]
        ?? /<Field\s+label="([^"]+)"[\s\S]{0,200}?\berror=\{\s*error\s*\}/.exec(fn)?.[1];
      const target = at2 ? fields.find((x) => x.label === clean(at2)) : undefined;
      if (target && msgs.length && !target.rules?.length && !target.rejects?.length) target.rejects = [...new Set(msgs)];
    }
    if (!fields.length) continue;
    const titles = addEditPair(attrs.get('title')?.value, kitConsts);
    const saves = addEditPair(attrs.get('saveLabel')?.value, kitConsts);
    // What each band of the form says it is for — "Match: select which traffic
    // this policy route applies to."
    const bandNotes = Object.fromEntries(
      bandsIn(block.slice(at, until))
        .filter((b) => b.note)
        .map((b) => [b.name, b.note as string]),
    );
    for (const w of fn.matchAll(/\bnsbondProxy\(\s*[\w.]+\s*,\s*'([\w.-]+)'/g)) formServices.add(w[1]);
    // The drawer's own notices. noticesIn skips anything inside a drawer when
    // reading the screen, so this is where they are kept.
    const formNotices = noticesIn(block.slice(at, until), true);
    // The drawer's opening line: a bare hint before its first field.
    const head = block.slice(at, Math.min(until, block.indexOf('<Field', at) + 1 || until));
    const leadRaw = /className="hint"[^>]*>\s*([^<{]{20,400}?)\s*</.exec(head)?.[1];
    const lead = leadRaw ? clean(decodeEntities(leadRaw)) : undefined;
    // `const IPSEC_STEPS = ['Connection', 'Authentication', 'Encryption']`,
    // referenced by the drawer's own stepper.
    const stepsConst = /\b([A-Z][A-Z0-9_]*_STEPS)\b/.exec(block.slice(at, until))?.[1];
    const steps = stepsConst
      ? quotedStrings(arrayConst(src, stepsConst)).map(clean).filter(Boolean)
      : [];

    const form: CpeForm = {
      ...(steps.length > 1 ? { steps } : {}),
      ...(lead ? { lead } : {}),
      ...(Object.keys(bandNotes).length ? { groupNotes: bandNotes } : {}),
      ...(formNotices.length ? { notices: formNotices } : {}),
      title: titles.add ?? heading(attrs, 'title') ?? templateTitle(attrs.get('title')?.value ?? ''),
      saveLabel: saves.add ?? prop(attrs, 'saveLabel') ?? 'Save',
      ...(titles.edit ? { editTitle: titles.edit } : {}),
      ...(saves.edit ? { editSaveLabel: saves.edit } : {}),
      ...(fn ? toastsIn(fn, kitConsts) : {}),
      fields,
    };
    forms.push(form);
    if (fnName) formComponent.set(form, fnName);
  }

  // Fields on the page itself rather than in a drawer. A settings screen has
  // no "add" — it is one form, saved by one button — so they become a single
  // form named after the button that commits them.
  // Everything outside the drawers, with the drawers blanked rather than cut
  // so positions still line up with `src`. A screen can have both — a list
  // edited in a drawer and a panel of settings saved in place — and reading
  // the page only when it had no drawer lost the panel entirely.
  // From `block`, not `src`: they are the same file for an ordinary screen,
  // but a sub-tab is one function out of a file holding eight, and starting
  // from the file gave every QoS tab a phantom form of the other seven tabs'
  // fields.
  let outside = block;
  for (const at of drawers) {
    const close = block.indexOf('</EntityDrawer>', at);
    const end = close < 0 ? block.length : close;
    outside = outside.slice(0, at) + ' '.repeat(end - at) + outside.slice(end);
  }
  // A modal dialog — DDoS's "Set Trusted Hosts Before Enabling Protection"
  // guard — is a step the screen interrupts with, not a setting on it. Its
  // input documented as a page field, with a Save the page does not have.
  for (const m of outside.matchAll(/<div className="modal"[^>]*role="dialog"/g)) {
    const end = divEnd(outside, m.index);
    outside = outside.slice(0, m.index) + ' '.repeat(end - m.index) + outside.slice(end);
  }
  // The screen's own settings start from the screen's own defaults.
  const pageAt = outside.search(/^export default function /m);
  const pageScope = pageAt < 0 ? outside : outside.slice(pageAt);
  // Plus any other top-level function the screen's own fields sit in —
  // MultiWAN lays its General Settings out in a `DefaultsTab` above the page
  // component, and reading only the page gave them no defaults at all.
  const declAt = [...outside.matchAll(/^(?:export\s+(?:default\s+)?)?function\s+[A-Z]\w*/gm)].map((m) => m.index);
  const holders = new Set<number>();
  for (const m of outside.matchAll(/<Field\b|className="cpepg__lab"/g)) {
    const d = declAt.filter((x) => x <= m.index).pop();
    if (d !== undefined && d < (pageAt < 0 ? Infinity : pageAt)) holders.add(d);
  }
  const extra = [...holders].map((d) => {
    const next = declAt.find((x) => x > d) ?? outside.length;
    return outside.slice(d, next);
  });
  FALLBACKS = scopedDefaults([pageScope, ...extra].join('\n'), src);
  const inline: Found[] = inlineFieldsIn(block, stringConstants(src), rangeTables(src));
  // The markup reader has no idea which conditional region a row sits in;
  // without this, Router ID read as always present on a screen that shows
  // it only once BGP Service is on.
  const outsideSpans = condSpans(outside, src);
  for (const f of inline) {
    const cs = outsideSpans.filter((sp) => f.at > sp.from && f.at < sp.to).map((sp) => sp.cond);
    if (cs.length) f._shown = cs;
  }
  const inDrawer = new Set(forms.flatMap((f) => f.fields.map((x) => x.label)));
  const loose = fieldsIn(outside, src).filter(
    (f) => !inline.some((x) => x.label === f.label) && !inDrawer.has(f.label),
  );
  // Merged by position, not concatenated: the two readers pick up different
  // shapes, and appending one list to the other put the Failover toggles at
  // the bottom of the table instead of beside the Failover fields they sit
  // with on screen.
  const pageFound = [...inline, ...loose].sort((a, b) => a.at - b.at);
  const pageFields = resolveFields(pageFound, rules);
  if (pageFields.length) {
    let saveLabel: string | undefined;
    for (const at of tagsNamed(block, 'button')) {
      const tag = openingTag(block, at);
      if (!/btn--primary/.test(tag)) continue;
      const close = block.indexOf('</button>', at);
      if (close < 0) continue;
      const inner = block.slice(at + tag.length, close);
      // The label is usually an expression — `{saving ? 'Saving…' : 'Save
      // settings'}` — so the rendered text is empty and the literals have to
      // be read instead.
      const text =
        clean(plainTextOf(inner)) ||
        (quotedStrings(inner).map(clean).find((x) => /^Save\b/i.test(x) && !/…/.test(x)) ?? '');
      if (/^Save\b/i.test(text) && text.length <= 40) { saveLabel = text; break; }
    }
    // No Save button and nothing but switches: each one writes as it is
    // flipped — `onChange={(v) => setSwitch(…)}` — so there is nothing to press.
    const instant = !saveLabel && pageFields.every((f) => f.options?.[0] === 'On');
    // The handler the Save button calls, for what it pops up afterwards.
    const handler = (() => {
      // The settings may live in their own function (MultiWAN's DefaultsTab),
      // and so may the Save button and the handler it calls.
      for (const scope of [...extra, pageScope]) {
        for (const at of tagsNamed(scope, 'button')) {
          const tag = openingTag(scope, at);
          if (!/btn--primary/.test(tag)) continue;
          const name = /\bonClick=\{\s*(\w+)\s*\}/.exec(tag)?.[1];
          if (!name) continue;
          const def = new RegExp(`\\bconst\\s+${name}\\s*=\\s*async\\b[\\s\\S]*?\\n  \\}\\n`).exec(scope);
          if (def) return def[0];
        }
      }
      return '';
    })();
    // The sub-tab the settings are on, when they are a tab's own component:
    // `{tab === 'defaults' && <DefaultsTab …/>}` over `{ key: 'defaults',
    // label: 'General Settings' }`.
    const subTab = (() => {
      for (const x of extra) {
        const comp = /^(?:export\s+(?:default\s+)?)?function\s+([A-Z]\w*)/.exec(x)?.[1];
        const key = comp ? new RegExp(`\\b\\w+\\s*===\\s*'(\\w+)'\\s*&&\\s*<${comp}\\b`).exec(block)?.[1] : undefined;
        const label = key ? new RegExp(`\\{\\s*key:\\s*'${key}'\\s*,\\s*label:\\s*'([^']+)'`).exec(src)?.[1] : undefined;
        if (label) return label;
      }
      return undefined;
    })();
    forms.push({
      ...(subTab ? { subTab } : {}),
      title: undefined,
      saveLabel: saveLabel ?? 'Save',
      fields: pageFields,
      inline: true,
      ...(instant ? { instant } : {}),
      ...(handler ? toastsIn(handler, kitConsts) : {}),
    });
    for (const w of handler.matchAll(/\bnsbondProxy\(\s*[\w.]+\s*,\s*'([\w.-]+)'/g)) formServices.add(w[1]);
  }

  // A one-field drawer, written as a component of its own because the screen
  // opens four of them that differ only in the method they call. It carries
  // its single field on itself rather than holding a `<Field>`.
  for (const at of tagsNamed(block, 'EntryDrawer')) {
    const attrs = attrsOf(openingTag(block, at));
    const label = prop(attrs, 'label');
    if (!label) continue;
    const titles = addEditPair(attrs.get('title')?.value, kitConsts);
    const saves = addEditPair(attrs.get('saveLabel')?.value, kitConsts);
    const title = titles.add ?? prop(attrs, 'title');
    if (forms.some((f) => f.title === title && f.fields[0]?.label === label)) continue;
    // The component's own further fields — Instashield's EntryDrawer adds an
    // optional Description under the address unless told `noDescription`.
    const own = /\bfunction EntryDrawer\b/.test(src) ? functionBody(src, 'EntryDrawer') : '';
    const extra = attrs.has('noDescription') && attrs.get('noDescription')?.value !== 'false'
      ? []
      : [...own.matchAll(/<Field\s+label="([^"]+)"([^>]*)>/g)].map((m) => ({
          label: clean(m[1]),
          required: /\brequired\b/.test(m[2]),
          hints: [],
        }));
    forms.push({
      title,
      saveLabel: saves.add ?? prop(attrs, 'saveLabel') ?? 'Save',
      ...(titles.edit ? { editTitle: titles.edit } : {}),
      ...(saves.edit ? { editSaveLabel: saves.edit } : {}),
      ...(own ? toastsIn(own, kitConsts) : {}),
      fields: [
        {
          label,
          required: true,
          hints: [...propAll(attrs, 'hint'), ...propAll(attrs, 'info')].filter(usefulHint),
          // `validate(f, { address: [req(label)] })` — the message names the field.
          ...(/\breq\(\s*label\s*\)/.test(own) ? { rules: [reqMessage(label, 'This field is required.')] } : {}),
        },
        ...extra,
      ],
    });
  }

  // ---- what a row lets you do
  const VERBS: Array<[RegExp, string]> = [
    [/\bonEdit=/, 'Edit'],
    [/\bonDuplicate=/, 'Duplicate'],
    [/\bonToggle=/, 'Enable or disable'],
    [/\bonRestart=/, 'Restart'],
    [/\bonDisconnect=/, 'Disconnect'],
    [/\bonMoveUp=|\bonMoveDown=|\bonReorder=/, 'Reorder'],
    [/\bonDelete=/, 'Delete'],
  ];
  const rowActions: string[] = [];
  const rowTags = tagsNamed(block, 'RowActions').map((at) => openingTag(block, at)).join('\n');
  const reorderable = tagsNamed(block, 'CpeTable').some((at) => /\bonReorder=/.test(openingTag(block, at)));
  for (const [re, verb] of VERBS) {
    if (re.test(rowTags) || (verb === 'Reorder' && reorderable)) rowActions.push(verb);
  }
  // `extra={[{ label: 'Force update now', onClick: … }]}` — actions a screen
  // adds to the kit's menu. Named by the console, so listed as it words them.
  for (const m of rowTags.matchAll(/\bextra=\{\s*\[([\s\S]*?)\]\s*\}/g)) {
    for (const l of m[1].matchAll(/\blabel:\s*'([^']+)'/g)) {
      const verb = clean(l[1]);
      if (!rowActions.includes(verb)) rowActions.splice(Math.max(0, rowActions.indexOf('Delete')), 0, verb);
    }
  }

  // ---- the button that starts a new record
  //
  // Named by the console, not inferred: screens say "Add Monitor", "New rule",
  // "Create bond", and a guide that says "click Add" when the button says
  // "Create bond" is wrong in the one place a reader is looking.
  //
  // The tag is found with the depth-aware scanner, not a regex: the opening tag
  // carries `onClick={() => setDrawer({ row: null })}`, whose arrow closes a
  // `[^>]*` match early and left every add button unread.
  let addLabel: string | undefined;
  for (const at of tagsNamed(block, 'button')) {
    const tag = openingTag(block, at);
    if (!/btn--primary/.test(tag)) continue;
    const close = block.indexOf('</button>', at);
    if (close < 0) continue;
    const text = clean(plainTextOf(block.slice(at + tag.length, close)));
    if (/^(Add|New|Create)\b/i.test(text) && text.length <= 40) { addLabel = text; break; }
  }

  // ---- what a destructive action asks first
  const confirms: CpeConfirm[] = [];
  for (const m of block.matchAll(/confirm\(\{([\s\S]{0,700}?)\}\)/g)) {
    const arg = m[1];
    const label = /confirmLabel:\s*'([^']+)'/.exec(arg)?.[1];
    // Double quotes when the sentence carries an apostrophe: "the router's".
    const quoted = /message:\s*\n?\s*(?:'([^']+)'|"([^"]+)")/.exec(arg)?.slice(1).find(Boolean);
    // `message: `${device.name} keeps …\n\n` + 'If this is …'` — a template,
    // sometimes continued with `+`. Rendered with ‹…› for the record's own
    // values, the way the dialog titles are.
    const tmpl = quoted
      ? undefined
      : /message:\s*\n?\s*(`[^`]*`(?:\s*\+\s*(?:'[^']*'|`[^`]*`))*)/.exec(arg)?.[1];
    const message =
      quoted ??
      (tmpl
        ? [...tmpl.matchAll(/`[^`]*`|'[^']*'/g)].map((x) => renderLiteral(x[0].replace(/\\n/g, ' '), kitConsts)).join(' ')
        : undefined);
    // `message: isBond ? 'A' : 'B'` — one dialog, worded two ways by a flag
    // that is not a list kind. Both are kept, each with the case it is for.
    const byFlag = !quoted && !tmpl
      ? /message:\s*\n?\s*(is\w+)\s*\n?\s*\?\s*'([^']+)'\s*\n?\s*:\s*'([^']+)'/.exec(arg)
      : null;
    // `message: kind === 'neighbour' ? 'A' : 'B'` — one dialog, worded per list.
    const split = /message:\s*\n?\s*(\w+)\s*===\s*'(\w+)'\s*\n?\s*\?\s*'([^']+)'\s*\n?\s*:\s*'([^']+)'/.exec(arg);
    if (!label || (!message && !split && !byFlag)) continue;
    const found: CpeConfirm[] = byFlag
      ? (() => {
          const what = byFlag[1].replace(/^is/, '').toLowerCase();
          return [
            { message: `${clean(byFlag[2])} (for a ${what})`, confirmLabel: clean(label) },
            { message: `${clean(byFlag[3])} (otherwise)`, confirmLabel: clean(label) },
          ];
        })()
      : split
      ? (() => {
          const kinds = [...new Set([...block.matchAll(/\{\s*!?\s*[a-z]\w*\s*&&\s*\w+\(\s*'(\w+)'/g)].map((o) => o[1]))];
          const other = kinds.length === 2 ? kinds.find((k) => k !== split[2]) : undefined;
          return [
            { message: clean(split[3]), confirmLabel: clean(label), kind: split[2] },
            { message: clean(split[4]), confirmLabel: clean(label), ...(other ? { kind: other } : {}) },
          ];
        })()
      : [{ message: clean(message!), confirmLabel: clean(label) }];
    // The heading. `Delete ${NOUN[kind]} "${row.name}"?` is one template for
    // every list on the screen, so it is spelled out once per key of the map.
    const rawTitle = /\btitle:\s*(`[^`]*`|'[^']*')/.exec(arg)?.[1];
    if (rawTitle) {
      const titles: Record<string, string> = {};
      const byMap = /\$\{\s*([A-Z][A-Z0-9_]*)\[\s*\w+\s*\]\s*\}/.exec(rawTitle);
      const map = byMap ? objectConst(src, byMap[1]) : undefined;
      if (map?.size) {
        for (const [k, v] of map) titles[k] = renderLiteral(rawTitle.replace(byMap![0], v), kitConsts);
      } else {
        titles['*'] = renderLiteral(rawTitle, kitConsts);
      }
      for (const c of found) c.titles = titles;
    }
    for (const c of found) {
      if (/^(Delete|Remove|Drop|Unconfigure|Revoke|Disconnect|Dissolve|Purge|Clear|Leave)\b/i.test(c.confirmLabel)) c.removes = true;
    }
    for (const c of found) if (!confirms.some((x) => x.message === c.message)) confirms.push(c);
  }

  // ---- what it says when it cannot read the router
  const warnings: string[] = [];
  const warningNotes: CpePageDetail['warningNotes'] = {};
  for (const at of tagsNamed(block, 'Warn')) {
    const wa = attrsOf(openingTag(block, at));
    const t = prop(wa, 'title');
    if (!t || warnings.includes(t)) continue;
    warnings.push(t);
    const msg = wa.get('message');
    warningNotes[t] = {
      retry: wa.has('onRetry'),
      // Only a literal: a `message={warning}` is the router's own words at run
      // time, and there is nothing to write down.
      ...(msg?.quoted ? { message: clean(msg.value) } : {}),
    };
  }

  // ---- which router services it talks to
  const services: string[] = [];
  for (const m of block.matchAll(/\b(?:useProxy|nsbondProxy)\(\s*[\w.]+\s*,\s*'([\w.-]+)'/g)) {
    if (!services.includes(m[1])) services.push(m[1]);
  }
  const writeServices: string[] = [];
  // A command is not a save: `trigger-isdb-update`, `force-update`,
  // `flush-…` act on a running service and change no configuration, so a
  // service only ever called that way says nothing about whether saves wait.
  for (const m of block.matchAll(/\bnsbondProxy\(\s*[\w.]+\s*,\s*'([\w.-]+)'\s*,\s*'([\w.-]+)'/g)) {
    if (/^(trigger|force|refresh|flush|reload|restart|test|check|scan|search|list|get|is)[-_]/.test(m[2])) continue;
    if (!writeServices.includes(m[1])) writeServices.push(m[1]);
  }
  // A method chosen at run time cannot be judged, so it counts.
  for (const m of block.matchAll(/\bnsbondProxy\(\s*[\w.]+\s*,\s*'([\w.-]+)'\s*,\s*(?=[^\s'])/g)) {
    if (!writeServices.includes(m[1])) writeServices.push(m[1]);
  }

  // ---- buttons on the page that open a drawer, and which drawer
  const launchers: CpePageDetail['launchers'] = [];
  const inCardAction = new Set(cards.map((c) => c.addLabel).filter(Boolean));
  for (const at of tagsNamed(block, 'button')) {
    const tag = openingTag(block, at);
    if (!/btn--primary/.test(tag)) continue;
    const kind = /setDrawer\(\s*\{\s*kind:\s*'(\w+)'/.exec(tag)?.[1];
    if (!kind) continue;
    const close = block.indexOf('</button>', at);
    const label = clean(plainTextOf(block.slice(at + tag.length, close)));
    if (!label || label.length > 40 || inCardAction.has(label) || launchers.some((l) => l.label === label)) continue;
    const comp = new RegExp(`kind\\s*===\\s*'${kind}'\\s*&&\\s*\\(?\\s*<([A-Z]\\w*)`).exec(block)?.[1];
    const form = comp ? [...formComponent].find(([, c]) => c === comp)?.[0] : undefined;
    launchers.push({ label, ...(form?.title ? { form: form.title } : {}) });
  }

  // ---- what the screen shows or flips, outside a drawer
  //
  // Any component handed a literal `label`, sorted by what the component is.
  // The pages that print numbers build a small local component for one figure
  // (`<Metric label="RTT" unit="ms" />`); the pages that are mostly settings
  // use `ToggleField`. Both are content. What is excluded is listed below, and
  // each exclusion is a `label` the operator never reads as a label: an
  // accessibility name, a group's caption, or a form control already counted
  // as a field.
  const NOT_CONTENT = new Set([
    'RowActions',     // an aria-label: "Actions for this rule"
    'AdvancedSection',// a disclosure's caption: "optional settings"
    'Select', 'RadioGroup', 'MultiSelect', 'TagsInput', 'FilterBar', 'Icon',
    'EntryDrawer',    // a one-field drawer, already read as a form above
    'InfoTip',        // a tooltip's accessible name, not a figure on the page
  ]);
  // `Toggle`, `ToggleField`, `ToggleRow` — the kit grew three shapes of the
  // same control, and all three are a setting the operator flips.
  const IS_SWITCH = /^(Toggle\w*|Switch|EnabledCheck)$/;
  const readouts: CpeReadout[] = [];
  const switches: string[] = [];
  const seenLabel = new Set<string>();
  const formLabels = new Set(forms.flatMap((f) => f.fields.map((x) => x.label)));
  // Everything between a drawer's tags belongs to that drawer. Without this a
  // form's own toggles were reported as settings on the screen behind it.
  const drawerSpans: Array<[number, number]> = [];
  for (const name of ['EntityDrawer', 'EntryDrawer']) {
    for (const at of tagsNamed(block, name)) {
      const close = block.indexOf(`</${name}>`, at);
      drawerSpans.push([at, close < 0 ? at + 6000 : close]);
    }
  }
  const insideForm = (i: number) => drawerSpans.some(([a, b]) => i >= a && i <= b);
  for (const m of block.matchAll(/<([A-Z][\w.]*)\b/g)) {
    const name = m[1];
    // Anything named `…Field` is a form control, whether or not it sits in a
    // drawer — `AddressField` was being read as a reading called "Address".
    if (NOT_CONTENT.has(name) || /Field$/.test(name) && !IS_SWITCH.test(name)) continue;
    const attrs = attrsOf(openingTag(block, m.index));
    const a = attrs.get('label');
    if (!a?.quoted) continue;
    const label = clean(a.value);
    if (!label || formLabels.has(label) || seenLabel.has(label)) continue;
    if (insideForm(m.index)) continue;
    // A label is a name, not a sentence; a long one is an aria description.
    if (label.split(/\s+/).length > 5) continue;
    seenLabel.add(label);
    if (IS_SWITCH.test(name)) switches.push(label);
    else {
      const unit = prop(attrs, 'unit');
      readouts.push({ label, ...(unit ? { unit } : {}) });
    }
  }

  // ---- what each card holds
  //
  // A page of five cards documented as five headings and four unattached
  // lists; the reader could not tell which **Add Entry** belonged to which.
  const cardTags = tagsNamed(block, 'Card');
  for (const at of cardTags) {
    const attrs = attrsOf(openingTag(block, at));
    const title = heading(attrs, 'title');
    const card = cards.find((c) => c.title === title);
    if (!card || card.columns) continue;
    const end = cardEnd(block, at);
    const action = attrs.get('action')?.value ?? '';
    const add = clean(plainTextOf(action.replace(/^[^<]*/, '')));
    if (/^(Add|New|Create)\b/i.test(add) && add.length <= 40) card.addLabel = add;
    // The primary button's kind — OpenVPN's client header carries Import
    // before Add, and the first `kind:` in it belongs to Import.
    const primaryAt = action.search(/btn--primary/);
    const kind =
      (primaryAt >= 0 ? /\bkind:\s*'(\w+)'/.exec(action.slice(primaryAt))?.[1] : undefined) ??
      /\bkind:\s*'(\w+)'/.exec(action)?.[1];
    if (kind) {
      card.kind = kind;
      const comp = new RegExp(`kind\\s*===\\s*'${kind}'\\s*&&\\s*\\(?\\s*<([A-Z]\\w*)`).exec(block)?.[1];
      const form = comp ? [...formComponent].find(([, c]) => c === comp)?.[0] : undefined;
      if (form) {
        form.card = card.title;
        if (form.title) card.form = form.title;
      }
    }
    const ti = tableAt.findIndex((t) => t > at && t < end);
    if (ti >= 0) {
      card.columns = tables[ti].columns;
      tables[ti].card = card.title;
    }
    const rt = [...block.slice(at, end).matchAll(/cpepg__rtLab">([^<{]+)</g)].map((x) => clean(x[1]));
    if (rt.length) card.readouts = rt;
    if (pageFound.some((f) => f.at > at && f.at < end)) card.holdsSettings = true;
    const cs = outsideSpans.filter((sp) => at > sp.from && at < sp.to).map((sp) => sp.cond);
    if (cs.length) card.shownWhen = cs.map((c) => condText(c, pageFound)).join(' and ');

    // `{servers.length > 1 && (<Card title="Showing access for">…)}` — a card
    // that only appears once there is more than one record to choose between.
    // Not an `f.x` test, so condSpans cannot see it, and the card documented
    // as unconditional with nothing to say for itself.
    if (!card.shownWhen) {
      const before = block.slice(Math.max(0, at - 120), at);
      const len = /\{\s*(\w+)\.length\s*(>=?|===?)\s*(\d+)\s*&&\s*\($/.exec(before.trimEnd());
      if (len) {
        const thing = humanKey(len[1]).toLowerCase();
        const n = Number(len[3]);
        card.shownWhen =
          len[2].startsWith('>') && n === 1
            ? `there is more than one ${thing.replace(/s$/, '')}`
            : `there ${n === 1 ? 'is' : 'are'} ${len[2].startsWith('>') ? 'more than ' : ''}${n} ${thing}`;
      }
    }
  }
  for (const b of banners) {
    b.locks = pageFields.filter((f) => f.lockedWhen === b.title).map((f) => f.label);
  }

  return {
    ...(refresh ? { refreshMs: Number(refresh) } : {}),
    subTabs,
    cards,
    banners,
    tables,
    forms,
    rowActions,
    screenStates,
    notices: noticesIn(block),
    warnings,
    warningNotes,
    services,
    writeServices,
    ...(formServices.size ? { formWriteServices: [...formServices] } : {}),
    launchers,
    readouts,
    switches,
    legend: labelsIn(arrayConst(src, 'LEGEND')),
    ...(() => {
      const c = cellOf(src);
      return c ? { cell: c } : {};
    })(),
    ...(addLabel ? { addLabel } : {}),
    confirms,
  };
}

/**
 * The SLA Health Dashboard's own arithmetic.
 *
 * The generic reader above can say the screen reports RTT, jitter, loss and
 * MOS. It cannot say what "Poor" means or why a link reads SLA Violated, and
 * those are the two things an operator looking at a red card wants. They are
 * thresholds in the component, so they are read rather than described — and
 * this is the only screen in the tab that needs it, because it is the only one
 * that computes a verdict instead of listing what the router returned.
 */
export interface CpeSlaHealthFacts {
  /** `[label, ">= 4.3"]`, best first. */
  mosBands: Array<[string, string]>;
  /** The conditions that force a card to read as breached. */
  breach: string[];
  /** Samples before the trend and timeline appear. */
  minSamples?: number;
  /** How much history the trace keeps, in seconds. */
  windowSeconds?: number;
  badges: string[];
}
export async function readSlaHealthFacts(
  componentFile: string,
): Promise<CpeSlaHealthFacts | undefined> {
  const src = await readFile(
    path.join(FE, 'components', 'cpe', componentFile),
    'utf8',
  ).catch(() => '');
  if (!src || !/function\s+mosQuality/.test(src)) return undefined;

  const fn = src.slice(src.indexOf('function mosQuality'));
  const body = fn.slice(0, fn.indexOf('\n}'));
  const mosBands: Array<[string, string]> = [];
  for (const m of body.matchAll(/if\s*\(mos\s*>=\s*([\d.]+)\)\s*return\s*\{\s*label:\s*'([^']+)'/g)) {
    mosBands.push([m[2], `${m[1]} and above`]);
  }
  // The final `return` has no test: it is everything below the last band.
  const last = /return\s*\{\s*label:\s*'([^']+)'[^}]*\}\s*$/.exec(body.trim());
  if (last && mosBands.length) {
    mosBands.push([last[1], `below ${mosBands[mosBands.length - 1][1].replace(' and above', '')}`]);
  }

  const breachExpr = /const\s+breach\s*=\s*([\s\S]*?)\n\s*const\s/.exec(src)?.[1] ?? '';
  const breach: string[] = [];
  if (/quality === 'down'/.test(breachExpr)) breach.push('the router reports the link **down**');
  if (/quality === 'degraded'/.test(breachExpr)) breach.push('the router reports it **degraded**');
  const mosUnder = /mos\s*<\s*([\d.]+)/.exec(breachExpr)?.[1];
  if (mosUnder) breach.push(`**MOS is below ${mosUnder}**`);
  const lossOver = /loss\s*>\s*([\d.]+)/.exec(breachExpr)?.[1];
  if (lossOver) breach.push(`**loss is above ${lossOver}%**`);

  const minSamples = Number(/samples\.length\s*>=\s*(\d+)/.exec(src)?.[1]) || undefined;
  const historyMax = Number(/\bconst\s+HISTORY_MAX\s*=\s*(\d+)/.exec(src)?.[1]) || 0;
  const pollMs = Number(/\bconst\s+POLL_MS\s*=\s*(\d+)/.exec(src)?.[1]) || 0;

  const badges: string[] = [];
  for (const m of src.matchAll(/\?\s*'(SLA [A-Za-z]+|Unknown)'\s*:\s*'(SLA [A-Za-z]+|Unknown)'/g)) {
    for (const b of [m[1], m[2]]) if (!badges.includes(b)) badges.push(b);
  }
  for (const m of src.matchAll(/'(Unknown)'\s*:/g)) if (!badges.includes(m[1])) badges.push(m[1]);

  return {
    mosBands,
    breach,
    ...(minSamples ? { minSamples } : {}),
    ...(historyMax && pollMs ? { windowSeconds: (historyMax * pollMs) / 1000 } : {}),
    badges,
  };
}

/**
 * The half of every CPE write that is easy to miss.
 *
 * RPCD write handlers stage UCI; nothing changes on the router until those
 * packages are committed. The console grew a bar for it, whose own source calls
 * a page that says "saved" while the device runs the old configuration "the
 * single most misleading thing this UI could do" — so the handbook says it on
 * every screen that can write, in the console's own words.
 */
export interface CpeApplyFacts {
  banner?: string;
  hint?: string;
  apply?: string;
  revert?: string;
  /** What it says when someone else committed first. */
  raced?: string;
  pollMs?: number;
  /**
   * The services the console itself says stage their writes
   * (`STAGING_SERVICES` in cpeKit.jsx). Everything else it deliberately makes
   * no claim about — its own comment records that `ns.routes` commits on
   * write — so the handbook makes none either.
   */
  stagingServices: string[];
}
export async function readCpeApplyFacts(): Promise<CpeApplyFacts | undefined> {
  const src = await readFile(
    path.join(FE, 'components', 'cpe', 'CpePendingBar.jsx'),
    'utf8',
  ).catch(() => '');
  if (!src) return undefined;

  const at = src.indexOf('cpepend__txt');
  const block = at < 0 ? src : src.slice(at);
  return {
    banner: clean(/<strong>\s*([^<{]+)/.exec(block)?.[1] ?? '') || undefined,
    hint: clean(/className="hint">\s*([^<]+)/.exec(block)?.[1] ?? '') || undefined,
    apply: clean(/:\s*'(Apply[^']*)'/.exec(block)?.[1] ?? '') || undefined,
    revert: clean(/:\s*'(Revert[^']*)'/.exec(block)?.[1] ?? '') || undefined,
    raced: clean(/'(Nothing left to apply[^']*)'/.exec(src)?.[1] ?? '') || undefined,
    pollMs: Number(/\bconst\s+POLL_MS\s*=\s*(\d+)/.exec(src)?.[1]) || undefined,
    stagingServices: await readFile(path.join(FE, 'components', 'cpe', 'cpeKit.jsx'), 'utf8')
      .then((kit) => quotedStrings(/STAGING_SERVICES\s*=\s*new Set\(\[([^\]]*)\]/.exec(kit)?.[1] ?? ''))
      .catch(() => []),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const d = await readCpePageDetail(process.argv[2] ?? 'CpeSlaMonitorsPage.jsx');
  console.log(JSON.stringify(d, null, 2));
}
