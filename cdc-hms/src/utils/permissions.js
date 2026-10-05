// Permission names, mirroring the backend's constants/permissions.js.
//
// These drive which portals and menu entries appear. They are UX only — every
// endpoint is guarded server-side regardless, so hiding a link never has to be
// load-bearing. Keep the strings identical to the backend's; a mismatch here
// hides a feature from someone who is in fact allowed to use it.
//
// Two kinds of capability:
//
//   portal.*  — which portal SHELL a person may open. Frontend only: a portal is
//               a set of screens, not an API concept. The endpoints behind those
//               screens are gated by the functional capabilities below, which is
//               where the real boundary lives.
//
//   <area>.*  — what a person may DO. Global, not per portal: holding
//               'queue.write' means holding it wherever the queue appears. The
//               server only ever sees a token, never a portal, so a per-portal
//               right could not be enforced.
export const PERMISSIONS = {
  PORTAL_ADMIN:     'portal.admin',
  PORTAL_DOCTOR:    'portal.doctor',
  PORTAL_STAFF:     'portal.staff',
  PORTAL_LAB:       'portal.lab',
  PORTAL_INPATIENT: 'portal.inpatient',
  PORTAL_RADIOLOGY: 'portal.radiology',
  // HR Suite — staff time & attendance (B21). Every internal role by default.
  PORTAL_HR:        'portal.hr',

  ADMIN_ACCESS:    'admin.access',
  // The right to grant/withdraw capabilities on others. NOT covered by
  // admin.access and cannot be self-granted — mirrors the backend exactly.
  PERMISSIONS_GRANT: 'permissions.grant',
  USERS_VIEW:      'users.view',
  USERS_WRITE:     'users.write',
  CONFIG_WRITE:    'config.write',
  MONITORING_VIEW: 'monitoring.view',

  PATIENTS_WRITE:     'patients.write',
  QUEUE_WRITE:        'queue.write',
  APPOINTMENTS_VIEW:  'appointments.view',
  APPOINTMENTS_WRITE: 'appointments.write',
  DOCUMENTS_WRITE:    'documents.write',

  INPATIENT_ACCESS: 'inpatient.access',
  INPATIENT_WRITE:  'inpatient.write',
  STOCK_ACCESS:     'stock.access',
  STOCK_WRITE:      'stock.write',
  LAB_VIEW:         'lab.view',
  LAB_WRITE:        'lab.write',
  LABINBOX_VIEW:    'labinbox.view',
  LABINBOX_WRITE:   'labinbox.write',

  // Communications Inbox — patient messages on the clinic's WhatsApp number
  // (and later Facebook / Instagram). VIEW reads threads; WRITE replies, links,
  // files, books, escalates and sets reminders. Front desk, doctors and nurses
  // by role; lab by grant. Kept identical to the backend.
  COMMS_VIEW:       'comms.view',
  COMMS_WRITE:      'comms.write',
  EMAIL_USE:        'email.use',   // Staff Email (B26) — own mailbox in the Inbox
  PATIENT_EMAIL_VIEW: 'patientemail.view', // Staff Email phase 5 — read patient email threads

  // The clinical record, as opposed to the patient's identity and
  // administration. Reception needs to know who a patient is, where they are in
  // the queue and what they owe; they have no reason to read the consultation
  // note. Most staff hold these by being marked clinical rather than by an
  // explicit grant — see STAFF_TYPES below.
  CLINICAL_VIEW:    'clinical.view',
  CLINICAL_RECORD:  'clinical.record',

  GLP1_WRITE:       'glp1.write',
  EQUIPMENT_WRITE:  'equipment.write',
  STOCK_DISPENSE:   'stock.dispense',

  // Off by default and granted per person: which member of staff signs a scan
  // or runs a drug round differs between clinics.
  RADIOLOGY_WRITE:  'radiology.write',
  MAR_ADMINISTER:   'mar.administer',

  // HR Suite (B21). CHECKIN = tap the entrance tag, remember a phone, see one's
  // own record (every internal role by role). VIEW = everyone's attendance,
  // who is in, flags, the register. hr.write was split (HR Tier 3 Phase 0)
  // into AMEND / WORKHOURS / TAGS; the server expands a stored hr.write, so
  // the session never carries the old name.
  HR_CHECKIN:       'hr.checkin',
  HR_VIEW:          'hr.view',
  HR_ATTENDANCE_AMEND: 'hr.attendance.amend',
  HR_WORKHOURS:     'hr.workhours',
  HR_TAGS:          'hr.tags',
  // The confidential drawer of a staff file (contracts, appraisals,
  // disciplinary letters, archived files). Like permissions.grant it is NOT
  // covered by admin.access and held by nobody by role.
  HR_CONFIDENTIAL:  'hr.confidential',
  // HR Suite phase 2 — leave (B27, D8). All default to the admin role and are
  // covered by admin.access. LEAVE_APPROVE = be an approver on a colleague's
  // request; LEAVE_MANAGE = see, record and cancel everyone's leave;
  // LEAVE_POLICY = the yearly policy, holidays and entitlements (implies
  // LEAVE_MANAGE); HR_SETTINGS = HR Suite settings and tag keys (was
  // config.write).
  // hr.self (phase 2): one's OWN leave — every internal role by role.
  HR_SELF:          'hr.self',
  // hr.profile.approve (phase 4): decide colleagues' profile change requests.
  HR_PROFILE_APPROVE: 'hr.profile.approve',
  // hr.credentials (phase 5) was split (HR Tier 3) into CPD_VERIFY and
  // HR_EXPIRY_ALERTS.
  CPD_VERIFY:       'cpd.verify',
  HR_EXPIRY_ALERTS: 'hr.expiry.alerts',
  LEAVE_APPROVE:    'leave.approve',
  // LEAVE_MANAGE = record and cancel leave for others; it CARRIES the four
  // below (server-side bundle) — the session arrives with them resolved.
  LEAVE_MANAGE:     'leave.manage',
  LEAVE_POLICY:     'leave.policy',
  LEAVE_VIEW:       'leave.view',
  LEAVE_SICK:       'leave.sick',
  LEAVE_REQUIRED:   'leave.required',
  LEAVE_REGISTER:   'leave.register',
  LEAVE_HOLIDAYS:   'leave.holidays',
  LEAVE_ENTITLEMENTS: 'leave.entitlements',
  HR_SETTINGS:      'hr.settings',
  // HR Tier 3 Phase 0 — the staff file, split out of users.view / users.write
  // (which still carry all of these).
  STAFF_VIEW:       'staff.view',
  STAFF_EDIT:       'staff.edit',
  STAFF_ONBOARD:    'staff.onboard',
  STAFF_STATUS:     'staff.status',
  STAFF_DOCUMENTS:  'staff.documents',
  // HR Tier 3 Phase 1: the Departments / Positions lists and the tidy screen.
  HR_LISTS:         'hr.lists',
  // HR Tier 3 Phase 2: HR Suite → Reports (department-scoped server-side).
  HR_REPORTS:       'hr.reports',
  // HR Tier 3 Phase 3: onboarding checklists (scoped) and their templates.
  HR_ONBOARDING:    'hr.onboarding',
  HR_ONBOARDING_TEMPLATES: 'hr.onboarding.templates',
  // HR Tier 3 Phase 4: the shift roster (scoped) and the clinic's shift types.
  HR_ROSTER:        'hr.roster',
  HR_ROSTER_SHIFTS: 'hr.roster.shifts',
  // HR Tier 3 Phase 5: running appraisals (scoped) and reading every appraisal
  // (confidential — NOT carried by admin.access; see canReadAppraisals).
  HR_APPRAISALS_RUN: 'hr.appraisals.run',
  HR_APPRAISALS:     'hr.appraisals',
  // Grant HR permissions — never satisfied by admin.access (see canGrantHrPermissions).
  HR_GRANT:         'hr.grant',
};

// Clinical or non-clinical, mirroring the backend's STAFF_TYPES.
//
// The bundle each type carries is resolved SERVER-SIDE and arrives already
// folded into `permissions`, so nothing here recomputes it — the frontend gets
// the answer, not the inputs, exactly as it does for withdrawals. These values
// exist so the Staff File can display and edit the classification, and so a
// screen can say WHY something is missing rather than only that it is.
export const STAFF_TYPES = {
  CLINICAL:     'clinical',
  NON_CLINICAL: 'non_clinical',
};

export const STAFF_TYPE_LABELS = {
  [STAFF_TYPES.CLINICAL]:     'Clinical',
  [STAFF_TYPES.NON_CLINICAL]: 'Non-clinical',
};

/**
 * Does this person do clinical work?
 *
 * Treats an unset value as clinical, matching the backend: every row predates
 * the column, and access is removed by classifying people deliberately rather
 * than by a missing value.
 */
export const isClinical = (user) => user?.staffType !== STAFF_TYPES.NON_CLINICAL;

// Portals each role reaches without anything being granted. Mirrors the
// backend's ROLE_DEFAULT_PORTALS and is only used by the fallback below.
// A list per role: a doctor reaches their own portal, the ward and the
// Radiology Suite, so one "home" portal was never enough.
const ROLE_DEFAULT_PORTALS = {
  admin:  [PERMISSIONS.PORTAL_ADMIN, PERMISSIONS.PORTAL_HR],
  doctor: [PERMISSIONS.PORTAL_DOCTOR, PERMISSIONS.PORTAL_INPATIENT, PERMISSIONS.PORTAL_RADIOLOGY, PERMISSIONS.PORTAL_HR],
  staff:  [PERMISSIONS.PORTAL_STAFF,  PERMISSIONS.PORTAL_RADIOLOGY, PERMISSIONS.PORTAL_HR],
  lab:    [PERMISSIONS.PORTAL_LAB, PERMISSIONS.PORTAL_HR],
  nurse:  [PERMISSIONS.PORTAL_INPATIENT, PERMISSIONS.PORTAL_HR],
};

/**
 * Does this user hold a capability?
 *
 * A real admin holds everything implicitly and stores nothing, exactly as on
 * the server, so "is this person an admin?" and "was this granted?" collapse
 * into one question everywhere in the UI.
 *
 * Note on withdrawals: an admin can explicitly withdraw a capability from one
 * person, and the session payload arrives already RESOLVED — granted minus
 * withdrawn. So this never has to know withdrawals exist, and no screen reading
 * the session user does either. The two lists are only seen apart on the Staff
 * File's Permissions tab, which is editing someone else.
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};

/**
 * May this user open this portal shell?
 *
 * The session carries `portals` already resolved by the server — role's own
 * portal, plus grants, minus withdrawals — so this is normally a lookup.
 *
 * The fallback matters: a session created before this feature shipped has no
 * `portals` key, and treating that as "no portals" would sign every logged-in
 * user out of their own portal at deploy. So an older session falls back to
 * role home + granted capabilities, which is what the server would have said.
 */
export const canOpenPortal = (user, portalPermission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;

  if (Array.isArray(user.portals)) return user.portals.includes(portalPermission);

  // Fallback for a pre-feature session. Mirrors the backend: role's own portal,
  // an explicit grant, or full administrator access (which carries the door).
  return (ROLE_DEFAULT_PORTALS[user.role] || []).includes(portalPermission)
    || hasPermission(user, portalPermission)
    || (portalPermission === PERMISSIONS.PORTAL_ADMIN
        && hasPermission(user, PERMISSIONS.ADMIN_ACCESS));
};

/** Every portal this user may open — drives the portal switcher. */
export const openablePortals = (user) =>
  Object.values(PERMISSIONS)
    .filter((p) => p.startsWith('portal.'))
    .filter((p) => canOpenPortal(user, p));

/** Has this capability been explicitly withdrawn from this account? */
export const isWithdrawn = (user, permission) => {
  if (!user || user.role === 'admin') return false;   // never withdrawn from a real admin
  return Array.isArray(user.deniedPermissions) && user.deniedPermissions.includes(permission);
};

/**
 * Mirrors the backend's `authorize('admin', <capability>)` exactly.
 *
 * Those gates admit three kinds of caller: a real admin, anyone holding
 * admin.access, and anyone holding the capability itself — unless the
 * capability has been withdrawn, which authorize() checks first and which beats
 * everything.
 *
 * The menu has to agree with this or it lies in one of two directions: hiding a
 * screen from someone the API would let in, or offering one the API will refuse.
 */
export const passesAdminGate = (user, permission) => {
  if (isWithdrawn(user, permission)) return false;
  return hasPermission(user, PERMISSIONS.ADMIN_ACCESS) || hasPermission(user, permission);
};

// ---------------------------------------------------------------------------
// Capability gates for areas some roles hold by default and others are granted.
//
// ONE definition of "who may see/use this", so the sidebar, the page and every
// tab agree — the drift that hid the Lab reports tab from an admin.access holder
// while the sidebar still showed it came from three files each rolling their own
// `(role-list || hasPermission) && !isWithdrawn` check, and `hasPermission`
// silently ignores the admin.access bypass the API honours.
//
// A capability is usable when it has NOT been withdrawn AND the user either
// holds it by role, holds it explicitly, or holds admin.access (passesAdminGate
// mirrors the backend's authorize('admin', …) bypass). The role lists mirror the
// backend route guards; this is their single frontend copy.
// ---------------------------------------------------------------------------
export const COMMS_DEFAULT_ROLES = ['staff', 'doctor', 'nurse', 'admin'];
export const LABINBOX_DEFAULT_ROLES = ['staff', 'lab', 'admin'];

export const canUseCapability = (user, permission, defaultRoles = []) =>
  !isWithdrawn(user, permission)
  && ((defaultRoles.includes(user?.role)) || passesAdminGate(user, permission));

export const canViewComms     = (user) => canUseCapability(user, PERMISSIONS.COMMS_VIEW,     COMMS_DEFAULT_ROLES);
export const canWriteComms    = (user) => canUseCapability(user, PERMISSIONS.COMMS_WRITE,    COMMS_DEFAULT_ROLES);
export const canViewLabInbox  = (user) => canUseCapability(user, PERMISSIONS.LABINBOX_VIEW,  LABINBOX_DEFAULT_ROLES);
export const canWriteLabInbox = (user) => canUseCapability(user, PERMISSIONS.LABINBOX_WRITE, LABINBOX_DEFAULT_ROLES);

// HR Suite (B21). Mirrors routes/hr.js: CHECKIN lists every internal role;
// VIEW/WRITE list 'admin' only (admin.access reaches them through the bypass).
export const HR_DEFAULT_ROLES         = ['admin'];
export const HR_CHECKIN_DEFAULT_ROLES = ['doctor', 'staff', 'lab', 'nurse', 'admin'];
export const canViewHr  = (user) => canUseCapability(user, PERMISSIONS.HR_VIEW,    HR_DEFAULT_ROLES);
// HR Tier 3 Phase 0 — the three halves of the old hr.write.
export const canAmendAttendance = (user) => canUseCapability(user, PERMISSIONS.HR_ATTENDANCE_AMEND, HR_DEFAULT_ROLES);
export const canSetWorkHours    = (user) => canUseCapability(user, PERMISSIONS.HR_WORKHOURS,        HR_DEFAULT_ROLES);
export const canManageTags      = (user) => canUseCapability(user, PERMISSIONS.HR_TAGS,             HR_DEFAULT_ROLES);
// The staff file (routes/staff.js STAFF_*). users.view / users.write carry these.
export const canViewStaff           = (user) => canUseCapability(user, PERMISSIONS.STAFF_VIEW,      HR_DEFAULT_ROLES);
export const canEditStaff           = (user) => canUseCapability(user, PERMISSIONS.STAFF_EDIT,      HR_DEFAULT_ROLES);
export const canOnboardStaff        = (user) => canUseCapability(user, PERMISSIONS.STAFF_ONBOARD,   HR_DEFAULT_ROLES);
export const canChangeStaffStatus   = (user) => canUseCapability(user, PERMISSIONS.STAFF_STATUS,    HR_DEFAULT_ROLES);
export const canManageStaffDocuments = (user) => canUseCapability(user, PERMISSIONS.STAFF_DOCUMENTS, HR_DEFAULT_ROLES);
export const canManageLists         = (user) => canUseCapability(user, PERMISSIONS.HR_LISTS,        HR_DEFAULT_ROLES);
export const canViewHrReports       = (user) => canUseCapability(user, PERMISSIONS.HR_REPORTS,      HR_DEFAULT_ROLES);
export const canRunOnboarding       = (user) => canUseCapability(user, PERMISSIONS.HR_ONBOARDING,   HR_DEFAULT_ROLES);
export const canEditOnboardingTemplates = (user) => canUseCapability(user, PERMISSIONS.HR_ONBOARDING_TEMPLATES, HR_DEFAULT_ROLES);
export const canEditRoster          = (user) => canUseCapability(user, PERMISSIONS.HR_ROSTER,       HR_DEFAULT_ROLES);
export const canEditShiftTypes      = (user) => canUseCapability(user, PERMISSIONS.HR_ROSTER_SHIFTS, HR_DEFAULT_ROLES);
export const canRunAppraisals       = (user) => canUseCapability(user, PERMISSIONS.HR_APPRAISALS_RUN, HR_DEFAULT_ROLES);
export const canCheckIn = (user) => canUseCapability(user, PERMISSIONS.HR_CHECKIN, HR_CHECKIN_DEFAULT_ROLES);
// B27 — leave and HR settings. Mirrors routes/staff.js LEAVE_DECIDE /
// LEAVE_POLICY and routes/hr.js SETTINGS: the admin role, admin.access, or a
// grant. Who may decide WHICH request is still the server's call (never your
// own; leave.approve only when listed as an approver).
export const canApproveLeave      = (user) => canUseCapability(user, PERMISSIONS.LEAVE_APPROVE, HR_DEFAULT_ROLES);
// leave.policy ⇒ leave.manage is resolved by the server into the session.
export const canManageLeave       = (user) => canUseCapability(user, PERMISSIONS.LEAVE_MANAGE,  HR_DEFAULT_ROLES);
// HR Tier 3 Phase 0 — each part of leave its own control (leave.manage /
// leave.policy carry them; the session arrives with them resolved).
export const canViewAllLeave          = (user) => canUseCapability(user, PERMISSIONS.LEAVE_VIEW,         HR_DEFAULT_ROLES);
export const canSeeSickLeave          = (user) => canUseCapability(user, PERMISSIONS.LEAVE_SICK,         HR_DEFAULT_ROLES);
export const canSetRequiredApprovers  = (user) => canUseCapability(user, PERMISSIONS.LEAVE_REQUIRED,     HR_DEFAULT_ROLES);
export const canDownloadLeaveRegister = (user) => canUseCapability(user, PERMISSIONS.LEAVE_REGISTER,     HR_DEFAULT_ROLES);
export const canSetHolidays           = (user) => canUseCapability(user, PERMISSIONS.LEAVE_HOLIDAYS,     HR_DEFAULT_ROLES);
export const canSetEntitlements       = (user) => canUseCapability(user, PERMISSIONS.LEAVE_ENTITLEMENTS, HR_DEFAULT_ROLES);
export const canSetLeavePolicy    = (user) => canUseCapability(user, PERMISSIONS.LEAVE_POLICY,  HR_DEFAULT_ROLES);
export const canChangeHrSettings  = (user) => canUseCapability(user, PERMISSIONS.HR_SETTINGS,   HR_DEFAULT_ROLES);
// B27 phase 2 — my own leave (routes/hrSelf.js SELF): every internal role by
// role, withdrawable per person; admin.access passes like everywhere else.
export const canUseSelfService    = (user) => canUseCapability(user, PERMISSIONS.HR_SELF,       HR_CHECKIN_DEFAULT_ROLES);
// B27 phase 4 — routes/hr.js PROFILE_APPROVE.
export const canApproveProfileChanges = (user) => canUseCapability(user, PERMISSIONS.HR_PROFILE_APPROVE, HR_DEFAULT_ROLES);
// B27 phase 5 — routes/hr.js CPD_VERIFY (was hr.credentials).
export const canVerifyCpd = (user) => canUseCapability(user, PERMISSIONS.CPD_VERIFY, HR_DEFAULT_ROLES);
export const canGetExpiryAlerts = (user) => canUseCapability(user, PERMISSIONS.HR_EXPIRY_ALERTS, HR_DEFAULT_ROLES);

// Staff Email (B26). Mirrors routes/mail.js: every internal role by default,
// withdrawable per person. Only ever the user's OWN mailbox.
export const MAIL_DEFAULT_ROLES = ['doctor', 'staff', 'lab', 'nurse', 'admin'];
export const canUseMail = (user) => canUseCapability(user, PERMISSIONS.EMAIL_USE, MAIL_DEFAULT_ROLES);
// Phase 5 — reading the text of a patient's email threads. Mirrors
// routes/comms.js PATIENT_EMAIL_VIEW: doctors, nurses, admins by role; others by grant.
export const PATIENT_EMAIL_DEFAULT_ROLES = ['doctor', 'nurse', 'admin'];
export const canViewPatientEmail = (user) => canUseCapability(user, PERMISSIONS.PATIENT_EMAIL_VIEW, PATIENT_EMAIL_DEFAULT_ROLES);
// Adding a document to a patient's file — mirrors POST /api/documents
// (authorize('doctor','staff','admin','documents.write')). Used by Staff
// Email's "Save to patient file"; the server checks the same gate.
export const DOCUMENTS_WRITE_DEFAULT_ROLES = ['doctor', 'staff', 'admin'];
export const canFilePatientDocuments = (user) => canUseCapability(user, PERMISSIONS.DOCUMENTS_WRITE, DOCUMENTS_WRITE_DEFAULT_ROLES);

/** Can this user use the admin portal — as the admin, or by grant? */
export const canAccessAdmin = (user) => canOpenPortal(user, PERMISSIONS.PORTAL_ADMIN);

/** The admin ACCOUNT, as opposed to someone granted admin capabilities. */
export const isTrueAdmin = (user) => user?.role === 'admin';

/**
 * May this person grant or withdraw capabilities on someone else?
 *
 * A permissions.grant holder, or the true admin account as the no-lockout
 * fallback. Deliberately NOT satisfied by admin.access: an administrator runs
 * the clinic, a permissions administrator decides who else may. Mirrors
 * backend constants/permissions.js canGrantPermissions — UI only; the API
 * enforces the same rule regardless. Uses hasPermission (explicit grant) on
 * purpose, not passesAdminGate: the admin bypass must NOT apply here.
 */
export const canGrantPermissions = (user) =>
  isTrueAdmin(user) || hasPermission(user, PERMISSIONS.PERMISSIONS_GRANT);

/**
 * May this person change colleagues' HR Suite controls (HR Tier 3 Phase 0)?
 * An explicit hr.grant or the true admin — like canGrantPermissions, NOT
 * satisfied by admin.access. What they may change is limited server-side
 * (staffController.hrGrantRefusal); the Permissions tab mirrors it.
 */
export const canGrantHrPermissions = (user) =>
  isTrueAdmin(user) || hasPermission(user, PERMISSIONS.HR_GRANT);

/**
 * May this person open the confidential drawer of a staff file?
 *
 * An explicit grant of hr.confidential, or the true admin account. NOT
 * satisfied by admin.access — an administrator manages the file, reading a
 * colleague's contract is a separate trust. Mirrors backend canViewConfidential
 * (constants/permissions.js); the API enforces it regardless. The session's
 * `permissions` list arrives already resolved minus withdrawals, so a withdrawn
 * grant is simply absent here.
 */
export const canViewConfidential = (user) =>
  isTrueAdmin(user) || hasPermission(user, PERMISSIONS.HR_CONFIDENTIAL);

/**
 * Reading every appraisal (HR Tier 3 Phase 5, T3-10 a): an explicit grant of
 * hr.appraisals, or the true admin. NOT satisfied by admin.access. Mirrors the
 * backend canReadAppraisals; the API enforces it regardless.
 */
export const canReadAppraisals = (user) =>
  isTrueAdmin(user) || hasPermission(user, PERMISSIONS.HR_APPRAISALS);

/**
 * HR staff (HR Suite → Manual, 5 Oct 2026): whoever holds at least ONE HR
 * Suite control beyond Self-service. Mirrors the backend's HR_STAFF_CONTROLS
 * (derived there from the Permissions tab's HR groups minus "My profile and My
 * leave" / "Check in and out"); tests/hrManualChecklist.test.js keeps the two
 * lists equal. Each control is checked like canUseCapability(…, HR_DEFAULT_ROLES)
 * — the admin role and admin.access pass, a withdrawn control does not count —
 * so withdrawing one control never hides the manual from someone holding another.
 * Gates the Manual sidebar item and page; the API (routes/hrChecklist.js) enforces the same.
 */
export const HR_STAFF_CONTROLS = [
  PERMISSIONS.STAFF_VIEW, PERMISSIONS.STAFF_EDIT, PERMISSIONS.STAFF_ONBOARD, PERMISSIONS.STAFF_STATUS,
  PERMISSIONS.STAFF_DOCUMENTS, PERMISSIONS.HR_CONFIDENTIAL, PERMISSIONS.HR_LISTS, PERMISSIONS.HR_ONBOARDING,
  PERMISSIONS.HR_ONBOARDING_TEMPLATES, PERMISSIONS.HR_PROFILE_APPROVE,
  PERMISSIONS.HR_VIEW, PERMISSIONS.HR_ATTENDANCE_AMEND, PERMISSIONS.HR_WORKHOURS, PERMISSIONS.HR_ROSTER,
  PERMISSIONS.HR_ROSTER_SHIFTS, PERMISSIONS.HR_TAGS,
  PERMISSIONS.LEAVE_APPROVE, PERMISSIONS.LEAVE_VIEW, PERMISSIONS.LEAVE_SICK, PERMISSIONS.LEAVE_MANAGE,
  PERMISSIONS.LEAVE_REQUIRED, PERMISSIONS.LEAVE_REGISTER, PERMISSIONS.LEAVE_POLICY, PERMISSIONS.LEAVE_HOLIDAYS,
  PERMISSIONS.LEAVE_ENTITLEMENTS,
  PERMISSIONS.CPD_VERIFY, PERMISSIONS.HR_EXPIRY_ALERTS, PERMISSIONS.HR_APPRAISALS_RUN, PERMISSIONS.HR_APPRAISALS,
  PERMISSIONS.HR_SETTINGS, PERMISSIONS.HR_REPORTS, PERMISSIONS.HR_GRANT,
];
export const isHrStaff = (user) => !!user
  && HR_STAFF_CONTROLS.some((p) => canUseCapability(user, p, HR_DEFAULT_ROLES));
