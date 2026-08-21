import { PERMISSIONS, canOpenPortal } from './permissions';

/**
 * Where each portal's front door is.
 *
 * Keyed by the portal CAPABILITY rather than by role, which is the whole point:
 * a person may hold several, and which they hold is not decided by their role
 * alone. ROLE_DASHBOARDS still maps role -> one dashboard and is kept for the
 * forced-password-change redirect, where the role genuinely is the right key.
 */
export const PORTAL_DASHBOARDS = {
  [PERMISSIONS.PORTAL_ADMIN]:     '/admin/dashboard',
  [PERMISSIONS.PORTAL_DOCTOR]:    '/doctor/dashboard',
  [PERMISSIONS.PORTAL_STAFF]:     '/staff/dashboard',
  [PERMISSIONS.PORTAL_LAB]:       '/lab/dashboard',
  [PERMISSIONS.PORTAL_INPATIENT]: '/inpatient/dashboard',
  [PERMISSIONS.PORTAL_RADIOLOGY]: '/radiology/suite',
};

// Which portal a role is sent to FIRST when it can open more than one. A doctor
// who also reaches the ward and the Radiology Suite should still land on the
// doctor dashboard; only someone whose own portal has been withdrawn falls
// through to whatever else they hold.
const PREFERRED_BY_ROLE = {
  admin:  PERMISSIONS.PORTAL_ADMIN,
  doctor: PERMISSIONS.PORTAL_DOCTOR,
  staff:  PERMISSIONS.PORTAL_STAFF,
  lab:    PERMISSIONS.PORTAL_LAB,
  nurse:  PERMISSIONS.PORTAL_INPATIENT,
};

/** Every portal this user can open, as [capability, path] pairs. */
export const openableDashboards = (user) =>
  Object.entries(PORTAL_DASHBOARDS).filter(([portal]) => canOpenPortal(user, portal));

/**
 * Where this user should land after signing in.
 *
 * Returns null when they can open nothing — a real state, not an error, and one
 * the caller has to say something about rather than redirecting into a loop.
 *
 * This replaces five login pages that each hardcoded a destination and a
 * role -> one dashboard map. That was the same "one home portal per role"
 * assumption already removed from ROLE_DEFAULT_PORTALS when it locked doctors
 * out of the ward; it simply survived in the login path. The concrete failure:
 * withdraw a receptionist's portal.staff and grant portal.lab, and she was sent
 * to /staff/dashboard, refused by the route guard, and returned to the login
 * page — signed in, with no way to tell what had happened.
 *
 * Patients are unaffected: they have no portal capabilities and go to their own
 * dashboard, which is not one of the staff portals above.
 */
export const landingFor = (user) => {
  if (!user) return null;
  if (user.role === 'patient') return '/patient/dashboard';

  const preferred = PREFERRED_BY_ROLE[user.role];
  if (preferred && canOpenPortal(user, preferred)) return PORTAL_DASHBOARDS[preferred];

  const [first] = openableDashboards(user);
  return first ? first[1] : null;
};
