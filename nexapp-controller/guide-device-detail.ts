/**
 * The task guide for one device's page.
 *
 * Like the inventory, this is not a form: nothing is created here. It is the
 * page an operator opens when a device is misbehaving, so the guide is shaped
 * around answering that — where to look first, what each tab is for, what the
 * buttons in the header actually do, and how to tell a device problem from a
 * configuration problem.
 */
import { readDeviceDetailFacts } from './extract-device-detail.ts';
import { readTabFields } from './extract-tab-fields.ts';
import { cell } from './mdx.ts';


export async function deviceDetailGuide(): Promise<string> {
  const [d, tabFields] = await Promise.all([readDeviceDetailFacts(), readTabFields()]);
  if (!d) return '';

  const readouts = tabFields.reduce(
    (n, t) => n + t.groups.reduce((a, g) => a + g.cards.reduce((b, c) => b + c.fields.length, 0), 0),
    0,
  );
  const L: string[] = [];

  L.push('', '## Working with one device', '');
  L.push(
    'The card above says where the page is and who may open it. This is what to do once you are on it.',
    '',
    `<Callout type="info">Nothing is created here. This is the page you open when you already have a device and need to know what it is doing — ${d.tabs.length} tabs, and a header that acts on the device itself.</Callout>`,
    '',
  );

  // ---- 2. prerequisites
  L.push(
    '### Before you start',
    '',
    '- You reach this page by opening a row in **Devices**; it is not on the menu.',
    '- Access is enforced by the page’s own API rather than by the menu permission map, so what you can do here depends on your rights over the device, not over a menu entry.',
    '- The console actions need the device to be reachable. A device that is offline will show its last reported state, but a shell or a reboot has nothing to talk to.',
    '',
  );

  // ---- 4. the walkthrough
  L.push('### Working out what is wrong', '', '<Steps>', '');
  L.push(
    '<Step>',
    '',
    '### Read the header first',
    '',
    'Status, Config and the management IP sit side by side at the top, and they answer different questions. **Status** is what the device reports about itself. **Config** is whether the configuration the controller pushed actually applied. A device can be online with a failed configuration, and offline with a perfectly good one — so read both before deciding what is broken.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Start on Summary',
    '',
    'The Health card totals the device’s own checks, so it tells you whether anything is failing without opening every tab. The Interfaces card shows which ports are up, what they are carrying, and their addresses.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Then go where the answer is',
    '',
    'The tabs run roughly in the order you would ask questions in: is it healthy, what is it carrying, what has it been doing, then what is it configured with. The table below says which is which.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Act on it from the header',
    '',
    'The rail at the top acts on the device rather than navigating the page — including the ones that open a shell on it.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );

  // ---- 5. the tabs
  L.push(
    '### The tabs',
    '',
    `${d.tabs.length} of them: ${d.tabs.map((t) => `**${cell(t)}**`).join(' · ')}.`,
    '',
    'Most are the corresponding section of the old Django admin device page, rebuilt. **CPE** is the exception and is a different kind of thing from the rest: the tabs above it read controller state, while CPE talks to the router itself.',
    '',
  );

  // ---- header actions
  if (d.actions.length) {
    L.push(
      '### What the header buttons do',
      '',
      'Taken from the console’s own tooltips:',
      '',
      '| Action | What it does |',
      '| --- | --- |',
    );
    for (const a of d.actions) {
      const [name, ...rest] = a.split(/\s+—\s+/);
      L.push(`| ${cell(rest.length ? name : a.replace(/^(\w+)\b.*/, '$1'))} | ${cell(rest.length ? rest.join(' — ') : a)} |`);
    }
    L.push(
      '',
      '<Callout type="warn">Root access opens a root shell on the router and is audited. Reboot takes the device offline — neither asks a second time on a device someone else is relying on.</Callout>',
      '',
    );
  }

  // ---- interfaces
  if (d.interfaceColumns.length) {
    L.push(
      '### Reading the Interfaces card',
      '',
      `The port map colours each port — ${d.legend.map((x) => `**${cell(x)}**`).join(', ')} — and the table beneath it carries ${d.interfaceColumns.map((c) => `**${cell(c)}**`).join(', ')}.`,
      '',
      '**Path label** is the one column that is not the device’s own report. It is a controller-side classification of a WAN link, fetched separately and editable in place — the router knows nothing about it. If it fails to load the column is simply empty rather than taking the page down with it.',
      '',
    );
  }

  // ---- 8 + 9
  L.push(
    '### What the page can and cannot tell you',
    '',
    'Everything here except the path labels is what the device last reported, not a live reading. The Status tab renders from the payload the page already holds, so opening it costs no extra request — and shows the state as of the last check-in rather than this second. Use the reload button in the header for the current position.',
    '',
  );
  if (readouts) {
    L.push(
      `The Status tab’s ${readouts} readings are listed further down this page, grouped as the console groups them. The values are deliberately not listed: they change on every check-in.`,
      '',
    );
  }

  // ---- 10
  L.push(
    '### Common problems',
    '',
    '| What you see | What it means | What to do |',
    '| --- | --- | --- |',
    '| Online, but Config says it failed | The device is reachable; what was pushed to it did not apply. | Open **Configuration** — this is a configuration problem, not a connectivity one. |',
    '| Offline, with Config applied | The last push succeeded; the device has since stopped answering. | Check the link, not the template. |',
    '| Config reads `deactivated` | Either it was deactivated by hand, or serial admission rejected it. | The **Admission** column in Devices distinguishes the two. |',
    '| A tab is empty | Some tabs fetch their own data when opened rather than reusing the device payload. | Give it a moment; if it stays empty the device has nothing to report for it. |',
    '| Path label will not set | It is a controller-side value, saved separately from the device. | It saves on its own; a failure there leaves the column empty rather than erroring. |',
    '| A shell will not open | The action needs the device reachable now. | Check Status first — a stale payload can show Online after the device has gone. |',
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
    '<small>Read from: the `TABS` literal, the header rail’s own tooltips, the port-map legend and the interface table in `pages/DeviceDetail.jsx`.</small>',
    '',
  );
  return L.join('\n');
}
