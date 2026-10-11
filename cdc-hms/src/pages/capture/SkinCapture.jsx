import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, CheckCircle2, AlertTriangle } from 'lucide-react';
import { dermCaptureService } from '../../services/dermCaptureService';
import { toCleanJpeg } from '../../utils/dermImage';

/**
 * SkinCapture — the phone page a skin-photo QR opens (8 Oct 2026, Emu).
 * Outside the login on purpose: the one-time link is the key, bound to this
 * phone on first open. It shows WHO the photos are for (name, UHID, age, sex
 * — so they cannot go to the wrong patient) and the areas the doctor chose,
 * then takes photos straight into the record. It reads nothing else from the
 * record and keeps nothing: each picture is re-encoded here (no location or
 * camera details) and sent; only a small preview stays on this page.
 */
const SkinCapture = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [problem, setProblem] = useState(null);
  const [areas, setAreas] = useState([]);
  const [sent, setSent] = useState([]);          // { url } previews of what this phone sent
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Clinical photo or dermoscopic image (9 Oct 2026) — the record's
  // "Photography" line is written from this, never typed.
  const [kind, setKind] = useState('close_up');

  useEffect(() => {
    let live = true;
    dermCaptureService.open(token)
      .then((d) => { if (!live) return; setInfo(d); setAreas((d.regions || []).map((r) => r.id)); })
      .catch((e) => { if (live) setProblem(e.message || 'This link cannot be used'); });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => { live = false; clearInterval(t); };
  }, [token]);

  const left = info ? Math.max(0, Math.round((new Date(info.expiresAt).getTime() - now) / 1000)) : 0;
  const toggle = (id) => setAreas((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const clean = await toCleanJpeg(file);
      await dermCaptureService.upload(token, clean.blob, { regions: areas, photoType: kind });
      setSent((list) => [{ url: clean.url, key: `${Date.now()}` }, ...list]);
    } catch (err) {
      setProblem(err.message || 'The photo could not be sent');
    } finally { setBusy(false); }
  };

  const finish = async () => {
    try { await dermCaptureService.done(token); } catch { /* the link ends by itself */ }
    setFinished(true);
  };

  const shell = (children) => (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 bg-white px-4 py-5 text-gray-800">{children}</div>
  );

  if (finished) {
    return shell(
      <div className="mt-20 flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <b className="text-xl">Done — {sent.length} photo{sent.length === 1 ? '' : 's'} sent</b>
        <span className="text-sm text-gray-600">They are on the computer now. You can close this page.</span>
      </div>,
    );
  }
  if (problem && !info) {
    return shell(
      <div className="mt-20 flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-600" />
        <b className="text-lg">{problem}</b>
        <span className="text-sm text-gray-600">Show a new QR code on the computer and scan it again.</span>
      </div>,
    );
  }
  if (!info) return shell(<p className="mt-20 text-center text-gray-500">Opening…</p>);

  const p = info.patient || {};
  return shell(
    <>
      <div className="flex flex-col gap-1 rounded-2xl bg-[#0b2e59] px-4 py-3 text-white">
        <span className="text-xs opacity-80">Skin photos for</span>
        <b className="text-2xl leading-tight">{p.name}</b>
        <span className="text-base">{p.uhid}{p.age !== null && p.age !== undefined ? ` · ${p.age} y` : ''}{p.gender ? ` · ${p.gender}` : ''}</span>
      </div>
      {!info.consent && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Consent to clinical photographs is not recorded — photos cannot be sent.</p>}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gray-600">{info.finding ? `${info.finding.label} ${info.finding.title} · ` : ''}Areas this photo shows</span>
        <div className="flex flex-wrap gap-2">
          {(info.regions || []).map((r) => (
            <button key={r.id} type="button" onClick={() => toggle(r.id)} aria-pressed={areas.includes(r.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${areas.includes(r.id) ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
              {r.label}
            </button>
          ))}
          {!(info.regions || []).length && <span className="text-sm text-gray-500">An overview of the finding.</span>}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-gray-600">This photo is</span>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Kind of photo">
          {[['close_up', 'Clinical photo'], ['dermoscopy', 'Dermoscopic image']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
              className={`h-11 rounded-xl border text-sm font-semibold ${kind === k ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <label className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-xl font-bold text-white ${busy || !info.consent || left === 0 ? 'bg-gray-400' : 'bg-primary active:bg-blue-800'}`}>
        <Camera className="h-9 w-9" />
        {busy ? 'Sending…' : 'Take photo'}
        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} disabled={busy || !info.consent || left === 0} />
      </label>
      {problem && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{problem}</p>}
      {sent.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-gray-600">Sent to the computer · {sent.length}</span>
          <div className="grid grid-cols-3 gap-2">
            {sent.map((s) => <img key={s.key} src={s.url} alt="Sent photo" className="aspect-square w-full rounded-lg object-cover" />)}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <span className="text-center text-xs text-gray-500">
          Photos go straight to the record; location and camera details are removed.
          {left > 0 ? ` Link ends in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}.` : ' This link has ended.'}
        </span>
        <button type="button" onClick={finish} className="h-12 rounded-xl border border-gray-300 bg-white text-base font-semibold text-gray-700">Finished on the phone</button>
      </div>
    </>,
  );
};

export default SkinCapture;
