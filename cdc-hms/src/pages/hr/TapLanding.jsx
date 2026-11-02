import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import hrService from '../../services/hrService';
import StarCalendar, { StarTally } from '../../components/hr/StarCalendar';
import { playStarFlight, cheerDelayFor } from '../../components/hr/StarFlight';
import logo from '../../assets/cdc_web_logo1.svg';
import '../../components/hr/hr.css';
import { geoOnce } from '../../utils/geo';

/**
 * TapLanding — /hr/tap?uid&ctr&cmac (HR Suite, B21).
 *
 * The page an entrance NFC tag opens. Mobile-first, full-bleed, outside the
 * portal layout. Nothing here can check anyone in: the only thing it does is
 * hand the tag's single-use signed URL to POST /hr/attendance/tap and render
 * what the server decided. Check-out confirmation re-posts the short-lived
 * confirmToken the server issued (never the tag URL again).
 *
 * Phone (17 Oct 2026, Emu): only the person's own phone, registered by HR,
 * checks them in — and registering it never signs anyone in to the HMS.
 *   1. localStorage 'hr.deviceToken' → POST /auth/device-session → a
 *      CHECK-IN-ONLY pass (15 min), sent with the tap and never stored as the
 *      HMS session → tap
 *   2. no token (or no longer registered) → the registration card: the
 *      one-time code HR gave the person → POST /auth/device-register → 1.
 * A password session in this tab does not check anyone in. "Sign in to the
 * HR Suite" is an ordinary password sign-in.
 *
 * The tag URL is single-use (the counter advances on every read). Reloading
 * the page would replay the used counter and be refused, so the last result
 * is kept in sessionStorage keyed by uid+ctr and re-rendered instead.
 */
const DEVICE_KEY = 'hr.deviceToken';
const LAST_KEY = 'hr.lastTap';

const readToken = () => { try { return localStorage.getItem(DEVICE_KEY); } catch { return null; } };
const forgetToken = () => { try { localStorage.removeItem(DEVICE_KEY); } catch { /* private mode */ } };
const readJson = (store, key) => { try { const v = store.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const writeJson = (store, key, v) => { try { store.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

const MARK = {
  checked_in:     { cls: 'bg-green-50 text-green-700', glyph: '✓' },
  checked_out:    { cls: 'bg-green-50 text-green-700', glyph: '✓' },
  offer_checkout: { cls: 'bg-blue-50 text-blue-700', glyph: '?' },
  duplicate:      { cls: 'bg-gray-50 text-gray-500 border border-gray-200', glyph: '•' },
  refused:        { cls: 'bg-red-50 text-red-700', glyph: '!' },
  not_enabled:    { cls: 'bg-red-50 text-red-700', glyph: '!' },
  stopped:        { cls: 'bg-red-50 text-red-700', glyph: '!' },   // never reached the server's tap (lock, offline)
};
const markFor = (result) => {
  if (!result) return MARK.duplicate;
  const c = result.star?.colour;
  if (result.action === 'checked_in' && c === 'red') return { cls: 'bg-amber-50 text-amber-700', glyph: '!' };
  if (result.action === 'checked_in' && c === 'gold') return { cls: 'bg-green-50 text-green-700', glyph: '★' };
  if (result.action === 'offer_checkout' && result.messages?.headline?.startsWith('Check out early')) return { cls: 'bg-amber-50 text-amber-700', glyph: '?' };
  return MARK[result.action] || MARK.duplicate;
};


const Facts = ({ facts }) => (facts?.length ? (
  <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs mt-1">
    {facts.map(([k, v]) => (
      <div key={k} className="contents">
        <dt className="text-gray-500">{k}</dt>
        <dd className="tabular-nums text-gray-800 text-right">{v}</dd>
      </div>
    ))}
  </dl>
) : null);

const TapLanding = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useUserContext();
  const uid = (params.get('uid') || '').toUpperCase();
  const ctr = (params.get('ctr') || '').toUpperCase();
  const cmac = (params.get('cmac') || '').toUpperCase();
  const hasTag = /^[0-9A-F]{14}$/.test(uid) && /^[0-9A-F]{6}$/.test(ctr) && /^[0-9A-F]{16}$/.test(cmac);

  const hasPhone = !!readToken();
  // phase: 'boot' | 'register' | 'posting' | 'result' | 'no-tag' | 'registered'
  const [phase, setPhase] = useState(hasTag ? 'boot' : (hasPhone ? 'no-tag' : 'register'));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cheerOn, setCheerOn] = useState(false);
  const [code, setCode] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const passRef = useRef(null);   // the check-in-only pass — this page's memory only

  const screenRef = useRef(null);
  const markRef = useRef(null);
  const calRef = useRef(null);
  const flightCancel = useRef(null);

  const showResult = useCallback((data, { remember: keep = true } = {}) => {
    setResult(data);
    setCheerOn(false);
    setPhase('result');
    if (keep && data && data.action !== 'offer_checkout') writeJson(sessionStorage, LAST_KEY, { uid, ctr, data });
  }, [uid, ctr]);

  // This phone's token → a check-in-only pass. 'ok' | 'none' (not registered,
  // or no longer) | 'blocked' (the network lock) | 'error' (not reached — the
  // phone stays registered).
  const openPass = useCallback(async () => {
    const deviceToken = readToken();
    if (!deviceToken) return { state: 'none' };
    try {
      const res = await hrService.deviceSession(deviceToken);
      if (res?.success && res.data?.token) { passRef.current = res.data.token; return { state: 'ok' }; }
    } catch (err) {
      if (err?.data?.code === 'OUTSIDE_CLINIC') return { state: 'blocked', message: err.message };
      if (err?.status !== 401 && err?.status !== 400) return { state: 'error', message: err?.message };
    }
    forgetToken();
    return { state: 'none', message: 'This phone is no longer registered for check-in.' };
  }, []);

  const refuse = useCallback((headline, sub) => showResult({ action: 'stopped', messages: { headline, sub } }, { remember: false }), [showResult]);

  // A failed tap (server error, offline, too many taps): on the check-out
  // offer the line shows under it; otherwise the spinner gives way to a screen.
  const failed = useCallback((message, confirming) => (confirming
    ? setError(message)
    : refuse('Could not check in', message)), [refuse]);

  const postTap = useCallback(async (extra = {}, retried = false) => {
    setBusy(true);
    setError('');
    try {
      const body = { uid, ctr, cmac, ...extra };
      const res = await hrService.tap(body, passRef.current);
      if (res?.success) showResult(res.data);
      else failed(res?.message || 'The tap could not be recorded.', !!extra.confirmToken);
    } catch (e) {
      if (e?.status === 401 && !retried) {
        // The 15-minute pass ran out (a check-out left unconfirmed): get another.
        const p = await openPass();
        if (p.state === 'ok') { await postTap(extra, true); return; }
        if (p.state === 'none') { setError(p.message); setPhase('register'); return; }
        refuse(extra.confirmToken ? 'Not checked out' : 'Not checked in', p.message || 'Please tap the tag again.');
      } else if (e?.data?.code === 'PHONE_NOT_REGISTERED') {
        forgetToken();
        setError(e.message);
        setPhase('register');
      } else if (e?.status === 403) {
        showResult({ action: 'not_enabled', messages: { headline: 'Check-in is not enabled for your account', sub: 'See HR if you think this is a mistake.' } }, { remember: false });
      } else {
        failed(e?.message || 'The tap could not be recorded. Please tap the tag again.', !!extra.confirmToken);
      }
    } finally {
      setBusy(false);
    }
  }, [uid, ctr, cmac, showResult, openPass, refuse, failed]);

  // First tap with a session: ask for location once (never blocks — 1.5 s cap)
  // — only when HR has "Phone location" set to log it. With Off the phone is
  // never asked (5 Oct 2026); if the setting can't be read, it isn't asked either.
  const firstTap = useCallback(async () => {
    setPhase('posting');
    let mode = 'off';
    try { mode = (await hrService.checkinConfig(passRef.current))?.data?.geo || 'off'; } catch { /* not asked */ }
    const geo = mode === 'log' ? await geoOnce() : null;
    await postTap(geo ? { geo } : {});
  }, [postTap]);

  // After the pass is asked for: tap, or say why not.
  const afterPass = useCallback(async (p) => {
    if (p.state === 'ok') { await firstTap(); return; }
    if (p.state === 'blocked') { refuse('Not checked in', p.message); return; }
    if (p.state === 'error') { refuse('Could not check in', p.message || 'The HMS could not be reached. Please tap the tag again.'); return; }
    setError(p.message || '');
    setPhase('register');
  }, [firstTap, refuse]);

  // Boot: replay guard → registered phone → the registration card.
  useEffect(() => {
    if (phase !== 'boot') return;
    let cancelled = false;
    (async () => {
      const last = readJson(sessionStorage, LAST_KEY);
      if (last && last.uid === uid && last.ctr === ctr && last.data) {
        if (!cancelled) showResult(last.data, { remember: false });
        return;
      }
      const p = await openPass();
      if (!cancelled) await afterPass(p);
    })();
    return () => { cancelled = true; };
    // Boot runs once per tag URL; the helpers are stable for that URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Result rendered → fly the star (feedback, never a gate), then the mood line.
  useEffect(() => {
    if (phase !== 'result' || !result) return undefined;
    const colour = result.star?.colour;
    const side = result.star?.side;
    const cal = calRef.current;
    const showCheer = (delay) => setTimeout(() => setCheerOn(true), delay);
    if (!colour || !side || !cal || !result.month?.calendar) {
      const t = showCheer(120);
      return () => clearTimeout(t);
    }
    let cheerTimer = null;
    const start = setTimeout(() => {
      cal.hideStar(side);
      flightCancel.current = playStarFlight({
        root: screenRef.current, fromEl: markRef.current, toEl: cal.starEl(side), colour,
        onLand: () => { cal.landStar(side, colour); cheerTimer = showCheer(cheerDelayFor(colour)); },
      });
    }, 80);
    return () => {
      clearTimeout(start);
      if (cheerTimer) clearTimeout(cheerTimer);
      if (flightCancel.current) { flightCancel.current(); flightCancel.current = null; }
    };
  }, [phase, result]);

  const handleRegister = async (e) => {
    e.preventDefault();
    const typed = code.replace(/[^a-z0-9]/gi, '');
    if (typed.length !== 8) { setError('Enter the 8-character code HR gave you.'); return; }
    // A browser that will not keep the token (private mode) would spend the
    // code and lose the phone — check before the code is used.
    try { localStorage.setItem(`${DEVICE_KEY}.probe`, '1'); localStorage.removeItem(`${DEVICE_KEY}.probe`); } catch {
      setError('This browser will not keep the registration (private mode?). Open the page in your normal browser.'); return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await hrService.registerPhone(typed);
      if (!res?.success || !res.data?.deviceToken) { setError(res?.message || 'This phone could not be registered.'); return; }
      try { localStorage.setItem(DEVICE_KEY, res.data.deviceToken); } catch { setError('This browser will not keep the registration (private mode?). Use your normal browser.'); return; }
      setCode('');
      if (!hasTag) { setRegisteredName(res.data.firstName || ''); setPhase('registered'); return; }
      setPhase('posting');
      await afterPass(await openPass());
    } catch (err) {
      setError(err?.message || 'This phone could not be registered.');
    } finally {
      setBusy(false);
    }
  };

  // "Not now" on a check-out offer: stay checked in, nothing to send.
  const stayIn = () => showResult({ action: 'duplicate', messages: { headline: 'Still checked in', sub: 'Tap the tag again when you leave.' } }, { remember: false });
  const hrSuiteLabel = currentUser ? 'Open HR Suite' : 'Sign in to the HR Suite';

  const confirmCheckout = () => postTap({ confirmToken: result.confirmToken, confirm: true });

  const mark = markFor(result);
  const msgs = result?.messages || {};
  const colour = result?.star?.colour;
  const cheerClass = colour === 'gold' ? 'gold' : colour === 'red' ? 'red' : 'green';
  const monthLabel = result?.month?.month
    ? new Date(`${result.month.month}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
    : '';
  const today = result?.session?.clinicDate || new Date().toISOString().slice(0, 10);

  return (
    <div className="app-shell safe-t safe-b overflow-y-auto no-scrollbar overscroll-contain bg-gray-100 flex">
      <div ref={screenRef} className="relative w-full max-w-md m-auto bg-white sm:rounded-3xl sm:shadow-xl min-h-[100dvh] sm:min-h-0 px-5 py-6 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
          <img src={logo} alt="" className="w-7 h-7 object-contain" />
          Comprehensive Diabetes Centre
        </div>

        {phase === 'no-tag' && (
          <>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${MARK.refused.cls}`}>!</div>
            <h1 className="text-2xl font-bold leading-tight">This isn't a tap</h1>
            <p className="text-sm text-gray-500">This phone is registered for your check-in. Check in by tapping it on the tag at the entrance — this page only checks you in when the tag opens it.</p>
            <button type="button" onClick={() => navigate('/hr/dashboard')} className="mt-auto w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700">{hrSuiteLabel}</button>
          </>
        )}

        {phase === 'registered' && (
          <>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${MARK.checked_in.cls}`}>✓</div>
            <h1 className="text-2xl font-bold leading-tight">Phone registered</h1>
            <p className="text-sm text-gray-500">{registeredName ? `Thank you, ${registeredName}. ` : ''}Tap this phone on the tag at the entrance to check in and out. It only checks you in — to use the HMS, sign in with your password.</p>
            <button type="button" onClick={() => navigate('/hr/dashboard')} className="mt-auto w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700">{hrSuiteLabel}</button>
          </>
        )}

        {(phase === 'boot' || phase === 'posting') && (
          <>
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center">
              <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold leading-tight">{phase === 'boot' ? 'Recognising phone…' : 'Recording your tap…'}</h1>
            <p className="text-sm text-gray-500">One moment.</p>
          </>
        )}

        {phase === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold leading-tight">Register this phone for check-in</h1>
            <p className="text-sm text-gray-500">HR registers check-in phones. Ask HR for a registration code and enter it here — after that, tapping the tag checks you in.</p>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Registration code
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="one-time-code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={9} placeholder="ABCD-EFGH" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-lg font-semibold tracking-[0.2em] tabular-nums normal-case focus:outline-none focus:border-primary" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="mt-2 w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Registering…' : (hasTag ? 'Register and check in' : 'Register this phone')}</button>
            {hasTag && <p className="text-[11px] text-gray-400 text-center">The tap that opened this page still counts — it completes after registering.</p>}
            <p className="text-[11px] text-gray-400 text-center">Use your own phone. It will only check you in — it never signs in to the HMS.</p>
          </form>
        )}

        {phase === 'result' && result && (
          <>
            <div ref={markRef} className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold my-1 ${mark.cls}`}>{mark.glyph}</div>
            <h1 className="text-2xl font-bold leading-tight tabular-nums">{msgs.headline}</h1>
            {msgs.mood && (
              <div className={`hr-cheer ${cheerClass} ${cheerOn ? 'show' : ''}`}>
                {msgs.mood}
                {msgs.sub && <small>{msgs.sub}</small>}
              </div>
            )}
            {!msgs.mood && msgs.sub && <p className="text-sm text-gray-500">{msgs.sub}</p>}
            {result.tag?.label && result.action !== 'refused' && <p className="text-sm text-gray-500">{result.tag.label}.</p>}
            <Facts facts={msgs.facts} />

            {result.month?.calendar && (
              <div>
                <div className="flex justify-between text-[11px] font-semibold text-gray-500 mt-2">
                  <span>{monthLabel}</span>
                  <StarTally stars={result.month.stars} />
                </div>
                <StarCalendar ref={calRef} month={result.month.month} days={result.month.calendar} today={today} compact pendingSide={result.star?.side || null} />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-auto flex flex-col gap-2 pt-2">
              {result.action === 'offer_checkout' && (
                <>
                  <button type="button" onClick={confirmCheckout} disabled={busy} className="w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-60">
                    {busy ? 'Checking out…' : (msgs.headline?.startsWith('Check out early') ? 'Check out early' : 'Check out')}
                  </button>
                  <button type="button" onClick={stayIn} className="w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700">Not now</button>
                  <p className="text-[11px] text-gray-400 text-center">
                    {msgs.headline?.startsWith('Check out early') ? "Today's check-out star turns red if you check out now." : 'Not confirming keeps you checked in.'}
                  </p>
                </>
              )}
              {result.action === 'checked_in' && <p className="text-[11px] text-gray-400 text-center">Tap the tag again when you leave.</p>}
              {result.action === 'checked_out' && <p className="text-[11px] text-gray-400 text-center">See you next time.</p>}
              {result.action === 'duplicate' && <p className="text-[11px] text-gray-400 text-center">Taps within a couple of minutes are ignored.</p>}
              {result.action === 'refused' && <p className="text-[11px] text-gray-400 text-center">Attempt recorded for HR.</p>}
              {result.action !== 'offer_checkout' && (
                <button type="button" onClick={() => navigate('/hr/dashboard')} className="w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700">{hrSuiteLabel}</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TapLanding;
