import { Navigate, useLocation } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin } from '../../utils/permissions';

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
const ProtectedRoute = ({ requiredRole, children }) => {
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
  if (currentUser.role !== requiredRole) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
