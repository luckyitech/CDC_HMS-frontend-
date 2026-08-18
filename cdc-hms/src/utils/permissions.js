// Permission names, mirroring the backend's constants/permissions.js.
//
// These drive which portals and menu entries appear. They are UX only — every
// endpoint is guarded server-side regardless, so hiding a link never has to be
// load-bearing. Keep the strings identical to the backend's; a mismatch here
// hides a feature from someone who is in fact allowed to use it.
//
// Named <section>.<verb>. A section with meaningful write actions carries both
// '.access' and '.write'; an all-or-nothing section carries only '.access'.
export const PERMISSIONS = {
  ADMIN_ACCESS: 'admin.access',
  // Split from the old all-or-nothing 'stock.manage', so someone can be given
  // visibility into stock without the ability to move the ledger.
  STOCK_ACCESS: 'stock.access',
  STOCK_WRITE: 'stock.write',
  INPATIENT_ACCESS: 'inpatient.access',
  INPATIENT_WRITE: 'inpatient.write',
};

/**
 * Does this user hold a capability?
 *
 * A real admin holds everything implicitly and stores nothing, exactly as on
 * the server, so "is this person an admin?" and "was this granted?" collapse
 * into one question everywhere in the UI.
 *
 * Note on withdrawals: an admin can explicitly withdraw a section from one
 * person, and `/auth/me` sends the list already RESOLVED — granted minus
 * withdrawn. So this function never has to know withdrawals exist, and no
 * screen reading the session user does either. The one place the two lists are
 * seen apart is the Staff File's Permissions tab, which is editing another
 * person's grants rather than acting on its own.
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};

/** Can this user use the admin portal — as the admin, or by grant? */
export const canAccessAdmin = (user) => hasPermission(user, PERMISSIONS.ADMIN_ACCESS);

/** The admin ACCOUNT, as opposed to someone granted admin capabilities. */
export const isTrueAdmin = (user) => user?.role === 'admin';
