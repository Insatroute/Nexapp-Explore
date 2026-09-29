/**
 * The task guide for a device's Status tab.
 *
 * Shaped for a READ-ONLY view, and deliberately not forced into the same eleven
 * headings a form gets. Nothing here is created, saved, applied or assigned, so
 * those headings would carry invented content; the page says so once, plainly,
 * instead of leaving four sections that look overlooked.
 *
 * What a read-only view does need is the opposite emphasis: how fresh the
 * numbers are, why the tab looks different on different devices, and what an
 * absent value means. All three are stated in the panel itself and none of them
 * were in the handbook.
 */
import { readTabFields, type TabFields } from './extract-tab-fields.ts';
import { cell } from './mdx.ts';


function readingTables(t: TabFields): string[] {
  const L: string[] = ['| Where | Readings |', '| --- | --- |'];
  for (const g of t.groups) {
    for (const k of g.cards) {
      const where = k.title && k.title !== g.label ? `${g.label} › ${k.title}` : g.label || k.title;
      L.push(`| ${cell(where)} | ${cell(k.fields.join(', '))} |`);
    }
  }
  return L;
}

export async function statusTabGuide(): Promise<string> {
  const tabs = await readTabFields();
  if (!tabs.length) return '';
  const L: string[] = [];

  for (const t of tabs) {
    const total = t.groups.reduce((a, g) => a + g.cards.reduce((b, c) => b + c.fields.length, 0), 0);
    const conditional = t.groups.filter((g) => g.conditional).map((g) => g.label);

    L.push('', `## Reading the ${t.label} tab`, '');
    L.push(
      `What one device is reporting about itself — ${total} readings across ${t.groups.length} sections. Open it from **Network › Devices**, open a device, then **${cell(t.label)}**.`,
      '',
    );

    // The one thing a reader must know before trusting any number on the tab.
    if (t.note) {
      L.push(`<Callout type="warn">**${cell(t.note)}**</Callout>`, '');
      L.push(
        'Everything below is a snapshot from the device’s last report, not a live reading. Opening the tab costs no extra request, because it renders from the payload the page already holds — which is the same reason it cannot be fresher than that last check-in.',
        '',
      );
    }

    // Why the tab looks different device to device.
    if (conditional.length) {
      L.push(
        '### Why the sections change between devices',
        '',
        `The tab has ${t.groups.length} sections — ${t.groups.map((g) => `**${cell(g.label)}**`).join(', ')} — and each appears only for a device that reports it. A router with no modem shows no ${cell(conditional.find((c) => /cellular/i.test(c)) ?? conditional[0])} section at all.`,
        '',
        '<Callout type="info">A section you cannot see is not a section you have missed. If a device shows fewer of them than another, it is reporting less — not configured differently here.</Callout>',
        '',
      );
    }

    // ---- the readings themselves
    L.push('### What it shows', '', ...readingTables(t), '');
    L.push(
      'The **values** are deliberately not listed. They come from the device’s own check-in and change with every one, so a figure written here would be wrong by the next report. What is documented is the inventory: which readings a section can carry.',
      '',
      'Two details worth knowing while reading them:',
      '',
      '- **A dash means the device did not report that value**, not that the value is zero.',
      '- **SLA %** is the one reading that does not come from the device. It is fetched separately from the availability endpoint, so it can be blank while every other System reading is correct — a failure there falls back to a dash rather than blanking the card.',
      '',
    );

    // ---- empty state
    if (t.empty) {
      L.push(
        '### When the tab is empty',
        '',
        `> **${cell(t.empty.title)}**  \n> ${cell(t.empty.detail)}`,
        '',
        '<Callout type="warn">A device that has **never** reported and one that **went quiet days ago** look identical here. The controller keeps only the last 24 hours, so beyond that window there is nothing to tell them apart — check the device’s Events or its last-seen time if you need to know which.</Callout>',
        '',
      );
    }

    // ---- what does not apply, said once
    L.push(
      '### Nothing is configured here',
      '',
      `${cell(t.label)} is read-only: there is nothing to create, no fields to fill in, nothing to save, validate or assign. Changing what a device reports means changing the device, not this tab. The parts of this handbook that cover creating and applying configuration are the pages for **Templates**, **VPN Servers** and the **Policy Engine**.`,
      '',
    );

    // ---- troubleshooting
    L.push(
      '### Common problems',
      '',
      '| What you see | What it means | What to do |',
      '| --- | --- | --- |',
      `| “${cell(t.empty?.title ?? 'No status')}” | The device has not reported inside the window the controller keeps. | Check the monitoring agent is running on the device and can reach the controller. |`,
      '| The numbers look stale | They are — this is the last check-in, not a live poll. | Use the refresh button in the page header. |',
      '| A section is missing | The device is not reporting that kind of data. | Nothing to fix here; a router with no modem has no cellular section. |',
      '| A single value shows a dash | That reading was not in the report. | Expected for hardware that does not have it. |',
      '| **SLA %** is blank but everything else is fine | It comes from a different endpoint than the rest of the card. | Unrelated to the device’s reporting; the rest of the tab is still accurate. |',
      '| Online in the header, but nothing here | The header and this tab are answering different questions, and this one needs a recent report. | Refresh; if it stays empty the device is reachable but not reporting. |',
      '',
    );

    // ---- screenshots
    L.push(
      '### Screenshots',
      '',
      '<Callout type="warn">None yet. Screenshots cannot be generated from the source the rest of this page is read from — they have to be captured from a running controller, which needs credentials and a decision about putting production data in the repository. Until that is set up, this section is deliberately empty rather than quietly missing.</Callout>',
      '',
    );

    L.push(
      '---',
      '',
      `<small>Read from: \`${t.component}\` — its \`sections\` list and their conditions, the \`<StatusCard>\` headings inside each, the \`<Field label>\` readings under those, and the panel’s own hint and empty-state wording.</small>`,
      '',
    );
  }
  return L.join('\n');
}
