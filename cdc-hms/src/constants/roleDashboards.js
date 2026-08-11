/**
 * Where each role lands after signing in, or after finishing a forced action.
 *
 * Used in:
 *   - pages/auth/LoginPage.jsx        (redirect after login)
 *   - pages/shared/ChangePasswordPage.jsx (redirect after a forced password change)
 *
 * Both previously kept their own copy, which is exactly the sort of thing that
 * drifts the day a portal's landing route changes.
 */
export const ROLE_DASHBOARDS = {
  doctor:  '/doctor/dashboard',
  staff:   '/staff/dashboard',
  lab:     '/lab/dashboard',
  patient: '/patient/dashboard',
  admin:   '/admin/dashboard',
};

/** The dashboard for a role, falling back to the portal selector. */
export const dashboardFor = (role) => ROLE_DASHBOARDS[role] || '/';

export default ROLE_DASHBOARDS;
