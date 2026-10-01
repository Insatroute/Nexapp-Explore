/**
 * Hand-written notes for the two IPAM pages, in the shape `renderNotes` reads.
 *
 * Same division as the CPE handbook and the Administration guides: the FIELDS
 * come out of the forms' own JSX on every build — label, required flag, help
 * text, placeholder — so a field added or renamed in the console appears here
 * without anyone editing this file. What source cannot say goes here: a good
 * example value, the rule the server adds on top of the control's, the order
 * to do things in.
 *
 * Pinned by `npm run check:descriptions` to the files each entry was written
 * against, so a change to those files is flagged rather than silently making
 * this stale.
 */
import type { AdminNotes } from './admin-notes.ts';

// ------------------------------------------------------------- IP addresses

const IP_ADDRESSES: AdminNotes = {
  from: ['pages/IpAddressList.jsx', 'pages/IpAddressForm.jsx'],
  title: 'Working with addresses',
  intro: [
    'The day-to-day half of IPAM: allocating an address, or finding a free one. Every address belongs to exactly one subnet, and the subnet decides which organization owns it.',
    'An address recorded here is a **reservation in the controller**, not a configuration pushed to a device. Nothing is sent anywhere when you save one — it is how the controller keeps track of what is in use.',
  ],
  before: [
    'A subnet has to exist first. If **Subnet** has nothing to choose, create one under **IPAM › Subnets**.',
    'You need a permission on `nexapp_ipam.ipaddress` to open the page at all, and the add permission to create one.',
  ],
  tasks: [
    {
      title: 'Allocate an address',
      steps: [
        'Open **IPAM › IP addresses** and press **New address**.',
        'Choose the **Subnet**. The console suggests the first free address in that range as soon as you do — take it unless you need a particular one.',
        'Fill in a **Description** saying what the address is for. It is the only field that tells the next person why this is taken.',
        'Press **Save**.',
      ],
      after: [
        'The address appears in the list with its subnet and organization, and stops being offered as free.',
      ],
      shot: 'new-address.png',
    },
    {
      title: 'Find a free address',
      steps: [
        'Filter the list by **All subnets** to the range you care about.',
        'Or start **New address**, choose the subnet, and read the suggestion — that is the first free one.',
      ],
    },
    {
      title: 'Move an address to another subnet',
      steps: [
        'Open the address and change **Subnet**.',
        'Check the **IP address** still falls inside the new range. The console does not move it for you, and an address outside its subnet is refused.',
      ],
    },
    {
      title: 'Release an address',
      steps: [
        'Use the row menu and choose **Delete**.',
        'The dialog says *The address returns to its subnet. This cannot be undone.* Confirm it.',
      ],
      after: ['The address becomes free again and can be allocated to something else.'],
    },
  ],
  forms: [
    {
      title: 'New address',
      source: 'pages/IpAddressForm.jsx',
      opens: '**New address**, or a row in the list',
      fields: {
        Subnet: {
          // The form's own hints already explain the move and the suggestion;
          // what they do not say is that the subnet carries the ownership.
          what: 'It also decides the owning organization — an address has no organization field of its own.',
          example: 'subnet 10.20.0.0/24',
        },
        'IP address': {
          what: 'Must fall inside the chosen subnet.',
          example: '10.20.0.15',
          checks: ['An address outside the subnet, or already allocated, is refused by the server.'],
        },
        Description: {
          what: 'What the address is for. Worth filling in — it is what the list shows about a reservation six months later.',
          example: 'DNS forwarder, lab rack 2',
        },
      },
    },
  ],
  sections: [
    {
      title: 'What the list shows',
      body: [
        'One row per address: **IP address**, **Subnet**, **Organization**, **Created** and **Modified**. The subnet column names the range and its CIDR, so a row carries enough to place the address without opening it.',
        'Above it: **All organizations** and **All subnets** narrow the list, **Search addresses…** matches on the address itself, and **Columns** chooses which of the five are shown.',
      ],
    },
  ],
  verify: [
    'The new address appears in the list under the subnet you chose.',
    'Starting another **New address** in the same subnet suggests the NEXT free one, not the address you just took.',
  ],
  trouble: [
    [
      '**Subnet** has nothing to choose',
      'No subnet is visible to you.',
      'Create one under **IPAM › Subnets**, or check you have permission on it.',
    ],
    [
      'The address is refused on save',
      'It is outside the chosen subnet, or already allocated.',
      'Check it against the subnet’s range; take the suggested address if you do not need a specific one.',
    ],
    [
      'The address is missing after a subnet change',
      'Deleting a subnet deletes its addresses with it.',
      'That is what the subnet delete dialog warns about; the address has to be created again.',
    ],
  ],
  shotDir: 'ip-addresses',
  shots: [
    {
      file: 'list.png',
      what: 'The address list with several rows, the organization and subnet filters visible.',
      alt: 'The IP address list',
    },
    {
      file: 'new-address.png',
      what: 'The New address form before a subnet is chosen — Subnet, IP address and Description, with Assign address greyed out until the required fields are filled.',
      alt: 'The new address form',
    },
  ],
};

// ------------------------------------------------------------------ Subnets

const SUBNETS: AdminNotes = {
  from: ['pages/SubnetList.jsx', 'pages/SubnetForm.jsx', 'components/SubnetImportModal.jsx'],
  title: 'Working with subnets',
  intro: [
    'The setup half of IPAM: the ranges addresses are allocated from. You visit this page far less often than **IP addresses** — usually once per site, when the addressing plan is first recorded.',
    'A subnet can be carved out of a larger one (**Master subnet**), and can carry **division rules** that create child subnets automatically as devices or VPN clients appear.',
  ],
  before: [
    'Decide the range and its prefix before you start — the subnet itself cannot be edited into a different shape once addresses exist inside it.',
    'If this range sits inside one you already recorded, have that larger subnet to hand for **Master subnet**.',
  ],
  tasks: [
    {
      title: 'Record a subnet',
      steps: [
        'Open **IPAM › Subnets** and press **New subnet**.',
        'Give it a **Name** someone else will recognise, and the range in **Subnet** as CIDR.',
        'Set **Organization**, or leave it shared to make the range available to every organization.',
        'Set **Master subnet** only if this range is carved out of a larger one you have already recorded.',
        'Press **Save**.',
      ],
      after: ['The subnet appears in the list and becomes selectable on the **New address** form.'],
      shot: 'new-subnet.png',
    },
    {
      title: 'Carve a range up automatically',
      steps: [
        'On the subnet, add a **division rule**.',
        'Choose the **Type** — **Device** creates a child subnet per device, **VPN** one per VPN client.',
        'Set **Number of subnets**, **Size of subnets** (the prefix length of each, e.g. 28) and **Number of IPs** per subnet.',
        'Save. Rules added on a new subnet are created together with it.',
      ],
      after: [
        'Child subnets appear as devices or VPN clients arrive, each with the owning subnet as its **Master subnet**.',
      ],
    },
    {
      title: 'Import several subnets',
      steps: [
        'Press **Import** and supply the file.',
        'Check the result in the list afterwards — an import creates rows directly.',
      ],
    },
    {
      title: 'Delete a subnet',
      steps: [
        'Use the row menu and choose **Delete**.',
        'The dialog says *Its IP addresses are removed with it. This cannot be undone.* Read that before confirming — every address allocated from this range goes too.',
      ],
    },
  ],
  forms: [
    {
      title: 'New subnet',
      source: 'pages/SubnetForm.jsx',
      opens: '**New subnet**, or a row in the list',
      fields: {
        Name: {
          what: 'How the range is identified everywhere else in the console, including the **Subnet** dropdown on the address form.',
          example: 'Branch office LAN',
        },
        Subnet: { example: '10.20.0.0/24' },
        Organization: {
          what: 'Addresses allocated from this range inherit it — an address has no organization field of its own.',
        },
        Description: { what: 'What the range is for.', example: 'Wired clients, branch office' },
        'Master subnet': { what: 'Left blank for a top-level range.' },
        // The five below are not on the main form: they belong to the
        // "Subnet division rules" section under it. The reader lists them
        // first because that component is defined first in the file, so each
        // says where it actually is. Where the control's own hint already
        // explains the field, there is no `what` — repeating it printed the
        // same sentence twice in one cell.
        Label: { when: 'In the **Subnet division rules** section' },
        Type: {
          when: 'In the **Subnet division rules** section',
          what: 'What a rule creates a subnet for: **Device**, one per device, or **VPN**, one per VPN client.',
        },
        'Number of subnets': { when: 'In the **Subnet division rules** section' },
        'Size of subnets': { when: 'In the **Subnet division rules** section', example: '28' },
        'Number of IPs': {
          when: 'In the **Subnet division rules** section',
          // The first two sentences the reader picks up here are the section's
          // empty state and its optionality note, not help for this field.
          drop: [
            'No division rules. Add one to carve this range into per-device or per-VPN subnets automatically.',
            'Optional. Add one or more rules and they are created together with the subnet.',
          ],
        },
      },
      after: [
        'Division rules are optional. Added on a new subnet, they are created together with it rather than afterwards.',
        '**A saved rule is nearly frozen.** The form warns, above the inputs, that once a rule exists its **Size of subnets** and **Number of subnets** can no longer be changed and its **Number of IPs** can only be increased. That is enforced by the server, not just by the form, so getting those three right the first time matters more than anything else on this page — the only way out is to delete the rule and start again.',
      ],
    },
  ],
  sections: [
    {
      title: 'What the list shows',
      body: [
        'Seven columns — **Name**, **Organization**, **Subnet**, **Master subnet**, **Related device**, **Created** and **Modified** — and **Columns** switches any of them off.',
        '**Related device** reads three different ways, and the difference is the useful part. A **top-level** range (no master subnet) shows a *See all devices* link, which opens the device list filtered to that range. A range that a division rule carved out **for a device** names that device instead. A child range with no device attached shows a dash. So the column is really answering “was this recorded by a person or generated by a rule”, and reading *See all devices* on every row means every range in the list is top level.',
        '**Search subnets…** matches on the name and the range. **Import** beside it bulk-loads subnets rather than adding them one at a time.',
      ],
    },
    {
      title: 'Why addresses come first in this section',
      body: [
        'The sidebar puts **IP addresses** above **Subnets** deliberately. Allocating and hunting addresses is the daily job; recording a subnet is a setup step done once.',
      ],
    },
  ],
  verify: [
    'The subnet appears in the list, and in the **Subnet** dropdown on **New address**.',
    'If you added a division rule, child subnets appear as devices or VPN clients arrive, each showing this range as its **Master subnet**.',
  ],
  trouble: [
    [
      'The subnet is refused on save',
      'The range is not valid CIDR, or it overlaps one that already exists.',
      'Check the notation — `10.0.0.0/24` for IPv4, `fdb6:21b:a477::9f7/64` for IPv6.',
    ],
    [
      'Deleting took addresses with it',
      'That is by design, and the dialog says so.',
      'There is no undo. Recreate the subnet and its addresses.',
    ],
    [
      'No child subnets appeared',
      'A division rule creates them as devices or VPN clients arrive, not when the rule is saved.',
      'Check a matching device exists, and that the rule’s organization matches the subnet’s.',
    ],
  ],
  shotDir: 'subnets',
  shots: [
    {
      file: 'list.png',
      what: 'Five ranges, all top level — **Master subnet** is a dash on every row, which is why **Related device** reads “See all devices” throughout. The three named “SD-WAN Overlay: …” were created by the fabric rather than typed in here.',
      alt: 'The subnet list',
    },
    {
      file: 'new-subnet.png',
      what: 'The form as it opens. The warning above **Subnet division rules** is the one to read before adding a rule: once saved, its size and count can never be changed and its **Number of IPs** can only go up.',
      alt: 'The new subnet form',
    },
  ],
};

export const IPAM_NOTES: Record<string, AdminNotes> = {
  '/ipam/ip-addresses': IP_ADDRESSES,
  '/ipam/subnets': SUBNETS,
};
