/**
 * How a device gets into the controller — a page of its own.
 *
 * Everything else in this handbook documents a screen. This documents the one
 * workflow that has none: a router presents a shared secret and the controller
 * creates the row. It sits directly under the handbook's front page because it
 * is what someone onboarding hardware needs first, and because the Devices page
 * assumes it has already happened.
 */
import { readRegistrationFacts } from './extract-registration.ts';
import { cell } from './mdx.ts';

export async function registrationGuide(): Promise<string | undefined> {
  const r = await readRegistrationFacts();
  if (!r) return undefined;

  const setting = (n: string) => r.settings.find((s) => s.name === n);
  const auto = setting('registration_enabled');
  const admission = setting('require_serial_admission');
  const secret = setting('shared_secret');
  const L: string[] = [];

  L.push(
    'There is no **Add device** button in the controller, and that is not an omission. A router puts itself in the inventory: it presents a secret that belongs to an organization, and the controller creates the record. This page is what has to be true for that to work.',
    '',
    '<Callout type="info">Everything else in this handbook describes a screen. This describes a process — most of it happens on the device, and the controller’s part is a handful of settings on the organization.</Callout>',
    '',
  );

  // ---- prerequisites
  L.push(
    '## Before a device can register',
    '',
    'Three things, all on the organization the device will belong to. They live on that organization’s configuration settings.',
    '',
    '| Setting | Default | What it does |',
    '| --- | --- | --- |',
  );
  for (const s of r.settings) {
    L.push(`| **${cell(s.label)}** | ${s.def ? `**${s.def}**` : '—'} | ${cell(s.help)} |`);
  }
  L.push('');
  if (auto) {
    L.push(
      `Auto-registration is **${auto.def} by default**, so in a fresh organization a device that knows the secret can join without anyone doing anything first.`,
      '',
    );
  }
  if (secret) {
    L.push(
      'Every organization has a shared secret — the controller makes one if it is missing, so there is never an organization that devices cannot join for want of a secret.',
      '',
    );
  }
  L.push(
    '<Callout type="warn">Two more conditions are easy to miss. The organization must be **active** — the controller looks up the secret and the organization’s active state together, so a correct secret on a deactivated organization is refused. And there is a **controller-wide** registration switch above the per-organization one; with that off, nothing registers anywhere.</Callout>',
    '',
  );

  // ---- the steps
  L.push('## How it happens', '', '<Steps>', '');
  L.push(
    '<Step>',
    '',
    '### Set the controller on the router',
    '',
    'This half is done on the device, not in the controller. Open the router' + "’" + 's own interface and go to **System ' + "›" + ' SD Controller**. You can get there without separate network access: the **Web access** button on the device page proxies to it.',
    '',
    'Fill in the **DC (Main Server)** card:',
    '',
    '| Field | What it takes |',
    '| --- | --- |',
    '| **URL** | Where the controller is hosted, scheme included ' + "—" + ' for example `https://controller.nexapp.co.in` |',
    '| **Shared Secret** | The organization' + "’" + 's shared secret, copied from the controller |',
    '| **Management Interface** | The out-of-band interface the controller reaches it on, such as `oobm0` |',
    '| **Management IP** | The address on that interface |',
    '| **Verify TLS** | Whether to check the controller' + "’" + 's certificate |',
    '',
    '**Controller Service** must be **Enabled** ' + "—" + ' it is the switch for the connection service itself, separate from whether a server is configured.',
    '',
    'A **DR (Backup Server)** can be added for failover, but only after DC/DR automatic failover is turned on; until then the card says so rather than accepting one.',
    '',
    r.agentKeys.length
      ? `Underneath, these are the management agent${"’"}s own settings ${"—"} the URL is stored as \`${cell(r.agentKeys.find((k) => k.endsWith('.url')) ?? 'http.url')}\`, and the agent fills in the rest itself once it has registered.`
      : '',
    r.agentPackages.length > 1
      ? `That package was renamed across firmware generations ${"—"} ${r.agentPackages.map((x) => `\`${cell(x)}\``).join(', ')} ${"—"} so on a mixed-firmware fleet the same setting sits under a different name depending on the version.`
      : '',
    '',
    '<Callout type="warn">The secret is the only thing that decides which organization the device joins. Nothing about the URL, the hardware or the name changes that ' + "—" + ' so a device set up with the wrong secret joins the wrong organization and looks entirely normal doing it.</Callout>',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### The device calls the controller',
    '',
    r.endpoint
      ? `The agent posts the secret and its own identity to \`${cell(r.endpoint)}\` on the URL you gave it. Nothing needs to exist in the controller beforehand — the record is created by this call.`
      : 'It presents the secret and its own identity; the record is created by this call.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### The controller derives its key',
    '',
    r.keyInputs && r.keyLength
      ? `The device’s **Key** — the shared secret it authenticates with afterwards — is a ${r.keyLength}-character hash of its ${r.hardwareId ? `\`${cell(r.keyInputs[0])}\`` : `\`${cell(r.keyInputs[1])}\``} combined with the organization’s secret. It is derived rather than random, which is what makes re-registering the same hardware safe: it comes back as the same device, not a duplicate.`
      : 'The device is issued a key, which it uses to authenticate from then on.',
    '',
    '</Step>',
    '',
  );
  if (admission) {
    L.push(
      '<Step>',
      '',
      '### The admission gate, if the organization uses one',
      '',
      `\`${cell(admission.label)}\` is **${admission.def} by default**. Turned on, a newly registered device is held as **pending admission** until its serial appears in that organization’s **Allowed Serial Numbers**. A device that has registered before keeps whatever state it already had — turning the gate on does not retrospectively lock out the fleet.`,
      '',
      '</Step>',
      '',
    );
  }
  L.push(
    '<Step>',
    '',
    '### Wait for it to come up',
    '',
    'Registration is not instant. Allow around **five minutes** for the device to appear Online in the controller with its status, management IP and the rest filled in — the agent registers, then reports, and the controller has both before the row looks complete.',
    '',
    'The router says where it has got to while you wait. Its **Live Status** panel carries six tiles: **Service** (is the connection service running), **Connection** (has it reached the controller), **Active Server** (DC or DR), **Failover**, **Management IP**, and **Device Status**. A device showing *Connected* there but not yet listed in the controller is mid-registration, not broken.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### It appears in Devices',
    '',
    r.agentKeys.length >= 2
      ? `The agent stores what it was issued — ${r.agentKeys.filter((k) => !k.endsWith('.url')).map((k) => `\`${cell(k)}\``).join(', ')} — and uses those from then on, so the secret is needed only for this first call.`
      : '',
    '',
    'From here the normal rules apply: templates marked to apply automatically attach themselves, and the **Config** column reports whether what was pushed actually applied.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );

  // ---- registering again
  if (r.updatable.length) {
    L.push(
      '## When a device registers again',
      '',
      `Re-flashing or rebooting a device can make it register a second time. Because the key is derived from the hardware rather than issued at random, the controller recognises it and updates the existing record instead of creating another one. ${r.updatable.length} fields are refreshed from what the device reports: ${r.updatable.map((f) => `\`${cell(f)}\``).join(', ')}.`,
      '',
      'Everything else you have configured — its name, its group, its templates — is left alone.',
      '',
    );
  }

  // ---- checking it worked
  L.push(
    '## Checking it worked',
    '',
    '1. Open **Network › Devices**. The device should be listed.',
    '2. Look at **Admission**. Blank means it went straight in. **Pending** or **Rejected** means the gate stopped it.',
    '3. Look at **Config**. That says whether the configuration pushed to it applied — a different question from whether it registered.',
    '',
  );

  // ---- troubleshooting
  L.push(
    '## When it does not work',
    '',
    '| What you see | What it means | What to do |',
    '| --- | --- | --- |',
    `| The device never appears | It cannot reach the controller, has the wrong secret, or${auto ? ` **${cell(auto.label)}** is off for that organization` : ' auto-registration is off'}. | Check the controller side first — nothing on the Devices page creates a device, so there is nothing to fix there. |`,
    '| It joined the wrong organization | The secret decides the organization, and it had a different one. | Correct the secret on the device. |',
    admission
      ? '| It shows **Pending** | The organization requires serial admission and this serial has not been allowed. | Add the serial to **Allowed Serial Numbers**, then admit the device. |'
      : '',
    admission
      ? '| It shows **Rejected** | It registered, and the gate deactivated it because the serial was not on the list. | Same fix — allow the serial, then admit it. |'
      : '',
    r.refusals.length
      ? `| The router reports “${cell(r.refusals[0])}” | The secret matches no organization, or that organization is not active. | Check the secret, and that the organization is active. |`
      : '',
    r.refusals.length > 1
      ? `| The router reports “${cell(r.refusals[1])}” | Registration is off — for that organization, or controller-wide. | Turn it on for the organization; if it is already on, the controller-wide switch is off. |`
      : '',
    '| The router says *Connected* but the controller does not list it | Registration and the first report take a few minutes. | Give it around five minutes before treating it as a fault. |',
    '| The router never reaches *Connected* | The URL is wrong or unreachable, or **Controller Service** is off on the device. | Check the URL includes the scheme, and that the service toggle is enabled. |',
    '| Connected, but no management IP in the controller | The management interface or IP on the DC card does not match what the controller can reach. | Correct them on the router’s SD Controller page. |',
    '| It appears twice | Two different pieces of hardware, or the identity the key is derived from changed. | The key is derived from the hardware, so one device should only ever produce one record. |',
    '| Config says `deactivated` but Admission is blank | It was deactivated by hand. Admission is not involved. | Reactivate it on the device page. |',
    '',
  );

  L.push(
    '---',
    '',
    '<small>The controller half is read from source: the organization configuration settings in `config/base/multitenancy.py`; `generate_key` in `config/base/device.py`; `CONSISTENT_REGISTRATION` and `HARDWARE_ID_ENABLED` in `config/settings.py`; and the register view’s updatable fields and admission gate in `config/controller/views.py`. The router half — the SD Controller page, its fields and its Live Status tiles — is written from the device’s own interface, because that firmware is not in this repository and so cannot be generated or checked by the build.</small>',
    '',
  );
  return L.filter((x) => x !== '').length ? L.join('\n') : undefined;
}
