// Permission names, mirroring the backend's constants/permissions.js.
//
// These drive which portals and menu entries appear. They are UX only — every
// endpoint is guarded server-side regardless, so hiding a link never has to be
// load-bearing. Keep the strings identical to the backend's; a mismatch here
// hides a feature from someone who is in fact allowed to use it.
export const PERMISSIONS = {
  ADMIN_ACCESS: 'admin.access',
  STOCK_MANAGE: 'stock.manage',
  BILLING_MANAGE: 'billing.manage',
  BILLING_VIEW_PRICES: 'billing.viewPrices',
};

/**
 * Does this user hold a capability?
 *
 * A real admin holds everything implicitly and stores nothing, exactly as on
 * the server, so "is this person an admin?" and "was this granted?" collapse
 * into one question everywhere in the UI.
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

/** Can this user run the billing desk — issue bills, take payments, set prices? */
export const canManageBilling = (user) => hasPermission(user, PERMISSIONS.BILLING_MANAGE);

/**
 * May this user see prices at all?
 *
 * Clinical staff are money-blind unless granted. The server already strips
 * price fields from its responses for anyone without this, so the UI never has
 * to hide a number it was sent — this only decides whether to render a column
 * that would otherwise be empty. `billing.manage` implies it, resolved by the
 * server when it builds the user's permission list.
 */
export const canViewPrices = (user) => hasPermission(user, PERMISSIONS.BILLING_VIEW_PRICES);
