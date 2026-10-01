/**
 * Hand-written guidance for the Administration pages — what the source cannot
 * say on its own: example values, the order to do things in, the server-side
 * rules a form does not show until you save, and what goes wrong.
 *
 * Every claim here was checked against the files named in `from` (paths are
 * relative to `frontend/src/` unless they start with a backend app). Each entry
 * is pinned to those files by `check:descriptions` under `admin:<route>`, so a
 * change to any of them flags this entry for a re-read.
 *
 * Field notes are keyed by the label the form shows; a checkbox inside a row
 * is `Row › Checkbox`. `extra` marks a control the form readers cannot see (a
 * picker, a key/value table) — it is listed after the read fields.
 */

export interface AdminFieldNote {
  what?: string;
  example?: string;
  starts?: string;
  /** Messages the save can come back with, beyond what the control shows. */
  checks?: string[];
  /** "Only when adding" and the like — shown first in the description. */
  when?: string;
  /** For a conditionally required field: when it is. */
  requiredWhen?: string;
  /** Source sentences that are really error messages, moved to "Checked on save". */
  errorHints?: string[];
  /** Source sentences to leave out — empty-state text rather than help. */
  drop?: string[];
  /** A control no reader sees; listed after the read fields. */
  extra?: boolean;
  required?: string;
  skip?: boolean;
}

export interface AdminForm {
  title: string;
  /** Under `frontend/src/`. */
  source: string;
  /** In a file declaring several data-driven forms: the entry's `key:` or exported name. */
  model?: string;
  opens?: string;
  fields: Record<string, AdminFieldNote>;
  after?: string[];
  passwordRules?: boolean;
}

export interface AdminShot {
  file: string;
  what: string;
  alt: string;
}

export interface AdminNotes {
  from: string[];
  title: string;
  intro: string[];
  before: string[];
  tasks: { title: string; steps: string[]; after?: string[]; shot?: string }[];
  forms: AdminForm[];
  sections?: { title: string; body: string[] }[];
  verify: string[];
  trouble: [string, string, string][];
  /** Under `public/img/admin/`. */
  shotDir: string;
  shots: AdminShot[];
}

// ------------------------------------------------------------------ Users

const USERS: AdminNotes = {
  from: [
    'pages/UserList.jsx',
    'pages/UserForm.jsx',
    'components/ResetPasswordDrawer.jsx',
    'components/UserOrgsDrawer.jsx',
    'components/RecoverModal.jsx',
    'utils/passwordStrength.js',
  ],
  title: 'Working with users',
  intro: [
    'A user is a person who signs in to this controller. Three things decide what they can reach: the **role** flags on the account (Staff or Superuser), the **permission groups** ticked on it, and the **organizations** they belong to — as a member, or as an administrator who can manage that organization’s devices and members.',
  ],
  before: [
    '**Add user** appears only with the add-user permission; **Edit** and **Delete** each need their own permission, and without it the button is simply not there.',
    'Create the **permission group** first (Administration › Permission Groups) if none of the existing ones fits — a Staff user’s reach is the groups you tick.',
    'To put the person into an organization while creating them, the organization must already exist.',
    'Changing an existing user’s organizations, and recovering a deleted user, are **superuser-only**.',
  ],
  tasks: [
    {
      title: 'Add a user',
      steps: [
        'Open **Administration › Users & Organizations › Users** and press **Add user**.',
        'Under **Identity**, fill **Username**, **Email**, **Password** and **Confirm**. The checklist under the password ticks green as each rule is met — see *Password rules* below.',
        'Leave **Mark email as verified** off to have a verification email sent, or tick it when you already know the address is right.',
        'Under **Access & role**, tick **Staff status** or **Superuser status** — one of them is required when adding. **Active** is locked on for a new account.',
        'Tick the **Permission Groups** this person should have.',
        'Optionally choose an organization under **Add to**, and tick **Organization administrator** if they should manage it.',
        'Press **Create user**. You return to the list with *User “…” created.*',
      ],
      after: [
        'While **Create user** is greyed out, the reason is written beside it: *Enter a username.*, *Enter an email address.*, *Set a password.*, a password rule, *Passwords do not match.*, or *Choose a role — tick Staff status or Superuser status.*',
        '**Company**, **Location**, **URL**, **Bio** and **Notes** are not on the add form — the create call refuses them. Open the user after creating it to fill them in.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a user',
      steps: [
        'Click the username in the list, or choose **Edit** from the row’s menu.',
        'Change what you need. *Unsaved changes* appears in the header until you save.',
        'Press **Save**. You return to the list with *User “…” saved.*',
      ],
      after: [
        '**Passwords are not edited on this form.** Press **Reset password** (in the header, or beside the masked password) to open a drawer with **New password** and **Confirm password** — the same rules apply — then **Update password**.',
        '**Suspend rather than delete:** untick **Active**. An inactive account cannot sign in, and everything about it is kept.',
        '**Two-factor:** ticking **Require two-factor authentication** makes the user set up an authenticator app at sign-in. Unticking it removes their authenticator and backup codes when you save. If they lost their phone, use **Turn off** in the **Two-Factor Authentication** card instead — it asks *Turn off two-factor authentication?* and they set it up again at their next sign-in.',
      ],
      shot: 'form-edit.png',
    },
    {
      title: 'Change which organizations a user is in',
      steps: [
        'Open the user and press **Manage memberships** in the **Organizations** card. Save any pending changes first — the button stays greyed out while the form has unsaved changes.',
        'For an organization they are already in, use **Make admin** / **Make member** to change their role, or **Remove**.',
        'To add one, choose it under **Add to an organization**, pick **Member** or **Administrator**, and press **Add**.',
        'Press **Done**.',
      ],
      after: [
        'Only superusers can change memberships; everyone else sees *Only superusers can change organization membership*. An organization the user **owns** cannot be left or demoted from here — name a different owner on the organization page first. **Inactive** organizations are greyed out, because the server ignores membership changes for them.',
      ],
      shot: 'memberships.png',
    },
    {
      title: 'Delete a user',
      steps: [
        'From the list: open the row’s menu, choose **Delete**, and confirm the *Delete …?* dialog that names the user.',
        'From the user’s own page: press **Delete**, type the username when asked, and press **Delete user**.',
        'Several at once: tick their rows, then **Delete** on the bar that appears above the table.',
      ],
      after: [
        'Deleting removes the account, its organization memberships and its sessions. **An organization owner cannot be deleted** — name a different owner first. A superuser can bring a deleted user back with **Recover deleted** on the list.',
      ],
    },
  ],
  forms: [
    {
      title: 'the user form',
      source: 'pages/UserForm.jsx',
      opens: '**Add user** on the list opens it empty; clicking a user opens it filled in. Some rows exist only on one of the two, as marked.',
      passwordRules: true,
      fields: {
        Username: { example: 'priya.shah', what: 'What they type to sign in. Must be unique.', checks: ['A user with that username already exists.'] },
        Email: { example: 'priya.shah@example.com', what: 'Must be unique across all users, ignoring upper and lower case.', checks: ['User with this Email address already exists.'] },
        Password: { when: 'Only when adding', what: 'See *Password rules* below.' },
        Confirm: { when: 'Only when adding', what: 'Type the password again.', errorHints: ['Passwords do not match.'] },
        'Email › Mark email as verified': { when: 'Only when adding', starts: 'Off' },
        'Password#2': { when: 'Only when editing', what: 'Shown masked. Press **Reset password** beside it to set a new one — see *Change a user*.' },
        'Phone number': { what: 'Optional. A full number with its country code; no two users may share one.' },
        'Birth date': { what: 'Optional. Picked from the calendar.' },
        Company: { when: 'Only when editing', what: 'Up to 30 characters.', example: 'Acme Retail' },
        Location: { when: 'Only when editing', example: 'Mumbai' },
        URL: { when: 'Only when editing', what: 'A full address including `https://`.', example: 'https://acme.example' },
        Bio: { when: 'Only when editing' },
        Flags: {
          requiredWhen: 'When adding',
          what: 'When adding, tick **Staff status** or **Superuser status**: an account with neither can sign in but reach nothing, so the form will not create one.',
        },
        'Flags › Active': { starts: 'On (locked on while adding)' },
        'Flags › Staff status': { starts: 'Off', what: 'The usual role for people who operate the controller; what they may do comes from their permission groups.' },
        'Flags › Superuser status': { starts: 'Off', what: 'Everything, everywhere — keep it for the few people who administer the controller itself.' },
        'Flags › Require two-factor authentication': { starts: 'Off' },
        'Permission Groups': { what: 'Groups are defined under **Administration › Permission Groups**.', drop: ['No permission groups defined.'] },
        'Add to': { when: 'Only when adding', starts: '— none —', what: 'Places the new user in one organization straight away. More can be added afterwards with **Manage memberships**.' },
        'Add to › Organization administrator': { starts: 'Off' },
        Notes: { when: 'Only when editing' },
      },
    },
  ],
  verify: [
    'The user is in the list with the **Role**, **Active** and **2FA required** you set; filter by role or status to find them quickly.',
    'Ask them to sign in. With **Require two-factor authentication** on, they are asked to set up an authenticator app first.',
    'The **Organizations** card on their page lists each organization with *Member* or *Administrator*.',
  ],
  trouble: [
    ['**Create user** stays grey', 'Something required is missing or a password rule is broken.', 'Read the message printed beside the button — it names the problem.'],
    ['Red bar: *email: User with this Email address already exists.*', 'Another account already uses that address (the check ignores case).', 'Use a different address, or edit the existing account instead.'],
    ['Red bar: *username: A user with that username already exists.*', 'The username is taken.', 'Choose another.'],
    ['Red bar mentioning *phone_number*', 'The number is not a valid international number, or another user has it.', 'Enter it with its country code, e.g. `+91 98765 43210`, or leave it empty.'],
    ['The user signs in and sees almost nothing', 'They have no permission groups, or are in no organization.', 'Tick permission groups on their account and add them to an organization.'],
    ['*Delete failed … An organization owner cannot be deleted.*', 'They own an organization.', 'Open that organization, pick another **Owner**, save, then delete the user.'],
    ['**Manage memberships** is greyed out', 'The form has unsaved changes.', 'Press **Save** first.'],
    ['A membership row’s buttons are greyed out', 'The user owns that organization, or it is inactive.', 'Change the owner, or reactivate the organization, first.'],
    ['Resetting the password changes nothing about how they sign in', 'The account comes from TACACS+ or LDAP — its **Source** says so in the Details card.', 'Change the password in that system instead.'],
    ['A user was deleted by mistake', '—', 'A superuser can press **Recover deleted** on the list and restore it.'],
  ],
  shotDir: 'users',
  shots: [
    { file: 'list.png', what: 'The Users list with a few accounts, showing the Role, Active and 2FA columns.', alt: 'The Users list' },
    { file: 'form-new.png', what: 'The **Add user** form part-filled, with the password checklist showing some rules ticked and the reason beside the greyed **Create user** button.', alt: 'Adding a user' },
    { file: 'form-edit.png', what: 'An existing user, with the Details, Two-Factor Authentication and Organizations cards on the right.', alt: 'Editing a user' },
    { file: 'memberships.png', what: 'The **Manage memberships** drawer, signed in as a superuser, with one organization listed and the add row below.', alt: 'Organization memberships' },
  ],
};

// ------------------------------------------------------------ Organizations

const ORGS: AdminNotes = {
  from: ['pages/OrgList.jsx', 'pages/OrgForm.jsx', 'components/OrgMembersDrawer.jsx', 'components/JsonModal.jsx'],
  title: 'Working with organizations',
  intro: [
    'An organization is a tenant: its devices, templates, VPN servers, certificate authorities and certificates, subnets, device groups and RADIUS data all belong to it. Its **Device registration** settings decide how a new router joins it.',
  ],
  before: [
    'Adding, changing and deleting each need their own permission; without one, its button is not shown.',
    'Members can be added only once the organization exists — the **Members** card appears after the first save.',
    'Adding or removing members is **superuser-only**.',
  ],
  tasks: [
    {
      title: 'Add an organization',
      steps: [
        'Open **Administration › Users & Organizations › Organizations** and press **Add organization**.',
        'Type the **Name**. The **Slug** fills itself in from it — edit the slug only if you want a different one.',
        'Optionally add a **Description**, a contact **Email** and a **URL**.',
        'Under **Device registration**, leave **Registration enabled** on so routers can join by themselves. Tick **Require serial admission** if only pre-approved serial numbers may join.',
        'Leave **Shared secret** empty — one is generated when you save. Set a **Device limit**, or leave `0` for no limit.',
        'Press **Save**. You land on the new organization’s page, where the **Members** card now appears.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Add members and name the owner',
      steps: [
        'On the organization’s page, press **Manage members**.',
        'Search for the person by name or email, choose **Member** or **Administrator**, and add them. Administrators can manage this organization’s devices and members.',
        'Close the drawer. Choose the **Owner** from the members, and press **Save**.',
      ],
      after: [
        'The owner cannot be removed from the organization; to remove them, name a different owner first. While the organization is **inactive**, the drawer refuses all member changes — the server would accept them and do nothing.',
      ],
      shot: 'members.png',
    },
    {
      title: 'Change or deactivate an organization',
      steps: [
        'Click it in the list, or **Edit** from the row’s menu.',
        'Change what you need, and press **Save**.',
      ],
      after: [
        'Untick **Is active** to suspend it: its devices stop being served configuration and are left out of monitoring until you reactivate it. A warning card says so while it is inactive.',
        'Changing the **Slug** breaks existing links to the organization.',
      ],
    },
    {
      title: 'Delete an organization',
      steps: [
        'From the list: the row’s menu › **Delete**, then confirm. Or tick several rows and use **Delete** on the bar above the table.',
        'From its own page: **Delete**, type the slug when asked, and press **Delete organization**.',
      ],
      after: [
        '**This destroys everything the organization owns** — its devices and their configuration, templates, VPN servers, CAs and certificates, subnets and IP addresses, device groups, locations, RADIUS data, notification settings and credentials. The user accounts themselves are kept; only their memberships go. It fails while any backup record still refers to the organization.',
      ],
    },
  ],
  forms: [
    {
      title: 'the organization form',
      source: 'pages/OrgForm.jsx',
      fields: {
        Name: { example: 'Acme Retail' },
        Slug: { example: 'acme-retail', drop: ['Changing it breaks existing links to this organization.'], what: 'Lowercase identifier used in URLs. Converted as you type: lowercase letters, digits and hyphens; anything else becomes a hyphen. Must be unique. Changing it on an existing organization breaks existing links to it.', checks: ['organization with this slug already exists.'] },
        'Status › Is active': { starts: 'On' },
        Email: { example: 'netops@acme.example', what: 'Must be a valid email address.' },
        URL: { example: 'https://acme.example', what: 'A full address including `https://`.' },
        'Registration › Registration enabled': { starts: 'On' },
        'Registration › Require serial admission': { starts: 'Off', what: 'Then list the permitted serials under **Allowed Serial Numbers**.' },
        'Shared secret': { what: 'Leave empty when adding — a random one is generated on save. When editing, leaving it as it is keeps the current secret. The eye button reveals it; the copy button copies it. Up to 32 characters, and no two organizations may share one.' },
        'Device limit': { starts: '0', example: '50' },
        Context: { what: 'Organization-wide template variables, as a JSON object — opened with the **JSON** button in the header.', example: '{"ntp_server": "pool.ntp.org"}', checks: ['Invalid JSON — fix it in the JSON editor before saving.'] },
        Owner: { when: 'Only when editing', starts: '— no owner —' },
      },
    },
  ],
  verify: [
    'The organization appears in the list as **Active**, with its **Devices**, **Online** and **Offline** counts.',
    'Its page shows the generated **Shared secret** — copy it to the router, as in *Setting up a site*.',
    'Members are listed in the **Members** card with their role, and the owner marked *Owner*.',
  ],
  trouble: [
    ['**Save** is greyed out', 'Name or slug is empty, or the context JSON is invalid.', 'Fill them in; fix the JSON in the **JSON** editor.'],
    ['*organization with this slug already exists.*', 'Another organization uses that slug.', 'Choose a different slug.'],
    ['Routers cannot register', 'Registration is off, the secret on the router is wrong, the organization is inactive, or its device limit is reached.', 'Check all four on this page — the device-limit hint says *limit reached* when it is.'],
    ['A new router joins and is deactivated straight away', '**Require serial admission** is on and its serial is not listed.', 'Add the serial under **Allowed Serial Numbers**.'],
    ['**Manage members** is greyed out', 'The form has unsaved changes.', 'Press **Save** first.'],
    ['*Delete failed … A protected record may still reference this organization.*', 'A backup record still refers to it.', 'Remove that reference first, then delete.'],
  ],
  shotDir: 'organizations',
  shots: [
    { file: 'list.png', what: 'The Organizations list with the Active, Devices, Online and Offline columns.', alt: 'The Organizations list' },
    { file: 'form-new.png', what: 'The **Add organization** form with the Device registration section showing.', alt: 'Adding an organization' },
    { file: 'members.png', what: 'The **Manage members** drawer for an active organization, with the search results showing.', alt: 'Organization members' },
  ],
};

// --------------------------------------------------- Allowed Serial Numbers

const SERIALS: AdminNotes = {
  from: [
    'pages/AllowedSerialList.jsx',
    'features/serials/AllowedSerialDrawer.jsx',
    'features/serials/SerialCsvDrawer.jsx',
    'serial_admission/csv_import.py',
    'serial_admission/signals.py',
    'serial_admission/api/serializers.py',
  ],
  title: 'Working with allowed serial numbers',
  intro: [
    'The allowlist matters only to an organization with **Require serial admission** switched on (on the organization’s page). For such an organization, the first telemetry a new router sends decides its fate:',
    '- serial listed with **Admit automatically** on → it **joins**;\n- serial listed with it off → it **waits, pending**, until an admin admits it from the Devices list in the Django admin;\n- serial **not listed** → it is **deactivated**, not left waiting.',
  ],
  before: [
    'Switch on **Require serial admission** for the organization, or nothing here has any effect.',
    'Have the serial exactly as the router reports it — the match is case-sensitive.',
    'You can only allow serials for organizations you manage.',
  ],
  tasks: [
    {
      title: 'Allow one serial number',
      steps: [
        'Open **Administration › Users & Organizations › Allowed Serial Numbers** and press **Add serial number**.',
        'Enter the **Serial number** and choose the **Organization**.',
        'Leave **Admit automatically** on to let the router join as soon as it reports in, or turn it off to review it first.',
        'Optionally add **Notes** — the site, the shipment, who asked for it.',
        'Press **Add serial number**.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Allow many from a CSV',
      steps: [
        'Press **Upload CSV**. Download the **Blank template** if you need the format.',
        'Fill one row per router: `serial_number`, `organization_slug_or_name`, `auto_admit`, and optionally `notes`.',
        'Choose the file and press **Upload**. The result reads *N created, N updated, N rejected*, with the reason for each rejected row.',
      ],
      after: [
        '`auto_admit` counts as on only for `true`, `1`, `yes`, `y` or `t` (any case). Anything else — including an empty cell — means manual admission.',
        'A serial already listed for that organization is **updated**, not duplicated, so re-uploading a corrected file is safe.',
      ],
      shot: 'csv.png',
    },
    {
      title: 'Change or remove one',
      steps: [
        'Click the serial, or **Edit** from its row’s menu; change **Admit automatically** or **Notes**, and press **Save changes**.',
        'To remove: the row’s menu › **Remove**, or tick several rows and use **Delete** on the bar above the table.',
      ],
      after: [
        'The **Organization** cannot be changed after creation — remove the serial and add it again under the other organization.',
        'Removing a serial does not affect a router that has already been admitted. A router reporting that serial for the first time afterwards is deactivated instead of joining.',
      ],
    },
  ],
  forms: [
    {
      title: 'the serial number drawer',
      source: 'features/serials/AllowedSerialDrawer.jsx',
      fields: {
        'Serial number': { what: 'Up to 64 characters.', checks: ['The fields serial_number, organization must make a unique set.'] },
        Organization: { checks: ['You do not manage this organization.'] },
        'Admit automatically': { starts: 'On', drop: ['The device joins as soon as the controller sees this serial in its telemetry.', 'The device waits, pending, until an admin admits it from the Devices list in the Django admin.'], what: '**On:** the device joins as soon as the controller sees this serial in its telemetry. **Off:** it waits, pending, until an admin admits it from the Devices list in the Django admin.' },
      },
    },
    {
      title: 'the CSV upload',
      source: 'features/serials/SerialCsvDrawer.jsx',
      fields: {
        Template: { what: 'Download it with **Blank template**, fill it in, and upload it as the CSV file.' },
        'CSV file': {
          example: 'IRX1500101210106,acme-retail,true,Mumbai HQ',
          checks: [
            'CSV is missing required columns: […]',
            'row N: serial_number and organization_slug_or_name are required',
            "row N: organization '…' not found",
            "row N: you do not manage organization '…'",
            'Could not decode CSV as UTF-8: …',
          ],
          what: 'A header row is required; `serial_number`, `organization_slug_or_name` and `auto_admit` must all be present as columns. The organization can be given by its slug or its name.',
        },
      },
    },
  ],
  verify: [
    'The serial is in the list with *joins automatically* or *waits for an admin* under it, and the right organization.',
    'Power the router on: with auto-admit it appears in **Devices** and starts receiving configuration; without it, it appears pending.',
  ],
  trouble: [
    ['A listed router was still deactivated', 'The serial differs from what the router reports — case included — or it was listed under another organization.', 'Compare with the serial in the router’s telemetry and fix the entry.'],
    ['A router stays pending', '**Admit automatically** is off for its serial.', 'Admit it from the Devices list in the Django admin, or turn the toggle on before it reports in.'],
    ['Nothing here seems to have any effect', 'The organization does not have **Require serial admission** on.', 'Turn it on in the organization’s page.'],
    ['*The fields serial_number, organization must make a unique set.*', 'That serial is already allowed for that organization.', 'Edit the existing entry.'],
    ['CSV rows rejected with *not found*', 'The organization column matches neither a slug nor a name.', 'Use the slug shown on the organization’s page.'],
  ],
  shotDir: 'allowed-serials',
  shots: [
    { file: 'list.png', what: 'The Allowed serial numbers list with both auto-admit and manual entries.', alt: 'Allowed serial numbers' },
    { file: 'form-new.png', what: 'The **Allow a serial number** drawer with the Admit automatically toggle visible.', alt: 'Allowing a serial number' },
    { file: 'csv.png', what: 'The **Upload CSV** drawer, showing the column list and the **Blank template** button.', alt: 'Uploading serial numbers from a CSV' },
  ],
};

// ------------------------------------------------------- Permission Groups

const GROUPS: AdminNotes = {
  from: ['pages/GroupList.jsx', 'pages/GroupForm.jsx', 'components/PermissionPicker.jsx'],
  title: 'Working with permission groups',
  intro: [
    'A permission group is a named bundle of permissions — a role such as *Administrator*, *Operator* or *View only*. You give a person permissions by ticking groups on their user account; per-user permissions are not edited anywhere in the console. Change a group and everyone in it changes with it.',
    'The list shows each group with how many permissions it holds. **Search groups…** finds one by name; the **Any group** filter narrows to groups that **Have permissions** or have **No permissions**; **Columns** hides or shows the Permissions column; the refresh button reloads. **Recover deleted** appears for superusers only. Each row’s **⋮** menu holds **Edit** and **Delete**.',
  ],
  before: [
    'You need the add, change or delete permission on groups for the matching button to appear.',
    'The grid of permissions is loaded from the controller’s permission catalogue, which is itself gated by the **View** permission on **Auth › permission** — superusers always have it; anyone else editing groups needs it too.',
    'Decide what the role should be able to do before you start ticking: the grid lists every permission the controller has — well over a thousand — grouped into areas.',
  ],
  tasks: [
    {
      title: 'Create a group',
      steps: [
        'Open **Administration › Permission Groups** and press **Add group**. The **New permission group** page opens.',
        'Under **Identity**, type a **Name** people will recognise — for example `Network operators` or `Read-only`.',
        'Under **Permissions**, tick what the role may do. The counter on the right of the section header (*0 of N selected*) updates as you go. See *Using the permission picker* below for the quick ways to tick many at once.',
        'For a view-only role, just press **Read-only** — it selects every **View** permission in one go.',
        'Press **Create group**. You return to the list with *Group “…” created.*',
        'Assign it: open each person under **Users & Organizations › Users** and tick the group under **Permission Groups**, then **Save**.',
      ],
      shot: 'form.png',
    },
    {
      title: 'Change a group',
      steps: [
        'Click the group’s name in the list, or **⋮ › Edit**.',
        'Rename it or change the ticks. *Unsaved changes* shows in the header until you save. Tick **Selected only** first to see just what the group already has.',
        'Press **Save**. Every user in the group gets the new permissions.',
      ],
    },
    {
      title: 'Delete a group',
      steps: [
        'From the list: **⋮ › Delete** and confirm the *Delete …?* dialog — or tick several rows and use **Delete** on the bar that appears above the table.',
        'From the group’s own page: **Delete**, type the group name exactly when asked, and press **Delete group**.',
      ],
      after: [
        'Users in a deleted group lose what it granted; their accounts are kept. A superuser can bring the group back with **Recover deleted** on the list.',
      ],
    },
  ],
  forms: [
    {
      title: 'the permission group form',
      source: 'pages/GroupForm.jsx',
      fields: {
        Name: { example: 'Network operators', what: 'Must be unique — the save is refused if another group already has the name.' },
        Permissions: {
          extra: true,
          required: '—',
          starts: 'Nothing ticked',
          example: 'View on every area (press **Read-only**)',
          what: 'The grid described below. A group may be saved with no permissions at all — it then grants nothing, and the list filter **No permissions** finds it.',
        },
      },
    },
  ],
  sections: [
    {
      title: 'Using the permission picker',
      body: [
        '- **Areas.** Permissions are grouped by area (*Accesslog*, *Account*, *Config*, *Connection*, …). Each area row shows how many of its permissions are ticked, e.g. *0/8*; click the area name to open it and see its record types one per row.\n- **Columns.** Every row has four boxes: **View**, **Add**, **Change**, **Delete**. Tick a box on a record-type row for that one permission; tick a box on an **area** row for that action on every record type in the area; tick a box in the **header** for that action on everything shown.\n- **Greyed boxes and dashes.** A greyed box on an area row, or a **—** on a record-type row, means that action does not exist there — a log can be viewed but not added, changed or deleted.\n- **Half-ticked boxes** mean some, not all, of what they cover is selected.\n- **Other permissions.** Capabilities that are not view/add/change/delete (rollback, compute, proxy and the like) are listed inside their area one by one, with their internal name beside them.\n- **Selected only** shows just what is ticked — the quickest way to review a group. **Filter permissions…** narrows the grid by area, record type or name; areas open automatically while you filter.\n- **Read-only** *replaces* the whole selection with every View permission. **Clear all** unticks everything.\n- Some internal areas (sessions, admin log, tokens and similar) are never shown and never saved with a group, and the stock *auth › group* permission is hidden in favour of the one the console actually enforces.',
      ],
    },
    {
      title: 'Suggested starting points',
      body: [
        '- **View only** — press **Read-only**, then **Create group**. Members can open pages; Add, Edit and Delete buttons that check permissions are hidden from them.\n- **Operator** — start from **Read-only**, then tick **Add** and **Change** on the areas they work in day to day (for example the device and configuration areas), leaving **Delete** off.\n- **Administrator** — tick the header boxes for all four columns, then untick what even administrators should not touch. People who need literally everything are better made **Superuser** on their user account instead.',
      ],
    },
  ],
  verify: [
    'The list shows the group with its permission count; the **Has permissions** / **No permissions** filter finds it.',
    'Open a member’s account: the group is ticked under **Permission Groups**.',
    'Sign in as a member (or ask one to): pages and buttons their permissions do not cover are not shown to them.',
  ],
  trouble: [
    ['**Create group** is greyed out', 'The name is empty.', 'Type a name.'],
    ['Red bar mentioning *name* after saving', 'Another group already has that name.', 'Choose a different name.'],
    ['The permission grid stays empty', 'Your account lacks **View** on **Auth › permission**.', 'Ask a superuser to add it to one of your groups.'],
    ['A user in the group still cannot see a page or button', 'The group lacks that permission — each page and button checks its own.', 'Open the group with **Selected only** ticked and add the missing permission.'],
    ['**Read-only** removed permissions I had ticked', 'It replaces the selection rather than adding to it.', 'Press **Read-only** first, then tick the extra permissions.'],
    ['A group was deleted by mistake', '—', 'A superuser can press **Recover deleted** on the list.'],
  ],
  shotDir: 'permission-groups',
  shots: [
    { file: 'list.png', what: 'The Permission Groups list — search, the Any group filter, Columns, Recover deleted and Add group along the top; each group with its permission count and ⋮ menu.', alt: 'The Permission Groups list' },
    { file: 'form.png', what: 'The **New permission group** page: the Name field, then the permission grid with its View / Add / Change / Delete columns, the *0 of N selected* counter, **Selected only**, the filter, **Read-only** and **Clear all**.', alt: 'Creating a permission group' },
  ],
};

// ----------------------------------------------------------- Device Groups

const DEVICE_GROUP_FORM: AdminForm = {
  title: 'the device group drawer',
  source: 'features/devicegroups/DeviceGroupDrawer.jsx',
  fields: {
    Name: { example: 'Branch routers', what: 'Up to 60 characters; unique within its organization.', checks: ['The fields organization, name must make a unique set.'] },
    Organization: { what: 'Changing it clears the template ticks, and clears the parent unless it belongs to the new organization too.' },
    'Parent group': {
      starts: 'None — top level',
      example: 'Pune — West',
      what: 'The choices are the **other** groups in the chosen organization — a group is never offered as its own parent, so the only bad choice left is a deeper loop, and that one the server rejects.',
      checks: ['Parent must belong to the same organization.', 'Circular parent relationship is not allowed.', 'Group cannot be parent of itself.'],
    },
    Description: {
      example: 'Branch routers behind the Swargate uplink',
      what: 'Free text, no length limit, shown only on this drawer — the list has no Description column. Worth filling in anyway: it is the one place to record why the group exists.',
    },
    Templates: {
      extra: true,
      required: '—',
      what: [
        'A filterable checkbox list, one row per template, with a **shared** badge on the ones that belong to no organization. The count under it reads *N selected*.',
        'Assigned automatically to every device in the group; moving a device to another group swaps them for the new group’s.',
        'Before an organization is chosen the list reads *Pick an organization first — templates are scoped to one.* After one is chosen it shows that organization’s templates plus the shared ones, or *No templates available for this organization.*',
        '**Do not tick a default or required template.** The section’s own heading says they are excluded, but they are not — the drawer filters by organization only, so they are listed, and the save is refused because they already apply to every device. Trust this page over that sentence.',
      ].join(' '),
      checks: ['templates: Invalid pk "…" - object does not exist.'],
    },
    'Configuration variables': {
      extra: true,
      required: '—',
      example: 'snmp_community = branch-ro',
      what: 'Key / value rows passed to the group’s devices as template variables, added with **Add variable** and removed row by row — removing the last one leaves an empty row rather than none. Rows with an empty key are dropped on save, so a half-filled row is not an error. Changing them makes the group’s devices pick up new configuration.',
      checks: ['Variable names must be unique.'],
    },
  },
};

const DEVICE_GROUPS: AdminNotes = {
  from: ['pages/DeviceGroupList.jsx', 'pages/DeviceGroupTree.jsx', 'features/devicegroups/DeviceGroupDrawer.jsx', 'nexapp_controller/config/base/device_group.py', 'nexapp_controller/config/api/serializers.py'],
  title: 'Working with device groups',
  intro: [
    'A device group collects routers of one organization so they can share **templates**, **configuration variables** and a TACACS+ secret. Groups can nest: a **Parent group** builds the hierarchy that the scope picker and the **Hierarchy** page show.',
  ],
  before: [
    'Create the templates the group should apply first (**Network › Configuration › Templates**).',
    'For a nested group, create the parent first.',
  ],
  tasks: [
    {
      title: 'Create a group',
      steps: [
        'Open **Administration › Device Groups** and press **Add device group** — or, on the **Group tree**, press **+** on a group to add a sub-group under it (organization and parent are filled in for you).',
        'Fill **Name** and **Organization**; pick a **Parent group** if it nests under another.',
        'Tick the **Templates** every device in the group should get. Use the filter box for long lists.',
        'Add **Configuration variables** with **Add variable**, one key and value per row.',
        'Press **Create group**. Pressing it with something missing marks the missing fields.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a group',
      steps: [
        'Click the group’s name in the list, or choose **Edit** from the row’s **⋮** menu — both open the same drawer, now headed with the group’s name and ending in **Save group**.',
        'Changing **Organization** clears the ticked templates and drops the parent unless it belongs to the new organization too. That is deliberate, not a glitch: neither would be valid in the new organization.',
        'Press **Save group**. Changing the templates or the variables changes the configuration of every device in the group.',
      ],
    },
    {
      title: 'Delete a group',
      steps: [
        'One group: its **⋮** menu › **Delete**, or the delete icon on the **Group tree**. The dialog names the group — *Delete Swargate?* — and says *Devices in it are not deleted, but they lose the group’s templates and its TACACS+ secret. Child groups are removed with it.*',
        'Several at once: tick their checkboxes and use the bar that appears above the table. That dialog counts them instead — *Delete 3 device groups?* — and says *Devices in them are not deleted, but they lose those groups’ templates and TACACS+ secrets. Child groups go too.*',
        'Confirm. A toast reports it: *Deleted Swargate.*',
      ],
      after: [
        'Deleting a group **also deletes every group below it** — read the **Parent** column before confirming, because the dialog names only the group you picked.',
        'A bulk delete is attempted group by group, so a partial failure is possible: *N of M could not be deleted.* appears above the table and the ones that worked are gone. Clear the filters and look at what is left rather than assuming none of it happened.',
      ],
    },
    {
      title: 'See the whole tree',
      steps: [
        'Press **Group tree** on the list.',
        'Click a group to edit it; **+** adds one below it, and **+** on an organization adds a top-level group there.',
        'Drag to pan, scroll to zoom. **Expand all** / **Collapse all** open or close every branch; the zoom buttons and **Fit** frame the tree.',
      ],
      shot: 'tree.png',
    },
  ],
  forms: [DEVICE_GROUP_FORM],
  sections: [
    {
      title: 'What the list shows',
      body: [
        'One row per group. **Name** carries the group icon and opens the drawer; **Organization** and **Parent** name them, with *top level* where there is no parent; **Templates** and **Variables** are **counts**, shown as a blue badge or the word *none*. **Created** and **Modified** complete the seven. Everything but **Name** can be switched off under **Columns**, and that choice is remembered in your browser rather than on your account.',
        'Reading the two count columns before a delete is the point of them: they are what the group passes down, and what its devices lose.',
        'Along the top: **Search device groups…** matches the name as you type. **All organizations** narrows by owner, and is locked when the scope picker at the top of the console has already fixed one. **Any group** is the one filter whose label does not say what it does — it filters by *whether the group holds devices*, offering **Has devices** and **Empty**. Then **Columns**, **Group tree**, a refresh button, and **Add device group**.',
        'The card’s subtitle counts what you are looking at — *3 groups*, with *· filtered* appended once any filter or search is on. Changing a filter returns you to page 1.',
      ],
    },
    {
      title: 'What you are allowed to do',
      body: [
        'Opening the page needs any permission on `config.devicegroup`. Each button is gated separately and is simply absent without it: **Add device group** needs `config.add_devicegroup`, the row’s **Delete** and the bulk bar need `config.delete_devicegroup`, and **Edit** needs `config.change_devicegroup`. A missing button means a missing permission, not a missing feature.',
      ],
    },
  ],
  verify: [
    'The list shows the group with its **Parent**, **Templates** and **Variables** counts; the **Group tree** shows it in place.',
    'Open a device in the group: its configuration includes the group’s templates.',
  ],
  trouble: [
    ['*templates: Invalid pk "…" - object does not exist.*', 'A default or required template is ticked. The drawer’s Templates heading claims they are excluded, but it filters by organization only, so they are offered — and the server refuses them because they already apply to every device.', 'Untick it and save again.'],
    ['*The fields organization, name must make a unique set.*', 'The organization already has a group with that name. Two organizations may each have a *Branch routers*; one organization may not have two.', 'Choose another name.'],
    ['**Parent group** is greyed out', 'No organization is chosen.', 'Pick the organization first; only its groups are offered as parents.'],
    ['The parent and the ticked templates cleared themselves', 'You changed **Organization**. Neither would have been valid in the new one, so the drawer drops both rather than let the save fail.', 'Pick the parent and the templates again, from the new organization’s.'],
    ['*Variable names must be unique.*', 'Two variable rows have the same key.', 'Rename or remove one.'],
    ['A template you expected is not in the list', 'Either it belongs to another organization — only the chosen organization’s and the shared ones are offered — or the organization has more than 500 templates, which is where the drawer stops asking for them.', 'Check the template’s organization under **Network › Configuration › Templates**. Past 500 there is nothing to do from this page.'],
    ['*N of M could not be deleted.*', 'A bulk delete runs group by group and reports the total; some succeeded.', 'Clear the filters and look at what remains before retrying — repeating the whole selection is not safe to assume.'],
  ],
  shotDir: 'device-groups',
  shots: [
    // No `*…*` inside a caption: the renderer wraps `what` in one pair of
    // asterisks, so a nested emphasis closes it early and the rest goes plain.
    { file: 'list.png', what: 'Three top-level groups in one organization. **Parent** reads “top level” on each, and **Templates** and **Variables** both read “none” — these groups pass nothing down yet.', alt: 'The Device groups list' },
    { file: 'form-new.png', what: 'The drawer as it opens. **Parent group** is greyed out, hinting “Pick an organization first — parents are scoped to one”, because no **Organization** has been chosen; the **Templates** list below it says the same.', alt: 'The Add device group drawer' },
    { file: 'tree.png', what: 'One organization with three groups, all of them top level, so the tree is a single rank. Each card reads **No templates** — these groups pass nothing down — and carries the three footer buttons: add below, edit, delete.', alt: 'The device group tree' },
  ],
};

const DEVICE_GROUP_TREE: AdminNotes = {
  ...DEVICE_GROUPS,
  title: 'Working on the tree',
  intro: [
    'The same device groups as the list, drawn as one tree per organization. Everything is done in the same drawer as on the list; the tree only adds where a group sits.',
  ],
  // Not the list's tasks filtered down: those name a row menu and a bulk bar
  // that do not exist on a canvas. The drawer behind them is the same one, so
  // the field table below still applies — only the way in differs.
  tasks: [
    {
      title: 'Add a group where it belongs',
      steps: [
        'Press **+** on the group it should sit under. The drawer opens with **Organization** and **Parent group** already filled in from that node, which is the reason to add from here rather than from the list.',
        'Press **+** on an **organization** instead for a group with no parent.',
        'Fill in the rest as on the list — see the field table below — and press **Create group**.',
      ],
      after: [
        'The node appears under its parent, and the branch is drawn as soon as the tree reloads.',
      ],
    },
    {
      title: 'Change or delete a node',
      steps: [
        'Click a card, or the pencil in its footer, to open the same drawer the list uses. **Save group** closes it.',
        'The red bin deletes that group, behind the same dialog as the list — *Delete Swargate?*, warning that the groups below it go too. On a tree that warning is easier to act on: the branch under the node is exactly what you are about to lose.',
      ],
      shot: 'tree.png',
    },
  ],
  // The list's two sections describe a table this page does not have. Spread
  // first, then replace — inheriting them put "What the list shows" on a canvas.
  sections: [
    {
      title: 'What a node shows',
      body: [
        'Each organization is a trunk; the groups with no parent hang directly off it, and the rest nest under their parent. A group’s card carries its name and, underneath, what it passes down — *3 templates · 2 variables*, or *No templates*. The number of sub-groups is not written anywhere: the branches drawn below the card are the count.',
        'Three buttons sit in the card’s footer: **+** adds a sub-group under it, the pencil opens the same drawer as the list, and the red bin deletes it — with the same dialog, and the same warning that the groups below go too. **+** on an organization adds a top-level group there instead.',
        'The badge in the corner counts the whole canvas — *N groups · M organizations* — and **Device groups** takes you back to the table.',
      ],
    },
    {
      title: 'Finding your way around a large tree',
      body: [
        'Drag the canvas to pan and scroll to zoom; the percentage button resets to 100%, and **Fit** frames the whole tree. **Expand all** and **Collapse all** open and close every branch at once, and a single node’s arrow toggles just that branch.',
        'None of this is saved. Reopening the page gives you the default view again.',
      ],
    },
  ],
  verify: [
    'The node appears under the parent you added it from, with its template and variable counts in the card’s footer.',
    'Press **Fit**: a group that looks missing is usually just off-canvas.',
  ],
  // The bulk-delete row describes a bar this page has no equivalent of.
  trouble: DEVICE_GROUPS.trouble.filter(([seen]) => !seen.startsWith('*N of M')),
  shots: [{ file: 'tree.png', what: 'One organization with three groups, all of them top level, so the tree is a single rank. Each card reads **No templates** — these groups pass nothing down — and carries the three footer buttons: add below, edit, delete.', alt: 'The device group tree' }],
};

// --------------------------------------------------------------- Hierarchy

const HIERARCHY: AdminNotes = {
  from: ['pages/Hierarchy.jsx'],
  title: 'Using the hierarchy',
  intro: [
    'A read-only map: each organization, the device groups nested under it, and how many devices sit in each branch. Devices that are in no group are shown under **No group**. Nothing is edited here.',
  ],
  before: [],
  tasks: [
    {
      title: 'Go to a branch’s devices',
      steps: [
        'Open **Administration › Hierarchy**.',
        'Click an organization or a group. The console scopes itself to it and opens **Devices**, already filtered to that branch.',
        'Use **Expand all** / **Collapse all**, the zoom buttons and **Fit** to find your way around a large tree; drag to pan, scroll to zoom.',
      ],
      shot: 'tree.png',
    },
    {
      title: 'Change the hierarchy',
      steps: [
        'Open **Administration › Device Groups** and edit the group: its **Parent group** decides where it sits. The **Group tree** there is the editable version of this view.',
      ],
    },
  ],
  forms: [],
  verify: ['After changing a group’s parent, reload this page — the group appears under its new parent.'],
  trouble: [
    ['*Could not load the hierarchy*', 'The organization or group list failed to load.', 'Press **Retry**.'],
    ['*Device counts are unavailable right now*', 'Only the counts failed; the tree itself is still accurate.', 'Reload the page later for the counts.'],
    ['*No organizations yet*', 'No organization is visible to you.', 'Create an organization, then add device groups to it.'],
  ],
  shotDir: 'hierarchy',
  shots: [{ file: 'tree.png', what: 'The hierarchy with one organization fully open, device counts visible.', alt: 'The hierarchy' }],
};

// ---------------------------------------------------- License & Subscription

const LICENSE: AdminNotes = {
  from: ['pages/LicenseSubscription.jsx'],
  title: 'Reading this page',
  intro: [
    'Read-only. Nothing here is edited in the console; it reports the controller’s software and each organization’s entitlement.',
  ],
  before: [],
  tasks: [],
  forms: [],
  sections: [
    {
      title: 'What each card tells you',
      body: [
        '- **Controller software** — the build running now (**Installed**), the newest **Latest stable**, any newer **Beta channel** build (pre-release, not covered by the support SLA) and the **Next scheduled** release. **Notes** opens a release’s notes. The refresh button checks for updates.\n- **Subscription** — the license recorded for an organization: the **License key** (masked; the eye shows it), **Category**, **Support tier**, **Licensed to**, **Issued on** and **Valid till**. *Expiring soon* appears in the last 30 days, *Expired* after. *Placeholder — no license row exists yet* means none was ever recorded.\n- **Device entitlements** — per organization: its **Device limit** (*Unlimited* when it is 0), how many **Devices** and **Users** it has, and a **Usage** bar.',
        '**Only one organization’s subscription is shown** — the first in your list. A superuser with several organizations sees just that one here.',
        'To raise or lower a device limit, edit **Device limit** on the organization’s page (**Users & Organizations › Organizations**).',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*No organization visible*', 'Your account is in no organization.', 'Ask an administrator to add you to one.'],
    ['A usage bar is full', 'The organization reached its device limit, so new devices are refused.', 'Raise **Device limit** on the organization, or remove unused devices.'],
  ],
  shotDir: 'license',
  shots: [{ file: 'page.png', what: 'The whole page with all three cards.', alt: 'License & Subscription' }],
};

export const ADMIN_NOTES: Record<string, AdminNotes> = {
  '/users': USERS,
  '/organizations': ORGS,
  '/allowed-serials': SERIALS,
  '/groups': GROUPS,
  '/device-groups': DEVICE_GROUPS,
  '/device-groups/tree': DEVICE_GROUP_TREE,
  '/hierarchy': HIERARCHY,
  '/license': LICENSE,
};
