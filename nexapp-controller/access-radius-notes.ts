/** Access Control › RADIUS — guide notes (see access-notes.ts). */
import type { AdminNotes } from './admin-notes.ts';

// Shared by every RADIUS entry: the admin API these pages call.
const ADMIN_API = ['nexapp_radius_admin/api/views.py', 'nexapp_radius_admin/api/serializers.py'];

// ------------------------------------------------------------------ NAS

const NAS: AdminNotes = {
  from: [
    'pages/RadiusNas.jsx',
    'features/radius/RadiusNasDrawer.jsx',
    'features/radius/radiusModel.js',
    'components/BulkBar.jsx',
    'services/api.js',
    ...ADMIN_API,
    'vendor/nexapp-radius/nexapp_radius/base/models.py',
    'vendor/nexapp-radius/nexapp_radius/tasks.py',
  ],
  title: 'Working with NAS entries',
  intro: [
    'A NAS (network access server) is a device that sends RADIUS requests on behalf of the people connecting to it — an access point, a switch doing 802.1X, a captive portal. Each entry here is one NAS: the address it sends from, the **shared secret** it signs requests with, its NAS-Port-Type, and the organization it belongs to.',
    'Entries are stored in FreeRADIUS’s standard `nas` table. Whether your FreeRADIUS server reads its clients from that table is decided in the FreeRADIUS server’s own configuration, which is not part of the controller. Inside the controller, one thing reads these entries: when a user’s RADIUS group changes while they have an open session, the controller sends a Change of Authorization to the NAS, and it finds that NAS’s secret by matching the session’s NAS IP address against each entry’s **Name / IP** in the same organization.',
    'The list shows **Name** (with the first 40 characters of the description under it), **Short name**, **Organization**, **Type**, **Secret** — only whether one is **Set** or **Not set**; the secret itself is never sent back to the browser — and **Ports**. **Search name, short name or server…** runs when you press Enter and also matches the description. **All organizations** narrows the list to one organization; **Clear filters** resets both. Sorted by name, 25 per page.',
  ],
  before: [
    '**Add NAS** appears only with the add-NAS permission; **Edit** and **Delete** in each row’s **⋮** menu need their own permissions.',
    'You see, add and change entries only in organizations you belong to (superusers see all).',
    'Have the NAS’s source address and the shared secret configured on it to hand — the secret must be the same on both sides.',
  ],
  tasks: [
    {
      title: 'Add a NAS',
      steps: [
        'Open **Access Control › RADIUS › NAS** and press **Add NAS**.',
        'Under **Identity**, type the **Name / IP** the requests come from, a **Short name**, choose the **Organization**, and pick the **Type** (it starts at *Ethernet*; the common types are at the top of the list).',
        'Under **Connection**, type the **Shared secret**. **Ports**, **Server** and **SNMP community** are optional.',
        'Optionally add a **Description**, and press **Create NAS**. You return to the list with *Created ‹name›.*',
      ],
      after: [
        '**Create NAS** stays grey until **Name / IP**, **Organization** and **Shared secret** are filled. **Short name** is not marked as required, but the server refuses an empty one — see the field table.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a NAS or rotate its secret',
      steps: [
        'Choose **⋮ › Edit** on the row.',
        'Change what you need. **Shared secret** opens empty: leave it empty to keep the stored secret, or type a new one to replace it.',
        'Press **Save NAS**. You see *Saved ‹name›.*',
      ],
      after: [
        'A new secret takes effect only if the NAS is changed to the same value.',
      ],
    },
    {
      title: 'Delete NAS entries',
      steps: [
        'Choose **⋮ › Delete** and confirm *Delete ‹name›?* — or tick several rows (the header box ticks the whole page), press **Delete** on the bar that appears, and confirm *Delete ‹n› NASs?*',
      ],
      after: [
        'The dialog warns *FreeRADIUS will stop accepting requests from it immediately.* — that holds when your FreeRADIUS reads its clients from this table. A bulk delete reports *Deleted ‹n› NASs.* and, if any failed, *‹x› of ‹n› could not be deleted.*',
      ],
    },
  ],
  forms: [
    {
      title: 'the NAS form',
      source: 'features/radius/RadiusNasDrawer.jsx',
      opens: 'A drawer titled **Add NAS** (or **Edit ‹name›**) in three parts: **Identity**, **Connection** and **Notes**. When the server refuses a value, the red bar at the top names the field first, e.g. *short_name: This field may not be blank.*',
      fields: {
        'Name / IP': {
          example: '10.20.0.1',
          what: 'Up to 128 characters. For the controller’s Change of Authorization lookup it must be an IP address or a network such as `10.20.0.0/24`; an entry whose name is not an address is skipped there.',
          checks: ['name: Ensure this field has no more than 128 characters.'],
        },
        'Short name': {
          required: 'Yes',
          example: 'branch-ap-01',
          what: 'Up to 32 characters. The form does not mark it, but the server requires it.',
          checks: ['short_name: This field may not be blank.', 'short_name: Ensure this field has no more than 32 characters.'],
        },
        Type: { starts: 'Ethernet', what: 'The full NAS-Port-Type list; *Ethernet*, *IEEE 802.11*, *Wireless - Other*, *Virtual* and *Other* are lifted to the top.' },
        'Shared secret': {
          required: 'When adding',
          example: 'Rad1us-Br4nch-01',
          what: 'Up to 60 characters.',
          checks: ['secret: Ensure this field has no more than 60 characters.'],
        },
        Ports: { example: '24', what: 'A whole number, 0 or more; leave empty if unknown.' },
        Server: { what: 'Up to 64 characters.' },
        'SNMP community': { what: 'Up to 50 characters.' },
        Description: { example: 'Branch 01 access points', what: 'Up to 200 characters; the first 40 show under the name in the list.' },
      },
    },
  ],
  verify: [
    'The entry is in the list with **Secret** showing **Set**.',
    'Authenticate a test user through that NAS and look for the attempt on **Post-auth log**.',
  ],
  trouble: [
    ['**Create NAS** stays grey', '**Name / IP**, **Organization** or **Shared secret** is empty.', 'Fill all three; the empty one is marked in red.'],
    ['*short_name: This field may not be blank.*', 'The server requires a short name although the form does not mark it.', 'Type a **Short name**.'],
    ['*… Ensure this field has no more than … characters.*', 'A value is longer than the column allows (Name / IP 128, Short name 32, secret 60, Server 64, SNMP community 50, Description 200).', 'Shorten the field the message names.'],
    ['Users fail to authenticate after a secret change', 'The secret stored here and the one on the NAS differ.', 'Set the same secret on the NAS, or type the old one back here.'],
    ['**Secret** shows **Not set**', 'The entry was created without a secret outside this form.', 'Edit it and type a **Shared secret**.'],
    ['An entry you know exists is not listed', 'It belongs to an organization you are not a member of, or a filter is on.', 'Press **Clear filters**; ask a superuser if it is in another organization.'],
  ],
  shotDir: 'radius/nas',
  shots: [
    { file: 'list.png', what: 'The NAS clients list with search, the organization filter, Add NAS, and the Secret column showing Set.', alt: 'The NAS list' },
    { file: 'form-new.png', what: 'The Add NAS drawer: Identity, Connection and Notes.', alt: 'Adding a NAS' },
  ],
};

// ------------------------------------------------------------------ Groups

const GROUPS: AdminNotes = {
  from: [
    'pages/RadiusGroups.jsx',
    'features/radius/RadiusGroupDrawer.jsx',
    'components/BulkBar.jsx',
    'services/api.js',
    ...ADMIN_API,
    'vendor/nexapp-radius/nexapp_radius/base/models.py',
    'vendor/nexapp-radius/nexapp_radius/receivers.py',
    'vendor/nexapp-radius/nexapp_radius/utils.py',
    'vendor/nexapp-radius/nexapp_radius/api/freeradius_views.py',
  ],
  title: 'Working with RADIUS groups',
  intro: [
    'A RADIUS group is the plan a user is on. When FreeRADIUS asks the controller to authorize a user, the controller looks up that user’s group in the organization and sends back the **group’s reply attributes**; the group’s check attributes feed its usage counters, and a user who has used up a counter’s limit is rejected.',
    'Every new organization gets two groups automatically: **‹slug›-users** (*Regular users*, the default, with a session-time and a traffic limit) and **‹slug›-power-users** (*Users with less restrictions*). The default group is the one a person is put into when they are added to the organization — but only if they are not already in one of its groups. Existing members keep their group when the default changes.',
    'This page manages the groups themselves: name, organization, description and which is the default. Group check and reply attributes, and which users are in which group, are not edited here.',
    'The list shows **Name** (with the description under it), **Organization**, **Default** and **Created**. **Search name or description…** runs when you press Enter; **All organizations** narrows to one organization; **Clear filters** resets both. Sorted by name, 25 per page.',
  ],
  before: [
    '**Add group** appears only with the add-group permission; **Edit** and **Delete** in the **⋮** menu need their own permissions.',
    'You see and change only groups in organizations you belong to (superusers see all).',
    'Group names are unique across **all** organizations, not per organization. Start the name with the organization’s slug, as the automatic groups do, to avoid clashes.',
  ],
  tasks: [
    {
      title: 'Add a group',
      steps: [
        'Open **Access Control › RADIUS › Groups** and press **Add group**.',
        'Type a **Name**, choose the **Organization**, and optionally a **Description**.',
        'Switch on **Default group for this organization** only if new members should land in it.',
        'Press **Create group**. You see *Created ‹name›.*',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a group or make it the default',
      steps: [
        'Choose **⋮ › Edit** on the row.',
        'Change the name or description, or switch on **Default group for this organization**.',
        'Press **Save group**. You see *Saved ‹name›.*',
      ],
      after: [
        'Making a group the default clears the flag on the organization’s previous default in the same save.',
        'Renaming a group also renames it on its check and reply attributes and on its users’ memberships, so they stay attached.',
        'Switching **Default** off on the current default is accepted, and leaves the organization with no default group — new members then join no group. Make another group the default instead.',
      ],
    },
    {
      title: 'Delete groups',
      steps: [
        'Choose **⋮ › Delete** and confirm *Delete ‹name›?* — or tick several rows, press **Delete** on the bar, and confirm *Delete ‹n› groups?*',
      ],
      after: [
        'Deleting a group also deletes its check and reply attributes and every user’s membership of it. Those users are left without a group in that organization. The dialog says *Users in it lose whatever checks and replies it carried.*',
        '**The default group cannot be deleted.** The server refuses it, and the error that comes back does not say why — make another group the default first.',
      ],
    },
  ],
  forms: [
    {
      title: 'the group form',
      source: 'features/radius/RadiusGroupDrawer.jsx',
      opens: 'A drawer titled **Add RADIUS group** (or **Edit ‹name›**). A refusal from the server shows in the red bar at the top, starting with the field name.',
      fields: {
        Name: {
          example: 'acme-staff',
          what: 'Up to 255 characters, unique across every organization.',
          checks: ['name: group with this group name already exists.'],
        },
        Description: {
          example: 'Staff laptops',
          what: 'Up to 64 characters — the box lets you type more, the server does not.',
          checks: ['description: Ensure this field has no more than 64 characters.'],
        },
        'Default group for this organization': { starts: 'Off' },
      },
    },
  ],
  verify: [
    'The group is in the list under its organization; a default group shows the **Default** badge, and no other group of that organization does.',
  ],
  trouble: [
    ['*name: group with this group name already exists.*', 'Another organization (or this one) already has a group with that name — names are global.', 'Prefix the name with the organization slug, e.g. `acme-staff`.'],
    ['*description: Ensure this field has no more than 64 characters.*', 'The description is longer than 64 characters.', 'Shorten it.'],
    ['*Could not delete: …* on the default group', 'The default group is protected from deletion.', 'Make another group the default, then delete this one.'],
    ['New members get no RADIUS group', 'The organization has no default group.', 'Edit a group and switch on **Default group for this organization**.'],
    ['Changing the default did not move existing users', 'The default applies only when someone is added to the organization.', 'Expected; existing members keep their group.'],
  ],
  shotDir: 'radius/groups',
  shots: [
    { file: 'list.png', what: 'The RADIUS groups list — each organization’s users and power-users groups, with the Default badge.', alt: 'The RADIUS groups list' },
    { file: 'form-new.png', what: 'The Add RADIUS group drawer: Name, Organization, Description and the Default switch.', alt: 'Adding a RADIUS group' },
  ],
};

// ------------------------------------------------------------------ Checks / Replies

const PER_USER_NOTE =
  'Rows here are written to FreeRADIUS’s standard per-user tables (`radcheck` for checks, `radreply` for replies). The controller’s own authorization answer to FreeRADIUS does **not** read these rows — it sends the user’s **group** replies. A row here takes effect only if your FreeRADIUS server reads these tables directly, which is set up in the FreeRADIUS configuration, not in the controller.';

const ATTR_TROUBLE: [string, string, string][] = [
  ['The **Create** button stays grey', '**Username**, **Organization** or **Attribute** is empty.', 'Fill all three.'],
  ['*value: This field may not be blank.*', 'The server requires a value although the form does not mark it.', 'Type a **Value**.'],
  ['*… Ensure this field has no more than … characters.*', 'Username or attribute over 64 characters, or value over 253.', 'Shorten the field the message names.'],
  ['The row saved but nothing changes for the user', 'The controller does not read per-user rows; only FreeRADIUS reading the table directly applies them.', 'Check your FreeRADIUS SQL configuration, or put the attribute on the user’s RADIUS group instead.'],
  ['Searching finds nothing', 'The search runs when you press Enter, and matches username, attribute and value.', 'Press **Enter**; press **Clear filters** to start over.'],
];

const CHECKS: AdminNotes = {
  from: [
    'pages/RadiusChecks.jsx',
    'features/radius/RadiusAttrDrawer.jsx',
    'features/radius/radiusModel.js',
    'components/BulkBar.jsx',
    'services/api.js',
    ...ADMIN_API,
    'vendor/nexapp-radius/nexapp_radius/base/models.py',
    'vendor/nexapp-radius/nexapp_radius/api/freeradius_views.py',
  ],
  title: 'Working with RADIUS checks',
  intro: [
    'A check is a per-user condition: a **username**, a FreeRADIUS **attribute**, an **operator** and a **value**, in one organization. FreeRADIUS compares it while deciding whether that user may authenticate.',
    PER_USER_NOTE,
    'The list shows **Username** (with the organization under it), **Attribute**, **Op**, **Value** and **Organization**, newest first, 25 per page. **Search username, attribute or value…** runs when you press Enter; **All organizations** narrows to one organization.',
  ],
  before: [
    '**Add check** appears only with the add-check permission; **Edit** and **Delete** need their own permissions.',
    'You see only rows in organizations you belong to (superusers see all).',
    'The username is stored as text; it is not linked to a user account, so renaming the user does not update it.',
  ],
  tasks: [
    {
      title: 'Add a check',
      steps: [
        'Open **Access Control › RADIUS › Checks** and press **Add check**.',
        'Type the **Username** and choose the **Organization**.',
        'Type or pick the **Attribute** — the list offers common ones, but any FreeRADIUS attribute name is accepted.',
        'Choose the **Operator** (it starts at `:=`) and type the **Value**.',
        'Press **Create check**. You see *Created check.*',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a check',
      steps: ['Choose **⋮ › Edit**, change the fields, and press **Save check**. You see *Saved check.*'],
    },
    {
      title: 'Delete checks',
      steps: [
        'Choose **⋮ › Delete** and confirm *Delete ‹username›?* — or tick several rows, press **Delete** on the bar, and confirm *Delete ‹n› checks?*',
      ],
      after: ['The dialog says *The check stops applying to that user at the next authentication.*'],
    },
  ],
  forms: [
    {
      title: 'the check form',
      source: 'features/radius/RadiusAttrDrawer.jsx',
      opens: 'A drawer titled **Add check** (or **Edit check · ‹username›**), in two parts: **Scope** and **Attribute**. The same drawer serves Replies, with a shorter operator list.',
      fields: {
        Username: { example: 'guest-1', what: 'Up to 64 characters.' },
        Attribute: {
          example: 'Simultaneous-Use',
          what: 'Up to 64 characters. Suggested: Cleartext-Password, Crypt-Password, MD5-Password, NT-Password, Auth-Type, Simultaneous-Use, Expiration, Max-Daily-Session.',
        },
        Operator: {
          starts: ':=',
          drop: ['Replies assign; := overwrites, += appends.'],
          what: 'Thirteen operators — see *Operators* below.',
        },
        Value: { required: 'Yes', example: '1', what: 'Up to 253 characters. The form does not mark it, but the server requires it. Stored exactly as typed — a password attribute’s value is not hashed by this form.', checks: ['value: This field may not be blank.'] },
      },
    },
  ],
  sections: [
    {
      title: 'Operators',
      body: [
        'A check offers these thirteen — the full FreeRADIUS comparison set:',
        '`=` `:=` `==` `+=` `!=` `>` `>=` `<` `<=` `=~` `!~` `=*` `!*`',
        'A reply accepts only `=`, `:=` and `+=`.',
      ],
    },
  ],
  verify: ['The row is in the list with the operator shown in its badge.'],
  trouble: ATTR_TROUBLE,
  shotDir: 'radius/checks',
  shots: [
    { file: 'list.png', what: 'The RADIUS checks list with search and the organization filter.', alt: 'The RADIUS checks list' },
    { file: 'form-new.png', what: 'The Add check drawer: Username, Organization, Attribute, Operator and Value.', alt: 'Adding a RADIUS check' },
  ],
};

const REPLIES: AdminNotes = {
  from: [
    'pages/RadiusReplies.jsx',
    'features/radius/RadiusAttrDrawer.jsx',
    'features/radius/radiusModel.js',
    'components/BulkBar.jsx',
    'services/api.js',
    ...ADMIN_API,
    'vendor/nexapp-radius/nexapp_radius/base/models.py',
    'vendor/nexapp-radius/nexapp_radius/api/freeradius_views.py',
  ],
  title: 'Working with RADIUS replies',
  intro: [
    'A reply is a per-user attribute sent back to the NAS once that user has authenticated — a session timeout, a bandwidth cap, a fixed IP. Each row is a **username**, an **attribute**, an **operator** and a **value**, in one organization.',
    PER_USER_NOTE,
    'The list shows **Username** (with the organization under it), **Attribute**, **Op**, **Value** and **Organization**, newest first, 25 per page. **Search username, attribute or value…** runs when you press Enter; **All organizations** narrows to one organization.',
  ],
  before: [
    '**Add reply** appears only with the add-reply permission; **Edit** and **Delete** need their own permissions.',
    'You see only rows in organizations you belong to (superusers see all).',
    'The username is stored as text; it is not linked to a user account, so renaming the user does not update it.',
  ],
  tasks: [
    {
      title: 'Add a reply',
      steps: [
        'Open **Access Control › RADIUS › Replies** and press **Add reply**.',
        'Type the **Username** and choose the **Organization**.',
        'Type or pick the **Attribute** — the list offers common ones, but any FreeRADIUS attribute name is accepted.',
        'Choose the **Operator** (it starts at `=`) and type the **Value**.',
        'Press **Create reply**. You see *Created reply.*',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a reply',
      steps: ['Choose **⋮ › Edit**, change the fields, and press **Save reply**. You see *Saved reply.*'],
    },
    {
      title: 'Delete replies',
      steps: [
        'Choose **⋮ › Delete** and confirm *Delete ‹username›?* — or tick several rows, press **Delete** on the bar, and confirm the bulk dialog.',
      ],
      after: ['The dialog says *The reply stops applying to that user at the next authentication.*'],
    },
  ],
  forms: [
    {
      title: 'the reply form',
      source: 'features/radius/RadiusAttrDrawer.jsx',
      opens: 'A drawer titled **Add reply** (or **Edit reply · ‹username›**), in two parts: **Scope** and **Attribute**.',
      fields: {
        Username: { example: 'guest-1', what: 'Up to 64 characters.' },
        Attribute: {
          example: 'Session-Timeout',
          what: 'Up to 64 characters. Suggested: Session-Timeout, Idle-Timeout, Acct-Interim-Interval, WISPr-Bandwidth-Max-Down, WISPr-Bandwidth-Max-Up, Framed-IP-Address, Framed-Pool, Reply-Message.',
        },
        Operator: {
          starts: '=',
          drop: ['How the value is compared.'],
          what: 'One of `=`, `:=`, `+=` — the comparison operators a check offers are not accepted for a reply.',
        },
        Value: { required: 'Yes', example: '3600', what: 'Up to 253 characters. The form does not mark it, but the server requires it.', checks: ['value: This field may not be blank.'] },
      },
    },
  ],
  verify: ['The row is in the list with the operator shown in its badge.'],
  trouble: ATTR_TROUBLE,
  shotDir: 'radius/replies',
  shots: [
    { file: 'list.png', what: 'The RADIUS replies list with search and the organization filter.', alt: 'The RADIUS replies list' },
    { file: 'form-new.png', what: 'The Add reply drawer: Username, Organization, Attribute, Operator and Value.', alt: 'Adding a RADIUS reply' },
  ],
};

// ------------------------------------------------------------------ Accounting

const ACCOUNTING: AdminNotes = {
  from: [
    'pages/RadiusAccounting.jsx',
    'services/api.js',
    'vendor/nexapp-radius/nexapp_radius/api/views.py',
    'vendor/nexapp-radius/nexapp_radius/api/freeradius_views.py',
    'vendor/nexapp-radius/nexapp_radius/base/models.py',
    'vendor/nexapp-users/nexapp_users/api/mixins.py',
    'vendor/nexapp-users/nexapp_users/api/permissions.py',
    'tests/nexapp2/settings.py',
  ],
  title: 'Reading the accounting log',
  intro: [
    'Each row is one RADIUS session as the NAS reported it through FreeRADIUS accounting: who connected, through which NAS, from which device, which IP they were given, when it started, how long it has run and how much traffic it carried. Newest first.',
    '<Callout type="info">**Read-only.** Sessions arrive from FreeRADIUS; nothing on this page adds, edits or deletes them, and a row does not open.</Callout>',
    'The columns are **User** (with the realm, or else the group name, under it), **NAS** (the NAS IP address), **Client MAC** (the calling station ID), **IP** (the address given to the client), **Started**, **Duration**, **In**, **Out** and **State** — **Open** while the session has no stop time, **Closed** after.',
    '<Callout type="warn">**Only one page is shown.** The sessions list answers without a total, so the count in the header is the number of rows on screen and the pager never offers a second page. You see the newest sessions that match the filters, up to the page size. Choose **100** per page, and narrow with the filters, to reach further back.</Callout>',
  ],
  before: [
    'You need to be an administrator of at least one organization (or a superuser). You see the sessions of the organizations you administer.',
  ],
  tasks: [
    {
      title: 'Find one user’s sessions',
      steps: [
        'Open **Access Control › RADIUS › Accounting**.',
        'Type the exact username into **Username…** and press **Enter**. This is an exact match, not a search — part of a name finds nothing.',
        'Use **All sessions** to show only **Still open** or **Closed** sessions. **Clear filters** resets both.',
      ],
    },
    {
      title: 'See who is connected now',
      steps: ['Choose **Still open** in the session-state filter. Press the refresh button to fetch the latest.'],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the values mean',
      body: [
        '- **Duration** — the session time the NAS reported. For an open session that has not reported one yet, the time since **Started**.\n- **In / Out** — the session’s input and output octet counters as the NAS reported them, shown in B, KB, MB, GB or TB.\n- **State** — **Open** until the NAS reports a stop.',
      ],
    },
    {
      title: 'Housekeeping the controller does on its own',
      body: [
        '- Every day at 00:20, a session still open with no update for a day (or, if it never sent one, started more than a day ago) is closed, with termination cause *Session Timeout*.\n- Every day at 01:30, sessions that stopped more than 365 days ago are deleted.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*No sessions match these filters.* after typing a name', 'The username filter is an exact match.', 'Type the full username exactly; the page says so under the message.'],
    ['*No RADIUS sessions recorded.*', 'FreeRADIUS has not posted accounting for any session in organizations you administer.', 'Check that the NAS sends accounting to FreeRADIUS.'],
    ['*Could not load RADIUS sessions* with 403', 'You do not administer any organization.', 'Ask for administrator rights in the organization, or a superuser.'],
    ['Older sessions are missing', 'Only one page is shown.', 'Raise the page size to 100 and filter by username or state.'],
    ['A session closed that the user says is still connected', 'It had no accounting update for a day and was closed by the daily clean-up.', 'Make sure the NAS sends interim accounting updates.'],
  ],
  shotDir: 'radius/accounting',
  shots: [
    { file: 'list.png', what: 'The RADIUS accounting list with the username filter, the session-state filter and open and closed sessions.', alt: 'The RADIUS accounting list' },
  ],
};

// ------------------------------------------------------------------ Post-auth

const POST_AUTH: AdminNotes = {
  from: [
    'pages/RadiusPostAuth.jsx',
    'services/api.js',
    ...ADMIN_API,
    'vendor/nexapp-radius/nexapp_radius/base/models.py',
    'tests/nexapp2/settings.py',
  ],
  title: 'Reading the post-auth log',
  intro: [
    'Every authentication attempt FreeRADIUS reported back, with its answer: who tried, whether they were accepted, from which device and through which NAS. This is the first place to look when someone cannot log in.',
    '<Callout type="info">**Read-only.** FreeRADIUS writes this log; the page cannot add, change or delete entries. The password typed on each attempt is stored by FreeRADIUS but never shown here.</Callout>',
    'The columns are **When**, **Username**, **Result** — **Accepted**, or the reply FreeRADIUS gave (for example **Access-Reject**) in red — **Client MAC** (calling station ID), **NAS MAC** (called station ID) and **Organization**. Newest first, 25 per page.',
  ],
  before: ['You see attempts in organizations you belong to (superusers see all).'],
  tasks: [
    {
      title: 'Find why someone cannot log in',
      steps: [
        'Open **Access Control › RADIUS › Post-auth log**.',
        'Type their username, or the MAC of their device or of the access point, into **Search username or station id…** and press **Enter**. Part of a value is enough.',
        'Choose **Rejected** in **Any result** to see only failures, and an organization in **All organizations** if needed. **Clear filters** resets all three.',
        'No row at all for the attempt means the request never reached FreeRADIUS, or FreeRADIUS did not report it — look at the NAS and its shared secret next.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'How long entries are kept',
      body: ['Every day at 00:30, entries older than 365 days are deleted.'],
    },
  ],
  verify: [],
  trouble: [
    ['*No authentication attempts logged.*', 'FreeRADIUS has not posted any outcome for organizations you belong to.', 'Check that FreeRADIUS is reachable and configured to post its results to the controller.'],
    ['A user’s attempts show **Access-Reject**', 'FreeRADIUS refused the login — wrong password, inactive or expired account, or a used-up limit.', 'Check the user’s account and RADIUS group; batch users are deactivated after their batch expires.'],
    ['Search finds nothing', 'The search runs when you press Enter.', 'Press **Enter**.'],
  ],
  shotDir: 'radius/post-auth',
  shots: [
    { file: 'list.png', what: 'The post-auth log with search, the organization and result filters, and accepted and rejected attempts.', alt: 'The post-auth log' },
  ],
};

// ------------------------------------------------------------------ Batches

const BATCHES: AdminNotes = {
  from: [
    'pages/RadiusBatches.jsx',
    'features/radius/RadiusBatchDrawer.jsx',
    'components/useConfirm.jsx',
    'services/api.js',
    ...ADMIN_API,
    'vendor/nexapp-radius/nexapp_radius/api/views.py',
    'vendor/nexapp-radius/nexapp_radius/api/serializers.py',
    'vendor/nexapp-radius/nexapp_radius/base/models.py',
    'vendor/nexapp-radius/nexapp_radius/utils.py',
    'vendor/nexapp-radius/nexapp_radius/settings.py',
    'vendor/nexapp-radius/nexapp_radius/management/commands/base/deactivate_expired_users.py',
    'vendor/nexapp-radius/nexapp_radius/management/commands/base/delete_old_radiusbatch_users.py',
    'tests/nexapp2/settings.py',
  ],
  title: 'Creating users in batches',
  intro: [
    'A batch creates many RADIUS user accounts at once — for guest Wi-Fi, an event, a classroom. Either the controller **generates** them from a username prefix with random passwords, or it **imports** them from a CSV file. Every account made is added to the organization as a member, and so joins the organization’s default RADIUS group if it has one.',
    'The list shows **Name** (with *prefix ‹prefix›* or *imported from CSV* under it), **Organization**, **Strategy**, **Users** (how many accounts the batch holds), **Expires** (*never*, a date, or a red date once passed), **Created** and **Credentials** — a **PDF** button for generated batches. **Search name or prefix…** runs when you press Enter; **All organizations** and **Any strategy** narrow the list. Newest first, 25 per page.',
    'A batch cannot be edited after it is created.',
  ],
  before: [
    '**Create batch** appears only with the add-batch permission, and the server also requires **staff** status. **Delete batch and users** needs the delete permission.',
    'Downloading the credentials PDF needs staff status and administrator rights in an organization (or superuser).',
  ],
  tasks: [
    {
      title: 'Generate users from a prefix',
      steps: [
        'Open **Access Control › RADIUS › Batch operations** and press **Create batch**.',
        'Type a **Name** for the batch and choose the **Organization**. Set **Expiry** if the accounts should stop working after a date.',
        'Leave **Strategy** on **Generate from prefix**, type the **Username prefix** and the **Number of users**.',
        'Press **Create batch**. You see *Created ‹n› users. Download the PDF from the list to hand them out.*',
        'Press **PDF** on the batch’s row (or **⋮ › Download credentials**) to get the usernames and passwords.',
      ],
      after: [
        'Usernames are the prefix followed by 1, 2, 3… — `guest-1`, `guest-2` — skipping any that already exist. Each gets a random 8-character password. The PDF, named after the batch, is the only place those passwords can be read again.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Import users from a CSV file',
      steps: [
        'Press **Create batch**, type a **Name**, choose the **Organization**, and optionally an **Expiry**.',
        'Choose **Import a CSV file** in **Strategy** and pick the file in **CSV file**.',
        'Press **Create batch**. You see *Batch imported.*',
      ],
      after: [
        'See *The CSV file* below for the column order and how passwords are read. A CSV batch has no PDF.',
      ],
    },
    {
      title: 'Delete a batch and its users',
      steps: [
        'Choose **⋮ › Delete batch and users** on the row.',
        'The dialog states how many accounts go with it. Type the batch name exactly, then press **Delete batch and users**.',
      ],
      after: [
        '**This deletes every user account in the batch**, not only the batch record, and cannot be undone. That includes an existing account that a CSV row pulled in by its email address.',
      ],
    },
  ],
  forms: [
    {
      title: 'the batch form',
      source: 'features/radius/RadiusBatchDrawer.jsx',
      opens: 'A drawer titled **Create user batch**, in two parts: **Batch** and **How to create the users**. Only one of **Username prefix** with **Number of users**, or **CSV file**, shows — whichever **Strategy** asks for. A refusal from the server shows in the red bar at the top.',
      fields: {
        Name: {
          example: 'Conference wifi — Aug',
          what: 'Up to 128 characters, unique within the organization.',
          checks: ['\\_\\_all\\_\\_: Batch user creation with this Name and Organization already exists.'],
        },
        Organization: { what: 'The accounts become members of this organization.' },
        Expiry: {
          drop: ['Optional. The users stop authenticating after this date.'],
          what: 'Optional; empty means the accounts never expire. Every day at 00:05 the accounts of batches whose expiry date has passed are deactivated, and a deactivated account is refused at login. A batch whose expiry is more than 365 days past is deleted, with its accounts, by a daily job at 00:10.',
        },
        Strategy: { starts: 'Generate from prefix', what: '**Generate from prefix** or **Import a CSV file**.' },
        'Username prefix': {
          example: 'guest-',
          drop: ['Usernames become prefix0001, prefix0002 and so on, each with a generated password.'],
          when: 'Generate from prefix',
          what: 'Up to 20 characters: letters, digits and `@ . + - _`. Usernames become the prefix plus 1, 2, 3…, each with a generated password.',
          checks: ['prefix: This value may contain only letters, numbers, and @/./+/-/_ characters.', 'prefix: Ensure this value has at most 20 characters (it has …).'],
        },
        'Number of users': { when: 'Generate from prefix', starts: '10', example: '50' },
        'CSV file': {
          when: 'Import a CSV file',
          drop: ['One user per line: username,password,first name,last name,email. No PDF is produced — you already hold the passwords.'],
          what: 'One user per line, five columns in this order: **username, password, email, first name, last name** (the form’s own hint gives a different order — follow this one). See *The CSV file* below.',
          checks: [
            '\\_\\_all\\_\\_: Unrecognized file format, the supplied file does not look like a CSV file.',
            '\\_\\_all\\_\\_: The CSV contains a line with invalid data, line number … triggered the following error: Improper CSV format.',
            '\\_\\_all\\_\\_: The CSV contains a line with invalid data, line number … triggered the following error: Enter a valid email address.',
          ],
        },
      },
    },
  ],
  sections: [
    {
      title: 'The CSV file',
      body: [
        'No header row. Each line has exactly five comma-separated values — **username, password, email, first name, last name** — for example:',
        '```\nalice,cleartext$Wifi-2025!,alice@example.com,Alice,Rao\n,,bob@example.com,Bob,Shah\n```',
        '- **email** must be a valid address on every line; a line with a bad address, or with other than five values, stops the import and names the line number.\n- **username** may be empty: the part of the email before `@` is used. If the name is taken, a number is added (`alice1`, `alice2`…).\n- **password**: start it with `cleartext$` to give a plain password (`cleartext$Wifi-2025!` sets `Wifi-2025!`). An **empty** password makes the controller generate one and email it to that line’s address. Anything else is stored **as an already-hashed password** — a plain password without `cleartext$` will not work for logging in.\n- If a line’s email already belongs to an account, that existing account is added to the batch instead of creating a new one; the rest of the line is ignored. Deleting the batch later deletes that account too.',
      ],
    },
  ],
  verify: [
    'The batch is in the list with the expected **Users** count.',
    'For a generated batch, the **PDF** opens with the usernames and passwords; log in with one through a NAS and look for an **Accepted** row on **Post-auth log**.',
  ],
  trouble: [
    ['**Create batch** stays grey', 'Name, Organization, the prefix, a number of at least 1, or the CSV file is missing.', 'Fill what is marked in red.'],
    ['*\\_\\_all\\_\\_: Batch user creation with this Name and Organization already exists.*', 'This organization already has a batch with that name.', 'Choose another **Name**.'],
    ['*prefix: This value may contain only letters, numbers, and @/./+/-/_ characters.*', 'The prefix has a space or another character outside that set.', 'Use only letters, digits and `@ . + - _`.'],
    ['*…line number … triggered the following error: …*', 'That line of the CSV is not five values, or its email is not valid.', 'Fix the named line and import again — nothing was created.'],
    ['Imported users cannot log in', 'Their passwords were written without the `cleartext$` prefix, so they were stored as if already hashed.', 'Delete the batch and import again with `cleartext$` in front of each password.'],
    ['No **PDF** on a row', 'The batch was a CSV import — only generated batches have one.', 'Expected.'],
    ['Batch users stopped working', 'The batch’s expiry date passed and the daily job deactivated them.', 'Expected. The **Expires** date shows red once passed.'],
  ],
  shotDir: 'radius/batches',
  shots: [
    { file: 'list.png', what: 'The batch list with the organization and strategy filters, user counts, expiry dates and the PDF button.', alt: 'The RADIUS batch list' },
    { file: 'form-new.png', what: 'The Create user batch drawer with the prefix strategy chosen.', alt: 'Creating a user batch' },
  ],
};

export const RADIUS_NOTES: Record<string, AdminNotes> = {
  '/radius/nas': NAS,
  '/radius/group': GROUPS,
  '/radius/check': CHECKS,
  '/radius/reply': REPLIES,
  '/radius/accounting': ACCOUNTING,
  '/radius/post-auth': POST_AUTH,
  '/radius/batch': BATCHES,
};
