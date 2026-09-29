/**
 * The task guide for a device's Checks tab.
 *
 * The first device tab where things are created and deleted, so it takes the
 * full shape rather than the read-only one: adding, editing and removing each
 * get their own steps, and the consequences of each are stated because the
 * panel states them.
 *
 * Everything quoted here is the console's own wording — its About card, its
 * form hints, its delete confirmation. Paraphrasing would mean the handbook and
 * the screen saying the same thing differently.
 */
import { readChecksFacts } from './extract-checks.ts';
import { cell } from './mdx.ts';


/** `${chk.check_type_label}` reads as a placeholder, not as code. */
const human = (s: string) => s.replace(/\$\{[^}]+\}/g, '‹check type›');

export async function checksGuide(): Promise<string> {
  const c = await readChecksFacts();
  if (!c) return '';
  const L: string[] = [];

  L.push('', '## Managing a device’s checks', '');
  L.push(
    'A check is what produces a health metric, so the Checks tab decides what the Summary tab reports and what raises an alert. It is the one device tab where adding and removing something changes how the device is monitored. Open it from **Network › Devices**, open a device, then **Checks**.',
    '',
  );

  if (c.about) {
    L.push(`<Callout type="info">${cell(c.about)}</Callout>`, '');
  }

  // ---- prerequisites
  L.push(
    '### Before you start',
    '',
    '- Checks are bound to one device. Adding one here affects this device only.',
    c.addHint
      ? `- **A device can carry each check type once.** Once a type is configured, it stops being offered — the picker reads “${cell(c.exhausted ?? 'every check type is already configured')}” when there are none left to add.`
      : '',
    '- Adding or removing a check changes what the Health card counts, so it changes the device’s reported health, not just this tab.',
    '',
  );

  // ---- add
  L.push('### Add a check', '', '<Steps>', '');
  L.push(
    '<Step>',
    '',
    '### Open the Checks tab',
    '',
    'The **Add a check** card is on the left; the checks the device already has are listed on the right, with a count of how many are active.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Choose a check type',
    '',
    `The picker offers only the types this device does not already have.${c.exhausted ? ` If it reads “${cell(c.exhausted)}”, there is nothing left to add — which is a complete set, not a fault.` : ''}`,
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Choose Add check',
    '',
    `The check appears in the list immediately and the console confirms **Check added.**${c.addHint ? ` ${cell(c.addHint.replace(/^A device can carry each check type once\.\s*/, ''))}` : ''}`,
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );

  // ---- edit
  L.push('### Change a check', '', '<Steps>', '');
  L.push(
    '<Step>',
    '',
    '### Turn it on or off',
    '',
    `Each check has an **Active** box${c.activeHint ? ` — it controls ${cell(c.activeHint)}` : ''}. Clearing it keeps the check configured but stops it running, which is the difference between pausing a check and removing one.`,
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Or change its type',
    '',
    'The **Check type** dropdown on each row changes what that check measures.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### It saves as you go',
    '',
    'There is no Save button. Each change is sent as you make it, and the panel applies the API’s own reply rather than reloading the list — so the tab does not flash back through a loading state for a one-field change. If a change is rejected the console says **Could not update the check**, with the reason.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );

  // ---- delete
  L.push('### Remove a check', '', '<Steps>', '');
  L.push(
    '<Step>',
    '',
    '### Choose the bin on its row',
    '',
    'Each check has a delete control at the right of its header.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Read the confirmation',
    '',
    c.confirm
      ? `> **${cell(human(c.confirm.title))}**  \n> ${cell(c.confirm.message)}`
      : 'The console asks before deleting.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Confirm',
    '',
    'The row disappears and the console confirms **Check deleted.** The check type becomes available to add again.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );

  // ---- limits
  if (c.notEdited) {
    L.push(
      '### What you cannot change here',
      '',
      `This tab edits two things about a check: whether it is active, and which type it is. Its parameters are ${cell(c.notEdited)}`,
      '',
    );
  }

  // ---- troubleshooting
  L.push(
    '### Common problems',
    '',
    '| What you see | What it means | What to do |',
    '| --- | --- | --- |',
    `| “${cell(c.exhausted ?? 'Every check type is already configured')}” | The device already has one of every type. | Nothing to fix — there is nothing left to add. |`,
    '| **Could not add the check** | The API refused it. | The reason is appended to the message; a duplicate type is the usual cause. |',
    '| **Could not update the check** | The change was rejected. | The check keeps its previous value; nothing is half-saved. |',
    '| A check is listed but the count says fewer are active | Some are configured but switched off. | Deactivated checks stay in the list; tick **Active** to run one again. |',
    '| The Health card does not match the checks | Health counts the metrics active checks produce. | A deactivated check produces no metric, so it stops counting. |',
    '| A parameter cannot be edited | Only the active flag and the type are editable here. | Its parameters are set on the admin form. |',
    '',
  );

  L.push(
    '### Screenshots',
    '',
    '<Callout type="warn">None yet. Screenshots cannot be generated from the source the rest of this page is read from — they have to be captured from a running controller, which needs credentials and a decision about putting production data in the repository. Until that is set up, this section is deliberately empty rather than quietly missing.</Callout>',
    '',
    '---',
    '',
    '<small>Read from: `components/DeviceChecksPanel.jsx` — its About card, the add form’s hint and placeholder, the Active control’s own wording, the delete confirmation, and the leading note recording which fields it edits.</small>',
    '',
  );
  return L.filter((x) => x !== undefined).join('\n');
}
