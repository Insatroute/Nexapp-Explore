/** Access Control › TACACS+ — guide notes (see access-notes.ts). */
import type { AdminNotes } from './admin-notes.ts';

// How the pieces fit — said once per page, in the words each page needs.
const HOW_IT_FITS =
  '**How the TACACS+ pages fit together.** There are two directions. **Servers**, **Command rules**, **Device group secrets**, **Active sessions** and **Accounting logs** are about the TACACS+ daemon this controller runs for your **routers**: the routers ask it who may log in to them and what they may run, and report back what was done. **Client (login)** is the other way round — external TACACS+ servers that this controller asks when someone signs in to **the controller itself**.';

const SERVERS: AdminNotes = {
  from: [
    'pages/TacacsServers.jsx',
    'features/tacacs/TacacsServerDrawer.jsx',
    'features/tacacs/tacacsModel.js',
    'services/api.js',
    'nexapp_tacacs/models/server.py',
    'nexapp_tacacs/api/views.py',
    'nexapp_tacacs/api/serializers.py',
    'nexapp_tacacs/signals.py',
    'nexapp_tacacs/tasks.py',
    'nexapp_tacacs/config_gen/tac_plus_config.py',
    'nexapp_tacacs/config_gen/pam_config.py',
    'nexapp_tacacs/admin/server.py',
    'sdwan_tunnel/nsbond_client.py',
  ],
  title: 'Running the TACACS+ server for your routers',
  intro: [
    'Each row is **one organization’s TACACS+ server configuration** — the settings for the TACACS+ daemon on this controller that the organization’s routers log their administrators in against. From here you change those settings, push them to the organization’s routers, and reload the daemon.',
    HOW_IT_FITS,
    'The list shows **Organization** (with *LDAP backend* or *local users* under the name), **Status** (*Enabled* / *Disabled*), **Deploy mode**, **Listen** (address and port), **Auth** (authentication type), **Accounting** (*On · ‹days›d* with its retention, or *Off*), **Pending** (changes saved but not yet pushed to the routers) and **Last reload**. Newest configuration first, 25 to a page. There is no search box; the organization picker at the top narrows the list to one organization.',
    '<Callout type="info">**There is no Add or Delete here.** An organization has at most one TACACS+ server configuration. It is created by an administrator in the Django admin (**TACACS+ · Server**); after that it is edited on this page. A new configuration starts **disabled** and in **Manual push** mode.</Callout>',
  ],
  before: [
    'The configuration for the organization must already exist (Django admin, **TACACS+ · Server**). Until then the page shows *No TACACS+ servers configured.*',
    '**Edit settings** appears in the row menu only with the change-server-configuration permission. **Deploy to routers** and **Reload daemon** are always in the menu.',
    'The users and groups the daemon knows come from the CPE user databases: local and remote (LDAP) users with TACACS+ turned on, and the user groups they belong to. Those are managed outside these pages, in the Django admin.',
    'Routers receive TACACS+ settings only if they have a shared secret — their device group’s own (see **Device group secrets**) or the **Default shared secret** set here. A router with neither is skipped on every push.',
  ],
  tasks: [
    {
      title: 'Turn TACACS+ on for an organization',
      steps: [
        'Open **Access Control › TACACS+ › Servers** and click the organization’s name (or **⋮ › Edit settings**). The **TACACS+ server settings** panel opens.',
        'Type a **Default shared secret** if the organization’s device groups do not all have their own.',
        'Choose the **Mode**: **Auto-deploy** pushes every later change to the routers straight away; **Manual push** holds changes until you press **Deploy to routers**.',
        'Switch **TACACS+ enabled** on, check the other sections (see the field table below) and press **Save settings**. *TACACS+ server settings saved.* confirms it.',
        'In **Manual push** mode, open **⋮ › Deploy to routers** and confirm *Push TACACS+ config to every router?* with **Deploy**. *Deploy started.* means the push has been queued.',
      ],
      after: [
        'Saving an **enabled** configuration always rebuilds the daemon’s configuration file on the controller and reloads the daemon. With **Auto-deploy** it also pushes to every router of the organization; with **Manual push** it adds one to **Pending** instead.',
      ],
      shot: 'form-edit.png',
    },
    {
      title: 'Change the settings',
      steps: [
        'Click the organization’s name, change what you need and press **Save settings**.',
        'Leave **Default shared secret** blank to keep the current one. It is never sent back to the browser, so the box is always empty when the panel opens; only a value you type replaces it.',
      ],
      after: [
        'Saving while **TACACS+ enabled** is off changes the stored settings only — nothing is rebuilt, reloaded or pushed. Switching it off does **not** remove TACACS+ settings already pushed to routers; no code path sends a router a “disable”.',
      ],
    },
    {
      title: 'Push pending changes to the routers',
      steps: [
        'A number in **Pending** means changes were saved in **Manual push** mode and have not reached the routers.',
        'Open **⋮ › Deploy to routers** and confirm with **Deploy**.',
      ],
      after: [
        'The controller queues one push per router of the organization and sets **Pending** back to 0 straight away — it does not wait for the routers to answer, so 0 means *sent*, not *applied*. Each router that is pushed successfully updates **Last deployed** on its device group’s secret (see **Device group secrets**).',
        'With **TACACS+ enabled** off, the request is refused and the page shows *Could not deploy: request failed*.',
      ],
    },
    {
      title: 'Reload the daemon',
      steps: [
        'Open **⋮ › Reload daemon** and confirm *Reload the TACACS+ daemon?* with **Reload**. *Daemon reload requested.* means it has been queued.',
      ],
      after: [
        'This rebuilds the daemon’s configuration from the current settings, users, groups, command rules and device group secrets, checks it, and reloads the daemon. It does **not** push anything to routers and does not change **Pending**. **Last reload** is set when the reload succeeds, and cleared when the configuration was written but the reload did not succeed.',
        'With **TACACS+ enabled** off, the request is refused and the page shows *Could not reload: request failed*.',
      ],
    },
  ],
  forms: [
    {
      title: 'TACACS+ server settings',
      source: 'features/tacacs/TacacsServerDrawer.jsx',
      opens: 'Opened by clicking an organization’s name or **⋮ › Edit settings**. Every value starts at what is saved; a configuration created in the Django admin starts at the values shown under *Starts at*.',
      fields: {
        'TACACS+ enabled': { starts: 'Off', what: 'While off, nothing on these pages has any effect on the organization: saving, deploying and reloading do nothing.' },
        Mode: { starts: 'Manual push', what: 'One of **Auto-deploy** or **Manual push**.' },
        'Listen port': { starts: '49', example: '49', what: 'Written into the daemon’s configuration and pushed to the routers as the port to reach it on.' },
        'Listen address': { starts: '0.0.0.0', example: '0.0.0.0', checks: ['listen_address: Enter a valid IPv4 or IPv6 address.'], what: 'Must be an IP address. It is stored, but the generated daemon configuration sets only the port, so the daemon does not take its listening address from this field.' },
        'Authentication type': { starts: 'Auto (PAP → MSCHAP → CHAP)', what: 'One of **Auto (PAP → MSCHAP → CHAP)**, **PAP**, **CHAP**, **MSCHAP**, **ASCII**. Pushed to the routers.' },
        'Default shared secret': { example: 'not-a-real-secret', what: 'Up to 256 characters, typed into a masked box. Each router gets its device group’s own secret when it has one, otherwise this one; the same choice is written into the daemon’s configuration for each router.' },
        'Authorization enabled': { starts: 'On', what: 'Pushed to the routers: run authorization after a login succeeds.' },
        'Override access profile': { starts: 'On', what: 'Pushed to the routers: lets the admin profile the TACACS+ server returns replace the router’s locally configured profile for that user.' },
        'CLI command authorization': { starts: 'Off', what: 'Pushed to the routers. This is what makes the **Command rules** matter.' },
        'Restrict admin to local console': { starts: 'Disable', what: 'One of **Disable** or **Enable**. Pushed to the routers.' },
        'On authorization failure': { starts: 'Allow (fail-open)', what: 'One of **Allow (fail-open)** or **Deny (fail-closed)**. Pushed to the routers.' },
        'Accounting enabled': { starts: 'On', what: 'Pushed to the routers, and when on the daemon writes an accounting log — the source of **Accounting logs** and **Active sessions**.' },
        'Audit logins': { starts: 'On', what: 'Pushed to the routers.' },
        'Audit config changes': { starts: 'On', what: 'Pushed to the routers.' },
        'Audit CLI commands': { starts: 'Off', what: 'Pushed to the routers.' },
        'Retention (days)': { starts: '365', example: '90', what: 'How long **Accounting logs** entries are kept; a weekly clean-up deletes older ones, for enabled configurations only.' },
        'Use LDAP backend': { starts: 'Off', what: 'When on, and the organization has enabled remote (LDAP) user databases, the controller writes a PAM configuration so remote users’ passwords are checked against the directory — through `pam_sss` for Active Directory, `pam_ldap` otherwise.' },
      },
      after: [
        'The red bar at the top of the panel shows the first error the server returned, as *field: message*.',
      ],
    },
  ],
  sections: [
    {
      title: 'What a push sends to each router',
      body: [
        'For every router of the organization, the controller sends the router’s TACACS+ client settings: the service switched on; the server address — the controller’s address as set in the controller’s own settings, not anything on this page; the shared secret (device group’s, else the default); **Listen port**; **Authentication type**; the five **Authorization** settings; and the four **Accounting** switches.',
        'Not sent: **Listen address**, **Retention (days)**, **Use LDAP backend** and **Mode**. The router’s switches for using TACACS+ on its web and SSH logins are always sent **off** by this push.',
      ],
    },
  ],
  verify: [
    '**Status** shows *Enabled* and **Pending** shows **—** after a deploy.',
    '**Last reload** shows a time after a reload or an enabled save; **—** there means the reload did not succeed.',
    'On **Device group secrets**, **Last deployed** updates for groups whose routers were pushed successfully.',
  ],
  trouble: [
    ['*Could not deploy: request failed* or *Could not reload: request failed*', 'The configuration is disabled; the server refuses both actions then.', 'Switch **TACACS+ enabled** on and save first.'],
    ['**Pending** keeps growing', 'The mode is **Manual push**; each change adds one until you deploy.', 'Use **⋮ › Deploy to routers**, or switch **Mode** to **Auto-deploy**.'],
    ['**Last reload** shows **—** after saving or reloading', 'The configuration was not written, did not pass the daemon’s check, or the reload failed.', 'Check the controller’s TACACS+ daemon service; the reason is in the controller’s task log, not on this page.'],
    ['*Must be between 1 and 65535.* under **Listen port**', 'The port is out of range; **Save settings** stays grey.', 'Enter 1–65535 (TACACS+ is normally 49).'],
    ['*Must be between 1 and 3650.* under **Retention (days)**', 'Out of range; **Save settings** stays grey.', 'Enter 1–3650.'],
    ['Red bar: *listen_address: Enter a valid IPv4 or IPv6 address.*', 'A hostname or malformed address.', 'Enter an IP address, such as `0.0.0.0`.'],
    ['A router never gets the TACACS+ settings', 'Neither its device group nor the server configuration has a shared secret, so the push skips it.', 'Set a **Default shared secret**, or a secret for its group on **Device group secrets**, then deploy.'],
    ['*No TACACS+ servers configured.*', 'No organization in scope has a configuration yet.', 'Create it in the Django admin (**TACACS+ · Server**), or widen the organization picker.'],
  ],
  shotDir: 'tacacs/servers',
  shots: [
    { file: 'list.png', what: 'The TACACS+ servers list — one row per organization with Status, Deploy mode, Listen, Auth, Accounting, Pending and Last reload.', alt: 'The TACACS+ servers list' },
    { file: 'form-edit.png', what: 'The TACACS+ server settings panel: Identity, Deploy mode, Daemon, Authorization, Accounting and LDAP backend sections.', alt: 'Editing a TACACS+ server configuration' },
  ],
};

const CLIENT: AdminNotes = {
  from: [
    'pages/TacacsClient.jsx',
    'features/tacacs/TacacsClientDrawer.jsx',
    'features/tacacs/tacacsModel.js',
    'services/api.js',
    'nexapp_tacacs/models/client_config.py',
    'nexapp_tacacs/api/views.py',
    'nexapp_tacacs/api/serializers.py',
    'nexapp_tacacs/tacacs_client_backend.py',
    'tests/nexapp2/settings.py',
  ],
  title: 'Signing in to the controller with TACACS+',
  intro: [
    'This page makes **the controller itself** a TACACS+ client: people sign in to the controller’s web console with an account held on an external TACACS+ server. Each row is one login configuration — for one organization, or a single **Shared — all organizations** one — with up to three servers tried in turn.',
    HOW_IT_FITS,
    'The list shows **Organization** (with the fallback order under it), **Status**, **Surfaces** (*Web UI*, *SSH* or *none*), **Auth**, **Servers** (which slots have an address — *none* in red when no slot does), **Timeout**, and **Local logins**. Newest first, 25 to a page; no search.',
  ],
  before: [
    '**Configure login** appears only with the add permission; **Edit settings** and **Delete** each need their own.',
    'The **Shared — all organizations** configuration can be created, changed or deleted only by a superuser. Everyone else sees it, but its name is not clickable and it has no menu.',
    'Have each TACACS+ server’s address, port and shared secret to hand. A slot without a shared secret is skipped at sign-in.',
    'Keep a superuser account with a local password: local accounts are always checked before TACACS+, so it keeps working whatever happens to the TACACS+ servers.',
  ],
  tasks: [
    {
      title: 'Set up TACACS+ login',
      steps: [
        'Open **Access Control › TACACS+ › Client (login)** and press **Configure login**.',
        'Choose the **Organization** — or, as a superuser, **Shared — all organizations**. Organizations already configured on the page are not offered.',
        'Under **Servers**, fill **Primary**: **Address**, **Port** and **Shared secret**. Add **Secondary** and **Tertiary** the same way if you have them.',
        'Choose the **Authentication type** and **Timeout (seconds)**.',
        'Switch **Web UI login** on — it is the switch the controller’s sign-in checks.',
        'Switch **TACACS+ login enabled** on and press **Create**. *Client login configured.* confirms it.',
      ],
      after: [
        '**Create** stays grey while no organization is chosen, a timeout or port is out of range, or the service is switched on with no server address — the panel then says *The service is enabled but no server slot has an address. Add at least a primary server, or disable the service.*',
        'The configuration is saved first, then each server slot. If a slot is refused, the configuration is already saved; open it again, fix the slot and save.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change servers or settings',
      steps: [
        'Click the organization’s name, or **⋮ › Edit settings**.',
        'To replace a slot’s secret, type the new one; leave **Shared secret** blank to keep the current one.',
        'To remove a slot, clear its **Address**.',
        'Press **Save settings**. *Client login settings saved.* confirms it.',
      ],
      after: [
        'The organization cannot be changed once created; delete the configuration and create a new one instead.',
      ],
    },
    {
      title: 'Delete a login configuration',
      steps: [
        'Open **⋮ › Delete** and confirm *Delete TACACS+ login for ‹organization›?*. *Client login configuration deleted.* confirms it.',
      ],
      after: [
        'Its server slots are deleted with it. Accounts the controller created for TACACS+ users have no local password, so those people cannot sign in until another enabled configuration with **Web UI login** authenticates them.',
      ],
    },
  ],
  forms: [
    {
      title: 'the TACACS+ login panel',
      source: 'features/tacacs/TacacsClientDrawer.jsx',
      opens: '**Configure login** opens it empty, titled *Configure TACACS+ login*; clicking a row opens it filled in. The **Address**, **Port**, **Shared secret** and **Use TLS 1.3 transport** rows repeat for each of the three slots — Primary, Secondary, Tertiary.',
      fields: {
        Organization: { when: 'Only when adding', checks: ['organization: A shared configuration already exists. Edit that one, or pick an organization.'] },
        'TACACS+ login enabled': { starts: 'Off', what: 'With it off, this configuration is ignored at sign-in.' },
        'Web UI login': { starts: 'Off', what: 'Must be on for the controller’s sign-in to use this configuration.' },
        'SSH login': { starts: 'Off', what: 'Stored with the configuration; the controller’s sign-in does not read it.' },
        'Authentication type': { starts: 'Auto (PAP → MSCHAP → CHAP)', what: 'One of **Auto (PAP → MSCHAP → CHAP)**, **PAP**, **CHAP**, **MSCHAP**, **ASCII**. What the sign-in actually sends: PAP, CHAP and ASCII as named; **MSCHAP** is sent as PAP; **Auto** tries ASCII, then PAP.' },
        'Fallback order': { starts: 'tacacs+,local', example: 'tacacs+,local', drop: ['Comma separated, tried left to right. “tacacs+,local” falls back to local accounts if the server is unreachable.'], what: 'Comma separated. Stored and shown under the organization name, but the controller’s sign-in does not read it: local accounts are always checked first, and TACACS+ only after them.' },
        'Restrict local logins': { starts: 'No restriction', drop: ['The break-glass policy. Disabling local logins entirely means a lost TACACS+ server locks everyone out.'], what: 'One of **No restriction**, **Restrict local logins to console**, **Disable local logins**. Stored and shown in the **Local logins** column; the controller’s sign-in does not enforce it.' },
        'Timeout (seconds)': { starts: '15', example: '5', what: 'How long each server gets to answer before the next is tried.' },
        'Source interface': { starts: 'any', example: 'any', drop: ['Interface outbound requests come from. “any” lets the OS choose.'], what: 'Stored; the controller’s sign-in does not read it.' },
        Address: { when: 'In each server slot', example: '10.0.0.1', what: 'An address or hostname, up to 255 characters.' },
        Port: { when: 'In each server slot', starts: '49', example: '49' },
        'Shared secret': { when: 'In each server slot', example: 'not-a-real-secret', what: 'Typed into a masked box and never sent back to the browser. A slot without one is skipped at sign-in.' },
        'Use TLS 1.3 transport': { when: 'In each server slot', starts: 'Off', what: 'Stored; the controller’s sign-in does not read it.' },
        'CLI command authorization': { starts: 'Off', what: 'Stored; the controller’s sign-in does not read it.' },
        'Accounting enabled': { starts: 'Off', what: 'Stored; the controller’s sign-in does not read it.' },
      },
    },
  ],
  sections: [
    {
      title: 'What happens when someone signs in',
      body: [
        '- The controller checks its own accounts first (local, then the CPE user databases). TACACS+ is asked only when those do not accept the username and password.\n- It uses every configuration that has **TACACS+ login enabled** and **Web UI login** on — whichever organization it belongs to — and tries its **Primary**, **Secondary** and **Tertiary** servers in that order, skipping a slot with no address or no shared secret.\n- A server that errors, or does not answer within **Timeout (seconds)**, is passed over for the next one; it does not cause an error on the sign-in page.\n- If a server accepts, the controller creates (or updates) a staff account with that username and no local password. A username that already belongs to a controller account **with a password** is refused, so TACACS+ can never take over a local account.',
        'What the account may do comes from the TACACS+ server’s answer for the user’s shell service:',
        '| The server returns | The controller account becomes |\n| --- | --- |\n| `priv-lvl` 15 or more | superuser, organization administrator |\n| `priv-lvl` 1–14 | staff, organization member |\n| no `priv-lvl` | staff, organization administrator |\n| `nexapp-org=‹name›[,‹name›]` | member of those organizations (by name or slug); otherwise of the configuration’s own organization — none for the shared one |\n| `nexapp-org-role=administrator` or `member` | administrator or member, overriding the line above |\n| `nexapp-perm-group=‹group›[,‹group›]` | exactly those permission groups; without it, groups set by hand are kept |',
        'Organization and permission-group names the controller does not know are skipped, never created. The account is re-synchronised at each TACACS+ sign-in.',
      ],
    },
  ],
  verify: [
    'The row shows **Enabled**, **Web UI** under **Surfaces**, and the slots you filled under **Servers**.',
    'Sign in, in a private window, with an account that exists only on the TACACS+ server. Under **Users & Organizations › Users** the account appears; its **Source** in the Details card says TACACS+.',
  ],
  trouble: [
    ['*The service is enabled but no server slot has an address. Add at least a primary server, or disable the service.*', 'The service is on with every **Address** empty.', 'Fill **Primary**, or switch **TACACS+ login enabled** off.'],
    ['*Pick the organization this applies to.*', 'No organization chosen; **Create** stays grey.', 'Choose one.'],
    ['*Must be between 1 and 300.* or *Must be between 1 and 65535.*', 'Timeout or a slot’s port is out of range.', 'Use 1–300 seconds and a port of 1–65535.'],
    ['Red bar: *organization: A shared configuration already exists. Edit that one, or pick an organization.*', 'Only one shared configuration may exist.', 'Edit the existing shared row.'],
    ['TACACS+ users cannot sign in', '**Web UI login** or **TACACS+ login enabled** is off, the slot has no shared secret, the secret does not match the server, or the username belongs to a local account with a password.', 'Check those four; the controller logs the reason, never the secret.'],
    ['A TACACS+ user lands in the wrong organization, or none', 'Without `nexapp-org` the configuration’s own organization is used — none for the shared configuration.', 'Have the TACACS+ server return `nexapp-org` for the user.'],
    ['The shared row cannot be clicked and has no menu', 'Only a superuser may change it.', 'Ask a superuser.'],
  ],
  shotDir: 'tacacs/client',
  shots: [
    { file: 'list.png', what: 'The Client (login) list with each configuration’s Status, Surfaces, Auth, Servers, Timeout and Local logins.', alt: 'The TACACS+ client login list' },
    { file: 'form-new.png', what: 'The Configure TACACS+ login panel: Service, Login surfaces, Authentication, the three server slots, and Authorization and accounting.', alt: 'Configuring TACACS+ login' },
  ],
};

const RULES: AdminNotes = {
  from: [
    'pages/TacacsRules.jsx',
    'features/tacacs/TacacsRuleDrawer.jsx',
    'features/tacacs/tacacsModel.js',
    'services/api.js',
    'nexapp_tacacs/models/command_rule.py',
    'nexapp_tacacs/api/views.py',
    'nexapp_tacacs/api/serializers.py',
    'nexapp_tacacs/signals.py',
    'nexapp_tacacs/config_gen/tac_plus_config.py',
    'nexapp_cpeusers/models/group.py',
  ],
  title: 'Controlling which commands a group may run',
  intro: [
    'A command rule says, for one **user group**, whether a **command** — optionally only with certain arguments — is **permitted** or **denied** on the routers. Rules are written into the TACACS+ daemon’s configuration under the group, and are consulted when **CLI command authorization** is on in **Servers**.',
    HOW_IT_FITS,
    'The list shows **Command** (with its argument pattern under it), **Group**, **Action**, **Pattern** and **Order**, sorted by group and then by order, 25 to a page. **All groups** and **Any action** filter the whole list on the server; **Clear filters** resets them.',
  ],
  before: [
    '**Add rule** appears only with the add permission; **Edit rule** and **Delete** each need their own.',
    'The **user group** must exist. These are the CPE user groups — the ones carrying a TACACS+ privilege level — not the controller’s permission groups. They are managed in the Django admin.',
    'Only **enabled** user groups are written into the daemon’s configuration; rules on a disabled group have no effect.',
    'For a rule to be acted on, **CLI command authorization** must be on in **Servers**, and the change must reach the controller’s daemon (see *After you save* below).',
  ],
  tasks: [
    {
      title: 'Add a rule',
      steps: [
        'Open **Access Control › TACACS+ › Command rules** and press **Add rule**.',
        'Pick the **User group**.',
        'Type the **Command** as it is typed on the router, e.g. `show`.',
        'Type an **Argument pattern** — a regular expression for the arguments. Use `.*` for any arguments; the box cannot be left empty (see below).',
        'Choose **Permit** or **Deny** under **Action**, set **Order**, and press **Create rule**. *Rule created.* confirms it.',
      ],
      after: [
        'Saving a rule rebuilds the organization’s daemon configuration when its TACACS+ server configuration is enabled. In **Auto-deploy** mode the routers are pushed too; in **Manual push** mode **Pending** on **Servers** goes up by one.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change or delete a rule',
      steps: [
        'Click the command, or **⋮ › Edit rule**; change it and press **Save rule**. *Rule saved.* confirms it.',
        'To delete: **⋮ › Delete** and confirm *Delete the rule for “‹command›”?*. *Rule deleted.* confirms it.',
      ],
      after: [
        'Deleting has the same effect on the daemon configuration and **Pending** as saving.',
      ],
    },
  ],
  forms: [
    {
      title: 'the command rule panel',
      source: 'features/tacacs/TacacsRuleDrawer.jsx',
      opens: '**Add rule** opens it empty (*Add command rule*); clicking a rule opens it filled in (*Edit command rule*).',
      fields: {
        'User group': { example: 'operators', what: 'The CPE user group the rule belongs to.' },
        Command: { example: 'show', what: 'Up to 128 characters.' },
        'Argument pattern': {
          required: 'Yes',
          example: '.*',
          drop: ['Optional. Narrows the match to certain arguments; empty matches the command however it is called.'],
          what: 'A regular expression applied to the command’s arguments, up to 256 characters. The panel calls it optional, but the server refuses an empty pattern — enter `.*` to match any arguments.',
          checks: ['pattern: This field may not be blank.'],
        },
        Action: { starts: 'Permit', what: 'One of **Permit** or **Deny**.' },
        Order: { starts: '10', example: '20', checks: ['order: Ensure this value is greater than or equal to 0.'], what: 'A whole number, 0 or more. Within a group, rules are written into the configuration lowest first.' },
      },
    },
  ],
  sections: [
    {
      title: 'How rules become configuration',
      body: [
        'For each enabled user group the daemon’s configuration gets the group’s privilege level and default service, then one entry per rule, in **Order**, lowest first: the command, then **permit** or **deny** with the pattern. Two rules with the same order in one group have no defined order between them — give each its own number, leaving gaps (10, 20, 30) for rules added later.',
        'A command that no rule covers gets the group’s **default service** — *permit* unless the group is set otherwise in the Django admin. The group’s privilege level (15 admin, 7 power user, 2 operator, 1 read-only; 2 by default) is written into the same entry, as the `priv-lvl` the daemon returns for its members.',
      ],
    },
  ],
  verify: [
    'The rule appears under its group with the action, pattern and order you set; filter by the group to see its rules in order.',
    'On **Servers**, **Pending** went up (manual mode) — deploy to send it to the routers.',
  ],
  trouble: [
    ['Red bar: *pattern: This field may not be blank.*', 'The **Argument pattern** was left empty.', 'Enter `.*` to match any arguments.'],
    ['*Pick the group this rule applies to.* / *A command is required.*', 'A required box is empty; **Create rule** stays grey.', 'Fill it.'],
    ['The rule has no effect on the routers', '**CLI command authorization** is off, the user group is disabled, the TACACS+ server configuration is disabled, or the change is still pending.', 'Check those on **Servers** and in the group, then deploy.'],
    ['*No rules match these filters.*', 'The group and action filters together match nothing.', 'Press **Clear filters**.'],
    ['The group list is empty in the panel', 'No CPE user groups exist that you can see.', 'Create the group in the Django admin first.'],
  ],
  shotDir: 'tacacs/rules',
  shots: [
    { file: 'list.png', what: 'The Command rules list with the group and action filters, and each rule’s command, group, action, pattern and order.', alt: 'The command rules list' },
    { file: 'form-new.png', what: 'The Add command rule panel: User group, Command, Argument pattern, Action and Order.', alt: 'Adding a command rule' },
  ],
};

const GROUP_SECRETS: AdminNotes = {
  from: [
    'pages/TacacsGroupSettings.jsx',
    'features/tacacs/TacacsGroupSettingsDrawer.jsx',
    'services/api.js',
    'nexapp_tacacs/models/device_group_settings.py',
    'nexapp_tacacs/api/views.py',
    'nexapp_tacacs/api/serializers.py',
    'nexapp_tacacs/signals.py',
    'nexapp_tacacs/tasks.py',
    'nexapp_tacacs/config_gen/tac_plus_config.py',
    'nexapp_tacacs/admin/device_group_settings.py',
  ],
  title: 'Giving a device group its own TACACS+ secret',
  intro: [
    'The **shared secret** is the key a router and the TACACS+ daemon both hold to talk to each other. By default every router of an organization uses the **Default shared secret** from **Servers**. A row here gives one **device group** a secret of its own, which its routers use instead — so a secret can be changed for part of the fleet without touching the rest.',
    HOW_IT_FITS,
    'The list shows **Device group**, **Shared secret** (*Set* or *Not set* — the secret itself is never shown), **Last deployed** (when a router of the group last received the settings successfully, or *never*) and **Updated**. Newest first, 25 to a page; no search or filters. The same setting appears in the Django admin as **TACACS+ Settings** on the device group’s page.',
  ],
  before: [
    '**Add group secret** appears only with the add permission; **Replace secret** and **Remove** each need their own.',
    'The device group must exist (**Administration › Device Groups**).',
    'Know the secret you will configure — it is stored write-only and cannot be read back afterwards.',
  ],
  tasks: [
    {
      title: 'Give a group its own secret',
      steps: [
        'Open **Access Control › TACACS+ › Device group secrets** and press **Add group secret**.',
        'Pick the **Group**. Groups that already have a secret on this page are not offered.',
        'Type the **Secret** and press **Create**. *Group settings created.* confirms it.',
      ],
      after: [
        'Saving rebuilds the organization’s daemon configuration when its TACACS+ server configuration is enabled, so the daemon accepts the group’s routers with the new secret. In **Auto-deploy** mode the routers are pushed the new secret at once; in **Manual push** mode **Pending** on **Servers** goes up — until you deploy, the daemon and the routers hold different secrets.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Replace a secret',
      steps: [
        'Click the group, or **⋮ › Replace secret**.',
        'Type the **New secret** and press **Save secret**. *Group settings saved.* confirms it. Leaving the box blank keeps the current secret.',
      ],
      after: [
        'The group cannot be changed on an existing row.',
      ],
    },
    {
      title: 'Remove a group’s secret',
      steps: [
        'Open **⋮ › Remove** and confirm *Remove the TACACS+ secret for ‹group›?*. *Group secret removed.* confirms it.',
      ],
      after: [
        'The group’s routers will use the **Default shared secret** from **Servers** from the next rebuild and push on — but removing does **not** start one. Press **Reload daemon** and **Deploy to routers** on **Servers** so the daemon and the routers switch together.',
      ],
    },
  ],
  forms: [
    {
      title: 'the group secret panel',
      source: 'features/tacacs/TacacsGroupSettingsDrawer.jsx',
      opens: '**Add group secret** opens it with a group picker; an existing row opens it with the group fixed.',
      fields: {
        Group: { when: 'Only when adding', what: 'The device group. Only groups without a secret on this page are offered.', drop: ['Every group already has a secret — edit one from the list instead.'] },
        'Group#2': { when: 'Only when editing' },
        'Secret / New secret': {
          extra: true,
          required: 'When adding',
          example: 'not-a-real-secret',
          what: 'Labelled **Secret** when adding and **New secret** when editing. Masked, up to 256 characters, and never sent back to the browser. When adding it is required and must match what the group’s routers will use; when editing, blank keeps the current one.',
          checks: ['A shared secret is required.'],
        },
      },
    },
  ],
  sections: [
    {
      title: 'Which secret a router uses',
      body: [
        '- Its device group has a row here with a secret → that secret.\n- Otherwise → the **Default shared secret** on **Servers**.\n- Neither → the router is skipped on every push and left out of the daemon’s configuration.',
        'The daemon’s configuration lists each router by its management IP, group by group, with the secret chosen this way. A router that is in no device group, or has no management IP, is not listed there — even though a push still sends it the default secret.',
      ],
    },
  ],
  verify: [
    'The group shows **Set** under **Shared secret**.',
    'After a push, **Last deployed** shows a time; *never* means no router of the group has received the settings successfully yet.',
  ],
  trouble: [
    ['*Every group already has a secret — edit one from the list instead.*', 'Every device group you can see already has a row.', 'Use **Replace secret** on that row.'],
    ['*A shared secret is required.*', 'The secret is empty when adding; **Create** stays grey.', 'Type it.'],
    ['Routers in the group stop authenticating after a change', 'In **Manual push** mode the daemon already uses the new secret but the routers have not received it.', 'Deploy from **Servers**.'],
    ['After **Remove**, nothing changed on the routers', 'Removing does not rebuild or push anything.', 'Use **Reload daemon** and **Deploy to routers** on **Servers**.'],
    ['**Last deployed** stays *never*', 'No router of the group has been pushed successfully — the server configuration is disabled, nothing was deployed, or the push failed.', 'Enable the configuration and deploy from **Servers**.'],
  ],
  shotDir: 'tacacs/group-secrets',
  shots: [
    { file: 'list.png', what: 'Device group secrets — each group with Set or Not set, Last deployed and Updated.', alt: 'The device group secrets list' },
    { file: 'form-new.png', what: 'The Add group secret panel with the Group picker and the masked Secret box.', alt: 'Adding a group secret' },
  ],
};

const SESSIONS: AdminNotes = {
  from: [
    'pages/TacacsSessions.jsx',
    'features/tacacs/tacacsModel.js',
    'services/api.js',
    'nexapp_tacacs/models/session.py',
    'nexapp_tacacs/api/views.py',
    'nexapp_tacacs/accounting_parser.py',
    'tests/nexapp2/settings.py',
  ],
  title: 'Seeing who is logged in to the routers',
  intro: [
    'A session is one person’s login to a router through TACACS+, built from the accounting records the TACACS+ daemon on this controller writes: a **start** record opens it, a **stop** record for the same user on the same router closes it.',
    '<Callout type="info">**Read-only.** Sessions are recorded automatically; nothing here is added, edited, ended or deleted. There is no way to disconnect a user from this page.</Callout>',
    HOW_IT_FITS,
    'The list shows **User** (*active now* or *ended* under the name), **Device**, **Type**, **Source IP**, **Privilege**, **Started**, **Duration** and **State** (*Open* / *Closed*). Newest first, 25 to a page — open and closed sessions together unless you filter.',
  ],
  before: [
    '**Accounting enabled** must be on in **Servers**: without it the daemon writes no accounting log and no sessions appear.',
    'The controller reads the daemon’s accounting log every 5 minutes, so a new login can take up to that long to show.',
  ],
  tasks: [
    {
      title: 'Find who is on the routers now',
      steps: [
        'Open **Access Control › TACACS+ › Active sessions**.',
        'Choose **Currently open** in **All sessions**. **Ended** shows only finished ones.',
        'Choose **SSH**, **HTTPS**, **Console** or **Other** in **Any type** to narrow by type.',
      ],
    },
    {
      title: 'Find one person’s sessions',
      steps: [
        'Type the full username into **Exact username…** and press **Enter**. It must match exactly — part of a name finds nothing.',
        'Press ✕ in the box, or **Clear filters**, to see everyone again.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the values mean',
      body: [
        '- **Device** — the first eight characters of the router’s id in the controller, found by matching the address in the accounting record to a device’s management IP (or, failing that, its last known IP); **—** when no device matched.\n- **Type** — taken from the `service` value in the start record. Values other than SSH, HTTPS, Console and Other are shown as they arrived (for example `shell`), and then the **Any type** filter cannot select them.\n- **Source IP** — the address the accounting record came from, which is the router’s, not the person’s computer.\n- **Privilege** — the TACACS+ privilege level from the record, 0 when it had none. Grey below 7, amber from 7, red at 15 — the full-admin level.\n- **Duration** — from **Started** to the end of the session, or to now while it is open.\n- **State** — *Open* until a stop record arrives for the same user and router. There is no idle timeout: a login whose stop record never arrives stays *Open*.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*No sessions recorded yet.*', 'No accounting record has been read yet — accounting is off, the server configuration is disabled, or nobody has logged in through TACACS+.', 'Turn on **Accounting enabled** on **Servers**, log in to a router, and wait up to 5 minutes.'],
    ['*No sessions match these filters.*', 'The username, state and type filters together match nothing — *The username filter is an exact match, not a search.*', 'Type the full username, or press **Clear filters**.'],
    ['A session stays *Open* long after the person left', 'Its stop record never arrived, or arrived for a different router.', 'Nothing to fix here; the row is history.'],
    ['Sessions a superuser sees are missing for others', 'A record whose router could not be matched to a device has no organization, and only superusers see those.', 'Make sure the router’s management IP is known to the controller.'],
  ],
  shotDir: 'tacacs/sessions',
  shots: [
    { file: 'list.png', what: 'Active sessions — the username search, state and type filters, and sessions with their device, type, source IP, privilege, start, duration and state.', alt: 'The TACACS+ active sessions list' },
  ],
};

const ACCOUNTING: AdminNotes = {
  from: [
    'pages/TacacsAccounting.jsx',
    'features/tacacs/tacacsModel.js',
    'services/api.js',
    'nexapp_tacacs/models/accounting.py',
    'nexapp_tacacs/api/views.py',
    'nexapp_tacacs/accounting_parser.py',
    'nexapp_tacacs/tasks.py',
    'nexapp_tacacs/config_gen/tac_plus_config.py',
    'tests/nexapp2/settings.py',
  ],
  title: 'Reading the TACACS+ accounting log',
  intro: [
    'The accounting log is the audit trail of what people did on the routers through TACACS+: logins and logouts, configuration changes and CLI commands, with who, on which router and when. Each row is one line of the accounting log the TACACS+ daemon on this controller writes.',
    '<Callout type="info">**Read-only.** Entries are recorded automatically and removed only by the retention clean-up; nothing here is added, edited or deleted.</Callout>',
    HOW_IT_FITS,
    'The list shows **When**, **User**, **Event** (*Login / Logout*, *Config Change* or *CLI Command*), **Action** (*Start*, *Stop* or *Update*), **Device**, **Source IP**, **Priv** and **Command / detail** — the command for a CLI command, otherwise the rest of the record. Newest first, 25 to a page.',
  ],
  before: [
    '**Accounting enabled** must be on in **Servers** — it is what makes the daemon write the log. The **Audit logins**, **Audit config changes** and **Audit CLI commands** switches there decide what the routers report.',
    'The controller reads the daemon’s log every 5 minutes, so entries appear up to that long after the event.',
    'Entries older than **Retention (days)** on **Servers** are deleted by a weekly clean-up.',
  ],
  tasks: [
    {
      title: 'See what one person did',
      steps: [
        'Open **Access Control › TACACS+ › Accounting logs**.',
        'Type the full username into **Exact username…** and press **Enter** — it must match exactly.',
        'Choose **CLI Command** in **All events** to see only the commands they ran.',
      ],
    },
    {
      title: 'Narrow by event or action',
      steps: [
        'Choose an event in **All events** and an action in **Any action**. Both filter the whole log on the server.',
        'Press **Clear filters** to reset them and the username.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the values mean',
      body: [
        '- **Event** — decided from the record: one that carries a command (`cmd=`) is a *CLI Command*; otherwise one that mentions *config* is a *Config Change*; everything else is *Login / Logout*.\n- **Device** — the first eight characters of the router’s id, matched by the record’s address against devices’ management IPs (or, failing that, their last known IPs); **—** when none matched.\n- **Source IP** — the address the record came from: the router, not the person’s computer.\n- **Priv** — the privilege level in the record, 0 when it had none; red at 15.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*No accounting entries yet.*', 'Nothing has been read from the daemon’s log yet.', '*Entries appear once accounting is enabled on the server config.* Turn on **Accounting enabled** on **Servers** and wait up to 5 minutes after a login.'],
    ['*No entries match these filters.*', '*The username filter is an exact match, not a search.*', 'Type the full username, or press **Clear filters**.'],
    ['No CLI commands appear', '**Audit CLI commands** is off on **Servers** (it starts off).', 'Switch it on, save, and deploy to the routers.'],
    ['Old entries are gone', 'They were older than **Retention (days)**.', 'Raise the retention on **Servers** if you need them longer.'],
    ['Entries a superuser sees are missing for others', 'An entry whose router could not be matched to a device has no organization, and only superusers see those.', 'Make sure the router’s management IP is known to the controller.'],
  ],
  shotDir: 'tacacs/accounting',
  shots: [
    { file: 'list.png', what: 'Accounting logs — the username search, event and action filters, and entries with time, user, event, action, device, source IP, privilege and command.', alt: 'The TACACS+ accounting log' },
  ],
};

export const TACACS_NOTES: Record<string, AdminNotes> = {
  '/tacacs/servers': SERVERS,
  '/tacacs/client': CLIENT,
  '/tacacs/rules': RULES,
  '/tacacs/group-secrets': GROUP_SECRETS,
  '/tacacs/sessions': SESSIONS,
  '/tacacs/accounting': ACCOUNTING,
};
