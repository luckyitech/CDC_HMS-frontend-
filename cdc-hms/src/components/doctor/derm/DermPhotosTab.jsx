import { useCallback, useEffect, useMemo, useState } from 'react';
import SelectMenu from '../../shared/SelectMenu';
import { Camera, Upload } from 'lucide-react';
import { dermService } from '../../../services/dermService';
import { toCleanJpeg } from '../../../utils/dermImage';
import { notify } from '../../../utils/notify';
import ReasonModal from '../../shared/ReasonModal';
import DermPhoto from './DermPhoto';
import DermMarkerEditor from './DermMarkerEditor';
import { fmtDay, sizeText } from './dermFormat';

/**
 * DermPhotosTab — one finding's photos (Dermatology Phase 2).
 *
 *   Consent  — recorded once per patient (clinical yes/no, teaching yes/no);
 *              no photo can be taken without clinical consent.
 *   Take     — camera (tablet) or file; the picture is re-encoded on this
 *              device before upload (no location / camera data leaves it);
 *              the doctor may ring the finding.
 *   Compare  — any two photos side by side, each with the size TYPED on its
 *              day (never measured from the picture).
 *   Gallery  — by date; sensitive sites stay blurred until opened; "Who
 *              opened" lists every viewing; entered in error hides a photo.
 *
 * Props: uhid, finding, observations (the finding's looks), canWrite, onChanged() (refresh the board),
 *        dayOnly 'YYYY-MM-DD' — only that day's photos, no compare (the recording pop-up, 9 Oct 2026),
 *        onTakePhoto() — on a computer (no touch screen), Take photo calls this instead
 *        of opening the file chooser: the pop-up shows the phone QR (Emu, 9 Oct 2026).
 *        On a tablet / phone Take photo still opens the camera; Upload is always the file chooser.
 */
const PHOTO_TYPES = [['close_up', 'Clinical close-up'], ['overview', 'Clinical overview'], ['dermoscopy', 'Dermoscopic image']];
const typeName = (t) => (PHOTO_TYPES.find(([k]) => k === t) || [t, t])[1];

export const ConsentBox = ({ uhid, consent, canWrite, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [clinical, setClinical] = useState(true);
  const [teaching, setTeaching] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const start = () => { setClinical(consent ? consent.clinical : true); setTeaching(consent ? consent.teaching : false); setNote(''); setEditing(true); };
  const save = async () => {
    setSaving(true);
    try {
      const res = await dermService.recordConsent(uhid, { clinical, teaching: clinical && teaching, note: note || null });
      onSaved(res.data.current);
      setEditing(false);
      notify('success', 'Consent recorded');
    } catch (err) {
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not record consent');
    } finally { setSaving(false); }
  };
  const yesNo = (v, set, name) => (
    <div className="flex gap-1.5" role="group" aria-label={name}>
      {[[true, 'Yes'], [false, 'No']].map(([val, l]) => (
        <button key={l} type="button" aria-pressed={v === val} onClick={() => set(val)}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${v === val ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700'}`}>{l}</button>
      ))}
    </div>
  );

  return (
    <div className={`rounded-lg p-3 text-sm ${consent?.clinical ? 'bg-teal-50 text-teal-900' : 'bg-amber-50 text-amber-900'}`}>
      {!editing ? (
        <div className="flex flex-wrap items-center gap-2">
          {consent ? (
            <span>
              <b>{consent.clinical ? 'Photography consent recorded' : 'Patient declined clinical photographs'}</b>
              {' '}{fmtDay(String(consent.createdAt).slice(0, 10))} by {consent.recordedByName}.
              {consent.clinical && <> Teaching use: <b>{consent.teaching ? 'yes' : 'no'}</b>.</>}
              {consent.note && <> “{consent.note}”</>}
            </span>
          ) : <span><b>No photography consent recorded.</b> Ask the patient before taking any photo.</span>}
          {canWrite && <button type="button" onClick={start} className="ml-auto text-xs font-semibold text-primary hover:underline">{consent ? 'Change' : 'Record consent'}</button>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3"><span className="w-56">Clinical photographs for the record</span>{yesNo(clinical, setClinical, 'Clinical photographs')}</div>
          {clinical && <div className="flex flex-wrap items-center gap-3"><span className="w-56">May also be used for teaching</span>{yesNo(teaching, setTeaching, 'Teaching use')}</div>}
          <input id="derm-consent-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note (optional) — e.g. verbal, chaperone present"
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800" />
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save consent'}</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs">Cancel</button>
          </div>
          <span className="text-[11px] opacity-80">Each answer is kept. Withdrawing consent stops new photos; photos already taken stay in the record.</span>
        </div>
      )}
    </div>
  );
};

// A computer with a mouse has no camera worth using for skin photos.
const isTouchDevice = () => { try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; } };

const DermPhotosTab = ({ uhid, finding, observations, canWrite, onChanged = () => {}, dayOnly = null, onTakePhoto }) => {
  const [photos, setPhotos] = useState(null);
  const [consent, setConsent] = useState(null);
  const [prepared, setPrepared] = useState(null);     // { blob, url, width, height }
  const [photoType, setPhotoType] = useState('close_up');
  const [marker, setMarker] = useState(null);
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState([null, null]);
  const [askError, setAskError] = useState(null);
  const [views, setViews] = useState({});           // photoId → [{ viewedByName, createdAt }]
  const [areaFilter, setAreaFilter] = useState('all');   // 'all' | '' (overview) | region id

  const load = useCallback(async () => {
    try {
      const res = await dermService.listPhotos(uhid, { findingId: finding.id });
      setPhotos(dayOnly ? res.data.photos.filter((p) => p.visitDate === dayOnly) : res.data.photos);
      setConsent(res.data.consent);
    } catch (err) {
      setPhotos([]);
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not load photos');
    }
  }, [uhid, finding.id, dayOnly]);
  useEffect(() => { load(); }, [load]);

  // Default compare: the oldest and the newest photo.
  useEffect(() => {
    if (!photos || photos.length < 2) return;
    setCompare(([a, b]) => (a && b ? [a, b] : [photos[photos.length - 1].id, photos[0].id]));
  }, [photos]);
  useEffect(() => () => { if (prepared?.url) URL.revokeObjectURL(prepared.url); }, [prepared]);

  const sizeOn = (day) => {
    const o = observations.find((x) => x.visitDate === day && x.status === 'active');
    return o && sizeText(o) ? `${sizeText(o)} typed` : 'no size typed';
  };
  const byId = useMemo(() => Object.fromEntries((photos || []).map((p) => [p.id, p])), [photos]);
  const areas = useMemo(() => {
    const m = new Map();
    for (const p of photos || []) {
      if (!(p.regions || []).length) m.set('', 'Overview — whole finding');
      (p.regions || []).forEach((r, i) => m.set(r, p.regionLabels?.[i] || r));
    }
    return [...m.entries()];
  }, [photos]);
  const byDay = useMemo(() => {
    const m = new Map();
    for (const p of (photos || []).filter((x) => areaFilter === 'all' || (areaFilter === '' ? !(x.regions || []).length : (x.regions || []).includes(areaFilter)))) { if (!m.has(p.visitDate)) m.set(p.visitDate, []); m.get(p.visitDate).push(p); }
    return [...m.entries()];
  }, [photos, areaFilter]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (prepared?.url) URL.revokeObjectURL(prepared.url);
      setPrepared(await toCleanJpeg(file));
      setMarker(null);
    } catch (err) {
      notify('error', err?.message || 'Could not read that picture');
    }
  };
  const upload = async () => {
    setBusy(true);
    try {
      await dermService.uploadPhoto(finding.id, prepared.blob, { photoType, marker });
      URL.revokeObjectURL(prepared.url);
      setPrepared(null); setMarker(null);
      notify('success', 'Photo saved');
      load();
      onChanged();
    } catch (err) {
      if (err?.data?.code === 'NO_CONSENT') load();
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save the photo');
    } finally { setBusy(false); }
  };
  const showViews = async (id) => {
    if (views[id]) { setViews((v) => ({ ...v, [id]: undefined })); return; }
    try { const res = await dermService.photoViews(id); setViews((v) => ({ ...v, [id]: res.data })); } catch { /* toast via api */ }
  };

  if (!photos) return <p className="py-4 text-sm text-gray-500">Loading photos…</p>;
  const mayTake = canWrite && consent?.clinical && finding.status !== 'entered_in_error';

  return (
    <div className="flex flex-col gap-4">
      <ConsentBox uhid={uhid} consent={consent} canWrite={canWrite} onSaved={setConsent} />

      {mayTake && !prepared && (
        <div className="flex flex-wrap items-center gap-2">
          {onTakePhoto && !isTouchDevice() ? (
            <button type="button" onClick={onTakePhoto} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Camera className="h-4 w-4" /> Take photo
            </button>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              <Camera className="h-4 w-4" /> Take photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
            </label>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4" /> Upload photo
            <input type="file" accept="image/*" className="sr-only" onChange={pick} />
          </label>
          <span className="text-xs text-gray-500">{onTakePhoto && !isTouchDevice()
            ? 'Take photo shows a QR code — scan it with your phone and take the photos there. Upload picks a picture on this computer.'
            : 'Take photo opens the camera. Location and camera details are removed before upload.'}</span>
        </div>
      )}

      {prepared && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-blue-50/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">New photo · {finding.label}</span>
            <select id="derm-photo-type" aria-label="Photo type" value={photoType} onChange={(e) => setPhotoType(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
              {PHOTO_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <DermMarkerEditor src={prepared.url} value={marker} onChange={setMarker} />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={upload} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save photo'}</button>
            <button type="button" onClick={() => { URL.revokeObjectURL(prepared.url); setPrepared(null); }} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm">Discard</button>
          </div>
        </div>
      )}

      {photos.length >= 2 && !dayOnly && (
        <section className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Compare</h4>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((side) => {
              const p = byId[compare[side]];
              return (
                <div key={side} className="flex min-w-0 flex-col gap-1.5">
                  <select aria-label={side === 0 ? 'Earlier photo' : 'Later photo'} value={compare[side] || ''} onChange={(e) => setCompare((c) => (side === 0 ? [Number(e.target.value), c[1]] : [c[0], Number(e.target.value)]))}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs">
                    {photos.map((x) => <option key={x.id} value={x.id}>{fmtDay(x.visitDate)} · {(x.regionLabels || []).join(', ') || 'Overview'} · {typeName(x.photoType)}</option>)}
                  </select>
                  {p && <DermPhoto key={p.id} photo={p} aspect="1/1" caption={<><span>{fmtDay(p.visitDate)}</span><span>{sizeOn(p.visitDate)}</span></>} />}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500">The ring marks which spot is the finding. Sizes are the ones typed on each day; photos have no scale, so nothing is measured from them.</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{dayOnly ? `Photos of ${finding.label} this visit` : `All photos of ${finding.label}`} · {photos.length}</h4>
          {areas.length > 1 && (
            <SelectMenu id="derm-photo-area-filter" aria-label="Show photos of" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="ml-auto rounded-lg border border-gray-300 px-2 py-1 text-xs">
              <option value="all">Every area</option>
              {areas.map(([k, l]) => <option key={k || 'overview'} value={k}>{l}</option>)}
            </SelectMenu>
          )}
        </div>
        {photos.length === 0 && <p className="text-sm text-gray-500">{dayOnly ? 'No photos yet this visit.' : 'No photos of this finding yet.'}</p>}
        {byDay.map(([day, list]) => (
          <div key={day} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-gray-600">{fmtDay(day)} · {sizeOn(day)}</span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
              {list.map((p) => (
                <div key={p.id} className="flex flex-col gap-1">
                  <DermPhoto photo={p} caption={<><span>{(p.regionLabels || []).join(', ') || 'Overview'} · {typeName(p.photoType)}</span><span>{p.uploadedByName}</span></>} />
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <button type="button" onClick={() => showViews(p.id)} className="text-primary hover:underline">{views[p.id] ? 'Hide who opened' : 'Who opened'}</button>
                    {canWrite && (
                      <button type="button" onClick={() => setAskError(p)} className="text-red-600 hover:underline">Entered in error</button>
                    )}
                  </div>
                  {views[p.id] && (
                    <ul className="rounded bg-gray-50 p-1.5 text-[11px] text-gray-600">
                      {views[p.id].length === 0 ? <li>Not opened yet</li> : views[p.id].map((v) => (
                        <li key={v.id}>{v.viewedByName} · {new Date(v.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <ReasonModal
        isOpen={!!askError}
        onClose={() => setAskError(null)}
        title="Mark this photo entered in error"
        message="It is hidden from the record but kept, with your reason, for the audit trail."
        confirmLabel="Mark entered in error"
        destructive
        onConfirm={async (reason) => {
          const p = askError; setAskError(null);
          try { await dermService.photoInError(p.id, reason); notify('success', 'Photo marked entered in error'); load(); onChanged(); } catch (err) {
            if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not change the photo');
          }
        }}
      />
    </div>
  );
};

export default DermPhotosTab;
