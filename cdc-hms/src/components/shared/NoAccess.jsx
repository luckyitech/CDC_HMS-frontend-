import { ShieldOff, LogOut } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import Button from './Button';

/**
 * Shown to someone who is signed in but can open nothing.
 *
 * A rare state, and one that must not be a redirect: there is nowhere to send
 * them, so navigating anywhere would loop. It happens when every portal has
 * been withdrawn from an account that still has a working login — usually an
 * admin part-way through changing someone's access, occasionally a mistake.
 *
 * The screen exists because the alternative was worse. The route guard used to
 * bounce these users to "/", which is the login page: they would sign in
 * successfully and immediately find themselves looking at a login form again,
 * with no message, apparently unable to log in at all.
 *
 * Deliberately says who to ask, and offers the way out (sign out), rather than
 * leaving someone stuck on a page with no action on it.
 */
const NoAccess = ({ message }) => {
  const { logout } = useUserContext();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-6 h-6 text-amber-500" />
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Nothing to open yet
        </h1>

        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>

        <Button variant="secondary" onClick={logout} className="inline-flex items-center gap-2">
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default NoAccess;
