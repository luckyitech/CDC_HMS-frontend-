import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUserContext } from '../../contexts/UserContext';
import { canOpenPortal, hasPermission, isTrueAdmin } from '../../utils/permissions';
import { landingFor } from '../../utils/landing';
import { portalDeniedMessage, PORTAL_LABELS, NO_PORTAL_MESSAGE } from '../../constants/accessMessages';
import NoAccess from './NoAccess';

/**
 * Send a signed-in user somewhere they can actually be, and say why.
 *
 * The old behaviour was <Navigate to="/" replace /> — and "/" is the LOGIN
 * page, so a signed-in person who reached a portal they could not open was
 * dropped back onto a login form with no explanation at all. The API already
 * raises a "you do not have permission" toast on a 403; a portal refusal is the
 * same event and had nothing.
 *
 * The toast id is fixed so a redirect that re-renders cannot stack duplicates.
 */
const refuse = (user, requiredPortal) => {
  const destination = landingFor(user);
  if (!destination) {
    // They can open nothing at all. Redirecting would loop, so this is a real
    // screen rather than a navigation.
    return <NoAccess message={NO_PORTAL_MESSAGE} />;
  }
  toast.error(portalDeniedMessage(PORTAL_LABELS[requiredPortal]), { id: 'portal-denied' });
  return <Navigate to={destination} replace />;
};

/**
 * Wraps a portal layout and ensures the logged-in user may be there.
 * If not authenticated → redirect to portal selector ("/").
 * If not permitted → redirect to portal selector ("/").
 *
 * requiredRole must match the lowercase DB role value:
 *   'staff' | 'doctor' | 'patient' | 'lab' | 'admin'
 *
 * Portal entry is a capability per portal: the real admin account reaches every
 * portal implicitly, and any other account is granted them one at a time.
 * Holding the admin portal no longer implies the others — being trusted to
 * manage users is not the same as being trusted to enter results in the lab.
 *
 * Also enforces scheduled password rotation: a user whose password has expired
 * is held on their portal's change-password page. That check runs BEFORE the
 * admin-capability shortcut below, or a doctor granted admin access would keep
 * roaming every portal on an expired password.
 *
 * This is UX. Every endpoint behind these screens is guarded server-side, so a
 * user who slipped past this would still be refused by the API.
 */
const ProtectedRoute = ({ requiredRole, requiredRoles, requiredPermission, requiredPortal, children }) => {
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

  // A real admin ACCOUNT still reaches everything — it holds every capability
  // implicitly, and it is the escape hatch that keeps the system administrable.
  if (isTrueAdmin(currentUser)) return children;

  // Portal entry. This used to be `if (canAccessAdmin(...)) return children` —
  // one capability that opened every portal at once, checked before the route
  // was even looked at. Now each portal is granted separately, so a person can
  // be given the Lab portal without being given the Admin portal.
  //
  // `portals` arrives resolved from the server (role's own portal + grants −
  // withdrawals), so there is one answer rather than one per screen.
  if (requiredPortal) {
    if (canOpenPortal(currentUser, requiredPortal)) return children;
    return refuse(currentUser, requiredPortal);
  }

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
  if (!allowed.includes(currentUser.role)) return refuse(currentUser, null);

  return children;
};

export default ProtectedRoute;
