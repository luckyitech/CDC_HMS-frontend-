import { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, Mail } from 'lucide-react';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import Toggle from '../../shared/Toggle';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import settingsService from '../../../services/settingsService';
import { notify } from '../../../utils/notify';

/**
 * System Settings → Security (19 Oct 2026). Two-factor sign-in: a one-time code
 * emailed on every password login, for every internal role.
 *
 * THE PRE-FLIGHT IS THE POINT OF THIS SCREEN, not the switch.
 *
 * Switching this on is the one settings change in the system that can lock
 * people out of a live clinic, and it does so silently — an account whose email
 * address cannot receive mail simply stops being able to sign in, and nobody
 * finds out until that person next tries. So the accounts that cannot receive a
 * code are named before the switch is touched, and turning it on while any
 * exist asks for confirmation naming them.
 *
 * The domain breakdown is shown as well, because the automatic check can only
 * catch provable placeholders (example.com, .test, .invalid). It cannot know
 * that one real domain is the clinic's mailbox and another is a leftover — an
 * administrator reading the list can.
 */

// Mirrors UNDELIVERABLE_IMPACT in the backend's utils/loginOtp.js. The two
// reasons are NOT equivalent and the screen must not present them as if they
// were: an account at a reserved domain can sign in today and will not be able
// to afterwards, which is a lockout this switch causes. An account with no
// email address has never been able to sign in — POST /auth/login finds the
// account by the address it was given — so it is worth showing as a dead
// account to tidy up, not as something this change breaks.
const REASON_TEXT = {
  'no-email': 'no email address on file — this account cannot sign in today either',
  'reserved-domain': 'address at a domain that cannot receive mail',
};

const TwoFactorSettingsTab = () => {
  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmOn, setConfirmOn] = useState(false);

  const load = () => settingsService.getTwoFactor()
    .then((res) => setState(res.data))
    .catch((err) => { setState(null); notify('error', err?.message || 'Could not load the two-factor setting'); });

  useEffect(() => { load(); }, []);

  const save = async (changes, message) => {
    setSaving(true);
    try {
      const res = await settingsService.setTwoFactor(changes);
      setState(res.data);
      notify('success', message);
    } catch (err) {
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not change the setting');
    } finally {
      setSaving(false);
      setConfirmOn(false);
    }
  };

  // Derived before handleToggle uses it, so the ordering reads the way it runs.
  const unreachable = state?.unreachableAccounts || [];
  const domains = state?.emailDomains || [];
  // Only the accounts this switch would actually break. The confirmation is
  // about those; a long-dead account with no address is not a reason to make
  // an administrator hesitate.
  const newLockouts = unreachable.filter((a) => a.impact === 'new-lockout');

  const handleToggle = (next) => {
    // Turning it OFF is immediate: the emergency is always "nobody can sign
    // in", never "too few people can", so the safe direction must never be
    // behind a dialog.
    if (!next) return save({ enabled: false }, 'Two-factor sign-in switched off');
    if (newLockouts.length) return setConfirmOn(true);
    return save({ enabled: true }, 'Two-factor sign-in switched on');
  };

  if (!state) return <div className="py-10 flex justify-center"><Spinner /></div>;

  const { enabled, ttlMinutes, maxAttempts, affectedRoles, accountsInScope } = state;

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-gray-700 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Two-factor sign-in</h3>
            <p className="text-sm text-gray-500">
              A one-time code emailed on every sign-in — {affectedRoles.join(', ')} ({accountsInScope} active accounts)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-gray-700">{enabled ? 'On' : 'Off'}</span>
          <Toggle
            checked={enabled}
            disabled={saving}
            onChange={handleToggle}
            label="Two-factor sign-in"
          />
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-gray-600">
        With this on, a correct email and password is no longer enough to open a session: the system emails a
        6-digit code and asks for it. Someone who has stolen or guessed a password still cannot sign in unless
        they also read that person&apos;s email. Codes last {ttlMinutes} minutes, can be used once, and die after{' '}
        {maxAttempts} wrong attempts.
      </p>

      {unreachable.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-amber-900">
                {unreachable.length} account{unreachable.length === 1 ? '' : 's'} cannot receive a code
                {newLockouts.length > 0 && newLockouts.length !== unreachable.length
                  && ` — ${newLockouts.length} of them can sign in today`}
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                {newLockouts.length === 0
                  ? 'None of these can sign in today either, so switching this on takes nothing away — but they are worth tidying up.'
                  : enabled
                    ? 'These people cannot sign in while this is on. Give them a working email address on their staff file.'
                    : 'Fix these before switching this on, or these people will not be able to sign in.'}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {unreachable.map((a) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.name}</span>{' '}
                    <span className="text-amber-700">({a.role})</span>{' '}
                    {a.email ? <span className="font-mono text-xs">{a.email}</span> : null}{' '}
                    — {REASON_TEXT[a.reason] || a.reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800">Where codes would go</p>
            <p className="mt-0.5 text-sm text-gray-600">
              Check that every domain below can actually receive mail. The system can only detect obvious
              placeholders — a real domain that nobody reads looks exactly like a working one.
            </p>
            <ul className="mt-2 grid gap-x-8 gap-y-1 text-sm text-gray-700 sm:grid-cols-2">
              {domains.map((d) => (
                <li key={d.domain} className="flex justify-between gap-3 border-b border-gray-100 py-0.5">
                  <span className="font-mono text-xs truncate">{d.domain}</span>
                  <span className="text-gray-500 flex-shrink-0">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        If the email relay ever fails and nobody can sign in, whoever has server access can switch this off
        from the command line with <code className="font-mono">npm run two-factor -- off</code> — it does not
        need anyone to be signed in.
      </p>

      <ConfirmActionModal
        isOpen={confirmOn}
        title="Switch two-factor sign-in on?"
        confirmLabel="Switch it on"
        message={
          `${newLockouts.length} account${newLockouts.length === 1 ? '' : 's'} can sign in today and will NOT be able to `
          + 'afterwards, because the address on the account cannot receive mail: '
          + newLockouts.map((a) => `${a.name} (${a.role})`).join(', ')
          + '. You can switch this back off at any time, from here or from the server.'
        }
        onClose={() => setConfirmOn(false)}
        onConfirm={() => save({ enabled: true }, 'Two-factor sign-in switched on')}
      />
    </Card>
  );
};

export default TwoFactorSettingsTab;
