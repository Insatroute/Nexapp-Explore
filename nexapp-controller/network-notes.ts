/**
 * Hand-written guidance for the Network pages (SD-LAN, SDLAN access, Fleet map,
 * Geographic Info), in the same shape as `admin-notes.ts` and rendered by
 * `guide-admin.ts` (images under `public/img/network/<shotDir>/`). Pinned by
 * `check:descriptions` to the files named in `from`.
 */
import type { AdminNotes } from './admin-notes.ts';

// ------------------------------------------------------------------ SD-LAN

const SDLAN: AdminNotes = {
  from: [
    'pages/Sdlan.jsx',
    'components/Field.jsx',
    'components/useConfirm.jsx',
    'api/client.js',
    'nexapp_remote_access/models.py',
    'nexapp_remote_access/serializers.py',
    'nexapp_remote_access/views.py',
    'nexapp_remote_access/proxy_sessions.py',
    'deploy/nginx/sdlan-proxy.conf',
    'deploy/nginx/web-access.conf',
    'nexapp_controller/config/api/views.py',
  ],
  title: 'Reaching hosts behind your routers',
  intro: [
    'SD-LAN is the fleet-wide list of **saved endpoints** — a router’s own web interface or shell, or a host on its LAN such as a PLC, HMI, camera or NVR — that you can open from the controller without a VPN of your own. The controller reaches the address on your behalf, so the address has to be routable **from the controller**, not from your browser.',
    'Each row shows the endpoint’s **Site** (the router’s location), **Group**, **Router**, **Target** (the endpoint’s name — click it to open), **Protocol** (*HTTPS*, *HTTP*, *Terminal*, *Root*, or *TELNET* for an old row), **LAN endpoint** (address and port; for an endpoint saved as the router itself it also shows the management address it really goes to, or *no management IP*), **Path** (*SD-LAN* when the router has a management address, *No route* when it has none), **Status** (the router’s monitoring status — the endpoint itself is not probed) and **Session**. **Columns** hides any of Site, Group, Router, Protocol, Path, Status and Session; your choice is remembered in this browser.',
    'The same saved entries appear on each router’s **SDLAN Access** panel; this page lists them all at once. The whole list is loaded in one go, so **Search target, IP, router, site…**, the status, protocol and group filters, and the page controls all work on the complete list in your browser. Search runs when you press **Search** or Enter, and matches the endpoint name, its address (with or without the port), the router’s name and management address, the site’s name and city, and the group name.',
  ],
  before: [
    'You see the endpoints on routers in organizations you belong to, plus any you created yourself; a superuser sees all of them. The organization or group picked in the sidebar tree narrows the list to routers in that scope.',
    'Opening a row through the controller needs the router to show **SD-LAN** under **Path** — that is, to have a management address.',
    '**Root** endpoints can be opened only by a superuser.',
  ],
  tasks: [
    {
      title: 'Add an endpoint',
      steps: [
        'Open **Network › SD-LAN** and press **Add endpoint**. The **Add endpoint** drawer opens.',
        'Under **Router**, type part of the router’s name, MAC or IP and pick it from the list (the first six matches are shown).',
        'Optionally type a **Target name**, e.g. `Lobby camera`.',
        'Choose the **Protocol**: **HTTPS**, **HTTP**, **Terminal** (the router’s admin shell) or **Root** (the unrestricted root shell). The port follows the protocol unless you have typed your own.',
        'Under **Target**, leave **The router itself**, or choose **A host on its LAN** and fill **LAN address** with the host’s address and port, e.g. `192.168.1.50` : `80`.',
        'Press **Add endpoint**. The drawer closes with *‹name› added.* and the row is in the list.',
      ],
      after: [
        'With **Target name** left blank the endpoint is named *LAN host* — or *LAN host ‹address›*, *LAN host ‹address›:‹port›*, and so on, whichever is still free on that router for that protocol.',
        '**The router itself** is stored as `127.0.0.1` and resolved to the router’s management address each time you open it, so it keeps working if that address changes.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Open an endpoint',
      steps: [
        'Click the endpoint’s name under **Target**, or the globe button at the end of its row.',
        'It opens in a new browser tab. Allow pop-ups for the controller if your browser blocks it — the page then says *Pop-up blocked — allow pop-ups for this site, then retry.* for Terminal, Root and HTTPS-on-443 rows.',
        'For **Root**, confirm the *Open a ROOT shell on ‹name›?* dialog with **Open root shell**. The opening is recorded in the activity log against your account.',
      ],
      after: [
        'How a row opens depends on what it is, and the **Session** column says which: **Gateway** — Terminal rows and HTTPS rows on port 443 open through the controller’s existing terminal and web-access gateway, which keeps no session of its own. **Audited** — Root rows, superuser-only and logged. **Open** with a countdown — every other web row (HTTP, or HTTPS on another port) first opens a session for you on the controller’s SD-LAN proxy, five minutes by default, and the proxy refuses the endpoint once it lapses. Open the row again to start a fresh window.',
        'A **TELNET** row (saved earlier on a router’s SDLAN Access panel) cannot be opened from this page; its open controls stay greyed out.',
        'When an open fails, a red bar *Could not open ‹name›.* says why; press **Dismiss** to clear it.',
      ],
    },
    {
      title: 'Close a proxy session early',
      steps: [
        'Press the red **✕** button in the row (enabled only while the **Session** column shows **Open**).',
        'The page says *Session closed.* and the proxy stops serving that endpoint to you.',
      ],
      after: [
        'Leaving this page does not close a session; it lapses on its own when the countdown ends. Closing the browser tab or window that holds this page does try to close every session it opened.',
      ],
    },
    {
      title: 'Change or delete an endpoint',
      steps: [
        'To change it: press the pencil button in its row. The **Edit endpoint** drawer opens; change the name, protocol, target or port and press **Save**. You see *‹name› updated.*',
        'To delete one: press the red bin button in its row and confirm **Delete**.',
        'To delete several: tick their rows (the header box ticks every row on the page), press **Delete** in the filter bar, and confirm **Delete ‹n›**.',
      ],
      after: [
        'The router cannot be changed on an existing endpoint — delete it and add it again behind the other router.',
        'Changing the protocol also resets the saved path to the new protocol’s; other settings saved on the router’s SDLAN Access panel (username, open type) are kept.',
        'The delete confirmation says *… will no longer be listed. Nothing on the router or the endpoint itself changes.* That is what happens: only the saved entry is removed.',
      ],
    },
  ],
  forms: [
    {
      title: 'the endpoint drawer',
      source: 'pages/Sdlan.jsx',
      opens: '**Add endpoint** opens it empty; the pencil button in a row opens it as **Edit endpoint**.',
      fields: {
        Router: {
          required: 'When adding',
          example: 'Branch-Pune-01',
          what: 'Search by name, MAC or IP; only routers in the current sidebar scope are offered. **Change** picks a different one while adding.',
          checks: ['Pick the router this endpoint sits behind.'],
        },
        'Target name': {
          example: 'Lobby camera',
          what: 'Up to 128 characters. Two endpoints on the same router with the same protocol cannot share a name.',
          checks: ['The fields device, name, protocol must make a unique set.'],
        },
        Protocol: {
          starts: 'HTTPS',
          what: 'One of **HTTPS**, **HTTP**, **Terminal**, **Root**. The hint under the control describes the one chosen. Default ports: HTTPS 443, HTTP 80, Terminal 443, Root 7681. Editing an old TELNET or SSH row also offers its current protocol.',
        },
        Target: {
          starts: 'The router itself',
          what: '**The router itself** or **A host on its LAN**. Only the second asks for an address.',
        },
        'LAN address': {
          when: 'Only with A host on its LAN',
          example: '192.168.1.50',
          what: 'The address box and, after the colon, the port (1–65535). The server accepts an IPv4 address or a hostname, but only an IPv4 address can be opened through the controller’s proxy.',
          checks: ['Enter the address of the host on the LAN.', 'ip: Invalid IP or hostname.', 'Port must be 1–65535.'],
        },
        Port: {
          when: 'Only with The router itself',
          example: '443',
          what: 'Terminal and Root rows always open the router’s standard terminal addresses whatever port is set here, and an SSH-type row on port 7681 is treated as Root.',
          checks: ['Port must be 1–65535.'],
        },
      },
    },
  ],
  verify: [
    'The endpoint is in the list under its router, with the protocol badge you chose and **SD-LAN** under **Path**.',
    'Clicking its name opens it in a new tab; for an HTTP row, **Session** shows **Open** and a countdown.',
    'The same entry appears on the router’s **SDLAN Access** panel.',
  ],
  trouble: [
    ['The name under **Target** is greyed out', 'The row cannot be opened: it is a TELNET row; or a Root row and you are not a superuser; or it is saved as the router itself and the router has no management IP.', 'Hover the name for the reason. Root needs a superuser; a router without a management IP shows **No route** under Path.'],
    ['*Could not open ‹name›.* … *has no management IP, so the controller has no address to reach it on.*', 'The row is saved as the router itself, and the router has no management address.', 'Wait until the router has a management address, or save the endpoint with an explicit LAN address.'],
    ['*Root shell access is restricted to superusers.*', 'Root rows open only for superusers.', 'Ask a superuser, or use a **Terminal** row for the admin shell.'],
    ['*Pop-up blocked — allow pop-ups for this site, then retry.*', 'The browser blocked the new tab.', 'Allow pop-ups for the controller and click again.'],
    ['A tab opened from an HTTP row stops working after a few minutes', 'Its proxy session lapsed (five minutes by default) or was closed with **✕**.', 'Open the row again.'],
    ['The tab for an HTTP row answers *403 Forbidden*', 'The proxy only serves an IPv4 address that has a live session. A row saved as a hostname cannot be served, and a router-itself row on HTTP (or HTTPS on a port other than 443) is refused because its session is recorded against `127.0.0.1` while the proxy is asked for the management address.', 'Save the endpoint with the router’s IPv4 address as **A host on its LAN**, or use HTTPS on port 443 for the router’s own interface.'],
    ['*The fields device, name, protocol must make a unique set.*', 'That router already has an endpoint with this name and protocol.', 'Choose another **Target name**, or leave it blank to get a free *LAN host* name.'],
    ['*Pick the router this endpoint sits behind.*', 'No router was chosen.', 'Search for it under **Router** and pick it from the list.'],
    ['A router is missing from the **Router** search', 'Only routers in the current sidebar scope are offered, and only the 100 most recently added of them are loaded.', 'Narrow the sidebar scope to the router’s organization or group, then search again.'],
    ['**Router** shows *Outside this scope* and Status shows —', 'The router is not among the routers this page loaded (at most 100, newest first).', 'Pick the router’s organization or group in the sidebar tree.'],
    ['*No endpoints in this scope*', 'Nothing is saved on routers in the selected organization or group.', 'Clear the scope in the tree, or add an endpoint.'],
  ],
  shotDir: 'sdlan',
  shots: [
    { file: 'list.png', what: 'The SD-LAN list — search, the status, protocol and group filters, and rows with Site, Router, Target, Protocol, LAN endpoint, Path, Status and Session.', alt: 'The SD-LAN endpoint list' },
    { file: 'form-new.png', what: 'The Add endpoint drawer with a router picked, Protocol HTTP and Target set to A host on its LAN.', alt: 'Adding an SD-LAN endpoint' },
  ],
};

// ------------------------------------------------------------ SDLAN Access

const SDLAN_ACCESS: AdminNotes = {
  from: [
    'pages/SdlanAccess.jsx',
    'pages/DeviceDetail.jsx',
    'api/client.js',
    'nexapp_remote_access/models.py',
    'nexapp_remote_access/serializers.py',
    'nexapp_remote_access/views.py',
    'nexapp_remote_access/services.py',
  ],
  title: 'Opening one router’s services',
  intro: [
    'The **SDLAN Access** panel lists the saved access entries for **one router** as cards, and opens them through a temporary tunnel the controller sets up to the router. Open it with the **SDLAN Access** button on a device’s page; the back arrow (or Esc) returns to the device.',
    'Each card shows the entry’s name, a badge for what it reaches — **Router GUI** (HTTP), **Root access** (SSH) or **Telnet** — its **Address**, its **Username** if one is saved, and **Opens in** (*Browser* or *Dialog*). Click a card to open it.',
    'These are the same saved entries the fleet-wide **SD-LAN** page lists; that page opens them through the controller’s proxy instead of a tunnel.',
  ],
  before: [
    'You need to belong to the router’s organization (or be a superuser) to add, open or change its entries.',
    '**Root access** opens only for a superuser, and each opening is recorded in the activity log.',
    'The router must be connected to the controller’s tunnel service; a router with no MAC address recorded cannot get a tunnel.',
  ],
  tasks: [
    {
      title: 'Add an access entry',
      steps: [
        'Open the device and press **SDLAN Access**, then press the **Add** card.',
        'Under **Access**, choose **Router GUI**, **Root access** or **Telnet**. This fills in the address, port and scheme for the router itself, and fills **Name** with the same words if it is empty.',
        'Type or keep the **Name**, e.g. `Router GUI`.',
        'To reach something on the router’s LAN rather than the router, tick **Advanced › Target something else behind this router** and set **IP** and **Port** (and, for Router GUI, **HTTPS** and **Path**).',
        'Choose **Open Type**: **Browser** or **Dialog** (Router GUI is always Browser).',
        'Press **OK**. You see *Access added* and the new card.',
      ],
      after: [
        'Switching **Access** replaces anything typed under Advanced with that choice’s defaults: Router GUI `127.0.0.1:443` over HTTPS at `/`, Root access `127.0.0.1:7681` over HTTPS, Telnet `127.0.0.1:23`.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Open an entry',
      steps: [
        'Click the card. The controller opens (or reuses) a tunnel to the target.',
        '**Browser** entries open in a new tab, which shows *Opening ‹name›…* until the target answers. **Dialog** entries open inside a window on this page, with **Open in new tab** and **Close**.',
      ],
      after: [
        'A tunnel is closed after it has carried no traffic for a while (ten minutes by default); opening the same entry again renews it. Closing a **Dialog** window frees its tunnel at once, and closing the browser window frees every tunnel this panel opened. Navigating away does not.',
        'If nothing answers within 20 seconds, the tab and the page both say *‹address›:‹port› never answered. The tunnel is up — nothing accepted a connection on that port.* together with an `nc -z` command to check from the router.',
        'A **Telnet** entry cannot be opened in a browser: clicking it shows *TELNET is raw TCP — a browser cannot open it.* with the `telnet` command to run from a terminal that has a route into that LAN.',
      ],
    },
    {
      title: 'Change or delete an entry',
      steps: [
        'Press the pencil on a card, change what you need in **Edit access**, and press **OK** (*Access updated*).',
        'Press the bin on a card and confirm **Delete** in **Delete access**. You see *Deleted ‹name›*.',
      ],
      after: [
        'The confirmation says *This does not affect the device.* — only the saved entry is removed, and any tunnel this panel holds for it is freed first.',
      ],
    },
  ],
  forms: [
    {
      title: 'the access drawer',
      source: 'pages/SdlanAccess.jsx',
      opens: 'The **Add** card opens it as **Add access**; a card’s pencil opens **Edit access**. IP, Port, Username, HTTPS and Path appear only with **Advanced** ticked, but are always saved with the values the Access choice filled in.',
      fields: {
        Access: {
          starts: 'Router GUI',
          what: 'One of **Router GUI**, **Root access**, **Telnet**. Stored as protocol HTTP, SSH or TELNET.',
        },
        Name: {
          example: 'Router GUI',
          what: 'Up to 128 characters. Two entries on this router with the same protocol cannot share a name.',
          checks: ['Name is required.', 'The fields device, name, protocol must make a unique set.'],
        },
        'Advanced › Target something else behind this router': {
          starts: 'Off',
        },
        IP: {
          when: 'Only with Advanced ticked',
          example: '192.168.1.50',
          starts: '127.0.0.1',
          checks: ['IP is required.', 'ip: Invalid IP or hostname.'],
        },
        Port: {
          when: 'Only with Advanced ticked',
          example: '8080',
          starts: '443 for Router GUI, 7681 for Root access, 23 for Telnet',
          checks: ['Port must be 1–65535.'],
        },
        Username: {
          when: 'Only with Advanced ticked, for Root access and Telnet',
          example: 'root',
          what: 'Optional, up to 64 characters. Saved and shown on the card; opening the entry does not use it.',
        },
        'HTTPS › The target speaks TLS': {
          when: 'Only with Advanced ticked, for Router GUI',
          starts: 'On',
          what: 'Leave it off for a target on port 80 or 8080 that speaks plain HTTP — the form warns when it is on for those ports, because the tab would fail with ERR_SSL_PROTOCOL_ERROR.',
        },
        Path: {
          when: 'Only with Advanced ticked, for Router GUI',
          example: '/',
          starts: '/',
          what: 'A leading `/` is added if you leave it out.',
        },
        'Open Type': {
          starts: 'Browser',
          drop: ['Browser opens the tunnel URL in a new tab. Dialog shows the connection details to copy.'],
          what: '**Browser** opens a new tab. **Dialog** shows the target inside a window on this page (for Root access, the shell itself). Router GUI refuses to be embedded, so **Dialog** is disabled for it.',
        },
      },
    },
  ],
  verify: [
    'The new card is on the panel with the badge, address and **Opens in** you chose.',
    'Clicking it opens the router’s interface or shell.',
    'The entry also appears on the fleet-wide **SD-LAN** page under this router.',
  ],
  trouble: [
    ['*Root shell access is restricted to superusers.*', 'Root access entries open only for superusers.', 'Ask a superuser.'],
    ['*Device has no mac_address; cannot create NPS client*', 'The controller has no MAC address for this router, so it cannot set up a tunnel.', 'Check the device’s MAC address on its page.'],
    ['*Tunnel port pool exhausted (40010-40050). Reaper will free some shortly.*', 'Every tunnel port is in use.', 'Close Dialog windows you no longer need, or wait for idle tunnels to be closed, then retry.'],
    ['*NPS error: …*', 'The tunnel service refused the request.', 'Check that the controller’s tunnel service is running and the router is connected to it.'],
    ['*… never answered. The tunnel is up — nothing accepted a connection on that port.*', 'The tunnel works but nothing is listening at that address and port.', 'Check the target is on, and its port, e.g. with the `nc -z` command shown.'],
    ['The tab shows ERR_SSL_PROTOCOL_ERROR', '**HTTPS › The target speaks TLS** is on for a target that speaks plain HTTP.', 'Edit the entry, tick **Advanced**, and untick **HTTPS**.'],
    ['*TELNET is raw TCP — a browser cannot open it.*', 'Telnet cannot run in a browser.', 'Run the `telnet` command shown, from a terminal that can reach that LAN.'],
    ['*The fields device, name, protocol must make a unique set.*', 'This router already has an entry with that name and protocol.', 'Choose another **Name**.'],
  ],
  shotDir: 'sdlan-access',
  shots: [
    { file: 'list.png', what: 'The SDLAN Access panel for one router — a Router GUI card and a Root access card, and the Add card.', alt: 'The SDLAN Access panel' },
    { file: 'form-new.png', what: 'The Add access drawer with Access set to Router GUI and Advanced ticked, showing IP, Port, HTTPS and Path.', alt: 'Adding an access entry' },
  ],
};

// ------------------------------------------------------------------ Fleet map

const FLEET_MAP: AdminNotes = {
  from: [
    'pages/FleetMap.jsx',
    'pages/DeviceList.jsx',
    'utils/tiles.js',
    'api/client.js',
    'vendor/nexapp-monitoring/nexapp_monitoring/device/api/views.py',
    'vendor/nexapp-monitoring/nexapp_monitoring/device/api/serializers.py',
    'nexapp_controller/geo/api/views.py',
  ],
  title: 'Reading the fleet map',
  intro: [
    'The fleet map shows **every site that has devices placed at it**, as a bubble on the map, with the fleet broken down beside it by **state → site → device**. Open it with the map button on the **Devices** list toolbar; **Device list** at the top returns there.',
    '<Callout type="info">**Read-only.** Nothing is added or changed here. Sites are created under **Network › Geographic Info**, and a device is placed at one from that device’s page.</Callout>',
    'A bubble’s number is how many devices are at that site, and its colour is the worst status there: red when any device is critical (offline), amber when any has a problem, green when they are all fine, grey otherwise. The badge in the corner totals devices, sites, **online** and **offline** devices. Devices with a *problem* or *unknown* status are counted in the total but in neither online nor offline.',
    'The **Devices by State** panel groups sites by the **State** written on their location — sites with none go under **Unassigned**, listed last — and gives each state and site an online count and a total. A site without coordinates appears in the panel but has no bubble. The organization picked in the sidebar tree narrows the map to that organization; picking a group narrows it to the group’s whole organization. There is no search.',
  ],
  before: [
    'A device appears here only once it has been placed at a location.',
  ],
  tasks: [
    {
      title: 'Find the devices at a site',
      steps: [
        'Click a bubble, or open a state in **Devices by State** and click a site. The map flies to the site and its row opens.',
        'The site’s devices are listed in name order with **Online**, **Offline** or their other status.',
        'Click a device to open its page.',
      ],
      after: ['At most 100 devices are listed under one site.'],
    },
  ],
  forms: [],
  verify: [],
  trouble: [
    ['*Map tiles could not be loaded — this controller may have no outbound internet access.*', 'The map background comes from an external tile service the controller cannot reach.', 'The panel on the right is still accurate. To get a map, allow outbound access to the tile service or point the build at an internal tile server.'],
    ['*No device has a location yet.* (or *No device in the selected organization has a location yet.*)', 'No device in view is placed at a location.', 'Create the location under **Geographic Info** and place devices there from each device’s page.'],
    ['A site is in the panel but has no bubble', 'Its location has no coordinates (for example a mobile location).', 'Edit the location under **Geographic Info** and set its coordinates.'],
    ['A site sits under **Unassigned**', 'Its location has no **State**.', 'Edit the location and fill **State**.'],
    ['*Could not load sites: …*', 'The site request failed.', 'Reload the page.'],
  ],
  shotDir: 'fleet-map',
  shots: [
    { file: 'list.png', what: 'The fleet map — coloured site bubbles, the totals badge, and the Devices by State panel with one state and one site opened to show its devices.', alt: 'The fleet map' },
  ],
};

// ------------------------------------------------------------------ Locations

const LOCATIONS: AdminNotes = {
  from: [
    'pages/LocationList.jsx',
    'components/LocationFormDrawer.jsx',
    'components/LocationFormFields.jsx',
    'components/BulkBar.jsx',
    'api/client.js',
    'nexapp_controller/geo/api/views.py',
    'nexapp_controller/geo/api/serializers.py',
    'nexapp_controller/geo/base/models.py',
    'vendor/django-loci/django_loci/base/models.py',
  ],
  title: 'Working with locations',
  intro: [
    'A location is a **named site** — a branch, a building, a customer premises — owned by one organization, with an address and coordinates. Devices are placed at a location from their own page; that is what puts them on the **Fleet map** and fills the **Site** column on the SD-LAN page.',
    'The list shows each location’s **Name** (with a *mobile* badge for a moving one), **Organization**, **Type** (*Outdoor* or *Indoor*), how many **Devices** are placed there, its **Coordinates**, **Pincode** and **Created** date, newest first. The footer counts how many have coordinates. The map button above the list shows the listed locations on a map.',
    '**Search locations…** filters as you type, in your browser, over the name, address, city, state, pincode and organization of the locations already loaded. The organization picked in the sidebar tree narrows the list on the server; picking a group narrows it to the group’s organization.',
  ],
  before: [
    '**New location**, **Edit location** and **Delete** each appear only with the matching permission on locations; without edit permission, clicking a name still opens the drawer, but saving is refused.',
    'You can only save a location in an organization you manage.',
  ],
  tasks: [
    {
      title: 'Add a location',
      steps: [
        'Open **Network › Geographic Info** and press **New location**. The **New location** drawer opens.',
        'Choose the **Organization**. It starts as the organization picked in the sidebar tree, if any.',
        'Type the **Name**, e.g. `Pune Branch Office`, and pick the **Type**.',
        'Fill **Address**, **City**, **State** and **Pincode**. As you type, the form looks the address up and places the pin, filling **Latitude** and **Longitude** (*Pin placed from the address — click the map or edit the coordinates to adjust it.*).',
        'Adjust the pin by clicking the map, or type the coordinates. Tick **Is mobile** instead for something that moves — it needs no coordinates.',
        'Press **Create location**. You see *Created “‹name›”.*',
      ],
      after: [
        '**Create location** stays greyed out until there is an organization, a name, and either both coordinates or **Is mobile**.',
        'If the address lookup cannot place it, the form says *Could not place that address — set the coordinates below.* with **Try again**. If you already placed the pin yourself, a new lookup only offers **Move pin here** instead of moving it.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a location',
      steps: [
        'Click the location’s name, or **⋮ › Edit location**.',
        'Change what you need and press **Save location**. You see *Updated “‹name›”.*',
      ],
      after: [
        'Every device placed at the location moves with it — they share its address and coordinates.',
        'Changing an **Indoor** location to **Outdoor** deletes its floorplans.',
      ],
    },
    {
      title: 'Show a location on the map',
      steps: [
        'Choose **⋮ › Show on map** on a location that has coordinates. The map opens and the search is set to that location’s name.',
        'Press the map button again to hide the map; clear the search to see every location.',
      ],
    },
    {
      title: 'Delete locations',
      steps: [
        'One: **⋮ › Delete**, then confirm *Delete “‹name›”?*.',
        'Several: tick their rows (the header box ticks every listed row), then **Delete** on the *‹n› locations selected* bar that appears, and confirm *Delete ‹n› locations?*.',
      ],
      after: [
        'When devices are placed there the confirmation says *‹n› devices placed here will lose their location. The devices themselves are kept. This cannot be undone.* That is what happens: the location, its floorplans and each device’s placement at it are deleted; the devices stay.',
        'A location that is already gone from the server, or now belongs to an organization you cannot manage, gives a warning instead of an error and the list is refreshed.',
      ],
    },
  ],
  forms: [
    {
      title: 'the location drawer',
      source: 'components/LocationFormFields.jsx',
      opens: '**New location** opens it empty; clicking a location opens it as **Edit location**. **Organization** is the first row, above the fields below.',
      fields: {
        Organization: {
          extra: true,
          required: 'Yes',
          starts: 'The organization picked in the sidebar tree, else empty',
          example: 'Acme Retail',
          what: 'Only this organization’s devices can be placed at this location.',
        },
        Name: {
          required: 'Yes',
          example: 'Pune Branch Office',
          what: 'A descriptive name — building or company. Up to 75 characters.',
        },
        Type: {
          starts: 'Outdoor',
          what: '**Outdoor** or **Indoor**.',
        },
        Pincode: {
          example: '411041',
          drop: ['A moving object — it needs no fixed coordinates.'],
          what: 'The box takes up to 20 characters but the server stores at most 10.',
          checks: ['pincode: Ensure this field has no more than 10 characters.'],
        },
        'Is mobile': {
          extra: true,
          starts: 'Off',
          what: 'A moving object — it needs no fixed coordinates. Hides the address lookup and the map.',
        },
        Address: {
          example: 'Dhayari Phata, Khadewadi',
          what: 'Optional, up to 128 characters. The map follows what you type in Address, City, State and Pincode.',
        },
        City: { example: 'Pune', what: 'Optional, up to 64 characters.' },
        State: { example: 'Maharashtra', what: 'Optional, up to 64 characters. The Fleet map groups sites by it.' },
        Latitude: {
          required: 'Unless Is mobile is ticked',
          example: '18.4524',
          what: 'Decimal degrees. Filled from the address or the pin; you can type it.',
        },
        Longitude: {
          required: 'Unless Is mobile is ticked',
          example: '73.8213',
          what: 'Decimal degrees. Filled from the address or the pin; you can type it.',
        },
      },
    },
  ],
  verify: [
    'The location is in the list with its organization, type and coordinates, and **⋮ › Show on map** puts its pin where you expect.',
    'Once a device is placed there, the **Devices** column counts it and the site appears on the **Fleet map**.',
  ],
  trouble: [
    ['**Create location** stays grey', 'The organization, the name, or the coordinates are missing (coordinates are needed unless **Is mobile** is ticked).', 'Fill them in, or let the address place the pin.'],
    ['*Could not place that address — set the coordinates below.*', 'The address lookup found nothing or could not be reached.', 'Press **Try again**, add the city or pincode, or click the map / type the coordinates.'],
    ['*pincode: Ensure this field has no more than 10 characters.*', 'The pincode is longer than the server stores.', 'Shorten it to 10 characters or fewer.'],
    ['A location is missing from the list', 'The sidebar tree has an organization selected, or only the 100 newest locations are loaded.', 'Clear the scope in the tree; narrow by organization to reach older locations.'],
    ['*“‹name›” is no longer on the server — it was already removed, or it moved to an organization you cannot manage.*', 'Someone else deleted it or moved it out of your organizations.', 'Nothing to do; the list has been refreshed.'],
    ['*Could not delete: …*', 'The server refused the delete — usually a missing delete permission.', 'Ask an administrator for the permission.'],
    ['The map is grey', 'The controller cannot reach the external map tile service.', 'The list and coordinates are still correct.'],
  ],
  shotDir: 'locations',
  shots: [
    { file: 'list.png', what: 'The Locations list with the map shown above it, a few locations with device counts and coordinates.', alt: 'The Locations list' },
    { file: 'form-new.png', what: 'The New location drawer — Organization, Name, Type, Pincode, Is mobile, the address fields, the coordinates and the map with its pin.', alt: 'Adding a location' },
  ],
};

export const NETWORK_NOTES: Record<string, AdminNotes> = {
  '/sdlan': SDLAN,
  '/devices/:id/sdlan': SDLAN_ACCESS,
  '/devices/map': FLEET_MAP,
  '/locations': LOCATIONS,
};
