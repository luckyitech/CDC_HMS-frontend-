import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canOpenPortal, isWithdrawn, passesAdminGate } from '../../utils/permissions';
import { landingFor } from '../../utils/landing';

/**
 * A page inside a portal that needs more than the portal itself.
 *
 * Permissions audit, 16 Oct 2026 (Emu): the sidebar hid what a person could
 * not use, but nothing guarded the URL — anyone who could open the portal
 * could type /admin/settings and the page loaded, then every call came back
 * refused with the toast suppressed, so they saw a working-looking page with
 * nothing on it. The rule is that what is not granted does not show: the page
 * now says so instead.
 *
 * Mirrors MainLayout's allowedEntry exactly, so a page is reachable precisely
 * when its menu item or tab is:
 *   permission   — shown only when GRANTED (or admin.access)
 *   withdrawnBy  — shown by role default, hidden once an admin WITHDRAWS it
 *   portal       — follows the portal grant (the Inpatient workspace)
 */
const PageGate = ({ permission, withdrawnBy, portal, children }) => {
  const { currentUser } = useUserContext();
  const allowed = !!currentUser
    && (!permission || passesAdminGate(currentUser, permission))
    && (!withdrawnBy || !isWithdrawn(currentUser, withdrawnBy))
    && (!portal || canOpenPortal(currentUser, portal));
  if (allowed) return children;

  const home = landingFor(currentUser);
  return (
    <div className="ui-surface max-w-md mx-auto mt-10 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
        <ShieldOff className="w-6 h-6 text-amber-500" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">This page is not open to you</h2>
      <p className="text-sm text-gray-600 mb-6">
        It has not been granted to your account. Ask an administrator if you need it.
      </p>
      {home && <Link to={home} className="text-sm font-semibold text-primary hover:underline">Back to your dashboard</Link>}
    </div>
  );
};

export default PageGate;
