import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import useDraft from '../../../hooks/useDraft';
import { DraftStatus, DraftRestoreBanner } from '../../shared/DraftStatus';
import ReasonModal from '../../shared/ReasonModal';
import { useDermContext } from '../../../contexts/DermContext';
import { regionLabel } from '../../../constants/dermRegions';
import { notify } from '../../../utils/notify';
import DermLookForm from './DermLookForm';
import DermPhotosTab from './DermPhotosTab';
import DermPhoneCapture from './DermPhoneCapture';
import DermProceduresTab from './DermProceduresTab';
import DermBinButton from './DermBinButton';
import { forgetDermVocabulary } from './useDermVocabulary';
import { STATUS_STYLE, statusLabel, typeText, fmtDay, blankLook, lookFrom, lookPayload, lookFromDraft } from './dermFormat';

/**
 * Edit findings (9 Oct 2026, Emu) — what the recording pop-up shows for a
 * finding already on record. Only for adding the day's findings and photos;
 * the timeline and history are read on the main page (the visit viewer).
 *
 *   - today's look (Stable copies the last look); someone else's entry today,
 *     or a past visit's entry, is amended with a reason (kept in the trail)
 *   - areas tapped on the map are added to the finding when it is saved
 *     (a reason is asked unless its creator changes it the same day)
 *   - Photos at the bottom: "Add photos" saves what was typed first, so
 *     nothing is lost, then offers take / upload here and the phone QR
 *   - Biopsy & procedures done at this visit (folded; histology request when on)
 *   - "Mark entered in error" for the entry being edited; the red bin in the
 *     header retires or deletes the whole finding (10 Oct 2026; never
 *     hard-deleted — kept with the reason)
 *
 * Props: findingId, day (a past visit's date to amend; default today),
 *        addRegions + onAddRegionsChange (areas tapped on the map, to add),
 *        canWrite, canViewPhotos, currentUserId, onSaved(), onBinned(kind) (after retire / delete),
 *        startWithPhotos — open on the photos (a new finding saved by "Add photos")
 */
const Pill = ({ status, children }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] || 'border-gray-200 bg-gray-100 text-gray-600'}`}>
    {children || statusLabel(status)}
  </span>
);

const same = (a, b) => JSON.stringify(lookPayload(a)) === JSON.stringify(lookPayload(b));

const DermFindingEditor = ({ findingId, day = null, addRegions = [], onAddRegionsChange = () => {}, canWrite, canViewPhotos, currentUserId, onSaved = () => {}, onBinned = () => {}, startWithPhotos = false }) => {
  const { board, detail, openFinding, saveToday, amendObservation, updateFinding, observationInError, refresh } = useDermContext();
  useEffect(() => { openFinding(findingId); }, [findingId, openFinding]);

  const ready = detail && detail.finding?.id === findingId;
  const finding = ready ? detail.finding : null;
  const today = detail?.today;
  const visitDay = day || today;
  const active = useMemo(() => (ready ? detail.observations.filter((o) => o.status === 'active') : []), [ready, detail]);
  const target = active.find((o) => o.visitDate === visitDay) || null;
  const earlier = active.filter((o) => o.visitDate < visitDay);
  const lastEarlier = earlier[0] || null;
  const previousSized = earlier.find((o) => o.lengthMm) || null;
  // Amend = a past day's entry, or today's entry written by someone else.
  const amend = !!target && (visitDay !== today || target.doctorId !== currentUserId);
  const inError = finding?.status === 'entered_in_error';
  const editable = canWrite && !inError && (visitDay === today || !!target);
  const baseline = target ? lookFrom(target) : blankLook();

  const [look, setLook] = useState(blankLook());
  const [loadedFor, setLoadedFor] = useState(null);
  const loadKey = `${findingId}|${visitDay}|${target?.id || ''}`;
  useEffect(() => {
    if (!ready || loadedFor === loadKey) return;
    setLook(target ? lookFrom(target) : blankLook());
    setLoadedFor(loadKey);
  }, [ready, loadKey, loadedFor, target]);

  const [saving, setSaving] = useState(false);
  const [askReason, setAskReason] = useState(null);   // { title, message, confirmLabel, run(reason), destructive }
  const [photosOpen, setPhotosOpen] = useState(startWithPhotos);
  const [phone, setPhone] = useState({});
  const [phoneOn, setPhoneOn] = useState(false);   // Take photo on a computer → the phone QR
  const [procOpen, setProcOpen] = useState(false);
  // Photos open (after "Add photos" saved): bring them into view.
  const photosRef = useRef(null);
  useEffect(() => {
    if (photosOpen && ready) setTimeout(() => photosRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
  }, [photosOpen, ready]);

  const draft = useDraft({
    uhid: detail?.uhid,
    formKey: 'derm-finding',
    contextKey: amend ? `${findingId}-${visitDay}` : String(findingId),
    label: finding ? `Skin finding ${finding.label}` : 'Skin finding',
    value: look,
    baseline,
    enabled: !!(ready && loadedFor === loadKey && editable),
    onRestore: (p) => setLook(lookFromDraft(p)),
    onDiscard: () => setLook(baseline),
  });

  if (!ready) return <p className="py-6 text-center text-sm text-gray-500">Opening the finding…</p>;

  const regionsNow = finding.regions || [];
  const adding = addRegions.filter((r) => !regionsNow.includes(r));
  const lookChanged = !same(look, baseline);
  const dirty = lookChanged || adding.length > 0;
  const sameDayCreator = finding.createdById === currentUserId && finding.createdDay === today;
  const needsReason = (adding.length > 0 && !sameDayCreator) || (lookChanged && amend);

  const copyLast = () => setLook(lastEarlier ? { ...lookFrom(lastEarlier), statusToday: 'stable' } : { ...look, statusToday: 'stable' });

  // One save for both parts; resolves true when everything was saved.
  const doSave = async (reason) => {
    setSaving(true);
    try {
      if (adding.length) {
        await updateFinding(finding.id, { regions: [...regionsNow, ...adding], ...(sameDayCreator ? {} : { reason }) });
        onAddRegionsChange([]);
      }
      if (lookChanged) {
        if (amend) {
          const payload = lookPayload(look);
          const before = lookPayload(baseline);
          const changed = Object.fromEntries(Object.entries(payload).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k])));
          await amendObservation(target.id, { ...changed, reason });
        } else {
          await saveToday(finding.id, lookPayload(look));
        }
        forgetDermVocabulary();
        draft.markSaved();
      }
      setLoadedFor(null);   // reload the form from what is now saved
      onSaved();
      return true;
    } catch {
      return false;         // the toast says why; what was typed stays
    } finally { setSaving(false); }
  };

  const save = (then) => {
    if (!dirty) { if (then) then(); return; }
    if (lookChanged && !look.statusToday) { notify('error', 'Choose the status today first'); return; }
    if (!needsReason) { doSave(null).then((ok) => { if (ok && then) then(); }); return; }
    setAskReason({
      title: amend && lookChanged ? `Amend the entry of ${fmtDay(visitDay)}` : 'Add areas to this finding',
      message: 'The change and this reason are kept in the amendment trail; the entry keeps its author.',
      confirmLabel: 'Save',
      run: async (reason) => { const ok = await doSave(reason); if (ok && then) then(); },
    });
  };

  // Photos: save what was typed first (nothing lost), then open the camera / phone.
  const openPhotos = () => save(() => setPhotosOpen(true));

  const markError = () => setAskReason({
    title: `Mark the entry of ${fmtDay(visitDay)} entered in error`,
    message: 'It is hidden from the record but kept, with your reason, for the audit trail.',
    confirmLabel: 'Mark entered in error',
    destructive: true,
    run: async (reason) => { try { await observationInError(target.id, reason); setLoadedFor(null); onSaved(); } catch { /* toast shown */ } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-gray-500">{finding.label}</span>
        <span className="text-sm text-gray-500">· {typeText(finding)}</span>
        <h3 className="m-0 text-lg font-semibold text-gray-800">{finding.title}</h3>
        {target && <Pill status={target.statusToday} />}
        {editable && <DraftStatus draft={draft} className="ml-auto" />}
        {canWrite && !inError && finding.status === 'active' && (
          <span className={editable ? '' : 'ml-auto'}>
            <DermBinButton size="md" currentUserId={currentUserId} onDone={onBinned}
              finding={(board?.findings || []).find((f) => f.id === finding.id) || { ...finding, today: active.find((o) => o.visitDate === today) || null }} />
          </span>
        )}
      </div>
      {editable && <DraftRestoreBanner draft={draft} />}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500">Areas</span>
        <div className="flex flex-wrap gap-1.5">
          {regionsNow.map((r) => <span key={r} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-primary">{regionLabel(r)}</span>)}
          {adding.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-amber-800">
              + {regionLabel(r)}
              <button type="button" onClick={() => onAddRegionsChange(addRegions.filter((x) => x !== r))} aria-label={`Do not add ${regionLabel(r)}`} className="rounded-full p-0.5 hover:bg-amber-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <span className="text-[11px] text-gray-500">Tap the map to add more areas to this finding — they are added when you save.</span>
      </div>

      {inError && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">This finding was entered in error and can no longer be changed.</p>}
      {!inError && visitDay !== today && !target && <p className="m-0 text-sm text-gray-600">Nothing was recorded for this finding on {fmtDay(visitDay)}.</p>}

      {editable && (
        <div className="ui-surface p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h4 className="m-0 text-sm font-semibold text-gray-700">{visitDay === today ? "Today's findings" : `Findings of ${fmtDay(visitDay)}`}</h4>
            {amend && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Recorded by {target.doctorName} — changes need a reason</span>}
          </div>
          <DermLookForm idPrefix={`derm-edit-${finding.id}`} value={look} onChange={setLook} previous={previousSized}
            onStable={visitDay === today && !target ? copyLast : undefined} location={[...regionsNow, ...adding].map(regionLabel)} />
        </div>
      )}

      {canViewPhotos && !inError && (
        <div ref={photosRef} className="ui-surface scroll-mt-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="m-0 text-sm font-semibold text-gray-700">Photos</h4>
            {!photosOpen && canWrite && (
              <button type="button" onClick={openPhotos} disabled={saving}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                <Camera className="h-4 w-4" /> Add photos
              </button>
            )}
          </div>
          {!photosOpen && <p className="m-0 mt-1 text-xs text-gray-500">{dirty ? 'Add photos saves what you have typed first, so nothing is lost.' : 'Take photos with your phone (QR code) or upload from this computer.'}</p>}
          {photosOpen && (
            <div className="mt-3 flex flex-col gap-3">
              {phoneOn && (
                <DermPhoneCapture autoStart uhid={detail.uhid} regions={regionsNow} findingId={finding.id} purpose="finding"
                  onStop={() => setPhoneOn(false)}
                  onSession={(sess) => setPhone((m) => ({ ...m, [sess.id]: m[sess.id] || [] }))}
                  onPhotos={(list, sid) => { setPhone((m) => ({ ...m, [sid]: list })); refresh(); }} />
              )}
              <DermPhotosTab key={Object.values(phone).flat().length} uhid={detail.uhid} finding={finding} observations={active} canWrite={canWrite} onChanged={onSaved} dayOnly={today}
                onTakePhoto={() => setPhoneOn(true)} />
            </div>
          )}
        </div>
      )}

      {!inError && (
        <div className="ui-surface">
          <button type="button" onClick={() => setProcOpen((v) => !v)} aria-expanded={procOpen}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-700">
            Biopsy & procedures <span className="text-xs font-normal text-gray-500">{(detail.procedures || []).length ? `${detail.procedures.length} recorded` : 'none recorded'}{detail.histology?.length ? ` · ${detail.histology.length} histology` : ''}</span>
          </button>
          {procOpen && (
            <div className="border-t border-dashed border-gray-200 p-4">
              <DermProceduresTab finding={finding} histology={detail.histology} procedures={detail.procedures || []} today={today}
                uhid={detail.uhid} canWrite={canWrite && !inError} currentUserId={currentUserId} />
            </div>
          )}
        </div>
      )}

      {editable && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => save()} disabled={saving || !dirty}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving…' : amend || (adding.length && !sameDayCreator) ? 'Save…' : 'Save findings'}
          </button>
          {dirty && <button type="button" onClick={() => { setLook(baseline); onAddRegionsChange([]); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Undo changes</button>}
          <span className="ml-auto flex flex-wrap gap-3">
            {target && <button type="button" onClick={markError} className="text-xs font-semibold text-red-600 hover:underline">Mark this entry entered in error</button>}
          </span>
        </div>
      )}

      <ReasonModal
        isOpen={!!askReason}
        onClose={() => setAskReason(null)}
        title={askReason?.title}
        message={askReason?.message}
        confirmLabel={askReason?.confirmLabel}
        destructive={askReason?.destructive}
        onConfirm={async (reason) => { const job = askReason; setAskReason(null); await job.run(reason); }}
      />
    </div>
  );
};

export default DermFindingEditor;
