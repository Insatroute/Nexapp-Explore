/**
 * The task guide for configuration templates.
 *
 * Templates have two creation surfaces — a four-step wizard and the advanced
 * form — and they are not alternatives to describe interchangeably: the wizard
 * is the default and the advanced form is also the edit screen, so anyone who
 * creates through the wizard meets the other one the first time they change
 * something. Both are covered here for that reason.
 */
import { readTemplateFacts } from './extract-templates.ts';
import { describeField } from './read-form-fields.ts';
import { cell } from './mdx.ts';
import { shotSection } from './page-shots.ts';


export async function templatesGuide(): Promise<string> {
  const t = await readTemplateFacts();
  if (!t) return '';

  const vpnPurpose = t.purposes.find((p) => p.key === 'vpn');
  const blank = t.purposes.find((p) => !p.sections.length);
  const L: string[] = [];

  L.push('', '## Creating a template', '');
  L.push(
    'A walk through building a configuration template end to end. The card above says where the page is and who may open it; this is how to use it.',
    '',
    `There are two ways in, and they produce the same record. **Add template** opens a ${t.steps.length}-step wizard for people who do not know the field names. **Switch to advanced form** is that same payload directly — and it is also the screen you land on when you edit an existing template, so it is worth knowing even if you always create through the wizard.`,
    '',
  );

  // ---- 2. prerequisites
  L.push(
    '### Before you start',
    '',
    '- You need the permission named on the card above.',
    '- **Know which devices this is for.** A template can be shared across organizations or belong to one, and that cannot be worked out later from the configuration itself.',
    '- **Decide whether it should apply on its own.** A template can attach to new devices automatically, and it can be made impossible to detach. Both are decisions about blast radius, not formatting.',
  );
  if (vpnPurpose) {
    L.push(
      `- For a **${cell(vpnPurpose.title)}** template, the VPN server must already exist. The template names exactly one and cannot be saved without it — so create the server first.`,
    );
  }
  L.push('');

  // ---- 4a. the wizard
  // A stepper rather than a numbered list: this is the part of the page someone
  // reads with the console open beside them, and a list of four long paragraphs
  // does not show where they are in it.
  L.push('### Create one with the wizard', '', '<Steps>', '');
  t.steps.forEach((s, i) => {
    L.push('<Step>', '', `### ${cell(s)}`, '');
    if (i === 0) {
      L.push(
        'Pick the closest match to what the template is for. Every choice stays editable later, and each one pre-selects a different set of configuration sections.',
        '',
        '<Cards>',
      );
      for (const p of t.purposes) {
        const extra = p.sections.length ? ` Offers ${p.sections.length} sections.` : '';
        L.push(`  <Card title="${cell(p.title)}" description="${cell(p.desc + extra)}" />`);
      }
      L.push('</Cards>', '');
    } else if (i === 1) {
      L.push(
        'Name the template and say who it is for. The name is required, and **Continue** stays disabled without it. Choose an organization, or leave it shared across all of them. This is also where you say whether it applies to new devices automatically.',
        '',
      );
    } else if (i === 2) {
      L.push(
        'Choose the configuration sections the template carries.' +
          (vpnPurpose
            ? ` A **${cell(vpnPurpose.title)}** template instead asks for the VPN server it joins, and cannot continue until one is chosen.`
            : '') +
          (blank
            ? ` **${cell(blank.title)}** has nothing pre-selected, so it must carry at least one section before you can continue — an empty configuration is rejected on save.`
            : ''),
        '',
      );
    } else {
      L.push('Confirm what will be created, then choose **Create**.', '');
    }
    L.push('</Step>', '');
  });
  L.push('</Steps>', '');

  // ---- 4b. the advanced form
  L.push(
    '### Or use the advanced form',
    '',
    '**Switch to advanced form** skips the wizard and edits the record itself. It is the right choice when you already know the shape of the configuration, and it is the only way to edit a template once it exists.',
    '',
    'Its JSON editor and its forms are two views of one value — editing either updates the other, and the whole thing is validated against the backend schema when you save.',
    '',
  );

  // ---- 5. fields
  L.push('### Every field on the advanced form', '', '| Field | Required | What it is |', '| --- | --- | --- |');
  for (const f of t.fields) {
    const d = describeField(f);
    L.push(`| ${cell(f.label)} | ${f.required ? '**yes**' : 'no'} | ${d ? cell(d) : '—'} |`);
  }
  L.push(
    '',
    '**Type** is the field the rest hang off: a VPN-client template gains the VPN server field and issues a certificate per device, while a generic one has neither. **Backend** decides which configuration sections exist at all.',
    '',
  );

  // ---- 6. saving
  L.push(
    '### Saving and validation',
    '',
    'The wizard gates each step rather than failing at the end — **Continue** is disabled until that step is satisfied, so you cannot reach Review with a template that will not save.',
    '',
    'Two rules are worth knowing because they are enforced twice, in the model and again in the API:',
    '',
    '- **The configuration cannot be empty.** Posting an empty one comes back as *“The configuration field cannot be empty.”* Every curated purpose carries a minimal, schema-valid starter so an untouched Settings step still saves; a blank template has no starter, which is why it must carry a section of its own.',
    '- **A VPN-client template must name a VPN server.** The type is what makes the field required.',
    '',
    'In the advanced form the JSON is parsed as you type — a syntax error is reported inline and blocks saving — and the server validates the result against the backend schema.',
    '',
  );

  // ---- 7 + 8
  L.push(
    '### How it reaches devices, and what to expect',
    '',
    'A template is not configuration until it is attached to a device, and there are three ways that happens:',
    '',
    '1. **Automatically**, if it is marked to apply to new devices — every new device in its organization picks it up.',
    '2. **By hand**, from a device’s own configuration.',
    '3. **Permanently**, if it is marked as required — a device that has it cannot have it removed.',
    '',
    'The template is rendered per device at push time, with that device’s own variables filled in, so one template produces different configuration on each router.',
    '',
    'Afterwards the list row shows its type, backend, the VPN it names, both flags, and **Applied on** — the number of devices carrying it. That count is the useful one: a template applied on zero devices is doing nothing, and the column exists so that is visible.',
    '',
  );

  // ---- 9
  L.push(
    '### Verify it is working',
    '',
    '1. Check **Applied on** in the list. If it is zero, nothing is using the template yet.',
    '2. Open a device that should have it and look at its configuration for the template by name.',
    '3. For a VPN-client template, confirm the device received its certificate — these are issued per device, not shared.',
    '',
  );

  // ---- 10
  L.push(
    '### Common problems',
    '',
    '| What you see | What it means | What to do |',
    '| --- | --- | --- |',
    '| **Continue** is greyed out | The current step is incomplete — the name on Target, or a VPN server or a section on Settings. | The disabled button is the wizard saying so; the missing piece is on the step you are on. |',
    '| “The configuration field cannot be empty.” | The template carries no configuration. | Add at least one section, or start from a purpose that includes a starter. |',
    '| The VPN server field will not let you continue | VPN-client templates must name one. | Choose a server, or create it first if none exists. |',
    '| Tags cannot be edited | They are read-only on this form by design. | Edit them in the admin view. |',
    '| The template saves but no device has it | Nothing has attached it. | Apply it to a device, or mark it to apply to new devices automatically. |',
    '| **Applied on** stays zero for an auto-applying template | That flag only catches devices added *after* it was set. | Attach it to the existing devices by hand. |',
    '| A device will not give up a template | It is marked required. | Required templates cannot be detached; change the flag first. |',
    '',
  );

  // ---- 11
  L.push(...(await shotSection('network/templates', [
    { file: 'list.png', what: 'The Templates tab — type, backend, VPN, tags, the Default and Required flags and how many devices each is applied on.', alt: 'The templates list' },
    { file: 'wizard.png', what: 'Step 1 of the Create template wizard — Purpose: Connect to a VPN, Standard settings, Network and interfaces, or Start from blank.', alt: 'The template wizard' },
    { file: 'backups.png', what: 'The Backup templates tab — per-device configuration snapshots with their organization, source device, source and coverage.', alt: 'Backup templates' },
  ])));

  L.push(
    '---',
    '',
    '<small>Read from: `PURPOSES`, `PURPOSE_SECTIONS`, `STARTER`, `STEPS` and the step gating in `pages/TemplateWizard.jsx`; the field labels, hints and save path in `pages/TemplateForm.jsx`.</small>',
    '',
  );
  return L.join('\n');
}
