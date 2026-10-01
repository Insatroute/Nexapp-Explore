/**
 * Hand-written guidance for the Intelligence pages, in the same shape as
 * `admin-notes.ts` and rendered by `guide-admin.ts` (images under
 * `public/img/intel/<shotDir>/`). Pinned by `check:descriptions` under
 * `intel:<route>` to the files named in `from`.
 */
import type { AdminNotes } from './admin-notes.ts';

const APPLICATIONS: AdminNotes = {
  from: [
    'pages/AppIntelHub.jsx',
    'pages/appintel/AppDatabase.jsx',
    'dpi_analytics/api/views_app_database.py',
    'traffic_application/admin.py',
  ],
  title: 'Using the application catalogue',
  intro: [
    'This page is the **DPI application catalogue** — every application the DPI engine can recognise, with the signatures (domain and network patterns) it recognises it by. It is the same catalogue the Django admin shows.',
    '<Callout type="info">**Read-only.** Nothing here is added, edited or deleted. The *Edit resource* and *Delete resource* actions listed above come from a generic table definition this screen does not use. Custom applications are registered by an administrator in the Django admin, under **Traffic application › Applications**.</Callout>',
    'Across the top, four tiles summarise the catalogue: **Unique applications**, **Categories**, **Total signatures**, and **Custom apps** (applications registered by an administrator). Below them, one row per application: **App name**, **App ID**, **Category**, how many **Signatures** it has, and its **Source** — *DPI Engine* for the shipped catalogue, *Custom* for administrator-added signatures. Sorted by name, ten per page by default.',
  ],
  before: [
    'The catalogue is the same for every organization — the organization picker at the top does not narrow it.',
  ],
  tasks: [
    {
      title: 'Find which application a domain or address belongs to',
      steps: [
        'Open **Intelligence › Application Intelligence › Applications**.',
        'Type part of a name **or a pattern** into **Search applications, patterns…** — for example `zoom`, `whatsapp.net` or `googlevideo` — and press **Enter**. The search runs on Enter, not as you type.',
        'Every application with a matching name or at least one matching signature is listed.',
        'Click the application’s name to open its details.',
      ],
    },
    {
      title: 'Browse a category or source',
      steps: [
        'Choose a category in **All categories** — e.g. *Games*, *Telco*, *Cybersecurity* — to list only that category.',
        'Choose **DPI Engine** or **Custom** in **All sources** to separate the shipped catalogue from administrator-added signatures.',
        'Filters and search combine; each change returns to page 1. Use the page controls and **/ page** at the bottom to move through long lists.',
      ],
    },
    {
      title: 'Read an application’s details',
      steps: [
        'Click the application’s name. A panel opens on the right with its internal **Application** name, **App ID**, **Category**, **Source**, number of **Signatures** and when it was **Last updated**.',
        'Below them, **Domain patterns** and **Network patterns** list every signature, each group with its count — the full list, not the three examples the table is built from.',
        'Close the panel with ✕.',
      ],
      shot: 'details.png',
    },
  ],
  forms: [],
  sections: [
    {
      title: 'Adding or changing an application',
      body: [
        'Not on this page. Custom applications are registered in the Django admin under **Traffic application › Applications**, where an administrator sets the application name and tag, its traffic class and risk level, and its match rules (domains, IPs, ports). The DPI engine’s own applications are read-only there too.',
        'The **Custom apps** tile counts those registered applications. The list below it is built from signatures, so a custom application shows in the list — and under the **Custom** source — only once it has signatures of its own.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['Typing in the search box changes nothing', 'The search runs when you press Enter.', 'Press **Enter**.'],
    ['*No applications match this filter.*', 'The category, source and search together match nothing.', 'Reset the selects to **All categories** / **All sources** and clear the search.'],
    ['**Custom apps** shows a number but the **Custom** source lists nothing', 'The tile counts registered custom applications; the list shows only applications that have signatures.', 'Check the application’s match rules in the Django admin.'],
    ['*Could not load the full pattern list.* in the details panel', 'The detail request failed; the summary above it is still correct.', 'Close the panel and open it again.'],
    ['An application shows **—** under Category', 'The DPI engine has not classified it.', 'Nothing to fix; it is still matched by its signatures.'],
  ],
  shotDir: 'applications',
  shots: [
    { file: 'list.png', what: 'The Applications catalogue — the four summary tiles, the category, source and search controls, and the list of applications with their App ID, category, signature count and source.', alt: 'The Applications catalogue' },
    { file: 'details.png', what: 'An application’s details panel, with its domain and network patterns.', alt: 'An application’s details' },
  ],
};

const APP_TRAFFIC: AdminNotes = {
  from: [
    'pages/appintel/models.js',
    'pages/appintel/filters.js',
    'pages/appintel/appName.js',
    'components/crud/ResourceTable.jsx',
    'dpi_analytics/api/views.py',
  ],
  title: 'Reading application traffic',
  intro: [
    'Every record is one application’s traffic through one router over one reporting period, as the router’s DPI engine counted it: how much went **down** and **up**, over how many **flows**, between **From** and **To**. Newest first.',
    '<Callout type="info">**Read-only.** Records arrive from the routers on their own; nothing here is added, edited or deleted. The *Edit* and *Delete* actions listed above come from the generic table definition and are switched off for this table.</Callout>',
    'The four tiles describe **every record you can see**, not just the page on screen: **Total records**, how many different **Applications**, **Total traffic** (download + upload) and **Total flows**. They follow the search box and the organization picker. The columns are **Application**, **Category**, **Protocol**, **Download**, **Upload**, **Total**, **Flows**, **Device**, **From** and **To**; **Columns** hides any you do not need.',
  ],
  before: [
    'Records appear only for routers whose DPI engine is running and reporting.',
  ],
  tasks: [
    {
      title: 'Find one application’s or one router’s traffic',
      steps: [
        'Open **Intelligence › Application Intelligence › App Traffic**.',
        'Type an application name (`zoom`, `whatsapp`) or a router name into **Search app traffic…** and press **Enter**. The search runs on Enter, on the server, over application and device names — so it covers every record, and the tiles change to match.',
        'Use the page controls at the bottom to move through the results.',
      ],
    },
    {
      title: 'Narrow the page by device or category',
      steps: [
        'Choose a value in **All devices** or **All categories**.',
        'These two filters work on **the page you are looking at**: they offer only the devices and categories on that page, and hide the other rows on it. They do not search the full history, and the tiles do not change. To see all of one router’s or one application’s traffic, use the search box instead.',
      ],
    },
    {
      title: 'Open a record',
      steps: [
        'Click the application name. A read-only panel opens with every field of the record, plus three that are not in the table: **WAN link**, **Tunnel** and **Steering rule** — where on the WAN that traffic went, when the router reports it.',
        'Close it with ✕.',
      ],
      shot: 'details.png',
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the values mean',
      body: [
        '- **Application** — the DPI engine’s name for the traffic, shown without its `netify.` prefix. **unknown** means the engine could not identify it.\n- **Category** — the application’s category in the catalogue on the **Applications** page.\n- **Protocol** — the protocol the engine saw, e.g. TLS, DNS, NTP, ICMP.\n- **Download / Upload / Total** — bytes in each direction over the period, and both together.\n- **Flows** — how many separate connections made up that traffic.\n- **Device** — the router that reported it.\n- **From / To** — the reporting period the record covers.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['Typing in the search box changes nothing', 'The search runs when you press Enter.', 'Press **Enter**.'],
    ['A device is missing from **All devices**', 'The list offers only devices on the current page.', 'Search for the device name instead.'],
    ['The tiles did not change after picking a device or category', 'Those filters act on the page on screen; the tiles describe everything matching the search.', 'Search for the device or application to narrow the tiles.'],
    ['Most rows say **unknown**', 'The DPI engine could not identify that traffic — common for encrypted or uncommon services.', 'Nothing to fix here; the bytes and flows are still counted.'],
    ['No records at all', 'No router in your organizations has reported DPI traffic.', 'Check that the routers are online and their DPI engine is enabled.'],
    ['**WAN link**, **Tunnel**, **Steering rule** show **—** in the panel', 'The router did not report a path for that traffic.', 'Expected on routers without SD-WAN steering.'],
  ],
  shotDir: 'app-traffic',
  shots: [
    { file: 'list.png', what: 'App Traffic — the device, category and search controls, Columns, the four fleet-wide tiles, and the newest records.', alt: 'The App Traffic list' },
    { file: 'details.png', what: 'One traffic record opened, with the WAN link, Tunnel and Steering rule fields at the end.', alt: 'A traffic record' },
  ],
};

const DISCOVERED: AdminNotes = {
  from: [
    'pages/appintel/models.js',
    'pages/appintel/filters.js',
    'components/crud/ResourceTable.jsx',
    'dpi_analytics/models/device_profile.py',
    'dpi_analytics/tasks.py',
    'dpi_analytics/api/views.py',
    'dpi_analytics/admin.py',
  ],
  title: 'Reading discovered devices',
  intro: [
    'Each record is **one MAC address that a router’s DPI engine reported**, with the address it reported for it and the traffic counted against it. A MAC seen by two routers is two records — one per router. Most recently seen first.',
    '<Callout type="info">**Read-only, and filled in automatically.** Records are created and updated from the routers’ DPI reports; nothing here is added, edited or deleted. Only a device’s **Status** and **Owner** can be changed, by an administrator in the Django admin under **DPI analytics › Discovered Devices**.</Callout>',
    'The tiles count **every** record you can see, not just this page: **Total devices**; **New (24h)** — first seen in the last 24 hours, whatever their status now; **Known**; and **New**. Known and New are the two statuses, so they add up to the total; **New (24h)** is a different measure and does not have to match **New**.',
  ],
  before: [
    'Records appear only for routers whose DPI engine is running and reporting.',
  ],
  tasks: [
    {
      title: 'Find a device',
      steps: [
        'Open **Intelligence › Application Intelligence › Discovered Devices**.',
        'Type a **MAC address**, **IP address**, hostname or vendor into **Search discovered devices…** and press **Enter**. The search runs on the server over those four fields — not over the router name in the **Device** column.',
        'To narrow the page on screen, use **All statuses** or **All device types**. Like App Traffic, these two act only on the rows of the current page.',
      ],
    },
    {
      title: 'Open a device',
      steps: [
        'Click the router name in the **Device** column. The panel is titled by the discovered device’s hostname, or its MAC when it has none, and shows every field plus **OS** and **Vendor**.',
        'Close it with ✕.',
      ],
      shot: 'details.png',
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the values mean',
      body: [
        '- **Device** — the router that reported this MAC.\n- **MAC address** — the device’s hardware address; with the router, what makes the record unique.\n- **IP address** — the first address the router listed for that MAC, preferring one that is not an IPv6 link-local (`fe80:…`) address — a link-local one is shown only when it is all the router reported. It is stored as reported and not checked to be a LAN address, so an entry such as `8.8.8.8` or `0.0.0.0` means the router’s DPI engine associated that address with the MAC — not that a host with that address sits behind the router.\n- **Status** — **new** the first time a MAC is reported; it becomes **known** automatically the next time the same router reports it. *Known* therefore means *seen more than once*, not *approved*. An administrator can set a status — including **rogue** — in the Django admin.\n- **Total download / Total upload** — traffic counted against this MAC since it was first seen, added up report by report.\n- **Hostname**, **Type**, **OS**, **Vendor** — present in the record but not filled in by the DPI reports, which is why they usually show **—** and **other**.\n- **First seen / Last seen** — when the router first and most recently reported it.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['Searching for a router name finds nothing', 'The search covers MAC, IP, hostname and vendor only.', 'Search by MAC or IP, or page through the list.'],
    ['Addresses such as `8.8.8.8` or `0.0.0.0` appear', 'They are recorded exactly as the router’s DPI engine reported them for that MAC.', 'Treat the MAC, not the IP, as the identity of the record.'],
    ['Almost every device is **known**', '*Known* means reported more than once, which is true of nearly anything that stays connected.', 'Use **First seen** or the **New (24h)** tile to spot newcomers.'],
    ['Hostname and Type are empty everywhere', 'The DPI reports do not carry them.', 'Expected.'],
    ['The same device appears twice', 'It was seen by two routers.', 'Expected — one record per router.'],
  ],
  shotDir: 'discovered-devices',
  shots: [
    { file: 'list.png', what: 'Discovered Devices — the status, type and search controls, Columns, the four tiles, and the newest devices. MAC addresses are redacted in this picture.', alt: 'The Discovered Devices list' },
    { file: 'details.png', what: 'One discovered device opened, with OS and Vendor at the end.', alt: 'A discovered device' },
  ],
};

const SNAPSHOTS: AdminNotes = {
  from: [
    'pages/appintel/models.js',
    'components/crud/ResourceTable.jsx',
    'dpi_analytics/api/views.py',
  ],
  title: 'Reading DPI snapshots',
  intro: [
    'Each router’s DPI engine sends the controller a report every few minutes; every report is one **snapshot** — what the engine was tracking at that moment and how the engine itself was doing. Newest first. Use it to check that a router’s DPI engine is alive and reporting, and how busy it is.',
    '<Callout type="info">**Read-only.** Snapshots are written by the routers; nothing here is added, edited or deleted.</Callout>',
    'The tiles describe **every** snapshot you can see, not just this page: **Total snapshots**, how many arrived in the **Last 24h**, how many **Unique devices** sent them, and the **Avg flow count** across all of them. They follow the search box and the organization picker.',
  ],
  before: [],
  tasks: [
    {
      title: 'Check that a router is reporting',
      steps: [
        'Open **Intelligence › Application Intelligence › Snapshots**.',
        'Type the router’s name into **Search snapshots…** and press **Enter** — the search matches router names only, and covers every snapshot.',
        'Look at the newest **Timestamp**. A router that is reporting has a snapshot from the last few minutes, and its **Uptime** keeps growing from one to the next; uptime dropping back means the DPI engine restarted.',
      ],
    },
    {
      title: 'Open a snapshot',
      steps: [
        'Click the router name. A read-only panel shows every value plus the **Agent build** — the version the router’s DPI engine reports (e.g. `4.4.3`), useful for spotting a router on a different version.',
        'Close it with ✕.',
      ],
      shot: 'details.png',
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the values mean',
      body: [
        '- **Device** — the router that sent the report.\n- **Flow count** — connections the engine was tracking.\n- **Identified / Unknown** — application entries in the report, per host, that the engine could / could not match to an application. They count applications seen per host, not flows, so they do not add up to **Flow count**.\n- **Devices** — MAC addresses in the report (see **Discovered Devices**).\n- **Memory** — the engine’s **peak** memory use since it started, not its current use.\n- **Uptime** — how long the engine has been running.\n- **CPU** — the engine’s reported user and system CPU figures added together. Despite the % sign it is **not a percentage**: it is not scaled to 100, and on running routers it rises steadily with Uptime and goes well past 100 (values over 1000 are normal). Compare it between snapshots of the same router; do not read it as load. The pill turns amber above 80, which therefore says nothing about load either.\n- **Timestamp** — when the controller received the report.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['A router has no recent snapshots', 'Its DPI engine is off or not reporting, or the router is offline.', 'Check the router is online and DPI is enabled on it; snapshots resume on their own.'],
    ['CPU shows 1469% or similar', 'The column shows the engine’s raw CPU figures, not a percentage.', 'Ignore the % sign; compare values over time for one router.'],
    ['**All devices** does not list the router I want', 'It offers only routers on the current page.', 'Search for the router name instead.'],
    ['Identified is 0 while Flow count is high', 'The engine matched no application for any host in that report.', 'Expected; App Traffic shows the same traffic as **unknown**.'],
  ],
  shotDir: 'snapshots',
  shots: [
    { file: 'list.png', what: 'Snapshots — the device and search controls, Columns, the four fleet-wide tiles, and the newest reports with their flow counts, memory, uptime and CPU figure.', alt: 'The Snapshots list' },
    { file: 'details.png', what: 'One snapshot opened, with the Agent build at the end.', alt: 'A DPI snapshot' },
  ],
};

const WIFI_SESSIONS: AdminNotes = {
  from: [
    'pages/MonitoringWifiSessions.jsx',
    'pages/WifiSessionDetail.jsx',
    'vendor/nexapp-monitoring/nexapp_monitoring/device/base/models.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/device/api/views.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/device/settings.py',
  ],
  title: 'Reading WiFi sessions',
  intro: [
    'A WiFi session is one client’s stay on one access point: which **MAC address** joined which **SSID** on which **device**, from **Start time** to **Stop time**. Sessions are recorded automatically from the routers’ monitoring reports — nothing here is added or edited.',
    'The list shows **MAC address**, **Vendor**, **Organization**, **Device**, **SSID**, whether the client supports **WiFi 6 / WiFi 5 / WiFi 4**, **Start time** and **Stop time** — *online* while the client is still connected.',
  ],
  before: [
    'Sessions are recorded only from routers that **serve WiFi as an access point** and report it in their monitoring data: each report lists the clients on every wireless interface in access-point mode. A router with no WiFi, or with WiFi only as a client (station) or mesh link, produces no sessions — this page then stays empty, as below.',
  ],
  tasks: [
    {
      title: 'See who is on the WiFi now',
      steps: [
        'Open **Intelligence › Monitoring › WiFi Sessions**.',
        'Choose **Currently online** in **All sessions** — only sessions with no stop time yet. **Disconnected** shows the finished ones.',
        'Choose a router in **All devices** to see one site only. Both filters apply to the whole history, not just the page on screen.',
      ],
    },
    {
      title: 'Open or delete a session',
      steps: [
        'Click the MAC address. The session page shows the client (MAC, vendor, WiFi capabilities), where it connected (organization, device, interface, SSID) and its timing.',
        'To remove the record, press **Delete** on that page and confirm *Delete session for …?*. Only the history record goes — the client is not disconnected.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'How sessions open and close',
      body: [
        '- A session **opens** the first time a client’s MAC appears in a router’s report under an access-point interface, and stays open while it keeps appearing.\n- It **closes** — the stop time is set — at the first report the client is missing from, or as soon as the router itself goes offline.\n- A client that moves to another SSID, interface or router gets a new session there.\n- Reports arrive with the router’s regular monitoring data, so start and stop times are accurate to one reporting interval, not to the second.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*No WiFi sessions yet*', 'No router in your organizations reports WiFi clients — they have no access-point WiFi, or it is not in their monitoring reports.', 'Check a router that serves WiFi: its monitoring data must list its wireless clients.'],
    ['*No sessions match*', 'The device or state filter excludes everything.', 'Set the filters back to **All devices** / **All sessions**.'],
    ['A client shows *online* but has left', 'The session closes at the router’s next report.', 'Wait one reporting interval and refresh.'],
    ['*Could not load sessions*', 'The request failed.', 'Press **Retry**.'],
  ],
  shotDir: 'wifi-sessions',
  shots: [
    { file: 'empty.png', what: 'WiFi Sessions with no sessions recorded — what this page shows until a router reports WiFi clients. The device and state filters sit top right.', alt: 'WiFi Sessions, empty' },
  ],
};

const CHECKS: AdminNotes = {
  from: [
    'pages/MonitoringChecks.jsx',
    'pages/CheckForm.jsx',
    'vendor/nexapp-monitoring/nexapp_monitoring/check/base/models.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/check/settings.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/check/classes/base.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/check/classes/ping.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/check/classes/iperf3.py',
  ],
  title: 'Working with checks',
  intro: [
    'A check is a test the controller runs against one device on a schedule — can it be pinged, did its configuration apply, is it still sending monitoring data. Its results are what turn a device **Problem** or **Offline** on the Devices page, and they show on that device’s **Checks** tab.',
    'Every new device gets three checks automatically: **Ping**, **Configuration Applied** and **Monitoring Data Collected** — which is why the list shows them in threes, named *Type (Device: name)*. You add a check here only for something extra, such as an **Iperf3** bandwidth test or a **WiFi Clients** check, or to re-create one that was deleted.',
    'The list shows **Check**, **Check type**, **Created** and **Modified**. **All check types** narrows it to one type; **Search checks…** matches the check name or the device name. The list is gathered device by device from the **first 100 devices** in the organization picker’s scope — on a larger fleet, narrow the scope to an organization to see the rest. Each row’s **⋮** menu opens the device, edits the check, or deletes it.',
  ],
  before: [
    'You need the add-check permission for **Add check** to appear; editing and deleting need their own permissions.',
    'The device must already exist — a check always belongs to exactly one device.',
  ],
  tasks: [
    {
      title: 'Add a check',
      steps: [
        'Open **Intelligence › Monitoring › Checks** and press **Add check**.',
        'Choose the **Device** and the **Check type** — both are needed; **Create check** stays grey until they are chosen.',
        'Leave **Name** empty to name it after the type, or give it a name of your own if the device already has a check of that type.',
        'Leave **Content type** and **Object id** empty — they default to the device you chose.',
        'For **Ping** or **Iperf3**, put any settings you want to change into **Parameters** as JSON (see *Check parameters* below); otherwise leave `{}`.',
        'Keep **Run this check** ticked, and press **Create check**. You return to the list with *Check created.*',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a check',
      steps: [
        'Click the check’s name, or **⋮ › Edit**.',
        'Change the name, type, parameters or description, and press **Save changes**.',
        'To pause a check without deleting it, untick **Run this check** — it stops running, its metrics stop being collected and no alerts are sent for it.',
      ],
      after: [
        'The **Device** cannot be moved: changing it on the edit page has no effect, because the save always goes to the check’s original device. To check another device, add a new check there.',
      ],
    },
    {
      title: 'Delete a check',
      steps: [
        '**⋮ › Delete** and confirm the *Delete …?* dialog, which names the device; or tick several rows and use **Delete** on the bar above the table.',
      ],
      after: [
        'The health signal that check produced stops. Deleting a device’s automatic **Ping** or **Monitoring Data Collected** check means nothing will flag that device when it goes quiet — prefer unticking **Run this check**.',
      ],
    },
  ],
  forms: [
    {
      title: 'the check form',
      source: 'pages/CheckForm.jsx',
      fields: {
        Name: { example: 'Ping to HQ gateway', what: 'Must be unique on that device — so a second check of the same type on the same device needs a name of its own.' },
        Device: { required: 'Yes', what: 'Lists up to 100 devices from the organization picker’s scope.' },
        'Check type': {
          required: 'Yes',
          drop: ['A device may carry each check type once.'],
          what: 'The form’s own hint says a device may carry each type once; in fact names must be unique, so two of one type are allowed if named differently. ' + '**Ping** — is the device reachable; **Configuration Applied** — did its latest configuration reach it; **Monitoring Data Collected** — is it still sending monitoring data; **WiFi Clients** — are its WiFi client counts within limits; **Iperf3** — a bandwidth test to an iperf3 server.',
        },
        'Content type': { starts: 'Device', checks: ['A related device is required to perform this operation'] },
        'Object id': { starts: 'The selected device' },
        Parameters: {
          starts: '{}',
          example: '{"count": 10, "timeout": 800}',
          what: 'Only **Ping** and **Iperf3** use parameters; the other types ignore them.',
          checks: ['Invalid param in "count": … (from the server, naming the bad key)'],
        },
        Active: { starts: 'On (Run this check ticked)' },
      },
    },
  ],
  sections: [
    {
      title: 'Check parameters',
      body: [
        '**Ping** — any of these keys; anything else is refused:',
        '| Key | Starts at | Allowed | Meaning |\n| --- | --- | --- | --- |\n| `count` | 5 | 2–20 | pings sent per check |\n| `interval` | 1000 | 10–1000 | milliseconds between pings |\n| `bytes` | 56 | 12–65508 | size of each ping |\n| `timeout` | 1000 | 5–1500 | milliseconds to wait for a reply |',
        '**Iperf3** — `host` (a list of iperf3 server addresses), optional `username` / `password` (1–20 characters each) with `rsa_public_key` for an authenticated server, and `client_options`, for example `port` (starts at 5201), `time` (seconds, starts at 10, up to 1800), `parallel` (streams, 1–128), `reverse`, `bidirectional`, and `tcp` / `udp` settings. Example: `{"host": ["203.0.113.5"], "client_options": {"time": 20}}`.',
        'A value outside its range is refused on save with *Invalid param in "<key>": …* naming the key.',
      ],
    },
  ],
  verify: [
    'The check is in the list with its type, and on the device’s **Checks** tab.',
    'After its first run, its result shows on that tab and feeds the device’s health on the Devices page.',
  ],
  trouble: [
    ['**Create check** stays grey', 'No device or no check type chosen, or **Parameters** is not a JSON object.', 'Choose both; fix the JSON — *Parameters must be a JSON object, e.g. {}.* or *Not valid JSON.* shows under the box.'],
    ['Red bar saying the name already exists for that device', 'The device already has a check with that name — with Name blank, one of the same type.', 'Give the new check its own **Name**.'],
    ['*A related device is required to perform this operation*', 'A non-device **Content type** or a wrong **Object id** was chosen.', 'Leave both empty.'],
    ['*Invalid param in "…"*', 'A parameter is outside its allowed range or not a known key.', 'Use the ranges in *Check parameters*.'],
    ['A device’s checks are missing from the list', 'The list covers only the first 100 devices in scope.', 'Pick that device’s organization in the organization picker, or open the device’s own **Checks** tab.'],
    ['A device stopped going **Problem** when it should', 'Its Ping or Monitoring Data Collected check was deleted or set inactive.', 'Re-create it here, or tick **Run this check** again.'],
  ],
  shotDir: 'checks',
  shots: [
    { file: 'list.png', what: 'The Checks list — each device’s automatic Ping, Configuration Applied and Monitoring Data Collected checks, with the type filter, search and Add check.', alt: 'The Checks list' },
    { file: 'form-new.png', what: 'The **Add check** form: Name, Device, Check type, Content type, Object id, Description and Parameters.', alt: 'Adding a check' },
  ],
};

const METRICS: AdminNotes = {
  from: [
    'pages/MonitoringMetrics.jsx',
    'pages/MetricForm.jsx',
    'pages/MetricRecover.jsx',
  ],
  title: 'Working with metrics',
  intro: [
    'A metric is one series of measurements the controller keeps about one object — usually a device: its ping latency, CPU, memory, traffic, WiFi clients and so on. A metric owns the **charts** drawn from it (on the device’s **Charts** tab) and the **alert settings** that decide when it raises an alert. Most metrics are created automatically when devices start reporting; this page is for adding one by hand, changing its charts and alerts, or deleting it.',
    'The list shows each metric as *name (Device: device name)* with **Created** and **Modified**. **Search metrics…** narrows it; the toolbar also has **Recover deleted** and **Add metric**; each row’s **⋮** menu edits, deletes or opens the device.',
  ],
  before: [
    '**Add metric** needs the add-metric permission; editing and deleting need their own.',
    'Know the **id** of the object the metric is about — for a device, the device’s id (the long code in its page address, `/devices/<id>`).',
  ],
  tasks: [
    {
      title: 'Add a metric',
      steps: [
        'Open **Intelligence › Monitoring › Metrics** and press **Add metric**.',
        'Type a **Name**, e.g. `Disk usage`.',
        'Leave **Content type** on its default, *Device*, and paste the device’s id into **Object id**.',
        'Choose the **Configuration** — what the metric measures; it sets the metric’s chart, units and alert defaults.',
        'Under **Charts**, press **Add another chart** and pick what to draw. Under **Alert settings**, press **Add another alert setting** to alert on it (see the table below).',
        'Press **Create metric** — it stays grey until Name, Configuration and Object id are filled.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a metric’s charts or alerts',
      steps: [
        'Click the metric, or **⋮ › Edit**.',
        'Add or remove charts and alert settings with the **+** buttons and each card’s bin icon; change a threshold or untick **Send alerts for this metric** to mute it.',
        'Press **Save changes**.',
      ],
    },
    {
      title: 'Delete or recover a metric',
      steps: [
        '**⋮ › Delete** and confirm — its charts and alert settings go with it. Or tick several rows and use **Delete** on the bar above the table.',
        'Deleted by mistake: press **Recover deleted**, find it in the list (with when it was deleted) and press **Recover**.',
      ],
      after: [
        'Although the delete dialog says *This cannot be undone*, the metric itself can be recovered — under its original id — but its **charts and alert settings are not restored**; add them again after recovering.',
      ],
    },
  ],
  forms: [
    {
      title: 'the metric form',
      source: 'pages/MetricForm.jsx',
      opens: 'One page with four parts: **Metric**, a collapsed **Advanced options**, **Charts** and **Alert settings**. The chart and alert rows appear once you add them.',
      fields: {
        Name: { required: 'Yes', example: 'Disk usage' },
        'Content type': { starts: 'Device' },
        'Object id': { required: 'Yes', example: '3f2c9a1e-…', what: 'For a device, its id from its page address.' },
        Configuration: { required: 'Yes', what: 'Chosen from the controller’s metric configurations.' },
        Key: { when: 'Advanced options' },
        'Field name': { when: 'Advanced options', starts: 'value' },
        'Configuration#2': { when: 'In each chart', drop: ['Uncheck to disable this alert for this object and all users.'], what: 'The chart to draw; the preview below it shows the device’s current data.' },
        'Send alerts for this metric': { extra: true, required: '—', when: 'In each alert setting', starts: 'On', what: 'Untick to mute this alert for this object and for all users.' },
        Operator: { when: 'In each alert setting', starts: 'Use the default', what: '**less than** or **greater than** the threshold.' },
        'Threshold value': { when: 'In each alert setting', example: '90' },
        'Threshold tolerance': { when: 'In each alert setting', example: '5', starts: 'The metric’s default' },
      },
    },
  ],
  verify: [
    'The metric is in the list as *name (Device: …)*.',
    'Its chart appears on the device’s **Charts** tab once data arrives; an alert setting raises an alert when the threshold stays crossed for the tolerance.',
  ],
  trouble: [
    ['**Create metric** stays grey', 'Name, Configuration or Object id is empty.', 'Fill all three.'],
    ['A red bar after saving', 'The server refused a value — most often an Object id that is not the id of a device.', 'Copy the id from the device’s page address.'],
    ['A recovered metric has no charts or alerts', 'Recovery restores the metric only.', 'Add its charts and alert settings again.'],
    ['Alerts arrive too often', 'Tolerance is 0, so every crossing alerts at once.', 'Raise **Threshold tolerance** to the minutes it must stay crossed.'],
  ],
  shotDir: 'metrics',
  shots: [
    { file: 'list.png', what: 'The Metrics list with search, Recover deleted and Add metric. One device name in this picture has been replaced.', alt: 'The Metrics list' },
    { file: 'form-new.png', what: 'The **Add metric** form: Name, Content type, Object id and Configuration, the collapsed Advanced options, and the Charts and Alert settings sections.', alt: 'Adding a metric' },
  ],
};

export const INTEL_NOTES: Record<string, AdminNotes> = {
  '/monitoring/metrics': METRICS,
  '/monitoring/checks': CHECKS,
  '/monitoring/wifi-sessions': WIFI_SESSIONS,
  '/app-intelligence/snapshots': SNAPSHOTS,
  '/app-intelligence/discovered': DISCOVERED,
  '/app-intelligence/applications': APPLICATIONS,
  '/app-intelligence/traffic': APP_TRAFFIC,
};
