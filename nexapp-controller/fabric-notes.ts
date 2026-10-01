/**
 * Guide notes for Overlay Networks › SD-WAN Fabric, the Dashboard and
 * Intelligence › Monitoring › Recover deleted metrics — rendered by
 * `guide-admin.ts` (see GUIDE_REGISTRY there). Every claim was checked against
 * the files named in `from` (paths under `frontend/src/` unless they start with
 * a backend app).
 */
import type { AdminNotes } from './admin-notes.ts';

// ------------------------------------------------------------ SD-WAN Fabric

const FABRIC: AdminNotes = {
  from: [
    'pages/TopologyList.jsx',
    'pages/TopologyWizard.jsx',
    'pages/TopologyDetail.jsx',
    'components/WizardShell.jsx',
    'features/sdwan/wizardModel.js',
    'features/sdwan/useWizardDevices.js',
    'features/sdwan/DevicePickerDrawer.jsx',
    'features/sdwan/DeviceSlot.jsx',
    'features/sdwan/WanMemberTable.jsx',
    'features/sdwan/WanMemberDrawer.jsx',
    'features/sdwan/steps/BasicsStep.jsx',
    'features/sdwan/steps/HubStep.jsx',
    'features/sdwan/steps/SpokesStep.jsx',
    'features/sdwan/steps/EncryptionStep.jsx',
    'features/sdwan/steps/PolicyStep.jsx',
    'features/sdwan/steps/ReviewStep.jsx',
    'features/sdwan/LifecycleBar.jsx',
    'features/sdwan/TopologyEditDrawer.jsx',
    'features/sdwan/PolicyPanel.jsx',
    'features/sdwan/AddDeviceDrawer.jsx',
    'features/sdwan/DeviceEditDrawer.jsx',
    'features/sdwan/tabs/DevicesTab.jsx',
    'features/sdwan/tabs/WanMembersTab.jsx',
    'features/sdwan/tabs/ConfigTab.jsx',
    'features/sdwan/tabs/HistoryTab.jsx',
    'sdwan_tunnel/api/nsbond_views.py',
    'sdwan_tunnel/api/nsbond_serializers.py',
    'sdwan_tunnel/models/nsbond_topology.py',
    'sdwan_tunnel/tasks/nsbond_deploy.py',
    'sdwan_tunnel/tasks/nsbond_undeploy.py',
    'sdwan_tunnel/signals.py',
  ],
  title: 'Building and deploying an SD-WAN fabric',
  intro: [
    'A **topology** is one SD-WAN overlay: a set of routers in one organization, each a **hub** or a **spoke**, joined by encrypted tunnels over their WAN links (**WAN members**). Two shapes are offered when creating one: **Hub & Spoke** (every spoke tunnels to the hub, optionally with full mesh between spokes) and **Site to Site** (exactly two routers, both configured as peers).',
    'Getting a fabric onto the routers is four separate actions, and only the last one touches them:\n\n1. **Create** (the wizard) — writes the topology, its device rows and WAN members to the controller and allocates an overlay IP per device. Nothing is sent to any router.\n2. **Compute** — allocates overlay IPs, BGP AS numbers and the hub/peer address each device dials; creates default WAN members where a device has none. Controller only.\n3. **Validate** — a check-by-check pre-flight on the controller’s data. Controller only.\n4. **Deploy** — writes the overlay configuration to every router and restarts its bonding daemon. Traffic through those routers is interrupted.',
    'The list shows each topology’s **Name**, **Type**, **Status**, **Overlay subnet**, how many **Devices**, **Hubs** and **Spokes** it has, and **Features** flags (BGP, OSPF, Mesh, QoS, HA). **Filter by name or type…** narrows the list in the browser. Click a row to open it.',
  ],
  before: [
    'You need the **view** (or change) permission on SD-WAN topologies to see the list. **New topology** needs the **add** permission, **Edit** the **change** permission and **Delete** the **delete** permission; the list hides each control you lack. Every button that posts to the server — Create, Compute, Validate, Deploy, Rollback, staging a policy, adding, removing or redeploying a device — needs the **add** permission too.',
    'Each router must already be registered in the controller, belong to the topology’s organization, and not belong to another topology. The wizard offers only devices the controller can reach at that moment.',
    'For **Deploy**, every router must have a management IP (it has joined the controller’s management mesh). Deploy refuses the whole topology otherwise.',
    'If the hub sits behind NAT, know the public or port-forwarded IPv4 address spokes should dial — the **Hub public endpoint**. Validation fails a hub with a private WAN IP and no public endpoint.',
    'Only policies with **Apply fleet-wide** turned on (global templates) can be chosen in the wizard or on the **Policies** tab.',
  ],
  tasks: [
    {
      title: 'Create a topology with the wizard',
      steps: [
        'Open **Overlay Networks › SD-WAN Fabric** and press **New topology**. The page **New SD-WAN topology** opens with six steps — five for Site to Site, which has no Spokes step. **Continue ›** checks the current step before moving on; a completed step’s circle can be clicked to go back to it.',
        '**Basics** — type the **Topology name** and choose the **Organization** (fixed when you belong to only one). Pick **Hub & Spoke** or **Site to Site**; for Hub & Spoke, **Enable full mesh** lets spokes build direct tunnels to each other. Check **Overlay IP subnet** (default `10.254.0.0/24`) and **Tunnel MTU** (default `1400`, 1280–1500). Leave **SD-WAN mode** on *SD-WAN Fabric (encrypted overlay)*. Choose **Internet breakout** and **Datapath mode**.',
        '**Hub** (named **Peers** for Site to Site) — click **Choose a device** under **DC Primary Hub** and pick a router from the drawer. Turn on **DC high availability** to add a **DC Backup**, and **Disaster recovery site** to add a **DR Primary** (and **DR high availability** for a **DR Backup**). For Site to Site, choose **Site A** and **Site B**. Fill **Hub public endpoint** if the hub is behind NAT.',
        'As each router is chosen, the controller reads its WAN interfaces (*Detecting WAN interfaces…*) and fills its WAN member table. Check the members: **Add member**, the pencil to edit, the bin to remove. If detection fails, one member named `wan` is filled in for you to correct, with a **Retry** button.',
        '**Spokes** (Hub & Spoke only) — press **Choose spoke devices**, tick the routers (**Select all** ticks every one listed) and press **Use N devices**. Check each spoke’s WAN members the same way. **Remove** drops a spoke.',
        '**Encryption** — choose the **Session mode** card (*Bonded (Auto)* is preselected). Leave **Cipher** on *AES-256-GCM (recommended)* — see *Things to know*. Turn on **Forward error correction** if a link is lossy, then choose its **FEC mode**.',
        '**Policy Engine** — all optional. **Enable BGP** (with a **Base AS number**, default `65001`), **Enable OSPF**, **Enable adaptive QoS**, each with an optional policy template. For Hub & Spoke, the four **Performance SLA** dropdowns each either pick one global template or, left on *— Clone all global templates —*, copy every global template of that kind into the topology.',
        '**Review** — check the summary; each **Edit** jumps back to its step. Press **Create topology**.',
      ],
      after: [
        'On success the toast says *“‹name›” created.* and you return to the list, where the topology is **Draft**. It is not on any router yet — open it and run Compute, Validate and Deploy.',
        'Changing **Organization** after picking devices clears every device choice. The device list refreshes every 15 seconds; a router that becomes unavailable meanwhile is dropped with *No longer available, removed from this topology: …*.',
        'Creating also adds a path monitor named **Default Health Check** (ping to `8.8.8.8` every 1000 ms) to the topology.',
      ],
      shot: 'wizard.png',
    },
    {
      title: 'Compute, validate and deploy',
      steps: [
        'Open the topology from the list. Under the header, the lifecycle bar shows **Compute**, **Validate**, **Deploy** and, apart, **Rollback**. A button that does not apply yet is greyed out with the reason underneath (*Compute the topology first.*, *Nothing has been deployed yet.*, *Not while a deploy is running.*).',
        'Press **Compute**. The toast says *Computed — overlay IPs and AS numbers allocated.* and the status becomes **Computed**. On the **Devices** tab each device now has an **Overlay IP** instead of *not computed*.',
        'Press **Validate**. A report appears listing only what did not pass (topology checks, then each device’s failing checks) with a **Dismiss** button; the toast says *Validation passed — N checks.* or *Validation failed N checks.* A failure sets the status to **Error**; otherwise **Validated**.',
        'Fix what failed (usually **Hub public endpoint**, WAN members, or a router that is offline), Compute again, and Validate again.',
        'Press **Deploy** and confirm *Deploy ‹name›?* — *This writes configuration to every device in the topology and restarts their bonding daemons. Traffic on those routers will be interrupted.* The toast says *Deploy started. Watching progress…*; a progress bar shows the phase, `completed/total` and the device being worked on.',
      ],
      after: [
        'Deploy runs in the background: hubs first, one at a time, then spokes in parallel batches. Before writing to a router it saves a snapshot of the router’s current overlay settings, which **Rollback** uses later.',
        'When it settles the toast says *Deploy finished — topology is deployed.*, *Deploy finished with errors. Check the device rows.*, or *Deploy finished. Topology is now ‹status›.* If half or more of the devices failed, the topology is **Error** and each failed router is restored from its snapshot; with fewer failures it is **Deployed** even though some devices failed — check the **Config** column on the **Devices** tab.',
        'If any device has no management IP, nothing is deployed: the topology goes to **Error** and those devices carry *No management_ip — mesh not joined*.',
      ],
      shot: 'detail.png',
    },
    {
      title: 'Roll back a deployment',
      steps: [
        'On a **Deployed** or **Error** topology, press **Rollback** and confirm *Roll back ‹name›?* — *Every device is restored to its previous snapshot. Anything deployed since is lost.*',
      ],
      after: [
        'Each deployed router is given back the overlay settings and WAN members from before its last successful deploy. A router with no usable snapshot has its overlay **disabled** instead. Afterwards the topology is **Deployed** if every router was restored, **Error** if every one failed, otherwise **Computed**.',
      ],
    },
    {
      title: 'Change a topology’s settings',
      steps: [
        'Press **Edit** in the header (or **⋮ › Edit** on the list). The **Edit ‹name›** drawer opens.',
        'Change **Topology name**, **Overlay IP subnet** (locked while deployed), **Tunnel MTU**, **Session mode**, **Cipher**, and the **Full mesh**, **BGP** (with **Base AS number**), **OSPF** and **Adaptive QoS** switches.',
        'Press **Save changes**. Only changed fields are sent; the toast says *Saved N changes.*',
      ],
      after: [
        'Saving changes the controller only. For a topology that is not Draft the drawer says so: recompute and redeploy to push the change to the routers.',
        'Devices, WAN members and the topology type cannot be changed here — use the **Devices** tab.',
      ],
    },
    {
      title: 'Add, edit, redeploy or remove a device',
      steps: [
        'Open the **Devices** tab. Search by name, overlay IP or node, or filter **All roles** / **Hubs** / **Spokes**.',
        '**Add device** (greyed out for Site to Site, which is exactly two devices): choose **Add as** *Spoke* or *Hub*, tick the routers, optionally give a single router a **Node ID**, and press **Add N devices**. The toast says *Added N devices as ‹role›. Run Compute to allocate overlay IPs.*; routers that could not be added are listed with the reason.',
        'Pencil — **Edit ‹device›**: change **Node ID**, **Role**, **WAN mode**, and for a hub its **Public endpoint**, for a spoke its **Backup hub IP** and **MPLS hub IP**. Overlay IP, hub/peer IP, public WAN IPs, BGP AS and config status are shown read-only under *Computed by the controller*.',
        'Circular arrow — **Redeploy**: confirm *Redeploy ‹device›?* to rewrite the configuration on that router only (its bonding daemon restarts). The toast says *Redeploy started for ‹device›.*',
        'Bin — **Remove**: confirm *Remove ‹device› from this topology?*',
      ],
      after: [
        'Adding a device, removing one, or saving a device edit changes the controller only. Adding or removing sets a non-Draft topology back to **Computed** — run Compute, Validate and Deploy again.',
        'When BGP is on, adding a **Hub** shifts every existing spoke’s AS number (the drawer warns about it), so the next deploy re-establishes their BGP sessions.',
        'See *When it does not work* about **Remove** in this version.',
      ],
    },
    {
      title: 'Attach policies to the topology',
      steps: [
        'Open the **Policies** tab. Each row — **BGP**, **OSPF**, **QoS**, **Performance SLA**, **Static routes**, **SNMP**, **NTP**, and under *Security* **InstaShield IP**, **InstaShield DNS**, **IPS**, **Antivirus**, **AntiSpam**, **SSL inspection** — has a dropdown of global templates and a tick button.',
        'Choose a template, or *— No policy —* to detach one, and press the tick. The toast says *‹kind› policy staged. Deploy to push it to the routers.*',
      ],
      after: [
        'Staging changes the controller only; nothing reaches a router until you **Deploy**. Staging also switches the matching feature on, and detaching switches it off — choosing *— No policy —* for **BGP** turns BGP off for the topology.',
        'A row reading *— None available —* has no global template of that kind.',
      ],
    },
    {
      title: 'Delete a topology',
      steps: [
        'Press **Delete** in the header (or **⋮ › Delete** on the list; tick several rows to use **Delete** on the bar above the table).',
        'Confirm *Delete ‹name›?* — *This starts an undeploy: every device is disabled first, and the topology is removed once that finishes. It does not happen instantly, and it cannot be undone.* — with **Start undeploy**.',
      ],
      after: [
        'The topology shows **Undeploying** while the controller disables the overlay on every router; then the topology, its device rows and their WAN members are deleted, and each device’s overlay IP is released. The topology is deleted even if some routers could not be reached — those keep their overlay configuration.',
        'The routers themselves stay registered in the controller and become available for another topology.',
      ],
    },
  ],
  forms: [
    {
      title: 'the wizard — Basics',
      source: 'features/sdwan/steps/BasicsStep.jsx',
      fields: {
        'Topology name': {
          example: 'Mumbai Enterprise',
          what: 'Up to 128 characters; `<` and `>` are refused.',
          checks: ['Topology name is required.', 'Topology name contains invalid characters (< > not allowed)'],
        },
        Organization: {
          checks: ['Select an organization.'],
        },
        'Enable full mesh': { starts: 'Off', what: 'Hub & Spoke only.' },
        'SD-WAN mode': {
          starts: 'SD-WAN Fabric (encrypted overlay)',
          what: 'Choosing *Internet SD-WAN (no VPN)* only hides breakout and datapath on this step — it is not sent to the server, which creates an encrypted overlay either way (see *Things to know*).',
        },
        'Overlay IP subnet': {
          starts: '10.254.0.0/24',
          what: 'Each device gets an overlay IP from it, hubs first. Must be a CIDR; may not repeat another topology’s subnet in the same organization.',
          checks: ['Overlay IP subnet must be a CIDR, e.g. 10.254.0.0/24.', 'Overlay subnet … is already used by another topology in this organization.'],
        },
        'Tunnel MTU': { starts: '1400', checks: ['Tunnel MTU must be between 1280 and 1500.'] },
        'Internet breakout': {
          starts: 'Split Tunnel (local breakout)',
          what: '*Split* — internet traffic leaves locally at each site; *Full Tunnel* — all internet via the hub; *VPN Only* — no local breakout.',
        },
        'Datapath mode': { starts: 'nsbond Mode (Userspace TUN/UDP)' },
      },
      after: [
        'Topology type is chosen on two cards: **Hub & Spoke** (default) or **Site to Site**.',
      ],
    },
    {
      title: 'the wizard — Hub',
      source: 'features/sdwan/steps/HubStep.jsx',
      fields: {
        'DC high availability': { starts: 'Off', what: 'Adds a **DC Backup** slot, which must then be filled.', checks: ['DC HA is on — select a DC Backup device.'] },
        'Disaster recovery site': { starts: 'Off', what: 'Adds a **DR Primary** slot, which must then be filled. Turning it off clears both DR slots.', checks: ['DR is on — select a DR Primary device.'] },
        'DR high availability': { starts: 'Off', what: 'Only while **Disaster recovery site** is on. Adds a **DR Backup** slot.', checks: ['DR HA is on — select a DR Backup device.'] },
        'Hub public endpoint': {
          example: '203.0.113.10',
          what: 'On the **DC Primary Hub** only. An IPv4 address; spokes dial it instead of the hub’s WAN IP.',
          checks: ['Hub public endpoint must be a valid IPv4 address.'],
        },
        'DC Primary Hub': { extra: true, required: 'Yes', what: 'Hub & Spoke. **Choose a device** opens the device drawer.', checks: ['Select a DC Primary hub device.'] },
        'Site A / Site B': { extra: true, required: 'Yes', what: 'Site to Site. Two different routers.', checks: ['Select a Site A device.', 'Select a Site B device.', 'Site A and Site B must be different devices.'] },
      },
    },
    {
      title: 'a WAN member (Add member / edit)',
      source: 'features/sdwan/WanMemberDrawer.jsx',
      opens: '**Add member** or the pencil in a device’s WAN member table, on the Hub, Peers or Spokes step.',
      fields: {
        Name: { example: 'wan', what: 'Unique on this device.', checks: ['Another member already uses this name or interface.'] },
        Interface: { example: 'wan2', what: 'A dropdown of the detected interfaces, or free text when detection failed. Unique on this device.' },
        Gateway: { example: '192.168.30.1' },
        'Hub destination IP': { example: '172.16.0.1' },
        Port: { starts: 'One above the highest port on this device (first is 5511)' },
        Weight: { starts: '50' },
        Enabled: { starts: 'On' },
      },
    },
    {
      title: 'the wizard — Encryption',
      source: 'features/sdwan/steps/EncryptionStep.jsx',
      fields: {
        Cipher: {
          starts: 'AES-256-GCM (recommended)',
          what: 'Only **AES-256-GCM** is accepted by the server; any other choice makes **Create topology** fail.',
          checks: ['encryption: invalid value'],
        },
        'FEC mode': { starts: 'Adaptive — Dynamic based on loss', what: 'Only while **Forward error correction** is on.' },
        'Forward error correction': { starts: 'Off' },
        'Session mode': {
          extra: true,
          starts: 'Bonded (Auto)',
          what: 'Five cards: **Bonded (Auto)**, **Weighted**, **SLA**, **Duplicate**, **Packet**.',
        },
      },
      after: [
        'The pre-shared key is generated for you; it is stored encrypted and never shown. IKE and ESP settings follow the cipher; dead-peer detection runs every 5 s and keys rekey every 4 hours.',
      ],
    },
    {
      title: 'the wizard — Policy Engine',
      source: 'features/sdwan/steps/PolicyStep.jsx',
      fields: {
        'Enable BGP': { starts: 'Off' },
        'Base AS number': { starts: '65001', checks: ['Base AS number must be between 1 and 4294967295.'] },
        'BGP policy template': { starts: '— Use system defaults —' },
        'Enable OSPF': { starts: 'Off' },
        'OSPF policy template': { starts: '— Use system defaults —' },
        'Enable adaptive QoS': { starts: 'Off' },
        'QoS policy template': { starts: '— Use system defaults —' },
        'Path monitor policy / SLA thresholds policy / Traffic steering policy / Tenant policy': {
          extra: true,
          starts: '— Clone all global templates —',
          what: 'Hub & Spoke only. Pick one global template to copy into the topology, or leave blank to copy every global template of that kind.',
        },
      },
    },
    {
      title: 'Edit topology',
      source: 'features/sdwan/TopologyEditDrawer.jsx',
      opens: '**Edit** in the topology header, or **⋮ › Edit** on the list.',
      fields: {
        'Topology name': { checks: ['Name is required.'] },
        'Overlay IP subnet': {
          what: 'A private IPv4 network between /16 and /28. Already-allocated overlay IPs are not re-addressed — recompute afterwards.',
          checks: ['Subnet prefix must be between /16 and /28 (got /…).', 'Overlay subnet must be a private network (RFC 1918).'],
        },
        'Tunnel MTU': { checks: ['Ensure this value is less than or equal to 1500.', 'Ensure this value is greater than or equal to 1280.'] },
        Cipher: { what: 'Only **AES-256-GCM** is accepted.', checks: ['"‹value›" is not a valid choice.'] },
        'Full mesh': { checks: ['Mesh mode requires at least 2 devices in the topology.'] },
        'Base AS number': { what: 'Only while **BGP** is on.', checks: ['BGP base AS number is required when BGP is enabled.'] },
      },
    },
    {
      title: 'Edit device',
      source: 'features/sdwan/DeviceEditDrawer.jsx',
      opens: 'The pencil on a row of the **Devices** tab.',
      fields: {
        'Node ID': { example: 'DC-Primary', what: 'Blank falls back to the device name.', checks: ['Node ID … is already used in this topology.'] },
        Role: {
          what: 'Locked for Site to Site and while the topology is deployed. The only hub cannot be made a spoke.',
          checks: ['This is the only hub in the topology. Promote another device first.'],
        },
        'WAN mode': { starts: 'Auto — derive from WAN members' },
        'Public endpoint': { example: '203.0.113.10', what: 'Hubs only.' },
        'Backup hub IP': { example: '203.0.113.20', what: 'Spokes only.' },
        'MPLS hub IP': { example: '172.16.0.1', what: 'Spokes only.' },
      },
    },
  ],
  sections: [
    {
      title: 'The detail page',
      body: [
        'Under the name and status badge, five tiles: **Encryption** (IPsec or None, with the cipher), **Topology** (type; *Full mesh* or *Hub-terminated*), **Devices** (with hubs and spokes), **WAN links** (with the session mode) and **Overlay** (subnet and MTU).',
        '- **Devices** — **Name** (links to the device), **Role**, **Overlay IP**, **Node ID**, **WAN links**, **Config** (that router’s deploy status), and **Latency**, **Jitter**, **Loss** from the live status poller, refreshed every 15 seconds once the topology is past Draft; *—* means no reading.\n- **WAN members** — every member of every device: **Device**, **Role**, **Interface**, **Gateway**, **Hub dst IP**, **Port**, **Weight**, **Priority**, **Zone**, **Status**. Read-only.\n- **Policies** — see *Attach policies to the topology*.\n- **Configuration** — every stored setting, read-only, including those the Edit drawer does not show (IKE proposal, DPD delay, rekey time, HA and DR flags, who created it and when).\n- **History** — newest first, filterable by event, paged on the server: created, settings changed, validated, deployed, rolled back, devices added and removed, by whom and when.',
      ],
    },
    {
      title: 'Statuses',
      body: [
        '**Draft** — created, never computed. **Computed** — addresses allocated; also where adding or removing a device puts it. **Validated** — last validation had no failures. **Deploying** / **Undeploying** — a deploy, rollback or delete is running. **Deployed** — on the routers. **Error** — validation failed, compute failed, or a deploy failed on half or more of the devices.',
      ],
    },
    {
      title: 'Things to know',
      body: [
        '- **Only AES-256-GCM works.** The wizard and the Edit drawer offer five ciphers, but the server accepts only `aes256gcm`.\n- **Internet SD-WAN (no VPN) is not sent.** The *SD-WAN mode* choice is not part of what the wizard sends; the topology is stored with an encrypted overlay (or *VPN only* when that breakout is chosen).\n- **The DR choice is not stored as DR.** Turning on **Disaster recovery site** adds the DR hubs and switches on high availability, but the topology’s **Disaster recovery** setting stays *Disabled* (Configuration tab).\n- **Validate runs only from Computed or Error.** On a Validated or Deployed topology the button is offered but the server refuses — press **Compute** first.',
      ],
    },
  ],
  verify: [
    'The topology’s status badge reads **Deployed** and the Devices tab shows each device with an overlay IP and a **Config** status of deployed.',
    'The **History** tab has a *Deployed* entry.',
  ],
  trouble: [
    ['*encryption: invalid value* when creating', 'A cipher other than AES-256-GCM was chosen.', 'Go back to **Encryption** and choose **AES-256-GCM (recommended)**.'],
    ['A router is missing from the device drawer', 'It is offline, in another organization, already in a topology, or — in an organization with more than 50 free routers — past the first 50 by name, which are the only ones checked for reachability.', 'Bring it online or remove it from its other topology. *Reachability could not be checked* in the drawer means every device is listed.'],
    ['*No devices available* in the drawer', 'Every online router in the organization is already chosen or in another topology.', 'Free a router, or register a new one.'],
    ['*Could not read WAN interfaces from ‹device›: … Edit the members below by hand.*', 'The controller could not reach the router to read its interfaces.', 'Press **Retry**, or edit the placeholder `wan` member by hand.'],
    ['*Devices already assigned to topology: […]*', 'A router was added to another topology while you were in the wizard.', 'Pick another router.'],
    ['*Overlay subnet … is already used by another topology in this organization.*', 'Subnets are unique per organization.', 'Choose another, e.g. `10.254.1.0/24`.'],
    ['*Cannot compute: topology needs at least N device(s), has M.*', 'Too few devices (two for Site to Site).', 'Add devices first.'],
    ['*Topology computation failed. Check server logs.*', 'Compute hit an error; the topology is now **Error**.', 'Ask an administrator to check the server log.'],
    ['*Cannot validate: topology is \'validated\'. Run Compute first.*', 'Validate runs only from Computed or Error.', 'Press **Compute**, then **Validate**.'],
    ['Validation: *Hub WAN IP … is private (RFC1918) and no public_endpoint is set …*', 'The hub is behind NAT.', 'Edit the hub on the Devices tab, set **Public endpoint**, Compute and Validate again.'],
    ['Validation: *No enabled WAN members.* / *Device is critical/offline. Deploy will fail.*', 'The router has no usable uplink, or is offline.', 'Fix the members or the router, then Compute and Validate again.'],
    ['Deploy ends in **Error** with *No management_ip — mesh not joined* on devices', 'Those routers have not joined the controller’s management mesh.', 'Get them online on the mesh, then Deploy again.'],
    ['**Remove** on a device fails with *Device not found in this topology*', 'The Devices tab sends the router’s id where the server expects the topology membership id (product gap).', 'Report it — until it is fixed, a device cannot be removed from this page.'],
    ['*Policy … not found, not global, or not in topology\'s organization scope.*', 'The template is not global, or belongs to another organization.', 'Turn **Apply fleet-wide** on for the policy, in the topology’s organization.'],
    ['The validation report says *0 checks failed* while the toast says *Validation passed*', 'Only warnings were found (for example *Monitoring status unknown. Device may be offline.*); the report lists every check that did not pass, warnings included.', 'The topology is **Validated** — read the warnings, then Deploy.'],
    ['*Undeploy already in progress.*', 'A delete is already running.', 'Wait; the topology leaves the list when it finishes.'],
  ],
  shotDir: 'sd-wan-fabric',
  shots: [
    { file: 'list.png', what: 'The SD-WAN Topologies list — status badges, overlay subnet, device, hub and spoke counts, and feature flags.', alt: 'The SD-WAN Fabric list' },
    { file: 'wizard.png', what: 'The New SD-WAN topology wizard on the Hub step — the DC Primary Hub slot with its WAN member table.', alt: 'The topology wizard' },
    { file: 'detail.png', what: 'A topology’s page — the five tiles, the Compute, Validate, Deploy and Rollback bar, and the Devices tab.', alt: 'A topology’s detail page' },
  ],
};

export const FABRIC_NOTES: Record<string, AdminNotes> = {
  '/topologies': FABRIC,
};

// ---------------------------------------------------------------- Dashboard

const DASHBOARD: AdminNotes = {
  from: [
    'pages/Dashboard.jsx',
    'components/dash/UplinkTable.jsx',
    'components/dash/UsageTiles.jsx',
    'components/dash/OnlineUsers.jsx',
    'components/SiteMap.jsx',
    'components/GaugeCard.jsx',
    'components/DonutCard.jsx',
    'components/TrafficBars.jsx',
    'components/InteractiveChart.jsx',
    'sdwan_tunnel/api/nsbond_views.py',
    'accesslog/views.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/monitoring/api/views_dashboard.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/monitoring/services/data_usage.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/monitoring/api/views.py',
  ],
  title: 'Reading the dashboard',
  intro: [
    'The dashboard is the controller’s home page: how many routers and WAN links are up, where the routers are, what the fleet is made of, who is signed in, and — on two tabs at the bottom — every WAN uplink and the traffic the fleet carried.',
    '<Callout type="info">**Read-only, with one exception.** Nothing here changes a router. The only thing you can set is the **Path label** of a WAN uplink, in the WAN uplinks table — a label stored on the controller.</Callout>',
  ],
  before: [
    'Everything you see is limited to the organizations you belong to (a superuser sees everything).',
    'The organization / group picker at the top narrows the device panels — **Devices online**, **Uplinks up**, the three rings, the **WAN uplinks** table, **Top devices by traffic** and **Per-WAN-link breakdown**. It does **not** narrow **Devices by site**, **Online admin users**, the **Data usage** tiles, **Top applications**, **Top categories**, **Top clients** or the traffic chart.',
  ],
  tasks: [
    {
      title: 'Find which WAN links are down',
      steps: [
        'Read **Uplinks up** at the top left: links up out of all WAN links, with **Up**, **Down** and **Total** underneath.',
        'Scroll to the **WAN uplinks** tab (open by default). Press the **Down** pill — each pill carries its count, and a pill with nothing to show is greyed out.',
        'Narrow further with **All sites**, **All interfaces**, **All path labels**, or **Search uplinks…** (device, serial number, model, location, interface or IP).',
        'Click a device name to open that device.',
      ],
      after: [
        'The table refreshes every 30 seconds on its own. 10 rows per page by default; the page controls are underneath.',
      ],
      shot: 'uplinks.png',
    },
    {
      title: 'Label a WAN uplink with a path label',
      steps: [
        'Create the labels first under **Overlay Networks › Path Labels** — the **Path label** column shows *—* until at least one exists.',
        'In the **WAN uplinks** table, open the **Path label** dropdown on the uplink’s row and choose a label. Its colour dot appears in the field.',
        'To remove a label, choose *— None —*.',
      ],
      after: [
        'The change is saved as soon as you choose — there is no Save button. If the server refuses, the row goes back to its previous label and a red toast says *Could not set the path label on ‹device›: ‹reason›*.',
        'A label is stored on the controller against the device and the interface name shown in the table (cellular modems appear as **Cellular1**, **Cellular2**). Each uplink carries at most one label. Choosing a label does not send anything to the router.',
        'Any signed-in user can set a label on an uplink of a device in their organizations.',
      ],
    },
    {
      title: 'Look at traffic for a period',
      steps: [
        'Open the **Traffic insights** tab.',
        'Choose the window in the **Data usage** header: **Last 24 hours**, **Last 3 days**, **Last 7 days** (the default), **Last 30 days** or **Last year**.',
        'Read the four tiles, then the ranked panels; **Show N more** under a panel lists the rest.',
        'In the chart at the bottom, switch **Line** / **Bar**, drag across the chart to zoom (**Reset** or a double-click undoes it), and click a legend entry to hide that series.',
      ],
      after: [
        'The window applies to the **Data usage** tiles, **Top applications by traffic**, **Top categories by traffic**, **Per-WAN-link breakdown** and the chart. **Top clients by traffic** is always the current top 10 and ignores it.',
      ],
      shot: 'traffic.png',
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What each card shows',
      body: [
        '- **Devices online** — routers whose monitoring status is *ok*, out of all your routers, with the percentage on the ring and **Online**, **Offline** (status *critical*) and **Total** underneath. The ring turns red below 25 %.\n- **Uplinks up** — WAN links up, out of all WAN links. A WAN link is a cellular modem or an Ethernet interface marked as WAN; it counts as **up** only when the interface reports up **and** its router’s monitoring status is *ok* or *problem*. Every other link is down.\n- **Devices by site** — a map pin per location, sized by its device count and coloured by the worst health of the routers there. Hover a pin for the site name and its routers. *No devices have a location assigned.* when no router has a location.\n- **Device health** — routers by monitoring status: **Online** (ok), **Problem**, **Offline** (critical) and **Register** (no monitoring data yet). The centre is the total.\n- **Device models** and **Firmware versions** — routers by model and by firmware build. The three most common get their own colour; the rest are grouped as **Other**, and routers that never reported one as **Undefined**.\n- **Online admin users** — one row per open browser session on the controller, not per person: **User**, **Signed in from** (device, OS and browser), **Location**, **IP address**, **Signed in** and **Idle**. Your own session is first, marked *It’s you*. A session drops off after 15 minutes without activity. Refreshed every 15 seconds.',
        'Who appears under **Online admin users**: a superuser sees every session; an organization administrator sees the sessions of members of the organizations they manage, plus their own; anyone else sees only their own.',
      ],
    },
    {
      title: 'The WAN uplinks table',
      body: [
        'Columns: **Status** (*Up* or *Down*), **Device**, **Serial number**, **Model**, **Location**, **Interface**, **Path label**, **Address** (IP and mask), **Latency** (shown only while the link is up) and **Loss** (red at 100 %). *—* means the router did not report that value.',
        'The **Disabled** pill counts links with a *disabled* status; the server reports only *up* or *down*, so it stays at 0 and greyed out.',
      ],
    },
    {
      title: 'The Traffic insights tab',
      body: [
        '- **Total traffic**, **Cellular**, **Wired**, **Wi-Fi** — bytes in the window, each with **Upload** and **Download**. Wired counts only Ethernet interfaces marked as WAN. The line behind **Total traffic** is the daily total from the chart data.\n- **Top devices by traffic** — every router in scope, including those at zero, with download and upload as two parts of one bar. Its figures come from each uplink’s last throughput reading where the router reports one, otherwise from the window total — so it does not always match **Per-WAN-link breakdown**.\n- **Top applications by traffic** / **Top categories by traffic** — from the routers’ DPI reports. *Showing a point-in-time snapshot — historical traffic is unavailable.* under the applications panel means the window could not be read and a current snapshot is shown instead.\n- **Per-WAN-link breakdown** — one bar per WAN link, labelled *device · INTERFACE*, with the window’s download and upload.\n- **Top clients by traffic** — client IPs (or their hostname) by bytes, top 10.\n- The chart — fleet traffic over the window.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['The **Path label** column shows only *—*', 'No path labels are defined.', 'Create them under **Overlay Networks › Path Labels**, then reload.'],
    ['*Could not set the path label on ‹device›: device not found*', 'The label is saved against the controller device whose name equals the hostname the router reports; this router’s hostname differs from its name in the controller, or it is outside your organizations.', 'Rename the device in the controller to match the router’s hostname, or the other way round.'],
    ['*Could not load traffic.* under Traffic insights', 'The traffic chart needs a superuser or an administrator of at least one organization.', 'Ask an administrator, or ignore the chart; the other panels still load.'],
    ['Counts look low on a large fleet', 'The device panels read the first 100 routers only; **Total** is the real count, but online counts, the rings and the uplinks table cover those 100.', 'Narrow the organization / group picker to under 100 routers.'],
    ['**Top devices by traffic** lists a router twice, once at zero', 'Routers are listed by their controller name, uplink traffic by the hostname the router reports; when the two differ they appear as separate rows.', 'Make the device name match the router’s hostname.'],
    ['A link shows **Down** although the interface is up on the router', 'A link counts as up only while its router’s monitoring status is *ok* or *problem*.', 'Check the router’s status on its device page.'],
    ['*No WAN uplinks reported yet.*', 'No router in scope has reported a cellular or WAN Ethernet interface.', 'Wait for the routers to report, or widen the picker.'],
    ['*No other sessions are active right now.*', 'Nobody you are allowed to see is signed in.', '—'],
  ],
  shotDir: 'dashboard',
  shots: [
    { file: 'page.png', what: 'The top of the dashboard — Devices online and Uplinks up, the site map, and the three rings.', alt: 'The dashboard' },
    { file: 'uplinks.png', what: 'The WAN uplinks tab — status pills with counts, the site, interface and path-label filters, and the table with its Path label dropdowns.', alt: 'The WAN uplinks table' },
    { file: 'traffic.png', what: 'The Traffic insights tab — the time-range dropdown, the four Data usage tiles and the ranked panels.', alt: 'Traffic insights' },
  ],
};

export const DASHBOARD_NOTES: Record<string, AdminNotes> = {
  '/': DASHBOARD,
};

// ------------------------------------------------- Recover deleted metrics

const RECOVER: AdminNotes = {
  from: [
    'pages/MetricRecover.jsx',
    'pages/MonitoringMetrics.jsx',
    'services/api.js',
    'vendor/nexapp-monitoring/nexapp_monitoring/monitoring/api/views_metric.py',
  ],
  title: 'Recovering a deleted metric',
  intro: [
    'Lists monitoring metrics that were deleted but of which the controller still keeps a saved revision, with **Metric** (its name as last saved) and **Deleted**. One row per metric, newest first. **Deleted** is in fact the time of that last saved revision — when the metric was last changed before it was deleted — not the moment it was deleted.',
    '**Recover** writes the metric back from that revision under its original id. Its **charts** and **alert settings** are separate records and do **not** come back — recreate them on the metric afterwards.',
  ],
  before: [
    'You must be a superuser or an administrator of at least one organization; no other permission is checked.',
    'The list is not limited to your organizations — it shows every recoverable metric on the controller.',
  ],
  tasks: [
    {
      title: 'Recover a metric',
      steps: [
        'Open **Intelligence › Monitoring › Metrics** and press **Recover deleted**.',
        'Find the metric and press **Recover** on its row.',
        'Confirm *Recover ‹metric›?* — *The metric returns under its original id. Its charts and alert settings are not restored.*',
      ],
      after: [
        'The toast says *Recovered ‹metric›.*; the row leaves this list and the metric is back on the Metrics list. Press the refresh button to re-read the list at any time.',
      ],
    },
  ],
  forms: [],
  verify: [
    'The metric is on **Monitoring › Metrics** again, under the same name.',
  ],
  trouble: [
    ['*Nothing to recover*', 'No deleted metric has a saved revision.', 'A metric deleted without a stored revision cannot be brought back here.'],
    ['*Recovery failed: This metric already exists.*', 'A metric with that id is already in the table.', 'Nothing to do — refresh the list.'],
    ['*Recovery failed: Not found.*', 'That revision no longer exists.', 'Refresh the list.'],
    ['*Could not load deleted metrics*', 'The request failed — for example you are neither a superuser nor an organization administrator.', 'Press **Retry**, or ask an administrator.'],
    ['The recovered metric draws no chart and raises no alerts', 'Charts and alert settings are not restored.', 'Add them again on the metric.'],
  ],
  shotDir: 'recover-metrics',
  shots: [
    { file: 'list.png', what: 'Recover deleted metrics — the list of metrics with their Deleted time and a Recover button on each row.', alt: 'Recover deleted metrics' },
  ],
};

/** Intelligence › Monitoring › Recover deleted metrics — images under public/img/intel/. */
export const RECOVER_NOTES: Record<string, AdminNotes> = {
  '/monitoring/metrics/recover': RECOVER,
};
