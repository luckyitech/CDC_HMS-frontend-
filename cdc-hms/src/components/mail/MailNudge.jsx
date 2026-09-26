import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, X } from 'lucide-react';

const INBOX_ROLES = ['admin', 'doctor', 'staff', 'lab', 'nurse'];
const storageKey = (userId) => `cdc.mailNudge.dismissed.${userId}`;

const readDismissed = (userId) => {
  try { return localStorage.getItem(storageKey(userId)) === '1'; } catch { return false; }
};

/**
 * One-time "connect your email" prompt shown above every portal page until the
 * person connects their mailbox or presses Not now (remembered per user, in
 * this browser). Also a gentle "needs its password again" line when the
 * provider has refused the saved password. Quiet when the clinic hasn't set
 * email up (canSetUp false) — there'd be nothing to connect to.
 */
const MailNudge = ({ state, userId, role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));
  const [hiddenThisSession, setHiddenThisSession] = useState(false);

  if (!state || !userId || !INBOX_ROLES.includes(role)) return null;
  // Already on My mail — the setup card itself is showing; don't repeat it.
  if (/\/inbox$/.test(location.pathname) && new URLSearchParams(location.search).get('tab') === 'mail') return null;
  const inboxPath = `/${role}/inbox?tab=mail`;

  if (state.status === 'needs_password' && !hiddenThisSession) {
    return (
      <Bar tone="amber" onClose={() => setHiddenThisSession(true)}>
        Your mailbox needs its password again.
        <button type="button" onClick={() => navigate(inboxPath)} className="ml-2 font-semibold underline">Reconnect</button>
      </Bar>
    );
  }

  const neverConnected = !state.connected && (state.status === 'none' || state.status === 'disconnected');
  if (!neverConnected || !state.canSetUp || dismissed) return null;

  const notNow = () => {
    try { localStorage.setItem(storageKey(userId), '1'); } catch { /* private mode — hide for now */ }
    setDismissed(true);
  };

  return (
    <Bar tone="blue" onClose={notNow} closeLabel="Not now">
      Read your clinic email right here in the HMS.
      <button type="button" onClick={() => navigate(inboxPath)} className="ml-2 font-semibold underline">Set it up</button>
    </Bar>
  );
};

const Bar = ({ tone, children, onClose, closeLabel = 'Dismiss' }) => (
  <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
    tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}
  >
    <Mail className="h-4 w-4 flex-shrink-0" />
    <span className="min-w-0 flex-1">{children}</span>
    <button type="button" onClick={onClose} className="inline-flex items-center gap-1 text-xs font-semibold opacity-80 hover:opacity-100" aria-label={closeLabel}>
      {closeLabel === 'Not now' ? 'Not now' : <X className="h-4 w-4" />}
    </button>
  </div>
);

export default MailNudge;
