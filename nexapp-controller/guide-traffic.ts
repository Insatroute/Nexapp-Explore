/**
 * The task guide for a device's Traffic tab.
 *
 * Read-only, like Status, so it takes the same shape: what it shows, how to
 * read it, and what it cannot tell you — rather than eleven headings with four
 * of them saying "not applicable".
 *
 * The one rule worth the whole page is the drill-down: what you can split a row
 * by depends on what kind of row it is, and the reason is the payload rather
 * than the interface. Nobody works that out from the screen.
 */
import { readTrafficFacts } from './extract-traffic.ts';
import { cell } from './mdx.ts';


/** `apps` -> the panel heading a reader actually sees. */
function panelName(token: string, kinds: { key: string; panel: string }[]): string {
  const hit = kinds.find((k) => k.key.startsWith(token.replace(/s$/, '').slice(0, 4)));
  return hit ? hit.panel : token;
}

export async function trafficGuide(): Promise<string> {
  const t = await readTrafficFacts();
  if (!t) return '';

  const summary = t.subs[0];
  const realtime = t.subs.find((s) => /real/i.test(s.label));
  const clientRule = t.drilldown.find((d) => d.from === 'client');
  const others = t.drilldown.filter((d) => d.from !== 'client');
  const L: string[] = [];

  L.push('', '## Reading the Traffic tab', '');
  L.push(
    `What one device is carrying, by application, host, protocol and client. Open it from **Network › Devices**, open a device, then **Traffic**.`,
    '',
  );

  // ---- sub-tabs
  if (t.subs.length) {
    L.push(
      `It has ${t.subs.length} views: ${t.subs.map((s) => `**${cell(s.label)}**`).join(' · ')}. ` +
        `**${cell(summary.label)}** is the rollup for a date range and is where almost all reading happens; ` +
        (realtime
          ? `**${cell(realtime.label)}** is the last snapshot's top talkers, and is fetched only when you first open it — a reader who never looks never pays for it.`
          : ''),
      '',
    );
  }

  // ---- 4. how to read it
  L.push('### Reading it', '', '<Steps>', '');
  L.push(
    '<Step>',
    '',
    '### Choose a range',
    '',
    `${t.presets.map((p) => `**${cell(p.label)}**`).join(', ')}, or **Custom** for any two dates. The range drives every panel on the view at once.`,
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Read the totals',
    '',
    'Total traffic gives the figure for the whole range; the hourly chart shows how it was distributed. A single tall bar and a flat day add to the same total and mean very different things.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Read the breakdowns',
    '',
    `The four panels split that same total ${t.kinds.length} ways: ${t.kinds.map((k) => `**${cell(k.panel)}**`).join(', ')}. They are views of one number, not separate measurements.`,
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Drill into a row',
    '',
    'Opening a row narrows everything to that one thing. It is instant — no spinner, no second wait — because it is a change of view rather than another request.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );

  // ---- the drill-down rule
  if (clientRule) {
    L.push(
      '### What you can drill into, and why',
      '',
      'This is the part the screen does not explain. What a row can be split by depends on what kind of row it is:',
      '',
      '| Opening a… | Can be split by |',
      '| --- | --- |',
    );
    for (const d of t.drilldown) {
      const from = t.kinds.find((k) => k.key === d.from)?.label ?? d.from;
      L.push(`| ${cell(from)} | ${d.into.map((x) => cell(panelName(x, t.kinds))).join(', ')} |`);
    }
    L.push(
      '',
      `A **${cell(t.kinds.find((k) => k.key === 'client')?.label ?? 'Client')}** is the only row that splits several ways, and the only one that leads anywhere further. ` +
        `${others.map((d) => `**${cell(t.kinds.find((k) => k.key === d.from)?.label ?? d.from)}**`).join(', ')} rows can only be split by clients — not a limitation of the interface but of the data behind it, which carries that one split and no other.`,
      '',
      '<Callout type="info">Inside a drill-down the other panels are already the split of the thing you opened, so only the client rows remain clickable. A dead end here is the data saying there is nothing further to show.</Callout>',
      '',
    );
  }

  // ---- 8. what it costs / what to expect
  L.push(
    '### What the numbers are',
    '',
    'One request per device and range feeds every panel on the summary, drill-downs included — which is why opening a row is instant, and why every panel always agrees with the total above it.',
    '',
    'Application names arrive as identifiers rather than names — `netflix.com`, or `unknown` when the traffic could not be classified. Where the rollup carries a readable label it is used; where it does not, one is derived from the identifier. **`Unknown` is a real category**, not a missing value: it is traffic DPI could not attribute.',
    '',
  );

  // ---- 9. verify
  L.push(
    '### Checking what you are seeing',
    '',
    `1. The range is shown beside the presets — confirm you are looking at the dates you meant, particularly after using **Custom**.`,
    realtime
      ? `2. **${cell(realtime.label)}** is a different question: the most recent snapshot rather than a range. Use it to confirm something is happening *now*; use ${cell(summary.label)} to ask what happened over a period.`
      : '',
    '3. Every panel sums to the total. If a breakdown looks wrong, compare it against the total before assuming the data is.',
    '',
  );

  // ---- read-only note
  L.push(
    '### Nothing is configured here',
    '',
    'Traffic is read-only: there is nothing to create, save or apply. What appears depends on what DPI classified on the device, so changing it means changing the device’s DPI configuration — on its **CPE** tab — not this view.',
    '',
  );

  // ---- 10. troubleshooting
  L.push(
    '### Common problems',
    '',
    '| What you see | What it means | What to do |',
    '| --- | --- | --- |',
    '| No traffic for a range that should have some | Nothing was recorded for those dates, or DPI is not running on the device. | Check a shorter, more recent range first, then the device’s DPI configuration. |',
    '| A large share under `Unknown` | DPI could not attribute that traffic. | Expected for encrypted or unrecognised protocols; it is a category, not an error. |',
    '| A row will not open | Only client rows lead further once you are inside a drill-down. | The table above says which kinds split which ways. |',
    '| The breakdowns do not add up to the total | They do — they are four views of one number. | Check the range did not change between readings. |',
    realtime
      ? `| **${cell(realtime.label)}** is empty but the summary is not | It shows the last snapshot, not the range. | A quiet device can have history but nothing happening right now. |`
      : '',
    '| Numbers differ from the CPE tab | This view is the controller’s rollup; the CPE tab reads the router directly. | They are different sources, sampled at different times. |',
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
    '<small>Read from: `SUBS` and `DETAIL_PANELS` in `components/DeviceTrafficPanel.jsx`; `PRESETS`, `KINDS` and `appLabel` in `components/traffic/trafficModel.js`.</small>',
    '',
  );
  return L.filter((x) => x !== '').length ? L.join('\n') : '';
}
