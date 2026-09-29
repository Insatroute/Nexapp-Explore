/**
 * Getting from nothing to a connected device.
 *
 * Every piece of this is already documented on its own page — the organization,
 * the VPN server, the template, registration. What none of those pages can say
 * is the ORDER, because each only knows about itself. A reader setting up for
 * the first time has to discover by failing that a VPN-client template cannot
 * be saved without a VPN server, and that a device registering before the
 * template exists will not pick it up.
 *
 * So this page is the sequence and the reasons, and it links out for the
 * detail rather than repeating it. It composes the other extractors rather than
 * adding one: everything here is already read from source somewhere else.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { FE, URL_BASE } from './config.ts';
import { readFormFields } from './read-form-fields.ts';
import { readVpnFacts } from './extract-vpn.ts';
import { readTemplateFacts } from './extract-templates.ts';
import { readRegistrationFacts } from './extract-registration.ts';
import { cell } from './mdx.ts';

export async function onboardingGuide(): Promise<string | undefined> {
  const [orgSrc, vpn, tpl, reg] = await Promise.all([
    readFile(path.join(FE, 'pages', 'OrgForm.jsx'), 'utf8').catch(() => ''),
    readVpnFacts(),
    readTemplateFacts(),
    readRegistrationFacts(),
  ]);
  if (!orgSrc || !vpn || !tpl || !reg) return undefined;

  const orgFields = readFormFields(orgSrc);
  const orgReq = orgFields.filter((f) => f.required).map((f) => f.label);
  const secretField = orgFields.find((f) => /secret/i.test(f.label));
  const regField = orgFields.find((f) => /registration/i.test(f.label));
  const vpnReq = vpn.fields.filter((f) => f.required && !f.requiredSometimes).map((f) => f.label);
  const vpnPurpose = tpl.purposes.find((p) => p.key === 'vpn');
  const L: string[] = [];

  L.push(
    'Four things have to exist before a router is doing useful work, and they have to exist **in this order**. Each page below documents its own step in full; this one is the sequence, and why it is that sequence.',
    '',
  );

  // ---- the dependency chain: the thing no other page can say
  L.push(
    '## The order, and why',
    '',
    '| # | What you create | What it gives the next step |',
    '| --- | --- | --- |',
    '| 1 | **Organization** | The shared secret a device registers with, and the scope everything else belongs to |',
    '| 2 | **VPN server** | The server devices connect back to |',
    '| 3 | **Template** | The thing that actually attaches the VPN to a device |',
    '| 4 | **Device** | Registers itself, and picks up what is waiting for it |',
    '',
    '<Callout type="warn">A device is never attached to a VPN server directly. A **template** does that, and a VPN-client template cannot be saved without naming a server. So the server must exist before the template, and the template before the device registers — otherwise you are attaching it by hand afterwards.</Callout>',
    '',
  );

  // ---- the two paths
  L.push(
    '## Two situations',
    '',
    '<Tabs items={["Starting from nothing", "Adding to an organization that exists"]}>',
    '',
    '<Tab value="Starting from nothing">',
    '',
    'No organization yet. Four steps, in order.',
    '',
    '<Steps>',
    '',
    '<Step>',
    '',
    '### Create the organization',
    '',
    `**Administration › Organizations › Add organization.**${orgReq.length ? ` Only ${orgReq.map((r) => `**${cell(r)}**`).join(' and ')} ${orgReq.length === 1 ? 'is' : 'are'} required.` : ''}`,
    '',
    regField?.hints.length
      ? `Two fields on this form decide whether devices can join it at all. **${cell(regField.label)}** — ${cell(regField.hints[0].text)}`
      : '',
    secretField?.hints.length
      ? `**${cell(secretField.label)}** — ${cell(secretField.hints[0].text)} Note it down; you will put it on the router in step 4.`
      : '',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Create the VPN server',
    '',
    `**Network › Configuration › VPN Servers › Add VPN server.** ${vpnReq.length ? `${vpnReq.map((r) => `**${cell(r)}**`).join(' and ')} are always required; ` : ''}the backend you choose decides what else is.`,
    '',
    `The backends differ in what they need: ${vpn.backends
      .map((b) => {
        const n = [
          b.needsCa && 'a certificate authority',
          b.needsSubnet && 'a subnet',
          b.needsAuthToken && 'an auth token',
        ].filter(Boolean);
        return `**${cell(b.label)}** (${n.length ? n.join(' and ') : 'nothing extra'})`;
      })
      .join(', ')}. Set the organization to the one from step 1, or leave it shared.`,
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Create the VPN-client template',
    '',
    `**Network › Configuration › Templates › Add template**, and choose **${cell(vpnPurpose?.title ?? 'Connect to a VPN')}**. It asks for the VPN server from step 2 and will not continue without one.`,
    '',
    '**Mark it to apply to new devices automatically.** This is the step people miss: without it the template exists but attaches to nothing, and every device has to be done by hand.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Register the device',
    '',
    'Put the organization’s shared secret on the router. It calls the controller, the record is created, and the template from step 3 attaches itself because it is marked to apply automatically.',
    '',
    `Full detail: [Registering a device](${URL_BASE}/registering-a-device).`,
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
    '</Tab>',
    '',
    '<Tab value="Adding to an organization that exists">',
    '',
    'The organization, its VPN server and its templates are already there. Only the device is new.',
    '',
    '<Steps>',
    '',
    '<Step>',
    '',
    '### Get the organization’s shared secret',
    '',
    '**Administration › Organizations**, open the one the device belongs to. The secret is on that form.',
    '',
    'While you are there, check that registration is enabled for it — a device with the right secret still cannot join an organization that has it switched off.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Allow the serial, if the organization requires it',
    '',
    reg.settings.find((s) => s.name === 'require_serial_admission')
      ? 'If that organization requires serial admission, add the device’s serial to **Administration › Users & Organizations › Allowed Serial Numbers** **before** it registers. Otherwise it arrives already deactivated and you have to admit it afterwards.'
      : 'Check whether the organization holds new devices for admission.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Put the secret on the router',
    '',
    'It registers, appears in **Network › Devices**, and picks up every template that organization marks as automatic. Nothing else to do.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
    '</Tab>',
    '',
    '</Tabs>',
    '',
  );

  // ---- what breaks
  L.push(
    '## If you do it out of order',
    '',
    '| What you did | What happens | The fix |',
    '| --- | --- | --- |',
    '| Made the template before the VPN server | It cannot be saved — a VPN-client template must name a server | Create the server first |',
    '| Registered the device before the template | It joins, but carries nothing | Attach the template to it by hand, or mark the template automatic and re-register |',
    '| Made the template but did not mark it automatic | It exists and attaches to nothing | Set it to apply to new devices, then attach it to the ones already there |',
    '| Registered with the wrong secret | It joins the wrong organization | The secret is the only thing that decides the organization — correct it on the router |',
    '| Registered before allowing the serial | It arrives deactivated, shown as **Rejected** | Allow the serial, then admit the device |',
    '',
  );

  // ---- where the detail lives
  L.push(
    '## Each step in full',
    '',
    '<Cards>',
    `  <Card title="Registering a device" href="${URL_BASE}/registering-a-device" description="The shared secret, how the key is derived, and the admission gate." />`,
    `  <Card title="VPN Servers" href="${URL_BASE}/network/configuration/vpn-servers" description="Every field, and what each backend requires." />`,
    `  <Card title="Templates" href="${URL_BASE}/network/configuration/templates" description="The wizard, the advanced form, and how a template reaches devices." />`,
    `  <Card title="Devices" href="${URL_BASE}/network/devices" description="The inventory, the Admission column, and what to do once a device is in." />`,
    '</Cards>',
    '',
    '---',
    '',
    '<small>Read from: the organization form in `pages/OrgForm.jsx`; the backend requirements in `pages/VpnForm.jsx`; the template purposes in `pages/TemplateWizard.jsx`; and the registration settings in `config/base/multitenancy.py`.</small>',
    '',
  );
  return L.join('\n');
}
