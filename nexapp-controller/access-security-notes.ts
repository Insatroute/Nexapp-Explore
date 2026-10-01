/** Access Control › Security — guide notes (see access-notes.ts). */
import type { AdminFieldNote, AdminNotes } from './admin-notes.ts';

// All eight pages are one component — SecurityHub hands a tab from
// pages/security/tabs.js to the shared ResourceTable / ResourceForm — so the
// list behaviour, the scope fields and the way a record reaches a router are
// the same everywhere. They are written once here and reused.
//
// Verified against (frontend under frontend/src/, backend from the repo root):
//   - nothing in the new console deploys a security record: ResourceTable has
//     no deploy action, and saving only stores the row. Devices receive these
//     settings through the Django admin action "Apply security policy (RPCD)"
//     (nexapp_controller/config/admin.py, nexapp_security/services/bulk_apply.py),
//     which offers fleet-wide records of Instashield, IPS, Antivirus and
//     AntiSpam only, or through each viewset's `deploy` API action.
//   - the viewsets have no filter backends and settings.py sets none, so the
//     page's `search` and `organization` query parameters are ignored.
//   - writes need a superuser: SecurityAdminWrite also accepts `is_admin`, which
//     the User model does not have.

const FE_COMMON = [
  'pages/SecurityHub.jsx',
  'pages/security/tabs.js',
  'components/crud/ResourceTable.jsx',
  'components/crud/ResourceForm.jsx',
  'components/crud/ResourceField.jsx',
  'components/BulkBar.jsx',
  'api/client.js',
];
const BE_COMMON = [
  'nexapp_security/api/serializers.py',
  'nexapp_security/api/views.py',
  'nexapp_security/api/permissions.py',
  'tests/nexapp2/settings.py',
];
const BE_PUSH = [
  'nexapp_security/models/base.py',
  'nexapp_security/tasks.py',
  'nexapp_security/services/bulk_apply.py',
  'nexapp_controller/config/admin.py',
];

// ------------------------------------------------------------ shared prose

const NOTHING_PUSHED =
  '<Callout type="warn">**Saving here does not change any router.** This page stores the record and nothing else — there is no deploy button, and no save, enable or delete sends anything to a device. See *How scope works and how a policy reaches a router* below.</Callout>';

const LIST_LINE = (cols: string) =>
  `The list shows ${cols}, ten rows to a page. **Scope** reads *Fleet-wide* when **Apply fleet-wide** is on; otherwise the literal word *Organization* when an organization is set (the server sends the id only, not the name); otherwise *Device* when a device is set; otherwise *Unscoped*. **State** is a tick for enabled, a cross for disabled.`;

const BEFORE_COMMON = [
  '**Only a superuser can create, change, enable or delete.** The server refuses every write from anyone else, and the page then shows *Not authenticated — log in to the Django admin first.* Other users see only the records of their own organizations — fleet-wide records with no organization are hidden from them.',
  'To scope a record to one router, the router must already be a member of an SD-WAN topology — the **Device** list offers only those.',
];

const SEARCH_TRAP: [string, string, string] = [
  'Typing in the search box and pressing Enter does not narrow the list, and the organization picker at the top of the console does not either',
  'The page sends both to the server, but these endpoints have no search or filter support and ignore them.',
  'Page through the list, or use **All states** › **Enabled** / **Disabled**, which works on the rows already loaded.',
];
const DENIED: [string, string, string] = [
  '*Not authenticated — log in to the Django admin first.* on Create, Save changes, Enable, Disable or Delete',
  'You are signed in, but not as a superuser. Every write to these endpoints is superuser-only.',
  'Ask a superuser to make the change.',
];
const NOT_ON_ROUTER: [string, string, string] = [
  'The router behaves exactly as before after you saved',
  'Saving stores the record only. Nothing on this page deploys.',
  'Push it as described in *How scope works and how a policy reaches a router*.',
];
const DEVICE_TAKEN = (model: string, applied = true): [string, string, string] => [
  `*${model} with this nsbond device already exists.* under Device`,
  applied
    ? 'Each router can carry only one record of this kind. The per-device copy made when a fleet-wide record is applied counts too.'
    : 'Each router can carry only one record of this kind.',
  applied
    ? 'Edit the existing record for that router instead — its name is often blank (shown as —).'
    : 'Edit the existing record for that router instead.',
];
const NAME_PAIR: [string, string, string] = [
  '*The fields organization, name must make a unique set.*',
  'Another record with this name already has the same organization.',
  'Choose a different name.',
];

const SCOPE_SECTION = {
  title: 'How scope works and how a policy reaches a router',
  body: [
    'Every record on these pages is stored on the controller only. Whether — and how — it ever reaches a router depends on its scope:',
    '- **Apply fleet-wide** on makes the record a *template*. A template does nothing by itself, whatever the hint under the switch says. It is pushed only when someone applies it to chosen routers (below).\n- **Organization** on a template limits who can use it: a template with an organization is offered only when applying to that organization’s routers; one with no organization is offered for every organization.\n- **Device** ties the record to one router. The server keeps at most one record of each kind per router. Saving it does not push it — the API has a deploy call for device records, but this page has no button for it.\n- With **none** of the three set the record is *Unscoped* and is never offered or pushed.\n- **Fleet-wide and Device together** are accepted by the server (the model rule against it is not checked on save). Do not combine them: applying that template to its own router turns it into that router’s ordinary per-device record.',
    '**Applying a template.** In the Django admin, open **Devices**, tick routers from **one** organization, and choose the action **Apply security policy (RPCD)**. The next page has one drop-down per feature — **Instashield (IP + DNS)**, **IPS**, **Antivirus (NexGuard)**, **AntiSpam** and **SSL Inspection** — listing only fleet-wide records; leave *— skip —* for the rest and press **Apply**. For each router the controller copies the template into that router’s own record (replacing any it had), then queues the push. Routers that are not in an SD-WAN topology are skipped.',
    'What the copy carries: every setting of the template **including Enabled** — so applying a disabled template switches that feature off on the router (Instashield excepted: its push ignores Enabled and uses **IP reputation blocking**). The copy has a blank name and the router’s organization, so it appears on this page as a row named — with Scope *Organization*.',
    'What does **not** happen: changing a template later does not update the routers it was applied to — apply it again. Deleting a template leaves the copies and the routers as they are. Deleting a record sends nothing to the router; the setting stays on the device until something else is pushed.',
    '**Web Filter, Profiles, Policies and Address Groups are not in that action.** Nothing in the console or the admin pushes them.',
  ],
};

// ------------------------------------------------------------ shared field notes

const FLEET: AdminFieldNote = {
  starts: 'Off',
  drop: ['Applies to every device. Leave off to target an organization or a single device.'],
  what: 'Marks the record as a fleet-wide template. It is **not** pushed to every device on its own — see *How scope works* below.',
};
const ORG: AdminFieldNote = {
  starts: 'None',
  what: 'On a fleet-wide record: which organization may use the template; leave **None** to offer it to every organization. Choosing one also narrows the **Device** list to that organization’s routers.',
};
const DEVICE: AdminFieldNote = {
  starts: 'None',
  what: 'Ties the record to one router (SD-WAN topology members only). One record of each kind per router.',
};
const ENABLED: AdminFieldNote = {
  starts: 'On',
  drop: ['Off keeps the policy but stops it being pushed to devices.'],
  what: 'Stored with the record and copied when a template is applied with the admin action, which pushes it as the feature’s on/off switch. Turning it off here does not change any router by itself. Also switched from the row’s **⋮** menu.',
};
const SCOPE_FIELDS: Record<string, AdminFieldNote> = {
  'Apply fleet-wide': FLEET,
  Organization: ORG,
  Device: DEVICE,
  Enabled: ENABLED,
};

/** Name on the five feature pages: required by the form, up to 128 characters. */
const configName = (example: string, unique: boolean): AdminFieldNote => ({
  example,
  what: unique
    ? 'Up to 128 characters. Two fleet-wide records with the same organization cannot share a name.'
    : 'Up to 128 characters. Not checked for uniqueness.',
  checks: ['This field is required.', 'Ensure this field has no more than 128 characters.', ...(unique ? ['The fields organization, name must make a unique set.'] : [])],
});

const toggle = (what: string): AdminFieldNote => ({ starts: 'Off', what });

// Tasks shared by every page that has an Enabled switch.
const changeTask = (drawer: string) => ({
  title: 'Change, enable or disable it',
  steps: [
    `Click the record’s name, or **⋮ › Edit**. The **Edit ${drawer}** drawer opens; change what you need and press **Save changes**. *Saved* confirms it.`,
    'To switch it on or off without opening it, use **⋮ › Enable** or **⋮ › Disable**.',
  ],
  after: [
    'Clearing a text or number box and saving keeps the old value — an empty box is not sent. Type a new value instead.',
  ],
});
const deleteTask = (noun: string, plural: string) => ({
  title: `Delete ${noun === 'policy' ? 'a policy' : `an ${noun}`}`,
  steps: [
    `**⋮ › Delete** and confirm the *Delete …?* dialog, or tick several rows and press **Delete** on the bar above the table (*Delete 2 ${plural}?*).`,
  ],
  after: [
    `The dialog says *The ${noun} stops being applied to any device it covers. This cannot be undone.* Only the second sentence holds: deleting removes the record from the controller and sends nothing to any router.`,
  ],
});
const createSteps = (page: string, drawer: string, button: string, fill: string[]) => [
  `Open **Access Control › Security › ${page}** and press **${button}**. The **New ${drawer}** drawer opens on the right.`,
  ...fill,
  'Press **Create**. *Created* confirms it and the record is in the list.',
];
const scopeStep =
  'Choose the scope: turn **Apply fleet-wide** on to make a template you can apply to routers — optionally with an **Organization** — or pick a single **Device**. **Enabled** starts on.';
const scopeStepStored =
  'Choose the scope — **Apply fleet-wide** (optionally with an **Organization**) or a single **Device**. It is recorded only; nothing pushes this kind of record. **Enabled** starts on.';

// ------------------------------------------------------------ Instashield IP

const INSTASHIELD_IP: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, ...BE_PUSH, 'nexapp_security/models/threatshield.py'],
  title: 'Working with Instashield IP policies',
  intro: [
    'Instashield IP is the router’s reputation-based IP blocking: it drops traffic from addresses on downloaded blocklists, and with brute-force protection it bans a source after repeated failed access attempts.',
    LIST_LINE('each record’s **Name**, **Scope** and **State**'),
    NOTHING_PUSHED,
  ],
  before: BEFORE_COMMON,
  tasks: [
    {
      title: 'Create an Instashield IP policy',
      steps: createSteps('Instashield IP', 'Instashield IP', 'New policy', [
        'Type a **Name**, e.g. `Branch baseline`.',
        'Turn on **IP reputation blocking**, and **Brute-force protection** if wanted. Every switch starts **off** here.',
        'Optionally set **Ban after failures** (0–100). Left empty, the server uses 3.',
        scopeStep,
      ]),
      shot: 'form-new.png',
    },
    changeTask('Instashield IP'),
    deleteTask('policy', 'policies'),
  ],
  forms: [
    {
      title: 'the Instashield IP drawer',
      source: 'pages/security/tabs.js',
      model: 'threatshield-ip',
      fields: {
        Name: configName('Branch baseline', true),
        'IP reputation blocking': toggle('The router’s IP blocklist on/off — this, not **Enabled**, is what the push uses as Instashield’s switch.'),
        'Auto-update lists': toggle('Stored with the record, but the push to the router does not include it.'),
        'Brute-force protection': toggle('Bans a source after repeated failed access attempts.'),
        'Ban after failures': {
          example: '5',
          starts: 'Empty — the server then stores 3',
          what: 'Failed attempts before a source is banned. Whole number from 0 to 100. Used when **Brute-force protection** is on.',
          checks: ['Ensure this value is greater than or equal to 0.', 'Ensure this value is less than or equal to 100.', 'A valid integer is required.'],
        },
        ...SCOPE_FIELDS,
      },
      after: [
        'Ban time, DoS limits, logging, attack patterns, DNS blocklist, country blocking, blocklists and allow/block entries are not on this drawer. They are set in the Django admin under **Security › Instashield IP** / **Instashield DNS**, and are copied and pushed with the record.',
        'Every switch starts **off** on a new record, so the server’s own defaults (Auto-update lists on) do not apply when you create here.',
      ],
    },
  ],
  sections: [SCOPE_SECTION],
  verify: [
    'The record is in the list with the Scope you chose and a tick under **State**.',
    'After applying it from the Django admin, the success message names *ns.threatshield* with the number of routers cloned and pushes queued, and each router’s page in the Django admin lists it under **Recent security policy applies**.',
    'A queued push can still fail on the router; confirm the setting on the router itself.',
  ],
  trouble: [
    ['*This field is required.* under Name', 'Name is empty.', 'Type a name.'],
    NAME_PAIR,
    ['*Ensure this value is less than or equal to 100.* under Ban after failures', 'The ban count is outside 0–100.', 'Enter a number from 0 to 100.'],
    DEVICE_TAKEN('Instashield'),
    ['The router’s blocklist stayed on after the policy was set to disabled and applied', 'Instashield’s push ignores **Enabled**; it uses **IP reputation blocking**.', 'Turn **IP reputation blocking** off and apply again.'],
    ['The template is missing from the admin’s **Instashield (IP + DNS)** drop-down', 'Only fleet-wide records whose organization is the routers’ organization, or none, are offered.', 'Turn on **Apply fleet-wide** and set or clear **Organization**.'],
    NOT_ON_ROUTER,
    SEARCH_TRAP,
    DENIED,
  ],
  shotDir: 'security/threatshield-ip',
  shots: [
    { file: 'list.png', what: 'The Instashield IP list with Name, Scope and State columns.', alt: 'The Instashield IP list' },
    { file: 'form-new.png', what: 'The New Instashield IP drawer: Name, the four Instashield settings, the scope fields and Enabled.', alt: 'Creating an Instashield IP policy' },
  ],
};

// ------------------------------------------------------------ IPS

const IPS: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, ...BE_PUSH, 'nexapp_security/models/ips.py'],
  title: 'Working with IPS policies',
  intro: [
    'IPS is the router’s Snort 3 intrusion prevention: a rule policy that trades protection against false positives, the firewall chain it inspects, and the Snort subscription code used to download rules.',
    LIST_LINE('**Name**, **Policy** and **Chain** (the stored values, e.g. *balanced*, *forward*), **Scope** and **State**'),
    NOTHING_PUSHED,
  ],
  before: BEFORE_COMMON,
  tasks: [
    {
      title: 'Create an IPS policy',
      steps: createSteps('IPS', 'IPS', 'New policy', [
        'Type a **Name**, e.g. `Balanced IPS`.',
        'In **Rule policy** type one of `connectivity`, `balanced`, `security` or `max-detect` — lower case, exactly. Left empty, the server uses `balanced`.',
        'In **Chain** type `forward` (traffic passing through the router) or `input` (traffic to the router itself). Left empty, the server uses `forward`.',
        'Paste the **Oinkcode** if you have a Snort subscription.',
        scopeStep,
      ]),
      shot: 'form-new.png',
    },
    {
      ...changeTask('IPS'),
      after: [
        ...changeTask('IPS').after,
        'The **Oinkcode** box is always empty when you edit: the server never sends the stored code back. Leave it empty to keep the stored code; type a new one to replace it.',
      ],
    },
    deleteTask('policy', 'policies'),
  ],
  forms: [
    {
      title: 'the IPS drawer',
      source: 'pages/security/tabs.js',
      model: 'ips',
      fields: {
        Name: configName('Balanced IPS', true),
        'Rule policy': {
          example: 'balanced',
          starts: 'Empty — the server then stores balanced',
          what: 'A free-text box, but the server accepts only `connectivity`, `balanced`, `security` or `max-detect`.',
          checks: ['"Balanced" is not a valid choice.'],
        },
        Chain: {
          example: 'forward',
          starts: 'Empty — the server then stores forward',
          what: 'Which firewall chain Snort inspects: `forward` or `input`. Free text, but only those two are accepted.',
          checks: ['"Forward" is not a valid choice.'],
        },
        Oinkcode: {
          what: 'Your Snort subscription code for rule downloads. Optional. Write-only: it is saved and pushed, but never shown again.',
        },
        ...SCOPE_FIELDS,
      },
      after: ['Bypass addresses and disabled rules are not on this drawer; they are set in the Django admin under **Security › IPS** and copied with the record when it is applied.'],
    },
  ],
  sections: [SCOPE_SECTION],
  verify: [
    'The record is in the list showing the **Policy** and **Chain** you typed.',
    'After applying it from the Django admin, the success message names *ns.snort*, and each router’s page in the Django admin lists it under **Recent security policy applies**.',
    'A queued push can still fail on the router; confirm the IPS settings on the router itself.',
  ],
  trouble: [
    ['*"Balanced" is not a valid choice.* under Rule policy (or the same for Chain)', 'The value is not one of the accepted words — capitals count.', 'Type `connectivity`, `balanced`, `security` or `max-detect`; for Chain, `forward` or `input`.'],
    ['*This field is required.* under Name', 'Name is empty.', 'Type a name.'],
    NAME_PAIR,
    DEVICE_TAKEN('IPS'),
    ['The Oinkcode box is empty when I edit', 'The server never returns the stored code.', 'Leave it empty to keep it.'],
    NOT_ON_ROUTER,
    SEARCH_TRAP,
    DENIED,
  ],
  shotDir: 'security/ips',
  shots: [
    { file: 'list.png', what: 'The IPS list with Name, Policy, Chain, Scope and State columns.', alt: 'The IPS list' },
    { file: 'form-new.png', what: 'The New IPS drawer: Name, Rule policy, Chain, Oinkcode, the scope fields and Enabled.', alt: 'Creating an IPS policy' },
  ],
};

// ------------------------------------------------------------ Antivirus

const ANTIVIRUS: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, ...BE_PUSH, 'nexapp_security/models/antivirus.py'],
  title: 'Working with antivirus policies',
  intro: [
    'Antivirus is the router’s ClamAV scanning: which protocols are scanned, the largest file still inspected, whether detections are quarantined, and whether signatures update themselves.',
    LIST_LINE('**Name**, **Max file (MB)**, **Scope** and **State**'),
    NOTHING_PUSHED,
  ],
  before: BEFORE_COMMON,
  tasks: [
    {
      title: 'Create an antivirus policy',
      steps: createSteps('Antivirus', 'Antivirus', 'New policy', [
        'Type a **Name**, e.g. `Standard AV`.',
        'Turn on the protocols to scan — **Scan HTTP**, **Scan SMTP**, **Scan FTP** — and **Quarantine** and **Auto-update signatures** as needed. Every switch starts **off** here.',
        'Optionally set **Max file size (MB)**, 1–500. Left empty, the server uses 25.',
        scopeStep,
      ]),
      shot: 'form-new.png',
    },
    changeTask('Antivirus'),
    deleteTask('policy', 'policies'),
  ],
  forms: [
    {
      title: 'the antivirus drawer',
      source: 'pages/security/tabs.js',
      model: 'antivirus',
      fields: {
        Name: configName('Standard AV', true),
        'Scan HTTP': toggle('Scan web traffic.'),
        'Scan SMTP': toggle('Scan mail traffic.'),
        'Scan FTP': toggle('Scan FTP transfers.'),
        'Scan on access': toggle('Stored with the record, but the push to the router does not include it.'),
        'Max file size (MB)': {
          example: '25',
          starts: 'Empty — the server then stores 25',
          what: 'Larger files are not scanned. Whole number from 1 to 500.',
          checks: ['Ensure this value is greater than or equal to 1.', 'Ensure this value is less than or equal to 500.', 'A valid integer is required.'],
        },
        Quarantine: toggle('Quarantine detected files.'),
        'Auto-update signatures': toggle('Let the router update its virus signatures on a schedule.'),
        ...SCOPE_FIELDS,
      },
      after: [
        'Every switch starts **off** on a new record, so the server’s own defaults (Scan HTTP, Quarantine and Auto-update signatures on) do not apply when you create here.',
        '**Update interval** and **Action on detection** are not on this drawer; a record created here keeps the server defaults (daily, quarantine). Change them in the Django admin under **Security › Antivirus**.',
      ],
    },
  ],
  sections: [SCOPE_SECTION],
  verify: [
    'The record is in the list with the **Max file (MB)** you set (or 25).',
    'After applying it from the Django admin, the success message names *ns.antivirus*, and each router’s page in the Django admin lists it under **Recent security policy applies**.',
    'A queued push can still be refused by the router; confirm the antivirus settings on the router itself.',
  ],
  trouble: [
    ['*Ensure this value is less than or equal to 500.* under Max file size (MB)', 'The size is outside 1–500.', 'Enter a number from 1 to 500.'],
    ['*This field is required.* under Name', 'Name is empty.', 'Type a name.'],
    NAME_PAIR,
    DEVICE_TAKEN('Antivirus'),
    ['HTTP is not scanned although the policy was applied', 'Every switch starts off on a new record — including **Scan HTTP**.', 'Edit the record, turn **Scan HTTP** on, save, and apply again.'],
    NOT_ON_ROUTER,
    SEARCH_TRAP,
    DENIED,
  ],
  shotDir: 'security/antivirus',
  shots: [
    { file: 'list.png', what: 'The Antivirus list with Name, Max file (MB), Scope and State columns.', alt: 'The Antivirus list' },
    { file: 'form-new.png', what: 'The New Antivirus drawer: Name, the scan switches, Max file size (MB), Quarantine, Auto-update signatures, the scope fields and Enabled.', alt: 'Creating an antivirus policy' },
  ],
};

// ------------------------------------------------------------ AntiSpam

const ANTISPAM: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, ...BE_PUSH, 'nexapp_security/models/antispam.py'],
  title: 'Working with AntiSpam policies',
  intro: [
    'AntiSpam is the router’s mail filtering (Rspamd with a Postfix relay): the relay host and port outgoing mail is handed to, and the account used to authenticate to it.',
    'The list shows **Name**, **Service**, **Relay host** and **State** — this page has no Scope column — ten rows to a page.',
    NOTHING_PUSHED,
  ],
  before: BEFORE_COMMON,
  tasks: [
    {
      title: 'Create an AntiSpam policy',
      steps: createSteps('AntiSpam', 'AntiSpam', 'New policy', [
        'Type a **Name**, e.g. `Office mail relay`.',
        'In **Service** type `rspamd` or `postfix`, or leave it empty for `rspamd`.',
        'Fill **Relay host**, e.g. `smtp.example.com`, **Port** (empty means 587) and **SASL username** if the relay needs one.',
        scopeStep,
      ]),
      shot: 'form-new.png',
    },
    changeTask('AntiSpam'),
    deleteTask('policy', 'policies'),
  ],
  forms: [
    {
      title: 'the AntiSpam drawer',
      source: 'pages/security/tabs.js',
      model: 'antispam',
      fields: {
        Name: configName('Office mail relay', true),
        Service: {
          example: 'postfix',
          starts: 'Empty — the server then stores rspamd',
          what: 'Free text, but only `rspamd` or `postfix` is accepted. Stored and shown in the list; the push itself does not send it — the router’s service is switched by **Enabled**.',
          checks: ['"Postfix" is not a valid choice.'],
        },
        'Relay host': {
          example: 'smtp.example.com',
          what: 'The mail server the router relays to. Up to 256 characters.',
          checks: ['Ensure this field has no more than 256 characters.'],
        },
        Port: {
          example: '587',
          starts: 'Empty — the server then stores 587',
          what: 'The relay’s port, 1 to 65535.',
          checks: ['Ensure this value is greater than or equal to 1.', 'Ensure this value is less than or equal to 65535.', 'A valid integer is required.'],
        },
        'SASL username': {
          example: 'relay@example.com',
          what: 'Account for authenticating to the relay. Up to 128 characters. It is used only with SASL authentication switched on, and that switch and the password are not on this drawer — set them in the Django admin under **Security › AntiSpam**.',
          checks: ['Ensure this field has no more than 128 characters.'],
        },
        ...SCOPE_FIELDS,
      },
      after: ['TLS settings, the default action, Rspamd scores, and domain and keyword rules are likewise set in the Django admin, and are copied and pushed with the record.'],
    },
  ],
  sections: [SCOPE_SECTION],
  verify: [
    'The record is in the list with the **Service** and **Relay host** you entered.',
    'After applying it from the Django admin, the success message names *ns.antispam*, and each router’s page in the Django admin lists it under **Recent security policy applies**.',
    'A queued push can still fail on the router; confirm the mail settings on the router itself.',
  ],
  trouble: [
    ['*"Postfix" is not a valid choice.* under Service', 'Only the lower-case words are accepted.', 'Type `rspamd` or `postfix`.'],
    ['*Ensure this value is less than or equal to 65535.* under Port', 'Not a port number.', 'Enter 1–65535, e.g. `587`.'],
    ['*This field is required.* under Name', 'Name is empty.', 'Type a name.'],
    NAME_PAIR,
    DEVICE_TAKEN('AntiSpam'),
    ['The relay rejects the router’s login', 'SASL authentication is off and no password is set — neither is on this drawer.', 'Turn SASL auth on and set the password in the Django admin, then apply again.'],
    NOT_ON_ROUTER,
    SEARCH_TRAP,
    DENIED,
  ],
  shotDir: 'security/antispam',
  shots: [
    { file: 'list.png', what: 'The AntiSpam list with Name, Service, Relay host and State columns.', alt: 'The AntiSpam list' },
    { file: 'form-new.png', what: 'The New AntiSpam drawer: Name, Service, Relay host, Port, SASL username, the scope fields and Enabled.', alt: 'Creating an AntiSpam policy' },
  ],
};

// ------------------------------------------------------------ Web Filter

const WEBFILTER: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, ...BE_PUSH, 'nexapp_security/models/webfilter.py'],
  title: 'Working with web filter policies',
  intro: [
    'A web filter policy names the web content categories a router should block.',
    LIST_LINE('**Name**, **Scope** and **State**'),
    '<Callout type="warn">**Two limits to know first.** The admin’s *Apply security policy (RPCD)* action does not include Web Filter, so nothing in the console or the admin pushes these records to routers. And **Blocked categories** and **Custom rules** cannot be filled in from this drawer: the server wants a list, the box sends text, and any text is refused. Leave both empty.</Callout>',
  ],
  before: BEFORE_COMMON,
  tasks: [
    {
      title: 'Create a web filter policy',
      steps: createSteps('Web Filter', 'Web Filter', 'New policy', [
        'Type a **Name**, e.g. `Block gambling`.',
        'Leave **Blocked categories** and **Custom rules** empty — anything typed there is refused (see the field table).',
        scopeStepStored,
      ]),
      shot: 'form-new.png',
    },
    changeTask('Web Filter'),
    deleteTask('policy', 'policies'),
  ],
  forms: [
    {
      title: 'the web filter drawer',
      source: 'pages/security/tabs.js',
      model: 'webfilter',
      fields: {
        Name: configName('Block gambling', false),
        'Blocked categories': {
          drop: ['Comma-separated category names.'],
          what: 'Despite the box, comma-separated text is refused: the server stores a list and rejects anything else. A list set elsewhere shows here joined by commas and survives a save only if you leave the box untouched.',
          checks: ['Must be a list of category strings.'],
        },
        'Custom rules': {
          what: 'The same limitation: the server wants a list of rule objects and refuses text. Even the API’s deploy call for a web filter record does not send custom rules.',
          checks: ['Must be a list of rule objects.'],
        },
        ...SCOPE_FIELDS,
        Enabled: { ...ENABLED, what: 'Stored with the record. Nothing pushes web filter records to routers, so it has no effect on a device.' },
      },
    },
  ],
  sections: [SCOPE_SECTION],
  verify: [
    'The record is in the list with the Scope you chose. That is as far as this page goes: no path in the console or the Django admin pushes a web filter record to a router.',
  ],
  trouble: [
    ['*Must be a list of category strings.* under Blocked categories', 'The box sends text; the server accepts only a list.', 'Clear the box and save.'],
    ['*Must be a list of rule objects.* under Custom rules', 'Same cause.', 'Clear the box and save.'],
    ['*This field is required.* under Name', 'Name is empty.', 'Type a name.'],
    DEVICE_TAKEN('Web Filter', false),
    ['The policy does not appear in the admin’s *Apply security policy (RPCD)* page', 'Web Filter is not one of the features that action applies.', 'There is no supported way to push it from the console today.'],
    SEARCH_TRAP,
    DENIED,
  ],
  shotDir: 'security/webfilter',
  shots: [
    { file: 'list.png', what: 'The Web Filter list with Name, Scope and State columns.', alt: 'The Web Filter list' },
    { file: 'form-new.png', what: 'The New Web Filter drawer: Name, Blocked categories, Custom rules, the scope fields and Enabled.', alt: 'Creating a web filter policy' },
  ],
};

// ------------------------------------------------------------ Address Groups

const ADDRESS_GROUP: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, 'nexapp_security/models/secpolicy.py'],
  title: 'Working with address groups',
  intro: [
    'An address group is a named list of IP addresses or networks belonging to one organization.',
    'The list shows **Name**, **Description** and **Organization**, ten rows to a page. Address groups have no scope switch and no on/off state.',
    '<Callout type="warn">**Two limits to know first.** No security policy, profile or push refers to an address group, so a group has no effect on any router. And **Addresses** cannot be filled in from this drawer: the server wants a list, the box sends text, and any text is refused.</Callout>',
  ],
  before: [
    '**Only a superuser can create, change or delete.** Other users get *Not authenticated — log in to the Django admin first.* and see only their own organizations’ groups.',
    'The organization must already exist.',
  ],
  tasks: [
    {
      title: 'Create an address group',
      steps: [
        'Open **Access Control › Security › Address Groups** and press **New address group**. The **New Address Groups** drawer opens on the right.',
        'Type a **Name**, e.g. `Branch LANs`, and choose the **Organization**.',
        'Leave **Addresses** empty — anything typed there is refused (see the field table). Optionally add a **Description**, e.g. `Branch office subnets`.',
        'Press **Create**. *Created* confirms it.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change or delete an address group',
      steps: [
        'Click the name, or **⋮ › Edit**; change it and press **Save changes**.',
        'To delete: **⋮ › Delete** and confirm, or tick several rows and use **Delete** on the bar above the table.',
      ],
      after: [
        'The confirmation says *The address group stops being applied to any device it covers.* Nothing uses address groups, so deleting one changes nothing outside this list.',
        'The row menu also offers **Enable** / **Disable** and the toolbar an **All states** filter. Address groups have no on/off state: Enable reports *Enabled* but nothing changes, and choosing **Enabled** in the filter hides every row.',
      ],
    },
  ],
  forms: [
    {
      title: 'the address group drawer',
      source: 'pages/security/tabs.js',
      model: 'address-group',
      fields: {
        Name: {
          example: 'Branch LANs',
          what: 'Up to 64 characters, unique within the organization.',
          checks: ['This field is required.', 'Ensure this field has no more than 64 characters.', 'The fields organization, name must make a unique set.'],
        },
        Organization: {
          starts: 'None',
          what: 'The organization that owns the group. Deleting the organization deletes its groups.',
          checks: ['This field is required.'],
        },
        Addresses: {
          drop: ['Comma-separated IPs or CIDR ranges.'],
          what: 'Despite the hint, comma-separated text is refused: the server stores a list (up to 1000 IPs or CIDR networks) and rejects anything else. A list set elsewhere shows here joined by commas and survives a save only if you leave the box untouched.',
          checks: ['Must be a list of CIDR addresses.'],
        },
        Description: {
          example: 'Branch office subnets',
          what: 'Optional, up to 256 characters. Shown in the list.',
          checks: ['Ensure this field has no more than 256 characters.'],
        },
      },
    },
  ],
  verify: ['The group is in the list under its organization’s name.'],
  trouble: [
    ['*Must be a list of CIDR addresses.* under Addresses', 'The box sends text; the server accepts only a list.', 'Clear the box and save.'],
    ['*This field is required.* under Organization', 'No organization chosen.', 'Choose one.'],
    NAME_PAIR,
    ['**Enable** says *Enabled* but nothing changes', 'Address groups have no on/off state; the menu item comes from the shared table.', 'Ignore it.'],
    ['**All states › Enabled** shows no groups', 'Same cause — no group is ever “enabled”.', 'Leave the filter on **All states**.'],
    [SEARCH_TRAP[0], SEARCH_TRAP[1], 'Page through the list.'],
    DENIED,
  ],
  shotDir: 'security/address-group',
  shots: [
    { file: 'list.png', what: 'The Address Groups list with Name, Description and Organization columns.', alt: 'The Address Groups list' },
    { file: 'form-new.png', what: 'The New Address Groups drawer: Name, Organization, Addresses and Description.', alt: 'Creating an address group' },
  ],
};

// ------------------------------------------------------------ Profiles

const PROFILES: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, 'nexapp_security/models/secpolicy.py', 'nexapp_security/admin.py'],
  title: 'Working with security profiles',
  intro: [
    'A security profile is a named bundle of settings of one type — Firewall, IDS, IPS or SSL Inspection — that a security policy can list.',
    LIST_LINE('**Name**, **Scope** and **State**'),
    '<Callout type="warn">**A profile cannot be created from this page.** The server requires a profile type, which this drawer does not offer, so **Create** fails — and because that error belongs to a field the drawer does not show, the drawer simply stays open with no message. Create profiles in the Django admin under **Security › Security Profiles**; they then appear here, where you can rename, re-scope, enable, disable and delete them. Nothing pushes a profile to a router.</Callout>',
  ],
  before: BEFORE_COMMON,
  tasks: [
    {
      title: 'Create a security profile',
      steps: [
        'Open the Django admin, **Security › Security Profiles**, and add the profile there with its **Profile type**.',
        'Back in **Access Control › Security › Profiles**, press the refresh button: the profile is in the list.',
      ],
      after: ['Pressing **New policy** on this page opens a **New Profiles** drawer with only Name, the scope fields and Enabled; **Create** there does nothing visible, because the server rejects the record for its missing profile type.'],
      shot: 'form-new.png',
    },
    changeTask('Profiles'),
    deleteTask('policy', 'policies'),
  ],
  forms: [
    {
      title: 'the profile drawer',
      source: 'pages/security/tabs.js',
      model: 'profile',
      opens: 'Usable for editing an existing profile. On a new one, Create fails silently — see above.',
      fields: {
        Name: {
          example: 'Default IPS profile',
          what: 'Up to 128 characters. Unique together with the organization and the profile type.',
          checks: ['This field is required.', 'Ensure this field has no more than 128 characters.', 'The fields organization, name, profile_type must make a unique set.'],
        },
        ...SCOPE_FIELDS,
        Enabled: { ...ENABLED, what: 'Stored with the profile. Nothing pushes profiles to routers, so it has no effect on a device.' },
      },
    },
  ],
  sections: [SCOPE_SECTION],
  verify: ['The profile is in the list with the Scope you chose. No router is affected.'],
  trouble: [
    ['**Create** does nothing and the drawer stays open', 'The server refused the record for its missing profile type, and the drawer has no field to show that error under.', 'Create the profile in the Django admin.'],
    ['*The fields organization, name, profile_type must make a unique set.*', 'A profile of the same type with this name already has this organization.', 'Choose a different name.'],
    DEVICE_TAKEN('Security Profile', false),
    SEARCH_TRAP,
    DENIED,
  ],
  shotDir: 'security/profile',
  shots: [
    { file: 'list.png', what: 'The Profiles list with Name, Scope and State columns.', alt: 'The Profiles list' },
    { file: 'form-new.png', what: 'The New Profiles drawer: Name, the scope fields and Enabled — no profile type.', alt: 'The profile drawer' },
  ],
};

// ------------------------------------------------------------ Policies

const POLICIES: AdminNotes = {
  from: [...FE_COMMON, ...BE_COMMON, ...BE_PUSH, 'nexapp_security/models/secpolicy.py', 'nexapp_security/admin.py'],
  title: 'Working with security policies',
  intro: [
    'A security policy is a zone rule — traffic from a source zone to a destination zone is allowed, denied or inspected, optionally logged, with security profiles attached and an order set by priority.',
    LIST_LINE('**Name**, **Scope** and **State**, in priority order'),
    '<Callout type="warn">**This drawer sets only the name, scope and on/off switch.** A policy created here gets the server defaults: **LAN → WAN, Allow**, priority 100, no logging, no profiles. Zones, action, priority, logging, profiles and VRF are edited in the Django admin under **Security › Security Policies**. Policies are not in the admin’s *Apply security policy (RPCD)* action, so nothing in the console or the admin pushes them to routers.</Callout>',
  ],
  before: BEFORE_COMMON,
  tasks: [
    {
      title: 'Create a security policy',
      steps: createSteps('Policies', 'Policies', 'New policy', [
        'Type a **Name**, e.g. `LAN to WAN allow`.',
        scopeStepStored,
      ]),
      after: ['Then open it in the Django admin to set its zones, action, priority and profiles — the new policy is LAN → WAN, Allow until you do.'],
      shot: 'form-new.png',
    },
    changeTask('Policies'),
    deleteTask('policy', 'policies'),
  ],
  forms: [
    {
      title: 'the policy drawer',
      source: 'pages/security/tabs.js',
      model: 'policy',
      fields: {
        Name: {
          example: 'LAN to WAN allow',
          what: 'Up to 128 characters. Unique within an organization.',
          checks: ['This field is required.', 'Ensure this field has no more than 128 characters.', 'The fields organization, name must make a unique set.'],
        },
        ...SCOPE_FIELDS,
        Enabled: { ...ENABLED, what: 'Stored with the policy. Nothing in the console or the admin pushes policies, so it has no effect on a router by itself.' },
      },
    },
  ],
  sections: [SCOPE_SECTION],
  verify: ['The policy is in the list, ordered by its priority, with the Scope you chose. No router is affected by saving it.'],
  trouble: [
    NAME_PAIR,
    ['*This field is required.* under Name', 'Name is empty.', 'Type a name.'],
    DEVICE_TAKEN('Security Policy', false),
    ['The new policy allows LAN → WAN although I wanted something else', 'Those settings are not on this drawer; the server defaults apply.', 'Edit the policy in the Django admin.'],
    SEARCH_TRAP,
    DENIED,
  ],
  shotDir: 'security/policy',
  shots: [
    { file: 'list.png', what: 'The Policies list with Name, Scope and State columns.', alt: 'The Policies list' },
    { file: 'form-new.png', what: 'The New Policies drawer: Name, the scope fields and Enabled.', alt: 'Creating a security policy' },
  ],
};

export const SECURITY_NOTES: Record<string, AdminNotes> = {
  '/security/threatshield-ip': INSTASHIELD_IP,
  '/security/ips': IPS,
  '/security/antivirus': ANTIVIRUS,
  '/security/antispam': ANTISPAM,
  '/security/webfilter': WEBFILTER,
  '/security/address-group': ADDRESS_GROUP,
  '/security/profile': PROFILES,
  '/security/policy': POLICIES,
};
