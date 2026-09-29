/**
 * The task guide for VPN Servers.
 *
 * Its own guide rather than the shared Policy Engine one: this is a bespoke
 * form, and the thing that governs it — which fields a backend requires, and
 * why the backend can stop being editable — has no equivalent elsewhere.
 *
 * The backend table and the field list are read from source on every build. The
 * prose between them is written here, and deliberately stays connective: every
 * requirement, label, hint and error string it refers to comes from the
 * extractor, so it cannot claim something the console does not do.
 */
import { readVpnFacts } from './extract-vpn.ts';
import { cell } from './mdx.ts';


export async function vpnGuide(): Promise<string> {
  const v = await readVpnFacts();
  if (!v) return '';

  const needCa = v.backends.filter((b) => b.needsCa);
  const needSubnet = v.backends.filter((b) => b.needsSubnet);
  const needToken = v.backends.filter((b) => b.needsAuthToken);
  const plain = v.backends.filter((b) => !b.needsCa && !b.needsSubnet && !b.needsAuthToken);
  const L: string[] = [];

  L.push('', '## Configuring a VPN server', '');
  L.push(
    'A walk through adding a VPN server end to end. The card above says where the page is and who may open it; this is how to use it.',
    '',
  );

  // ---- 2. prerequisites
  L.push(
    '### Before you start',
    '',
    '- You need the permission named on the card above. Creating and editing are separate rights, so a reader who can open this page may still not be able to save.',
    '- **Decide the backend first.** It determines which other fields you must supply, and it is the one choice that becomes hard to change later.',
  );
  if (needCa.length) {
    L.push(
      `- For ${needCa.map((b) => `**${b.label}**`).join(' and ')}, a **certificate authority** must already exist. You can create one from this form, but the CA has to be there before the server will save.`,
      '- That CA also generates Diffie–Hellman parameters, and generating a real 2048-bit set takes **minutes**. Until it finishes the server carries a placeholder, and the form says so rather than letting you assume it is ready.',
    );
  }
  if (needSubnet.length) {
    L.push(
      `- For ${needSubnet.map((b) => `**${b.label}**`).join(', ')}, a **subnet** must exist in IPAM to hand out client addresses from.`,
    );
  }
  if (needToken.length) {
    L.push(
      `- For ${needToken.map((b) => `**${b.label}**`).join(' and ')}, you need its API **auth token** before you begin.`,
    );
  }
  L.push('- Know the host devices will reach this server on — a hostname or an IP.', '');

  // ---- what each backend needs
  L.push(
    '### What each backend requires',
    '',
    'These were established by posting to the API and reading the validation errors back, not inferred from the names. The dotted path is what the model validates against — it is shown because an invented value is rejected outright.',
    '',
    '| Backend | Also needs | Validates as |',
    '| --- | --- | --- |',
  );
  for (const b of v.backends) {
    const n = [
      b.needsCa && 'a certificate authority',
      b.needsCert && 'a server certificate',
      b.needsSubnet && 'a subnet',
      b.needsAuthToken && 'an auth token',
    ].filter(Boolean) as string[];
    L.push(`| **${cell(b.label)}** | ${n.length ? n.join(', ') : 'nothing beyond the common fields'} | \`${cell(b.path)}\` |`);
  }
  L.push('');
  if (plain.length) {
    L.push(
      `${plain.map((b) => `**${b.label}**`).join(' and ')} ${plain.length === 1 ? 'is' : 'are'} grouped with the backends that need nothing extra. If that turns out to be wrong for your deployment the API says so, and the console shows its message word for word.`,
      '',
    );
  }

  // ---- 4. steps
  L.push(
    '### Add one, step by step',
    '',
    '<Steps>',
    '',
    '<Step>',
    '',
    '### Open the form',
    '',
    'Go to **Network › Configuration › VPN Servers** and choose **Add VPN server**.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Name it',
    '',
    'Enter a **Name**. This is what you will pick from later when building the template, so name it for the role it plays.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Point it at a host',
    '',
    'Enter the **Host** devices connect to — a hostname or an IP address.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Choose the scope',
    '',
    'Choose the **Organization**, or leave it unset to share the server across all of them.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Choose the backend',
    '',
    'Choose the **VPN backend**. The form immediately seeds a minimal configuration that satisfies that backend’s schema, and shows only the fields that backend actually uses.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Fill in what the backend requires',
    '',
    'Fill in what the backend requires — the table above says which. The **Save** button stays disabled until the name, the host and the backend’s own requirements are all present, so it cannot be submitted half-finished.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Leave the key alone',
    '',
    'Leave **Key** alone on a new server. It is the shared secret devices authenticate with, and it is generated for you when you save.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Adjust the configuration',
    '',
    'Optionally adjust the **JSON** configuration. It is seeded for the backend you picked and validated against that backend’s schema on save — it cannot be left empty, because the API rejects an empty object.',
    '',
    '</Step>',
    '',
    '<Step>',
    '',
    '### Save',
    '',
    'Choose **Save**. The console confirms *VPN server “‹name›” created.* and opens the saved server.',
    '',
    '</Step>',
    '',
    '</Steps>',
    '',
  );

  // ---- 5. fields
  L.push('### Every field', '', '| Field | Required | What it is |', '| --- | --- | --- |');
  for (const f of v.fields) {
    // Not every field carries help text in the form. Where it does not, the
    // console still says something useful — what a blank dropdown means, what
    // the box expects, whether it can be edited at all — and that beats an em
    // dash in a column headed "what it is".
    const notes = [
      f.readOnly && 'Read-only — set by the controller, and shown once the server is saved.',
      ...f.hints.map((h) => cell(h.text)),
      f.blank && `Left blank: ${cell(f.blank)}.`,
      f.placeholder && !f.hints.length && `Example: \`${cell(f.placeholder)}\``,
    ]
      .filter(Boolean)
      .join(' ');
    const req = f.requiredSometimes ? 'for some backends' : f.required ? '**yes**' : 'no';
    L.push(`| ${cell(f.label)} | ${req} | ${notes || '—'} |`);
  }
  L.push(
    '',
    'Several are conditional: the certificate fields appear only for a backend that uses certificates, the subnet fields only for one that hands out addresses, and the webhook fields only for the Management Plane. A field you cannot see is not one you have missed.',
    '',
    'Three values on a saved server are secrets — the certificate private key, the Diffie–Hellman parameters and the WireGuard private key. They stay masked until you ask to see them.',
    '',
  );

  // ---- 6. saving and validation
  L.push(
    '### Saving and validation',
    '',
    'Three checks, in this order:',
    '',
    '1. **The Save button itself.** Disabled until the name and host are filled in, the JSON parses, and the backend’s own requirement is met.',
    '2. **The JSON.** Parsed as you type; a syntax error is reported inline and blocks saving.',
    '3. **The server.** Anything else is decided by the API. If it rejects the record, the console shows its reply field by field rather than a bare status code — the message you see is the API’s own.',
    '',
    'On success: *VPN server “‹name›” created.* for a new one, *… saved.* for an edit.',
    '',
  );

  // ---- 7. applying
  L.push(
    '### How it reaches devices',
    '',
    'A device is never attached to a VPN server directly. A **template** of type *VPN-client* is what does it, and that template names exactly one server — it cannot be saved without one. So the sequence is:',
    '',
    '1. Create the VPN server here.',
    '2. Go to **Network › Configuration › Templates** and create a template of type **VPN-client**, selecting this server.',
    '3. Assign that template to devices. A template marked **Default** is applied automatically to new devices in its organization; one marked **Required** cannot be removed from a device once assigned.',
    '',
    'This is also why deleting a server is destructive in a way the list does not show: the console warns that templates using it will break.',
    '',
  );

  // ---- 8 + 9. expected result and verification
  L.push(
    '### What to expect, and how to verify',
    '',
    'Immediately after saving, the server appears in the list with its host, backend, organization and certificate. That confirms the controller stored it — nothing more.',
    '',
    'To confirm it is actually in use:',
    '',
    '1. Check the **Certificate** column. A server whose certificate has lapsed stops accepting the devices configured against it, which is why the column exists.',
    '2. Open a device that should be using it, and look at its configuration for the template you attached.',
    '3. For a certificate-based backend, confirm the Diffie–Hellman parameters have finished generating — until they do, the server is carrying a placeholder.',
    '',
  );

  // ---- 10. troubleshooting
  L.push(
    '### Common problems',
    '',
    '| What you see | What it means | What to do |',
    '| --- | --- | --- |',
    '| **Save** stays greyed out | Name, host, the backend’s requirement, or the JSON. | The disabled button is the form telling you something above it is incomplete. |',
  );
  if (needCa.length) {
    L.push('| “CA is required with this VPN backend” | The backend needs a certificate authority and none was chosen. | Pick a CA, or create one from this form. |');
  }
  if (needSubnet.length) {
    L.push('| “An IPv4 or IPv6 subnet is required for this VPN backend” | The backend hands out client addresses and has no subnet. | Choose a subnet from IPAM. |');
  }
  L.push(
    '| “‹key› is a required property” | The configuration was emptied. The API will not accept an empty object. | Restore the seeded configuration by re-selecting the backend. |',
    '| “is not a valid choice” on the backend | The stored backend is not one the server recognises. | Choose one from the list; the dotted paths in the table above are the only accepted values. |',
    '| The backend cannot be changed | Devices are already using this server. | Changing it is only blocked while clients exist — detach them first, or create a new server. |',
  );
  if (needCa.length) {
    L.push('| The server saves but clients cannot connect | The Diffie–Hellman parameters may still be generating. | Give it a few minutes; the form shows a placeholder until the real set is ready. |');
  }
  L.push('| Devices never pick it up | No VPN-client template names it, or none is assigned. | Create the template and assign it. |', '');

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
    '<small>Read from: `BACKENDS` in `pages/VpnList.jsx`, copied there verbatim from `VPN_BACKENDS` in the Django settings; `BACKEND_NEEDS`, `STARTER_CONFIG`, the field labels and hints, the save path and its error handling in `pages/VpnForm.jsx`; and the VPN-client type in `pages/TemplateForm.jsx`.</small>',
    '',
  );
  return L.join('\n');
}
