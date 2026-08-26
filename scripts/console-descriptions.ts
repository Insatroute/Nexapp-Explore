/**
 * Descriptions for console pages that carry NEITHER a product-tour entry NOR a
 * view header comment.
 *
 * Every line below was written by reading the page's own source — the API
 * functions it imports and the endpoints it calls — and each entry records that
 * evidence in `from`. Nothing here is inferred from a page's name.
 *
 * If you add a page to the console, leave it out of this file until you have read
 * it. The generator marks an undescribed page as a visible gap, which is the
 * correct outcome: a knowledge base people rely on must never present a guess in
 * the same voice as a verified fact.
 */
export interface CuratedDescription {
  /** What the page is for. */
  text: string;
  /** The source read to write it — API functions imported, or endpoints called. */
  from: string;
}

export const CURATED: Record<string, CuratedDescription> = {
  analytics: {
    text:
      'Fleet-wide charts rather than a single moment: an alarm summary, how devices split across network interfaces and mobile operators, signal-strength distribution and a traffic trend. Alongside them sit ranked lists — the devices moving the most data in a day, the best online rates, and the worst signal in the fleet.',
    from: "calls /stat/analysis/{getAlarmCard,getNetifPie,getOperatorPie,getSignalStrength,getTrafficTrend} and /stat/rank/{getDevDayFlowTopList,getDevOnlineRateTopList,getWorstSignalTopList}",
  },
  'device-tags': {
    text:
      'Create, rename and delete the free-form labels used to slice the fleet. Tags are applied to devices elsewhere; this page owns the vocabulary itself.',
    from: 'imports tagList, tagAdd, tagEdit, tagDelete from @/api/tag',
  },
  'device-groups': {
    text:
      'The device group tree — create, rename, move and delete the groups that devices are acted on through. Groups are hierarchical, so a region can contain sites which contain devices.',
    from: 'imports groupTree, groupAdd, groupEdit, groupDelete from @/api/group',
  },
  'device-passwords': {
    text:
      'Credential state for every device in one table: the web admin, SSH and Wi-Fi passwords, and how old the oldest of them is. Rotation is driven from here, either for a single device or for everything flagged at risk.',
    from: 'imports credentialStatus; renders columns Device/Serial/Web admin/SSH/Wi-Fi/Oldest/State with actions Rotate and "Rotate all at risk"',
  },
  scheduled: {
    text:
      'Recurring jobs. Each entry is a timer that can be started and stopped independently, and a job can run a zero-touch provisioning template on a schedule rather than on first contact.',
    from: 'imports sysTimerPage, sysTimerAdd, sysTimerEdit, sysTimerDelete, sysTimerStart, sysTimerStop and ztpTemplateDropdown',
  },
  'alarm-overview': {
    text:
      'The working view for alarms happening now: active records with acknowledgement, the rules behind them, summary statistics and the receivers that would be notified. It also checks the organization mail configuration, since a rule that fires into broken email reaches nobody.',
    from: 'imports alarmRecordPage, alarmRecordAck, alarmRulePage, alarmStats, receiverList, emailConfigGet',
  },
  'alarm-template': {
    text:
      'The wording of alarm notifications. A template owns the subject and body a receiver is sent, kept separate from the rule so message text can change without touching what counts as a problem.',
    from: 'imports alarmTemplateList, alarmTemplateAdd, alarmTemplateEdit, alarmTemplateDelete; columns Name, Subject',
  },
  'log-device': {
    text:
      'Device-originated log entries, filterable by device and time window using the same presets as every other log page — Today, Yesterday, or the last 7, 30, 60 or 90 days.',
    from: 'imports deviceLogPage; date presets from views/log/logMeta.ts logDatePresets()',
  },
  'log-firmware': {
    text:
      'A record of firmware activity — which image went to which device, when, and how it ended. This is where an upgrade that reported success but left a device unreachable is reconstructed.',
    from: 'imports firmwareLogPage; date presets from views/log/logMeta.ts logDatePresets()',
  },
  'system-overview': {
    text:
      'A summary of the organization\'s own configuration, gathering counts from users, roles, organizations, permission entries and platform settings, plus any pending tenant requests and the state of email delivery. It is a starting point that links onward rather than a page you edit.',
    from: 'imports sysUserPage, sysRoleList, sysOrgList, sysMenuList, sysConfigPage, registrationsPage, emailConfigGet',
  },
  'system-account': {
    text:
      'User accounts and the invitations that create them. Alongside adding and editing people it covers the whole life of an account — suspending it, resetting a password, and resending or revoking an invitation that has not been taken up.',
    from: 'imports sysUserPage, sysUserChangeStatus, sysUserDelete, sysUserResetPwd, invitePage, inviteResend, inviteRevoke',
  },
  'system-org': {
    text:
      'The organizations themselves — creating, editing and removing them, and viewing the tree they form. This page also holds the organization device secret, the enrolment credential a router presents to prove which tenant it belongs to.',
    from: 'imports sysOrgList, sysOrgTree, sysOrgAdd, sysOrgEdit, sysOrgDelete, sysOrgDeviceSecret',
  },
  'system-role': {
    text:
      'Roles, and what each one may reach. A role grants two separate things: the menus and actions it can use, and the data scope it can see. Both are assigned here, and a role can be disabled without deleting it.',
    from: 'imports sysRoleAdd, sysRoleEdit, sysRoleDelete, sysRoleChangeStatus, sysRoleGrantMenu, sysRoleGrantData, sysRoleOwnData, sysMenuTreeForGrant',
  },
  'system-menu': {
    text:
      'The underlying permission entries that roles are built from — the catalogue of menus and actions the console knows about. Editing here changes what can be granted, not what any one person holds.',
    from: 'imports sysMenuList, sysMenuTree, sysMenuAdd, sysMenuEdit, sysMenuDelete',
  },
  'system-config': {
    text:
      'Global platform settings, including the authentication policy applied across sign-in. Restricted to platform administrators because these values are org-less and apply to every tenant at once.',
    from: 'imports sysConfigPage, sysConfigAdd, sysConfigEdit, sysConfigDelete, sysAuthSettings, sysAuthSettingsSave',
  },
  'system-email': {
    text:
      'Outbound mail configuration, and a test that proves it. Worth exercising before relying on alarms: a correct rule delivering into a broken mail setup looks exactly like a quiet network.',
    from: 'imports emailConfigGet, emailConfigSave, emailConfigTest',
  },
  'system-registrations': {
    text:
      'The queue of companies that have signed up and are waiting to become tenants. Each request shows the organization, its requested subdomain, the owner and when it arrived, and is either approved or rejected here. Approving one creates a real organization on the platform, which is why it is restricted to platform administrators.',
    from: 'imports registrationsPage, approveRegistration, rejectRegistration; columns Organization, Subdomain, Owner, Requested, Status',
  },
  'api-docs': {
    text:
      'The interactive API browser, opened in a new tab rather than inside the console. It is served by the platform itself and is restricted to Nexapp staff, since it describes every route the control plane exposes.',
    from: "MainLayout.vue externalLinks maps 'api-docs' to /api/docs and the entry is superOnly; backend router.go serves it behind platformOnly",
  },
};
