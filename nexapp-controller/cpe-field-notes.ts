/**
 * What the source cannot say about a CPE screen, written by hand.
 *
 * The generated half of a CPE page is the console's own words: labels, ranges,
 * starting values, the checks a save runs. It cannot say what "Deterministic
 * MED" does, what a sensible AS number looks like, or why a peer that saved
 * cleanly never comes up — that is protocol knowledge, not code. This file is
 * where it goes, and only that: nothing here restates a fact the extractor
 * already reads, so there is one place for each fact to go stale.
 *
 * Every entry is pinned. `npm run check:descriptions` hashes the component it
 * was written against (`cpe:<file>` in the lock file) and flags it for a
 * re-read when that file changes; a note whose field label no longer exists on
 * the form is reported at generate time rather than silently dropped.
 *
 * Examples are illustrative values that the field accepts, drawn from the
 * private ranges (RFC 1918 addresses, RFC 6996 AS numbers) so none of them
 * points at a real network.
 */
export interface CpeFieldNote {
  /** What the field does, beyond the console's own hint. */
  what?: string;
  /** A value to type, printed in the Accepts column as `e.g.`. */
  example?: string;
}

export interface CpeWalkthrough {
  title: string;
  intro: string;
  /** One step each; `**bold**` for what is on screen. */
  steps: Array<{ title: string; body: string[] }>;
  /** How to tell that it worked. */
  verify: string[];
}

export interface CpeScreenNotes {
  /** The source these notes were written from. */
  from: string;
  /**
   * Per form, per field label. The key is the form's own title (`Add BGP
   * neighbor`); `Settings` is the screen's inline form, which has none.
   */
  fields?: Record<string, Record<string, CpeFieldNote>>;
  /** A task done end to end with real values: add, apply, verify. */
  walkthrough?: CpeWalkthrough;
  /** `[what you see, why, what to do]`. */
  trouble?: Array<[string, string, string]>;
  /**
   * Whole sections the extractor cannot build — a per-device menu that is not
   * the kit's RowActions, say. Printed after the add steps, `## title` each.
   */
  sections?: Array<{ title: string; body: string[] }>;
}

export const CPE_NOTES: Record<string, CpeScreenNotes> = {
  'CpeBgpPage.jsx': {
    from: 'frontend/src/components/cpe/CpeBgpPage.jsx — the global form, the four drawers, the delete dialog and the topology banner',
    fields: {
      Settings: {
        'BGP Service': {
          what: 'Runs BGP on this router. While it is off the screen shows only this switch — every field below and all four lists appear once it is on.',
        },
        'Router ID': {
          what: 'Usually a loopback or LAN address of this router. It only has to be unique among the routers it peers with; it does not have to be reachable.',
          example: '10.255.0.2',
        },
        'Router AS': {
          what: 'This router’s own AS. Use a private AS (64512–65534, or 4200000000–4294967294) unless a provider has assigned you a public one.',
          example: '65002',
        },
        'Redistribute Connected': {
          what: 'Advertises every directly connected subnet — LAN and WAN interface subnets alike — without listing them under **Networks**. List networks explicitly instead when only some should be advertised.',
        },
        'Redistribute Static': {
          what: 'Advertises the router’s static routes to its peers.',
        },
        'Keepalive Interval (seconds)': {
          what: 'Keep it at a third of the hold time.',
        },
        'Hold Time (seconds)': {
          what: 'The two peers use the lower of their two values, so shortening it on one side is enough.',
        },
        'Log Neighbor Changes': {
          what: 'Writes a log line each time a peer comes up or goes down — the first thing to read when a session flaps.',
        },
        'Graceful Restart': {
          what: 'Asks peers to keep forwarding on this router’s routes while its BGP process restarts, instead of withdrawing them at once. Both peers must support it.',
        },
        'Deterministic MED': {
          what: 'Compares MED among routes from the same neighbouring AS as a group, so the best path does not depend on the order routes arrived in.',
        },
        'Default Local Preference': {
          what: 'Higher is preferred when two paths lead to the same prefix.',
          example: '100',
        },
        BFD: {
          what: 'Runs Bidirectional Forwarding Detection beside each session, so a dead peer is noticed in under a second instead of after the hold time. The peer has to run BFD as well.',
        },
        'Min RX (ms)': { what: 'The fastest rate this router is willing to receive BFD packets at.', example: '300' },
        'Min TX (ms)': { what: 'The fastest rate this router sends BFD packets at.', example: '300' },
        'Detect Multiplier': {
          what: 'Missed packets before the peer is declared down. With 300 ms and 3, a failure is detected in about 900 ms.',
          example: '3',
        },
      },
      'Add BGP neighbor': {
        Name: {
          what: 'Stick to letters, digits and underscores — the characters a UCI section name allows.',
        },
        'Neighbor AS': {
          what: 'The same number as **Router AS** makes this an iBGP peer; a different one makes it eBGP. The form lets it be left blank, but a session cannot come up without it.',
          example: '65000',
        },
        'Address family': {
          what: '**IPv4 Unicast** is ordinary IPv4 routing and what almost every peer needs. The VPN and EVPN families are for MPLS L3VPN and EVPN overlays.',
        },
        Interface: {
          what: 'Pick one and leave **Neighbor IP** blank to peer unnumbered over that link. The list is read from the router when the drawer opens.',
        },
        Password: {
          what: 'Must be identical on both routers, or the session never establishes.',
        },
        Description: { what: 'Free text for people; the router does not use it.', example: 'Hub, Mumbai DC' },
        'Update source': {
          what: 'Needed when the session runs between loopbacks rather than between the directly connected addresses.',
          example: 'lo',
        },
        'eBGP multihop': {
          what: 'Only for an eBGP peer that is not directly connected, such as one reached over a tunnel or between loopbacks.',
          example: '2',
        },
        Weight: {
          what: 'Stays on this router and is never sent to the peer. Higher wins, and it is compared before local preference.',
          example: '100',
        },
        'Local preference': {
          what: 'Local preference for routes learned from this peer. Higher is preferred.',
          example: '200',
        },
        'Maximum prefixes': { example: '1000' },
        'allowas-in': {
          what: 'Needed when several sites share one AS and learn each other’s routes through a provider.',
          example: '1',
        },
        'Route map in': {
          what: 'The **Map name** of an entry under **Route Maps**, applied to routes received from this peer. It is typed, not picked, so it has to match exactly.',
          example: 'SET-LP',
        },
        'Route map out': {
          what: 'The **Map name** of an entry under **Route Maps**, applied to routes sent to this peer. Typed, so it has to match exactly.',
        },
        'Prefix list in': {
          what: 'The **List name** of entries under **Prefix Lists**, filtering what this peer sends you. Typed, so it has to match exactly.',
          example: 'ALLOW-IN',
        },
        'Prefix list out': {
          what: 'The **List name** of entries under **Prefix Lists**, filtering what you send this peer.',
        },
        'Send community': {
          what: 'Which BGP community attributes are passed on to this peer.',
        },
        'Next hop self': {
          what: 'Rewrites the next hop to this router’s own address on routes sent to the peer — usual on a hub towards its iBGP spokes.',
        },
        'Default originate': {
          what: 'Sends this peer a default route (0.0.0.0/0), so it can send all traffic through this router.',
        },
        'Remove private AS': {
          what: 'Strips private AS numbers from the path of routes sent to this peer — used towards a provider.',
        },
      },
      'Add BGP network': {
        Name: { what: 'Letters, digits and underscores only — it becomes a UCI section name.' },
        Network: {
          what: 'Write the network address, not a host in it: `192.168.10.0/24`, not `192.168.10.1/24`. BGP advertises it only while a matching route exists in the router’s table.',
          example: '192.168.10.0/24',
        },
      },
      'Add prefix list entry': {
        Name: { what: 'Letters, digits and underscores only. One per entry, so a list of three entries has three names.', example: 'allow_in_10' },
        Sequence: {
          what: 'Lower numbers are checked first. Leave gaps — 10, 20, 30 — so an entry can be slotted in later.',
        },
        Action: {
          what: '**Permit** lets matching routes through, **Deny** drops them. A route that matches no entry in the list is dropped.',
        },
        Network: { example: '192.168.0.0/16' },
        ge: {
          what: 'Longer than the network’s own prefix length, and no longer than **le**. With `192.168.0.0/16`, ge `24` and le `32` match every /24 to /32 inside it.',
          example: '24',
        },
        le: { example: '32' },
      },
      'Add route map entry': {
        Name: { what: 'Letters, digits and underscores only. One per entry.', example: 'set_lp_10' },
        Sequence: {
          what: 'Lower numbers are checked first; the first entry that matches decides. Leave gaps so entries can be inserted later.',
        },
        Action: {
          what: '**Permit** applies the SET clauses to matching routes; **Deny** drops them. A route that matches no entry is dropped.',
        },
        'Prefix list': {
          what: 'MATCH: the **List name** of a prefix list. Blank matches every route.',
          example: 'ALLOW-IN',
        },
        Interface: { what: 'MATCH: routes whose next hop is out of this interface.', example: 'eth1' },
        'Local preference': { what: 'SET: local preference on matching routes. Higher is preferred.', example: '200' },
        Metric: {
          what: 'SET: the MED sent to eBGP peers. Lower is preferred by them.',
          example: '50',
        },
        Weight: { what: 'SET: weight on this router only. Higher wins.', example: '100' },
        'AS prepend': {
          what: 'SET: makes the path look longer, so peers prefer another way in. Prepend your own AS.',
          example: '65002 65002',
        },
        Origin: { what: 'SET: the origin attribute. **IGP** is preferred over **EGP**, which is preferred over **Incomplete**.' },
        'Next hop': { what: 'SET: the next hop advertised for matching routes.', example: '10.0.0.1' },
      },
    },
    walkthrough: {
      title: 'Worked example: peer with a hub and advertise the LAN',
      intro:
        'This router (AS **65002**) peers with a hub at **10.0.0.1** (AS **65000**) and advertises its LAN, **192.168.10.0/24**. The addresses and AS numbers are examples; use your own. The hub has to be configured the other way round — this router as its neighbor, with AS 65002 — or the session never comes up.',
      steps: [
        {
          title: 'Turn BGP on and give the router its identity',
          body: [
            'Under **Global Configuration**, switch **BGP Service** on. Router ID, Router AS, the timers and the four lists appear.',
            'Set **Router ID** to `10.255.0.2` and **Router AS** to `65002`. Leave the timers at 60 and 180 unless the hub uses others. Press **Save**.',
          ],
        },
        {
          title: 'Advertise the LAN',
          body: [
            'Under **Networks**, press **Add Network**. **Name** `lan`, **Network** `192.168.10.0/24`, **Enabled** on. Press **Add network**. The row appears in the list.',
          ],
        },
        {
          title: 'Add the hub as a neighbor',
          body: [
            'Under **Neighbors**, press **Add Neighbor**. **Name** `hub1`, **Neighbor IP** `10.0.0.1`, **Neighbor AS** `65000`, **Address family** IPv4 Unicast. Add a **Password** only if the hub has one, and then exactly the same one.',
            'Press **Add neighbor**.',
          ],
        },
        {
          title: 'Apply',
          body: [
            'Nothing so far has reached the running router. Press **Apply changes** on the bar that says **Unsaved changes on the router**. Until you do, the router keeps running its old configuration.',
          ],
        },
      ],
      verify: [
        '**BGP Runtime Status** re-reads the router every fifteen seconds. **State** should stop reading `disabled`.',
        '**Established Peers** counts sessions that are actually up. It should reach `1` once the hub has the matching configuration — this is the number that says BGP is working.',
        'The **Status** column in **Neighbors** is not the session. It shows whether the neighbor is switched on in the configuration, and reads **Enabled** even while the session is down.',
      ],
    },
    trouble: [
      [
        '**State** still reads `disabled` after **Save**',
        'The change is staged, not applied.',
        'Press **Apply changes** on the pending-changes bar.',
      ],
      [
        'There is no **Add Neighbor** button',
        '**BGP Service** is off. The four lists only appear while it is on.',
        'Switch it on. The lists appear at once, before you save.',
      ],
      [
        '**Established Peers** stays at `0`',
        'The session is not coming up. Usually one of: the AS numbers do not match what each side expects, the neighbor IP is not reachable, the passwords differ, or the other router has not been configured with this one as its neighbor.',
        'Check **Neighbor AS** against the peer’s own AS and **Router AS** against what the peer expects; ping the neighbor IP from the device\u2019s **Diagnostics** tab; make the passwords identical; turn on **Log Neighbor Changes** and read the router\u2019s log.',
      ],
      [
        'An eBGP peer over a tunnel never comes up',
        'eBGP expects the peer to be directly connected.',
        'Set **eBGP multihop** on the neighbor to the number of hops, e.g. `2`, and **Update source** if you peer between loopbacks.',
      ],
      [
        'A pop-up reads *Failed: …* or *Save failed: …*',
        'The router refused the change. The form itself only checks that the required fields are filled in; formats and ranges are checked by the router.',
        'Read the reason after the colon. Common ones: a **Name** with characters other than letters, digits and underscores, a **Network** that is not in CIDR form, a number outside its range.',
      ],
      [
        'A route map or prefix list has no effect',
        'The neighbor names it by typed text, and nothing checks that the name exists.',
        'Make **Route map in/out** or **Prefix list in/out** match the **Map name** or **List name** exactly, including case.',
      ],
      [
        '**Router ID** and **Router AS** are greyed out under a banner',
        'The device is in an SD-WAN topology, which owns its BGP identity.',
        'Change them from the topology. A deploy also removes neighbors the topology does not know about, so neighbors added here by hand can disappear.',
      ],
    ],
  },
  'CpeFwZonesPage.jsx': {
    from: 'frontend/src/components/cpe/CpeFwZonesPage.jsx — the zone drawer, its Custom/Guest/DMZ presets (pickType), the save payload and the delete dialog; interface assignment from CpeNetInterfacesPage.jsx',
    fields: {
      'Create zone': {
        Type: {
          what: 'A shortcut for the policy fields below, not a setting of its own. **Guest** sets Traffic to firewall and Traffic to same zone to `REJECT` and turns on Traffic to WAN and Masquerade IPv4; **DMZ** does the same with `DROP`; **Custom** leaves them as they are. You can still change every field afterwards. The drawer then shows a *Preset selected* notice promising rules for essential services — this screen’s save does not send the type to the router, so check **Firewall › Rules** after creating the zone rather than assuming they were added.',
        },
        Name: {
          what: 'Lower-case is the convention (`lan`, `wan`, `guest`); the list shows it in capitals.',
          example: 'guest',
        },
        'Allow forwards to': {
          what: 'Zones this zone may send traffic to. Each choice is a forwarding from this zone to that one; traffic to a zone not listed falls to the rules, then to the default policy. The list is the router’s other zones, so a zone cannot forward to itself.',
          example: 'wan',
        },
        'Allow forwards from': {
          what: 'Zones that may send traffic into this one — the same forwardings, seen from the other side. Leave it empty for a zone nothing else should reach, such as a guest network.',
        },
        'Traffic to WAN': {
          what: 'Lets devices in this zone reach the internet through the WAN zone.',
        },
        'Traffic to firewall': {
          what: 'What happens to traffic from this zone addressed to the router itself — its web interface, SSH, DNS, DHCP. **ACCEPT** allows it; **DROP** discards it silently; **REJECT** refuses it with an error, so the sender knows at once. With DROP or REJECT, devices still need rules allowing DHCP and DNS, or they get no address and no name resolution.',
        },
        'Traffic to same zone': {
          what: 'What happens to traffic between devices and interfaces inside this zone. **ACCEPT** for a trusted LAN; **REJECT** or **DROP** to keep guests from reaching one another.',
        },
        Logging: {
          what: 'Logs traffic this zone drops or rejects. Useful while diagnosing a blocked connection; noisy on a busy WAN, so switch it off again afterwards.',
        },
        'Masquerade IPv4 (NAT)': {
          what: 'Hides the addresses of traffic leaving through this zone behind the zone’s own interface address. This is what lets private addresses reach the internet. It is normally on for WAN; the Guest and DMZ presets turn it on for their own zone too.',
        },
        'Masquerade IPv6 (NAT)': {
          what: 'The same for IPv6. Rarely wanted: IPv6 addresses are normally routed as they are, not translated.',
        },
      },
    },
    walkthrough: {
      title: 'Worked example: a guest zone with internet access only',
      intro:
        'A zone for a guest Wi-Fi network: guests reach the internet, but not the LAN, the router, or each other. The name is an example; use your own.',
      steps: [
        {
          title: 'Create the zone',
          body: [
            'Press **Add zone**. Under **Type**, pick **Guest** — Traffic to firewall and Traffic to same zone become `REJECT`, and Traffic to WAN and Masquerade IPv4 come on.',
            'Set **Name** to `guest`. Leave **Allow forwards to** and **Allow forwards from** empty: internet access comes from Traffic to WAN, and nothing should forward into this zone. Press **Create zone**.',
          ],
        },
        {
          title: 'Check the row',
          body: [
            'The drawer closes, a pop-up says *Zone created*, and **GUEST** appears in the list with `ACCEPT` under **Traffic to WAN** and `REJECT` under Traffic to firewall and Traffic to same zone. **Interfaces** reads `—` — nothing is in the zone yet.',
          ],
        },
        {
          title: 'Put an interface in it',
          body: [
            'Zones are not given interfaces here. Open **Network › Interfaces and devices**, edit the guest network’s interface and set its **Zone** to `guest`. Back on this screen, the interface now shows under **Interfaces**.',
          ],
        },
        {
          title: 'Let guests get an address',
          body: [
            'With Traffic to firewall at REJECT, guests cannot ask the router for DHCP or DNS until a rule allows it. Check **Firewall › Rules** for input rules from `guest` allowing DHCP (UDP 67) and DNS (UDP/TCP 53), and add them if they are not there.',
          ],
        },
      ],
      verify: [
        'A device on the guest network gets an address and can browse the internet.',
        'From that device, the router’s web interface and any LAN address do not answer.',
        'If something is blocked that should not be, switch on **Logging** on the zone and read the router’s log — it records what the zone refused.',
      ],
    },
    trouble: [
      [
        'The save is refused under **Name** with *Letters, digits and underscore only — it becomes a config key*',
        'The name has a space, hyphen or other character.',
        'Use letters, digits and underscores only: `guest_wifi`, not `guest-wifi`.',
      ],
      [
        '**Name** is greyed out when editing',
        'The name is the zone’s identity on the router.',
        'Create a new zone with the new name, move the interfaces to it, then delete the old one.',
      ],
      [
        'Devices in a new zone get no IP address',
        'Traffic to firewall is `DROP` or `REJECT`, which also blocks DHCP and DNS to the router.',
        'Add input rules under **Firewall › Rules** allowing DHCP and DNS from the zone, or set Traffic to firewall to `ACCEPT` for a trusted zone.',
      ],
      [
        'A zone can reach the internet but nothing comes back',
        'Masquerade is off on the zone the traffic leaves by.',
        'Turn on **Masquerade IPv4 (NAT)** on the WAN zone.',
      ],
      [
        '**Allow forwards to** offers no zones',
        'It lists the router’s other zones, and there are none — or the list has not loaded.',
        'Create the other zone first; close and reopen the drawer.',
      ],
      [
        'After deleting a zone, traffic that used to pass is blocked',
        'Rules and forwardings that named the zone stop matching, and its interfaces are left with no zone.',
        'Give those interfaces a zone again under **Network › Interfaces and devices**, and review **Firewall › Rules**.',
      ],
    ],
  },
  'CpeNetInterfacesPage.jsx': {
    from: 'frontend/src/components/cpe/CpeNetInterfacesPage.jsx — ConfigureDrawer, VlanDrawer, AliasDrawer, the DeviceCard/DeviceTile menus, unconfigure() and removeDevice(); cpeValidate.js for isCidr',
    fields: {
      'Configure logical interface': {
        Type: {
          what: 'Only when the drawer is opened from **Configure logical interface** at the top; opened from a device’s own menu it is not asked. **Bridge** joins the chosen devices into one network, like ports on a switch. **Bond** combines them into one link for redundancy or throughput; this drawer does not ask for a bonding policy, so the router’s default is used.',
        },
        Devices: {
          what: 'The physical ports or VLAN devices to put in the bridge or bond. Only asked for a new logical interface, and then required: the save refuses an empty list with *Select at least one device for the bridge* (or *bond*).',
          example: 'eth2',
        },
        'Interface name': {
          what: 'Keep to letters, digits and underscores.',
        },
        Zone: {
          what: 'The firewall zone the interface joins, from **Firewall › Zones and policies**. This is what decides which rules apply to traffic on it, and what that screen’s **Interfaces** column shows.',
        },
        Protocol: {
          what: '**Static** for an address you type in — normal for a LAN. **DHCP** to take an address from the network the port is plugged into — normal for a WAN behind an ISP router.',
        },
        'IPv4 address (CIDR notation)': {
          what: 'The router’s own address on this network, with its prefix length. `192.168.20.1/24` makes the router .1 on 192.168.20.0/24. A bare address without `/24` is refused.',
          example: '192.168.20.1/24',
        },
        'IPv4 gateway': {
          what: 'Only asked for a static interface in the `wan` zone: the upstream router’s address. May be left blank.',
          example: '192.168.30.1',
        },
        'Enable IPv6': { what: 'Off keeps the interface IPv4-only.' },
        'IPv6 gateway': { example: '2001:db8::fffe' },
        'IPv4 MTU (bytes)': {
          what: 'Leave **MTU Mode** on Automatic (1500) unless the link needs smaller packets — PPPoE-style uplinks and some tunnels use 1492 or less.',
          example: '1492',
        },
        Metric: {
          what: 'Priority of this interface’s routes when two lead the same way — lower wins. Give two WANs different metrics to prefer one.',
          example: '10',
        },
        'DHCP client ID': { example: '01:84:0a:9e:15:10:66' },
        'Vendor class': { what: 'Sent to the DHCP server, where the provider asks for one.' },
        'Custom hostname': { example: 'branch-router' },
      },
      'Create VLAN device': {
        'VLAN ID': {
          what: 'The tag the switch uses for this network. It must match the VLAN configured on the switch port.',
          example: '100',
        },
        'Base device': {
          what: 'The port the tagged traffic arrives on. The new device is named after it and the tag — `eth2` with ID 100 becomes `eth2.100`.',
          example: 'eth2',
        },
        'Device type': {
          what: '**802.1q** is the ordinary VLAN tag. **802.1ad** (QinQ) is for a provider network that stacks a second tag outside the customer’s.',
        },
      },
      'Create alias on ‹…›': {
        'IPv4 addresses': {
          what: 'Extra addresses for the same interface, each with its prefix — for a second subnet on the same cable. Give at least one IPv4 or IPv6 address; the save refuses an empty alias with *Give at least one address*, and a line without a prefix with *Must be an address with a prefix, e.g. 10.0.0.2/24*.',
        },
      },
    },
    sections: [
      {
        title: 'The device list and its menu',
        body: [
          'Every network device on the router is one row (**List**) or one tile (**Card**), grouped by firewall zone: **LAN (Green)**, **WAN (Red)**, then the other zones by name, then **Unassigned** for devices with no interface. The ports inside a bridge are not listed on their own; open the bridge’s **Bridge** pill to see them. When SD-WAN is running, an **SD-WAN Internet Breakout** card at the top shows how many WANs are healthy, with **Manage SD-WAN**.',
          'Each device has its own menu at the end of the row, and what it offers depends on the device:',
          '| Device | Menu | What it does |\n| --- | --- | --- |\n| Not configured (Unassigned) | **Configure** | Opens **Configure interface for ‹device›** — the fields above without Type and Devices. |\n| Configured | **Edit** | Opens **Edit ‹interface› (‹device›)**; press **Save changes**. Interface name is greyed out. |\n| Configured | **Create alias interface** | Opens **Create alias on ‹interface›** to add a second address. |\n| Configured | **Unconfigure** | Removes the interface — address, zone and policy — and leaves the device. Asks first. |\n| A VLAN device (name with a dot, e.g. `eth2.100`) | **Delete VLAN device** | Removes the VLAN device. Asks first. |',
          'Physical ports cannot be deleted, only unconfigured. This screen offers no way to delete a bond.',
          'Saves on this screen are written straight to the router — a pop-up says *Interface configured*, *Interface updated*, *VLAN ‹id› created on ‹device›* or *Alias created on ‹interface›*, and the list refreshes. The list also re-reads the router every ten seconds on its own.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: a guest network on VLAN 100',
      intro:
        'Carry a guest network tagged VLAN 100 on port eth2, as 192.168.100.0/24 in the `guest` zone. It assumes the switch port is set to VLAN 100 and a `guest` zone exists — create one under **Firewall › Zones and policies** first. The values are examples.',
      steps: [
        {
          title: 'Create the VLAN device',
          body: [
            'Press **Create VLAN device**. **VLAN ID** `100`, **Base device** `eth2`, leave **Device type** on 802.1q. Press **Create VLAN device**. A pop-up says *VLAN 100 created on eth2*, and `eth2.100` appears under **Unassigned**.',
          ],
        },
        {
          title: 'Give it an address and a zone',
          body: [
            'Open `eth2.100`’s menu and choose **Configure**. **Interface name** `guest`, **Zone** `guest`, **Protocol** Static, **IPv4 address** `192.168.100.1/24`. Press **Configure interface**.',
          ],
        },
      ],
      verify: [
        'A pop-up says *Interface configured*, and `guest` moves from **Unassigned** to the **GUEST** group with `IPv4: 192.168.100.1/24`.',
        'Its status reads **Up** once the switch is sending tagged traffic.',
        'If guests should get addresses automatically, check the interface under **Network › DNS and DHCP**.',
      ],
    },
    trouble: [
      [
        'The device stopped answering after **Unconfigure** or **Edit**',
        'You changed the interface you manage the router through. The Unconfigure dialog warns about exactly this.',
        'Reach the router another way — through another interface, or locally — and configure the interface again.',
      ],
      [
        '*Must be a network in CIDR form, e.g. 10.0.0.0/24* under the address',
        'The prefix length is missing.',
        'Add it: `192.168.20.1/24`, not `192.168.20.1`.',
      ],
      [
        'There is no **IPv4 gateway** field',
        'It is only shown for a Static interface in the `wan` zone.',
        'Set **Zone** to `wan` first. A LAN interface does not need a gateway.',
      ],
      [
        'PPPoE is not offered',
        '**Protocol** offers Static and DHCP only on this screen.',
        'PPPoE cannot be set up from this screen.',
      ],
      [
        'There is no **Delete** in a device’s menu',
        'Only VLAN devices can be deleted here. Physical ports can only be unconfigured, and bonds cannot be deleted from this screen.',
        'Use **Unconfigure** to free a port.',
      ],
      [
        'A new VLAN device carries no traffic',
        'The VLAN ID does not match the switch port, or the device is still unconfigured.',
        'Match the ID to the switch, then **Configure** the device with an address and a zone.',
      ],
    ],
  },
  'CpeNetRoutesPage.jsx': {
    from: 'frontend/src/components/cpe/CpeNetRoutesPage.jsx — RouteDrawer (defaults, needsGateway, validate table, payload), the two tables, remove(), the IPv4/IPv6 sub-tabs; cpeValidate.js for ipv4/cidr',
    fields: {
      'Add ‹…› route': {
        Status: { what: 'Off keeps the route saved but not installed — handy for switching a route off without losing it.' },
        'Route name': { what: 'A label for people; the router does not route by it. It shows in the **Name** column.', example: 'branch-lan' },
        'Network address (CIDR notation)': {
          what: 'The destination network, written as its network address and prefix — `10.20.0.0/16`, not a host inside it. On the IPv6 tab, an IPv6 prefix such as `2001:db8:20::/48`. `0.0.0.0/0` would be a default route.',
          example: '10.20.0.0/16',
        },
        Gateway: {
          what: 'The next router on the way to that network; it must be reachable on one of this router’s own networks. The check is for an IPv4 address on both tabs, so an IPv6 route with a gateway is refused — see below.',
          example: '192.168.1.1',
        },
        Metric: {
          what: 'Preference when two routes cover the same destination: lower wins. Give a backup route a higher metric than the main one.',
          example: '10',
        },
        Interface: {
          what: '**Any** lets the router pick the interface from the gateway. Pick one to force it — needed when there is no gateway, or the gateway is only reachable through a particular interface. The list is the router’s own interfaces.',
          example: 'wan',
        },
        'Route type': {
          what: '**unicast** forwards traffic normally — almost always what you want. **blackhole** drops it silently, **unreachable** and **prohibit** drop it and tell the sender. The list comes from the router; when it cannot be read the drawer offers unicast, blackhole, unreachable and prohibit.',
        },
        MTU: { what: 'Largest packet sent along this route. Leave blank to use the interface’s own MTU.', example: '1400' },
        'On-link': {
          what: 'Only for a gateway that is not inside any of the router’s own subnets but is directly reachable on the chosen interface, as some providers hand out.',
        },
      },
    },
    sections: [
      {
        title: 'The two tables and the two tabs',
        body: [
          '**IPv4 routes** and **IPv6 routes** at the top are separate tabs: each shows only its own family, and **Add route** adds to the tab you are on — the drawer says **Add IPV4 route** or **Add IPV6 route**.',
          '**Active Routing Table** is read-only: every route the router is using right now — its own interfaces, what BGP or OSPF learned, and the static routes below — with the **Protocol** that put it there. Its ⟳ button re-reads it.',
          '**Static Routes** is the part you edit: only the routes added here. A row marked **System** instead of a menu was put there by the router itself and cannot be edited or deleted from this screen.',
          'Changes are written straight to the router — the page’s own heading says they apply as soon as they are saved, and there is no Apply step.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: reach a branch network through a local router',
      intro:
        'The branch network 10.20.0.0/16 sits behind another router on your LAN at 192.168.8.254. Without a route, traffic for it would follow the default route out of the WAN. The addresses are examples.',
      steps: [
        {
          title: 'Add the route',
          body: [
            'On the **IPv4 routes** tab, press **Add route** in the **Static Routes** header. Leave **Status** on. **Route name** `branch-lan`, **Network address** `10.20.0.0/16`, **Gateway** `192.168.8.254`, **Metric** `0`, **Interface** Any. Press **Add route**.',
          ],
        },
        {
          title: 'Check the static list',
          body: [
            'The drawer closes, a pop-up says *Route added*, and the route appears under **Static Routes** with Type `unicast` and Status **Enabled**.',
          ],
        },
      ],
      verify: [
        'Press ⟳ on **Active Routing Table**: `10.20.0.0/16` is listed with gateway `192.168.8.254` and protocol `static`.',
        'From the device’s **Diagnostics** tab, ping a host in 10.20.0.0/16.',
        'If the route is in the static list but not the active table, the gateway is not reachable — see below.',
      ],
    },
    trouble: [
      [
        '*Must be a network in CIDR form, e.g. 10.0.0.0/24* under Network address',
        'The prefix length is missing.',
        'Add it: `10.20.0.0/16`, not `10.20.0.0`.',
      ],
      [
        '*Must be an IPv4 address* under Gateway on the **IPv6 routes** tab',
        'The drawer checks the gateway as IPv4 on both tabs, so an IPv6 gateway is refused before it reaches the router.',
        'An IPv6 route can only be saved without a gateway here — pick the **Interface** instead. Report it if you need a gatewayed IPv6 route.',
      ],
      [
        'There is no **Gateway** field',
        '**Route type** is blackhole, unreachable or prohibit, which drop traffic rather than forward it.',
        'Set Route type back to `unicast` under **Advanced Settings**.',
      ],
      [
        'The route is under **Static Routes** but not in **Active Routing Table**',
        'Status is off, or the router cannot use it — usually because the gateway is not on any of its own networks.',
        'Check **Status**; check the gateway is inside one of the router’s subnets, or pick the **Interface** and turn on **On-link**.',
      ],
      [
        'A row has no menu, only **System**',
        'The router created that route itself.',
        'It cannot be changed here. Add your own route with a lower metric if you need to override it.',
      ],
      [
        'Traffic for a deleted route stopped arriving',
        'It now follows the default route, as the delete dialog warns — and the change was immediate.',
        'Add the route again.',
      ],
    ],
  },
  'CpeNetMwanPage.jsx': {
    from: 'frontend/src/components/cpe/CpeNetMwanPage.jsx — PolicyDrawer (applyBehaviour, member rows, save payload), RuleDrawer (src/dst type, payload), DefaultsTab, del(); the two cards’ own descriptions',
    fields: {
      'Create policy': {
        Label: {
          what: 'Letters, digits and underscores; it becomes the policy’s name on the router, which the list may show with an `ns_` prefix.',
        },
        'Choose behavior': {
          what: 'Sets the gateways’ metrics for you. **Balance** gives every gateway metric 10, so traffic is shared by weight. **Backup** gives them 10, 20, 30… in the order listed, so the first carries everything and the next takes over only when it fails. **Custom** unlocks each gateway’s metric box.',
        },
        'Interval (seconds)': { what: 'How often the policy’s links are checked.' },
        'Tracking IP': {
          what: 'The address the check pings. Pick one that answers pings and is reachable through every WAN in the policy.',
          example: '8.8.8.8',
        },
        'Tracking Method': {
          what: '**Ping** is an ordinary ICMP ping. **ARP Ping** only reaches a host on the same network as the WAN, such as its gateway. **HTTP Ping** checks with a web request, for links that block ICMP.',
        },
        Metric: {
          what: 'The policy’s default metric. What orders the gateways is each row’s own metric below.',
        },
        Gateways: {
          what: 'One row per WAN in the policy: the interface, its **Metric** (1–256, greyed out unless Choose behavior is Custom) and its **Weight** (1–256). **Add Gateway** adds a row, the bin removes one. Gateways on the same metric share traffic in proportion to weight — weights 3 and 1 split it 75/25; a higher metric is used only when every lower one has failed. The interface list is the router’s own, without loopback.',
          example: 'wan',
        },
      },
      'Create new rule': {
        'Rule name': {
          what: 'Letters, digits and underscores only.',
          example: 'voip_via_wan2',
        },
        'Assigned policy': { what: 'One of the policies in the **Policy** list above.' },
        Protocol: { what: 'Limit the rule to one protocol, or leave it on All protocols.' },
        'Source type': {
          what: '**Enter an address** shows the Source address box. **Any source address** matches every sender. **Select an object** shows no picker on this screen and is saved as any address.',
        },
        'Source address': {
          what: 'A network or a single host. Blank means any.',
          example: '192.168.8.0/24',
        },
        'Destination address': {
          what: 'A network or a single host. `0.0.0.0/0`, or blank, means any destination.',
          example: '0.0.0.0/0',
        },
      },
      Settings: {
        'Tracking hostname or IP address': {
          what: 'The hosts every WAN pings to prove it works. A WAN stays up while at least one of them answers, so list two or three reliable ones. At least one is required.',
          example: '8.8.8.8',
        },
        'Ping timeout': { what: 'How long to wait for each reply before counting it as lost.' },
        'Ping interval': { what: 'Time between pings while the WAN is healthy.' },
        'Failure interval': { what: 'Time between pings once a WAN has started failing — shorter, so a real failure is confirmed sooner.' },
        'Interface down': { what: 'Failed tests in a row before a WAN is taken out of use. Raise it if a WAN flaps on brief packet loss.' },
        'Interface up': { what: 'Successful tests in a row before a failed WAN is used again.' },
      },
    },
    sections: [
      {
        title: 'Policies, rules and the order they apply in',
        body: [
          'A **policy** says which WANs to use and how: shared (Balance) or one after another (Backup). A **rule** says which traffic follows which policy. Traffic no rule matches follows the default rule.',
          'Order matters: the **Rules** card itself says a rule must sit **above the default rule** to take effect. This screen has no way to reorder rules, so check where a new rule lands in the list after saving.',
          'The **Policy** card notes that with more than one WAN the default policy is mandatory and cannot be deleted.',
          '**General Settings** is its own tab, saved with its own **Save**; a pop-up says *Tracking settings saved*. It sets how every WAN is tested, for all policies at once.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: failover from wan to wan2',
      intro: 'All traffic uses `wan`; if it fails, traffic moves to `wan2`, and back when `wan` recovers. The interface names are examples; use the ones in your Gateways list.',
      steps: [
        {
          title: 'Create the policy',
          body: [
            'On **MultiWAN Manager**, press **Create Policy**. **Label** `failover`, **Choose behavior** Backup. Under **Gateways**, set the first row to `wan`, press **Add Gateway** and set the second to `wan2` — their metrics become 10 and 20. Press **Create policy**. A pop-up says *Policy created*.',
          ],
        },
        {
          title: 'Send traffic through it',
          body: [
            'Press **Create Rule**. **Rule name** `all_failover`, **Assigned policy** `ns_failover` (or `failover`, as the list names it), **Protocol** All protocols, **Source type** Any source address, **Destination type** Any destination address. Press **Save**. A pop-up says *Rule created*.',
            'Check that the new rule sits above the default rule in the list.',
          ],
        },
      ],
      verify: [
        'The policy’s **Behaviour** column reads **Failover** and **Members** shows `wan · metric 10` and `wan2 · metric 20`.',
        'With the General Settings defaults, a WAN is taken out of use after 5 failed tests and brought back after 5 good ones.',
      ],
    },
    trouble: [
      [
        '*Add at least one interface* under Gateways',
        'Every gateway row is still on *Gateway…*.',
        'Pick an interface in at least one row.',
      ],
      [
        'A rule has no effect',
        'It sits below the default rule, or the source/destination does not match the traffic.',
        'Check its position in the list and its Source and Destination columns.',
      ],
      [
        'A rule set to **Select an object** matches everything',
        'This screen offers no object picker and saves the rule with any address.',
        'Use **Enter an address** instead.',
      ],
      [
        'Every WAN shows as down',
        'None of the tracking hosts answer ping from those links — ICMP may be blocked.',
        'Use other hosts under **General Settings**, or set the policy’s **Tracking Method** to HTTP Ping.',
      ],
      [
        'A WAN keeps switching off and on',
        'Brief packet loss fails enough tests in a row.',
        'Raise **Interface down** under General Settings, or add more tracking hosts.',
      ],
      [
        'The default policy cannot be deleted',
        'With more than one WAN it is mandatory, as the Policy card says.',
        'Edit it instead.',
      ],
    ],
  },
  'CpeNetDdnsPage.jsx': {
    from: 'frontend/src/components/cpe/CpeNetDdnsPage.jsx — ServiceDrawer (defaults, WAN_OPTS, IP_SOURCES, validate table, payload), remove(), forceUpdate(), the service list',
    fields: {
      'Add DDNS service': {
        Service: { what: 'Off keeps the service saved but stops the router updating the hostname.' },
        'Service Name': {
          what: 'A label for this service on the router, shown in the **Name** column. Letters, digits and underscores are safest.',
        },
        Provider: {
          what: 'The DNS provider that hosts the hostname — the list is read from the router, over 80 of them, and a new service starts on the first one it lists, so pick yours explicitly. Type to search.',
          example: 'duckdns.org',
        },
        'Domain / Hostname': {
          what: 'The full name to keep pointed at this router, exactly as registered with the provider.',
          example: 'branch1.duckdns.org',
        },
        'Username / Email': {
          what: 'Your account name or email at the provider. What each provider expects here differs — check its own instructions; token-only providers may ignore it.',
        },
        'Password / API Token': {
          what: 'Your password or API token at the provider. Stored on the router and never shown again.',
        },
        'WAN Interface': {
          what: 'Which WAN’s address to publish. The drawer offers `wan`, `wan2` and **Any** whatever the router’s WANs are called — pick **Any** if yours is named differently.',
        },
        'IP Source': {
          what: 'Where the router learns the address to publish. **Network** and **Interface** read it from the router itself. **Web service** asks an outside site what address the router is seen from — use it when the WAN sits behind another router or carrier NAT, where the router’s own address is a private one.',
        },
        'Use IPv6': { what: 'Publish the IPv6 address (an AAAA record) instead of IPv4.' },
        'Use HTTPS': { what: 'Send updates to the provider over HTTPS, so the password or token is not sent in the clear.' },
        'Check Interval (min)': {
          what: 'How often the router checks whether its address has changed. An update is only sent when it has.',
          example: '10',
        },
        'Force Interval (hours)': {
          what: 'Sends an update this often even when nothing changed, so providers that expire idle hostnames keep this one.',
          example: '72',
        },
      },
    },
    sections: [
      {
        title: 'Reading the list',
        body: [
          'One row per service: **Name**, **Provider**, **Hostname**, **Current IP** — the address the provider was last given, `—` until the first update — and **Status**. The list re-reads the router every 30 seconds.',
          'Each row’s menu offers **Edit**, **Delete** and **Force update now**, which sends an update straight away instead of waiting for the check interval; a pop-up says *Update forced for ‹name›*.',
          'Saves are written straight to the router; a pop-up says *Service added* or *Service updated*.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: keep a hostname on a branch router',
      intro:
        'Keep `branch1.duckdns.org` pointed at this router’s WAN address. The provider and names are examples — create the hostname at your provider first and have its username and token to hand.',
      steps: [
        {
          title: 'Add the service',
          body: [
            'Press **Add service**. Leave **Service** on. **Service Name** `branch1`, **Provider** `duckdns.org` (type to search), **Domain / Hostname** `branch1.duckdns.org`, then the account’s **Username / Email** and **Password / API Token**.',
            '**WAN Interface** `wan`; **IP Source** Network, or Web service if the router is behind another router. Turn on **Use HTTPS**. Leave the intervals at 10 minutes and 72 hours. Press **Save**.',
          ],
        },
        {
          title: 'Send the first update',
          body: [
            'A pop-up says *Service added* and the row appears. Open its menu and choose **Force update now** rather than waiting for the first check.',
          ],
        },
      ],
      verify: [
        '**Current IP** shows the router’s public address within a minute (the list refreshes every 30 seconds).',
        'Looking the hostname up — `nslookup branch1.duckdns.org` from any computer — returns the same address.',
      ],
    },
    trouble: [
      [
        '**Username / Email** and **Password** are already filled in — `admin` and dots — on a new service',
        'The browser has autofilled your saved controller login; the drawer itself starts them empty.',
        'Clear both and type the provider’s credentials, or the controller login is sent to the provider.',
      ],
      [
        '**Current IP** stays `—`',
        'No update has succeeded yet — usually wrong credentials or hostname.',
        'Check them against the provider, then **Force update now**.',
      ],
      [
        '**Current IP** is a private address (10.x, 172.16–31.x, 192.168.x, 100.64.x)',
        'The WAN is behind another router or carrier NAT, and the router is publishing its own address.',
        'Edit the service and set **IP Source** to Web service.',
      ],
      [
        '**Provider** says *No providers reported*',
        'The router did not return its provider list.',
        'Close and reopen the drawer to ask again. The list comes only from the router.',
      ],
      [
        'Your WAN is not called `wan` or `wan2`',
        'The **WAN Interface** list is fixed on this screen.',
        'Pick **Any**.',
      ],
    ],
  },
  'CpeSecShieldPage.jsx#CpeSecShieldIpPage': {
    from: 'frontend/src/components/cpe/CpeSecShieldPage.jsx — CpeSecShieldIpPage, its six inline tabs, EntryDrawer, SearchIpDrawer, LocalListTab, GeoBlockTab, IpSettingsTab, useEntryActions',
    fields: {
      'Blocklist feeds › Search IP in blocklists': {
        'IP address': { what: 'Checks the enabled feeds only; the answer lists which of them contain it.', example: '203.0.113.5' },
      },
      'Local allowlist › Add address': {
        'Allowed address': {
          what: 'Put your own offices, monitoring servers and partners here so a feed or the brute-force detector can never block them. A single address, a network in CIDR form, a MAC address or a hostname.',
          example: '203.0.113.0/24',
        },
        Description: { what: 'A note for people — who or what the address is.', example: 'Head office' },
      },
      'Local blocklist › Add address': {
        'Blocked address': {
          what: 'An address to block whatever the feeds say — a scanner seen in your logs, say. Same forms as the allowlist.',
          example: '198.51.100.23',
        },
        Description: { example: 'Port scanner seen 12 May' },
      },
      'Geo-IP Blocking › Settings': {
        'Geo IP blocking': { what: 'Saves the moment you flip it — there is no separate Save for this switch.' },
        'Block inbound traffic': { what: 'The usual choice: stops connections from blocked countries reaching the router and anything it forwards to.' },
        'Block outbound traffic': { what: 'Also stops your own users reaching those countries. With both directions off, the country list does nothing — the screen warns *No direction selected*.' },
        'Status filter': { what: 'Only filters the country list you are looking at: all countries, only blocked ones, or only allowed ones.' },
      },
      'Settings › Settings': {
        Status: { what: 'Turns Instashield IP on or off. Off, the other five tabs show *Instashield IP is disabled* instead of their tables.' },
        'Log packets blocked in forward chain': { what: 'Logs traffic blocked on its way through the router. The Status tab’s threat counts only include what was logged.' },
        'Block brute force attacks': { what: 'Bans an address that fails to log in too many times — on SSH, for example. The ban appears under **Banned IPs**.' },
        'Ban after N failed accesses': { what: 'Failed attempts from one address before it is banned.', example: '5' },
        'Ban time': { what: 'How long the ban lasts; 30 minutes when the router reports none.' },
        'Add a common pattern': { what: 'Picks a ready-made log line to watch for and adds it to the patterns below.' },
        'Patterns to detect attacks': { what: 'One per line; a log line containing any of them counts as a failed access.', example: 'Failed password for' },
      },
    },
    sections: [
      {
        title: 'Before anything else',
        body: [
          'Every tab but **Settings** reads *Instashield IP is disabled* until the service is on, with **Go to Settings**. Turn **Status** on there and press **Save** first.',
          'Changes go straight to the router. There is no Apply step; each save shows a pop-up — *Feed enabled*, *Entry added*, *Settings saved*, *Unbanned*.',
        ],
      },
      {
        title: 'How the tabs fit together',
        body: [
          '**Blocklist feeds** are the lists Instashield subscribes to; each row has its own switch, which saves as you flip it. Above them: **Active Bans**, **Feeds Enabled**, **Last Updated**, and **Update Blocklists** to fetch fresh copies now (it runs in the background). **Search IP in blocklists** checks one address against the enabled feeds.',
          '**Local allowlist** and **Local blocklist** are your own overrides: an allowed address is never blocked by a feed, and a blocked one always is. Each has **Add** in its header and **Edit**/**Delete** on each row; deleting asks first, and the address goes back to whatever the feeds say about it.',
          '**Banned IPs** lists addresses the brute-force detector banned, with when the ban started and when it expires — **Never expires** and a **Permanent** badge for ones added by hand. **Unban now** in a row’s menu lifts it.',
          '**Geo-IP Blocking** blocks by country: pick a region, tick countries, then **Save**.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: switch it on and protect your own addresses',
      intro: 'Turn Instashield IP on, subscribe to a feed, make sure your office can never be blocked, and block one known bad address. The addresses are examples.',
      steps: [
        {
          title: 'Turn it on',
          body: ['On **Settings**, switch **Status** on and press **Save**. A pop-up says *Settings saved* and the status reads **Running**.'],
        },
        {
          title: 'Enable feeds',
          body: ['On **Blocklist feeds**, switch on the feeds you want — the pop-up says *Feed enabled* for each — then press **Update Blocklists**. **Feeds Enabled** counts them.'],
        },
        {
          title: 'Allow your office, block an attacker',
          body: [
            'On **Local allowlist**, press **Add**: **Allowed address** `203.0.113.0/24`, **Description** `Head office`, **Add address**.',
            'On **Local blocklist**, press **Add**: **Blocked address** `198.51.100.23`, **Add address**.',
          ],
        },
      ],
      verify: [
        'On **Blocklist feeds**, **Search IP in blocklists** with `198.51.100.23` reports it is on a blocklist.',
        '**Active Bans** and **Banned IPs** fill as the detector bans addresses.',
      ],
    },
    trouble: [
      ['Every tab says *Instashield IP is disabled*', 'The service is off.', 'Turn **Status** on under **Settings** and press **Save**.'],
      ['*No direction selected* on Geo-IP Blocking', 'Both Block inbound and Block outbound are off, so the country list has no effect.', 'Turn on at least one direction.'],
      ['You locked yourself out after mistyping a password', 'The brute-force detector banned your address.', 'From another address, **Unban now** it under **Banned IPs**, and add it to the **Local allowlist** so it cannot happen again.'],
      ['A legitimate site or partner is blocked', 'A feed lists its address.', '**Search IP in blocklists** shows which feed; add the address to the **Local allowlist** or switch that feed off.'],
      ['**Last Updated** is empty', 'The feeds have not been fetched since the service started.', 'Press **Update Blocklists**.'],
      ['A message appears under the address when adding', 'The router refused the value and says why.', 'Use one address, CIDR network, MAC or hostname per entry.'],
    ],
  },
  'CpeSecShieldPage.jsx#CpeSecDdosPage': {
    from: 'frontend/src/components/cpe/CpeSecShieldPage.jsx — CpeSecDdosPage, DOS_TABS, DOS_L3/DOS_L4, DosPolicyTab, DdosEnableGuard, flush(); CpeSecDosProfile.jsx for the WAN profile drawer',
    fields: {
      'DoS Policy › Settings': {
        'Quarantine duration': {
          what: 'How long a source that trips a threshold is held out, in the router’s units: `30s`, `5m`, `1h`. Only applies in Continuous mode.',
          example: '5m',
        },
        'Quarantine log': { what: 'Writes a log line each time a source is quarantined.' },
        'Quarantine set capacity': { example: '65535' },
        'Persist alerts to disk': { what: 'Keeps the alert log across reboots, subject to the retention and roll size below.' },
      },
      'Per-Interface Profiles › Add WAN profile': {
        'WAN interface': { what: 'Each WAN can have one profile; a WAN that already has one is not offered.' },
        'TCP SYN — packets per second': { what: 'Starts at 5 on a new profile. Lower it on a slow uplink.', example: '5' },
        'ICMP — packets per second': { what: 'Starts at 50.', example: '50' },
        'UDP — packets per second': { what: 'Starts at 50.', example: '50' },
        'TCP SYN — action over the limit': { what: 'Starts at Block. **Log only** records the trip without dropping — useful while you tune the limit.' },
        'ICMP — action over the limit': { what: 'Starts at Block.' },
        'UDP — action over the limit': { what: 'Starts at Block.' },
        'Quarantine target': { what: '**Attacker** holds the source — the usual choice. **Victim** holds the destination, protecting everything else from a flood aimed at one host.' },
        'Source scope': { example: '10.0.0.0/8' },
        'TCP ports': { example: '443' },
      },
      'Trusted Hosts › Add a trusted host': {
        Address: {
          what: 'A trusted host is never quarantined, whatever it sends. Use `/32` for one IPv4 address, `/128` for one IPv6 address, or a wider range for a VPN admin network.',
          example: '203.0.113.10/32',
        },
        Description: { example: 'NOC office' },
      },
    },
    sections: [
      {
        title: 'Turning it on',
        body: [
          'The **Service** switch in the **DDoS protection service** card turns protection on and off; the card also shows **Status**, **Total packets dropped**, **Quarantined IPs** and **Active source meters**. While it is off, the tabs show *DDoS protection is disabled*.',
          'Turning it on with no trusted host opens **Set Trusted Hosts Before Enabling Protection**: add at least one address — normally the one you manage the router from — with **Add**. **Save Trusted Hosts & Enable Protection** stays greyed out until the list has one. A pop-up then says *Protection on*.',
          'Turning it off removes the whole DoS rule set at once; the counters start from zero when it is turned on again.',
        ],
      },
      {
        title: 'The anomaly table on DoS Policy',
        body: [
          'IPv4 and IPv6 are set separately — pick the family with the **IPv4 / IPv6** selector above the table. Each row is one kind of flood or scan: **Status** turns it on, **Action** is **Block** (drop and quarantine the source) or **Observe** (log only), **Threshold** is the rate that trips it, and **Logging** records each trip. Press **Save & Apply** below to keep changes.',
          '| Group | Anomaly | Default threshold |\n| --- | --- | --- |\n| L3 | IP Sessions per Source | 5000 |\n| L3 | IP Sessions per Destination | 5000 |\n| L4 | TCP SYN Flood | 2000 |\n| L4 | TCP Port Scan | 1000 |\n| L4 | TCP Sessions per Source | 5000 |\n| L4 | TCP Sessions per Destination | 5000 |\n| L4 | UDP Flood | 2000 |\n| L4 | UDP Scan | 2000 |\n| L4 | UDP Sessions per Source | 5000 |\n| L4 | UDP Sessions per Destination | 5000 |\n| L4 | ICMP Flood | 250 |\n| L4 | ICMP Sweep | 100 |\n| L4 | ICMP Sessions per Source | 300 |\n| L4 | ICMP Sessions per Destination | 1000 |',
          'Under **Anomaly mode & quarantine**, **Continuous** blocks everything from a source for the quarantine duration once it trips a threshold; **Periodical** only rate-limits it, without quarantine.',
        ],
      },
      {
        title: 'Quarantine List',
        body: [
          'Sources currently held out, what tripped them, and when. **Release** in a row’s menu lets one back in; **Release all** in the header asks first — *Release everything in quarantine?* — because it also lets in an attack still in progress. The pop-up says *Quarantine cleared*.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: turn protection on without locking yourself out',
      intro: 'Protect the router’s WAN while making sure your own management address can never be quarantined. Addresses are examples.',
      steps: [
        {
          title: 'Trust your management address',
          body: ['On **Trusted Hosts**, press **Add host**: **Address** `203.0.113.10/32`, **Description** `NOC office`. Press **Save**.'],
        },
        {
          title: 'Turn the service on',
          body: ['Switch **Service** on in the **DDoS protection service** card. Because a trusted host exists, protection starts; the pop-up says *Protection on* and **Status** reads **Active**.'],
        },
        {
          title: 'Choose what to watch',
          body: ['On **DoS Policy**, with **IPv4** selected, switch on **TCP SYN Flood** and **ICMP Flood** with Action **Block** and the default thresholds, then press **Save & Apply**. Repeat on **IPv6** if the WAN has it.'],
        },
      ],
      verify: [
        '**Total packets dropped** and **Quarantined IPs** in the service card rise when an attack is blocked.',
        'Tripped sources appear under **Quarantine List** with the anomaly that caught them.',
      ],
    },
    trouble: [
      ['**Save Trusted Hosts & Enable Protection** is greyed out', 'The trusted list is empty.', 'Add at least one address with **Add** in the same dialog.'],
      ['You lost access to the router after enabling it', 'Your own address tripped a threshold and was quarantined.', 'From another address, **Release** it under **Quarantine List**, then add it under **Trusted Hosts**.'],
      ['Legitimate traffic is being quarantined', 'A threshold is too low for the link.', 'Raise that anomaly’s **Threshold**, or set its Action to **Observe** while you tune it; for one WAN only, use a **Per-Interface Profile**.'],
      ['**Address Scope & Service Filter** or **DDoS Alert** shows nothing', 'The screen has no content for these two tabs yet.', 'Nothing to configure there from the controller.'],
      ['IPv6 attacks are not caught', 'IPv4 and IPv6 are configured separately.', 'Select **IPv6** above the anomaly table and enable the rows there too.'],
    ],
  },
  'CpeSecIpsPage.jsx': {
    from: 'frontend/src/components/cpe/CpeSecIpsPage.jsx — TABS, IpsSettingsTab (init, controls, Update now), SensorDrawer, BypassDrawer, DisableRuleDrawer, SuppressAlertDrawer, the event list row actions; SettingsDrawer is never opened',
    fields: {
      'Settings › Settings': {
        Status: { what: 'Turns the IPS engine on. Off, every other tab shows *IPS is turned off* with **Go to Settings**, and the fields below are hidden. Press **Save** after switching it.' },
        Mode: { what: '**IPS — Block on match** drops traffic that matches a rule. **IDS — Alert only** just records it. Starts on IPS; start on IDS for a few days if you are worried about blocking legitimate traffic.' },
        'Rule policy': { what: 'How many rules run. Starts on **Balanced (recommended)**; **Security** and **Maximum** catch more but need more CPU and raise more false positives.' },
        'Home networks': { what: 'Your own address ranges, so the engine knows which side is inside. Comma-separate several.', example: '192.168.0.0/16' },
        'Alert retention (days)': { what: 'Starts at 7.', example: '7' },
        'Inspect Forward Chain': { what: 'Traffic passing through the router — the usual choice.' },
        'Inspect Input Chain': { what: 'Traffic addressed to the router itself.' },
      },
      'Sensors › New IPS Sensor': {
        Status: { what: 'Off keeps the sensor saved but unused.' },
        'Block malicious URLs': { what: 'Stops connections to web addresses known to host malware.' },
        'Class actions': { what: 'Change the action for a whole class of rules — `block`, `monitor` (alert only) or `disable`.' },
        'Rule overrides': { what: 'Change one rule by its GID and SID — find them in the **SID** column of **Today event list**.' },
      },
      'Filter bypass › Create bypass': {
        'IP address': { what: 'A host or network the engine should not inspect at all — a backup server whose traffic trips rules, say. A bypass is a hole in your protection, so keep it narrow.' },
        Direction: { what: '**Both directions** skips all its traffic; **Source bypass** only traffic from it; **Destination bypass** only traffic to it.' },
        Description: { example: 'Backup server' },
      },
      'Disabled rules › Disable rule': {
        GID: { what: 'The rule’s generator ID — 1 for ordinary signature rules.', example: '1' },
        SID: { what: 'The rule’s signature ID, from the **SID** column of **Today event list**.', example: '2019401' },
        Description: { what: 'Required here: why the rule was switched off.', example: 'False positive on ERP traffic' },
      },
      'Suppressed alerts › Suppress alert': {
        'Rule Generator ID (GID)': { example: '1' },
        'Rule Signature ID (SID)': { example: '2019401' },
        Direction: { what: '**Source** silences the rule when the address sends the traffic; **Destination** when it receives it.' },
        Address: { what: 'The one host or network the rule should stay quiet about. The rule still runs for everyone else.' },
      },
    },
    sections: [
      {
        title: 'Before anything else',
        body: [
          'Every tab but **Settings** shows *IPS is turned off* until the engine is on. On **Settings**, switch **Status** on, choose **Mode** and **Rule policy**, and press **Save**. Rules then download and refresh once a day overnight; **Update now** fetches them straight away.',
          'Saves go straight to the router — no Apply step. Each shows a pop-up.',
        ],
      },
      {
        title: 'Dealing with a false positive',
        body: [
          'When a rule blocks or flags legitimate traffic, find it in **Today event list** — its **SID** is in the last column. The row’s menu offers two fixes: **Suppress for this host** silences it for that one address only (it lands under **Suppressed alerts**), and **Disable this rule** switches it off for everyone (it lands under **Disabled rules**, where **Re-enable** undoes it).',
          'Prefer suppression: disabling a rule removes that protection from the whole network. A **Filter bypass** is the bluntest tool — nothing from that host is inspected at all.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: turn IPS on safely',
      intro: 'Run in alert-only mode first, check what it would block, then switch to blocking.',
      steps: [
        { title: 'Turn it on in IDS mode', body: ['On **Settings**, switch **Status** on, set **Mode** to IDS — Alert only, **Rule policy** Balanced, **Home networks** `192.168.0.0/16`. Press **Save**, then **Update now**.'] },
        { title: 'Watch for a few days', body: ['Check **Today event list**. For anything legitimate that matches, use **Suppress for this host** from the row’s menu.'] },
        { title: 'Switch to blocking', body: ['Back on **Settings**, set **Mode** to IPS — Block on match and press **Save**.'] },
      ],
      verify: [
        '**Today event list** shows matches with Action reading blocked once in IPS mode.',
        'The page no longer shows *IPS is turned off* on its tabs.',
      ],
    },
    trouble: [
      ['Every tab says *IPS is turned off*', 'The engine is off.', 'Turn **Status** on under **Settings** and press **Save**.'],
      ['A business application stopped working after IPS was turned on', 'A rule matches its traffic.', 'Find the rule in **Today event list** and **Suppress for this host**, or switch to IDS mode while you investigate.'],
      ['The router is slow with IPS on', 'The rule policy is too large for it.', 'Choose a smaller **Rule policy**, such as Balanced or Connectivity.'],
      ['*Description is required.* on Disable rule', 'Disabling a rule needs a reason recorded.', 'Say why — it is the note the next person will read.'],
      ['There is no way to enter an Oinkcode', 'The subscription-key form exists in the code but nothing on this screen opens it.', 'Community rules are used; the key cannot be set from the controller yet.'],
    ],
  },
  'CpeSecAntiSpamPage.jsx': {
    from: 'frontend/src/components/cpe/CpeSecAntiSpamPage.jsx — TABS and their inline sections, SettingsDrawer, KeywordDrawer, DomainDrawer, ScoreDrawer, DkimDrawer, IdentityDrawer, ProtectedDomainDrawer, ProfileDrawer (antispam/action), BayesSummaryCard, the quarantine and statistics tabs',
    fields: {
      'Settings › Anti-Spam Settings': {
        'Relay Host': {
          what: 'The mail server the router hands mail on to once it has been checked — usually your organisation’s own mail server or your provider’s smart host. Up to 128 characters.',
          example: 'mail.company.com',
        },
        'TLS Security Level': { what: '**May** encrypts the hop to the relay when it offers TLS; **Encrypt** refuses to send unencrypted; **None** never encrypts.' },
        'TLS Wrapper': { what: 'For a relay that expects TLS from the first byte (port 465) rather than STARTTLS.' },
        'SASL Auth Enable': { what: 'Turn on when the relay needs a login; then fill **Username** and **Password**.' },
        Username: { example: 'relay@company.com' },
        'Default Action': { what: 'What happens to mail when the scanning engine cannot be reached. **Accept** lets it through unscanned — mail keeps flowing; **Temp-fail** asks senders to retry later.' },
        'Worker IP': { what: 'Where the scanning engine listens. Leave it on the loopback address.' },
        'DNS resolvers': { what: 'Resolvers the engine uses for its reputation look-ups; comma-separated.', example: '127.0.0.1' },
        'DMARC checks': { what: 'Checks each message against the sender domain’s published DMARC policy.' },
        'Action on DMARC quarantine policy': { what: 'What to do with a message that fails DMARC when the sender’s policy says *quarantine*. Starts on Add spam header.' },
        'Action on DMARC reject policy': { what: 'The same when the sender’s policy says *reject*. Starts on Reject (5xx).' },
      },
      'Settings › Settings': {
        'Service Status': { what: 'Turns the mail filter on and off; the badge beside it reads **Active** or **Inactive**.' },
      },
      'Rules › Add domain': {
        'Rule name': { example: 'block_example' },
        Domain: { what: 'A sending domain. **Block** rejects all mail from it; **Allow** never marks it as spam.', example: 'example.com' },
      },
      'Rules › Add keyword rule': {
        'Rule name': { example: 'forbidden_terms' },
        Score: { what: 'Added to a message’s spam score when any pattern matches. Negative makes matching mail *less* spammy. Starts at 10 — enough on its own to pass the default quarantine threshold.', example: '10' },
        'Words and patterns': { what: 'One per line, matched in the message.' },
      },
      'Score Overrides › Add score override': {
        'Symbol name': { what: 'A check the engine runs — pick a common one or type another. Its score is added whenever the check fires.', example: 'BAYES_SPAM' },
        Score: { what: 'Replaces the engine’s own score for that check. Higher counts it more heavily; negative counts in the mail’s favour.', example: '5' },
      },
      'DKIM Signing › Add DKIM signing entry': {
        Domain: { what: 'Your own domain whose outgoing mail should be signed.', example: 'company.com' },
        Selector: { what: 'The label the public key is published under — the DNS record is `‹selector›._domainkey.‹domain›`. Starts at ns2026.', example: 'ns2026' },
      },
      'Impersonation (BEC) › Add identity mapping': {
        'Display name': { what: 'A name attackers are likely to fake — your CEO or finance head.', example: 'CEO ABC' },
        'Legitimate email address': { what: 'The only address that name really sends from. Mail showing that name from any other address is flagged.', example: 'ceo@company.com' },
      },
      'Quarantine › Settings': {
        Quarantine: { what: 'Holds suspected spam for review instead of delivering or rejecting it. Needs a firmware whose mail transport can hold mail — the tab says so when it cannot.' },
        'Retention (days)': { what: 'Held mail is deleted after this. Starts at 14.' },
        'Quarantine score threshold': { what: 'Mail scoring at or above this is held. Starts at 10.' },
      },
      'Protected Domains › Add protected domain': {
        'Recipient domain': { what: 'One of your own receiving domains; the overrides below apply only to mail addressed to it. Empty fields use the global settings.', example: 'company.com' },
        'Reject score': { example: '15' },
        'Add-Header score': { example: '6' },
        'Grey List score': { example: '4' },
      },
      'Profiles › Add AntiSpam profile': {
        Name: { example: 'strict_finance' },
        'Bayes classifier': { what: 'The statistical classifier that learns from mail it has been shown.' },
        'Neural classifier': { what: 'The neural classifier; also needs **Smart Filter** switched on.' },
        'Reject score': { what: 'At or above this, mail is rejected. The built-in default profile uses 15.', example: '12' },
        'Greylist score': { what: 'Between this and the add-header score, mail is deferred once; genuine senders retry. The default profile uses 4.', example: '4' },
      },
      'Profiles › Add Action profile': {
        Name: { example: 'finance_actions' },
        'Quarantine score': { what: 'At or above this, mail is quarantined. The built-in default uses 10.', example: '10' },
      },
      'Smart Filter › Settings': {
        'Neural classification': { what: 'Turns on the neural classifier. **Reset learned model** throws away what it has learned.' },
        'Auto-train spam threshold': { what: 'Mail scoring above this is fed back to the model as spam. Starts at 3.0.' },
        'Auto-train ham threshold': { what: 'Mail scoring below this is fed back as legitimate.' },
      },
      'Statistics › Settings': {
        'Recipient email': { what: 'Where **Send Test** sends a test message through the filter.', example: 'admin@company.com' },
      },
    },
    sections: [
      {
        title: 'How mail is scored',
        body: [
          'The router checks mail on its way to your mail server (**Relay Host**). Every check that fires adds to the message’s score, and the score decides what happens: in the built-in default profile, **4** and above is greylisted (deferred once), **6** gets a spam header, **10** is quarantined when quarantine is on, and **15** is rejected.',
          'You tune that three ways: **Rules** (allow or block whole domains, or add a score for keywords), **Score Overrides** (change what one check is worth), and **Profiles** (a different set of thresholds, applied to one domain under **Protected Domains**).',
          'Saves go straight to the router; each shows a pop-up. There is no Apply step.',
        ],
      },
      {
        title: 'Before anything else',
        body: [
          'On **Settings**, press **Configure** to open **Anti-Spam Settings** and set at least the **Relay Host**, then switch **Service Status** on. Check on **Statistics** that **NexGuard MTA** and **NexGuard Engine** both read **Running**.',
        ],
      },
      {
        title: 'Signing your own mail (DKIM)',
        body: [
          'Adding an entry under **DKIM Signing** generates a key on the router. The row’s **View DNS record** shows the TXT record to publish at `‹selector›._domainkey.‹domain›`. Until it is published, receivers cannot verify the signature.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: filter mail for company.com',
      intro: 'Mail for company.com passes through the router to your mail server at mail.company.com. Names are examples.',
      steps: [
        { title: 'Point it at your mail server', body: ['**Settings** › **Configure**: **Relay Host** `mail.company.com`, **TLS Security Level** May, **Default Action** Accept. Press **Save changes**, then switch **Service Status** on.'] },
        { title: 'Trust a partner, block a nuisance', body: ['**Rules** › **Add Rule**: a domain rule for `partner.com` with **List** Allow, and one for `spammer.example` with **List** Block.'] },
        { title: 'Protect against CEO fraud', body: ['**Impersonation (BEC)** › **Add identity**: **Display name** `CEO ABC`, **Legitimate email address** `ceo@company.com`.'] },
      ],
      verify: [
        'On **Statistics**, both services read **Running**; **Send Test** to your own address arrives.',
        '**Messages scanned** rises as mail flows.',
      ],
    },
    trouble: [
      ['*Could not read the mail filter.*', 'The router did not answer — it is unreachable, or the service is still starting after a restart.', 'Press **Retry** after a minute.'],
      ['**NexGuard MTA: Stopped** on Statistics', 'The mail transport is not running — usually because the service is off or no Relay Host is set.', 'Set the **Relay Host** under **Configure** and switch **Service Status** on.'],
      ['Legitimate mail from one sender is marked as spam', 'Its score crosses a threshold.', 'Add its domain under **Rules** with **List** Allow, or lower the offending check under **Score Overrides**.'],
      ['Mail from new senders arrives minutes late', 'Greylisting: the first attempt is deferred and genuine servers retry.', 'Expected. Allow the sender’s domain if the delay matters.'],
      ['Receivers say our DKIM signature fails', 'The public key is not published, or published under the wrong selector.', 'Publish the TXT record from **View DNS record** exactly as shown.'],
      ['Quarantine shows a warning and holds nothing', 'This firmware’s mail transport cannot hold mail.', 'The policy can be set now; holding starts once a firmware with a hold queue is installed.'],
    ],
  },
  'CpeVpnOvpnRwPage.jsx': {
    from: 'frontend/src/components/cpe/CpeVpnOvpnRwPage.jsx — CREATE_DEFAULTS, SettingsDrawer, UserDrawer, removeInstance/regenerate/remove/disconnect dialogs, the status strip, the Access table and Connections history',
    fields: {
      'Create server': {
        Status: { what: 'Off keeps the server configured but refuses connections.' },
        'Server name': { what: 'A label for this server.', example: 'staff_vpn' },
        'User database': { what: 'Where the accounts that may connect come from. Starts on **Local database — Local users**, the router’s own users.' },
        'Authentication mode': { what: '**Certificate** — each account gets its own certificate, the usual choice. The other modes add a password or a one-time code on top; the list comes from the router.' },
        Mode: { what: '**Routed** is the usual choice. **Bridged** needs the clients to share an existing LAN segment.' },
        'VPN network': {
          what: 'A private network used only for VPN clients — it must not overlap your LAN or any network the clients sit on. A /24 allows about 250 clients.',
          example: '10.9.0.0/24',
        },
        'Dynamic range IP start': { what: 'With **Dynamic range IP end**, the part of the VPN network handed out automatically; addresses outside it can be reserved for particular accounts. Give both or neither.', example: '10.9.0.100' },
        'Dynamic range IP end': { example: '10.9.0.200' },
        'Public IP/hostname of this unit': {
          what: 'The address clients dial — your WAN’s public IP or a DNS name pointing at it. It is written into every profile, so set it before handing profiles out.',
          example: 'vpn.company.com',
        },
        Protocol: { what: '**UDP** is faster; **TCP** gets through networks that block UDP.' },
        Port: { what: 'Starts at 1194, the OpenVPN standard. Allow it through the WAN firewall.', example: '1194' },
        'Route all client traffic through VPN': { what: 'Sends clients’ internet traffic through the office as well, not just traffic for the pushed networks.' },
        'Push network routes': { what: 'Office networks clients should reach through the tunnel, one per line.', example: '192.168.1.0/24' },
        Digest: { what: 'Starts at SHA256 on a new server. **Auto** lets server and client agree.' },
        Cipher: { what: 'Starts at AES-256-GCM on a new server.' },
        'Enforce a minimum TLS version': { what: 'Starts at 1.2 on a new server — keep it there.' },
        'Custom DHCP options': { what: 'Extra settings pushed to clients, one per line — most often a DNS server.', example: 'DNS 192.168.1.1' },
      },
      'Add VPN account': {
        User: { what: 'An account from the router’s user database that does not have access yet. Create the user there first if it is not listed.' },
        'Reserved IP': { what: 'A fixed VPN address for this account — it must be inside the VPN network but outside the dynamic range.', example: '10.9.0.10' },
        'Certificate expiration (days)': { what: 'Starts at 3650 (about ten years). Shorter for contractors.', example: '365' },
      },
    },
    sections: [
      {
        title: 'Once the server exists',
        body: [
          'Until a server is created the screen shows *No OpenVPN Road Warrior server found* and **Create server**. Creating one builds a certificate authority on the router. After that, a strip shows **Authentication**, **VPN network**, **Public**, **Pushed**, the **Connected clients** count and **Enabled**/**Disabled**; its menu has **Edit** (the drawer is then titled **Remote access settings**, saved with **Save changes**) and **Delete**.',
          'Deleting the server asks first — *Delete this Road Warrior server?* — because the certificate authority goes with it: every profile already handed out stops working for good, and a new server issues new certificates.',
          'Changes are written straight to the router; there is no Apply step.',
        ],
      },
      {
        title: 'Accounts and their menu',
        body: [
          '**Access** lists who may dial in: **User**, **Description**, **Address**, **Now** (connected or not) and **Status**. **Add VPN account** grants access to one more user.',
          '| Menu | What it does |\n| --- | --- |\n| **Download profile** | The `.ovpn` file to import into the OpenVPN client. |\n| **Download certificate** | The account’s certificate on its own. |\n| **Download 2FA secret** | For modes that use a one-time code. |\n| **Reissue certificate** | Asks first; the old profile stops working at once and the user needs the new one. |\n| **Disconnect** | Drops the live session; they can reconnect. |\n| **Enable or disable** | Stops the account without removing it. |\n| **Delete** | Asks *Remove access for “‹name›”?* — revokes the certificate and drops any session. |',
          '**Connections history** logs each session: **Account**, **Source address**, **VPN address**, **Connected**, **Disconnected**, **Transferred**.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: let staff laptops dial in',
      intro: 'Staff connect from anywhere and reach the office LAN 192.168.1.0/24. Addresses and names are examples.',
      steps: [
        { title: 'Create the server', body: ['Press **Create server**. **Server name** `staff_vpn`, **Authentication mode** Certificate, **Mode** Routed, **VPN network** `10.9.0.0/24`, **Public IP/hostname** `vpn.company.com`. Under **Advanced Settings**, **Push network routes** `192.168.1.0/24`. Press **Create**.'] },
        { title: 'Give a user access', body: ['Press **Add VPN account**, pick the **User**, leave **Certificate expiration** at 3650, press **Add account**.'] },
        { title: 'Hand over the profile', body: ['From that account’s menu choose **Download profile** and send the file to the user to import into their OpenVPN client.'] },
      ],
      verify: [
        'When the user connects, **Now** shows them connected and **Connected clients** rises.',
        'The session appears under **Connections history**.',
      ],
    },
    trouble: [
      ['Clients cannot connect at all', 'The port is blocked, or the public address in the profile is wrong.', 'Allow UDP 1194 (or your port) in on the WAN, and check **Public IP/hostname**; profiles made before a change must be downloaded again.'],
      ['Connected, but the office LAN is unreachable', 'The LAN is not pushed to the client, or the VPN network overlaps it.', 'Add the LAN under **Push network routes**; pick a **VPN network** that overlaps nothing.'],
      ['A user is not offered under **User**', 'They do not exist in the user database, or already have access.', 'Create the user first, or find them already in the **Access** list.'],
      ['*Give both ends of the pool, or neither*', 'Only one of the dynamic range fields is filled.', 'Fill both, or clear both to use the whole VPN network.'],
      ['Every profile stopped working', 'The server was deleted and re-created — the certificate authority changed.', 'Download and hand out new profiles.'],
    ],
  },
  'CpeVpnOvpnTunnelPage.jsx': {
    from: 'frontend/src/components/cpe/CpeVpnOvpnTunnelPage.jsx — ServerDrawer (defaults from get-defaults, rules table), ClientDrawer, ImportDrawer, remove(), the tab-switched card and table',
    fields: {
      'Server tunnel › Add server tunnel': {
        'Tunnel name': { what: 'Letters, digits and underscores only; it becomes the tunnel’s name on the router.', example: 'branch_link' },
        'Public endpoints': { what: 'The addresses the other site dials to reach this router — its public WAN IP or a DNS name. Pre-filled with the router’s own WAN address.', example: '203.0.113.10' },
        Port: { what: 'Pre-filled with a free port the router picks. Allow it through the WAN firewall.', example: '1204' },
        'Local networks': { what: 'Networks behind this router that the other site should reach. Pre-filled from the router’s own networks.', example: '192.168.8.0/24' },
        'Remote networks': { what: 'Networks behind the other site that this router should send into the tunnel. At least one is required.', example: '192.168.2.0/24' },
        Topology: { what: '**Subnet** — a small VPN network, suits one or more peers. **P2P** — one address each end and a shared key; the other site must use P2P too.' },
        'VPN network': { what: 'Subnet only: a private network used just for the tunnel, overlapping nothing else. Pre-filled.', example: '10.70.1.0/24' },
        'Local P2P IP': { what: 'P2P only: this end’s tunnel address.', example: '10.66.0.1' },
        'Remote P2P IP': { what: 'P2P only: the other end’s tunnel address.', example: '10.66.0.2' },
        'Pre-shared Key': { what: 'P2P only: generated for you. Copy it to the other site exactly — both ends need the same key.' },
        Protocol: { what: 'Must match the other end. **UDP** unless a network in between blocks it.' },
      },
      'Client tunnel › Add client tunnel': {
        'Tunnel name': { example: 'to_headoffice' },
        'Remote hosts': { what: 'The other site’s public address or DNS name — its server tunnel’s **Public endpoints**. Further entries are tried in turn if the first fails.', example: 'vpn.example.com' },
        'Remote port': { what: 'The other site’s server tunnel **Port**.', example: '1204' },
        Topology: { what: 'Must match the server tunnel on the other side.' },
        Authentication: { what: '**Certificate** alone, or **Username, password and certificate** when the server also asks for a login.' },
        Certificate: { what: 'The client certificate bundle issued by the other site’s server, pasted as text.' },
        'Pre-shared Key': { what: 'P2P only: the same key as the server end.' },
        'Extra remote networks': { what: 'Networks behind the server to route into the tunnel, beyond what the server pushes.', example: '192.168.2.0/24' },
      },
      'Client tunnel › Import configuration': {
        'NexappOS client configuration (*.json)': { what: 'A client configuration file exported by another NexappOS router’s server tunnel. Not a plain `.ovpn` file — anything that is not valid JSON is refused.' },
      },
    },
    sections: [
      {
        title: 'Server or client',
        body: [
          'A site-to-site link has two ends. One router **listens** — a **Server tunnel** here — and the other **dials** it — a **Client tunnel** on the other router. Set up the server first, then give its address, port, networks and key or certificate to the client side.',
          'Each tab has its own list and **Add** button; the list shows **Name**, **Role** (Listens / Dials out), **Mode**, **Remote networks**, **Connection** and **Status**. Each row’s menu has **Edit**, **Enable or disable** and **Delete**. Deleting a server tunnel warns that the far end keeps dialling and will not get in; deleting a client tunnel warns that the server keeps its half of the configuration.',
          'Changes are written straight to the router; there is no Apply step.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: link a branch to head office',
      intro: 'Head office (LAN 192.168.8.0/24, public 203.0.113.10) listens; the branch (LAN 192.168.2.0/24) dials in. Values are examples; use P2P on both ends.',
      steps: [
        { title: 'On the head-office router: add a server tunnel', body: ['**Server tunnel** › **Add server tunnel**: **Tunnel name** `branch_link`, keep the pre-filled **Public endpoints** and **Port**, **Local networks** `192.168.8.0/24`, **Remote networks** `192.168.2.0/24`, **Topology** P2P. Copy the **Pre-shared Key**. Press **Add tunnel**.'] },
        { title: 'On the branch router: add a client tunnel', body: ['**Client tunnel** › **Add client tunnel**: **Tunnel name** `to_headoffice`, **Remote hosts** `203.0.113.10`, **Remote port** the server’s port, **Topology** P2P, paste the same **Pre-shared Key**, **Local P2P IP** `10.66.0.2`, **Remote P2P IP** `10.66.0.1`, **Extra remote networks** `192.168.8.0/24`. Press **Add tunnel**.'] },
      ],
      verify: [
        'Both lists show the tunnel with **Connection** up.',
        'From the device’s **Diagnostics** tab, ping a host on the other site’s LAN.',
      ],
    },
    trouble: [
      ['The tunnel never connects', 'The client cannot reach the server’s address or port, or the two ends disagree on topology, protocol, key or certificate.', 'Allow the server port in on the head-office WAN; make **Topology**, **Protocol** and the key match exactly.'],
      ['Connected, but the other LAN is unreachable', 'A network is missing from **Local networks** on one side or **Remote networks** on the other.', 'List each LAN on both ends, and make sure the two LANs do not overlap.'],
      ['*A shared key is required — both ends need the same one*', 'A new P2P server tunnel has no key.', 'Keep the generated key, or paste one.'],
      ['*That file is not valid JSON* when importing', 'The file is not a NexappOS client configuration.', 'Use the JSON exported by the other NexappOS router, or set the client up by hand with **Add client tunnel**.'],
      ['There is nowhere to export a client configuration', 'This screen has no export action, although the server tab mentions one.', 'Configure the client end by hand with the server’s address, port, networks and key.'],
    ],
  },
  'CpeVpnTunnelsPage.jsx#CpeVpnWgTunnelPage': {
    from: 'frontend/src/components/cpe/CpeVpnTunnelsPage.jsx — CpeVpnWgTunnelPage, WgServerDrawer (router defaults, validate table), WgTunnelDrawer, WgImportDrawer, removeServer/remove dialogs, the two tab lists',
    fields: {
      'Server tunnel › Add server': {
        Name: { what: 'Letters, digits and underscores only.', example: 'wg_hub' },
        'VPN network': { what: 'A private network used only inside the tunnel; it must overlap nothing else. Pre-filled by the router.', example: '10.249.179.0/24' },
        'UDP port': { what: 'Pre-filled with 51820, the WireGuard standard. Allow it through the WAN firewall.', example: '51820' },
        'Public Endpoint': { what: 'The address other sites dial — this router’s public WAN IP or a DNS name. Pre-filled with the WAN address.', example: '203.0.113.10' },
        MTU: { what: 'Leave blank for the default. Lower it (1380, say) if large transfers stall over the tunnel. 576–9000.', example: '1420' },
        'DNS servers': { what: 'Handed to peers that use this server for DNS; one per row.', example: '1.1.1.1' },
      },
      'Peer tunnel › Add WireGuard tunnel': {
        Name: { example: 'to_hub' },
        'Reserved IP': { what: 'This router’s own address inside the tunnel, as agreed with the other site — a plain address, no `/24`.', example: '10.10.0.2' },
        'Server public key': { what: 'The other site’s WireGuard public key, a 44-character string ending in `=`.' },
        'Peer private key': { what: 'This end’s private key, issued by the other site together with the configuration. It never leaves the router once saved.' },
        'Pre-shared key': { what: 'An optional extra key; if the other site uses one, paste the same one here.' },
        'Route all traffic': { what: 'Sends all of this router’s traffic through the tunnel, instead of only **Network routes**.' },
        'Network routes': { what: 'Networks at the other site to reach through the tunnel; one per row. At least one is needed unless **Route all traffic** is on.', example: '192.168.2.0/24' },
        Endpoint: { what: 'The other site’s public address or DNS name — its server’s public endpoint.', example: 'vpn.example.com' },
        'UDP port': { what: 'The other site’s server port.', example: '51820' },
        'Out Interface': { what: 'Which WAN the tunnel leaves by. **Automatic** lets the router choose.' },
      },
      'Peer tunnel › Import peer tunnel': {
        'Wireguard configuration file': { what: 'A standard WireGuard `.conf` file from the other site; it fills in every field above in one go.' },
      },
    },
    sections: [
      {
        title: 'Server or peer',
        body: [
          'A **Server tunnel** listens for other sites; a **Peer tunnel** dials one. The same router can do both. Each tab has its own list, **Add** button and row menu (**Edit**, **Delete**).',
          'Deleting a server asks *Delete server “‹name›”?* — its keys go with it and every peer set up against it must be reconfigured. Deleting a peer tunnel only stops this end; the other side keeps its configuration.',
          'This screen shows no public key for a server and has no action to add peers to it or export a configuration, so the other site’s settings have to come from that site.',
          'Changes are written straight to the router; there is no Apply step.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: dial a head-office WireGuard server',
      intro: 'Head office runs a WireGuard server at vpn.example.com:51820 and has given you a configuration for this branch. Values are examples.',
      steps: [
        { title: 'Import or type the configuration', body: ['On **Peer tunnel**, press **Import peer tunnel** and drop in the `.conf` file — or press **Add peer tunnel** and fill **Name** `to_hub`, **Reserved IP** `10.10.0.2`, **Server public key**, **Peer private key**, **Network routes** `192.168.8.0/24`, **Endpoint** `vpn.example.com`, **UDP port** `51820`. Press **Add tunnel**.'] },
      ],
      verify: [
        'The row\u2019s **Peer** column reads **Connected** instead of **Idle** once the tunnel is up.',
        'From the device’s **Diagnostics** tab, ping a host on the head-office LAN.',
      ],
    },
    trouble: [
      ['The tunnel never comes up', 'A key, the endpoint or the port does not match the other side, or UDP is blocked.', 'Check **Server public key**, **Endpoint** and **UDP port** against the other site; allow the UDP port in on its WAN.'],
      ['*This end’s address inside the tunnel* under Reserved IP', 'It is empty or has a prefix.', 'Type a plain address — `10.10.0.2`, not `10.10.0.2/24`.'],
      ['Up, but the other LAN is unreachable', 'Its network is missing from **Network routes**.', 'Add it, and make sure the two LANs do not overlap.'],
      ['Large transfers stall while small ones work', 'Packets are too big for the path.', 'Set a lower **MTU** on the server, for example 1380.'],
      ['You need the server’s public key for another site', 'This screen does not show it.', 'Take it from the router’s own WireGuard configuration until the controller shows it.'],
    ],
  },
  'CpeVpnGoaheadPage.jsx#CpeVpnGrePage': {
    from: 'frontend/src/components/cpe/CpeVpnGoaheadPage.jsx — CpeVpnGrePage, GreDrawer (defaults, validate table, IPsec transport section), IPSEC_PROPOSALS, UnsupportedNotice, remove()',
    fields: {
      'Add GRE tunnel': {
        Service: { what: 'Off keeps the tunnel configured but down.' },
        'Tunnel Name': { what: 'The tunnel’s name on the router. Letters, digits and underscores; it must differ from **Interface Name**.', example: 'gre1' },
        'Interface Name': { what: 'The network interface the tunnel appears as — what firewall zones and routes refer to.', example: 'gre_wan1' },
        'Local Virtual IP': { what: 'This router’s address inside the tunnel.', example: '10.0.0.1' },
        'Peer Virtual IP': { what: 'The other end’s address inside the tunnel — in the same small network as yours.', example: '10.0.0.2' },
        'Local External IP': { what: 'This router’s own public WAN address, which the tunnel is sent from.', example: '203.0.113.10' },
        'Peer External IP': { what: 'The other router’s public address.', example: '198.51.100.20' },
        Key: { what: 'An optional number identifying the tunnel. Set the same on both ends, or leave both blank.', example: '100' },
        MTU: { example: '1476' },
        Netmask: { what: 'The mask of the tunnel network. 255.255.255.252 (/30) holds exactly the two virtual addresses.', example: '255.255.255.252' },
        'Keep-alive Interval (seconds)': { what: 'Starts at 60.', example: '60' },
        'Keep-alive Failure Count': { what: 'Starts at 3, so a dead peer is noticed after about three minutes.', example: '3' },
        'IPsec Transport': { what: 'GRE itself does not encrypt. Turn this on to carry the tunnel inside its own IPsec connection — needed whenever the path crosses the internet. This connection is separate from the **IPsec** page and does not appear there.' },
        'IPsec Gateway (Remote IP)': { what: 'The other router’s public address — normally the same as **Peer External IP**.', example: '198.51.100.20' },
        'Pre-Shared Key': { what: 'A long random secret; the other end needs exactly the same one.' },
        'IKE Proposal': { what: 'Encryption for the key exchange. Must match the other end. Starts on aes256-sha256-modp2048.' },
        'ESP Proposal': { what: 'Encryption for the traffic itself. Must match the other end.' },
        'DPD Delay (seconds)': { what: 'How often the peer is checked. Starts at 30.', example: '30' },
      },
    },
    sections: [
      {
        title: 'Before you start',
        body: [
          'A GRE tunnel needs the same settings mirrored on both routers: each side’s **Local** values are the other side’s **Peer** values. Agree the two virtual addresses, the key (if any) and, with IPsec, the pre-shared key and proposals before you start.',
          'On firmware that cannot reach GRE, the screen says *This router’s firmware cannot do GRE* and **Add tunnel** is greyed out; updating the router firmware enables the page.',
          'Changes are written straight to the router; there is no Apply step. Deleting a tunnel asks first — anything routed through it becomes unreachable at once, while the other end keeps its half.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: an encrypted GRE link between two sites',
      intro: 'Site A (public 203.0.113.10) and site B (public 198.51.100.20) are joined by GRE inside IPsec. Values are examples; site B is set up the same way with Local and Peer swapped.',
      steps: [
        { title: 'On site A', body: ['Press **Add tunnel**. **Tunnel Name** `gre1`, **Interface Name** `gre_wan1`, **Local Virtual IP** `10.0.0.1`, **Peer Virtual IP** `10.0.0.2`, **Local External IP** `203.0.113.10`, **Peer External IP** `198.51.100.20`, **Netmask** `255.255.255.252`. Turn on **IPsec Transport**: **IPsec Gateway** `198.51.100.20` and a **Pre-Shared Key**. Press **Create tunnel**.'] },
        { title: 'On site B', body: ['The same, with the Local/Peer addresses swapped and the same key.'] },
        { title: 'Route traffic over it', body: ['Add a static route on each side for the other site’s LAN via the peer’s virtual IP, under **Network › Static Routes**.'] },
      ],
      verify: [
        'The tunnel shows **Status** up in the list on both sides.',
        'From **Diagnostics**, ping the peer’s virtual IP (`10.0.0.2` from site A).',
      ],
    },
    trouble: [
      ['*Must be different from the interface name*', '**Tunnel Name** and **Interface Name** are the same.', 'Give them different names, for example `gre1` and `gre_wan1`.'],
      ['The tunnel stays down', 'The two ends do not mirror each other, the key differs, or GRE (IP protocol 47) is blocked between the sites.', 'Check Local/Peer values are swapped exactly; match the **Key**; with **IPsec Transport** on, match the pre-shared key and proposals.'],
      ['Up, but nothing reaches the other LAN', 'No route sends that traffic into the tunnel.', 'Add a static route for the other LAN via the peer’s virtual IP.'],
      ['Large transfers stall', 'Packets are too large once the GRE and IPsec headers are added.', 'Lower the **MTU**, for example to 1400 with IPsec on.'],
      ['*This router’s firmware cannot do GRE*', 'The firmware predates GRE support in its API bridge.', 'Update the router firmware.'],
    ],
  },
  'CpeVpnOobmPage.jsx': {
    from: 'frontend/src/components/cpe/CpeVpnOobmPage.jsx — JoinDrawer (NWID_RE, setError), the Service switch, leave(), the Networks table; api/client.js zerotierNetworks/zerotierAction',
    fields: {
      'Add network': {
        Service: { what: 'The same switch as on the screen: it turns the OOBM overlay on or off the moment you flip it, without waiting for **Save**.' },
        'OOBM Network ID': {
          what: 'The 16-character ZeroTier network ID (digits 0–9 and letters a–f) of the management network to join. Normally the Nexapp SDWAN Controller supplies it, so you only type one to join a network by hand.',
          example: '0123456789abcdef',
        },
      },
    },
    sections: [
      {
        title: 'What OOBM is, and how this screen reaches the router',
        body: [
          'OOBM (out-of-band management) is a ZeroTier overlay that gives the controller a management path to the device independent of its normal WAN routing. The device joins one or more OOBM networks, each listed under **Networks** with its **Network ID**, **Type**, **MAC**, **Address** inside the overlay and **Status** — **Active** when ZeroTier reports OK, otherwise the raw ZeroTier state, such as REQUESTING_CONFIGURATION.',
          'Unlike the other CPE screens, this one does not go through the router’s RPCD API — current firmware does not forward ZeroTier calls through it. The controller reads and changes OOBM over SSH instead, which is why the screen lists no RPCD methods. Changes still apply immediately.',
          'The notice at the top says it plainly: this device is also managed by the Nexapp SDWAN Controller, and its next configuration push can overwrite what you change here — including rejoining a network you left.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: join an OOBM network by hand',
      intro: 'You have been given the network ID of a management network. The ID is an example.',
      steps: [
        { title: 'Turn the overlay on', body: ['Switch **Service** on in the **Service** card. A pop-up says *OOBM enabled*.'] },
        { title: 'Join the network', body: ['Press **Add network**, type **OOBM Network ID** `0123456789abcdef`, press **Save**. A pop-up says *Joined the network* and the network appears under **Networks**.'] },
      ],
      verify: [
        'The network’s **Status** turns to **Active** once the overlay authorises the device, and **Address** shows the address it was given. The list refreshes every 30 seconds.',
      ],
    },
    trouble: [
      ['*A network ID is 16 hexadecimal characters.*', 'The ID is too short or long, or has letters beyond a–f.', 'Copy the 16-character ID exactly.'],
      ['**Status** stays on REQUESTING_CONFIGURATION or ACCESS_DENIED', 'The network has not authorised this device yet.', 'Authorise the device in the network’s controller; it turns **Active** on its own.'],
      ['A network you left came back', 'The Nexapp SDWAN Controller manages the membership and re-applied it on its next push.', 'Change it in the SDWAN Controller instead.'],
      ['*Could not read the OOBM overlay.*', 'The controller could not reach the device over SSH, or ZeroTier reported an error.', 'Press **Retry**; check the device is online.'],
    ],
  },
  'CpeVpnGoaheadPage.jsx#CpeVpnVxlanPage': {
    from: 'frontend/src/components/cpe/CpeVpnGoaheadPage.jsx — CpeVpnVxlanPage, VxlanDrawer (defaults, validate table incl. ipv4()/range(1,32) on every IP version, IPsec transport), IPSEC_PROPOSALS, remove()',
    fields: {
      'Add VXLAN tunnel': {
        Service: { what: 'Off keeps the tunnel configured but down.' },
        'Tunnel Name': { what: 'Bridge it with a LAN interface to stretch that LAN to the other site.', example: 'vxlan42' },
        'Base Interface': { what: 'Normally the WAN that reaches the other site.', example: 'wan' },
        'IP Version': { what: '**IPv4 Unicast** is the usual choice for two sites. The IPv6 choices are offered, but the address checks accept only IPv4, so an IPv6 tunnel cannot be saved yet.' },
        'Local Virtual IP': { example: '10.42.0.1' },
        'Peer External IP': { what: 'Its public address when the path crosses the internet.', example: '198.51.100.20' },
        'Local Underlay IP (Optional)': { what: 'Set it only when the router has several addresses and the peer expects one of them.', example: '203.0.113.10' },
        'VID (VXLAN ID)': { what: 'Shown as **VNI** in the list.', example: '100' },
        Port: { what: 'Both ends must match, and this UDP port must be open between them.', example: '4789' },
        'Prefix Length': { what: 'The size of the Local Virtual IP’s network; both ends must be inside it.', example: '24' },
        'IPsec Transport': { what: 'VXLAN does not encrypt. Turn this on to carry the tunnel inside its own IPsec connection whenever the path crosses the internet. It is separate from the **IPsec** page and does not appear there.' },
        'IPsec Gateway (Remote IP)': { what: 'Normally the same as **Peer External IP**.', example: '198.51.100.20' },
        'Pre-Shared Key': { what: 'Use a long random secret.' },
        'IKE Proposal': { what: 'Must match the other end.' },
        'ESP Proposal': { what: 'Must match the other end.' },
        'DPD Delay (seconds)': { example: '30' },
      },
    },
    sections: [
      {
        title: 'Before you start',
        body: [
          'VXLAN carries a layer-2 segment — a whole LAN, broadcasts included — between two sites over an IP path. Both routers need matching **VID**, **Port** and, with IPsec, the same key and proposals; each side’s **Peer External IP** is the other side’s address.',
          'The list shows **Name**, **VNI**, **Peer**, **Overlay address** and **On** (the base interface). Each row’s menu has **Edit** and **Delete**; deleting asks first, because anything bridged across the segment stops reaching the far side.',
          'On firmware that cannot reach VXLAN, the screen says so and **Add tunnel** is greyed out; updating the router firmware enables it. Changes are written straight to the router; there is no Apply step.',
        ],
      },
    ],
    walkthrough: {
      title: 'Worked example: stretch a LAN segment between two sites',
      intro: 'Site A (public 203.0.113.10) and site B (public 198.51.100.20) share one layer-2 segment over VNI 100, encrypted. Values are examples; site B mirrors site A.',
      steps: [
        { title: 'On site A', body: ['Press **Add tunnel**. **Tunnel Name** `vxlan42`, **Base Interface** the WAN, **IP Version** IPv4 Unicast, **Local Virtual IP** `10.42.0.1`, **Peer External IP** `198.51.100.20`, **VID** `100`, **Port** `4789`, **Prefix Length** `24`. Turn on **IPsec Transport** with **IPsec Gateway** `198.51.100.20` and a **Pre-Shared Key**. Press **Create tunnel**.'] },
        { title: 'On site B', body: ['The same, with **Local Virtual IP** `10.42.0.2`, **Peer External IP** `203.0.113.10`, the same VID, port and key.'] },
      ],
      verify: [
        'Both lists show the tunnel; from the device\u2019s **Diagnostics** tab, **Ping** the other side’s virtual IP (`10.42.0.2` from site A).',
      ],
    },
    trouble: [
      ['The two sites cannot reach each other over the segment', 'VID, port or IPsec settings differ, or UDP 4789 is blocked between them.', 'Match **VID** and **Port** exactly; open the port; with IPsec, match the key and proposals.'],
      ['*Must be an IPv4 address* with IPv6 selected', 'The form checks addresses as IPv4 whatever **IP Version** says.', 'Use IPv4 Unicast or IPv4 Multicast; IPv6 cannot be saved from this screen yet.'],
      ['*Must be between 1 and 16777215* under VID', 'The VXLAN ID is out of range.', 'Use a number from 1 to 16777215, the same on both ends.'],
      ['Large frames are lost', 'VXLAN adds about 50 bytes of header, more with IPsec.', 'Lower the MTU of the interfaces bridged into the segment, or of the path.'],
    ],
  },
};
