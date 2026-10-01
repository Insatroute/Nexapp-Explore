/** Network › High Availability — guide notes (rendered by guide-admin.ts). */
import type { AdminNotes } from './admin-notes.ts';

// Said once per page, in the words each page needs.
const THREE_PAIRS =
  '**Three different things are called high availability here.** **HA Devices** is about your **routers**: two routers at a site share a virtual IP, and if the active one fails the other takes it over (VRRP, run by keepalived on the routers). **HA Controller** is about **this controller’s own two servers** in the data centre: which one holds the PostgreSQL primary database and the controller’s virtual IP. **DR Control Panel** is about the **data centre and the disaster-recovery (DR) site**: whether the database is being copied to the DR site. The three share a menu, not data.';

// ------------------------------------------------------------------ HA Devices

const HA_DEVICES: AdminNotes = {
  from: [
    'pages/HaDevices.jsx',
    'features/ha/HaSetupDrawer.jsx',
    'components/PasswordField.jsx',
    'components/Drawer.jsx',
    'services/api.js',
    'high_availability/models.py',
    'high_availability/api/serializers.py',
    'high_availability/api/views.py',
    'high_availability/api/throttles.py',
    'high_availability/tasks.py',
    'tests/nexapp2/settings.py',
  ],
  title: 'Pairing two routers for high availability',
  intro: [
    'A router HA pair is two routers at one site that share a **virtual IP** on the LAN. Whichever router is VRRP **master** holds that address; if it fails, the other becomes master and takes the address over, so the LAN keeps the same gateway. From this page you build such a pair, ask a router for its current HA state, and stop the controller tracking a pair.',
    THREE_PAIRS,
    'Each row is **one HA configuration the controller keeps**. Building a pair from this page creates **one** row, for the **primary** router; the secondary is named in the **Peer** column and has no row of its own. The header counts the rows (*‹n› pairs configured*).',
    'The columns are **Device** (the router the row belongs to), **Organization**, **Role** (*Primary* or *Backup*), **Status** (what the controller last configured or the router last reported: *enabled*, *configuring*, *disabled*, *unconfigured* or *error*), **VRRP state** (what that router last said it is: *master*, *backup* or *unknown*), **Peer**, **Virtual IP**, **Last sync** (the router’s own configuration-sync result, as it reported it) and **Last polled**. A healthy pair reads *enabled* with the primary as *master*; after a failover the primary’s row reads *backup*.',
    'The whole list is loaded at once. The status filter, the search box (device, peer, peer IP, virtual IP or organization name) and the organization picker at the top all narrow it in the browser; 25 rows to a page.',
  ],
  before: [
    'You can see the rows of the organizations you belong to (a superuser sees all). **Set up HA**, **Poll status now** and **Remove HA config** are shown to everyone but the server allows them only to an **organization administrator** of the row’s organization, or a superuser; anyone else gets *Write access requires organization manager/admin role.*',
    'Both routers must be in the same organization and already registered on the controller. A router can be the **primary** of only one pair, so routers that already have a row are not offered as primary.',
    'The primary router must be reachable from the controller (over its ZeroTier management address, its management IP or its last known IP) and must have a device key — every setup step is sent to it.',
    'The **secondary** router’s SSH password must be stored in its access credentials: the controller looks for an enabled credential with a password on the secondary, then on the primary, then in the controller’s `HA_DEVICE_SSH_PASSWORD` setting. Without one the setup stops before touching the routers.',
    'On site, before you start: identical hardware and interfaces on both routers, a dedicated LAN interface on each for the heartbeat, both connected through a switch on the same broadcast domain. The panel lists these but cannot check them.',
    'Plan a maintenance window: **setting up a pair reconfigures both routers, and the panel warns that the secondary reboots.**',
  ],
  tasks: [
    {
      title: 'Set up HA on two routers',
      steps: [
        'Open **Network › High Availability › HA Devices** and press **Set up HA**. The **Set up high availability** panel opens at step 1 of 5.',
        '**Requirements** — read the four site requirements and press **Continue ›**. Nothing is checked here.',
        '**Devices** — choose the **Organization**, then the **Primary device**, then the **Secondary (peer) device**. Choosing each router makes the controller read its interfaces, to fill in the LAN addresses on the next step. **Continue ›** stays grey until all three are chosen.',
        '**Node config** — check the **Primary LAN IP** and **Secondary LAN IP** (fill them in by hand if a router did not answer — its LAN address, not its management IP), adjust the **Hostname** if you want, and type a **Cluster password**. Press **Continue ›**.',
        '**HA interface** — choose the **HA interface** the routers exchange heartbeats on and type the **Virtual IP (CIDR)**. Press **Continue ›**.',
        '**Review** — check the summary. The panel warns: *This creates the pair and pushes the configuration to both routers. The secondary node reboots.* Press **Create & deploy**.',
        'Wait. The panel shows *Creating the HA pair…*, then *Configuring both nodes… the secondary reboots, so this takes a while.* It cannot be closed while it works. On success it closes with *HA configured on ‹primary› and ‹secondary›.* and the row shows **enabled** / **master**.',
      ],
      after: [
        '**This changes both live routers.** There is no dry run and no undo on this page; see *What Create & deploy does* below for each step.',
        '**Create & deploy is two operations.** First the controller saves the pair (the row appears, *unconfigured*), then it configures the routers. If the second part fails, the row stays: the panel stays open with a red message, says *The pair was created but the routers were not configured.*, and the button becomes **Retry setup**, which reuses the saved row. If you close the panel instead, the primary is no longer offered on a new panel — see *When it does not work*.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Ask a router for its HA state now',
      steps: [
        'Open the row’s **⋮** menu and choose **Poll status now**.',
        '*Polled ‹device›.* means the router answered; its **Status**, **VRRP state**, **Last sync** and **Last polled** are updated from the answer.',
      ],
      after: [
        'This only reads the router’s HA status; it changes nothing on the router. If the router does not answer, the toast reads *Could not reach ‹device›: ‹reason›* and the row keeps its previous values.',
        'You rarely need it for an enabled pair: the controller polls every **enabled** row by itself once a minute (see *How the rows stay current*). Rows in any other status are only updated by this action.',
      ],
    },
    {
      title: 'Stop the controller tracking a pair',
      steps: [
        'Open the row’s **⋮** menu and choose **Remove HA config**.',
        'Confirm *Remove HA config for ‹device›?* with **Remove**. *Removed HA config for ‹device›.* confirms it.',
      ],
      after: [
        '**This removes only the controller’s record** — the row and its stored interface records. As the dialog says: *The controller stops tracking this pair. Keepalived on the router is NOT touched — reset HA on the device itself if you want it stopped there too.* The two routers keep running as a pair and keep the virtual IP.',
        'To stop HA on the routers from the controller, do it **before** removing the row: **⋮ › Edit in admin** opens the row in the Django admin, which has a **Reset HA** button. Once the row is removed, the controller has nothing to reset from.',
        'The removal cannot be undone; to track the pair again, build it again with **Set up HA**.',
      ],
    },
    {
      title: 'Find a pair',
      steps: [
        'Pick a status in **All statuses** — for example **Error** to see pairs whose setup failed.',
        'Or type a device name, peer name, peer IP or virtual IP into **Search device, peer or VIP…**.',
        'Click a device or peer name to open that router’s page, or use **⋮ › Open device**.',
      ],
    },
  ],
  forms: [
    {
      title: 'Set up high availability',
      source: 'features/ha/HaSetupDrawer.jsx',
      opens: 'Opened by **Set up HA** (in the header, or in the empty list). The fields are spread over steps 2–4 of the panel; **Continue ›** stays grey until the required ones on that step are filled. Everything starts empty except where *Starts at* says otherwise.',
      fields: {
        Organization: { example: 'Acme Retail', what: 'Changing it clears both device choices.' },
        'Primary device': {
          example: 'mumbai-br-fw1',
          drop: ['Every device in this organization already has an HA configuration.'],
          what: 'The router that owns the cluster and syncs its configuration to the secondary. Only this router gets a row on the list, with **Role** *Primary*. Choosing it fills **Hostname** and reads its LAN address into **Primary LAN IP**.',
          checks: ['device: Device must belong to the selected organization.'],
        },
        'Secondary (peer) device': {
          example: 'mumbai-br-fw2',
          what: 'Any other router of the organization. Choosing it reads its LAN address into **Secondary LAN IP**, and its stored SSH password is what the primary uses to configure it.',
          checks: [
            'peer_device: Peer device must differ from the primary device.',
            'peer_device: Peer device must belong to the selected organization.',
          ],
        },
        Hostname: { starts: 'The primary device’s name', example: 'mumbai-br-fw1', what: 'Optional. Sent to the routers as the cluster hostname.' },
        'Primary LAN IP': {
          example: '192.168.1.1',
          drop: ['Reading from the device…'],
          what: 'Read from the primary as its first interface with a static address. Must be an IP address (a `/prefix` is accepted).',
          checks: ['Invalid primary_ip: ‹value›'],
        },
        'Secondary LAN IP': {
          example: '192.168.1.2',
          drop: ['Reading from the device…'],
          what: 'Read from the secondary the same way. It is also stored as the row’s **Peer** IP, and the primary connects to the secondary over SSH on it. Loopback and link-local addresses are refused.',
          checks: ['Invalid secondary_ip: ‹value›', 'secondary_ip is blocked (loopback/link-local)'],
        },
        'Cluster password': {
          extra: true,
          required: 'Yes',
          example: 'not-a-real-secret',
          what: '*Node config step.* Shared secret the two nodes authenticate their heartbeat with. Typed into a masked box with a show/hide button. The box says *Up to 32 characters*; the controller does not check the length.',
        },
        'HA interface': {
          example: 'lan',
          drop: ['Reading interfaces from the device…'],
          what: 'The interfaces are read from the primary router (shown as *name (address)*). If it does not answer, the list offers only **lan** and **wan**. Letters, digits, `.`, `_` and `-` only.',
          checks: ['ha_interface: Invalid interface name'],
        },
        'Interface address': { what: 'Shows the chosen interface’s address when the interfaces were read from the router; blank otherwise. For checking only.' },
        'Virtual IP (CIDR)': {
          example: '192.168.1.254/24',
          what: 'The controller only checks that it is an IP address or IP/prefix; it does **not** check the subnet rule above — getting it wrong is found out on the routers.',
          checks: ['Invalid virtual_ip: ‹value›'],
        },
      },
      after: [
        'Errors from **Create & deploy** appear in a red box on the **Review** step, either as the server’s message or as *field: message*.',
        'The cluster options the routers support beyond these (active-active mode, priority, interface monitoring and so on) are not on this panel; the routers get their defaults — active-passive, override on, session pickup on.',
      ],
    },
  ],
  sections: [
    {
      title: 'What Create & deploy does',
      body: [
        '1. **Saves the pair** on the controller: a row for the primary router with **Role** *Primary*, the secondary as its peer and the **Secondary LAN IP** as peer IP. **Status** *unconfigured*.',
        '2. **Checks the request**: the five values (both LAN IPs, cluster password, HA interface, virtual IP) are present and well-formed, and the pair is not already *enabled* or *configuring*. Then it sets **Status** to *configuring* and looks up the secondary’s SSH password. Without one it puts the status back to *unconfigured* and stops.',
        '3. **Configures the routers**, all through the primary router’s HA service: it checks the primary meets the HA requirements; checks it can reach the secondary (a failure here is ignored); writes the HA configuration on the primary (node addresses, virtual IP, cluster password, hostname); has the primary set up the secondary over SSH; adds the LAN interface to the cluster; and restarts multi-WAN (mwan3) on both routers.',
        '4. **Records the result**: **Status** *enabled*, **VRRP state** *master*, the **Virtual IP**, and an interface record for the HA interface.',
        'If the requirements check fails, the status becomes *error* and the message starts *Device validation failed:*. If a later router step fails, the controller sends the primary a reset to undo its half-written configuration, sets the status to *error*, and the message starts *HA setup failed:*.',
      ],
    },
    {
      title: 'How the rows stay current',
      body: [
        'Once a minute the controller asks every **enabled** row’s router for its HA status and updates **VRRP state**, **Status**, **Last sync** and **Last polled**. A router that does not answer is skipped, so its **Last polled** stops moving — a stale time is the sign the controller has lost touch.',
        'When a router’s state flips between *master* and *backup*, the controller sends an **HA failover** notification (if that alert is enabled for the organization): *HA Failover – Device: ‹name› backup (promoted to master)* or *HA Failure – Device: ‹name› master (switched to backup)*. A repeat of the same change within five minutes is not notified again.',
        '**Poll status now** does the same read for one row on demand, for a row in any status.',
      ],
    },
  ],
  verify: [
    'The new row shows **Status** *enabled* and **VRRP state** *master*, with the secondary under **Peer** and your **Virtual IP**.',
    'A minute later **Last polled** has a fresh time.',
    'From a LAN client, the virtual IP answers. Running **Poll status now** shows the same state the router reports.',
  ],
  trouble: [
    ['*Write access requires organization manager/admin role.*', 'You are not an administrator of that organization.', 'Ask an organization administrator or a superuser.'],
    ['*Every device in this organization already has an HA configuration.*', 'Each router of the organization already has a row.', 'Pick another organization, or remove a stale row first.'],
    ['The LAN IP boxes stay empty with *The device did not answer — enter its LAN address (not its management IP).*', 'The controller could not read the router’s interfaces.', 'Type the LAN address yourself. Do not use the management or ZeroTier address — keepalived does not work on it.'],
    ['*SSH password not found. Configure SSH credentials for the peer device in Nexapp Credentials.*', 'Neither router has an enabled access credential with a password, and the controller has no fallback set.', 'Add the secondary’s SSH credential, then press **Retry setup**.'],
    ['*Device validation failed: …*', 'The primary router refused the requirements check (for example, the interface is not suitable).', 'Fix what the message names; the row is now *error*. Press **Retry setup**.'],
    ['*HA setup failed: …*', 'A router step failed after the check. The controller has asked the primary to reset its HA configuration; the row is *error*.', 'Fix what the message names and press **Retry setup**. Check the secondary too — it is not reset automatically.'],
    ['*HA setup failed: Device ‹name› is unreachable (tried: …)*', 'The controller cannot reach the primary router over any of its addresses.', 'Bring the router back online and retry.'],
    ['*Setup already in progress.*', 'The row is *configuring*: another setup is running, or an earlier one ended without recording a result.', 'Wait for the other setup. If none is running, the row is stuck — remove it and set up again.'],
    ['*Device already enabled. Reset before re-setup.*', 'The pair is already set up.', 'Use **Reset HA** on the admin page (**⋮ › Edit in admin**) first.'],
    ['You closed the panel after a failed setup and the primary is no longer offered', 'The row exists, so the router counts as configured.', 'Open **⋮ › Edit in admin** and run its **Setup Wizard**, or remove the row and start again.'],
    ['*Could not reach ‹device›: …* after **Poll status now**', 'The router did not answer, or you are not an organization administrator (the reason follows the colon).', 'Read the reason; check the router is online.'],
    ['**Status** *error* after a poll', 'The router reported a status the controller does not recognise.', 'Open the device and check its HA service.'],
  ],
  shotDir: 'ha-devices',
  shots: [
    { file: 'list.png', what: 'The HA devices list with a pair — Device, Organization, Role, Status, VRRP state, Peer, Virtual IP, Last sync and Last polled.', alt: 'The HA devices list' },
    { file: 'form-new.png', what: 'The Set up high availability panel on the Devices step, with organization, primary and secondary chosen. Taken before Create & deploy is pressed.', alt: 'Setting up an HA pair' },
  ],
};

// --------------------------------------------------------------- HA Controller

const HA_CONTROLLER: AdminNotes = {
  from: [
    'pages/HaController.jsx',
    'features/ha/NodeCard.jsx',
    'features/ha/RepmgrTable.jsx',
    'features/ha/EventsTable.jsx',
    'features/ha/haModel.js',
    'hooks/useCurrentUser.js',
    'services/api.js',
    'high_availability/api/dcdr_views.py',
    'high_availability/tasks.py',
    'high_availability/models.py',
    'high_availability/scripts/dcdr-ha-switchover.sh',
  ],
  title: 'Watching the controller’s own server pair',
  intro: [
    'The controller runs on **two servers** in the data centre. One holds the **primary** PostgreSQL database and the other a **standby** copy that is kept up to date by streaming replication; a keepalived **virtual IP** points at the active one. This page tells you which server is serving you, which is primary, whether the standby is up to date — and lets a superuser swap the two.',
    THREE_PAIRS,
    'The page refreshes itself every 10 seconds (the server caches the answer for 10 seconds, so faster is pointless); **Refresh** asks at once. **Live** in the header turns to **API error** when the status cannot be read.',
    '- **Serving from ‹address›** — the server that answered this page, with its database role.\n- **DC Primary** and **DC Backup** cards — always in the same place with the same address; only the data moves between them. Each shows the **PostgreSQL role**, **VIP holder** (*Holds VIP* or *Standby*) and **Management plane** (ZeroTier). Only the serving server can be read directly; for the other one the role comes from the replication cluster table and the VIP line says *peer (inferred)*, and its management plane shows **--**.\n- **Database replication** — *In sync — backup server is up to date* (streaming, less than 10 MB behind), *Catching up — backup server is syncing* (streaming, further behind) or *Not syncing — backup needs attention*.\n- **Replication cluster nodes** — the replication manager’s (repmgr) own view of the nodes: ID, name, role, status, upstream.\n- **Failover history** — every recorded HA event, newest first, 25 to a page: switchovers, failovers, promotions, replication breaks, split-brain alerts and so on.',
  ],
  before: [
    'The page needs a **staff** account; others see **API error** and *You do not have permission to perform this action.*',
    'The **HA actions** card, and the switchover in it, appear only for **superusers**.',
    'The server addresses come from the controller’s settings (`DCDR_DC_PRIVATE_IP`, `DCDR_DR_PRIVATE_IP`, `DCDR_KEEPALIVED_VIP`); without them the page assumes `192.168.8.90`, `192.168.8.91` and the virtual IP `192.168.8.92`.',
  ],
  tasks: [
    {
      title: 'Check that the standby is ready',
      steps: [
        'Open **Network › High Availability › HA Controller**.',
        'Read **Serving from** — the server you are actually on.',
        'Check that one card shows **PRIMARY** and *Holds VIP*, and the other **STANDBY**.',
        'Check **Database replication** says *In sync — backup server is up to date*.',
        'Check the **Replication cluster nodes** table lists both nodes as *running*.',
      ],
    },
    {
      title: 'Swap the primary to the other server (superuser)',
      steps: [
        'Make sure **Database replication** reads *In sync* — the server refuses otherwise.',
        'In the red **HA actions** card, read the line above the button: *Normal — primary on ‹address› (home)* or *Running on backup — primary is on ‹address›*.',
        'Press the button — **Switch to ‹backup address› (maintenance)** in the normal case, **Return primary to ‹home address›** when running on the backup. Both run the same switchover. The button is grey while the page shows *Determining current primary…*.',
        'Type `switchover` in the box (as *Confirm switchover. Type switchover below to enable Run.* asks) and press **Run**. **Cancel** backs out without doing anything.',
        'Watch the progress bar: *QUEUED*, *STARTING*, *RUNNING*, then *DONE* at 100% — or a red bar and *Action failed: ‹reason›*.',
      ],
      after: [
        '**This changes the live controller.** The server runs the replication manager’s switchover from the standby: the standby is promoted to primary and the old primary is demoted to standby. It cannot be cancelled once **Run** is pressed; to go back, run the switchover again in the other direction.',
        'Before running it the server checks that the server you are on is the PostgreSQL **primary**, that a standby is connected and **streaming**, and that it is no more than 1 MB behind. If not, nothing runs and the card shows *Refused:* with the reasons. Only one action can run at a time.',
        'The action runs only the database switchover. Whether the virtual IP follows is up to the servers’ keepalived setup; check **VIP holder** on the cards afterwards.',
        'An accepted switchover is recorded under **Failover history** as *Manual Switchover*. If it later fails, that record is removed again.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'Event types in the history',
      body: [
        '*Failover (DC-DR)*, *Fallback (DR-DC)*, *Manual Switchover*, *DB Promoted*, *DB Demoted*, *Replication Broken*, *Replication Restored*, *ZT ACCESS_DENIED*, *Health Check Failed*, *Health Check Recovered*, *HA Split-Brain Detected*. Most are written by the servers’ own failover scripts; *Manual Switchover* comes from this page, and *HA Split-Brain Detected* from the controller’s check of **router** HA pairs, so router events appear here too.',
        '**Source** and **Target** are the servers the event moved from and to; **Duration** is how long it took, when the script reported it; **Details** shows the event’s extra fields as `key=value`.',
      ],
    },
  ],
  verify: [
    'After a switchover, **Serving from**, the role badges and **VIP holder** show the new primary, and **Database replication** returns to *In sync* within a few refreshes.',
    'A *Manual Switchover* row is at the top of **Failover history**.',
  ],
  trouble: [
    ['**API error** with *You do not have permission to perform this action.*', 'Your account is not staff.', 'Ask a superuser.'],
    ['*Refused: this node is not the PostgreSQL primary — run failback from the active/primary node*', 'The request reached the standby server.', 'Open the page through the controller’s virtual IP so the primary answers, then retry.'],
    ['*Refused: no streaming standby connected — refusing (need a caught-up standby to promote)*', 'The standby is down or not replicating.', 'Fix replication first; **Database replication** must read *In sync*.'],
    ['*Refused: replication lag ‹n› bytes exceeds 1048576 — standby not caught up*', 'The standby is more than 1 MB behind.', 'Wait until it catches up and retry.'],
    ['*an HA action is already in progress*', 'Another switchover is running, or one finished while nobody had the page open.', 'Wait — the lock clears when a page reads the finished result, and by itself after 10 minutes.'],
    ['*superuser required*', 'Only superusers may run the switchover.', 'Ask a superuser.'],
    ['*Action failed: timeout* or *Action failed: ‹message›*', 'The switchover script timed out (5 minutes) or failed; the message is its output.', 'Check both servers’ replication manager and PostgreSQL before trying again.'],
    ['*No replication cluster nodes found* — *The repmgr status file has not been written yet — run setup-repmgr.sh to enable its cron job.*', 'The servers’ repmgr status job is not installed.', 'Run `setup-repmgr.sh` on the servers. **Database replication** above is still correct.'],
    ['The cards look swapped or the **Serving from** line is missing', 'The server could not detect its own address, or the addresses in settings do not match the servers.', 'Set `DCDR_DC_PRIVATE_IP` and `DCDR_DR_PRIVATE_IP` to the servers’ real addresses.'],
  ],
  shotDir: 'ha-controller',
  shots: [
    { file: 'page.png', what: 'The HA Controller page: the Serving from line, the DC Primary and DC Backup cards, Database replication, Replication cluster nodes and Failover history.', alt: 'The HA Controller page' },
  ],
};

// ------------------------------------------------------------ DR Control Panel

const DR_PANEL: AdminNotes = {
  from: [
    'pages/HaDrPanel.jsx',
    'features/ha/RepmgrTable.jsx',
    'features/ha/EventsTable.jsx',
    'features/ha/haModel.js',
    'services/api.js',
    'high_availability/api/dcdr_views.py',
    'high_availability/models.py',
  ],
  title: 'Checking that the DR site has your data',
  intro: [
    'The controller’s database is copied, change by change, from the **data centre** to a **disaster-recovery (DR) site**. If the data centre is lost, the DR site has a copy. This page answers one question — **is that copy up to date?** — and shows the two sites and the history of switches between them.',
    THREE_PAIRS,
    '<Callout type="info">**Read-only.** Nothing on this page changes anything; there is no failover or failback button here. **Refresh** only re-reads the status. The page also refreshes itself every 10 seconds.</Callout>',
    '- **The verdict** at the top: *Protected — the DR site has an up-to-date copy of your data* (copying, nothing behind), *Protected — DR is catching up* (copying, some bytes behind), or *Not copying — the DR site is not receiving updates*.\n- **Data-loss risk** — *None*, *Minimal* or *At risk*, matching the verdict.\n- **Replication lag** — how far the copy is behind, in bytes.\n- **Devices online** — routers whose monitoring status is OK, out of all registered routers.\n- **Uptime** — this site over the last 30 days, worked out from the history: time from each *Failover (DC-DR)* until the next *Fallback (DR-DC)* or *Manual Switchover* counts as down.\n- **The two sites** — **Data centre** and **DR site**, each with its role badge; an arrow between them reads *Copying*, *Catching up* or *Not copying*. The site serving this page is marked *you are here* and shows **Task workers**, **DB connections**, **Database size**, **Management plane**, **Uptime** and **Last seen**; the other site cannot be read from here and shows a note instead.\n- **Replication cluster** — the replication manager’s (repmgr) node table, with **Location**.\n- **Site switch history** — the last 50 events between this site and DR, from the last 90 days. Switches between the two servers inside the data centre are left out; they are on **HA Controller**.',
  ],
  before: [
    'The page needs a **staff** account; others see *Status unavailable*.',
    'Everything is read on the server that answers the page. Open it on the other site to see that site’s own figures.',
  ],
  tasks: [
    {
      title: 'Check the DR copy',
      steps: [
        'Open **Network › High Availability › DR Control Panel**.',
        'Read the verdict. Green *Protected — the DR site has an up-to-date copy of your data* means nothing would be lost if the primary failed now.',
        'If it says *catching up*, watch **Replication lag** fall over the next refreshes.',
        'If it says *Not copying*, check that the DR site is reachable and its database is running, and tell your administrator.',
      ],
    },
  ],
  forms: [],
  verify: [],
  trouble: [
    ['*Status unavailable* with *You do not have permission to perform this action.*', 'Your account is not staff.', 'Ask a superuser.'],
    ['*Not copying — the DR site is not receiving updates*', 'No standby is streaming from this server.', 'Check the link to the DR site and the database there.'],
    ['**Replication lag** shows **—** while copying', 'The page is served by the standby, which does not report a byte lag.', 'Expected; streaming there means up to date.'],
    ['The other site says *Not visible from this server. Open this page on the other site to see its own figures.*', 'Only the serving server can be read.', 'Open the page on the other site.'],
    ['*repmgr has not reported any nodes*', 'The replication manager’s status file is missing or empty.', 'Run `setup-repmgr.sh` on the servers. The verdict above does not depend on it.'],
    ['*No switch between this site and DR has been recorded.*', 'No cross-site event in the last 90 days.', 'Nothing to fix.'],
  ],
  shotDir: 'dr-panel',
  shots: [
    { file: 'page.png', what: 'The DR Control Panel: the verdict, the four tiles, the two sites with the copying arrow, the replication cluster and the site switch history.', alt: 'The DR Control Panel' },
  ],
};

export const HA_NOTES: Record<string, AdminNotes> = {
  '/ha/devices': HA_DEVICES,
  '/ha/controller': HA_CONTROLLER,
  '/ha/dr': DR_PANEL,
};
