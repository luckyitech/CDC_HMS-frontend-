// Where a user row opens to, shared by every admin list that shows users
// (Manage Users, the Admin Dashboard's recent accounts). Kept in one place so
// a row opens the same file wherever it is clicked.

// Roles that have a Staff File (clicking the name opens /admin/staff/:id).
export const STAFF_FILE_ROLES = ['doctor', 'staff', 'lab', 'nurse', 'admin'];

// Staff-type accounts open their Staff File; patients open the shared patient
// profile — the SAME component and route the staff portal uses
// (/…/patient-profile/:uhid) so a patient file is opened the same way in every
// portal. Returns null when there's nothing to open.
// Staff resolve on employeeId (EMP014) rather than the database PK, mirroring
// how patients resolve on uhid — the same reason neither URL exposes a row id.
// A staff account with no employeeId yet (a legacy row the backfill has not
// reached) returns null and renders as plain text rather than a dead link.
export const fileHref = (user) =>
  STAFF_FILE_ROLES.includes(user.role)
    ? (user.employeeId ? `/admin/staff/${user.employeeId}` : null)
    : user.uhid ? `/admin/patient-profile/${user.uhid}`
    : null;
