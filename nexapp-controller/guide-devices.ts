/**
 * The task guide for the device inventory.
 *
 * Shaped differently from the others on purpose. There is no "create a device"
 * form: a router registers itself and the controller decides whether to admit
 * it. So the walkthrough is how a device GETS here and what to do once it has,
 * rather than a form to fill in.
 */
import { readDeviceFacts } from './extract-devices.ts';
import { cell } from './mdx.ts';


export async function devicesGuide(): Promise<string> {
  const d = await readDeviceFacts();
  if (!d) return '';

  const shown = d.columns.filter((c) => c.shown);
  const hidden = d.columns.filter((c) => !c.shown);
  const locked = d.columns.filter((c) => c.always);
  const L: string[] = [];

  L.push('', '## Working with devices', '');
  L.push(
    'The card above says where the page is and who may open it. This is how a device gets here, and what to do with it once it has.',
    '',
    '<Callout type="info">There is no **Add device** button, and that is not an omission. A router registers itself with the controller; what this page controls is whether it is **admitted**, and what configuration it is then given.</Callout>',
    '',
  );

  // ---- 2. prerequisites
  L.push(
    '### Before you start',
    '',
    '- You need the permission named on the card above. Deleting is a separate right from viewing.',
    '- **Know which organization the device belongs to.** Every device has exactly one, and it decides which templates, VPN servers and policies can reach it.',
    '- If the organization has serial admission switched on, the device’s serial must be on its allowed list *before* it registers — otherwise it arrives already deactivated.',
    '',
  );

  // ---- 4. how a device arrives
  L.push('### How a device gets here', '', '<Steps>', '');
  L.push(
    '<Step>',
    '',
    '### It registers itself',
    '',
    'The router contacts the controller and appears in this list. Nobody creates the row by hand.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### The gate decides',
    '',
    'If its organization requires serial admission, the device is held until someone decides. The **Admission** column is where that shows — see below, because two backend flags produce three different meanings.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### It takes its configuration',
    '',
    'Templates marked to apply automatically attach themselves. The **Config** column reports whether what was pushed actually applied.',
    '',
    '</Step>',
    '',
  );
  if (d.importColumns.length) {
    L.push(
      '<Step>',
      '',
      '### Or import a batch',
      '',
      `**Import devices** creates rows from a CSV instead of waiting for each router. The header must include ${d.importColumns
        .slice(0, 2)
        .map((c) => `\`${c}\``)
        .join(' and ')}${
        d.importColumns.length > 2
          ? `, and will also use ${d.importColumns
              .slice(2)
              .map((c) => `\`${c}\``)
              .join(' and ')} if present`
          : ''
      }. One organization is chosen for the whole batch, so the spreadsheet never needs organization ids in it.`,
      '',
      '</Step>',
      '',
    );
  }
  L.push('</Steps>', '');

  // ---- 5. what the row says
  L.push(
    '### What the Admission column means',
    '',
    'This one is worth reading carefully, because it is two flags rather than one status, and a blank cell is meaningful:',
    '',
    '| What you see | What happened | What to do |',
    '| --- | --- | --- |',
    '| **Rejected** | The serial is not on the organization’s allowed list. The device was deactivated on arrival and is answering nothing. | Add the serial to the allowed list, then admit it. |',
    '| **Pending** | It registered under an organization that requires admission and is waiting for a decision. | Admit it. |',
    '| Blank | It never went through the gate, or it has already been admitted. | Nothing. |',
    '',
    '<Callout type="warn">A device that is deactivated but shows **nothing** here was deactivated by hand — that is an ordinary action and has nothing to do with admission. The Config column reads `deactivated` in both cases, which is why the distinction lives here.</Callout>',
    '',
  );

  // ---- columns
  L.push(
    '### The columns',
    '',
    `${d.columns.length} exist and ${shown.length} are shown by default.` +
      (locked.length
        ? ` ${locked.map((c) => `**${cell(c.title)}**`).join(' and ')} cannot be switched off.`
        : '') +
      (hidden.length
        ? ` ${hidden.map((c) => `**${cell(c.title)}**`).join(', ')} ${hidden.length === 1 ? 'is' : 'are'} off until you ask for ${hidden.length === 1 ? 'it' : 'them'} — which is why the picker reads a number one lower than the list it shows.`
        : ''),
    '',
    '| Column | Group | Shown |',
    '| --- | --- | --- |',
  );
  for (const c of d.columns) {
    L.push(
      `| ${cell(c.title)} | ${cell(c.group)} | ${c.always ? 'always — cannot be hidden' : c.shown ? 'by default' : 'off by default'} |`,
    );
  }
  L.push('');

  // ---- 6 + 7. finding and acting
  if (d.tiles.length) {
    L.push(
      '### Finding the devices you want',
      '',
      `The tiles across the top filter the table by health: ${d.tiles
        .map((t) => `**${cell(t.label)}**`)
        .join(', ')}. Search covers name, MAC, model and IP.`,
      '',
    );
  }
  if (d.refreshSecs) {
    L.push(
      `**Auto** reloads the table every ${d.refreshSecs} seconds, and pauses while the tab is hidden so a background tab is not polling the controller.`,
      '',
    );
  }

  L.push(
    '### Acting on them',
    '',
    'The toolbar is in two halves, and the difference decides how you work:',
    '',
    '- **Bulk actions** — Apply template, Back up config, Change group and Delete stay disabled until rows are ticked, then act on the whole selection. One device and forty are the same amount of work.',
    '- **Always available** — Import devices, Export CSV and Recover deleted need no selection.',
    '- **Exactly one** — SDLAN Access works on a single device and is disabled at none and at more than one.',
    '',
  );
  if (d.exportColumns.length) {
    L.push(
      `**Export CSV** is built in the browser from the rows on screen and writes ${d.exportColumns
        .map((c) => `\`${c}\``)
        .join(', ')}.`,
      '',
    );
  }

  // ---- 8 + 9
  L.push(
    '### What to expect, and how to verify',
    '',
    'After a bulk action the console names what it acted on rather than counting it — up to three by name, then "and N others".',
    '',
    'To confirm a device is genuinely healthy rather than merely listed:',
    '',
    '1. **Status** is what the device reports; **Config** is whether the configuration you pushed applied. They answer different questions and can disagree.',
    '2. Open the device and check its **Status** tab for what it last reported.',
    '3. If you pushed a template, check the device’s configuration shows it.',
    '',
  );

  // ---- 10
  L.push(
    '### Common problems',
    '',
    '| What you see | What it means | What to do |',
    '| --- | --- | --- |',
    '| A device never appears | It has not registered, or it cannot reach the controller. | Check the router’s side first — nothing on this page creates it. |',
    '| It appears as **Rejected** | Its serial is not on the organization’s allowed list. | Add the serial, then admit the device. |',
    '| Config reads `deactivated` with a blank Admission | It was deactivated by hand, not by the gate. | Reactivate it; admission is not involved. |',
    '| A bulk button stays greyed out | Nothing is ticked. | Bulk actions act on a selection. |',
    '| **SDLAN Access** is greyed out | None, or more than one, device is selected. | It works on exactly one. |',
    `| The Columns picker shows fewer than the list | ${hidden.length ? `${hidden.map((c) => `**${cell(c.title)}**`).join(', ')} ${hidden.length === 1 ? 'is' : 'are'} off by default.` : 'Some columns are off by default.'} | Tick it in the picker. |`,
    '| A deleted device is gone from the list | Deletion is recoverable for a while. | **Recover deleted** in the overflow menu. |',
    '',
  );

  // ---- 11
  L.push(
    '### Screenshots',
    '',
    '<Callout type="warn">None yet. Screenshots cannot be generated from the source the rest of this page is read from — they have to be captured from a running controller, which needs credentials and a decision about putting production data in the repository. Until that is set up, this section is deliberately empty rather than quietly missing.</Callout>',
    '',
  );

  L.push(
    '---',
    '',
    '<small>Read from: `COLUMNS`, `HEALTH`, `REFRESH_SECS`, the `AdmissionCell` rules and the CSV export in `pages/DeviceList.jsx`; the accepted CSV header in `components/DeviceImportDrawer.jsx`.</small>',
    '',
  );
  return L.join('\n');
}
