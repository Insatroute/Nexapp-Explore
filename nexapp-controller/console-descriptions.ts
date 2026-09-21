/**
 * Descriptions for console pages, written by READING each page's source.
 *
 * Every entry records in `from` the evidence it was written from — the API calls
 * the page makes, the columns it renders. Nothing here is inferred from a page's
 * name, and a page you have not read belongs OUT of this file: the generator
 * marks an undescribed page with a visible gap marker, which is the correct
 * outcome. A knowledge base people rely on must never present a guess in the same
 * voice as a verified fact.
 *
 * Keyed by ROUTE PATH, because that is the one identifier the nav, the route
 * table and the permission map all agree on. A label ("Groups") is ambiguous;
 * `/groups` is not.
 *
 * To find what still needs writing:
 *     npm run generate:console      # prints every gap by name
 */
export interface CuratedDescription {
  /** What the page is for. */
  text: string;
  /** The source read to write it. */
  from: string;
  /**
   * Optional explanation for individual actions, keyed by the EXACT operation
   * phrase the generator emits (the text of the bullet under "What you can do
   * here"). The bullet stays the anchor; the note follows it.
   *
   * The key must match a real operation. A note whose key matches nothing is
   * reported at generate time rather than silently dropped — otherwise renaming
   * a verb would quietly delete the explanation attached to it.
   */
  notes?: Record<string, string>;
  /**
   * Actions the page offers that the extractor structurally CANNOT see, because
   * they make no distinctive API call of their own — a link to another page, or
   * something built client-side from a call the page already makes.
   *
   * The generator derives "What you can do here" from the page's call surface,
   * which is what keeps it honest. That same rule makes these invisible: a
   * <Link> is not a call, and an export assembled in the browser reuses the list
   * endpoint. Leaving them out would describe the page as offering less than it
   * does, so they are written by hand — and, like every other written line here,
   * the evidence goes in `from`.
   */
  alsoOnPage?: Record<string, string>;
  /**
   * What each tab on the page is for, keyed by the tab's EXACT label as the
   * page declares it. Validated like `notes`: a key matching no real tab is
   * reported rather than silently dropped.
   */
  tabs?: Record<string, string>;
}

export const CURATED: Record<string, CuratedDescription> = {
  '/devices': {
    text:
      'The device inventory, and the page most operational work starts from. Each row is one router: whether it is reachable, whether its pushed configuration applied cleanly, which organization owns it, and what firmware it runs. The status tiles across the top (All / Online / Problem / Offline / Unknown) filter the table, and search covers name, MAC, model and IP.\n\n' +
      'Twelve columns exist; eleven are shown by default. `Group` is the one that is off, which is why the picker reads \u201cColumns 11\u201d against a twelve-row list. `Status` and `Device` cannot be switched off at all.\n\n' +
      'The toolbar is in two halves, and the difference matters. **Apply template**, **Back up config**, **Change group** and **Delete** are BULK: they stay disabled until rows are ticked, then act on the whole selection, so the page serves one device and forty the same way. **Import devices**, **Export CSV** and **Recover deleted** sit in a separate \u201cmore actions\u201d menu and need no selection \u2014 they are always available. **SDLAN Access** is the exception in the other direction: it works on exactly one device and is disabled at zero and at more than one.',
    from:
      'reads pages/DeviceList.jsx (status tiles, COLUMNS/ESSENTIALS model, auto-refresh, selection gating, both overflow menus, sdlanHref) and the four components it opens; endpoints from api/client.js',
    alsoOnPage: {
      'SDLAN access':
        'Opens the SD-LAN access view for a device, at `/devices/<id>/sdlan`. It is a link, not a call, which is why it does not appear among the operations above. Available two ways: from a row\u2019s own menu, and from the toolbar button \u2014 but the toolbar one acts on exactly one device, so it stays disabled at zero selected and at more than one, and says which in its tooltip. The access cards on the destination page are single-device, which is the reason for the restriction.',
      'Open device':
        'The row menu\u2019s first entry, to `/devices/<id>` \u2014 the device detail page and its fourteen tabs. Clicking the device name in the table goes to the same place.',
    },
    notes: {
      'Browse and search devices':
        'The table itself, from `GET /monitoring/device/` — the monitoring endpoint rather than the plain controller one, so each row carries live status alongside its identity. Paged, and scoped by the organization/group picker. `?subnet=<cidr>` narrows it to one IPAM range, which is how IPAM\u2019s \u201cSee all devices\u201d links in; the filter lives in the URL so the view is linkable and survives a refresh. \u201cAuto\u201d re-polls on a timer and pauses while the browser tab is hidden.',
      'Create device':
        'Bulk-creates devices from a CSV, in the import drawer. The file carries per-device identity (name, MAC, optional model and notes) and one organization is chosen for the whole batch, because a device needs exactly name + organization + MAC. Parsing is a plain comma split with no quoted-field support \u2014 richer files belong in the Django admin\u2019s import page.',
      'Edit device':
        '`PATCH /controller/device/<id>/`. On this page it is reached through \u201cchange group\u201d, which writes the single `group` field (and accepts null to clear it) rather than opening a full edit form. Assigning devices to a group is a different job from creating one, which lives under Administration \u203a Device Groups.',
      'Delete device':
        '`DELETE /controller/device/<id>/?force=true`, per row or across a selection, always behind a confirm. Only offered to a user holding `config.delete_device`; everyone else keeps the row menu without it. Deletes are recoverable \u2014 see below.',
      'Recover device':
        'Deleted devices are retained by django-reversion rather than destroyed. The recover modal lists what is still held and restores one on demand, and because the backend reverts the whole revision the device\u2019s configuration comes back with it.',
      'Browse and search deleted devices':
        '`GET /controller/device/deleted/` \u2014 the list behind the recover modal. It is only read when that modal is opened.',
      'Back up config (in bulk)':
        'Queues a configuration snapshot per selected device via `POST /controller/device/bulk-backup/`. The task skips writing one when nothing has changed since the last backup, so a snapshot appears under Templates \u203a Backup Templates only if the config actually differs. Queued, not created \u2014 the toast is careful about that distinction and so is this page.',
      'Apply or push template (in bulk)':
        'Attaches one or more templates to every selected device (`POST /controller/device/bulk-apply-template/`), which the controller then renders per device. Two rules are enforced up front rather than as a 400 afterwards: the selection must sit in a single organization, because templates are org-scoped and a mixed selection has no valid template list; and `add` unions with what each device already has while `replace` overwrites it. Replace is the destructive one, so it is not the default.',
      'Apply or push backup (in bulk)':
        'A different operation from applying a template, despite sitting in the same drawer. This takes a stored backup and pushes its raw UCI over SSH (`POST /controller/device/bulk-apply-backup/`), overwriting the running configuration of every device listed. A template is attached and rendered; a backup is pushed as-is.',
      'Browse and search backup templates':
        'Loads the saved backups so one can be chosen as the source for the push above.',
      'Browse and search templates':
        'Loads the org\u2019s templates to populate the apply-template picker.',
      'Browse and search device groups':
        'Loads the group tree for the change-group drawer.',
      'Browse and search groups':
        'The scope picker\u2019s group list \u2014 what narrows the whole table to one part of the fleet.',
      'Browse and search organizations':
        'The scope picker\u2019s organization list, and the org chosen for a CSV import batch.',
    },
  },
  '/radius/nas': {
    text:
      'The RADIUS clients — the network access servers permitted to ask this controller to authenticate a user. An entry is a shared secret plus the address the request will arrive from, scoped to an organization.',
    from: 'calls useListNasQuery, useCreateNasMutation, useUpdateNasMutation, useDeleteNasMutation, useListOrganizationsQuery',
    notes: {
      "Browse and search NAS":
        "The RADIUS clients, from `radius-admin/nas/`. A row is one network access server allowed to ask this controller to authenticate a user \u2014 its address and shared secret, scoped to an organization.",
      "Create NAS":
        "Registers a new client. Until a NAS exists here with the right secret, its authentication requests are refused before any user is even looked up.",
      "Edit NAS":
        "Changes an entry \u2014 `PATCH radius-admin/nas/<id>/`. Rotating the shared secret here means rotating it on the device too, or it stops authenticating.",
      "Delete NAS":
        "Removes a client. Requests from that address stop being accepted.",
    },
},
  '/groups': {
    text:
      'Permission groups — named sets of permissions assigned to users. This is the `nexapp_users.Group` proxy the API enforces against, not stock `auth.group`, and it is a different model from Device Groups.',
    from: 'calls useListUserGroupsQuery and useDeleteGroupMutation; permission target from navPermissions.js (`nexapp_users.group`, with the reason recorded there)',
    notes: {
      "Browse and search user groups":
        "The permission groups, from `users/group/` \u2014 the `nexapp_users.Group` proxy the API enforces against, not stock `auth.group`.",
      "Delete group":
        "Removes a permission group. Users in it lose whatever it granted and fall back to their remaining groups, so check who is in it first.",
    },
},
  "/policy-engine/qos": {
    text:
      "Shapes traffic per device: a mode, a bandwidth ceiling and DSCP marking, with optional alerting when the drop rate crosses a threshold.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'qos': resource 'nsbond/qos-config', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/qos-config/`, with columns Name, Mode, Bandwidth, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Mode, Bandwidth (Mbps), DSCP marking, Alerts, Drop threshold (%), Check interval (s), Alert cooldown (s).",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/qos-config/<id>/`.",
    },
  },
  "/policy-engine/rip": {
    text:
      "RIP routing. The policy turns the service on and chooses which route sources are redistributed into it.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'rip': resource 'nsbond/rip-config', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/rip-config/`, with columns Name, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: RIP Service, Redistribute Connect, Redistribute Static, Redistribute Kernel.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/rip-config/<id>/`.",
    },
  },
  "/policy-engine/bgp": {
    text:
      "BGP peering. Beyond the router ID and AS it carries the timers and the BFD settings that decide how fast a dead peer is noticed.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'bgp': resource 'nsbond/bgp-config', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/bgp-config/`, with columns Name, Router ID, AS, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Router ID, Router AS, Redistribute connected/static, Keepalive interval, Hold time, Log neighbor changes, Graceful restart, Deterministic MED, Default local preference, and BFD (min RX/TX interval, detect multiplier).",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/bgp-config/<id>/`.",
    },
  },
  "/policy-engine/ospf": {
    text:
      "OSPF routing, including whether the router originates a default route and the BFD timers under it.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'ospf': resource 'nsbond/ospf-config', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/ospf-config/`, with columns Name, Router ID, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Router ID, Redistribute connected/static/kernel, Default-information originate, Always advertise, Metric, and BFD (min RX/TX interval, detect multiplier).",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/ospf-config/<id>/`.",
    },
  },
  "/policy-engine/pim": {
    text:
      "PIM multicast routing. The smallest policy here \u2014 it switches the protocol on for the devices in scope.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'pim': resource 'nsbond/pim-config', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/pim-config/`, with columns Name, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Name, Enabled.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/pim-config/<id>/`.",
    },
  },
  "/policy-engine/vrf": {
    text:
      "Virtual routing and forwarding instances. VRF is the one exception to the no-device-picker rule on this page: its serializer requires a device outright, so a VRF is always bound to one.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'vrf': resource 'nsbond/vrf-config', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/vrf-config/`, with columns Name, VRF ID, RD, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: VRF ID, Table ID, Device, Route distinguisher, RT import, RT export, Interfaces, Internet access.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/vrf-config/<id>/`.",
    },
  },
  "/policy-engine/sla": {
    text:
      "Path monitors: what to probe, how often, and the latency, jitter, loss and MOS limits that decide whether a path counts as healthy. Performance SLA is one feature with several views \u2014 SLA Settings and SLA Thresholds are sub-tabs of it.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'sla': resource 'nsbond/path-monitor', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/path-monitor/`, with columns Name, Probe target, Max latency, Max jitter, Max loss, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Probe target, Probe type, Probe interval (ms), Failures before down, Successes before up, Max latency/jitter/loss, Min MOS score, MOS codec, Detect mode, UDP echo port, Withdraw static route when inactive, SLA fail/pass log intervals, Target path, WAN members.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/path-monitor/<id>/`.",
    },
  },
  "/policy-engine/steering": {
    text:
      "Steering policies \u2014 sending an application over the path that suits it rather than the default route.\n\nScope is the same across the Policy Engine: a policy with **Apply fleet-wide** set reaches every device, otherwise it is narrowed to an organization. There is deliberately no device picker \u2014 configuring a single router is what that router's own CPE page is for.",
    from:
      "pages/policy/tabs.js descriptor for key 'steering': resource 'nsbond/steering-policy', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/nsbond/steering-policy/`, with columns Name, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Name, Enabled.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/nsbond/steering-policy/<id>/`.",
    },
  },
  "/security/threatshield-ip": {
    text:
      "IP reputation blocking and brute-force protection: drop traffic from known-bad addresses, and ban a source after a set number of failed attempts.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'threatshield-ip': resource 'security/threatshield', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/security/threatshield/`, with columns Name, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: IP reputation blocking, Auto-update lists, Brute-force protection, Ban after failures.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/security/threatshield/<id>/`.",
    },
  },
  "/security/ips": {
    text:
      "Intrusion prevention. The oinkcode is a Snort subscription identifier \u2014 it is a licence code rather than a secret, which is why the form treats it as plain text.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'ips': resource 'security/ips', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/security/ips/`, with columns Name, Policy, Chain, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Rule policy, Chain, Oinkcode.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/security/ips/<id>/`.",
    },
  },
  "/security/antivirus": {
    text:
      "Which protocols are scanned, how large a file will still be inspected, and whether hits are quarantined.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'antivirus': resource 'security/antivirus', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/security/antivirus/`, with columns Name, Max file (MB), Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Scan HTTP, Scan SMTP, Scan FTP, Scan on access, Max file size (MB), Quarantine, Auto-update signatures.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/security/antivirus/<id>/`.",
    },
  },
  "/security/antispam": {
    text:
      "Mail filtering, pointed at a relay host with optional SASL authentication.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'antispam': resource 'security/antispam', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/security/antispam/`, with columns Name, Service, Relay host, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Service, Relay host, Port, SASL username.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/security/antispam/<id>/`.",
    },
  },
  "/security/webfilter": {
    text:
      "Category-based web filtering, plus custom rules for anything the categories do not cover.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'webfilter': resource 'security/webfilter', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/security/webfilter/`, with columns Name, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Blocked categories, Custom rules.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/security/webfilter/<id>/`.",
    },
  },
  "/security/address-group": {
    text:
      "Named sets of addresses, reused by the policies above instead of repeating a list in each one. Unlike the other tabs this is a plain organization-owned record \u2014 there is no fleet-wide/device scope and no enabled state.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'address-group': resource 'security/address-group', noun 'address group', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists address groups from `GET /api/v1/security/address-group/`, with columns Name, Description, Organization.",
      "Edit resource":
        "Creates and edits a address group through the shared resource form. Fields: Addresses, Description.",
      "Delete resource":
        "Removes a address group via `DELETE /api/v1/security/address-group/<id>/`.",
    },
  },
  "/security/profile": {
    text:
      "Security profiles \u2014 the bundle a policy applies.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'profile': resource 'security/profile', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/security/profile/`, with columns Name, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Name, Enabled.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/security/profile/<id>/`.",
    },
  },
  "/security/policy": {
    text:
      "The security policies themselves, tying the profiles above to the traffic they govern.\n\nScoped like the rest of Security: fleet-wide, or narrowed to an organization or a single device.",
    from:
      "pages/security/tabs.js descriptor for key 'policy': resource 'security/policy', noun 'policy', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists policies from `GET /api/v1/security/policy/`, with columns Name, Scope, State.",
      "Edit resource":
        "Creates and edits a policy through the shared resource form. Fields: Name, Enabled.",
      "Delete resource":
        "Removes a policy via `DELETE /api/v1/security/policy/<id>/`.",
    },
  },
  "/pki/authorities": {
    text:
      "The CAs the controller issues from. Each belongs to an organization, and the list shows the key length, digest and expiry so a CA nearing its end date is visible without opening it.\n\nEach record belongs to an organization.",
    from:
      "pages/pki/tabs.js descriptor for key 'authorities': resource 'controller/ca', noun 'authority', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists authorities from `GET /api/v1/controller/ca/`, with columns Name, Organization, Key length, Digest, Valid until.",
      "Edit resource":
        "Creates and edits a authority through the shared resource form. Fields: Name, Organization.",
      "Delete resource":
        "Removes a authority via `DELETE /api/v1/controller/ca/<id>/`.",
    },
  },
  "/pki/certificates": {
    text:
      "Certificates issued from those CAs, each showing which authority signed it and whether it is still valid.\n\nEach record belongs to an organization.",
    from:
      "pages/pki/tabs.js descriptor for key 'certificates': resource 'controller/cert', noun 'certificate', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists certificates from `GET /api/v1/controller/cert/`, with columns Name, Organization, Authority, Key length, Digest, Valid until, State.",
      "Edit resource":
        "Creates and edits a certificate through the shared resource form. Fields: Name, Organization, CA.",
      "Delete resource":
        "Removes a certificate via `DELETE /api/v1/controller/cert/<id>/`.",
    },
  },
  "/app-intelligence/traffic": {
    text:
      "What the DPI engine saw, per application: bytes down and up, flow count, and the device and window it was observed in. A read-only record rather than something you configure.\n\nRead-only: these rows are produced by the DPI engine.",
    from:
      "pages/appintel/tabs.js descriptor for key 'traffic': resource 'dpi/traffic', noun 'traffic record', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists traffic records from `GET /api/v1/dpi/traffic/`, with columns Application, Category, Protocol, Download, Upload, Total, Flows, Device, From, To.",
      "Edit resource":
        "Creates and edits a traffic record through the shared resource form. Read-only in practice \u2014 these records are written by the engine, not by hand.",
      "Delete resource":
        "Removes a traffic record via `DELETE /api/v1/dpi/traffic/<id>/`.",
    },
  },
  "/app-intelligence/discovered": {
    text:
      "Hosts the DPI engine has seen behind a router but that were never registered \u2014 hostname, MAC, address, how much they moved, and when they were first and last seen.\n\nRead-only: these rows are produced by the DPI engine.",
    from:
      "pages/appintel/tabs.js descriptor for key 'discovered': resource 'dpi/devices', noun 'discovered device', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists discovered devices from `GET /api/v1/dpi/devices/`, with columns Device, Hostname, MAC address, IP address, Status, Total download, Total upload, Type, First seen, Last seen.",
      "Edit resource":
        "Creates and edits a discovered device through the shared resource form. Read-only in practice \u2014 these records are written by the engine, not by hand.",
      "Delete resource":
        "Removes a discovered device via `DELETE /api/v1/dpi/devices/<id>/`.",
    },
  },
  "/app-intelligence/snapshots": {
    text:
      "Point-in-time health of the DPI engine on a device: how many flows it was tracking, how many it could identify, and what it was costing in memory and CPU.\n\nRead-only: these rows are produced by the DPI engine.",
    from:
      "pages/appintel/tabs.js descriptor for key 'snapshots': resource 'dpi/snapshots', noun 'snapshot', and its columns/fields arrays (field names read from each endpoint's OPTIONS response, per the file's own note)",
    notes: {
      "Browse and search resource":
        "Lists snapshots from `GET /api/v1/dpi/snapshots/`, with columns Device, Flow count, Identified, Unknown, Devices, Memory, Uptime, CPU, Timestamp.",
      "Edit resource":
        "Creates and edits a snapshot through the shared resource form. Read-only in practice \u2014 these records are written by the engine, not by hand.",
      "Delete resource":
        "Removes a snapshot via `DELETE /api/v1/dpi/snapshots/<id>/`.",
    },
  },
  "/app-intelligence/applications": {
    text:
      "The applications the DPI engine recognises. Unlike its three sibling tabs this one is not a generic resource table \u2014 its descriptor is marked `custom`, so it is rendered by a component of its own rather than from a column/field list.",
    from:
      "pages/appintel/models.js APPLICATIONS_MODEL \u2014 { key: 'applications', label: 'Applications', icon: 'chart', custom: true }, with no resource or columns of its own",
    notes: {
      "Browse and search resource":
        "The applications the DPI engine recognises. This tab is marked `custom` in its descriptor, so unlike its siblings it is drawn by a component of its own rather than from a column list.",
      "Edit resource":
        "Changes an application entry.",
      "Delete resource":
        "Removes one.",
    },
},
  "/sdlan": {
    text:
      "Where a host behind a router actually is, and whether you can reach it right now \u2014 without knowing which router it sits behind. Each row is a saved remote-access target: the site and router it is reached through, the LAN endpoint and protocol, and the path the controller would take to it.\n\nThe per-device panel at `/devices/:id/sdlan` answers the narrower question, \"what can I reach behind THIS router\". Same rows and the same endpoint: the viewset filters by device only when `device_id` is passed, so dropping the parameter returns everything the user's organizations can see.\n\n**A row is a link, not a tunnel.** It opens through the controller's own reverse proxy at `/sdlan-proxy/<scheme>/<ip>:<port>/`, so there is no port to allocate, no session to expire and nothing to clean up when a tab closes \u2014 which means a row can be middle-clicked, bookmarked and re-opened. The proxy reaches the LAN address from the CONTROLLER side, so you need no VPN of your own; the precondition is instead that the controller has a route into that LAN, which is what the **Path** column reports.\n\nTwo protocol details are worth knowing. **SSH is not raw SSH** \u2014 on NexappOS it is ttyd, a root shell served over HTTPS as a WebSocket, which is why it opens in a tab like everything else. **TELNET is the one target no proxy can rescue**: raw TCP with no HTTP framing, so there is nothing for nginx to reverse-proxy and nothing for a browser to render. It stays addable and hands you the command instead of a tab.",
    from:
      "pages/Sdlan.jsx header comment (the reverse-proxy design, the ttyd meaning of SSH, the TELNET limitation and the device_id filter note) plus its table headers Site, Group, Router, Target, Protocol, LAN endpoint, Path, Status, Session; endpoints from api/client.js",
    notes: {
      "Browse and search remote access":
        "The saved targets, from `GET /admin/remote-access/api/entries/`. This page omits the `device_id` parameter the per-device panel sends, which is what turns the same endpoint into a fleet-wide list.",
      "Create remote access":
        "Adds a target: the router, the LAN address and port, and what you intend to reach \u2014 a web UI or a root shell. The stored model holds three protocols plus a `use_tls` flag, because the scheme cannot be guessed from the port, so that one choice is unfolded into the wire fields on save.",
      "Edit remote access":
        "Changes a saved target \u2014 `PATCH /admin/remote-access/api/entries/<id>/`.",
      "Delete remote access":
        "Removes a target. Nothing else is torn down, because a row holds no allocated resource.",
      "Open proxy session":
        "Opens a proxy session to the LAN endpoint (`POST /admin/remote-access/api/proxy/open/`), which is what makes the host reachable from here.",
      "Close proxy session":
        "Ends that session (`POST /admin/remote-access/api/proxy/close/<id>/`). Sessions are not left open implicitly.",
      "Browse and search devices":
        "The routers a target can sit behind \u2014 the picker on the create form.",
      "Browse and search groups":
        "The group list the scope picker filters the table by.",
      "View device location":
        "Resolves the router's site so a row can say where the endpoint physically is.",
    },
  },
  "/vpn": {
    text:
      "The VPN servers devices connect back to. A row is one server: the host it runs on, the backend that implements it, the organization that owns it, and the certificate it presents.\n\nA device is not attached to a server directly \u2014 a **template** of type VPN-client is what does that, which is why the two sit together under Configuration. The certificate column matters for the same reason the CA list shows an expiry: a server whose certificate has lapsed stops accepting the devices that were configured against it.",
    from:
      "pages/VpnList.jsx \u2014 headers Name, Host, Backend, Organization, Certificate, Modified; calls useListVpnsQuery and useDeleteVpnMutation",
    notes: {
      "Browse and search vpns":
        "The server list itself. Backend is the implementation (OpenVPN, WireGuard and so on) \u2014 it decides what a VPN-client template rendered against this server will contain.",
      "Delete VPN":
        "Removes a server. Templates pointing at it are what actually attach devices, so check those first \u2014 a template left behind renders against a server that no longer exists.",
    },
  },
  "/templates": {
    text:
      "Configuration templates \u2014 the units of config that get pushed to devices. Each row shows the backend it targets, whether it is tied to a VPN, its tags, and how many devices it is applied on, so a template nobody uses is visible as such.\n\n**Two different things live here, and the tabs keep them apart.** A **template** is authored by you and rendered per device \u2014 the controller fills in that device's variables at push time. A **backup template** is a snapshot taken FROM a device, stored as raw config; it is what Devices \u2192 *Back up config* writes into, and what Devices \u2192 *Apply backup* pushes back out. One is generated for a device, the other was captured from one.\n\nTwo flags change how a template attaches: *default* attaches it to new devices automatically, and *required* means it cannot be detached from a device that has it.",
    from:
      "pages/TemplateList.jsx \u2014 headers Name, Type, Backend, VPN, Tags, Default, Required, Applied on, Modified; type filter All / VPN-client / Generic / Required; tabs Templates and Backup templates; calls api.listTemplates (which passes kind=manual), api.deleteTemplate, and BackupTemplateTable's api.getPushedConfig, api.bulkApplyBackup, useListBackupTemplatesQuery, useDeleteBackupTemplateMutation",
    notes: {
      "Browse and search templates":
        "The authored templates, from `GET /controller/template/` with `kind=manual` \u2014 which is what keeps backups out of this tab even though both are templates to the backend.",
      "Delete template":
        "Removes a template (`DELETE /controller/template/<id>/`). The *Applied on* column is the thing to read first: it says how many devices lose this config.",
      "Browse and search backup templates":
        "The snapshots taken from devices, listed in the second tab. Devices \u2192 *Back up config* is what creates them, and only when the config has actually changed since the last one.",
      "Delete backup template":
        "Removes a stored snapshot. Nothing on a device changes \u2014 a backup is a record, not an attachment.",
      "Apply or push backup (in bulk)":
        "Pushes a stored backup's raw UCI to devices over SSH. The same operation as Devices \u2192 *Apply backup*, started from the backup instead of from the selection.",
      "View pushed config":
        "Shows what was actually pushed for a device, from `/config-compare/pushed/<id>/` \u2014 the rendered result rather than the template it came from, which is what you compare against when a device looks wrong.",
      "Browse and search organizations":
        "The organization list the scope picker filters by; templates are org-scoped.",
    },
  },
  "/ha/devices": {
    text:
      "High availability for the ROUTERS: which devices are paired, which of a pair currently holds the virtual IP, and what VRRP thinks the state is. Rows carry the peer, the role, the virtual IP and when the device was last polled and last synced, so a pair that has stopped talking shows up as a stale timestamp rather than silence.\n\nThis is one of three unrelated HA subjects the console groups together \u2014 the routers' pairs here, the controller's own two servers under HA Controller, and the DC/DR sites under DR Control Panel.",
    from:
      "pages/HaDevices.jsx \u2014 headers Device, Organization, Peer, Role, Status, Virtual IP, VRRP state, Last polled, Last sync; status filter All/Enabled/Configuring/Disabled/Unconfigured/Error; calls useListHaDevicesQuery, usePollHaDeviceMutation, useDeleteHaDeviceMutation, and HaSetupDrawer's create/setup mutations",
    notes: {
      "Browse and search HA devices":
        "The router pairs, from `ha/device/` \u2014 peer, role, virtual IP, VRRP state, and when each was last polled and synced. A pair that has stopped talking shows as a stale timestamp rather than as silence.",
      "Browse and search devices":
        "The devices available to pair, for the setup drawer.",
      "Create HA device":
        "Registers a device as part of a pair. Pairing itself is done by *Set up HA device*, which configures both sides.",
      "Delete HA device":
        "Removes a device from HA. Its peer is left without a partner, so the pair stops being a pair \u2014 check the peer afterwards.",
      "Poll HA device":
        "Asks a device for its current HA state now rather than waiting for the next scheduled poll \u2014 the way to confirm a pair after changing it.",
      "Set up HA device":
        "Runs the pairing itself, in the setup drawer: pick the peer and the interfaces, and the controller configures both sides.",
    },
  },
  "/ha/controller": {
    text:
      "High availability for the CONTROLLER'S OWN pair \u2014 not the routers'. It reports which node holds the VIP, which PostgreSQL node is primary, and whether the management plane is up, alongside a log of the events that got it there.\n\nFailover actions are driven from this page, and their progress is polled while they run.",
    from:
      "pages/HaController.jsx \u2014 its own header comment says \"the controller's OWN pair, not the routers'\"; renders VIP holder, PostgreSQL role and Management plane; calls useDcdrStatusQuery, useDcdrActionMutation, useDcdrActionProgressQuery, useListDcdrEventsQuery",
    notes: {
      "Browse and search dcdr events":
        "The event log behind the status \u2014 what failed over, when, and whether it completed. The page's status cards say where things stand now; this says how they got there.",
    },
},
  "/ha/dr": {
    text:
      "This data centre and the disaster-recovery site it streams to \u2014 the page you open to answer one question: is the data safe.\n\nIt reports the replication state between the two sites along with task workers, database connections, database size, management-plane health, uptime and last-seen for each. The admin page it replaces laid the same API response out field by field and put the verdict last; here the verdict leads.",
    from:
      "pages/HaDrPanel.jsx \u2014 its header comment describes the layout it replaces (dcdr_fabric.html); renders Task workers, DB connections, Database size, Management plane, Uptime, Last seen; calls useDcdrStatusQuery",
  },
  "/locations": {
    text:
      "Where devices physically are. A location is a named place owned by an organization, with a type, coordinates and a pincode, and the list shows how many devices sit at each \u2014 so a location with none is visible as a candidate for tidying.\n\nCoordinates are what put a device on the fleet map.",
    from:
      "pages/LocationList.jsx \u2014 headers Name, Organization, Type, Devices, Coordinates, Pincode, Created; calls api.listLocations, api.listLocationRecords, api.deleteLocation, useListOrganizationsQuery, and LocationFormDrawer's create/update",
    notes: {
      "Browse and search location records":
        "The location list in table form, from `controller/location/` \u2014 as opposed to the GeoJSON feed the map draws from, which is the same records shaped for plotting.",
      "Create location":
        "Adds a place: a name, an organization, a type and coordinates. **Coordinates are what put a device on the fleet map** \u2014 a location without them exists but cannot be shown.",
      "Edit location":
        "Changes a location. Moving the coordinates moves every device placed there.",
      "Delete location":
        "Removes it (`DELETE controller/location/<id>/`). The Devices column says how many lose their placement.",
    },
},
  "/ipam/ip-addresses": {
    text:
      "Individual addresses, and the day-to-day half of IPAM: allocating one, or hunting a free one. Each row shows the address, the subnet it belongs to and the organization that owns it.\n\nAddresses come first in this section because subnets are the setup step you visit far less often.",
    from:
      "pages/IpAddressList.jsx \u2014 headers IP address, Subnet, Organization, Created, Modified; filters by organization and by subnet; calls useListAllIpsQuery, useDeleteIpMutation, useListSubnetsQuery, useListOrganizationsQuery",
    notes: {
      "Browse and search all IPS":
        "Every allocated address, from `ipam/ip-address/`, with the subnet and organization it belongs to.",
      "Browse and search subnets":
        "The subnet list the filter narrows by, and the subnet field when allocating an address.",
      "Delete IP":
        "Releases an address back to its subnet (`DELETE ipam/ip-address/<id>/`). Nothing on a device changes \u2014 IPAM records the allocation, it does not configure it.",
    },
},
  "/ipam/subnets": {
    text:
      "The ranges addresses are allocated from. A subnet belongs to an organization, may sit under a master subnet, and may be tied to a device \u2014 the list shows all three, so the shape of the addressing plan is readable without opening anything.\n\nSubnets can also be imported rather than entered one at a time.",
    from:
      "pages/SubnetList.jsx \u2014 headers Name, Organization, Subnet, Master subnet, Related device, Created, Modified; calls useListSubnetsWithDeviceQuery, useDeleteSubnetMutation, useListOrganizationsQuery, and SubnetImportModal's useImportSubnetMutation",
    notes: {
      "Browse and search subnets with device":
        "The ranges addresses come from, each showing its master subnet and any device it is tied to \u2014 which is what makes the shape of the addressing plan readable from the list.",
      "Delete subnet":
        "Removes a range (`DELETE ipam/subnet/<id>/`). The addresses recorded inside it go with it, so check the IP addresses page filtered to this subnet first.",
      "Import or upload subnet":
        "Bulk-loads subnets rather than adding them one by one, in the import modal.",
    },
  },
  "/": {
    text:
      "The landing page, and the only entry visible to every signed-in user. It answers \"is the fleet healthy right now\" in one screen: how many devices are online against the total, how many WAN uplinks are up, where devices sit on a map, and the split of device health, models and firmware versions across the estate.\n\nBelow those sit the fleet's data usage and its top applications, categories and clients, and a list of which admins are currently signed in.",
    from:
      "pages/Dashboard.jsx \u2014 calls api.listDevices, api.listLocations, api.listOnlineUsers, api.getDashboardCharts, api.getWanUplinks, api.getDataUsage, api.topApps, api.topCategories, api.topClients; visibility from navPermissions.js leafVisible, which returns true for '/' before any permission test",
    notes: {
      "Browse and search devices":
        "The fleet itself \u2014 what the online/total count, the device-health donut, the model and firmware splits are all computed from. Not a picker here; it is the page's main content.",
      "Browse and search online users":
        "Administrators signed in right now, from `/accesslog/online-users/` \u2014 the \"active in the last 15 minutes\" list at the bottom.",
      "View dashboard charts":
        "The donut charts, from `/monitoring/dashboard/?time=\u2026` \u2014 device health, models and firmware versions for the selected window.",
      "View wan uplinks":
        "The uplinks-up count, from `/monitoring/wan-uplinks/`. Distinct from device health: a device can be online while one of its WAN links is down.",
      "View data usage":
        "Fleet traffic over the window, from `/monitoring/data-usage/`.",
    },
},
  "/users": {
    text:
      "Who can sign in, and what they are. Each row carries the user's role tier, the organizations they belong to, whether the account is active, whether two-factor is enabled and whether it is required of them.\n\nUsers sit beside Organizations because they are one subject split in half: who exists, and who they belong to.",
    from:
      "pages/UserList.jsx \u2014 headers User, Role, Organizations, Active, 2FA, 2FA req., Joined; role tier from UserList.roleOf (Superuser / Staff / User)",
    notes: {
      "Browse and search users":
        "The accounts, from `users/user/` \u2014 with the role tier, the organizations each belongs to, whether the account is active, and the two-factor state.",
      "Delete user":
        "Removes an account (`DELETE users/user/<id>/`). Deactivating instead keeps the audit trail intact \u2014 the access and activity logs reference the user, and a deleted one leaves rows attributed to nobody.",
    },
},
  "/organizations": {
    text:
      "The tenants. A row is one organization with its contact email, how many devices it owns and how many of those are online or offline right now \u2014 so tenant size and tenant health read together.\n\nAn organization is also the scope almost everything else in the console is filtered by.",
    from:
      "pages/OrgList.jsx \u2014 headers Name, Email, Devices, Online, Offline, Active, Created, Modified",
    notes: {
      "Delete organization":
        "Removes a tenant (`DELETE users/organization/<id>/`). Almost everything in the controller is organization-scoped, so read the Devices count on the row first: this is the widest-reaching delete in the console.",
    },
},
  "/allowed-serials": {
    text:
      "Which hardware is permitted to join which organization. A row is a serial number, the organization it may join, whether it is admitted automatically, and who added it.\n\nIt is only consulted for organizations with \"Require serial admission\" switched on \u2014 a setting on the organization itself. Filed under Users & Organizations rather than Devices because the row is about entitlement, not about a device that already exists.",
    from:
      "pages/AllowedSerialList.jsx \u2014 headers Serial number, Organization, Auto admit, Notes, Added by, Modified; calls the allowed-serial queries plus AllowedSerialDrawer and SerialCsvDrawer",
    notes: {
      "Browse and search allowed serials":
        "The serial numbers permitted to join, from `serial-admission/allowed-serial/`, with the organization each may join and who added it.",
      "Create allowed serial":
        "Permits a piece of hardware to join an organization. Only consulted when that organization has \"Require serial admission\" switched on \u2014 without it, the list is inert.",
      "Edit allowed serial":
        "Changes the organization, the auto-admit flag or the notes on an entry.",
      "Delete allowed serial":
        "Withdraws permission. A device already registered stays registered \u2014 this governs joining, not membership.",
      "Import or upload allowed serials csv":
        "Loads a batch of serial numbers from a CSV instead of adding them one at a time.",
    },
  },
  "/device-groups": {
    text:
      "The groups devices belong to, and what those groups carry. A group has a parent, so the tree can go region \u2192 site \u2192 devices, and it can hold templates and variables that every device in it inherits.\n\nDistinct from Permission Groups above, which are sets of permissions for users. These are what devices belong to and what templates attach to.",
    from:
      "pages/DeviceGroupList.jsx \u2014 headers Name, Organization, Parent, Templates, Variables, Created, Modified; calls the device-group queries plus DeviceGroupDrawer's create/update and useListTemplatesQuery",
    notes: {
      "Browse and search device groups":
        "The groups devices belong to, from `controller/group/` \u2014 each with its parent, and the templates and variables it passes down.",
      "Create device group":
        "Adds a group. A parent makes it part of a tree (region \u2192 site \u2192 devices), and templates attached here are inherited by every device in it.",
      "Edit device group":
        "Changes a group's parent, templates or variables. Changing the templates changes the configuration of every device in the group.",
      "Delete device group":
        "Removes a group. Its devices lose whatever it passed down, so look at the Templates and Variables columns before deleting.",
      "Browse and search templates":
        "The templates that can be attached to a group, for the group form.",
    },
},
  "/hierarchy": {
    text:
      "The same structure the sidebar's scope picker carries \u2014 deployment \u2192 organizations \u2192 device groups \u2192 subgroups \u2014 drawn as an org chart, top-down, instead of as an indented tree.\n\nIt is a way of reading the shape of a deployment at a glance; the editing happens on the Organizations and Device Groups pages.",
    from:
      "pages/Hierarchy.jsx \u2014 its own header comment: \"Org chart of the same structure the sidebar tree carries \u2014 deployment \u2192 organizations \u2192 device groups \u2192 subgroups \u2014 drawn top-down instead of indented\"",
    notes: {
      "Browse and search devices":
        "The device counts that hang off each branch of the chart \u2014 what makes the org chart show where the fleet actually sits, rather than just its shape.",
    },
},
  "/license": {
    text:
      "What this installation is entitled to and how much of it is being used: the device limit against devices in use, user counts, the version and release channel installed, and the subscription's status and dates.\n\nLaid out as settings cards rather than dashboard tiles, deliberately \u2014 this is a page you check and act on, not a report you watch.",
    from:
      "pages/LicenseSubscription.jsx \u2014 its header comment explains the card/sec/table vocabulary choice; renders Device limit, Devices, Usage, Users, Version, Channel, Status, Date, Size, Organization",
  },
  "/topologies": {
    text:
      "The SD-WAN fabric \u2014 the overlay you design and deploy, as opposed to the physical estate under Network. A row is one topology: its type, the overlay subnet it uses, how many hubs and spokes it has, which features are on, and whether it is up.",
    from:
      "pages/TopologyList.jsx \u2014 headers Name, Type, Status, Overlay subnet, Hubs, Spokes, Devices, Features; calls the topology queries plus TopologyEditDrawer's api.updateTopology",
    notes: {
      "Browse and search topologies":
        "The SD-WAN fabrics, from `/nsbond/topology/`. Distinct from Network Topology, which is what a parser REPORTS about the network; a fabric here is what you DESIGN and deploy.",
      "View topology":
        "Opens one fabric \u2014 its hubs, spokes and the features enabled on it.",
      "Edit topology":
        "Changes a fabric: its type, overlay subnet, and which devices are hubs or spokes. The overlay subnet is the one to be careful with \u2014 it is the address space the tunnels are built in.",
      "Delete topology":
        "Removes the fabric. The tunnels it defines stop being deployed, so the overlay it provided goes away.",
    },
},
  "/network-topology/topologies": {
    text:
      "What the network REPORTS about itself, rather than what you designed \u2014 collected by a parser and published as a graph. A row shows the parsing strategy, the format, how many nodes and links were found, and whether it is published.\n\nKept at top level rather than under Overlay Networks because the two are opposites: SD-WAN Fabric is the thing you deploy, this is the thing that comes back.",
    from:
      "pages/NetTopologyList.jsx \u2014 headers Label, Organization, Strategy, Format, Nodes, Links, Published, Modified; calls the topology queries plus TopologyDrawer's api.createNetTopology",
    notes: {
      "Create net topology":
        "Defines a topology for the parser to populate: the strategy that collects it, the format it arrives in, and the organization it belongs to. Nodes and links are then discovered into it rather than drawn by hand.",
      "Edit net topology":
        "Changes a topology's strategy, format or published state (`PATCH /network-topology/topology/<id>/?include_unpublished=true` \u2014 the flag is what lets an unpublished one be edited at all).",
      "Delete net topology":
        "Removes the topology and, with it, the nodes and links collected under it.",
    },
},
  "/network-topology/nodes": {
    text:
      "The nodes a parsed topology found \u2014 each with the addresses it is known by and the topology it belongs to.",
    from:
      "pages/NetNodeList.jsx \u2014 headers Name, Organization, Topology, Addresses, Modified; calls NodeDrawer's api.createNetNode and api.updateNetNode, plus useNetTopologies",
    notes: {
      "Create net node":
        "Adds a node by hand (`POST /network-topology/node/`). Normally the parser discovers these \u2014 adding one manually is for something the collection strategy cannot see.",
      "Edit net node":
        "Changes a node's label or the addresses it is known by. Addresses are what links are matched on, so editing them can change which links resolve.",
      "Delete net node":
        "Removes a node. Links that joined it are left pointing at something that no longer exists, so check the Links page after.",
    },
},
  "/network-topology/links": {
    text:
      "The links between those nodes: which pair a link joins, its cost, and whether it is currently up.",
    from:
      "pages/NetLinkList.jsx \u2014 headers Link, Organization, Topology, Cost, Status, Modified; calls LinkDrawer's api.createNetLink and api.updateNetLink, plus useNetTopologies",
    notes: {
      "Browse and search net links":
        "The links between nodes, from `/network-topology/link/` \u2014 which pair each joins, its cost, and whether it is currently up.",
      "Create net link":
        "Adds a link by hand, between two existing nodes. Like nodes, these are normally discovered by the parser.",
      "Edit net link":
        "Changes a link's cost or status. Cost is what a routing protocol weighs, so this is not just a label.",
      "Delete net link":
        "Removes the link from the graph. Nothing on the network changes \u2014 this graph is a report of what was found, not a configuration that is pushed.",
    },
},
  "/radius/group": {
    text:
      "RADIUS user groups \u2014 the named buckets that check and reply attributes are attached to, so a rule can be written once for a group instead of per user. One group per organization can be the default, which is what an otherwise unmatched user falls into.",
    from:
      "pages/RadiusGroups.jsx \u2014 headers Name, Organization, Default, Created",
    notes: {
      "Browse and search RADIUS groups":
        "The named buckets check and reply attributes attach to, from `radius-admin/group/`. Writing a rule against a group rather than a username is what stops the same rule being repeated per user.",
      "Create RADIUS groups":
        "Adds a group. One group per organization can be marked default, which is where an otherwise unmatched user lands.",
      "Edit RADIUS groups":
        "Renames a group or changes which one is the default.",
      "Delete RADIUS groups":
        "Removes a group. The check and reply attributes written against it are what stop applying, so look at those pages first.",
    },
},
  "/radius/check": {
    text:
      "Check attributes: the conditions a RADIUS request must satisfy to authenticate. Each row is a username, an attribute, an operator and a value \u2014 the operator matters, since it is what distinguishes a match from an assignment.",
    from:
      "pages/RadiusChecks.jsx \u2014 headers Username, Attribute, Op, Value, Organization",
    notes: {
      "Browse and search RADIUS checks":
        "Check attributes, from `radius-admin/check/` \u2014 the conditions a request must satisfy to authenticate at all.",
      "Create RADIUS checks":
        "Adds a condition. The **operator** is the part that matters: it decides whether the row is a test the request must pass or a value being set, and the two read almost identically in the table.",
      "Edit RADIUS checks":
        "Changes an attribute, operator or value.",
      "Delete RADIUS checks":
        "Removes a condition. Anything it was blocking now authenticates, so this loosens access rather than tightening it.",
    },
},
  "/radius/reply": {
    text:
      "Reply attributes: what RADIUS sends BACK once a user has authenticated \u2014 the session parameters the NAS then applies. Same username/attribute/operator/value shape as check attributes, on the other side of the exchange.",
    from:
      "pages/RadiusReplies.jsx \u2014 headers Username, Attribute, Op, Value, Organization",
    notes: {
      "Browse and search RADIUS replies":
        "Reply attributes, from `radius-admin/reply/` \u2014 what RADIUS sends BACK once a user has authenticated, and which the NAS then applies to the session.",
      "Create RADIUS replies":
        "Adds a session parameter. Same username/attribute/operator/value shape as a check attribute, on the other side of the exchange: a check decides whether to let someone in, a reply decides what they get.",
      "Edit RADIUS replies":
        "Changes a returned attribute.",
      "Delete RADIUS replies":
        "Stops that parameter being returned. The user still authenticates; the NAS just applies its own default instead.",
    },
},
  "/radius/accounting": {
    text:
      "Live and historical RADIUS sessions: who is connected, through which NAS and from which IP and client MAC, when the session started, how long it has run, and how much traffic passed in each direction.\n\nA record, not a control \u2014 nothing here is edited.",
    from:
      "pages/RadiusAccounting.jsx \u2014 headers User, NAS, IP, Client MAC, Started, Duration, In, Out, State",
    notes: {
      "Browse and search RADIUS sessions":
        "The session record \u2014 who connected, through which NAS, for how long, and how much traffic passed. Read-only and not by choice: the view is a `ListAPIView`, so there is no detail route and no write, which is why a row does not open.",
    },
},
  "/radius/post-auth": {
    text:
      "The authentication log: every attempt and whether it succeeded, with the username, the client and NAS MAC addresses and when it happened. This is where a failing login is diagnosed.",
    from:
      "pages/RadiusPostAuth.jsx \u2014 headers Username, Result, When, Client MAC, NAS MAC, Organization",
    notes: {
      "Browse and search RADIUS post authentication":
        "Every authentication attempt FreeRADIUS handled and what it answered \u2014 accept or reject, per username, with the station identifiers. Read-only and enforced as such: FreeRADIUS writes this table and nothing in the console does.",
    },
},
  "/radius/batch": {
    text:
      "Bulk user creation. A batch generates or imports a set of RADIUS users in one operation \u2014 the strategy says which \u2014 and records how many users it produced, when the credentials expire, and lets the generated credentials be retrieved.",
    from:
      "pages/RadiusBatches.jsx \u2014 headers Name, Organization, Strategy, Users, Credentials, Expires, Created; calls RadiusBatchDrawer's useCreateRadiusBatchMutation",
    notes: {
      "Browse and search RADIUS batches":
        "Past bulk-creation runs, from `radius-admin/batch/` \u2014 the strategy used, how many users it produced, and when the generated credentials expire.",
      "Create RADIUS batch":
        "Generates or imports a set of users in one operation. The strategy decides which; the credentials it produces are retrievable from the row afterwards, until they expire.",
      "Delete RADIUS batch":
        "Removes the batch record. Check what it created before deleting \u2014 the record is the only place the generated credentials are listed.",
    },
},
  "/tacacs/servers": {
    text:
      "The TACACS+ servers this controller runs: what they listen on, whether authentication and accounting are enabled, the deploy mode, and whether the running configuration matches what has been asked for \u2014 a pending count means changes are staged but not yet reloaded.",
    from:
      "pages/TacacsServers.jsx \u2014 headers Organization, Listen, Auth, Accounting, Deploy mode, Status, Pending, Last reload; calls TacacsServerDrawer's useUpdateTacacsServerMutation",
    notes: {
      "Browse and search TACACS+ servers":
        "The TACACS+ servers this controller runs, from `tacacs/server/` \u2014 what they listen on, whether authentication and accounting are on, and whether the running config matches what has been asked for.",
      "Edit TACACS+ server":
        "Changes a server's settings. The change is staged rather than live \u2014 the **Pending** count is what tells you a reload is owed.",
      "Apply or push TACACS+ server":
        "Pushes the staged configuration and reloads the server, which is what clears Pending and updates Last reload.",
      "Refresh TACACS+ server":
        "Re-reads the server's current state rather than waiting for the page to poll \u2014 the way to confirm a reload actually took.",
    },
},
  "/tacacs/client": {
    text:
      "The other side: this controller acting as a TACACS+ CLIENT, so administrators sign in to it against a TACACS+ server. It records which servers are used, the timeout, whether local logins remain possible as a fallback, and which surfaces the login applies to.\n\nShared configuration, and superuser-only \u2014 a mistake here can lock everyone out, which is why local logins exist as a switch.",
    from:
      "pages/TacacsClient.jsx \u2014 headers Organization, Servers, Auth, Timeout, Local logins, Surfaces, Status; calls the TACACS client queries plus TacacsClientDrawer's client and client-server mutations",
    notes: {
      "Browse and search TACACS+ clients":
        "This controller acting as a TACACS+ CLIENT, from `tacacs/client/` \u2014 so administrators sign in to the console against a TACACS+ server rather than a local account.",
      "Create TACACS+ client":
        "Sets up that authentication. **Local logins** is the switch to think about first: with it off, a TACACS+ outage locks everyone out of the console, including you.",
      "Edit TACACS+ client":
        "Changes the timeout, the fallback behaviour, or which surfaces the login applies to.",
      "Delete TACACS+ client":
        "Stops the console authenticating against TACACS+ and returns it to local accounts.",
      "Create TACACS+ client server":
        "Adds one server to the client's list (`tacacs/client-server/`). More than one is how you survive a single server going away.",
      "Edit TACACS+ client server":
        "Changes a server's address, secret or order in that list.",
      "Delete TACACS+ client server":
        "Removes a server from the list. Removing the last one leaves the client with nothing to authenticate against.",
    },
},
  "/tacacs/rules": {
    text:
      "Command authorization: which commands a group may or may not run. Each rule is a pattern, an action and an order \u2014 order matters, because the first matching rule decides.",
    from:
      "pages/TacacsRules.jsx \u2014 headers Order, Group, Command, Pattern, Action; calls TacacsRuleDrawer's create/update mutations",
    notes: {
      "Browse and search TACACS+ rules":
        "Command authorization rules, from `tacacs/command-rule/` \u2014 which commands a group may or may not run.",
      "Create TACACS+ rule":
        "Adds a rule. **Order matters**: the first rule whose pattern matches decides, so a broad allow placed above a narrow deny makes the deny unreachable.",
      "Edit TACACS+ rule":
        "Changes a pattern, action or position.",
      "Delete TACACS+ rule":
        "Removes a rule. Whatever it was denying now falls through to the next matching rule.",
      "Browse and search CPE user groups":
        "The groups a rule can be written against \u2014 the router-side user groups, not the console's permission groups.",
    },
},
  "/tacacs/group-secrets": {
    text:
      "The shared secret each device group uses to talk to TACACS+, and when that secret was last deployed to them. Keeping it per group is what lets a secret be rotated for part of the fleet without touching the rest.",
    from:
      "pages/TacacsGroupSettings.jsx \u2014 headers Device group, Shared secret, Last deployed, Updated; calls TacacsGroupSettingsDrawer's create/update mutations",
    notes: {
      "Browse and search TACACS+ group settings":
        "Per-device-group TACACS+ secrets, from `tacacs/device-group-settings/`, with when each was last deployed.",
      "Create TACACS+ group settings":
        "Gives a device group its own shared secret. Keeping it per group is what lets a secret be rotated for part of the fleet without touching the rest.",
      "Edit TACACS+ group settings":
        "Changes a secret. It is not live on the devices until it is deployed \u2014 **Last deployed** is the column that says whether it is.",
      "Delete TACACS+ group settings":
        "Removes the group's secret, leaving its devices with nothing to authenticate with.",
    },
},
  "/tacacs/sessions": {
    text:
      "Who is logged in through TACACS+ right now: the user, the device, where they connected from, at what privilege level, and how long they have been there.",
    from:
      "pages/TacacsSessions.jsx \u2014 headers User, Device, Source IP, Type, Privilege, Started, Duration, State",
    notes: {
      "Browse and search TACACS+ sessions":
        "Live sessions, from `tacacs/session/` \u2014 user, device, source address, privilege level and duration. Read-only by design: the server viewset is a `ReadOnlyModelViewSet`, so there is no disconnect action, and offering one would be a button that cannot work.",
    },
},
  "/tacacs/accounting": {
    text:
      "The TACACS+ command log \u2014 every command run, by whom, on which device, at what privilege and from where. The audit trail that command authorization is written against.",
    from:
      "pages/TacacsAccounting.jsx \u2014 headers When, User, Device, Source IP, Event, Command / detail, Priv, Action",
    notes: {
      "Browse and search TACACS+ accounting":
        "The command log, from `tacacs/accounting/` \u2014 what each user did, on which device, when. Read-only and deliberately so: this is the audit trail command authorization is written against. Rows are aged out by the retention window rather than deleted by hand.",
    },
},
  "/credentials": {
    text:
      "How the controller logs in to devices in order to push configuration \u2014 the SSH credentials themselves. A credential has a connection type and an organization, and can be set to attach automatically to new devices in that organization rather than being applied by hand.\n\nSSH keypairs are generated here, so a private key never has to be pasted in from elsewhere.",
    from:
      "pages/CredentialList.jsx \u2014 headers Name, Organization, Connection type, Auto add, Created, Modified; calls the credential queries plus CredentialFormModal's api.generateSshKeypair, api.createCredential, api.updateCredential",
    notes: {
      "Browse and search credentials":
        "The SSH credentials the controller uses to reach devices. A credential is bound to devices through a connection, which is what the device's own Credentials tab manages.",
      "Create credential":
        "Adds one. **Auto add** is the field that matters: with it set, the credential attaches to every new device in that organization, which is what stops a freshly registered device sitting unreachable.",
      "Edit credential":
        "Changes a credential. Devices already bound to it pick the change up on their next connection attempt.",
      "Delete credential":
        "Removes it. Any device whose only connection used it can no longer be reached, so check the device Credentials tabs first.",
      "Generate ssh keypair":
        "Creates a keypair in place, so the private half is never carried in from somewhere else.",
    },
  },
  "/monitoring/wifi-sessions": {
    text:
      "Wi-Fi association history: which client MAC joined which SSID on which device, the vendor the MAC resolves to, and when the session started and stopped. A record of who was on the wireless, not a control.",
    from:
      "pages/MonitoringWifiSessions.jsx \u2014 headers Device, Organization, SSID, MAC address, Vendor, Start time, Stop time",
    notes: {
      "Browse and search Wi-Fi sessions":
        "Association history \u2014 which client MAC joined which SSID on which device, the vendor the MAC resolves to, and when the session started and stopped.",
      "Browse and search devices":
        "The device list the session filter narrows by.",
    },
},
  "/monitoring/metrics": {
    text:
      "The metrics being collected from devices. Each row is one metric definition; the data itself is what the device detail page's Charts tab draws.",
    from:
      "pages/MonitoringMetrics.jsx \u2014 headers Metric, Created, Modified",
    notes: {
      "Browse and search metrics":
        "The metric definitions being collected. The data itself is what a device's Charts tab draws.",
      "Delete metric":
        "Removes a definition. Historic data stays; collection stops.",
    },
},
  "/monitoring/checks": {
    text:
      "The checks that decide whether a device counts as healthy \u2014 the thing behind the Online / Problem / Offline split on Devices. A check has a type and is attached to devices; its results show on the device's own Checks tab.",
    from:
      "pages/MonitoringChecks.jsx \u2014 headers Check, Check type, Created, Modified",
    notes: {
      "Browse and search all checks":
        "Every check defined across the fleet \u2014 the definitions behind the Online / Problem / Offline split on Devices.",
      "Browse and search check types":
        "The kinds of check that exist, which is what a new check is created from.",
      "Delete check":
        "Removes a check definition. The health metric it produced stops being collected, so anything on a device that depended on it goes quiet rather than turning red.",
    },
},
  "/firmware": {
    text:
      "Firmware in three parts: the CATEGORIES that group images, the BUILDS themselves with their version and OS identifier, and the UPGRADE batches that push a build to devices and report how far each one got.\n\nA build belongs to a category and targets an OS identifier, which is what stops an image being offered to hardware it does not fit.",
    from:
      "pages/FirmwareHub.jsx \u2014 headers across its three tables: Category, Name, Description, Organization, Type; Build, Version, OS identifier, Created; Devices, Status, Started",
    notes: {
      "Browse and search firewall categories":
        "The categories images are grouped into. (The call is named for the app it lives in; the page is firmware, not firewall.)",
      "Browse and search firewall builds":
        "The images themselves, each with a version and an OS identifier \u2014 the identifier is what stops a build being offered to hardware it does not fit.",
      "Browse and search batch ops":
        "Upgrade batches: which devices a build was pushed to and how far each one got.",
      "Delete firewall build":
        "Removes an image. Devices already running it are unaffected \u2014 this withdraws it from future upgrades.",
      "Delete firewall category":
        "Removes a category. Check the builds filed under it first; a category is how they are found.",
    },
},
  "/settings/site": {
    text:
      "The site's name and domain \u2014 two fields from django.contrib.sites, and neither is cosmetic. The domain is interpolated into the links in every alert email, so a wrong value here produces mail whose links go nowhere.",
    from:
      "pages/SiteSettings.jsx \u2014 its own header comment: \"django.contrib.sites holds two fields, but they are not cosmetic: `domain` is what every alert email interpolates into its links, so a wrong value\u2026\"",
    notes: {
      "Edit site":
        "Changes the site name and domain. The **domain** is what every alert email interpolates into its links, so a wrong value here produces mail whose links go nowhere.",
    },
},
  "/settings/email-alerts": {
    text:
      "Which alerts are sent by email, and the templates they are sent with. Alerts can be switched on and off individually or in bulk, and the templates that carry their wording are edited here \u2014 kept separate from the rules, so message text can change without touching what counts as a problem.",
    from:
      "pages/EmailAlerts.jsx with AlertConfigTable and EmailTemplatesTable \u2014 calls api.setAlertEnabled, api.setAlertEnabledBulk, api.deleteEmailTemplate",
    notes: {
      "View alert hub":
        "The alert catalogue \u2014 every alert that can be sent, and whether it currently is.",
      "Delete email template":
        "Removes a message template. Templates carry the wording an alert is sent with, kept separate from the rule so text can change without touching what counts as a problem.",
      "Set alert enabled":
        "Turns one alert on or off.",
      "Set alert enabled bulk":
        "Turns a whole set on or off at once, rather than one row at a time.",
    },
  },
  "/settings/notifications": {
    text:
      "Per-user notification preferences \u2014 which notifications you personally receive, as switches rather than checkboxes so each is a single tap target.",
    from:
      "pages/NotificationPreferences.jsx \u2014 its header comment: \"A switch is clearer than a checkbox for an on/off preference and reads as one tap target\"",
    notes: {
      "Browse and search notif settings":
        "Your own notification preferences \u2014 which notifications you personally receive. Per-user, not global.",
      "Edit notif setting":
        "Toggles one preference. Rendered as a switch rather than a checkbox, so each is a single tap target.",
    },
},
  "/reports": {
    text:
      "The report catalogue: what each report covers, the category it belongs to, and when it was last updated. Reports are opened from here, and a custom report can be built with the customize wizard \u2014 choosing the columns and the devices it covers.",
    from:
      "pages/ReportsHub.jsx \u2014 headers Report, Category, Description, Updated; calls CustomizeWizard's api.getReportColumns, api.listReportDevices, api.createCustomReport, api.updateCustomReport",
    notes: {
      "Browse and search report templates":
        "The built-in reports, from `/reports/template/` \u2014 the catalogue this page lists.",
      "Browse and search custom reports":
        "Reports built here rather than shipped, from `/reports/custom/`.",
      "Create custom report":
        "Builds one in the customize wizard \u2014 pick the columns and the devices it covers.",
      "Edit custom report":
        "Changes a custom report's columns or device scope.",
      "Delete custom report":
        "Removes it. Built-in templates cannot be deleted; only custom ones.",
      "View report columns":
        "The columns available for a given report, which is what the wizard offers as choices.",
      "Browse and search report devices":
        "The devices a report can be scoped to, for the same wizard.",
    },
},
  "/logs/access": {
    text:
      "Sign-ins, sign-outs and failed attempts. Scoped per user: a non-superuser sees only their own rows.",
    from:
      "pages/AccessLog.jsx \u2014 its header comment: \"Sign-ins, sign-outs and failed attempts\", with the same per-user scoping rule as the activity log",
    notes: {
      "Browse and search access log":
        "Sign-ins, sign-outs and failed attempts. Scoped per user: a non-superuser sees only their own rows.",
    },
},
  "/logs/activity": {
    text:
      "Who changed what. Same envelope and the same per-user scoping rule as the access log \u2014 a non-superuser sees only their own rows.",
    from:
      "pages/ActivityLog.jsx \u2014 its header comment: \"Who changed what. Same envelope and the same per-user scoping rule as the access log \u2014 a non-superuser sees only their own rows\"",
    notes: {
      "Browse and search activity log":
        "Who changed what \u2014 the same envelope and the same per-user scoping rule as the access log.",
    },
},
  "/logs/device": {
    text:
      "Syslog from the devices themselves. Unlike the other three logs this is not a database table \u2014 the view proxies Graylog and parses each line, so what you can search here is bounded by what Graylog holds rather than by the controller's own database.",
    from:
      "pages/DeviceLog.jsx \u2014 its header comment: \"Syslog from the devices themselves. Unlike the other three this is not a database table \u2014 the view proxies Graylog, parses each line\u2026\"",
    notes: {
      "Browse and search device log":
        "Syslog from the devices. Unlike the other three logs this is not a database table \u2014 the view proxies Graylog and parses each line, so what you can search is bounded by what Graylog holds.",
      "Browse and search device log hostnames":
        "The hostnames Graylog has seen, which is what the device filter on this page offers.",
    },
},
  "/logs/firmware": {
    text:
      "Upgrade lifecycle events, synced from each device's own `/etc/ns-update-audit.jsonl`. The record of what a device did during an upgrade, taken from the device rather than inferred from the controller's side of it.",
    from:
      "pages/FirmwareLog.jsx \u2014 its header comment: \"Upgrade lifecycle events synced from each device's /etc/ns-update-audit.jsonl\"",
    notes: {
      "Browse and search firmware log":
        "Upgrade lifecycle events, synced from each device's own `/etc/ns-update-audit.jsonl` \u2014 taken from the device rather than inferred from the controller's side of the upgrade.",
    },
},
  "/devices/:id": {
    text:
      "One device, in depth \u2014 reached by opening a row in [Devices](/controller/network/devices), not from the menu.\n\nThe page is mostly its fourteen tabs, and they run roughly in the order you would ask questions in: is it healthy, what is it carrying, what has it been doing, then what is it configured with. Most of them are the corresponding section of the old Django admin device page, rebuilt.\n\nThe device payload is fetched once with `GET /monitoring/device/<id>/?status=true` \u2014 the `?status=true` matters, because without it the response carries no `data` key and the Status tab has nothing to render. Tabs that need something outside that payload (availability, DPI, commands) fetch it themselves when opened.",
    from:
      "pages/DeviceDetail.jsx \u2014 the TABS literal (14 entries) and the RANGES literal; each tab's body from the panel component it mounts, described from that component's own header comment",
    notes: {
      "View device system context":
        "The system-defined variables for this device \u2014 the values the controller fills in when it renders a template, shown on the Configuration tab so you can see what a variable will actually resolve to.",
      "Create device check":
        "Adds a monitoring check to this device, on the Checks tab. A check is what produces a health metric, so adding one changes what the Summary tab's Health card reports.",
      "Create device command":
        "Runs a command against the device \u2014 `POST /controller/device/<id>/command/`. Both the Commands tab and every Diagnostics tool go through this: a diagnostic is a Command with a type and an input.",
      "Create device connection":
        "Binds an access credential to this device, on the Credentials tab, so the controller can reach it over SSH.",
      "Delete device check":
        "Removes a check. The metric it produced stops being counted on the Health card.",
      "Delete device connection":
        "Unbinds a credential from the device.",
      "Edit device":
        "The device's own fields \u2014 name, organization, group, location and notes \u2014 in the edit drawer opened from the page header.",
      "Edit device alert settings":
        "Sets the alert threshold for one of the device's metrics, on the Alerts tab. Silencing a metric changes what the Health card counts, so the device is reloaded after a change.",
      "Edit device check":
        "Changes a check in place \u2014 its active toggle and its parameters \u2014 without leaving the Checks tab.",
      "Edit device connection":
        "Changes which credential is bound, or re-tests it.",
      "Export backup":
        "Downloads a configuration backup of the device.",
      "Set device firmware":
        "Starts an upgrade \u2014 `firmware-upgrader/device/<id>/firmware/`. The OpenWrt sysupgrade flags come with it, and preserving `/etc/` is on by default because that is what the upgrade daemon itself defaults to.",
      "Browse and search check types":
        "The kinds of check that can be added, from `GET /monitoring/check-type/` \u2014 the list the Checks tab offers.",
      "Browse and search credentials":
        "The credentials available to bind, so the Credentials tab can offer a choice rather than a free-text field.",
      "Browse and search device alert settings":
        "The per-metric alert rows the Alerts tab lists.",
      "Browse and search device available firmware":
        "Images this device could be upgraded to, from `firmware-upgrader/device/<id>/available-firmware/` \u2014 filtered to its OS identifier, so an image for other hardware is never offered.",
      "Browse and search device checks":
        "The checks currently bound to the device.",
      "Browse and search device commands":
        "Command history for the Commands tab. The API orders oldest-first and paginates, so the page requests it in reverse rather than sorting one page of results.",
      "Browse and search device connections":
        "Which credentials are bound, and the result of the last connection attempt.",
      "Browse and search device groups":
        "The groups available when reassigning the device.",
      "Browse and search device upgrade ops":
        "Past and running upgrades, from `firmware-upgrader/device/<id>/upgrade-operation/` \u2014 how far each got and whether it finished.",
      "Browse and search pre upgrade backups":
        "Backups taken automatically before an upgrade (`firmware-pre-upgrade-backup/?device=<id>`) \u2014 what you restore from if one goes wrong.",
      "Browse and search templates":
        "The templates that can be attached, for the Configuration tab.",
      "View device":
        "The device itself \u2014 `GET /monitoring/device/<id>/?status=true`. The whole page hangs off this one request; `?status=true` is what makes the response carry the `data` key the Status tab renders.",
      "View device availability":
        "Uptime for the Events tab, over a window the server computes. Not part of the main device payload, so this tab fetches its own.",
      "View device charts":
        "Metric series for the Charts tab, over the selected range.",
      "View device command":
        "One command's detail and its current state. Diagnostics polls this until the row leaves `in-progress`.",
      "View device config":
        "The device's stored configuration \u2014 state, backend, applied templates and variables.",
      "View device firmware":
        "What is installed now, against what is available.",
      "View device location":
        "Where the device is, for the Map tab.",
      "View device realtime traffic":
        "The live traffic feed on the Traffic tab, for a from/to window.",
      "View device rendered config":
        "The NetJSON as actually rendered for this device \u2014 `controller/device/<id>/rendered-configuration/` \u2014 templates and variables resolved, which is what is really pushed.",
      "View device traffic":
        "Historical DPI traffic for the Traffic tab, by application.",
      "View device wan interfaces":
        "The device's WAN interfaces, from `/diagnostics/<id>/wan-interfaces/` \u2014 used by the diagnostics tools that need an interface to run against.",
    },
    tabs: {
      "Summary":
        "The landing tab: a Health card built from the device's checks, alongside its identity and current state \u2014 model, platform, firmware, addresses, config backend and whether it is registered.",
      "Status":
        "The NetJSON the device itself last reported, grouped as the admin page grouped it \u2014 System, Network, Cellular and the rest. It renders from the payload the page already holds, so opening it costs no extra request.",
      "Traffic":
        "The DPI view for this device: what it is actually carrying, by application. The SD-WAN sub-view is reachable from the CPE tab, which switches here when you follow it.",
      "Checks":
        "The monitoring checks bound to this device, editable in place \u2014 an active toggle, a check type, add and remove. This is the tab that decides what the Summary tab's Health card lists, because a check is what produces a health metric.",
      "Alerts":
        "The alert threshold for each of the device's metrics, one row per metric rather than a form card each. Silencing a metric here changes what the Health card counts, so the device reloads when you change one.",
      "Events":
        "Up/down history \u2014 an uptime summary for the chosen window, and every up/down interval beneath it. The window is computed server-side, so this tab fetches its own data rather than reusing the device payload.",
      "Commands":
        "Every command run against this device, newest first. The API orders oldest-first and paginates, so the page requests it in reverse instead of re-sorting a page of results that might not be the newest.",
      "Diagnostics":
        "Ping, traceroute and the rest. Every tool is a Command: the type and input are POSTed, then the row is polled until it leaves `in-progress`. Execution is SSH throughout \u2014 each tool resolves to a shell string that runs on the router.",
      "Charts":
        "Metric graphs over a chosen window. The ranges are 24 hours, 3 days, 7 days, 30 days and 1 year, or a start and end you pick yourself.",
      "Map":
        "Where the device is, and the controls to change it \u2014 the location's facts in a narrow column beside a map that gets the width, because the map is the thing being looked at.",
      "Configuration":
        "State and backend, the templates applied to the device, the variables overriding template defaults, and the rendered NetJSON. Templates and variables are editable in place.",
      "Firmware":
        "The upgrade for this device, with the OpenWrt sysupgrade flags mirroring the upgrader's own schema. Preserving `/etc/` is on by default, which is the safe default the upgrade daemon itself uses.",
      "Credentials":
        "The access credentials bound to this device and the result of the last connection attempt. Secrets are never rendered \u2014 a credential's parameters hold an SSH password or key, and the page shows that one exists, not what it is.",
      "CPE":
        "The router's own web UI, rebuilt inside the controller. Last in the list because it is a different kind of thing from the tabs before it: those read controller state, this one talks to the device. Roughly 33 pages across eight groups \u2014 Performance SLA, Policy Engine, Firewall, Network, Security, VPN, OOBM and Log & Reports. Mounted only while the tab is open, so its background polling stops when you leave.",
    },
  },

  // ---- reachable, but not from the sidebar --------------------------------
  //
  // Six screens the nav never points at. They are opened from a button on
  // another page, so the generator — which walks `NAV` — could not see them, and
  // the handbook described the console as if they did not exist.

  '/devices/map': {
    text:
      'Every device’s site on one map, with the fleet broken down beside it: state → site → device, each level carrying its online and total counts. Opened from the device list, not from the sidebar.\n\n' +
      'Sites come from `/monitoring/geojson/`, which already counts each site’s devices by health — so a bubble is sized and coloured without asking about any individual device, and a site’s device list is fetched only when you expand it. A bubble takes the worst status present: one unreachable device at a site is what an operator needs to see, not the nine that are fine.\n\n' +
      'The map tiles come from an external host. On a firewalled controller every tile request fails and the map would be a blank grey square, so the page detects that and says so rather than looking as though it found no sites.',
    from:
      'reads pages/FleetMap.jsx — the leading note, `siteTone` (worst status wins), the log-scaled `bubble` sizing, the lazy per-site device fetch and the tile-failure detection',
    notes: {
      "Browse and search device geo":
        "Every device's position in one request, from `/monitoring/geojson/` \u2014 the feed the map plots, shaped for drawing rather than for a table.",
      "Browse and search location devices":
        "The devices at one location (`/monitoring/location/<id>/device/`), fetched when you open a pin rather than up front, so a fleet-wide map does not carry every device list with it.",
    },
},

  '/devices/:id/sdlan': {
    text:
      'Reaching one router’s own services through the controller. Opened from the **SDLAN Access** button on a device’s page.\n\n' +
      'The page is built around intent rather than wire protocol: you choose what you want to reach and it fills in where that lives on a NexappOS router — the router GUI on `443`, a user terminal at `/api/ttyd/`, a root shell on `7681`. Those targets are taken from the controller’s own `wg-*.conf`, which is how the admin’s Web Access, Terminal and Root buttons have always reached them. **Advanced** still exposes the raw target, for anything else on the LAN behind the router.\n\n' +
      'Whether a session opens inside the page or has to open in a tab is a property of the service, not a preference. The router’s GUI sends `X-Frame-Options: DENY`, and a tunnel is a raw TCP forward with nowhere to strip that header, so it is browser-only; `ttyd` is itself a web server, so a shell renders in the frame.',
    from:
      'reads pages/SdlanAccess.jsx — the `SERVICES` table (each entry’s intent, hint, default ip/port/path and `frameable` flag), the leading note recording that these come from the controller’s `wg-*.conf`, and the Advanced form',
    notes: {
      "Create remote access":
        "Adds a target. You pick the **intent** \u2014 web access, user terminal or root terminal \u2014 and the page resolves where that actually lives on a NexappOS router: web access is `https://<ip>:443/`, a user terminal is `https://<ip>:443/api/ttyd/`, and a root terminal is `https://<ip>:7681/`. Nobody should be typing a ttyd base path to get a shell. Advanced still exposes the raw target for anything else on the LAN.",
      "Edit remote access":
        "Changes a saved target's address, port or intent.",
      "Delete remote access":
        "Removes it.",
      "Open remote access":
        "Opens the session to that endpoint.",
      "Close remote access":
        "Ends it.",
    },
},

  '/device-groups/tree': {
    text:
      'The parent/child shape of the device groups, drawn as a tree instead of read off the list’s Parent column one row at a time. Opened from the button in the Device Groups header, the same way the fleet map opens off the device list.\n\n' +
      'Every node is editable in place — add a sub-group under it, edit it, delete it — because the tree is where the hierarchy is actually understood, and sending someone back to a flat list to change a parent they can see in front of them is the long way round. All three go through the same drawer and the same mutations the list page uses, so there is one create and update path in the app rather than two.\n\n' +
      'Organizations are the roots, because two groups of the same name in different organizations are two different groups. Structure only: there are no device counts here. Hierarchy answers “how many devices are under this branch” and pays for a request per node to do it, while this page draws itself from the two lists the Device Groups screen has already cached and issues no request of its own.',
    from:
      'reads pages/DeviceGroupTree.jsx — the leading note, `GroupNode` and `OrgNode` with their add/edit/delete controls, `subtreeSize`, the zoom and expand/collapse toolbar, and its use of `useListGroupsQuery` and `useListOrganizationsQuery`',
    notes: {
      "Browse and search devices":
        "The devices inside each group, so a branch shows what is actually in it rather than just its name.",
      "Browse and search templates":
        "The templates attached at each level, which is what devices in a group inherit.",
      "Create device group":
        "Adds a group directly in the tree, under the branch you are looking at, so the parent is chosen by position rather than from a dropdown.",
      "Edit device group":
        "Renames a group or moves it. The tree supports drag and drop, so moving a branch reparents it \u2014 and everything under it moves too.",
      "Delete device group":
        "Removes a branch. Its devices lose whatever that group passed down, so check what is under it before deleting.",
    },
},

  '/network-topology/topologies/:id/graph': {
    text:
      'One topology, drawn — the React counterpart of the admin’s “View topology graph” button, reached from the row menu on Topologies.\n\n' +
      'It is a route rather than a popup window, deliberately: a popup cannot be linked to, bookmarked or reached with the back button, and inside a single-page app it would have to re-authenticate itself. The page fills the viewport and does not scroll, because the wheel belongs to the canvas — a graph you must scroll the page to see the bottom of is one you cannot pan around.\n\n' +
      'Three things the admin’s visualiser does are kept: live updates, pushed over `ws/network-topology/topology/<pk>/` whenever the record changes; history, where choosing a date returns that day’s snapshot; and download of the NetJSON payload as a file. Choosing a date also freezes the live updates — a websocket frame overwriting the history you just asked for would be the graph quietly answering a different question.',
    from:
      'reads pages/NetTopologyGraph.jsx — the leading note, the live/`date` snapshot toggle and why it freezes updates, the websocket subscription, and the history and download paths',
    notes: {
      "View net topology":
        "Fetches one topology and draws it \u2014 `/network-topology/topology/<id>/?include_unpublished=true`. The flag is what lets an unpublished topology be viewed at all, so a parse can be checked before anyone else sees it.",
    },
},

  '/monitoring/metrics/recover': {
    text:
      'Metrics that were deleted, and can be brought back. Opened from the button on Monitoring › Metrics.\n\n' +
      'django-reversion keeps a version row for every tracked save, so a metric whose id is gone from the table but still has versions is a deletion that can be undone. Recovery restores the metric under its original id, so anything that referenced it lines up again.\n\n' +
      'What does not come back are its charts and alert settings. Those are separate objects, the Django admin behaves the same way, and the confirmation says so rather than letting you assume otherwise.',
    from:
      'reads pages/MetricRecover.jsx — the leading note on django-reversion, the confirm dialog’s wording about charts and alert settings, and its calls to `useListDeletedMetricsQuery` and `useRecoverMetricMutation`',
    notes: {
      "Browse and search deleted metrics":
        "Metrics that were deleted but are still held, the way deleted devices are.",
      "Recover metric":
        "Restores one \u2014 `monitoring/metric-deleted/<version>/recover/`. It reverts the stored version, so the metric comes back with its settings rather than as a blank.",
    },
},

  '/reports/:slug': {
    text:
      'One page renders every report in the catalog. Reached by opening a report from Reports.\n\n' +
      'It can, because every report service already answers with the same shape — title, period, generated_at, all_columns, devices — and the backend’s `_pick_report_fns` maps every slug onto it. So this is not a per-report template; it is the table those services were always describing. Range presets, search, sorting, column hiding, paging and CSV export are therefore identical on every report.\n\n' +
      '`/reports/custom/<id>` is this same page in custom mode, pointed at a saved custom report whose rows are several reports merged server-side.',
    from:
      'reads pages/ReportView.jsx — the leading note on the shared response shape, the `custom` prop the `/reports/custom/:id` route sets in App.jsx, and `RANGE_PRESETS`, `dedupeColumns` and `exportUrl` from utils/reports.js',
    notes: {
      "View report data":
        "Runs a built-in report and returns its rows \u2014 `/reports/data/<slug>/`, with the filters you chose passed as query parameters.",
      "View custom report data":
        "The same for a report built in the customize wizard \u2014 `/reports/custom/<id>/data/`. Two endpoints because a built-in report is addressed by slug and a custom one by id.",
    },
},

  "/settings/maintenance": {
    text:
      "Planned maintenance windows \u2014 periods when a device or the fleet is expected to be down, so the alerting does not treat scheduled work as a fault. Each row shows when the window starts and ends, how long it runs, its current state, and who was notified.",
    from:
      "pages/MaintenanceWindows.jsx \u2014 headers Window, Starts, Ends, Length, State, Users notified; calls useListMaintenanceWindowsQuery, useCancelMaintenanceWindowMutation, useDeleteMaintenanceWindowMutation; endpoints under `system/maintenance/`",
    notes: {
      "Browse and search maintenance windows":
        "The scheduled windows, from `system/maintenance/`, with the state of each \u2014 upcoming, running, or finished.",
      "Create maintenance window":
        "Schedules one: what it covers, when it starts and how long it runs. Notifications go to the users listed on it, which is what stops planned work being reported as an outage.",
      "Edit maintenance window":
        "Changes a window's timing or scope (`PATCH system/maintenance/<id>/`).",
      "Stop maintenance window":
        "Cancels a window that is running or upcoming. Distinct from deleting it \u2014 the record stays, it simply stops applying, so the history of what was scheduled survives.",
      "Delete maintenance window":
        "Removes the record entirely, including from the history.",
    },
  },
};

/**
 * Notes for operations that mean the SAME thing wherever they appear.
 *
 * `Browse and search organizations` is on 21 pages and is the scope picker's
 * list on every one of them. Writing that out 21 times would be 21 places to
 * update and 21 chances to drift, so it is written once here and used wherever
 * a page does not say something more specific.
 *
 * A page's own `notes` entry ALWAYS wins. These are a floor, not a ceiling —
 * and where an operation genuinely differs by page (`Browse and search devices`
 * is the fleet count on the Dashboard and a router picker on SD-LAN) it is
 * deliberately absent from this map and written per page instead.
 */
export const COMMON_NOTES: Record<string, string> = {
  "Browse and search organizations":
    "The organization list \u2014 what the scope picker narrows the page by, and what fills the Organization field on its forms. Almost every record in the controller is organization-scoped, which is why this call appears on so many pages.",
  "Browse and search groups":
    "The device-group list \u2014 the second half of the scope picker, and the group field on this page's forms.",
  "Browse and search net topologies":
    "The parsed topologies a record here can belong to, so the form can offer a choice rather than an id.",
  "Browse and search net nodes":
    "The nodes a link can join, for the same reason.",
  "Browse and search locations":
    "The saved locations a device can be placed at.",
};
