/**
 * The task guide for a Policy Engine protocol.
 *
 * The generated reference above it answers "what is this page and who may open
 * it". This answers the eleven things an operator needs to actually use the
 * feature — the standard the knowledge base is held to: purpose, prerequisites,
 * where it lives, the steps, every field, how to save, how to apply, what to
 * expect, how to verify, what goes wrong, and pictures.
 *
 * Written once for every protocol rather than once per protocol. The Policy
 * Engine renders all of them from one table through one form, so the steps, the
 * save path, the scope rules and the verification route are genuinely the same;
 * what differs is the field list, and that is read from source. A per-protocol
 * guide would be nine copies of the same prose, drifting apart.
 *
 * Screenshots are the one part not derived from source: they have to be taken
 * from a running controller, so they live in POLICY_SHOTS below and are shown
 * only once the file is actually on disk. A page with none says so rather than
 * pretending the requirement is met.
 */
import { readPolicyTab, type PolicyField, type PolicySection } from './extract-policy-fields.ts';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { CONTROLLER } from './config.ts';
import { shotSection, type Shot } from './shots.ts';
import { cell } from './mdx.ts';

/**
 * Screenshots for a Policy Engine page, under `public/img/policy/<key>/`.
 *
 * Hand-captured, because they cannot be derived from source — which is why
 * they are a registry rather than a read. A caption is wrapped in `*…*` by the
 * renderer, so it must not contain an asterisk of its own; a `<word>` would be
 * parsed by MDX as a tag and kill the build.
 *
 * A file on disk that no entry names is reported rather than shown: an
 * undeclared image has no caption, and a silent drop is how a captured
 * screenshot goes missing without anyone noticing.
 */
const POLICY_SHOTS: Record<string, Shot[]> = {
  qos: [
    { file: 'list.png', alt: 'The Adaptive QoS list',
      what: 'Two policies, both using the **cake** mode, both **Fleet-wide**, both enabled — the green tick in **State**. **Bandwidth** is the ceiling each one shapes to.' },
    { file: 'form-new.png', alt: 'The New Adaptive QoS drawer',
      what: 'The form as it opens. **Mode** starts at **None**, **Bandwidth** shows its example rather than a value, and both toggles are off — so a policy created without touching anything shapes nothing.' },
  ],
  rip: [
    { file: 'form-new.png', alt: 'The New RIP drawer',
      what: 'Scope first, then the service. **RIP Service** is the only toggle here that starts **on**: the daemon ships installed but switched off, and this is what starts it.' },
  ],
  bgp: [
    { file: 'form-new.png', alt: 'The New BGP drawer',
      what: '**Router ID** and **Router AS** carry their own examples — dotted-quad, and an AS in the 1 to 4294967295 range. Neither is required, so a policy can be saved without either.' },
  ],
  ospf: [
    { file: 'form-new.png', alt: 'The New OSPF drawer',
      what: 'The same scope block as the others, then **Router ID** — which here says what BGP’s does not: leave it empty and the router detects one itself.' },
  ],
  pim: [
    { file: 'form-new.png', alt: 'The New PIM drawer',
      what: 'The shortest policy in the section. **Enabled** starts on, and the warning under it is the one to read: switching PIM on or off restarts the routing daemons, which takes up to about 20 seconds.' },
  ],
  vrf: [
    { file: 'form-new.png', alt: 'The New VRF drawer',
      what: 'The exception to the no-device-picker rule: **Device** is required, so a VRF is always bound to one router. **Table ID** left blank becomes 1000 plus the VRF ID, which is what the router itself does.' },
  ],
  sla: [
    { file: 'form-new.png', alt: 'The New Performance SLA drawer',
      what: 'A path monitor: what to probe, how often, and how many results in a row decide a change of state. **Failures before down** is 5 and **Successes before up** is 10 — deliberately asymmetric, so a flapping link is not brought back eagerly.' },
    { file: 'thresholds.png', alt: 'The New SLA Thresholds drawer',
      what: 'The **SLA Thresholds** sub-tab. A tier grades one path monitor’s measurements, so **Path monitor** is required and the monitor has to exist first. **Tier 1** is the best grade a link can earn.' },
    { file: 'settings.png', alt: 'The New SLA Settings drawer',
      what: 'The **SLA Settings** sub-tab — how traffic is spread once the monitors have graded the paths. **Extend smoothing to video** does nothing while **WAN smoothing** is off, and the form says so under the toggle rather than hiding it.' },
    { file: 'tenants.png', alt: 'The New Tenants drawer',
      what: 'The **Tenants** sub-tab. **Bandwidth** left blank takes a fair share of the total QoS bandwidth; **Priority weight** decides the size of that share when it is recalculated.' },
  ],
  steering: [
    { file: 'form-new.png', alt: 'The New Application Aware Routing drawer',
      what: 'The whole form: a name, a scope and a state. The rules that decide which application takes which path are added to the policy afterwards, not here.' },
  ],
};

/**
 * Which Policy Engine lists hide auto-generated per-device rows.
 *
 * `TemplatesOnlyListMixin` drops every device-bound row from `list`, so those
 * pages show only the templates someone authored here — the per-device
 * instances the topology deploy materialises are not in the count. Read from
 * the backend on every run rather than listed here, so removing the mixin
 * removes the paragraph.
 */
const VIEWSET_FOR: Record<string, string> = {
  qos: 'QosConfigViewSet',
  rip: 'RipConfigViewSet',
  bgp: 'BgpConfigViewSet',
  ospf: 'OspfConfigViewSet',
  pim: 'PimConfigViewSet',
  vrf: 'VrfConfigViewSet',
  steering: 'SteeringPolicyViewSet',
  sla: 'NsBondPathMonitorViewSet',
};

interface ViewsetFacts {
  /** `list` drops device-bound rows, so the page shows templates only. */
  templatesOnly: boolean;
  /** The search box reaches the server: SearchFilter installed AND fields named. */
  searchWorks: boolean;
}

/**
 * Read the two facts about a policy's viewset that the page cannot show.
 *
 * Both are derived on every build rather than listed, so fixing either in the
 * backend removes the paragraph here instead of leaving a stale warning.
 */
async function viewsetFacts(key: string): Promise<ViewsetFacts> {
  const none: ViewsetFacts = { templatesOnly: false, searchWorks: false };
  const cls = VIEWSET_FOR[key];
  if (!cls) return none;
  const src = await readFile(
    path.join(CONTROLLER, 'sdwan_tunnel', 'api', 'nsbond_views.py'),
    'utf8',
  ).catch(() => '');
  if (!src) return none;
  const body = new RegExp(`^class ${cls}\\(.*?(?=^class )`, 'ms').exec(src)?.[0] ?? '';
  if (!body) return none;
  const backends = /filter_backends\s*=\s*\[([^\]]*)\]/.exec(body)?.[1] ?? '';
  return {
    templatesOnly: /TemplatesOnlyListMixin/.test(body.slice(0, body.indexOf(':'))),
    // DRF ignores `?search=` unless SearchFilter is installed AND the viewset
    // names the fields to search. Either missing and the box does nothing.
    searchWorks: /SearchFilter/.test(backends) && /search_fields\s*=/.test(body),
  };
}



/** MDX-safe, and no pipe to break out of a table cell. */

function fieldRows(sections: PolicySection[]): string[] {
  const L: string[] = ['| Field | Type | Required | What it is |', '| --- | --- | --- | --- |'];
  for (const s of sections) {
    if (s.title) L.push(`| **${cell(s.title)}** | | | |`);
    for (const f of s.fields) L.push(row(f));
  }
  return L;
}

function row(f: PolicyField): string {
  const type = f.choices?.length
    ? `choice: ${f.choices.map((c) => c.label).join(', ')}`
    : f.type;
  const notes: string[] = [];
  if (f.help) notes.push(cell(f.help));
  if (f.placeholder) notes.push(`Example: \`${cell(f.placeholder)}\``);
  if (f.showIf) notes.push(`Only shown while **${cell(f.showIf)}** is on.`);
  return `| ${cell(f.label)} | ${cell(type)} | ${f.required ? '**yes**' : 'no'} | ${notes.join(' ') || '—'} |`;
}

export async function policyGuide(key: string): Promise<string> {
  const t = await readPolicyTab(key);
  if (!t) return '';

  // `ENABLED` is appended after the last section with no heading of its own, so
  // it was counted as one more field of whatever section came last: "BFD - fast
  // failure detection, 5 fields", one of which is not a BFD field at all. It
  // governs the whole policy, so it gets its own heading.
  const tail = t.sections[t.sections.length - 1];
  if (tail && tail.fields.length > 1 && tail.fields[tail.fields.length - 1].name === 'enabled') {
    t.sections.push({ title: 'Policy state', fields: [tail.fields.pop()!] });
  }

  const all = t.sections.flatMap((s) => s.fields);
  const required = all.filter((f) => f.required);
  const scope = all.find((f) => f.name === 'is_global');
  const enabled = all.find((f) => f.name === 'enabled');
  const L: string[] = [];

  L.push('', `## Configuring ${t.label}`, '');
  L.push(
    `A walk through creating a ${t.label} policy end to end. The card above says where the page is and who may open it; this is how to use it.`,
    '',
  );

  // ---- 2. prerequisites
  L.push('### Before you start', '', '- You need the permission named on the card above — the page does not open without it.');
  if (scope) {
    L.push(
      `- Decide **where the policy applies** before you begin. \`${scope.label}\` reaches every device; leaving it off narrows the policy to one organization.`,
      '- There is no device picker, deliberately. Configuring a single router is what that router’s own CPE page is for, and a picker here would be a second, competing place to do it.',
    );
  }
  if (required.length) {
    L.push(
      `- Have values ready for the ${required.length === 1 ? 'field that is required' : `${required.length} required fields`}: ${required.map((f) => `**${f.label}**`).join(', ')}.`,
    );
  }
  for (const c of t.children) {
    const req = c.sections.flatMap((s) => s.fields).filter((f) => f.required);
    if (req.length) {
      L.push(`- To add a ${c.label.replace(/s$/, '').toLowerCase()}, you also need ${req.map((f) => `**${f.label}**`).join(', ')}.`);
    }
  }
  L.push('');

  // ---- 4. steps
  L.push('### Create one, step by step', '', '<Steps>', '');
  const step = (title: string, body: string) =>
    L.push('<Step>', '', `### ${title}`, '', body, '', '</Step>', '');

  step(
    'Open the form',
    'Open the page from the sidebar, then choose **+ New**. The form opens in a drawer beside the list, so the existing policies stay visible.',
  );
  for (const s of t.sections) {
    if (!s.title) continue;
    const req = s.fields.filter((f) => f.required).map((f) => `**${f.label}**`);
    // Scope and state are decisions about the policy, not device settings,
    // so "the device keeps its own defaults" is wrong for both.
    const isScope = s.fields.some((f) => f.name === 'is_global');
    const isState = s.fields.some((f) => f.name === 'enabled');
    step(
      s.title,
      `${s.fields.length} field${s.fields.length === 1 ? '' : 's'}.` +
        (req.length
          ? ` ${req.join(' and ')} must be filled in.`
          : isScope
            ? ' Neither is required, but this is what decides which devices the policy reaches, so choose it deliberately.'
            : isState
              ? ' On by default.'
              : ' All optional; left alone, the device keeps its own defaults.'),
    );
  }
  if (t.children.length) {
    step(
      'Add its records',
      `Add any ${t.children.map((c) => `**${c.label}**`).join(', ')} the policy needs. These can be added before the policy is saved — they are held and written once the policy has an id.`,
    );
  }
  step('Create it', 'Choose **Create**. The drawer closes and the new row appears in the list.');
  L.push('</Steps>', '');

  // ---- 5. fields
  L.push('### Every field', '');
  if (t.blurb) L.push(`${cell(t.blurb)}`, '');
  L.push(...fieldRows(t.sections), '');

  // Each child collection folded away. BGP alone carries four of them and 47
  // fields between them; printed flat they bury the policy's own table, which
  // is the one most readers came for.
  const withFields = t.children.filter((c) => c.sections.length);
  if (withFields.length) {
    L.push(
      '#### Its records',
      '',
      `A ${t.label} policy can also carry ${withFields.map((c) => `**${c.label}**`).join(', ')}. Each is its own set of fields:`,
      '',
      '<Accordions type="single">',
      '',
    );
    for (const c of withFields) {
      const n = c.sections.reduce((a, s) => a + s.fields.length, 0);
      L.push(`<Accordion title="${cell(c.label)} — ${n} field${n === 1 ? '' : 's'}">`, '');
      if (c.blurb) L.push(cell(c.blurb), '');
      if (c.empty) L.push(`With none configured the console says: “${cell(c.empty)}”`, '');
      L.push(...fieldRows(c.sections), '');
      if (c.consequence) L.push(`**Deleting one:** ${cell(c.consequence)}`, '');
      L.push('</Accordion>', '');
    }
    L.push('</Accordions>', '');
  }

  // ---- 6. saving and validation
  L.push(
    '### Saving and validation',
    '',
    'Two checks run, in this order:',
    '',
    `1. **In the browser.** Any required field left empty is marked “This field is required.” and nothing is sent. A field hidden by its condition is not checked — it is not part of the form you filled in.`,
    '2. **On the server.** The API validates the rest. A field it rejects is reported against that field in the form, rather than as one opaque banner, so the message sits on the input that caused it. An error that belongs to no single field appears as a notification instead.',
    '',
    'On success the console confirms **Created** for a new policy, or **Saved** for an edit.',
    '',
  );
  if (t.children.length) {
    L.push(
      `If the policy saves but one of its ${t.children.map((c) => c.label.toLowerCase()).join(' / ')} rows does not, the console says so explicitly — “Created, but 1 child record could not be added”. The policy exists; re-open it and add the row again.`,
      '',
    );
  }

  // ---- 7 + 8. applying and expected result
  L.push('### How it reaches the devices, and what to expect', '');
  if (enabled) {
    L.push(
      `Two things decide that, and neither is a separate deploy step. **Scope** decides which devices are in range${scope ? ` — \`${scope.label}\` for the whole fleet, an organization otherwise` : ''}. **${enabled.label}** decides whether it is pushed at all: ${cell(enabled.help ?? '')}`,
      '',
    );
  }
  L.push(
    `Afterwards the policy appears as a row in the ${t.label} list, showing its name, its key settings and its state. That row is the controller’s record; the next section is how to confirm the device agrees.`,
    '',
  );

  // ---- 9. verification
  L.push(
    '### Verify it is working',
    '',
    'The list confirms the policy was stored, not that a router is running it. To check the device itself:',
    '',
    '1. Go to **Network › Devices** and open the device.',
    `2. Open its **CPE** tab, then **Policy Engine › ${t.label}**.`,
    '3. That page reads the router directly and refreshes its status every 15 seconds, so it shows what the device is actually running rather than what the controller asked for.',
    '',
    'A policy that is correct here but absent there is a delivery problem, not a configuration one — check the scope covers that device, and that the policy is enabled.',
    '',
  );

  const facts = await viewsetFacts(key);
  if (facts.templatesOnly) {
    L.push(
      '### What this list leaves out',
      '',
      `The list shows only the ${t.label} policies someone created here. The controller also materialises a copy of a policy for each device the topology deploy covers, and those per-device rows are **dropped from this list** — so the count is templates, not every record that exists.`,
      '',
      'That is deliberate rather than a fault: the per-device copies are nameless and there is one per router, which would bury the handful of policies you actually wrote. They are still reachable — opening a device shows the policy it is running, and a request scoped to a device returns them.',
      '',
      'It is worth knowing when a number looks too small. A fleet of two hundred routers running this protocol still shows the two or three templates behind it.',
      '',
    );
  }

  if (!facts.searchWorks) {
    L.push(
      '### The search box on this page does nothing',
      '',
      `Typing in **Search ${t.label.toLowerCase()}…** sends a \`search\` parameter the server does not read: this endpoint installs no search filter and names no searchable fields, so DRF ignores the parameter and returns the same unfiltered page.`,
      '',
      'Nothing reports this. The box accepts text, the request succeeds, and the list comes back complete — which reads as “no matches were filtered out” rather than “the filter was never applied”.',
      '',
      'Use the state filter, or the column order, to find a policy until the endpoint grows a search filter.',
      '',
    );
  }

  // ---- 10. troubleshooting
  L.push('### Common problems', '', '| What you see | What it means | What to do |', '| --- | --- | --- |');
  L.push(
    `| “This field is required.” | A required field is empty. Nothing was sent. | Fill in ${required.map((f) => `**${f.label}**`).join(', ') || 'the marked field'}. |`,
    '| An error under one field after choosing Create | The server rejected that value. | Correct that field; the message is the API’s own. |',
    '| An error notification with no field attached | The problem is with the record as a whole, not one value. | Read the message — it is passed through unchanged. |',
    '| “Not authenticated — log in to the Django admin first.” | Not necessarily a login problem. The API client turns **every** 403 into this sentence, and a 403 is what a missing permission returns, so a permission error reads as a session error. | If you are plainly logged in, treat it as a permission on this policy type rather than re-authenticating. |',
  );
  for (const f of all) {
    // Range and format rules are stated in the field help, so they become
    // troubleshooting rows without being invented here.
    const m = /\(([0-9]+–[0-9]+)\)/.exec(f.help ?? '');
    if (m) L.push(`| ${cell(f.label)} rejected | It must be within ${m[1]}. | Enter a value in range. |`);
    else if (/IPv4 format/i.test(f.help ?? '')) {
      L.push(`| ${cell(f.label)} rejected | It must be in IPv4 format. | Use dotted-quad, for example \`${cell(f.placeholder ?? '10.0.0.1')}\`. |`);
    }
  }
  if (t.children.length) {
    L.push('| “Created, but 1 child record could not be added” | The policy saved; one of its rows did not. | Re-open the policy and add that row again. |');
  }
  L.push('| The policy is in the list but the device is not running it | Scope or state. | Check the policy is enabled and that its scope covers the device. |', '');

  // ---- 11. screenshots
  L.push(...(await shotSection('policy', key, POLICY_SHOTS[key] ?? [],
    (m) => console.log(`  policy ${key}: ${m}`))));

  L.push(
    '---',
    '',
    `<small>Read from: the \`${t.key}\` entry in \`pages/policy/tabs.js\` — its field table, sections, required flags, help text and choices, which that file records were read from the endpoint’s OPTIONS response${t.children.length ? `; the child collections in \`pages/policy/${t.key}Children.js\`` : ''}; and the save, validation and error handling in \`components/crud/ResourceForm.jsx\`.</small>`,
    '',
  );
  return L.join('\n');
}
