/** Access Control › Credentials, CAs & Certificates — guide notes (see access-notes.ts). */
import type { AdminNotes, AdminFieldNote } from './admin-notes.ts';

// ------------------------------------------------------------ Access Credentials

const CREDENTIALS: AdminNotes = {
  from: [
    'pages/CredentialList.jsx',
    'components/CredentialFormModal.jsx',
    'components/DeviceCredentialsPanel.jsx',
    'api/client.js',
    'nexapp_controller/connection/base/models.py',
    'nexapp_controller/connection/connectors/ssh.py',
    'nexapp_controller/connection/settings.py',
    'nexapp_controller/connection/api/serializers.py',
    'nexapp_controller/connection/api/views.py',
    'nexapp_security/admin_ssh_key.py',
    'nexapp_security/services/ssh_key_generator.py',
    'vendor/nexapp-users/nexapp_users/api/mixins.py',
  ],
  title: 'Working with access credentials',
  intro: [
    'An access credential is the **SSH login the controller uses to reach a device** — a username, a port, and either a password or a private key. On its own it does nothing: it has to be **attached to a device** (from the device’s **Credentials** tab, or automatically with **Auto add**). Each attachment is a *connection*, and it is over that connection that the controller pushes configuration and runs commands. A device with no credentials attached cannot be reached over SSH by the controller.',
    'The list shows each credential’s **Name**, its **Organization** (*Shared (all organizations)* when it has none), **Connection type**, **Auto add**, **Created** and **Modified**. Passwords and keys are never shown on this page. **Search credentials…** matches the name, the connection type and the organization name as you type. When an organization is chosen in the scope picker at the top, the list shows that organization’s credentials plus the shared ones.',
  ],
  before: [
    'Know the **username and password** (or have the **private key**) the devices accept for SSH. For a key, either paste an existing RSA or Ed25519 private key, or generate a new Ed25519 pair in the form — see *Generate a key pair* below.',
    'Decide the **organization**: a credential with an organization can only be attached to that organization’s devices; a **shared** one can be attached to any device. Only superusers can create shared credentials — for anyone else the server refuses an empty organization.',
    'Decide on **Auto add** before saving — see *What Auto add does* below. It attaches to existing devices too, not only new ones.',
  ],
  tasks: [
    {
      title: 'Create credentials with a password',
      steps: [
        'Open **Access Control › Access Credentials** and press **New credentials**. The **New access credentials** drawer opens.',
        'Type a **Name**, e.g. `Branch routers – root`.',
        'Leave **Connection type** on **SSH** (the only type offered). Choose the **Organization**, or leave **Shared — all organizations**.',
        'Tick **Auto add** only if these credentials should be attached to that organization’s devices automatically.',
        'Leave **Credentials type** on **SSH (password)**. Fill **Username** (at least 2 characters), **Port** (starts at `22`) and **Password** (at least 4 characters).',
        'Press **Create credentials**. The drawer closes with *Created “…”.* and the credential is in the list.',
      ],
      after: [
        '**Create credentials** stays greyed out until Name is filled, Username has at least 2 characters, Port is a whole number from 1 to 65535 and the password has at least 4 characters (a private key: at least 64). The form does not say which one is missing, except for the port, which shows *1–65535* in red.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Create credentials with a private key',
      steps: [
        'In the drawer, choose **SSH (private key)** under **Credentials type**. The secret box becomes **Private key**.',
        'Paste the whole private key, from its `-----BEGIN … PRIVATE KEY-----` line to its `-----END … PRIVATE KEY-----` line. It must be at least 64 characters, unencrypted, and RSA or Ed25519.',
        'Fill **Username** and **Port**, then press **Create credentials**.',
      ],
      after: [
        'The server tries to read the key when you save; a key of any other type is refused with *Unrecognized or unsupported SSH key algorithm, only RSA and ED25519 are currently supported.*',
      ],
    },
    {
      title: 'Generate a key pair',
      steps: [
        'In the drawer, press **Generate Ed25519 keypair**. The controller generates a new Ed25519 key pair and sends it back to the form; nothing is saved yet.',
        'The form switches to **SSH (private key)** and puts the new **private key** in the **Private key** box (unencrypted, OpenSSH format).',
        'A **Public key — install this on the devices** box appears with the public key (a single `ssh-ed25519 …` line ending in the comment `Nexapp-Controller-` plus today’s date) and its SHA256 fingerprint. Press **Copy** and keep it somewhere — this is the only time it is shown.',
        'Fill **Name**, **Username** and **Port**, and press **Create credentials**. The private key is stored with the credential.',
        'Install the public key on the devices: put it in a configuration template so it reaches `/etc/dropbear/authorized_keys` on each device. Until it is there, the devices will refuse this key.',
      ],
      after: [
        'Generating does **not** install anything on any device and does **not** create a template — the public key has to be added by you. Switching **Credentials type**, or closing the drawer, throws the generated pair away.',
      ],
    },
    {
      title: 'Attach credentials to a device',
      steps: [
        'Open the device, then its **Credentials** tab.',
        'Under **Attach credentials**, choose the credential in **Credentials** — only this device’s organization’s credentials and shared ones that are not yet attached are offered — check **Update strategy**, and press **Attach**.',
      ],
      after: [
        'With **Auto add** ticked on the credential this happens on its own — see below.',
      ],
    },
    {
      title: 'Change credentials',
      steps: [
        'Click the credential’s name, or **⋮ › Edit credentials**. The **Edit access credentials** drawer opens with everything except the secret filled in.',
        'Change what you need. Leave **Password** / **Private key** empty to keep the stored one; type a new one to replace it.',
        'Press **Save credentials**. You see *Updated “…”.*',
      ],
      after: [
        'Devices already attached use the new username, port or secret the next time the controller connects to them. Saving with **Auto add** ticked attaches the credential to any matching device that does not have it yet; unticking **Auto add** does **not** detach it from any device.',
      ],
    },
    {
      title: 'Delete credentials',
      steps: [
        '**⋮ › Delete** on the row and confirm *Delete “…”?*, or tick several rows and use **Delete** on the bar above the table.',
      ],
      after: [
        'Deleting removes the credential **and every device connection that uses it**. A device left with no other credentials can no longer be reached by the controller over SSH — attach other credentials from its **Credentials** tab first. The device’s own SSH login is not changed.',
      ],
    },
  ],
  forms: [
    {
      title: 'the access credentials drawer',
      source: 'components/CredentialFormModal.jsx',
      opens: '**New credentials** opens it empty; clicking a credential opens it filled in, except for the secret.',
      fields: {
        Name: {
          required: 'Yes',
          example: 'Branch routers – root',
          what: 'Up to 64 characters. Two credentials in the same organization cannot share a name.',
          checks: ['The fields name, organization must make a unique set.'],
        },
        'Connection type': { starts: 'SSH', what: 'SSH is the only type offered.' },
        Organization: {
          starts: 'Shared — all organizations',
          drop: ['Attach these to every device of this organization automatically — to all new devices if no organization is set.'],
          what: 'Which organization’s devices it can be attached to. **Shared** means any device; only superusers can save a shared credential.',
          checks: ['This field may not be null.'],
        },
        'Auto add': {
          extra: true,
          what: 'A tick-box under Organization; starts off. Its caption reads *Attach these to every device of this organization automatically — to all new devices if no organization is set.* When on, saving attaches the credential to devices automatically — see *What Auto add does* below.',
        },
        'Credentials type': {
          starts: 'SSH (password)',
          what: '**SSH (password)** or **SSH (private key)**. Switching clears the secret box. **Generate Ed25519 keypair** beside it creates a new key pair — see *Generate a key pair*.',
        },
        Username: { required: 'Yes', example: 'root', what: 'At least 2 characters.' },
        Port: { required: 'Yes', starts: '22', errorHints: ['1–65535'], what: 'The device’s SSH port, a whole number from 1 to 65535.' },
        "{kind === 'password' ? 'Password' : 'Private key'}": { skip: true },
        'Password / Private key': {
          extra: true,
          required: 'When adding',
          what: 'The label follows **Credentials type**. A password needs at least 4 characters; a private key at least 64, unencrypted, RSA or Ed25519. Never shown again after saving — when editing, leave it empty to keep the stored one.',
          checks: ['Unrecognized or unsupported SSH key algorithm, only RSA and ED25519 are currently supported.'],
        },
      },
    },
  ],
  sections: [
    {
      title: 'What Auto add does',
      body: [
        'Every time a credential is **saved with Auto add ticked**, the controller attaches it, in the background, to every device that has a configuration and does not have it yet:',
        '- **with an organization** — every such device of that organization;\n- **shared** — every such device of **every** organization.',
        'From then on, **each new device** gets it attached automatically when its configuration is created — if it belongs to the credential’s organization, or for any organization when the credential is shared.',
        'The tick-box caption says *to all new devices if no organization is set*; in fact a shared credential with Auto add is also attached to all existing devices at once. Unticking Auto add later attaches nothing more but removes nothing either.',
      ],
    },
  ],
  verify: [
    'The credential is in the list with the organization and the **Auto add** state you chose.',
    'Open a device it should apply to, then its **Credentials** tab: the credential is under **Attached credentials** (immediately if you attached it by hand; shortly after saving if Auto add attached it).',
  ],
  trouble: [
    ['**Create credentials** stays grey', 'Name is empty, Username is shorter than 2 characters, Port is not 1–65535, or the secret is too short (password 4, private key 64).', 'Fill each one; only the port shows its own warning.'],
    ['*The fields name, organization must make a unique set.*', 'This organization already has a credential with that name.', 'Choose another name.'],
    ['*organization: This field may not be null.*', 'You chose **Shared — all organizations** but are not a superuser.', 'Choose your organization.'],
    ['*params: Unrecognized or unsupported SSH key algorithm, only RSA and ED25519 are currently supported.*', 'The key is not RSA or Ed25519, is encrypted with a passphrase, or was not pasted whole.', 'Paste the complete unencrypted key, or use **Generate Ed25519 keypair**.'],
    ['Devices refuse the generated key', 'The public key was never installed on them.', 'Put it in a configuration template so it reaches `/etc/dropbear/authorized_keys` on each device.'],
    ['The credential is not offered on a device’s **Credentials** tab', 'It belongs to another organization, or is already attached to that device.', 'Use a credential of the device’s organization or a shared one.'],
    ['*Not authenticated — log in to the Django admin first.*', 'The server refused the request (not signed in, or no permission for credentials).', 'Sign in again; if it persists, ask for the credentials permissions.'],
  ],
  shotDir: 'credentials',
  shots: [
    { file: 'list.png', what: 'The Access credentials list with a shared and an organization credential, showing Connection type and Auto add.', alt: 'The Access credentials list' },
    { file: 'form-new.png', what: 'The **New access credentials** drawer with SSH (password) chosen.', alt: 'Creating access credentials' },
  ],
};

// ------------------------------------------------------- shared PKI field notes

const NEW_ONLY = 'Only with Create new';
const IMPORT_ONLY = 'Only with Import existing';

/** Rows shared by the CA and the certificate form (both read from pages/pki/fields.js). */
function pkiFields(kind: 'ca' | 'cert'): Record<string, AdminFieldNote> {
  const noun = kind === 'ca' ? 'CA' : 'certificate';
  return {
    'Operation type': {
      when: 'Only when adding',
      what: '**Create new** generates a new key and certificate on the controller; **Import existing** stores one you already have. Nothing else appears until you choose.',
    },
    Name: {
      example: kind === 'ca' ? 'Acme Root CA' : 'acme-hq-vpn-server',
      what: `How the ${noun} is listed. Up to 64 characters.`,
      checks: ['This field is required.'],
    },
    Notes: { when: NEW_ONLY, what: 'Free text, shown nowhere else.' },
    'Key length': {
      when: NEW_ONLY,
      starts: 'None — the server uses 2048',
      drop: ['bits'],
      what: 'RSA key size in bits.',
    },
    'Digest algorithm': {
      when: NEW_ONLY,
      starts: 'None — the server uses SHA256',
      what: `The hash the ${noun} is signed with.`,
    },
    'Validity start': {
      when: NEW_ONLY,
      what: 'Left empty, the server fills it in — see *Validity dates left empty* below.',
    },
    'Validity end': {
      when: NEW_ONLY,
      what: kind === 'ca'
        ? 'Left empty, the server sets it 3650 days (10 years) ahead — see *Validity dates left empty* below.'
        : 'Left empty, the server sets it 1825 days (5 years) ahead, as this controller is configured — see *Validity dates left empty* below.',
    },
    'Country code': { when: NEW_ONLY, example: 'IN', what: 'Two letters.', checks: ['Ensure this field has no more than 2 characters.'] },
    'State or province': { when: NEW_ONLY, example: 'Maharashtra' },
    City: { when: NEW_ONLY, example: 'Mumbai' },
    'Organization#2': {
      when: NEW_ONLY,
      example: 'Acme Retail Pvt Ltd',
      what: `The **O** field written into the ${noun}’s subject. Text only — not the controller organization above.`,
    },
    'Organizational unit name': { when: NEW_ONLY, example: 'Network Operations' },
    'Email address': { when: NEW_ONLY, example: 'netops@example.com', checks: ['Enter a valid email address.'] },
    'Common name': {
      when: NEW_ONLY,
      example: kind === 'ca' ? 'Acme Root CA' : 'acme-hq-vpn-server',
      what: `The **CN** of the subject, up to 64 characters. Within one organization no two ${kind === 'ca' ? 'CAs' : 'certificates'} may have the same common name — and an empty one counts too, so fill it in.`,
    },
    Extensions: {
      when: NEW_ONLY,
      what: 'Leave empty. The standard extensions are added anyway; this box sends its text as-is, not as the list of extensions the server builds from — see *Known limits*.',
    },
    'Serial number': {
      when: NEW_ONLY,
      what: kind === 'ca'
        ? 'A random serial is assigned. If you type one it must be a whole number.'
        : 'A random serial is assigned. If you type one it must be a whole number and not used by another certificate of the same CA.',
      checks: kind === 'ca' ? ['Serial number must be an integer'] : [],
    },
    Certificate: {
      when: IMPORT_ONLY,
      required: 'When importing',
      example: '-----BEGIN CERTIFICATE----- …',
      what: kind === 'ca'
        ? 'The whole PEM block. Its key length, digest, validity, subject and serial are read from it.'
        : 'The whole PEM block. It must be signed by the CA chosen above. Its key length, digest, validity, subject and serial are read from it.',
    },
    'Private key': {
      when: IMPORT_ONLY,
      required: 'When importing',
      example: '-----BEGIN PRIVATE KEY----- …',
      what: 'The private key belonging to that certificate, as a PEM block.',
    },
    Passphrase: {
      what: 'Up to 64 characters. **Import existing**: the passphrase of an encrypted private key, otherwise empty. **Create new**: if filled, the generated private key is stored encrypted with it.',
    },
  };
}

const PKI_FROM = [
  'pages/PkiHub.jsx',
  'pages/pki/fields.js',
  'components/crud/ResourceTable.jsx',
  'components/crud/ResourceForm.jsx',
  'components/crud/ResourceField.jsx',
  'api/client.js',
  'nexapp_controller/pki/api/serializers.py',
  'nexapp_controller/pki/api/views.py',
  'nexapp_controller/pki/api/urls.py',
  'nexapp_controller/pki/base/models.py',
  'nexapp_controller/pki/utils.py',
  'vendor/django-x509/django_x509/base/models.py',
  'vendor/django-x509/django_x509/settings.py',
  'tests/nexapp2/settings.py',
  'vendor/nexapp-users/nexapp_users/mixins.py',
  'nexapp_controller/config/base/vpn.py',
  'nexapp_controller/config/base/template.py',
];

const PKI_SECTIONS = (kind: 'ca' | 'cert') => [
  {
    title: 'Create new vs Import existing',
    body: [
      `- **Create new** — the controller generates a new RSA key and ${kind === 'ca' ? 'a self-signed CA certificate' : 'a certificate signed by the chosen CA'}, from **Key length**, **Digest algorithm**, the validity dates and the subject fields. Only **Name** and **Organization**${kind === 'cert' ? ' and **CA**' : ''} have to be filled.\n- **Import existing** — paste a **Certificate** and its **Private key** (plus **Passphrase** if the key is encrypted). Everything else — key length, digest, validity, subject, serial — is read from the certificate. Only RSA certificates signed with SHA-1 or SHA-2 can be read.`,
      'The choice is made once. When you open a saved record, **Operation type** is gone and every row is shown, but only **Name**, **Organization** and **Notes** are saved — the key, the dates, the subject and the PEM blocks cannot be changed afterwards. To change them, create a new one.',
    ],
  },
  {
    title: 'The subject fields',
    body: [
      'Country code, State or province, City, Organization, Organizational unit name, Email address and Common name together make the certificate’s **subject** — the name it is issued to (C, ST, L, O, OU, emailAddress, CN). Empty ones are simply left out. The second **Organization** row is this text field, not the controller organization the record belongs to.',
      kind === 'ca'
        ? 'Certificates the controller creates automatically for a VPN server and for each VPN client copy the country, state, city, organization, email, key length and digest from this CA.'
        : 'Certificates the controller creates automatically for a VPN server or a VPN client copy these values from their CA rather than from anything typed here.',
    ],
  },
  {
    title: 'Validity dates left empty',
    body: [
      `Left empty, **Validity start** becomes midnight of the day before, and **Validity end** ${kind === 'ca' ? '3650 days (10 years)' : '1825 days (5 years)'} later. Both are measured from when the controller’s API process **last started**, not from the moment you press **Create** — on a controller that has been running for months the ${kind === 'ca' ? 'CA' : 'certificate'} expires correspondingly sooner. Fill both dates in yourself when the exact window matters. Imported records always take their dates from the certificate.`,
    ],
  },
];

// ------------------------------------------------------- Certification Authorities

const CAS: AdminNotes = {
  from: ['pages/pki/caModel.js', ...PKI_FROM, 'pages/VpnForm.jsx'],
  title: 'Working with certification authorities',
  intro: [
    'A certification authority (CA) is the key that **signs certificates**. Every certificate on the **Certificates** page belongs to exactly one CA, and a device trusts a certificate because it trusts the CA that signed it.',
    'Its main use here is **OpenVPN**: an OpenVPN server on **Configuration › VPN Servers** needs a **Certificate authority**. If the server has no certificate of its own, the controller creates one signed by that CA when the server is saved; and every device that joins the VPN gets its own client certificate from the same CA, created automatically. Those certificates then appear on the **Certificates** page.',
    'The list shows each CA’s **Name**, **Organization**, **Key length**, **Digest**, **Valid until**, **Created** and **Modified**, newest first. **All organizations** and **All key lengths** narrow the rows of the page you are on.',
  ],
  before: [
    'Every CA belongs to **one organization**, and a VPN server or certificate using it must belong to the same one. Create the organization first.',
    'For **Import existing**, have the CA certificate and its private key as PEM text, and the key’s passphrase if it has one.',
    '**New authority** needs the add permission on CAs; editing and deleting need their own permissions.',
  ],
  tasks: [
    {
      title: 'Create a new CA',
      steps: [
        'Open **Access Control › CAs & Certificates › Certification Authorities** and press **New authority**. The **New Certification Authorities** drawer opens on the right.',
        'Choose **Create new** in **Operation type**.',
        'Type the **Name**, e.g. `Acme Root CA`, and choose the **Organization**.',
        'Leave **Key length** and **Digest algorithm** on *None* for 2048 bits and SHA256, or pick others.',
        'Fill the subject — at least **Common name**, e.g. `Acme Root CA` — and optionally Country code, State, City, Organization, Organizational unit and Email.',
        'Leave **Validity start**, **Validity end**, **Extensions** and **Serial number** empty unless you need specific values.',
        'Press **Create**. You see *Created* and the CA is in the list with its key length, digest and **Valid until**.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Import an existing CA',
      steps: [
        'Press **New authority** and choose **Import existing** in **Operation type**.',
        'Type the **Name** and choose the **Organization**.',
        'Paste the CA certificate into **Certificate** and its key into **Private key**; fill **Passphrase** if the key is encrypted.',
        'Press **Create**. Key length, digest, validity and subject are read from the certificate.',
      ],
    },
    {
      title: 'Change a CA',
      steps: [
        'Click the CA’s name, or **⋮ › Edit**. The **Edit Certification Authorities** drawer opens with every row filled in.',
        'Change **Name**, **Organization** or **Notes**, and press **Save changes**.',
      ],
      after: [
        'Only those three are saved; changes to any other row are ignored without a message. The drawer shows the stored **Private key** in plain text — do not leave it open on a shared screen.',
      ],
    },
    {
      title: 'Delete a CA',
      steps: [
        '**⋮ › Delete** on the row and confirm *Delete …?*, or tick several rows and use **Delete** on the bar above the table.',
      ],
      after: [
        'The dialog says *Certificates signed by this authority will no longer validate.* What actually happens is more: **every certificate of this CA is deleted**, **every VPN server using this CA is deleted**, and with each VPN server its VPN templates — which then disappear from every device they were applied to. There is no undo. Check **Configuration › VPN Servers** before deleting a CA.',
      ],
    },
  ],
  forms: [
    {
      title: 'the certification authority drawer',
      source: 'pages/pki/caModel.js',
      model: 'CA_MODEL',
      opens: '**New authority** opens it with only **Operation type**; the other rows appear once you choose. Rows marked *Only with Create new* or *Only with Import existing* show only in that mode. When editing a saved CA every row is shown, but only Name, Organization and Notes are saved.',
      fields: {
        ...pkiFields('ca'),
        Organization: {
          what: 'The controller organization the CA belongs to. VPN servers and certificates that use it must belong to the same one.',
          checks: ['This field is required.'],
        },
      },
    },
  ],
  sections: [
    ...PKI_SECTIONS('ca'),
    {
      title: 'Known limits',
      body: [
        '- **No renew, no CRL download here.** The server has both (renewing a CA also renews every certificate it signed), but this page offers neither.\n- **Enable / Disable** in the row menu does nothing: a CA has no on/off state. The *Enabled* message after it is misleading.\n- **Search certification authorities…** and the organization picker at the top do not narrow this list — the server ignores both. Use **All organizations** and **All key lengths**, which filter the page you are on.\n- **Extensions** typed into the form are sent as plain text, not as the list the server expects, so leave it empty.',
      ],
    },
  ],
  verify: [
    'The CA is in the list with the **Key length**, **Digest** and **Valid until** you expect.',
    'It is offered under **Certificate authority** on an OpenVPN server in **Configuration › VPN Servers**, and under **CA** when you create a certificate.',
  ],
  trouble: [
    ['*This field is required.* under Name or Organization', 'It is empty — Organization cannot stay on *None* for a CA.', 'Fill it in.'],
    ['A message that common name and organization must be unique, or that a CA with this Common name and Organization already exists', 'This organization already has a CA with that common name — an empty Common name counts.', 'Give the new CA its own **Common name**.'],
    ['*Serial number must be an integer* under Serial number', 'It holds something other than digits.', 'Type a whole number, or leave it empty.'],
    ['Text beginning *OpenSSL error:* under Certificate or Private key', 'The pasted text is not a valid PEM block.', 'Paste the complete block, including the BEGIN and END lines.'],
    ['A message containing *Incorrect Passphrase* under Passphrase (shown with raw HTML tags)', 'The private key is encrypted and the passphrase is wrong or empty.', 'Type the key’s passphrase.'],
    ['Saving an import fails with a server error', 'The certificate is not RSA-signed with SHA-1 or SHA-2 (for example an ECDSA certificate).', 'Import an RSA certificate, or create a new CA here.'],
    ['VPN servers or certificates disappeared', 'Their CA was deleted.', 'Create a new CA and recreate the VPN servers; devices need their VPN templates again.'],
  ],
  shotDir: 'pki/authorities',
  shots: [
    { file: 'list.png', what: 'The Certification Authorities list with Key length, Digest and Valid until, and the two filters.', alt: 'The Certification Authorities list' },
    { file: 'form-new.png', what: 'The **New Certification Authorities** drawer with Create new chosen: Name, Organization, key, validity and subject rows.', alt: 'Creating a certification authority' },
  ],
};

// --------------------------------------------------------------- Certificates

const CERTS: AdminNotes = {
  from: ['pages/pki/certModel.js', ...PKI_FROM],
  title: 'Working with certificates',
  intro: [
    'A certificate here is an end-entity certificate with its private key, **signed by one of the CAs** on the **Certification Authorities** page. Most are created **automatically**: an OpenVPN server that has no certificate gets one from its CA when it is saved, and each device that joins an OpenVPN server gets its own client certificate. You create one here by hand when something outside the controller needs a certificate from the same CA, or to import one.',
    'The list shows each certificate’s **Name**, **Organization**, signing **Authority**, **Key length**, **Digest**, **Valid until**, **State**, **Created** and **Modified**, newest first. **State** is *Valid* or *Revoked* — it reflects revocation only: an expired certificate still says *Valid*, so check **Valid until** too. **All states** and **All organizations** narrow the rows of the page you are on.',
  ],
  before: [
    'The **CA** must exist first — create or import it on **Certification Authorities**.',
    'Choose the **same organization as the CA**: the server refuses a certificate whose organization differs from its CA’s.',
    'For **Import existing**, have the certificate and its private key as PEM text; the certificate must have been signed by the CA you choose.',
  ],
  tasks: [
    {
      title: 'Create a new certificate',
      steps: [
        'Open **Access Control › CAs & Certificates › Certificates** and press **New certificate**. The **New Certificates** drawer opens on the right.',
        'Choose **Create new** in **Operation type**.',
        'Type the **Name**, e.g. `acme-hq-vpn-server`, choose the **Organization** (the CA’s) and the **CA**.',
        'Leave **Key length** and **Digest algorithm** on *None* for 2048 bits and SHA256, or pick others.',
        'Fill the subject — at least **Common name**, e.g. `acme-hq-vpn-server`.',
        'Press **Create**. You see *Created* and the certificate is listed with its **Authority** and the state *Valid*.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Import an existing certificate',
      steps: [
        'Press **New certificate** and choose **Import existing**.',
        'Type the **Name**, choose the **Organization** and the **CA** that signed it.',
        'Paste the **Certificate** and its **Private key**; fill **Passphrase** if the key is encrypted.',
        'Press **Create**. The rest is read from the certificate, after checking it was signed by that CA.',
      ],
    },
    {
      title: 'Change a certificate',
      steps: [
        'Click its name, or **⋮ › Edit**. Change **Name**, **Organization** or **Notes** and press **Save changes**.',
      ],
      after: [
        'Only those three are saved — not the CA, not the key, dates or subject, and not its state. The drawer shows the stored **Private key** in plain text.',
      ],
    },
    {
      title: 'Revoke a certificate',
      steps: [
        'There is no **Revoke** action on this page.',
      ],
      after: [
        'The controller revokes a certificate on its own when it created it for a device’s OpenVPN client and that client is removed — it is then listed with **State** *Revoked* and is included in the CA’s certificate revocation list (CRL) while it has not expired. Revoking any other certificate is not available here.',
      ],
    },
    {
      title: 'Delete a certificate',
      steps: [
        '**⋮ › Delete** on the row and confirm *Delete …?*, or tick several rows and use **Delete** on the bar above the table.',
      ],
      after: [
        'The dialog only says the certificate *stops being applied to any device it covers*. In fact: a **VPN server using this certificate is deleted** with it, together with its VPN templates (which leave every device they were applied to); a device’s VPN client using it is removed. A deleted certificate is not revoked — it simply disappears. Prefer leaving certificates the controller created automatically alone.',
      ],
    },
  ],
  forms: [
    {
      title: 'the certificate drawer',
      source: 'pages/pki/certModel.js',
      model: 'CERT_MODEL',
      opens: '**New certificate** opens it with only **Operation type**; the other rows appear once you choose. Rows marked *Only with Create new* or *Only with Import existing* show only in that mode. When editing a saved certificate every row is shown, but only Name, Organization and Notes are saved.',
      fields: {
        ...pkiFields('cert'),
        Organization: {
          required: 'Yes, unless the CA is shared',
          what: 'Must be the CA’s organization. *None* is accepted only for a CA that itself has no organization, and only from a superuser.',
          checks: ['Please ensure that the organization of this certificate and the organization of the related CA match.'],
        },
        CA: {
          checks: ['This field is required.'],
          what: 'The authority that signs it. The list offers every CA you can see, whatever organization is chosen above.',
        },
      },
    },
  ],
  sections: [
    ...PKI_SECTIONS('cert'),
    {
      title: 'Known limits',
      body: [
        '- **No revoke, renew or CRL here.** The server has revoke and renew actions for certificates, but this page offers neither.\n- **State** shows revocation only, never expiry.\n- **Enable / Disable** in the row menu does nothing: a certificate has no on/off state. The *Enabled* message after it is misleading.\n- **Search certificates…** and the organization picker at the top do not narrow this list — the server ignores both. Use **All states** and **All organizations**, which filter the page you are on.\n- **Extensions** typed into the form are sent as plain text, not as the list the server expects, so leave it empty.\n- A **Serial number** typed by hand is not checked to be a number before the certificate is generated; anything but digits makes the save fail with a server error.',
      ],
    },
  ],
  verify: [
    'The certificate is in the list with its **Authority**, **Valid until** and **State** *Valid*.',
    'If it was made for a VPN server, it is offered as that server’s certificate on **Configuration › VPN Servers**.',
  ],
  trouble: [
    ['*This field is required.* under Name or CA', 'It is empty.', 'Fill it in.'],
    ['*Please ensure that the organization of this certificate and the organization of the related CA match.*', 'Organization is *None* or differs from the CA’s.', 'Choose the CA’s organization.'],
    ['A message that common name and organization must be unique, or that a certificate with this Common name and Organization already exists', 'This organization already has a certificate with that common name — an empty Common name counts.', 'Give it its own **Common name**.'],
    ['*CA doesn’t match, got the following error from pyOpenSSL: …*', 'The imported certificate was not signed by the chosen CA.', 'Choose the CA that issued it, or import that CA first.'],
    ['Text beginning *OpenSSL error:* under Certificate or Private key', 'The pasted text is not a valid PEM block.', 'Paste the complete block, including the BEGIN and END lines.'],
    ['A message containing *Incorrect Passphrase* under Passphrase (shown with raw HTML tags)', 'The private key is encrypted and the passphrase is wrong or empty.', 'Type the key’s passphrase.'],
    ['A certificate shows *Revoked*', 'The controller revoked it when the device’s OpenVPN client it was made for was removed.', 'Nothing to do; the device gets a new one if it rejoins the VPN.'],
    ['An expired certificate shows *Valid*', '**State** reflects revocation only.', 'Read **Valid until**.'],
  ],
  shotDir: 'pki/certificates',
  shots: [
    { file: 'list.png', what: 'The Certificates list with the Authority, Valid until and State columns.', alt: 'The Certificates list' },
    { file: 'form-new.png', what: 'The **New Certificates** drawer with Create new chosen: Name, Organization, CA, key, validity and subject rows.', alt: 'Creating a certificate' },
  ],
};

export const PKI_NOTES: Record<string, AdminNotes> = {
  '/credentials': CREDENTIALS,
  '/pki/authorities': CAS,
  '/pki/certificates': CERTS,
};
