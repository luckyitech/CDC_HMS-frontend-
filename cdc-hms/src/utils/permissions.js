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

  ADMIN_ACCESS:    'admin.access',
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
};

// The portal each role reaches without anything being granted. Mirrors the
// backend's ROLE_HOME_PORTAL and is only used by the fallback below.
const ROLE_HOME_PORTAL = {
  admin:  PERMISSIONS.PORTAL_ADMIN,
  doctor: PERMISSIONS.PORTAL_DOCTOR,
  staff:  PERMISSIONS.PORTAL_STAFF,
  lab:    PERMISSIONS.PORTAL_LAB,
  nurse:  PERMISSIONS.PORTAL_INPATIENT,
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
  return ROLE_HOME_PORTAL[user.role] === portalPermission
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

/** Can this user use the admin portal — as the admin, or by grant? */
export const canAccessAdmin = (user) => canOpenPortal(user, PERMISSIONS.PORTAL_ADMIN);

/** The admin ACCOUNT, as opposed to someone granted admin capabilities. */
export const isTrueAdmin = (user) => user?.role === 'admin';
