/**
 * Hand-written guidance for the Overlay Networks pages, in the same shape as
 * `admin-notes.ts` and rendered by `guide-admin.ts` (images under
 * `public/img/overlay/<shotDir>/`). Pinned by `check:descriptions` under
 * `overlay:<route>` to the files named in `from`.
 */
import type { AdminNotes } from './admin-notes.ts';

const PATH_LABELS: AdminNotes = {
  from: [
    'pages/PathLabels.jsx',
    'components/crud/ResourceTable.jsx',
    'components/crud/ResourceField.jsx',
    'sdwan_tunnel/models/pathlabel.py',
    'sdwan_tunnel/api/views.py',
    'sdwan_tunnel/api/nsbond_views.py',
  ],
  title: 'Working with path labels',
  intro: [
    'A path label names a **kind of WAN path** — *MPLS*, *Broadband*, *LTE* — with a colour. This page only defines the labels; you apply them elsewhere, to one uplink at a time:',
    '- on the **Dashboard**, in the **Path label** column of the WAN Uplinks table;\n- on a device’s **Summary** tab, in the **Path label** column of its interface table.',
    'Wherever a label is applied, its colour is the dot shown beside it, so a reader can tell paths apart at a glance. The list shows each label’s **Name**, its **Colour** swatch, its **Description** and a tick or cross for **Direct internet access**; newest first. **Search path labels…** matches the name and the description.',
  ],
  before: [
    'Agree the names with whoever reads the dashboards — they are shared by the **whole controller**, not per organization, so two customers cannot each have their own *LTE*.',
    '**New path label** needs the add permission on path labels; editing and deleting need their own permissions.',
  ],
  tasks: [
    {
      title: 'Create a path label',
      steps: [
        'Open **Overlay Networks › Path Labels** and press **New path label**. The **New Path Labels** drawer opens on the right.',
        'Type the **Name**, e.g. `LTE`. Optionally a **Description**, e.g. `4G backup via SIM 1`.',
        'Pick a **Colour** from the ten swatches, use the palette button for any other colour, or type a hex code such as `#2563eb` in the box beside them.',
        '**Direct internet access** is required and starts on **No**. Set it to **Yes** if traffic on this kind of path may break out to the internet locally, otherwise leave **No**.',
        'Press **Create**. The drawer closes and the label is in the list.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Apply it to an uplink',
      steps: [
        'Open the **Dashboard** and find the uplink in the **WAN Uplinks** table — or open the device and its **Summary** tab.',
        'In that interface’s **Path label** column, choose the label. *— None —* removes it.',
      ],
      after: ['Each interface carries at most one label; choosing another replaces it.'],
    },
    {
      title: 'Change or delete a path label',
      steps: [
        'Click the label’s name, or **⋮ › Edit**; change it and press **Save changes**. Every uplink carrying it shows the new name and colour.',
        'To delete: **⋮ › Delete** and confirm, or tick several rows and use **Delete** on the bar above the table.',
      ],
      after: [
        'The confirmation warns: *Uplinks currently carrying this label will become unlabelled. This cannot be undone.* That is exactly what happens — the label is removed from every interface, hub and spoke that had it; nothing else about them changes.',
      ],
    },
  ],
  forms: [
    {
      title: 'the path label drawer',
      source: 'pages/PathLabels.jsx',
      fields: {
        Name: { example: 'LTE', what: 'Up to 128 characters. Must be unique across the whole controller.', checks: ['This field is required.', 'path label with this name already exists.'] },
        Description: { example: '4G backup via SIM 1', what: 'Optional, up to 128 characters. Shown in the list only.' },
        Colour: {
          example: '#f59e0b',
          what: 'Ten preset swatches, a palette button for any colour, and an editable hex box. Use the full `#rrggbb` form: the box accepts any text up to 7 characters, but only a real hex colour shows as a dot.',
          checks: ['Ensure this field has no more than 7 characters.'],
        },
        'Direct internet access': {
          what: 'Recorded with the label and passed along in the fabric topology data. Setting it does not by itself change any device’s routing.',
        },
      },
    },
  ],
  verify: [
    'The label is in the list with the colour swatch you chose, and a tick under **Direct internet access** if you chose **Yes**.',
    'It is offered in the **Path label** column on the Dashboard’s WAN Uplinks table; once applied, its coloured dot appears beside that uplink.',
  ],
  trouble: [
    ['*name: path label with this name already exists.*', 'Names are unique across the whole controller — another organization may already use it.', 'Choose a more specific name, e.g. `LTE-Acme`.'],
    ['*This field is required.* under Name', 'Name is empty.', 'Type a name.'],
    ['The colour shows no dot', 'The hex box holds something that is not a `#rrggbb` colour.', 'Pick a swatch, or type a full code such as `#16a34a`.'],
    ['Editing or deleting a label fails with a *not found* error for a non-superuser', 'Labels created here belong to no organization, and the server lets only superusers change or delete organization-less records.', 'Ask a superuser to make the change.'],
    ['Choosing **Enabled** in the **All states** filter shows nothing', 'That filter is the shared table’s on/off filter; path labels have no on/off switch.', 'Leave it on **All states**.'],
    ['The label disappeared from uplinks', 'It was deleted.', 'Create it again and re-apply it.'],
  ],
  shotDir: 'path-labels',
  shots: [
    { file: 'list.png', what: 'The Path Labels list with two labels — colour swatches and the Direct internet access tick and cross.', alt: 'The Path Labels list' },
    { file: 'form-new.png', what: 'The **New Path Labels** drawer: Name, Description, the Colour swatches with the hex box, and Direct internet access.', alt: 'Creating a path label' },
  ],
};

export const OVERLAY_NOTES: Record<string, AdminNotes> = {
  '/path-labels': PATH_LABELS,
};
