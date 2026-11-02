import { useEffect, useRef, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import Card from '../shared/Card';
import Button from '../shared/Button';

// The check-in gate (2 Nov 2026, Emu): shown in place of the sign-in form when
// the server answers 423 CHECKIN_REQUIRED (backend services/checkinGate.js).
// "Check again" — and the automatic re-check every `retrySeconds` for
// AUTO_MINUTES — sends the gate ticket that answer carried, never the
// password. A punch reaches the HMS within about a minute (the scanner relay).

const AUTO_MINUTES = 3;

const punchText = (iso) => {
  if (!iso) return 'None yet';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

/**
 * @param {object}   props.details   the 423 body: firstName, scanner { label, online }, lastPunchAt, retrySeconds
 * @param {Function} props.onRetry   signs in again; resolves when that attempt is answered
 * @param {Function} props.onCancel  back to the sign-in form (a different account)
 */
const CheckinGateCard = ({ details, onRetry, onCancel }) => {
  const every = Math.max(5, Number(details?.retrySeconds) || 15);
  const [left, setLeft] = useState(every);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const leftRef = useRef(every);
  const started = useRef(Date.now());
  const auto = Date.now() - started.current < AUTO_MINUTES * 60 * 1000;

  const retry = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try { await onRetry(); } finally { busyRef.current = false; setBusy(false); leftRef.current = every; setLeft(every); }
  };
  const retryRef = useRef(retry);
  retryRef.current = retry;

  // The countdown only counts; the re-check is started from the interval
  // itself, never from inside a state update (React may run those twice).
  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => {
      leftRef.current = leftRef.current <= 1 ? every : leftRef.current - 1;
      setLeft(leftRef.current);
      if (leftRef.current === every) retryRef.current();
    }, 1000);
    return () => clearInterval(t);
  }, [auto, every]);

  const name = details?.firstName ? `Hi ${details.firstName}. ` : '';

  return (
    <Card>
      <div className="space-y-3" role="status" aria-live="polite">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1">
          <Fingerprint className="w-3.5 h-3.5" aria-hidden="true" /> Not checked in today
        </span>
        <h2 className="text-lg font-bold text-gray-900 leading-snug">Please check in at the scanner first</h2>
        <p className="text-sm text-gray-600">
          {name}The HMS opens once you have checked in today
          {details?.scanner ? ' with your fingerprint, card or check-in phone.' : ' — tap your check-in phone on the entrance tag.'}
        </p>
        <p className="text-sm text-gray-600">If you have just punched in, wait a moment: it can take up to a minute to reach the HMS.</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs bg-blue-50 rounded-lg px-3 py-2.5">
          {details?.scanner && (
            <>
              <dt className="text-gray-500">Scanner</dt>
              <dd className="text-gray-800">{details.scanner.label} · online</dd>
            </>
          )}
          <dt className="text-gray-500">Your last punch</dt>
          <dd className="text-gray-800 tabular-nums">{punchText(details?.lastPunchAt)}</dd>
          <dt className="text-gray-500">Checking again</dt>
          <dd className="text-gray-800 tabular-nums">{busy ? 'now…' : (auto ? `in ${left} s` : 'when you press the button')}</dd>
        </dl>
        <Button className="w-full" onClick={retry} disabled={busy}>{busy ? 'Checking…' : 'Check again'}</Button>
        <button type="button" onClick={onCancel} className="w-full text-sm font-semibold text-primary hover:underline py-1">
          Use a different account
        </button>
      </div>
    </Card>
  );
};

export default CheckinGateCard;
