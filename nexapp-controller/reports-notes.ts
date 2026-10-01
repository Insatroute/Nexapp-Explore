/**
 * Reports & Logs — guide notes, in the same shape as `admin-notes.ts` and
 * rendered by `guide-admin.ts` (images under `public/img/reports/<shotDir>/`).
 * Pinned by `check:descriptions` under `reports:<route>` to the files in `from`.
 *
 * Every claim was checked against those files. Where the screen and the server
 * disagree, the guide describes what the server does.
 */
import type { AdminNotes } from './admin-notes.ts';

// ------------------------------------------------------------------ Reports hub

const REPORTS: AdminNotes = {
  from: [
    'pages/ReportsHub.jsx',
    'pages/ReportSchedules.jsx',
    'components/reports/CustomizeWizard.jsx',
    'components/reports/ScheduleFormModal.jsx',
    'utils/reports.js',
    'controller_reports/api/views.py',
    'controller_reports/api/serializers.py',
    'controller_reports/models.py',
    'controller_reports/views.py',
    'controller_reports/scheduling.py',
    'controller_reports/runner.py',
    'controller_reports/exporter.py',
    'controller_reports/permissions.py',
  ],
  title: 'Using the reports page',
  intro: [
    'Three tiles sit at the top: **Reports available**, **Categories** and **Custom reports** (your own saved custom reports). Below them are two tabs. **Reports** lists the catalogue. **Custom** lists the custom reports you built. A custom report belongs to the person who saved it, so nobody else sees it, superusers included.',
    'The **card / table** switch on the right of the tab row sets how both tabs are drawn. Your browser remembers the choice. The table view shows **Report** (title and slug), **Category**, **Description** and **Updated**.',
  ],
  before: [
    'You need the **view report template** permission for this page to load at all. Creating, changing and deleting a custom report or a schedule also needs the add, change or delete permission on that model. Without it the server refuses the save, and the screen shows *Not authenticated — log in to the Django admin first.* even though you are signed in.',
    'The column list and device list in the custom-report wizard, and the **Excel** / **PDF** exports, come from older Django views that also require **Staff status**.',
  ],
  tasks: [
    {
      title: 'Find a report',
      steps: [
        'Open **Reports & Logs › Reports**.',
        'Click a category button (**All**, **Health**, **Network**, **Traffic**, **SLA** …) to list only that category. Only categories that hold at least one report get a button. Click the active one again to go back to all.',
        'Type into **Search reports…** and press **Search** (or Enter). The search matches the title, description, category and slug, in the browser over the list already loaded.',
        '**Reset** clears the search and the category.',
        'Click a card or a row to open the report.',
      ],
    },
    {
      title: 'Build a custom report',
      steps: [
        'Press **Custom report** in the header, or **New custom report** on the **Custom** tab. A four-step drawer opens: **Reports**, **Columns**, **Devices**, **Review**.',
        '**Reports:** fill **Report name** and tick one or more reports. Reports whose rows are not one per device are not offered here. Press **Next**.',
        '**Columns:** tick the columns you want, or use **Select all** / **Clear**. **Device Name** is always included and cannot be unticked. Press **Next**.',
        '**Devices:** tick the devices to include, or leave all unticked to include every device you can see. **Search devices…** narrows the list by device or organization name. Press **Next**.',
        '**Review:** check the summary; **Change** jumps back to a step. Press **Save report**. You land on the **Custom** tab with *Saved “…”.*',
      ],
      after: [
        '**Next** checks each step before moving on: *Give the report a name.*, *Select at least one report to combine.*, *Select at least one column.*',
        'The device list shows devices in your organizations, the first 500 by name. If it cannot load, the wizard says *Device list unavailable (…). You can still save for all devices.*',
      ],
      shot: 'form-new.png',
    },
    {
      title: 'Change or delete a custom report',
      steps: [
        'Open the **Custom** tab. Each card shows the reports it combines, how many columns, and **All devices** or the number of devices.',
        'Open the card’s **⋮** menu (top right). **Edit** reopens the wizard with the saved choices. **Delete** asks *Delete “…”?*: *The saved column and device selection is removed. The underlying reports are untouched.*',
      ],
      after: [
        'When editing, columns that the chosen reports no longer offer are dropped. A report you add starts with none of its optional columns ticked.',
      ],
    },
    {
      title: 'Email a report on a schedule',
      steps: [
        'Press **Scheduled reports** in the header. The page shows **Total schedules**, **Active**, **Next run** (the soonest send across active schedules) and **Emails sent**.',
        'Press **New schedule**, fill the drawer (see *Every field — the schedule form* below) and press **Save schedule**. The page shows *Schedule created.*',
        'Each row has **Pause** / **Resume**, **Edit** and **Delete**. Deleting asks *Delete schedule?*: the report *will stop being emailed. Past send history is kept.*',
        'The **History** tab lists each send: **Report**, **Sent at**, **Recipients**, **Range**, **Format** and **Status** (*sent* or *failed*, with the error under a failure).',
      ],
      after: [
        'The schedules list shows schedules you created **and** schedules that email you. The History tab shows only sends from schedules you created (superusers see all).',
        'The filter buttons are **All**, **Daily**, **Weekly** (*Every 7 days*), **Monthly** (*Month end*) and **Every 2 months**. Schedules every 3 days, 3 months or 4 months are only shown under **All**. **Search report or recipient…** matches the report title, the frequency and the recipients’ names and emails.',
      ],
      shot: 'schedule-form.png',
    },
  ],
  forms: [
    {
      title: 'the custom report wizard',
      source: 'components/reports/CustomizeWizard.jsx',
      opens: 'Opened by **Custom report**, **New custom report** or **⋮ › Edit**. Only the name is a typed field. Reports, columns and devices are ticked on the wizard’s steps.',
      fields: {
        'Report name': {
          required: 'Yes',
          example: 'Monthly network overview',
          checks: ['Give the report a name.', 'Report name is required.', 'Ensure this field has no more than 255 characters.'],
          what: 'Leading and trailing spaces are trimmed. Names do not have to be unique.',
        },
      },
    },
    {
      title: 'the schedule form',
      source: 'components/reports/ScheduleFormModal.jsx',
      opens: 'Opened by **New schedule** or a row’s **Edit** on **Scheduled reports**.',
      fields: {
        Report: { required: 'Yes', checks: ['Choose a report.'], what: 'Any catalogue report, or one of your custom reports (marked *(custom)*).' },
        Recipients: {
          extra: true,
          required: 'Yes',
          checks: ['Select at least one recipient.'],
          what: 'Tick the people to email. A superuser sees every active user. Anyone else sees the active, non-superuser members of their own organizations, including themselves.',
        },
        Frequency: {
          starts: 'Daily',
          what: '**Daily**, **Every 3 days**, **Every 7 days**, **Month end** (last day of the month), **Every 2 months**, **Every 3 months**, **Every 4 months**.',
        },
        'Send time': { required: 'Yes', starts: '09:00', checks: ['Send time is required.'], what: 'Server time of day for the first and later sends.' },
        'Start date': { required: 'Yes', starts: 'Today', checks: ['Start date is required.'], what: 'Dates before today cannot be picked. The first send is the first slot at or after this date and time that is still in the future.' },
        'Report range': { starts: 'Last 7 days', what: 'How far back each emailed report looks, counted back from the moment it is sent: **Last 3 days**, **Last 7 days**, **Last 30 days** or **Last 365 days**.' },
        Format: { starts: 'PDF', what: '**PDF**, or **CSV**. **CSV** attaches an Excel (.xlsx) file, not a CSV file.' },
        'Email template': { starts: '— Default (blank) —', what: 'One of the active email templates. Leave the default to send the built-in report email.' },
        'Email subject': {
          extra: true,
          required: 'On a new schedule',
          checks: ['email_subject: This field is required.'],
          what: 'The hint says the subject is taken from the report name when left blank. That is only true when you **edit** a schedule. On a **new** schedule the server refuses a blank subject, so fill it in.',
        },
      },
      after: [
        'The next send time is worked out by the server from **Start date**, **Send time** and **Frequency**. It is shown in the **Next run** column after saving.',
      ],
    },
  ],
  sections: [
    {
      title: 'How scheduled emails are sent',
      body: [
        'Once a minute the controller looks for active schedules whose next run has passed. For each one it moves the next run forward **before** it sends. A send that fails is recorded as *failed* in History and is not retried. The next attempt is the next scheduled slot.',
        'A schedule with no recipients left is skipped. Paused schedules (**Pause**) are skipped until resumed.',
        'The report is built as the person who created the schedule, so it holds the devices **they** can see, whoever receives it.',
        'A scheduled **custom report** is not the table you saved. It contains every column of each combined report plus a report-type column, and ignores the columns and devices you picked in the wizard.',
      ],
    },
  ],
  verify: [
    'A saved custom report appears on the **Custom** tab, and opening it shows the columns you chose.',
    'A new schedule appears on **Scheduled reports** as **Active** with a **Next run** time. After that time passes, a row appears on the **History** tab.',
  ],
  trouble: [
    ['*Could not load reports* with *Not authenticated — log in to the Django admin first.*', 'You lack the view-report permission, or your session ended.', 'Ask an administrator to grant the Reports permission to your group, or sign in again.'],
    ['*No reports match*', 'The search and category together match nothing.', 'Press **Clear filters**.'],
    ['A report you expected is not in the catalogue', 'It is limited to permission groups you are not in, or it is an internal report hidden from every list.', 'See *How the catalogue is put together* above.'],
    ['*These reports declare no selectable columns.* in the wizard', 'The chosen reports have no column list for custom reports.', 'Go **Back** and choose different reports.'],
    ['Saving a new schedule fails with *email_subject: This field is required.*', 'A blank subject is refused when creating.', 'Type an **Email subject**.'],
    ['Saving fails with *Not authenticated — log in to the Django admin first.*', 'You can view reports but lack the add, change or delete permission for custom reports or schedules.', 'Ask an administrator for that permission.'],
    ['A History row says *failed*', 'Building the report or sending the email raised an error. The message is under the status.', 'Fix the cause (mail settings, a deleted custom report). The schedule tries again at its next run.'],
  ],
  shotDir: 'reports',
  shots: [
    { file: 'list.png', what: 'The Reports page: the three tiles, the Reports and Custom tabs, the category buttons, the search row and the report cards.', alt: 'The Reports page' },
    { file: 'form-new.png', what: 'The custom report wizard on its first step: Report name and the reports to combine, grouped by category.', alt: 'Building a custom report' },
    { file: 'schedule-form.png', what: 'The New schedule drawer: Report, Recipients, Frequency, Send time, Start date, Report range, Format, Email template and Email subject.', alt: 'Scheduling a report' },
  ],
};

// ------------------------------------------------------------------ One report

const REPORT_VIEW: AdminNotes = {
  from: [
    'pages/ReportView.jsx',
    'utils/reports.js',
    'components/crud/ColumnPicker.jsx',
    'controller_reports/api/views.py',
    'controller_reports/views.py',
    'controller_reports/permissions.py',
  ],
  title: 'Reading a report',
  intro: [
    '<Callout type="info">**Read-only.** A report is built on demand from the controller’s data each time it opens or refreshes. Nothing here is stored or edited.</Callout>',
    'The header shows the report title with a **Period** badge (the window the report covered) and, for a custom report, a **Window** badge. The **Results** card shows how many rows and columns are on screen, then the table, ten rows per page by default.',
    'Most reports only include devices you are allowed to see. A superuser sees all devices. A user who belongs to device groups sees the devices in those groups that are also in their organizations. Anyone else sees the devices in their organizations.',
  ],
  before: [
    'You need the view-report permission. A report limited to certain permission groups answers *Report not available.* to anyone outside them.',
  ],
  tasks: [
    {
      title: 'Choose the time window',
      steps: [
        'Click the date field on the right of the filter row. A report opens on **Last 24 hours**.',
        'Pick a preset (**Last 24 hours**, **Last 7 days**, **Last 30 days**, **Last 90 days**, **Last 1 year**), or **Custom range** and then a start and end on the calendar. The report is fetched again for the new window.',
        'For traffic and application reports, which read DPI history, the longest preset is **Last 100 days** and older dates cannot be picked. The row says *DPI history is kept for 100 days.*',
      ],
      after: [
        'The window is sent in your browser’s local time, and the server reads it in its own time zone. If the two differ, the window is shifted by the difference.',
      ],
    },
    {
      title: 'Search, sort and choose columns',
      steps: [
        'Type into **Search rows…** and press **Search**. It searches the rows already loaded, and only the columns you can see.',
        'Click a column heading to sort by it. Click again to reverse. Values like `12.5%` sort as numbers, and blanks always sort last.',
        'Use **Columns** to hide or show columns. The first column cannot be hidden. Your choice is reset when you open the report again.',
      ],
    },
    {
      title: 'Export',
      steps: [
        'Press **Excel** to download an .xlsx file, or **PDF** to download a PDF (it opens in a new tab).',
      ],
      after: [
        'The file covers the same window and the **visible columns**. It does **not** apply your search or sort: it holds every row in the window.',
      ],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'Custom reports',
      body: [
        'A custom report opens on the same page. Its rows come from each report it combines, **one row per device name**. When two combined reports both have a row for the same device, only the **first** report’s row is kept. Columns that only the later report fills show **—** for that device. Reports with several rows per device (one per interface, for example) keep only one row per device.',
        'Its window presets are always the full list, including **Last 1 year**, even when it combines DPI reports, which only hold 100 days.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*No data for this window*', 'Nothing was recorded in the chosen window, or the devices the report reads from are not reporting.', 'Widen the time range, or press **Reload**.'],
    ['*No rows match*', 'The search matches nothing in the visible columns.', 'Press **Clear search**, or show the column that holds the value.'],
    ['*Could not load this report* with *Could not build this report: …*', 'A data source the report reads from failed (for example, the monitoring database is unreachable).', 'Press **Retry**. If it keeps failing, check the data source the message names.'],
    ['*Could not load this report* with *Report not available.*', 'The report does not exist, or it is limited to permission groups you are not in.', 'Ask an administrator.'],
    ['The Excel file has more rows than the screen', 'Exports ignore the search box.', 'Expected. Filter in Excel, or narrow the time window instead.'],
    ['A custom report shows **—** in columns that should have values', 'Only the first combined report’s row per device is kept.', 'Open that report on its own to see its values.'],
  ],
  shotDir: 'report-view',
  shots: [
    { file: 'list.png', what: 'One report open: the Period badge, the search row with the time-window field and Columns, the Excel and PDF buttons, and the result table.', alt: 'A report' },
  ],
};

// ------------------------------------------------------------------ Logs: shared

const LOG_TABLE_INTRO =
  'Ten rows per page by default (**/ page** goes up to 500). **Columns** hides columns for this visit only. Click a row to open every field in a side panel. **Refresh** fetches again.';

const CSV_NOTE =
  '**CSV** downloads **the page on screen only**, in the visible columns, with the stored values (a raw timestamp, `true` / `false`) rather than the formatted ones. To export more, set **/ page** to 500 first, then export each page.';

// ------------------------------------------------------------------ Access log

const ACCESS_LOG: AdminNotes = {
  from: [
    'pages/logs/AccessLog.jsx',
    'components/logs/LogTable.jsx',
    'accesslog/views.py',
    'accesslog/models.py',
    'accesslog/signals.py',
    'accesslog/retention.py',
  ],
  title: 'Reading the access log',
  intro: [
    '<Callout type="info">**Read-only.** Entries are written automatically. Nothing here can be added, edited or deleted.</Callout>',
    'One row per sign-in, sign-out or failed sign-in attempt, newest first. A row is written when someone signs in (**Login**), signs out (**Logout**) or enters wrong credentials (**Failed login**).',
    'Columns: **Time**, **Event**, **Status**, **Auth method** (login rows only: *Password*, *MFA*, or *MFA pending* when the password was accepted but the second factor never was), **Username**, **Email**, **IP address**, **Location** (looked up from the IP when the row was written; blank without the location database), **Browser**, **OS**, **Device**, **Session** and **User agent**. **Session** is a short code that identifies one sign-in. It is not the session key itself.',
    LOG_TABLE_INTRO + ' **Live** (on by default) refreshes the first page every 15 seconds.',
  ],
  before: [
    'You need the **view access event** permission.',
    'A superuser sees everyone’s events. Anyone else sees only their own: their sign-ins and sign-outs, plus failed attempts made with their username or email.',
  ],
  tasks: [
    {
      title: 'Find events',
      steps: [
        'Open **Reports & Logs › Logs › Access log**.',
        'Type into **Search username, email, IP…**. It matches the username, email, IP address, user agent and location, or an exact **Session** code. Results update shortly after you stop typing.',
        'Narrow by **Event type** (*Login*, *Logout*, *Failed login*, *Access*) or **Status** (*Success*, *Failed*).',
        'Set a window in the date field (**Today**, **Yesterday**, **This week**, **Last 7 days**, **Last 30 days**, or pick dates and times).',
        '**Reset** clears every filter.',
      ],
      after: [
        'The search runs on the server over the whole log, and the count in the subtitle follows it.',
        'To see everything from one sign-in, copy its **Session** code into the search box.',
      ],
    },
    {
      title: 'Export',
      steps: ['Press **CSV**.'],
      after: [CSV_NOTE],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'How long entries are kept',
      body: [
        'Every night at 02:15 the controller deletes entries older than the retention period, 365 days unless the controller’s settings set another value.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*Could not load the log* with *Not authenticated — log in to the Django admin first.*', 'You lack the view access event permission, or your session ended.', 'Ask an administrator for the permission, or sign in again.'],
    ['*Could not load the log* with *Rate limit exceeded*', 'More than 120 requests from you in one minute, for example several tabs with **Live** on.', 'Close the extra tabs or turn **Live** off, and wait a minute.'],
    ['**Event type › Access** never shows anything', 'Nothing in the controller writes events of that type.', 'Use Login, Logout or Failed login.'],
    ['You cannot see other people’s sign-ins', 'Only superusers see everyone’s events.', 'Expected.'],
    ['**Location** is blank', 'The controller has no location database, or the address is not in it.', 'Use the IP address.'],
  ],
  shotDir: 'access-log',
  shots: [
    { file: 'list.png', what: 'The Access log: search, Event type and Status filters, the date range, Live, Columns and CSV, and recent sign-in events.', alt: 'The Access log' },
  ],
};

// ------------------------------------------------------------------ Activity log

const ACTIVITY_LOG: AdminNotes = {
  from: [
    'pages/logs/ActivityLog.jsx',
    'components/logs/LogTable.jsx',
    'activity_logs/views.py',
    'activity_logs/models.py',
    'activity_logs/signals.py',
    'activity_logs/utils.py',
    'activity_logs/retention.py',
  ],
  title: 'Reading the activity log',
  intro: [
    '<Callout type="info">**Read-only.** Entries are written automatically. Nothing here can be added, edited or deleted.</Callout>',
    'One row per change a signed-in user made through the controller, newest first. A row is written when a user **creates**, **updates** or **deletes** a tracked object (devices, templates, VPNs, certificates, credentials, locations, monitoring checks and alerts, firmware, SD-WAN tunnels, IPsec and SLA profiles, applications, users, organizations, IPAM). Some features also write **Apply** rows when they push configuration.',
    'Changes made by background jobs are not recorded, because only requests from a signed-in user are logged. An update that changes nothing is not recorded either. Deleting an object together with the things that depend on it is recorded as one entry.',
    'Columns: **Time**, **User** (*system* when the user has since been deleted), **Action**, **Object type**, **Message** and **IP address**. ' + LOG_TABLE_INTRO + ' The side panel adds **Object**, **User agent** and **Changes**: the before and after value of each field an update changed. Passwords, keys, secrets and tokens show as `***`.',
  ],
  before: [
    'You need the **view activity log** permission.',
    'A superuser sees everyone’s entries. Anyone else sees only their own.',
  ],
  tasks: [
    {
      title: 'Find a change',
      steps: [
        'Open **Reports & Logs › Logs › Activity log**.',
        'Type into **Search user, IP, object…**. It matches the message, the object’s name, the username and the IP address on the server. It does not match **Object type**.',
        'Narrow by **Action** (*Create*, *Update*, *Delete*, *Apply*) and set a window in the date field.',
        'Click the row and read **Changes** to see what was changed.',
      ],
    },
    {
      title: 'Export',
      steps: ['Press **CSV**.'],
      after: [CSV_NOTE + ' **Changes** is not a column, so it is not in the file. Open the row to read it.'],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'How long entries are kept',
      body: [
        'Every night at 02:00 the controller deletes entries older than the retention period, 365 days unless the controller’s settings set another value.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*Could not load the log* with *Not authenticated — log in to the Django admin first.*', 'You lack the view activity log permission, or your session ended.', 'Ask an administrator, or sign in again.'],
    ['A change you made is missing', 'It was made by a background job, it changed nothing, or that kind of object is not tracked.', 'Check the object’s own history page, if it has one.'],
    ['Searching for an object type finds nothing', 'The search does not cover **Object type**.', 'Search for the object’s name or the message instead.'],
  ],
  shotDir: 'activity-log',
  shots: [
    { file: 'list.png', what: 'The Activity log: search, the Action filter, the date range, and recent create, update and delete entries.', alt: 'The Activity log' },
  ],
};

// ------------------------------------------------------------------ Device log

const DEVICE_LOG: AdminNotes = {
  from: [
    'pages/logs/DeviceLog.jsx',
    'components/logs/LogTable.jsx',
    'device_logs/views.py',
    'device_logs/models.py',
  ],
  title: 'Reading the device log',
  intro: [
    '<Callout type="info">**Read-only.** These are log lines the routers send to the controller’s log server. The page searches that server and keeps nothing itself.</Callout>',
    'Columns: **Receive Time**, **Type**, **Device**, **Source**, **From Port**, **Destination**, **To Port**, **Protocol**, **Action** (*accept*, *deny* …), **Severity** and **Message**. The side panel adds **Subtype**, **Interface**, **Bytes**, **Username**, **Log ID** and **Raw**: the line as received.',
    'With no dates chosen, the page shows only the **last 24 hours**. The log server cannot count matches, so there is no total and no page numbers, only **‹ Prev** and **Next ›**.',
  ],
  before: [
    'You need the **view device logs** permission.',
    'The page does not filter by organization. Anyone with that permission sees log lines from every router that sends to the log server.',
  ],
  tasks: [
    {
      title: 'Find log lines',
      steps: [
        'Open **Reports & Logs › Logs › Device log**.',
        'Pick a router in **All hostnames**. The list holds the hostnames seen in the last 24 hours.',
        'Narrow by **Severity** and **Action**, and type into **Search message, IP, category…**.',
        'To look further back than 24 hours, set **both** a start and an end in the date field. With only one end set, the page stays on the last 24 hours.',
      ],
      after: [
        'Filters are applied after a page is fetched, so a page can hold fewer rows than **/ page**, or none, while **Next ›** still offers more. Keep paging.',
        'A search only keeps lines whose message text contains the search text. A line where it appears only in another field is dropped.',
      ],
    },
    {
      title: 'Export',
      steps: ['Press **CSV**.'],
      after: [CSV_NOTE],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'How long lines are kept',
      body: [
        'The controller does not store these lines. How far back you can look depends on the log server’s own retention, which is set there.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*Nothing here* with *No device events in the last 24 hours.*', 'No router logged anything in the last day, or the routers are not sending to the log server.', 'Set a start and end date to look further back.'],
    ['*Could not load the log* with *Nexapp request timed out*', 'The log server did not answer in time.', 'Narrow the time range or filters, then **Retry**.'],
    ['*Cannot connect to Nexapp server* or *Log service unavailable*', 'The controller cannot reach the log server.', 'Check that the log server is running and reachable from the controller.'],
    ['*Not authenticated — log in to the Django admin first.* although you are signed in', 'Either you lack the view device logs permission, or the controller’s own credentials for the log server were refused (the page cannot tell these apart).', 'Check your permission first. If you have it, an administrator must fix the log-server credentials in the controller settings.'],
    ['A page shows few or no rows, but **Next ›** is enabled', 'Rows are filtered after each page is fetched.', 'Press **Next ›**.'],
    ['A router is missing from **All hostnames**', 'The list only holds routers seen in the last 24 hours.', 'Search for it by text instead.'],
  ],
  shotDir: 'device-log',
  shots: [
    { file: 'list.png', what: 'The Device log: search, the hostname, severity and action filters, the date range, and firewall lines with source, destination, ports and action.', alt: 'The Device log' },
  ],
};

// ------------------------------------------------------------------ Firmware log

const FIRMWARE_LOG: AdminNotes = {
  from: [
    'pages/logs/FirmwareLog.jsx',
    'components/logs/LogTable.jsx',
    'nexapp_firmware/api/views.py',
    'nexapp_firmware/api/pagination.py',
    'nexapp_firmware/constants.py',
    'nexapp_firmware/models.py',
  ],
  title: 'Reading the firmware log',
  intro: [
    '<Callout type="info">**Read-only.** Entries are written automatically. Nothing here can be added, edited or deleted.</Callout>',
    'Entries come from two places. Every minute the controller copies the upgrade audit trail from each online router. The controller also writes its own entry when an upgrade it ran completes, fails or is aborted. The controller’s entries appear even when the router cannot be reached.',
    'Columns: **Time**, **Device**, **Event**, **Version change** (from → to), **Method**, **Actor**, **Source IP** and **Error**. The side panel adds **Trace ID**, **Image SHA256**, **Backup ID**, **Reason**, **Health check** and **Raw**. There is no total and no page numbers, only **‹ Prev** and **Next ›**, so new entries do not shift the page you are reading.',
  ],
  before: [
    'You need the **view firmware audit entry** permission.',
    'A superuser sees every device. Anyone else sees entries for devices in their organizations.',
  ],
  tasks: [
    {
      title: 'Find an upgrade',
      steps: [
        'Open **Reports & Logs › Logs › Firmware log**.',
        'Choose **Success** or **Failed** in **All events**, or leave **All events** for both.',
        'Type into **Search event, actor, version…**. It matches the event, actor, versions, method and device name.',
        'Set a start in the date field to hide older entries.',
      ],
      after: [
        '**All events** means finished upgrades only: completed and failed. Steps along the way (initiated, image uploaded, backups) and the routers’ regular update checks are never shown. A router’s automatic rollback is not shown either, although the subtitle mentions rollbacks.',
        'Only the **start** of the date range is used. The end you pick is ignored, so the list always runs up to now.',
      ],
    },
    {
      title: 'Export',
      steps: ['Press **CSV**.'],
      after: [CSV_NOTE],
    },
  ],
  forms: [],
  sections: [
    {
      title: 'How long entries are kept',
      body: [
        'There is no scheduled clean-up. Entries stay until their device is deleted, which removes them with it.',
      ],
    },
  ],
  verify: [],
  trouble: [
    ['*Nothing here*', 'No upgrade has finished on a device you can see, or the routers have not synced their audit trail yet.', 'Wait for the next sync (every minute for online routers).'],
    ['An upgrade you started is missing', 'It is still in progress. Only finished upgrades are listed.', 'Check the device’s firmware page for progress.'],
    ['*Could not load the log* with *Not authenticated — log in to the Django admin first.*', 'You lack the view firmware audit entry permission, or your session ended.', 'Ask an administrator, or sign in again.'],
    ['*Request was throttled.*', 'More than 120 requests in one minute.', 'Wait a minute.'],
    ['Entries after the end date still appear', 'Only the start of the range is used.', 'Expected.'],
  ],
  shotDir: 'firmware-log',
  shots: [
    { file: 'list.png', what: 'The Firmware log: search, the All events filter, the date range, and upgrade outcomes with their version change.', alt: 'The Firmware log' },
  ],
};

export const REPORTS_NOTES: Record<string, AdminNotes> = {
  '/reports': REPORTS,
  '/reports/:slug': REPORT_VIEW,
  '/logs/access': ACCESS_LOG,
  '/logs/activity': ACTIVITY_LOG,
  '/logs/device': DEVICE_LOG,
  '/logs/firmware': FIRMWARE_LOG,
};
