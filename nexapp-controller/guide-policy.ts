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
 * What is NOT here, and why: screenshots. They cannot be derived from source —
 * they have to be taken from a running controller — so the section says so
 * rather than pretending the requirement is met.
 */
import { readPolicyTab, type PolicyField, type PolicySection } from './extract-policy-fields.ts';
import { cell } from './mdx.ts';

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

  // ---- 10. troubleshooting
  L.push('### Common problems', '', '| What you see | What it means | What to do |', '| --- | --- | --- |');
  L.push(
    `| “This field is required.” | A required field is empty. Nothing was sent. | Fill in ${required.map((f) => `**${f.label}**`).join(', ') || 'the marked field'}. |`,
    '| An error under one field after choosing Create | The server rejected that value. | Correct that field; the message is the API’s own. |',
    '| An error notification with no field attached | The problem is with the record as a whole, not one value. | Read the message — it is passed through unchanged. |',
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
  L.push(
    '### Screenshots',
    '',
    '<Callout type="warn">None yet. Screenshots cannot be generated from the source the rest of this page is read from — they have to be captured from a running controller, which needs credentials and a decision about putting production data in the repository. Until that is set up, this section is deliberately empty rather than quietly missing.</Callout>',
    '',
  );

  L.push(
    '---',
    '',
    `<small>Read from: the \`${t.key}\` entry in \`pages/policy/tabs.js\` — its field table, sections, required flags, help text and choices, which that file records were read from the endpoint’s OPTIONS response${t.children.length ? `; the child collections in \`pages/policy/${t.key}Children.js\`` : ''}; and the save, validation and error handling in \`components/crud/ResourceForm.jsx\`.</small>`,
    '',
  );
  return L.join('\n');
}
