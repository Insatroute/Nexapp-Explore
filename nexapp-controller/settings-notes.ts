/**
 * Hand-written notes for the Settings pages.
 *
 * Same split as the Administration, IPAM and Network Topology notes: the FIELD
 * TABLES are read out of each form's JSX on every build, so a renamed field
 * appears here without anyone editing this file. What source cannot say lives
 * here — the order to do things in, the consequence of a choice, and the rules
 * the form only applies when you press the button.
 *
 * These four pages are superuser-only, which changes what the guides are for:
 * nobody arrives here by accident, and the mistakes available are expensive
 * (emailing every user, hiding an outage from alerting) rather than fiddly.
 *
 * Pinned by `npm run check:descriptions` to the files each entry names in
 * `from`, so a change to any of them flags the entry for a re-read.
 */
import type { AdminNotes } from './admin-notes.ts';

// ---------------------------------------------------------- Email & Alerts

const EMAIL_ALERTS: AdminNotes = {
  from: [
    'pages/EmailAlerts.jsx',
    'components/emailalerts/AlertConfigTable.jsx',
    'components/emailalerts/EmailTemplatesTable.jsx',
    'components/emailalerts/AlertHistoryTable.jsx',
  ],
  title: 'Working with email alerts',
  intro: [
    'Three separate things behind one heading, which is why the page is tabbed. **Alert Configurations** decides which events raise an alert and how often. **Email Templates** holds the wording those alerts are sent with. **Alert History** is the record of what actually went out.',
    'The split between the first two is the point of the page: **what counts as a problem** and **what the message says** are kept apart, so the wording can be changed without touching the rule, and the rule without rewriting the mail.',
  ],
  before: [
    'Superusers only. There is no permission that grants a non-superuser access to this page.',
    'Decide whether you are changing a rule or a message before you start — they are different tabs, and the usual mistake is editing the template when the threshold is what is wrong.',
  ],
  tasks: [
    {
      title: 'Turn an alert on or off',
      steps: [
        'Open **Settings › Email & Alerts**, on the **Alert Configurations** tab.',
        'Find the alert — **Search alert types…** matches the name, and **All categories** and **All organizations** narrow the list.',
        'Use the **Status** switch on its row. The switch at the top right of an organization group turns that whole set on or off at once.',
      ],
      after: [
        'Alerts are configured **per organization**. The group header counts how many of that organization’s alerts have been customised, so a group reading *4 customised* out of 62 is mostly running defaults.',
      ],
    },
    {
      title: 'Change when an alert fires',
      steps: [
        'Press the gear on the alert’s row.',
        'Adjust **Threshold**, **Interval** and **Fire after**. Together these decide how bad a condition has to be, how often it is checked, and how long it has to persist before anyone is told.',
        'Save.',
      ],
      after: [
        '**Fire after** is the setting that stops alert fatigue. A condition that clears inside that window never raises mail at all, which is why a recovery alert often has a longer one than the problem alert it pairs with.',
      ],
    },
    {
      title: 'Change the wording of an alert',
      steps: [
        'Open the **Email Templates** tab.',
        'Edit the template. It is attached to the alert by type, so one template serves every alert of that kind.',
      ],
      after: [
        'Changing a template changes future mail only. **Alert History** keeps what was actually sent, not what the template says now.',
      ],
    },
    {
      title: 'Check whether an alert was really sent',
      steps: [
        'Open the **Alert History** tab. It records when, at what level, to which target and recipients, and over which channel.',
        'Use the filters beside it to narrow the record.',
      ],
      after: [
        'This tab is the one that answers *"we never got the email"*. The tiles above the tabs give the shape of it at a glance — **Sent · 24h** against **Emailed · 24h**, and **Sent · 7d** for the week.',
        'It is also the heaviest query on the page, so it is not fetched until you open the tab. The first open is slower than the other two by design.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the tiles count',
      body: [
        'Six figures across the top, and they summarise **all three tabs** rather than whichever one is open — which is why they sit in a card of their own. **Configured alerts** and **Enabled** are the rules; **Active templates** the wording; **Sent · 24h**, **Emailed · 24h** and **Sent · 7d** what went out.',
        '**Sent** and **Emailed** are not the same number and are not meant to be. An alert can be raised without an email going anywhere — nobody subscribed to that type, or the channel is off for that organization. A large gap between the two is worth looking into rather than ignoring.',
      ],
    },
  ],
  verify: [
    'The **Status** switch stays on after a refresh — the change is saved per alert, not per session.',
    'Cause the condition, then look at **Alert History**: the row records the time, level, target, recipients and channel.',
  ],
  trouble: [
    [
      'An alert is enabled but no email arrived',
      'Being enabled raises the alert; it does not decide who receives it. Delivery is per-user, on **Settings › Notifications**, and per-organization.',
      'Check **Alert History** first: a row there with no recipients is a subscription problem, no row at all is a rule problem.',
    ],
    [
      'The alert fires far more often than expected',
      '**Interval** and **Fire after** are doing nothing for it — a condition that flaps inside the window still re-raises once the window passes.',
      'Raise **Fire after** so a brief condition clears before anyone is told.',
    ],
    [
      'The wording changed but old mail still reads the old way',
      '**Alert History** keeps what was sent, not what the template says now.',
      'Working as intended — the record would be worthless if editing a template rewrote history.',
    ],
    [
      'The History tab is slow to open the first time',
      'It is a heavier query and is deliberately not fetched until asked for. Once opened it stays loaded for the session.',
      'Nothing to fix.',
    ],
  ],
  shotDir: 'email-alerts',
  shots: [
    { file: 'list.png', what: 'The six tiles, then the **Alert Configurations** tab grouped by organization — the per-row **Status** switches, the group’s *customised* count, and the **All alerts** master switch.', alt: 'Email and alerts' },
    { file: 'history.png', what: 'The **Alert History** tab: what was sent, when, at what level, to whom and over which channel.', alt: 'Alert history' },
  ],
};

// ----------------------------------------------------------- Notifications

const NOTIFICATIONS: AdminNotes = {
  from: ['pages/NotificationPreferences.jsx'],
  title: 'Choosing what reaches you',
  intro: [
    'Which alerts reach **you**, per organization, as a grid of switches. This is the delivery half of alerting: **Email & Alerts** decides what raises an alert at all, this decides whether it reaches your inbox.',
    'Changes save as you make them. There is no save button and no confirmation step.',
  ],
  before: [
    'Superusers only.',
    'These are **your own** preferences. Changing them does not change what anyone else receives.',
  ],
  tasks: [
    {
      title: 'Turn one notification type on or off',
      steps: [
        'Open **Settings › Notifications**.',
        'Find the type — **Filter notification types…** narrows the list as you type.',
        'Flip the switch in the **WEB** or **EMAIL** column. It saves immediately.',
      ],
    },
    {
      title: 'Turn a whole channel on or off',
      steps: [
        'Use the switch in the organization’s header row, beside the channel name.',
        'The count beside it — *Email 59/59* — is what tells you the real state.',
      ],
      after: [
        'The header switch answers *"is this channel on for this organization at all"*, not *"is every single type on"*. Turning off one type of 59 leaves the header switch on, because 58 types are still being delivered. Only 0 of 59 turns it off.',
        'So read the count, not the switch, when you want to know whether a channel is fully enabled.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'The SMS column does nothing',
      body: [
        '**The switches in the SMS column flip, and the header count moves, but nothing is saved.** There is no SMS field on the server to save it to. The state lives in the page only, so a refresh — or any reload the page does by itself — puts every SMS switch back to off.',
        'This matters because the failure is silent and looks exactly like success: the switch moves, the count updates, and nothing warns you. Anyone who turns SMS on and walks away will believe they are subscribed to alerts they will never receive, by a channel that does not exist.',
        'Use **WEB** and **EMAIL**, which do save. Treat the SMS column as unbuilt until the count survives a refresh.',
      ],
    },
  ],
  verify: [
    'Refresh the page. **WEB** and **EMAIL** come back as you left them.',
    'The SMS column comes back at 0 whatever you did to it — that is the symptom described above, not a fault in your browser.',
  ],
  trouble: [
    [
      'An SMS switch will not stay on',
      'Nothing is saved for that channel — there is no field for it on the server.',
      'Nothing to do from this page. Use email.',
    ],
    [
      'The channel switch is on but a type is not being delivered',
      'The header switch means *some* of this channel is on, not all of it. The count beside it carries the real state.',
      'Read the *N/M* count, and check the individual type’s row.',
    ],
    [
      'A change did not stick',
      'Each switch saves on its own; one failed call does not stop the others.',
      'The page shows which type failed by name. Flip it again.',
    ],
  ],
  shotDir: 'notifications',
  shots: [
    { file: 'list.png', what: 'The grid, grouped by organization: the WEB, EMAIL and SMS columns, the per-channel header switches with their “N of M” counts, and the type filter. Note SMS reading 0 of 59 — see the section above for why.', alt: 'Notification preferences' },
  ],
};

// ------------------------------------------------------ Maintenance Windows

const MAINTENANCE: AdminNotes = {
  from: ['pages/MaintenanceWindows.jsx', 'components/system/MaintenanceFormModal.jsx'],
  title: 'Scheduling maintenance',
  intro: [
    'A declared period when the controller or the fleet is expected to be down, so planned work is not reported as a fault and users are told in advance.',
    'Scheduling one is **not a quiet act**. It emails every active user within a minute, puts a banner on every page, and sends a reminder an hour before the window opens. Write it as something a stranger will read in their inbox.',
  ],
  before: [
    'Superusers only — the page maps to no permission, because scheduling downtime mails every active user and banners every page.',
    'Have the real start and end times ready. The start must be in the future, and you cannot schedule a window that has already begun.',
    'Decide whether it is **planned** or **emergency** before you open the form: emergency windows are shown in red and users cannot dismiss the banner.',
  ],
  tasks: [
    {
      title: 'Schedule a window',
      steps: [
        'Open **Settings › Maintenance Windows** and press **Schedule maintenance**.',
        'Give it a **Title** — up to 120 characters, and specific enough to recognise in a mailbox.',
        'Write the **Message**. It is shown in the banner on every page and in both emails, so it should say what users should expect rather than what you are doing.',
        'Set **Starts** and **Ends**. Moving the start **drags the end with it**, keeping the length you already chose — so set the duration once and then move the whole window freely.',
        'Choose the **Type**.',
        'Press **Schedule window**.',
      ],
      after: [
        'The console confirms *Maintenance window scheduled. All users will be emailed within a minute.* That is the point of no return for the announcement — it cannot be recalled.',
        'The times are entered in **your** local zone, and the page says which one. Every user sees the window in their own.',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change a window that has already been announced',
      steps: [
        'Open the window and change what you need, then **Save changes**.',
        'Read the note at the top of the form first: it appears only once the announcement has gone out.',
      ],
      after: [
        'Changing the **start time** of an announced window sends a **fresh “starting in 1 hour” reminder** for the new time. The announcement itself is not sent again, so users who read the first mail still have the old times and nothing tells them twice.',
        'That is the case for getting the times right before scheduling rather than after.',
      ],
    },
    {
      title: 'Cancel a window',
      steps: [
        'Use the row menu and choose to cancel. The dialog is **Cancel this maintenance window?**',
        'Read which of the two messages it shows — they differ by whether users have already been emailed.',
        'Confirm with **Cancel window**.',
      ],
      after: [
        'The banner stops immediately. But if users were already emailed, **they are not told automatically that it was called off** — the dialog says so, and following that up is a manual job.',
        'Cancelling only means anything for a window that has not finished. One that has already run is history.',
      ],
    },
    {
      title: 'Reschedule rather than edit',
      steps: [
        'Choose to reschedule from the row. The form opens headed **Reschedule maintenance**.',
        'Pick new times. The original window’s length is carried across.',
      ],
      after: [
        'This creates a **new** window. The original stays on the record exactly as users were told it, which is the difference between rescheduling and editing: editing rewrites what was announced, rescheduling leaves the announcement standing and adds the new one.',
      ],
    },
    {
      title: 'Delete a window',
      steps: [
        'Use the row menu and choose delete. The dialog says the window *is removed from the record entirely*.',
      ],
      after: [
        'Delete and cancel are different. **Cancel** calls off a window and keeps it in the history; **delete** removes it from the record, including from the history. If you want to be able to show later what was scheduled and called off, cancel it.',
      ],
    },
  ],
  forms: [
    {
      title: 'the maintenance window form',
      source: 'components/system/MaintenanceFormModal.jsx',
      opens: '**Schedule maintenance**, or a row',
      fields: {
        Title: {
          required: 'Yes',
          example: 'Controller upgrade to 2.4.1',
          what: 'Up to 120 characters. It is the subject line of what lands in everyone’s inbox.',
          checks: ['A title is required.'],
        },
        Message: {
          required: 'Yes',
          example: 'The controller will be unavailable. Devices stay up and keep forwarding traffic; configuration changes will not apply until it returns.',
          what: 'Say what users should expect, not what you are doing — they are not the ones doing the work.',
          checks: ['A message is required — users read it in the banner.'],
        },
        Starts: {
          required: 'Yes',
          what: 'Entered in your own time zone, which the form names. Moving it drags **Ends** along to keep the duration.',
          checks: ['Enter both a start and an end time.', 'The start time must be in the future.'],
        },
        Ends: {
          required: 'Yes',
          // The shared hint under the two date inputs interpolates the browser's
          // own zone — `Your local time ({Intl…resolvedOptions().timeZone})` —
          // so the reader prints it with an empty bracket. The fact is stated
          // on Starts instead, where it is not a template literal.
          drop: ['Your local time ( ). Each user sees the window in their own.'],
          what: 'Defaults to two hours after the start. Editing it directly sets the duration, and the start stops dragging it.',
          checks: ['Enter both a start and an end time.', 'The end time must be after the start time.'],
        },
        Type: {
          starts: 'Planned maintenance',
          what: 'Choose emergency for work people genuinely must not miss, not to add emphasis — an undismissable red banner on every page is a blunt instrument.',
        },
      },
      after: [
        '*The start time must be in the future* applies only when creating. An existing window can be edited after its start has passed.',
      ],
    },
  ],
  sections: [
    {
      title: 'What the list shows',
      body: [
        'One row per window: **Window** (its title, the message beneath, and who scheduled it), **Starts**, **Ends**, **Length**, **State** and **Users notified**.',
        '**State** is one of **Scheduled**, **In progress**, **Completed** or **Cancelled**. Completed is deliberately neutral rather than green — a window that ran and ended is history, not a success.',
        '**Users notified** is the column worth reading closely, because it distinguishes four different outcomes rather than just "sent": *Announced + reminder sent* is the normal one; *Announced (too soon for a separate reminder)* means the window was created inside the final hour, so the reminder went out with the announcement rather than separately; *Announced · reminder due 1h before* means one is still coming; and *Announced · no reminder sent* means the window has passed without one. That last one is the one to notice — it means people got the announcement and nothing else.',
      ],
    },
  ],
  verify: [
    'The window appears with state **Scheduled** and the times you set.',
    'The banner is on every page, and **Users notified** moves to *Announced* within a minute.',
    'An hour before it opens, **Users notified** becomes *Announced + reminder sent*.',
  ],
  trouble: [
    [
      '*The start time must be in the future.*',
      'You are creating a window that has already begun. The check applies on create only.',
      'Move the start later, or if the work has genuinely started, schedule it ending at the right time and accept the announcement goes out now.',
    ],
    [
      '*The end time must be after the start time.*',
      'The two are the wrong way round, often after editing the start and not the end.',
      'Check both — remember moving the start drags the end, but not the other way.',
    ],
    [
      'Users say they were not told the window was cancelled',
      'They are not told. Cancelling stops the banner but sends no mail, and the confirmation dialog says so.',
      'Tell them yourself. There is nothing on this page that will.',
    ],
    [
      'Users were told the old times',
      'Editing an announced window’s start sends a new reminder but does not re-send the announcement.',
      'Cancel it and schedule a new one if the change is large enough that the original mail is now misleading.',
    ],
    [
      'A window vanished from the history',
      'It was deleted rather than cancelled. Delete removes it from the record entirely.',
      'There is no undo. Use cancel when the record matters.',
    ],
  ],
  shotDir: 'maintenance',
  shots: [
    { file: 'list.png', what: 'Two completed windows, each showing its length, its state, and “Announced + reminder sent” under **Users notified**.', alt: 'Maintenance windows' },
    { file: 'form-new.png', what: 'The **Schedule maintenance** form, with the local-time note under the two date fields and the warning that emergency windows cannot be dismissed.', alt: 'Scheduling a maintenance window' },
  ],
};

// --------------------------------------------------------------- Compliance

const COMPLIANCE: AdminNotes = {
  from: ['pages/Compliance.jsx'],
  title: 'Reading the compliance page',
  intro: [
    'The 24 baseline control families of the RBI Cyber Security Framework, with an assessed position against each. It is **read-only** — a statement of posture, not a set of switches, which is why it sits at the end of the section.',
    'Read the banner before the statuses. **These requirements apply to the bank, and RBI does not certify products.** A control marked *Complied* means the Controller gives the bank what it needs to meet that control — not that the product itself is RBI certified. Repeating the distinction is the point of the page being honest rather than a badge.',
  ],
  before: [
    'Superusers only.',
    'Nothing here can be changed from this page. The assessment is held in the source and updated with the product.',
  ],
  tasks: [
    {
      title: 'Find where the product stands on one control',
      steps: [
        'Open **Settings › Compliance**.',
        'Pick the control from the list on the left, or narrow it with **Filter controls…**.',
        'Read the panel on the right: **What RBI requires**, **Where we stand**, and **Supporting evidence**.',
      ],
    },
    {
      title: 'See only the controls that need work',
      steps: [
        'Click the **Not complied** or **Partial** count at the top. The counts double as filters.',
        'Click the active one again to clear it — there is no separate *All* button.',
      ],
      after: [
        'The control you were reading stays selected even when the filter hides it from the list, so narrowing the filter never blanks the panel mid-sentence.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'What the four counts mean',
      body: [
        '**Complied**, **Partial** and **Not complied** are the product’s position. **Bank scope** is different in kind: those are controls the bank has to meet through its own processes, where the product is not the thing being assessed. Counting them separately keeps them from reading as either a pass or a failure.',
        'The line beside the counts — *N of 24 control families need work* — adds the first two categories, not all four.',
      ],
    },
  ],
  verify: [
    'The counts across the top add up to 24.',
    'The assessment date in the header is the one to quote, not the date you opened the page.',
  ],
  trouble: [
    [
      'A status looks wrong for your deployment',
      'The assessment describes the product, not your installation. A control can be *Complied* in the product and unmet in a particular deployment.',
      'Treat the page as the product’s position and assess your own configuration separately.',
    ],
    [
      'Clicking a count hid the control you were reading',
      'It only hid it from the list. The panel keeps showing it deliberately.',
      'Click the active count again to clear the filter.',
    ],
  ],
  shotDir: 'compliance',
  shots: [
    { file: 'list.png', what: 'The four counts doubling as filters, the banner about what “complied” does and does not mean, and one control open with its requirement, position and evidence.', alt: 'Compliance' },
  ],
};

// ------------------------------------------------------------ Site Settings

const SITE: AdminNotes = {
  from: ['pages/SiteSettings.jsx'],
  title: 'Setting the site identity',
  intro: [
    'Two fields, and neither is cosmetic. **Domain** is what every alert email builds its links from, so a wrong value sends recipients to a host that does not resolve — and nothing on this page will tell you, because the links are only wrong in somebody else’s inbox.',
    'This is the smallest page in the console and one of the few where a typo reaches customers.',
  ],
  before: [
    'Superusers only.',
    'Have the hostname people actually reach this controller on — not the one it is deployed under internally, if those differ. The links in alert mail have to work from wherever the recipient opens them.',
  ],
  tasks: [
    {
      title: 'Change the domain or display name',
      steps: [
        'Open **Settings › Site Settings**.',
        'Edit **Domain**, **Display name**, or both. *Unsaved changes* appears in the footer as soon as anything differs.',
        'Press **Save**. Both buttons stay greyed out until there is something to save, so a page you have not touched cannot be saved by accident.',
        'To abandon the edit, press **Revert** — it restores the stored values without a round trip.',
      ],
      after: [
        'The console confirms *Site settings saved*. The change takes effect for the **next** email sent; mail already queued or delivered keeps the old links.',
      ],
      shot: 'form.png',
    },
  ],
  forms: [
    {
      title: 'the site form',
      source: 'pages/SiteSettings.jsx',
      opens: '**Settings › Site Settings**',
      fields: {
        Domain: {
          required: 'Yes',
          example: 'controller.example.com',
          // The hint says the rule and the reason; what it cannot say is how
          // the failure presents — which is the whole danger of this field.
          what: 'Nothing here enforces that. A value with a scheme or a trailing slash saves without complaint, mail still sends, nothing errors — and the first you hear of it is someone saying a link is broken.',
        },
        'Display name': {
          required: 'Yes',
          example: 'Nexapp Controller',
          what: 'Recipients see it before they see anything else, so it should name the system rather than the server.',
        },
      },
      after: [
        'Neither field is validated beyond being present. A domain with a scheme or a trailing slash is accepted and saved, and only misbehaves later, in the links.',
      ],
    },
  ],
  sections: [],
  verify: [
    'Reload the page: both values come back as you saved them.',
    'Trigger any alert and open the mail. The link should resolve from outside the network, not only from where you are sitting.',
  ],
  trouble: [
    [
      'Links in alert emails go nowhere',
      '**Domain** holds a value that is not a bare host — a scheme, a port the outside world cannot reach, a trailing slash — or simply the wrong name.',
      'Set it to the host alone and send a test alert to yourself.',
    ],
    [
      '**Save** is greyed out',
      'Nothing has changed. The button enables only once a value differs from what is stored.',
      'Not a fault — edit a field.',
    ],
    [
      'The old domain is still in mail that arrived after saving',
      'The change applies to mail sent after it. Anything already queued carries the old links.',
      'Wait for the next alert rather than re-saving.',
    ],
  ],
  shotDir: 'site',
  shots: [
    { file: 'form.png', what: 'The Site settings card — Domain and Display name with their hints, and Revert and Save greyed out until something is changed.', alt: 'Site settings' },
  ],
};

export const SETTINGS_NOTES: Record<string, AdminNotes> = {
  '/settings/site': SITE,
  '/settings/email-alerts': EMAIL_ALERTS,
  '/settings/notifications': NOTIFICATIONS,
  '/settings/maintenance': MAINTENANCE,
  '/settings/compliance': COMPLIANCE,
};
