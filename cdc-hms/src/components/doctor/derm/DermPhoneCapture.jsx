import { useEffect, useRef, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { dermService } from '../../../services/dermService';
import { notify } from '../../../utils/notify';
import QrCode from '../../shared/QrCode';

/**
 * DermPhoneCapture — "Use my phone" (8 Oct 2026, Emu). Shows a one-time QR
 * code; the phone that scans it opens straight into the camera for this
 * patient and these areas (no sign-in) and its photos appear here within
 * seconds. The link lasts 10 minutes, works on one phone only, and can only
 * add photos. Closed when this panel closes.
 *
 * Props: uhid, regions (areas chosen now — kept in step with the phone),
 *        findingId (a saved finding) | null, purpose 'finding' | 'photos',
 *        onSession(session) (the parent passes its id on Save),
 *        onPhotos(photos, sessionId) (every photo this link has received),
 *        autoStart — make the link straight away (Take photo on a computer, 9 Oct 2026),
 *        onStop() — the doctor stopped using the phone
 */
const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');
const POLL_MS = 3000;

const DermPhoneCapture = ({ uhid, regions = [], findingId = null, purpose = 'photos', onSession = () => {}, onPhotos = () => {}, autoStart = false, onStop }) => {
  const [session, setSession] = useState(null);
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const sessionRef = useRef(null);
  sessionRef.current = session;

  const start = async () => {
    setBusy(true);
    try {
      const res = await dermService.createCapture(uhid, { regions, findingId, purpose });
      setSession(res.data.session); setToken(res.data.token);
      onSession(res.data.session);
    } catch (err) {
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not make a phone link');
    } finally { setBusy(false); }
  };

  // Start once (a ref, so React's development double-run makes one link, not two).
  const started = useRef(false);
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    start();
  }, [autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const expired = session && new Date(session.expiresAt).getTime() <= now;
  const live = session && !expired && !session.closedAt;

  // Watch for photos arriving (and the phone opening the link).
  useEffect(() => {
    if (!session?.id || !live) return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const res = await dermService.getCapture(session.id);
        if (stop) return;
        setSession((s) => ({ ...s, ...res.data }));
        onPhotos(res.data.photos || [], session.id);
      } catch { /* try again next tick */ }
    };
    const t = setInterval(() => { setNow(Date.now()); tick(); }, POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, [session?.id, live]); // eslint-disable-line react-hooks/exhaustive-deps

  // Areas changed on the computer → the phone offers the new ones.
  const regionsKey = regions.join(',');
  useEffect(() => {
    if (!session?.id || !live) return undefined;
    const t = setTimeout(() => { dermService.updateCapture(session.id, regions).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [regionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closing the panel closes the link.
  useEffect(() => () => { if (sessionRef.current?.id) dermService.closeCapture(sessionRef.current.id).catch(() => {}); }, []);

  const stopNow = () => {
    if (session?.id) dermService.closeCapture(session.id).catch(() => {});
    setSession(null); setToken(null);
    if (onStop) onStop();
  };

  if (!session) {
    if (autoStart) return <p className="m-0 text-xs text-gray-500">{busy ? 'Making a phone link…' : 'Could not make a phone link.'}</p>;
    return (
      <button type="button" onClick={start} disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg border border-primary bg-white px-2.5 py-1.5 text-xs font-semibold text-primary ui-hover disabled:opacity-60">
        <Smartphone className="h-3.5 w-3.5" /> {busy ? 'Making a link…' : 'Use my phone'}
      </button>
    );
  }

  const left = Math.max(0, Math.round((new Date(session.expiresAt).getTime() - now) / 1000));
  const url = `${PUBLIC_URL}/capture/${token}`;
  return (
    <div className="ui-surface flex w-full flex-wrap items-start gap-3 p-3">
      {live ? <QrCode value={url} size={150} label="Scan with the phone to take skin photos" /> : (
        <div className="flex h-[150px] w-[150px] items-center justify-center rounded-lg bg-gray-100 p-2 text-center text-xs text-gray-600">
          {session.closedAt ? 'Link closed' : 'Link expired'}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-gray-600">
        <b className="text-sm text-gray-800">Take the photos on your phone</b>
        <span>Scan with the phone camera. It opens straight into the camera for these areas — no sign-in. Works on one phone, for 10 minutes, and can only add photos.</span>
        {session.openedAt
          ? <span className="font-semibold text-green-700">Phone connected · {session.photoCount || 0} photo{session.photoCount === 1 ? '' : 's'} received</span>
          : live && <span className="font-medium text-amber-700">Waiting for the phone… {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} left</span>}
        <span className="flex gap-2">
          {!live && <button type="button" onClick={() => { setSession(null); setToken(null); setTimeout(start, 0); }} className="font-semibold text-primary hover:underline">Make a new link</button>}
          <button type="button" onClick={stopNow} className="inline-flex items-center gap-0.5 text-gray-500 hover:text-gray-700"><X className="h-3 w-3" /> Stop using the phone</button>
        </span>
      </div>
    </div>
  );
};

export default DermPhoneCapture;
