import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import hrService from '../../services/hrService';
import StarCalendar, { StarTally } from '../../components/hr/StarCalendar';
import { playStarFlight, cheerDelayFor } from '../../components/hr/StarFlight';
import logo from '../../assets/cdc_web_logo1.svg';
import '../../components/hr/hr.css';

/**
 * TapLanding — /hr/tap?uid&ctr&cmac (HR Suite, B21).
 *
 * The page an entrance NFC tag opens. Mobile-first, full-bleed, outside the
 * portal layout. Nothing here can check anyone in: the only thing it does is
 * hand the tag's single-use signed URL to POST /hr/attendance/tap and render
 * what the server decided. Check-out confirmation re-posts the short-lived
 * confirmToken the server issued (never the tag URL again).
 *
 * Session: the HMS keeps its JWT in per-tab sessionStorage, so a tag URL
 * always lands logged out. Order of attempts:
 *   1. sessionStorage token (already signed in on this tab)      → tap
 *   2. localStorage 'hr.deviceToken' → POST /auth/device-session → tap
 *   3. the one-time login card with "remember this phone" ticked → tap
 *
 * The tag URL is single-use (the counter advances on every read). Reloading
 * the page would replay the used counter and be refused, so the last result
 * is kept in sessionStorage keyed by uid+ctr and re-rendered instead.
 */
const DEVICE_KEY = 'hr.deviceToken';
const LAST_KEY = 'hr.lastTap';

const readJson = (store, key) => { try { const v = store.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
const writeJson = (store, key, v) => { try { store.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

const MARK = {
  checked_in:     { cls: 'bg-green-50 text-green-700', glyph: '✓' },
  checked_out:    { cls: 'bg-green-50 text-green-700', glyph: '✓' },
  offer_checkout: { cls: 'bg-blue-50 text-blue-700', glyph: '?' },
  duplicate:      { cls: 'bg-gray-50 text-gray-500 border border-gray-200', glyph: '•' },
  refused:        { cls: 'bg-red-50 text-red-700', glyph: '!' },
  not_enabled:    { cls: 'bg-red-50 text-red-700', glyph: '!' },
};
const markFor = (result) => {
  if (!result) return MARK.duplicate;
  const c = result.star?.colour;
  if (result.action === 'checked_in' && c === 'red') return { cls: 'bg-amber-50 text-amber-700', glyph: '!' };
  if (result.action === 'checked_in' && c === 'gold') return { cls: 'bg-green-50 text-green-700', glyph: '★' };
  if (result.action === 'offer_checkout' && result.messages?.headline?.startsWith('Check out early')) return { cls: 'bg-amber-50 text-amber-700', glyph: '?' };
  return MARK[result.action] || MARK.duplicate;
};

const geoOnce = (timeoutMs = 1500) => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  let done = false;
  const finish = (v) => { if (!done) { done = true; resolve(v); } };
  const t = setTimeout(() => finish(null), timeoutMs);
  navigator.geolocation.getCurrentPosition(
    (pos) => { clearTimeout(t); finish({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }); },
    () => { clearTimeout(t); finish(null); },
    { maximumAge: 60000, timeout: timeoutMs, enableHighAccuracy: false },
  );
});

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
  const { currentUser, adoptSession } = useUserContext();
  const uid = (params.get('uid') || '').toUpperCase();
  const ctr = (params.get('ctr') || '').toUpperCase();
  const cmac = (params.get('cmac') || '').toUpperCase();
  const hasTag = /^[0-9A-F]{14}$/.test(uid) && /^[0-9A-F]{6}$/.test(ctr) && /^[0-9A-F]{16}$/.test(cmac);

  // phase: 'boot' | 'login' | 'posting' | 'result' | 'no-tag'
  const [phase, setPhase] = useState(hasTag ? 'boot' : 'no-tag');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cheerOn, setCheerOn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

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

  const postTap = useCallback(async (extra = {}) => {
    setBusy(true);
    setError('');
    try {
      const body = { uid, ctr, cmac, ...extra };
      const res = await hrService.tap(body);
      if (res?.success) showResult(res.data);
      else setError(res?.message || 'The tap could not be recorded.');
    } catch (e) {
      if (e?.status === 403) {
        showResult({ action: 'not_enabled', messages: { headline: 'Check-in is not enabled for your account', sub: 'See HR if you think this is a mistake.' } }, { remember: false });
      } else {
        setError(e?.message || 'The tap could not be recorded. Please tap the tag again.');
      }
    } finally {
      setBusy(false);
    }
  }, [uid, ctr, cmac, showResult]);

  // First tap with a session: ask for location once (never blocks — 1.5 s cap).
  const firstTap = useCallback(async () => {
    setPhase('posting');
    const geo = await geoOnce();
    await postTap(geo ? { geo } : {});
  }, [postTap]);

  // Boot: replay guard → existing session → remembered phone → login card.
  useEffect(() => {
    if (phase !== 'boot') return;
    let cancelled = false;
    (async () => {
      const last = readJson(sessionStorage, LAST_KEY);
      if (last && last.uid === uid && last.ctr === ctr && last.data) {
        if (!cancelled) showResult(last.data, { remember: false });
        return;
      }
      if (sessionStorage.getItem('token') && currentUser) {
        if (!cancelled) await firstTap();
        return;
      }
      const deviceToken = localStorage.getItem(DEVICE_KEY);
      if (deviceToken) {
        try {
          const res = await hrService.deviceSession(deviceToken);
          if (res?.success && res.data?.token) {
            adoptSession(res.data);
            if (!cancelled) await firstTap();
            return;
          }
        } catch {
          // fall through: the phone is no longer remembered
        }
        try { localStorage.removeItem(DEVICE_KEY); } catch { /* ignore */ }
      }
      if (!cancelled) setPhase('login');
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await hrService.loginRemember(email.trim(), password, remember);
      if (!res?.success) { setError(res?.message || 'Sign-in failed.'); return; }
      if (remember && res.data.deviceToken) { try { localStorage.setItem(DEVICE_KEY, res.data.deviceToken); } catch { /* private mode */ } }
      adoptSession(res.data);
      setPassword('');
      await firstTap();
    } catch (err) {
      setError(err?.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

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
            <p className="text-sm text-gray-500">Check in by tapping your phone on the tag at the entrance. This page only works when the tag opens it.</p>
            <button type="button" onClick={() => navigate('/hr/dashboard')} className="mt-auto w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700">Open HR Suite</button>
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

        {phase === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold leading-tight">Sign in once on this phone</h1>
            <p className="text-sm text-gray-500">After this, tapping the tag checks you in without signing in.</p>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email
              <input type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base font-normal normal-case tracking-normal focus:outline-none focus:border-primary" />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Password
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base font-normal normal-case tracking-normal focus:outline-none focus:border-primary" />
            </label>
            <label className="flex items-start gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5" />
              <span><b className="block font-semibold">This is my personal phone — remember it</b><span className="text-gray-500">Untick on a shared device.</span></span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={busy} className="mt-2 w-full rounded-xl bg-primary py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in and check in'}</button>
            <p className="text-[11px] text-gray-400 text-center">The tap that opened this page still counts — it completes after sign-in.</p>
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
                  <button type="button" onClick={() => navigate('/hr/dashboard')} className="w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700">Not now</button>
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
                <button type="button" onClick={() => navigate('/hr/dashboard')} className="w-full rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-700">Open HR Suite</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TapLanding;
