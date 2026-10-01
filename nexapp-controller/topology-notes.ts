/**
 * Hand-written notes for the four Network Topology pages.
 *
 * Same split as the Administration and IPAM notes: the FIELD TABLES are read
 * out of each drawer's JSX on every build, so a field renamed in the console
 * changes here without anyone editing this file. What source cannot say lives
 * here — a working example value, the rule the server adds on top of the
 * control's, the order to do things in, and which rows the API refuses.
 *
 * Pinned by `npm run check:descriptions` to the files each entry names in
 * `from`, so a change to any of them flags the entry for a re-read rather than
 * letting it quietly go stale.
 *
 * One thing to know before reading: Network Topology is what the network
 * REPORTS about itself, collected by a parser. It is not where you design an
 * overlay — that is Overlay Networks › SD-WAN Fabric. A topology here can be
 * wrong about the network without anything being misconfigured, because it is
 * a measurement.
 */
import type { AdminNotes } from './admin-notes.ts';

// -------------------------------------------------------------- Topologies

const TOPOLOGIES: AdminNotes = {
  from: [
    'pages/NetTopologyList.jsx',
    'features/nettopo/TopologyDrawer.jsx',
    'features/nettopo/labels.js',
  ],
  title: 'Working with topologies',
  intro: [
    'A topology is one collected view of the network: a parser reads a feed, and the nodes and links it finds become the rows on the next two pages and the picture on the graph. **Strategy** decides how the data arrives — **FETCH** polls a URL on a schedule, **RECEIVE** waits for the nodes to post to a URL of their own, authenticating with a key.',
    'This endpoint is **not paginated**. The whole collection arrives in one response, so the search box, the four filters and the pager all work on data already in your browser — which is also why **Nodes** and **Links** can show counts without a request per row. Nothing is hidden behind a page boundary.',
  ],
  before: [
    'Decide **FETCH** or **RECEIVE** first. It is the one choice that changes what else you have to supply: FETCH needs a URL the controller can reach, RECEIVE needs a key and nodes that can reach the controller.',
    'Leave **Organization** blank to share the topology with every organization. That is a decision to make now — it is what the nodes underneath inherit.',
  ],
  tasks: [
    {
      title: 'Add a topology that the controller polls (FETCH)',
      steps: [
        'Open **Network Topology › Topologies** and press **Add topology**.',
        'Pick the **Label** for the overlay this describes, and the **Format** — the parser that will read what comes back. **Format** is the one required field in this section.',
        'Leave **Strategy** on **FETCH**. The section below is headed **Fetching** and asks for a URL.',
        'Put the collector’s address in **URL** — something like `http://10.0.0.1:9090/topology`. The controller fetches from here on a schedule.',
        'Set **Expiration time (seconds)**. Leave it at `0` unless the feed is known to flap; see the field table for what the number does.',
        'Press **Create topology**.',
      ],
      after: [
        'Nothing is collected at the moment you save. Open the topology again and look at the **Collected by the parser** section: **Protocol**, **Version** and **Metric** stay blank until the first successful fetch, which makes them the quickest way to tell a working feed from a URL nobody is serving.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Add a topology that the nodes post to (RECEIVE)',
      steps: [
        'Start the same way, then set **Strategy** to **RECEIVE**. The section below changes to **Receiving** and asks for a key instead of a URL.',
        'Press **Generate** beside **Key** rather than inventing one. The key is the only thing authenticating the update, and the generated one is 32 random characters from an alphabet with no spaces, dots or slashes — the three things the field rejects.',
        'Press **Create topology**.',
        'Open the topology again. **Receive URL** is now filled in, with a **Copy** button: that is the address the nodes post to, and it does not exist until the record does.',
      ],
      after: [
        'The order matters here — you cannot configure the nodes first, because the URL they need is generated from the saved record.',
      ],
    },
    {
      title: 'Publish or unpublish',
      steps: [
        'One topology: its **⋮** menu, then **Publish** or **Unpublish**. It applies immediately — there is no confirmation and no save step.',
        'Several: tick them and use **Publish** or **Unpublish** on the bar above the table.',
      ],
      after: [
        'Unpublishing is the safe alternative to deleting. An unpublished topology **stops being updated and disappears from the visualiser**, but its nodes and links are kept, and publishing it again brings everything back.',
      ],
    },
    {
      title: 'Delete a topology',
      steps: [
        'Its **⋮** menu, then **Delete**. The dialog names it and says *Its nodes and links go with it. This cannot be undone.*',
        'Several at once: tick them and use **Delete** on the bar above the table — *Their nodes and links go with them.*',
      ],
      after: [
        'Read the **Nodes** and **Links** columns before confirming. They are the count of what goes with it, and the dialog does not repeat the numbers.',
        'If you only want it out of the way, **Unpublish** instead — it is reversible and this is not.',
      ],
    },
  ],
  forms: [
    {
      title: 'the topology drawer',
      source: 'features/nettopo/TopologyDrawer.jsx',
      opens: '**Add topology**, or a row’s label',
      fields: {
        // Where the control already explains itself, the note adds only what
        // source cannot say. Repeating a hint printed the same sentence twice
        // in one cell — the mistake the IPAM notes made first.
        Label: {
          example: 'Management plane',
          what: 'This deployment **renames `zerotier` to “Management plane”** wherever it appears, so the stored value and the word on screen differ by design. Labels are also **not unique**, which is why every row prints the first eight characters of its UUID underneath.',
          checks: ['A value the model does not know is offered as “… (not a standard choice)” so the select cannot silently rewrite it.'],
        },
        Organization: {
          starts: 'Shared — all organizations',
          what: 'It is also what the nodes underneath inherit when their own organization is left blank.',
        },
        Format: {
          example: 'NetJSON NetworkGraph',
          what: 'It has to match what the feed actually serves. Nothing checks that the two agree until a fetch returns something the parser cannot read.',
        },
        Strategy: {
          starts: 'FETCH',
          what: 'It also decides which section follows, so you are asked for exactly one of **URL** and **Key** rather than shown both and failed on save.',
        },
        URL: {
          when: 'Only with the FETCH strategy',
          example: 'http://10.0.0.1:9090/topology',
          what: 'Only `http`, `https`, `ftp` and `ftps` are accepted.',
          checks: ['A URL is required for the FETCH strategy.'],
        },
        Key: {
          when: 'Only with the RECEIVE strategy',
          what: '**Generate** makes a 32-character random one from an alphabet that cannot produce the three characters the field rejects.',
          checks: ['A key is required for the RECEIVE strategy.'],
        },
        'Expiration time (seconds)': {
          starts: '0',
          example: '0',
          what: 'Right at `0` for a stable feed; raise it only for one that drops links it has not re-measured, where every gap would otherwise read as an outage.',
        },
        'Receive URL': {
          required: '—',
          when: 'Only when editing a RECEIVE topology',
          what: 'Read-only, with a **Copy** button. It is generated from the saved record, so it does not exist while you are still creating one — which is why the nodes cannot be configured first.',
        },
        Published: {
          starts: 'On',
          what: 'The nodes and links are kept either way, so this is the reversible alternative to deleting.',
        },
        UUID: { required: '—', when: 'Only when editing', what: 'Read-only. Also what the row prints under its label, shortened to eight characters, and what **Search** matches on.' },
        Protocol: { required: '—', when: 'Only when editing', what: 'Read-only, written by the parser. Blank means nothing has ever been collected.' },
        Version: { required: '—', when: 'Only when editing', what: 'Read-only, written by the parser.' },
        Metric: { required: '—', when: 'Only when editing', what: 'Read-only, written by the parser — the metric the routing protocol reported.' },
      },
      after: [
        '**Protocol**, **Version** and **Metric** appear only when editing, grouped under **Collected by the parser**. All three blank on a FETCH topology means the feed has never been read successfully, which is a faster check than waiting to see whether nodes appear.',
      ],
    },
  ],
  sections: [
    {
      title: 'What the list shows',
      body: [
        'One row per topology. **Label** is the renamed display text, with the short UUID under it because labels repeat. **Organization** reads *Shared* where none is set. **Format** names the parser, **Strategy** is a grey badge, and **Published** is a green badge or a grey *Unpublished*. **Nodes** and **Links** are counts taken from the row itself. **Modified** closes the row.',
        'Four filters sit above it, and they are not all the same kind: **All organizations**, **All formats** and **All strategies** are sent to the server and reload the list, while **Published and unpublished** and the search box sift what is already loaded. **Search label, UUID, protocol or URL…** matches those four fields, so pasting a UUID finds its row. **Clear filters** appears once any of them is set, and the subtitle reads *N of M* so a filter that hides most of the collection says so.',
        'The row’s **⋮** menu holds **View topology graph**, **Edit**, **Publish**/**Unpublish** and **Delete**. Selecting rows adds **Publish**, **Unpublish** and **Delete** above the table; the selection is dropped whenever you change page or any filter, so a bulk action can only ever act on rows you can see.',
      ],
    },
    {
      title: 'Rows this page cannot save',
      body: [
        'Some topologies are written by another part of the controller rather than by anyone on this page — the SD-WAN tunnel feature creates them with a label of `nsbond` and a URL of the form `nsbond://…`. Neither is a value the model will accept back.',
        'That matters more than it sounds. The API re-validates the **stored** record on every save, so such a row cannot be PATCHed **at all** — not even to change something unrelated like **Published**. The Django admin refuses the same records for the same reason.',
        'Opening one shows a banner naming the offending values before you start filling anything in. There is no fix from this page: the row can be deleted, or left alone, but it cannot be edited until both values are changed to ones the model accepts.',
      ],
    },
    {
      title: 'What you are allowed to do',
      body: [
        'Opening the page needs any permission on `topology.topology`. The buttons are gated separately and are simply absent without the permission: **Add topology** needs `topology.add_topology`, **Edit** and **Publish**/**Unpublish** need `topology.change_topology`, and **Delete** and the bulk bar need `topology.delete_topology`.',
      ],
    },
  ],
  verify: [
    'The topology appears in the list with the strategy you chose and a green **Published** badge.',
    'For FETCH: open it again after a collection cycle — **Protocol** and **Version** under **Collected by the parser** are filled in, and **Nodes** and **Links** in the list have stopped reading 0.',
    'For RECEIVE: **Receive URL** is populated, and the counts move once the first node posts.',
  ],
  trouble: [
    [
      '*This topology was created by another part of the controller and holds values the API refuses to re-validate*',
      'The stored label or URL is one the model rejects — typically an `nsbond` row written by the SD-WAN tunnel feature.',
      'Nothing on this page can save it, including a change to an unrelated field. Leave it alone, or delete it.',
    ],
    [
      '*A URL is required for the FETCH strategy.* / *A key is required for the RECEIVE strategy.*',
      '**Create topology** stays greyed out until the field the chosen strategy needs is filled in.',
      'Fill it, or switch **Strategy** to the one you actually meant.',
    ],
    [
      'Nodes and Links stay at 0',
      'Nothing has been collected yet. For FETCH the URL may be unreachable or serving something the chosen **Format** cannot parse; for RECEIVE no node has posted.',
      'Open the topology and look at **Collected by the parser** — all three blank means no successful collection, which separates a bad URL from a bad parser choice.',
    ],
    [
      '*N of M could not be deleted.* with a first error quoted',
      'A bulk action runs row by row and reports the total plus the first reason. The usual reason on this endpoint is a stored label or URL the model refuses.',
      'The named rows are the `nsbond` ones. Reload and see what is left rather than repeating the whole selection.',
    ],
    [
      'A topology vanished from the graph',
      'It was unpublished, not deleted — an unpublished topology stops being updated and is hidden from the visualiser.',
      'Set **Published and unpublished** on the filter, find it, and publish it again from the row menu.',
    ],
  ],
  shotDir: 'topologies',
  shots: [
    { file: 'list.png', what: 'Three topologies, all **RECEIVE** and all published. The two `nsbond` rows are the ones written by the SD-WAN tunnel feature — note the short UUID under each label, which is there because the labels repeat.', alt: 'The Topologies list' },
    { file: 'form-new.png', what: 'The drawer with **Strategy** on **FETCH**, so the section below is headed **Fetching** and asks for a URL. Switching to **RECEIVE** replaces it with a key.', alt: 'The Add topology drawer' },
  ],
};

// ------------------------------------------------------------------- Nodes

const NODES: AdminNotes = {
  from: ['pages/NetNodeList.jsx', 'features/nettopo/NodeDrawer.jsx', 'features/nettopo/nettopoModel.js'],
  title: 'Working with nodes',
  intro: [
    'One row per device the parser found, in whichever topology found it. The same physical router appears once per topology that reports it, so a count here is not a count of your estate.',
    'Nearly everything on a node is **collected**, not typed. The drawer separates the two cleanly: **Collected from the network** is read-only and rewritten on every update, while **User defined properties** is yours and survives.',
  ],
  before: [
    'The topology has to exist first — it is the one required field, and a node cannot be created without one.',
    'Know the node’s address before you start. The first address is its NetJSON id, which is how links refer to it.',
  ],
  tasks: [
    {
      title: 'Add a node by hand',
      steps: [
        'Open **Network Topology › Nodes** and press **Add node**.',
        'Pick the **Topology**. The dropdown names each one with its short UUID, because labels repeat.',
        'Leave **Organization** as **Same as the topology** unless you have a reason not to — blank means *inherit*, not *shared*, and a node claiming a different organization from a non-shared topology is rejected.',
        'Give it a **Label**, or leave it blank and let it fall back to the first address.',
        'Put the addresses in **Addresses**, one per line. **The first one is the node’s NetJSON id** — it is what links refer to, so it is not a free choice if links already exist.',
        'Press **Create node**.',
      ],
      after: [
        'Adding nodes by hand is the exception. A node normally appears because the parser reported it; a hand-made one that the feed does not also report will not be kept in step with the network.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Hang your own data off a node',
      steps: [
        'Open the node and put a JSON object in **User defined properties** — for example `{"site": "mumbai", "owner": "netops"}`.',
        'Press **Save node**.',
      ],
      after: [
        'This is the half of the record the parser does not touch, and it is merged into the node in the graph. Anything written into the collected half would be overwritten on the next update, which is why that half is read-only here.',
        'It has to be a JSON **object**. A list or a bare string is refused before the save with the parse error against the field.',
      ],
    },
    {
      title: 'Delete a node',
      steps: [
        'Its **⋮** menu, then **Delete**. The dialog says *Every link that ends at this node is deleted with it. This cannot be undone.*',
        'Several: tick them and use the bar above the table — *Every link ending at them is deleted too.*',
      ],
      after: [
        'That is the warning to read twice. Deleting a node is also deleting every link that terminates on it, and the dialog does not say how many that is. The **Links** page, filtered to the topology, is where to find out first.',
      ],
    },
  ],
  forms: [
    {
      title: 'the node drawer',
      source: 'features/nettopo/NodeDrawer.jsx',
      opens: '**Add node**, or a row’s name',
      fields: {
        Topology: {
          what: 'Which collected view this node belongs to. Named with its short UUID in the dropdown because topology labels repeat.',
          checks: ['Pick the topology this node belongs to.'],
        },
        Organization: {
          starts: 'Same as the topology',
          what: 'Blank means **inherit from the topology**, not *shared* — which is the opposite of what blank means on the topology form itself.',
          checks: ['A node claiming a different organization from a non-shared topology is rejected by the model.'],
        },
        Label: { example: 'Hyderabad Branch 01' },
        Addresses: {
          example: '10.0.0.1',
          what: 'IPv4 or IPv6. Because the first line is the id links refer to, **reordering them on a node that already has links is not a cosmetic change**.',
        },
        'User defined properties': {
          example: '{"site": "mumbai", "owner": "netops"}',
          what: 'It has to be an **object** — a list, a number or a bare string is valid JSON and still refused. Blank is read as an empty object.',
        },
      },
      after: [
        '**Collected from the network** appears only when editing, and is read-only: the parser rewrites it on every update. A new node has collected nothing, so it reads *Nothing collected for this node yet.*',
      ],
    },
  ],
  sections: [
    {
      title: 'What the list shows',
      body: [
        'Five columns: **Name**, **Addresses**, **Topology**, **Organization** and **Modified**. **Name** is the label, falling back to the first address and then to the short UUID — the same precedence the graph draws by, so a node reads the same in both places.',
        '**Search label, address or properties…** reaches into the collected properties as well as the obvious fields, which is how you find a node by something the parser recorded rather than by anything anyone typed. **All organizations** and **All topologies** narrow it further.',
        'Permissions: `topology.add_node`, `topology.change_node` and `topology.delete_node` each gate their own button, which is absent rather than disabled without it.',
      ],
    },
  ],
  verify: [
    'The node appears in the list against the topology you chose, with its first address in **Addresses**.',
    'Open the topology graph: the node is drawn, labelled the same way the list names it.',
  ],
  trouble: [
    [
      'The save is refused with an organization error',
      'The node claims a different organization from a topology that is not shared.',
      'Set **Organization** back to **Same as the topology**, or share the topology.',
    ],
    [
      'The properties box will not accept what you typed',
      'It has to be a JSON object. `["a","b"]` and `"text"` are valid JSON but not objects, and are rejected with the reason against the field.',
      // Trouble rows go through `cell`, which escapes braces for MDX — so a
      // brace here must NOT also sit in a code span, or the backslashes show.
      'Wrap it in an object, giving the list a key: {"tags": ["a","b"]}.',
    ],
    [
      'Links disappeared after deleting a node',
      'Every link ending at a node goes with the node. The dialog warns about it without counting them.',
      'There is no undo. Check the **Links** page filtered to the topology before deleting next time.',
    ],
    [
      'A node you deleted came back',
      'The parser reported it again on the next update. Deleting a collected node removes the record, not the device.',
      'Unpublish the topology, or stop the feed reporting it — deleting cannot win against a live collector.',
    ],
  ],
  shotDir: 'nodes',
  shots: [
    { file: 'list.png', what: 'The node list across every topology, with the search box and the organization and topology filters above it.', alt: 'The Nodes list' },
    { file: 'form-new.png', what: 'The **Add node** drawer. **Create node** is greyed out because **Topology** is the one required field and nothing is chosen yet.', alt: 'The Add node drawer' },
  ],
};

// ------------------------------------------------------------------- Links

const LINKS: AdminNotes = {
  from: ['pages/NetLinkList.jsx', 'features/nettopo/LinkDrawer.jsx', 'features/nettopo/nettopoModel.js'],
  title: 'Working with links',
  intro: [
    'One row per edge the parser found: two nodes, a status and a cost. A link always belongs to the same topology as both of its endpoints — the model rejects any other arrangement, which is why the form scopes its two pickers to whichever topology you choose.',
  ],
  before: [
    'Both endpoints have to exist as **nodes of the same topology** before the link can. Create them on the **Nodes** page first.',
  ],
  tasks: [
    {
      title: 'Add a link by hand',
      steps: [
        'Open **Network Topology › Links** and press **Add link**.',
        'Pick the **Topology** first. **Source** and **Target** stay disabled until you do, and then load the nodes of that topology — which is what makes an invalid link impossible to build rather than merely rejected on save.',
        'Choose **Source** and **Target**. They cannot be the same node, and the form says so before you submit rather than letting the model raise it.',
        'Set **Status** and **Cost**. Cost is the routing metric and lower is preferred; it must be a number.',
        'Press **Create link**.',
      ],
      after: [
        'Changing **Topology** afterwards clears both endpoints. They belonged to the old topology, and carrying them over would build exactly the link the model refuses.',
      ],
      // Without this the shot has no task to sit beside, and renderNotes now
      // puts an unreferenced one under the intro instead.
      shot: 'form-new.png',
    },
    {
      title: 'Delete a link',
      steps: [
        'Its **⋮** menu, then **Delete**. The dialog says *The nodes at either end stay. This cannot be undone.*',
        'Several: tick them and use the bar above the table.',
      ],
      after: [
        'This is the safe direction: deleting a link removes the edge and leaves both nodes. Deleting a *node* is what takes links with it.',
      ],
    },
  ],
  forms: [
    {
      title: 'the link drawer',
      source: 'features/nettopo/LinkDrawer.jsx',
      opens: '**Add link**, or a row',
      fields: {
        Topology: {
          what: 'Pick this first — it is what fills the two endpoint pickers. Changing it clears **Source** and **Target**.',
          checks: ['Pick the topology this link belongs to.'],
        },
        Source: {
          what: 'A node of the chosen topology. Until one is chosen the picker reads *Pick a topology first*; a topology with no nodes reads *This topology has no nodes*.',
          checks: ['Pick the node this link starts at.'],
        },
        Target: {
          what: 'The other end, from the same list.',
          checks: ['Pick the node this link ends at.', 'Source and target must not be the same node.'],
        },
        Status: { starts: 'Up', what: 'Up or Down.' },
        Cost: {
          starts: '1',
          example: '1',
          what: 'Decimals are allowed.',
          checks: ['Cost must be a number.'],
        },
        'Cost text': {
          example: '10.000',
          what: 'At most 24 characters. A record of what the protocol said, not a number the controller computes with — **Cost** is the one that matters.',
        },
        'User defined properties': {
          example: '{"circuit": "MPLS-4471"}',
          what: 'Same rule as on a node: an object, not a list or a bare string.',
        },
      },
      after: [
        '**A link’s organization is not yours to set here.** It comes from the topology, and the only way to move a link to another organization is to change the organization of the topology it belongs to — which moves every other link in that topology with it.',
        'The endpoint pickers load at most 100 nodes. The count is shown so a truncated list is visible rather than silent.',
      ],
    },
  ],
  sections: [
    {
      title: 'What the list shows',
      body: [
        'Six columns: **Link** (both endpoint names), **Topology**, **Organization**, **Status**, **Cost** and **Modified**.',
        '**Search endpoint name, address or properties…** matches on either end’s name or address as well as the collected properties, so you can find an edge from one side of it. **All organizations**, **All topologies** and **Up and down** narrow it.',
        'Permissions: `topology.add_link`, `topology.change_link` and `topology.delete_link`.',
      ],
    },
  ],
  verify: [
    'The link appears with both endpoint names in **Link** and the status you set.',
    'Open the topology graph: the edge is drawn between the two nodes, coloured by status.',
  ],
  trouble: [
    [
      '**Source** and **Target** are greyed out',
      'No **Topology** is chosen. The endpoints are the nodes of a topology, so there is nothing valid to offer yet.',
      'Pick the topology first.',
    ],
    [
      '*This topology has no nodes*',
      'The topology exists but nothing has been collected into it, and a link needs two nodes.',
      'Add the nodes first, or wait for a collection cycle.',
    ],
    [
      '*Source and target must not be the same node.*',
      'Both ends point at one node.',
      'Change one of them; the form blocks the save until you do.',
    ],
    [
      'My endpoint is missing from the picker',
      'It belongs to a different topology, or the topology has more than 100 nodes — that is the picker’s limit.',
      'Check the node’s topology on the **Nodes** page. The count beside the picker shows when the list is truncated.',
    ],
  ],
  shotDir: 'links',
  shots: [
    { file: 'list.png', what: 'The link list on its own, with the status filter set to show both up and down edges.', alt: 'The Links list' },
    { file: 'form-new.png', what: 'The drawer before a **Topology** is chosen: **Source** and **Target** are both greyed out and read “Pick a topology first”, and **Create link** stays disabled. Behind it, the list names each link by its two endpoints.', alt: 'The Add link drawer' },
  ],
};

// --------------------------------------------------------------- The graph

const GRAPH: AdminNotes = {
  from: ['pages/NetTopologyGraph.jsx', 'features/nettopo/TopologyGraph.jsx'],
  title: 'Reading the graph',
  intro: [
    'One topology drawn, reached from **View topology graph** on a row’s **⋮** menu. Nothing is edited here — it is the picture of what the parser last collected.',
  ],
  before: [],
  tasks: [
    {
      title: 'Look at a past day',
      steps: [
        'Pick a date in the toolbar. The field shows **today** when nothing is selected, because the live graph is today’s.',
        'The subtitle changes from *live, updated …* to *snapshot of …* so the two are never confused.',
        'Press **Back to live** to return. Picking today from the calendar also means live.',
      ],
    },
    {
      title: 'Take the data away with you',
      steps: [
        'Press the download button in the toolbar to save the graph as NetJSON — the same representation the parser produced.',
        'The **info** button opens the topology’s own details beside the canvas.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the heading tells you',
      body: [
        'Under the topology’s name: the node count, the link count, and — only when it is not zero — **N down** in red. That last number is the one to read first; a graph can look complete and still be reporting failed edges.',
        'Then either *live, updated* with a timestamp, or *snapshot of* with a date — so the heading always says which of the two you are looking at.',
      ],
    },
    {
      title: 'Why a node’s label is shorter here than on the Nodes page',
      body: [
        'The graph strips the prefix a node shares with its parent: under a gateway called *Hyderabad DC Gateway*, a spoke named *Hyderabad Branch 01* is drawn as *Branch 01*. The region is already established by the gateway it visibly hangs off, and label width is the scarcest thing on a dense canvas.',
        'The stored label is unchanged. The **Nodes** page shows it in full.',
      ],
    },
  ],
  verify: [
    'The node and link counts in the heading match the **Nodes** and **Links** columns on the Topologies list.',
  ],
  trouble: [
    [
      'The graph is empty',
      'Nothing has been collected into this topology, or it is unpublished — an unpublished topology stops being updated and is hidden from the visualiser.',
      'Check **Nodes** and **Links** on the Topologies list, and that the row’s badge reads **Published**.',
    ],
    [
      'A date shows fewer nodes than today',
      'A snapshot is what was collected on that day, not today’s network filtered backwards.',
      'That is the point of the control. Press **Back to live** to compare.',
    ],
  ],
  shotDir: 'graph',
  shots: [
    { file: 'graph.png', what: 'A topology with enough nodes to show the layout, and at least one link down so the red count in the heading is visible.', alt: 'The topology graph' },
  ],
};

export const TOPOLOGY_NOTES: Record<string, AdminNotes> = {
  '/network-topology/topologies': TOPOLOGIES,
  '/network-topology/nodes': NODES,
  '/network-topology/links': LINKS,
  '/network-topology/topologies/:id/graph': GRAPH,
};
