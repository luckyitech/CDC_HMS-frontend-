import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin, hasPermission } from '../../utils/permissions';

/**
 * Wraps a portal layout and ensures the logged-in user may be there.
 * If not authenticated → redirect to portal selector ("/").
 * If not permitted → redirect to portal selector ("/").
 *
 * requiredRole must match the lowercase DB role value:
 *   'staff' | 'doctor' | 'patient' | 'lab' | 'admin'
 *
 * Admin access is a capability, not only a role: the real admin account has it
 * implicitly, and a doctor/staff/lab account can be granted it. Holding it also
 * carries the existing "admin can look at any portal" behaviour, since someone
 * trusted with the admin portal is trusted with the others.
 *
 * Also enforces scheduled password rotation: a user whose password has expired
 * is held on their portal's change-password page. That check runs BEFORE the
 * admin-capability shortcut below, or a doctor granted admin access would keep
 * roaming every portal on an expired password.
 *
 * This is UX. Every endpoint behind these screens is guarded server-side, so a
 * user who slipped past this would still be refused by the API.
 */
const ProtectedRoute = ({ requiredRole, requiredRoles, requiredPermission, children }) => {
  const { currentUser } = useUserContext();
  const location = useLocation();

  if (!currentUser) return <Navigate to="/" replace />;

  if (currentUser.mustChangePassword) {
    // Route within the portal the user actually belongs to, not the one they
    // asked for — a doctor with admin access browsing /admin/* would otherwise
    // be sent to a change-password page under a portal that is not theirs.
    const changePasswordPath = `/${currentUser.role}/change-password`;
    if (location.pathname !== changePasswordPath) {
      return <Navigate to={changePasswordPath} replace />;
    }
    return children;
  }

  if (canAccessAdmin(currentUser)) return children;

  // A route may also be reached by a granted capability, not only a role — e.g.
  // the inpatient workspace is open to doctors/nurses by role, plus anyone the
  // admin has granted inpatient.access. Mirrors the backend's permission-aware
  // authorize().
  if (requiredPermission && hasPermission(currentUser, requiredPermission)) return children;

  // Multi-role support (HMIS V3): a route may allow several roles (e.g. the
  // inpatient workspace is entered by both doctors and nurses). Falls back to
  // the single requiredRole prop for existing routes. Admin access is handled
  // above via the permissions-aware canAccessAdmin (V2), not a raw role check.
  const allowed = requiredRoles ?? [requiredRole];
  if (!allowed.includes(currentUser.role)) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
