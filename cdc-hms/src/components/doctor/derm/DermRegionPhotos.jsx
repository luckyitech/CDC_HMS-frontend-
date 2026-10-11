import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { dermService } from '../../../services/dermService';
import { toCleanJpeg } from '../../../utils/dermImage';
import { notify } from '../../../utils/notify';
import { regionLabel } from '../../../constants/dermRegions';
import DermPhoto from './DermPhoto';
import DermMarkerEditor from './DermMarkerEditor';
import { ConsentBox } from './DermPhotosTab';
import { shortArea } from './dermAreaPhotoUtils';

/**
 * DermRegionPhotos — the photo box beside the body map (8 Oct 2026, Emu).
 *
 * All the finding's photos in one grid, newest first, each with small tags of
 * the areas it shows. A photo can be attached to several areas at once: when
 * one is added, every area chosen on the map is ticked; untick any it doesn't
 * show; none ticked = an overview of the whole finding.
 *
 *   Saved finding (findingId set) — a photo uploads as soon as it is saved.
 *   New finding (no findingId)    — photos wait on this device in `pending`;
 *                                   the parent uploads them straight after the
 *                                   finding is saved (never in the autosave draft).
 *
 * Consent first, as in the Photos tab: no camera until clinical consent is
 * recorded. Pictures are re-encoded here (location and camera data removed).
 *
 * Props: uhid, findingId?, regions (the finding's areas), pending /
 *        onPendingChange (new finding), onSaved(photo?), onCounts({ region → n }),
 *        areaMode (photos only: each uploads at once as an AREA photo — no
 *        finding), extraPhotos (photos that arrived from the phone),
 *        phoneSlot (the "Use my phone" control, shown beside Take photo)
 */
const PHOTO_TYPES = [['close_up', 'Clinical close-up'], ['overview', 'Clinical overview'], ['dermoscopy', 'Dermoscopic image']];

const Tags = ({ regions }) => (
  <span className="pointer-events-none absolute inset-x-1 top-1 flex flex-wrap gap-0.5">
    {(regions && regions.length ? regions.map((r) => shortArea(regionLabel(r))) : ['Overview']).map((t) => (
      <span key={t} className="rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold leading-none text-white">{t}</span>
    ))}
  </span>
);

const DermRegionPhotos = ({ uhid, findingId = null, regions = [], pending = [], onPendingChange = () => {}, onSaved = () => {}, onCounts = () => {}, areaMode = false, extraPhotos = [], phoneSlot = null }) => {
  const [photos, setPhotos] = useState(findingId ? null : []);
  const [consent, setConsent] = useState(undefined);   // undefined = loading
  const [prepared, setPrepared] = useState(null);      // { blob, url, width, height }
  const [areas, setAreas] = useState([]);              // areas ticked for the photo being added
  const [photoType, setPhotoType] = useState('close_up');
  const [marker, setMarker] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!uhid) return;
    try {
      if (findingId) {
        const res = await dermService.listPhotos(uhid, { findingId });
        setPhotos(res.data.photos);
        setConsent(res.data.consent);
      } else {
        const res = await dermService.getConsent(uhid);
        setConsent(res.data && Object.prototype.hasOwnProperty.call(res.data, 'current') ? res.data.current : null);
      }
    } catch (err) {
      if (findingId) setPhotos([]);
      setConsent(null);
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not load photos');
    }
  }, [uhid, findingId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (prepared?.url) URL.revokeObjectURL(prepared.url); }, [prepared]);

  // One list, newest first: waiting photos (this session) ahead of saved ones.
  const items = useMemo(() => {
    const saved = [...(photos || [])];
    for (const p of extraPhotos) if (!saved.some((x) => x.id === p.id)) saved.push(p);
    saved.sort((a, b) => b.id - a.id);
    return [...[...pending].reverse().map((p) => ({ ...p, waiting: true })), ...saved];
  }, [pending, photos, extraPhotos]);

  // Count per area for the chips (an overview photo counts for every area).
  const countsKey = JSON.stringify(regions.map((r) => [r, items.filter((p) => !(p.regions && p.regions.length) || p.regions.includes(r)).length]));
  useEffect(() => { onCounts(Object.fromEntries(JSON.parse(countsKey))); }, [countsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (prepared?.url) URL.revokeObjectURL(prepared.url);
      setPrepared(await toCleanJpeg(file));
      setMarker(null);
      setPhotoType('close_up');
      setAreas([...regions]);   // every chosen area ticked; untick what it doesn't show
    } catch (err) {
      notify('error', err?.message || 'Could not read that picture');
    }
  };
  const toggleArea = (r) => setAreas((a) => (a.includes(r) ? a.filter((x) => x !== r) : [...a, r]));
  const discard = () => { if (prepared?.url) URL.revokeObjectURL(prepared.url); setPrepared(null); setMarker(null); };

  const save = async () => {
    const item = { blob: prepared.blob, url: prepared.url, photoType, marker, regions: areas.filter((r) => regions.includes(r)) };
    if (areaMode) {
      if (!item.regions.length) { notify('error', 'Tick at least one area the photo shows'); return; }
      setBusy(true);
      try {
        const res = await dermService.uploadAreaPhoto(uhid, item.blob, item);
        discard();
        setPhotos((list) => [res.data, ...(list || [])]);
        notify('success', 'Photo saved');
        onSaved(res.data);
      } catch (err) {
        if (err?.data?.code === 'NO_CONSENT') load();
        if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save the photo');
      } finally { setBusy(false); }
      return;
    }
    if (!findingId) {
      // Kept on this device until the finding is saved; the object URL now belongs to the queue.
      onPendingChange([...pending, { ...item, key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
      setPrepared(null); setMarker(null);
      return;
    }
    setBusy(true);
    try {
      await dermService.uploadPhoto(findingId, item.blob, item);
      discard();
      notify('success', 'Photo saved');
      load();
      onSaved();
    } catch (err) {
      if (err?.data?.code === 'NO_CONSENT') load();
      if (!err?.isPermissionDenied) notify('error', err?.message || 'Could not save the photo');
    } finally { setBusy(false); }
  };

  const dropPending = (key) => {
    const p = pending.find((x) => x.key === key);
    if (p?.url) URL.revokeObjectURL(p.url);
    onPendingChange(pending.filter((x) => x.key !== key));
  };

  if (consent === undefined || photos === null) return <p className="text-xs text-gray-500">Loading photos…</p>;
  const mayTake = !!consent?.clinical;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Photos · {items.length}</span>
        {mayTake && !prepared && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              <Camera className="h-3.5 w-3.5" /> Take photo
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
              <Upload className="h-3.5 w-3.5" /> Upload
              <input type="file" accept="image/*" className="sr-only" onChange={pick} />
            </label>
          </span>
        )}
      </div>
      {mayTake && phoneSlot && !prepared && <div className="flex flex-wrap">{phoneSlot}</div>}

      {!mayTake && <ConsentBox uhid={uhid} consent={consent} canWrite onSaved={setConsent} />}

      {prepared && (
        <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-blue-50/40 p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-600">Attach to · untick any area it doesn't show (none = overview of the whole finding)</span>
            <div className="flex flex-wrap gap-1.5">
              {regions.map((r) => (
                <button key={r} type="button" aria-pressed={areas.includes(r)} onClick={() => toggleArea(r)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${areas.includes(r) ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
                  {regionLabel(r)}
                </button>
              ))}
              {regions.length === 0 && <span className="text-xs text-gray-500">No area chosen on the map{areaMode ? ' — choose one first.' : ' — this will be an overview.'}</span>}
            </div>
          </div>
          <select id="derm-photo-kind" aria-label="Photo type" value={photoType} onChange={(e) => setPhotoType(e.target.value)} className="self-start rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm">
            {PHOTO_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <DermMarkerEditor src={prepared.url} value={marker} onChange={setMarker} />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              {busy ? 'Saving…' : findingId ? 'Save photo' : 'Add photo'}
            </button>
            <button type="button" onClick={discard} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs">Discard</button>
          </div>
        </div>
      )}

      {items.length === 0 && !prepared && mayTake && (
        <p className="rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-500">
          No photos yet. Choose the areas on the map, then Take photo — it is attached to them.
        </p>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
          {items.map((p) => (p.waiting ? (
            <div key={p.key} className="relative overflow-hidden rounded-lg border border-amber-300">
              <img src={p.url} alt="Photo waiting to be saved" className="aspect-square w-full object-cover" />
              <Tags regions={p.regions} />
              <span className="absolute inset-x-0 bottom-0 bg-amber-100/95 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">Saves with the finding</span>
              <button type="button" onClick={() => dropPending(p.key)} aria-label="Remove this photo" className="absolute bottom-6 right-1 rounded-full bg-white/90 p-0.5 text-gray-700 hover:bg-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div key={p.id} className="relative">
              <DermPhoto photo={p} aspect="1/1" caption={<span>{p.fromPhone ? 'Phone · ' : ''}{p.visitDate}</span>} />
              <Tags regions={p.regions} />
            </div>
          )))}
        </div>
      )}

      {!findingId && pending.length > 0 && (
        <p className="text-[11px] text-amber-800">
          {pending.length === 1 ? '1 photo is' : `${pending.length} photos are`} waiting on this device — they upload when you press Save finding. Closing the page first loses them.
        </p>
      )}
    </div>
  );
};

export default DermRegionPhotos;
