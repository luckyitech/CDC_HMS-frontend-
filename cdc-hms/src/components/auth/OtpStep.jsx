import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import Button from '../shared/Button';

/**
 * The code step of a two-factor sign-in.
 *
 * ONE COMPONENT, TWO CALLERS. Both the main login page and the HR tap page
 * (pages/hr/TapLanding.jsx) sign in with a password, so both now need this
 * step. A copy in each would be two places for the attempt-counting, the
 * resend cap and the "start again" wording to drift apart — and the tap page
 * is the one nobody tests by hand, because it needs an NFC tag.
 *
 * Owns only the code box and the two actions. Verifying is the caller's job
 * (`onVerify`), because what happens next differs: the login page routes by
 * what the account can open, the tap page posts a check-in.
 *
 * Props:
 *   challengeId     from the login response — identifies this sign-in
 *   maskedEmail     'a••••@gmail.com', for "we sent a code to…"
 *   expiresMinutes  code lifetime, as the server decided it
 *   onVerify(code)  → { success, message?, code? }  (the context's verifyOtp)
 *   onResend()      → { success, message? }         (the context's resendOtp)
 *   onRestart()     back to the email/password form
 *   busy            caller-driven disable, e.g. while it routes onward
 */
const OtpStep = ({
  challengeId,
  maskedEmail,
  expiresMinutes = 10,
  onVerify,
  onResend,
  onRestart,
  busy = false,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);
  // Null until the server tells us, so a fresh screen never implies a limit
  // that is not real.
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(expiresMinutes * 60);
  // THIS CHALLENGE IS OVER — expired, used, or out of attempts. Tracked
  // separately from the countdown because it changes what the screen should
  // OFFER, not just what it says: a dead challenge cannot be resent (the
  // server refuses resend on one), so "ask for a new code below" would send
  // the user into a dead end. The only way on is a fresh sign-in.
  const [finished, setFinished] = useState(false);
  const inputRef = useRef(null);

  // The code box is the only thing on this screen worth touching.
  useEffect(() => { inputRef.current?.focus(); }, []);

  // A visible clock, so an expired code explains itself instead of just being
  // refused. Counts down locally; the server's expiry is the real authority.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Once the clock runs out the server will refuse this code as well, so the
  // screen stops offering a resend it knows will fail.
  const expired = secondsLeft <= 0;
  const over = finished || expired;
  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  // Digits only, max six. Stripping here rather than validating on submit means
  // a pasted "123 456" or "code: 123456" just works.
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError('');
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (code.length !== 6 || working || busy) return;

    setWorking(true);
    setError('');
    setNotice('');

    const result = await onVerify(code);

    if (!result?.success) {
      setError(result?.message || 'That code could not be checked.');
      if (typeof result?.attemptsLeft === 'number') setAttemptsLeft(result.attemptsLeft);
      // These three mean this challenge is finished — a new code cannot be had
      // for it, so the only way forward is the password form again. Said with
      // a button rather than left for the user to work out.
      if (['OTP_EXPIRED', 'OTP_NOT_FOUND', 'OTP_ATTEMPTS_EXHAUSTED', 'OTP_CONSUMED'].includes(result?.code)) {
        setSecondsLeft(0);
        setFinished(true);
      }
      setCode('');
      inputRef.current?.focus();
    }
    // On success the caller navigates; leaving `working` true keeps the button
    // disabled through that transition instead of flashing back to "Verify".
    setWorking(result?.success === true);
  };

  const resend = async () => {
    setWorking(true);
    setError('');
    setNotice('');

    const result = await onResend();

    if (result?.success) {
      setNotice(result.message || 'We have emailed you a new code.');
      setSecondsLeft(expiresMinutes * 60);
      setCode('');
      setAttemptsLeft(null);
      setFinished(false);
      inputRef.current?.focus();
    } else {
      setError(result?.message || 'Could not send a new code.');
    }
    setWorking(false);
  };

  const disabled = working || busy;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-gray-700">
          We emailed a 6-digit code
          {maskedEmail ? <> to <strong className="whitespace-nowrap">{maskedEmail}</strong></> : null}.
          Enter it below to finish signing in.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded" role="status">
          {notice}
        </div>
      )}

      <div>
        <label htmlFor="otp-code" className="block text-gray-700 font-semibold mb-2 text-sm uppercase tracking-wide">
          Sign-in code
        </label>
        <input
          id="otp-code"
          ref={inputRef}
          name="otp"
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="______"
          // numeric keypad on a phone; one-time-code lets iOS and Android
          // offer the code straight from the notification.
          inputMode="numeric"
          autoComplete="one-time-code"
          autoCorrect="off"
          spellCheck="false"
          maxLength={6}
          required
          aria-describedby="otp-expiry"
          className="w-full px-4 py-3 border-2 rounded-lg text-center font-mono text-2xl tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-blue-200 transition border-gray-300 focus:border-primary"
        />
        <p id="otp-expiry" className="text-sm mt-2 text-gray-500">
          {over
            ? 'This sign-in has expired. Please sign in again to get a new code.'
            : <>Expires in <span className="font-semibold text-gray-700">{mmss}</span>.</>}
          {attemptsLeft !== null && attemptsLeft > 0 && (
            <> {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left.</>
          )}
        </p>
      </div>

      {over ? (
        <Button type="button" className="w-full" onClick={onRestart} disabled={busy}>
          Sign in again
        </Button>
      ) : (
        <>
          <Button type="submit" className="w-full" disabled={disabled || code.length !== 6}>
            {working ? 'Checking…' : 'Verify and sign in'}
          </Button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={resend}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm font-medium disabled:opacity-60 disabled:no-underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${working ? 'animate-spin' : ''}`} aria-hidden="true" />
              Send a new code
            </button>
            <button
              type="button"
              onClick={onRestart}
              disabled={disabled}
              className="text-gray-500 hover:text-gray-700 hover:underline text-sm disabled:opacity-60"
            >
              Use a different account
            </button>
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 pt-2">
        Nobody at the clinic will ever ask you for this code.
      </p>
    </form>
  );
};

export default OtpStep;
