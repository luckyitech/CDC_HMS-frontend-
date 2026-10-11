import { useEffect, useMemo, useState } from 'react';
import SwitcherTabs from '../../shared/SwitcherTabs';
import { ChevronLeft } from 'lucide-react';
import useDraft from '../../../hooks/useDraft';
import { DraftStatus, DraftRestoreBanner } from '../../shared/DraftStatus';
import ReasonModal from '../../shared/ReasonModal';
import { useDermContext } from '../../../contexts/DermContext';
import DermLookForm from './DermLookForm';
import DermRegionPicker from './DermRegionPicker';
import DermTypePicker from './DermTypePicker';
import { forgetDermVocabulary } from './useDermVocabulary';
import { specOf, phrase } from './dermExam';
import DermRegionPhotos from './DermRegionPhotos';
import DermPhotosTab from './DermPhotosTab';
import DermProceduresTab from './DermProceduresTab';
import {
  STATUS_STYLE, statusLabel, typeText, label, sizeText, describe, fmtDay,
  blankLook, lookFrom, lookPayload, lookFromDraft,
} from './dermFormat';
import { notify } from '../../../utils/notify';

/**
 * DermFindingPanel — one finding: today's look, its timeline, and its
 * amendment trail.
 *
 * Today: the last visit's look is shown for reference (carried forward
 * VISUALLY only); "Stable" copies it into today's look; the doctor changes
 * what differs and saves. One look per finding per clinic day — mine I may
 * correct all day; someone else's from today I amend (with a reason).
 * Earlier looks are amended with a reason or marked entered in error; the
 * trail shows every change (D7, D8).
 *
 * Phase 3: a "Biopsy & procedures" tab (DermProceduresTab) — histology /
 * cytology from this finding (while that module is on) and procedures.
 *
 * Props: findingId, canWrite, canViewPhotos, currentUserId, onBack()
 */
const Pill = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.stable}`}>
    {statusLabel(status)}
  </span>
);

const inputCls = 'rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

const FIELD_NAMES = {
  statusToday: 'Status', lengthMm: 'Length', widthMm: 'Width', depthMm: 'Depth', measuredBy: 'Measured by',
  morphology: 'Morphology', border: 'Border', surface: 'Surface', colours: 'Colour', symptoms: 'Symptoms',
  description: 'Description', diagnosis: 'Diagnosis', differential: 'Differential', plan: 'Plan',
  planNote: 'Plan note', reviewIn: 'Review in', type: 'Type', typeOther: 'Type (other)', title: 'Name', exactSite: 'Exact site',
  firstNoticed: 'First noticed', concern: 'Concern', regions: 'Regions', status: 'Status',
  name: 'Procedure', details: 'Details', findingIds: 'Findings treated',
};
// Amendment trail: the examination fields (9 Oct 2026) read with their own labels.
const fieldName = (k) => FIELD_NAMES[k] || specOf(k)?.label || ({ sizeMinMm: 'Smallest (mm)', sizeMaxMm: 'Largest (mm)', dermoscopy: 'Dermoscopy performed' }[k]) || k;
const shown = (v, k) => {
  if (v === null || v === undefined || v === '') return '—';
  if (v === true || v === false) return v ? 'yes' : 'no';
  if (k && specOf(k)) return phrase(k, v) || '—';
  return String(v).replace(/_/g, ' ');
};

const LookSummary = ({ o }) => (
  <div className="flex flex-col gap-0.5 text-sm">
    <div className="flex flex-wrap items-center gap-2">
      <Pill status={o.statusToday} />
      {sizeText(o) && <span className="font-mono text-xs tabular-nums text-gray-700">{sizeText(o)}</span>}
      <span className="text-xs text-gray-500">{o.doctorName || '—'}</span>
      {o.amendedByName && <span className="text-xs text-amber-700">amended by {o.amendedByName}</span>}
    </div>
    {describe(o) && <p className="text-gray-700">{describe(o)}</p>}
    {o.description && <p className="text-gray-600">{o.description}</p>}
    {(o.diagnosis || o.plan) && (
      <p className="text-gray-700">
        {o.diagnosis && <><b>Dx</b> {o.diagnosis}{o.differential ? ` (ddx ${o.differential})` : ''} </>}
        {o.plan && <><b>Plan</b> {label('plan', o.plan)}{o.planNote ? ` — ${o.planNote}` : ''}{o.reviewIn ? ` · review ${o.reviewIn}` : ''}</>}
      </p>
    )}
  </div>
);

const DermFindingPanel = ({ findingId, canWrite, canViewPhotos = false, currentUserId, onBack }) => {
  const ctx = useDermContext();
  const { detail, openFinding, refresh, saveToday, amendObservation, observationInError, findingInError, updateFinding } = ctx;
  const [tab, setTab] = useState('today');
  const [look, setLook] = useState(blankLook());
  const [loadedFor, setLoadedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [amending, setAmending] = useState(null);       // observation being amended
  const [amendLook, setAmendLook] = useState(blankLook());
  const [askReason, setAskReason] = useState(null);     // { title, message, run(reason) }
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(null);
  const [photoCounts, setPhotoCounts] = useState({});

  useEffect(() => { openFinding(findingId); }, [findingId, openFinding]);

  const ready = detail && detail.finding?.id === findingId;
  const today = detail?.today;
  const active = useMemo(() => (ready ? detail.observations.filter((o) => o.status === 'active') : []), [ready, detail]);
  const todayObs = active.find((o) => o.visitDate === today) || null;
  const earlier = active.filter((o) => o.visitDate < today);
  const lastEarlier = earlier[0] || null;
  const previousSized = earlier.find((o) => o.lengthMm) || null;
  const finding = ready ? detail.finding : null;
  const inError = finding?.status === 'entered_in_error';
  const someoneElseToday = todayObs && todayObs.doctorId !== currentUserId;
  const editable = canWrite && !inError && !someoneElseToday;
  const baseline = todayObs && !someoneElseToday ? lookFrom(todayObs) : blankLook();

  // Load today's look into the form once per finding (and after a save).
  useEffect(() => {
    if (!ready || loadedFor === findingId) return;
    setLook(todayObs && !someoneElseToday ? lookFrom(todayObs) : blankLook());
    setLoadedFor(findingId);
  }, [ready, findingId, loadedFor, todayObs, someoneElseToday]);

  const draft = useDraft({
    uhid: detail?.uhid,
    formKey: 'derm-finding',
    contextKey: String(findingId),
    label: finding ? `Skin finding ${finding.label}` : 'Skin finding',
    value: look,
    baseline,
    enabled: !!(ready && loadedFor === findingId && editable),
    onRestore: (p) => setLook(lookFromDraft(p)),
    onDiscard: () => setLook(baseline),
  });

  if (!ready) return <p className="py-6 text-center text-sm text-gray-500">Opening the finding…</p>;

  const copyLast = () => {
    if (!lastEarlier) { setLook({ ...look, statusToday: 'stable' }); return; }
    setLook({ ...lookFrom(lastEarlier), statusToday: 'stable' });
  };

  const save = async () => {
    if (!look.statusToday) { notify('error', 'Choose the status today'); return; }
    setSaving(true);
    try {
      await saveToday(finding.id, lookPayload(look));
      forgetDermVocabulary();   // any word typed under Other is offered from now on
      draft.markSaved();
    } catch { /* toast shown; keep the form */ } finally { setSaving(false); }
  };

  const startAmend = (o) => { setAmending(o); setAmendLook(lookFrom(o)); setTab(o.visitDate === today ? 'today' : 'timeline'); };
  const saveAmend = () => setAskReason({
    title: `Amend the entry of ${fmtDay(amending.visitDate)}`,
    message: 'The entry keeps its author. Your change, with this reason, is kept in the amendment trail and shown on that day.',
    confirmLabel: 'Amend',
    run: async (reason) => {
      const payload = lookPayload(amendLook);
      const before = lookPayload(lookFrom(amending));
      const changed = Object.fromEntries(Object.entries(payload).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k])));
      if (!Object.keys(changed).length) { notify('error', 'Nothing was changed'); return; }
      try { await amendObservation(amending.id, { ...changed, reason }); forgetDermVocabulary(); setAmending(null); } catch { /* toast shown */ }
    },
  });

  const startEditDetails = () => {
    setDetails({ type: finding.type, typeOther: finding.typeOther || '', title: finding.title, regions: finding.regions, exactSite: finding.exactSite || '', firstNoticed: finding.firstNoticed || '', concern: finding.concern || '' });
    setEditing(true);
  };
  const saveDetails = () => {
    const changes = Object.fromEntries(Object.entries(details).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(k === 'regions' ? finding.regions : (finding[k] ?? ''))));
    if (!Object.keys(changes).length) { setEditing(false); return; }
    if (changes.regions && !changes.regions.length) { notify('error', 'Keep at least one body region'); return; }
    if (details.type === 'other' && !String(details.typeOther || '').trim()) { notify('error', 'Name the type of finding (you chose Other)'); return; }
    // Type and its "Other" name travel together (the server checks them as a pair).
    if ('type' in changes || 'typeOther' in changes) {
      changes.type = details.type;
      changes.typeOther = details.type === 'other' ? String(details.typeOther).trim() : null;
    }
    const sameDayCreator = finding.createdById === currentUserId && finding.createdDay === today;
    const run = async (reason) => {
      try { await updateFinding(finding.id, { ...changes, ...(reason ? { reason } : {}) }); if (changes.type === 'other') forgetDermVocabulary(); setEditing(false); } catch (err) {
        if (err?.data?.code === 'REASON_REQUIRED') setAskReason({ title: 'Change an earlier finding', message: 'This finding was recorded before today or by someone else, so the change needs a reason. It is kept in the amendment trail.', confirmLabel: 'Save change', run });
      }
    };
    if (sameDayCreator) run(null);
    else setAskReason({ title: 'Change this finding', message: 'The change and this reason are kept in the amendment trail.', confirmLabel: 'Save change', run });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ChevronLeft className="h-4 w-4" /> Skin record
        </button>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-gray-500">{finding.label} · {typeText(finding)}</span>
        <span className="text-lg font-bold text-gray-800">{finding.title}</span>
        <span className="text-sm text-gray-500">{finding.regionLabels.join(', ')}{finding.exactSite ? ` — ${finding.exactSite}` : ''}</span>
        {inError ? <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">Entered in error</span> : <Pill status={finding.currentStatus} />}
        {canWrite && !inError && (
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={startEditDetails} className="text-xs font-medium text-primary hover:underline">Edit details</button>
            <button
              type="button"
              className="text-xs font-medium text-red-600 hover:underline"
              onClick={() => setAskReason({ title: `Mark ${finding.label} entered in error`, message: 'It leaves the skin record and the visit note but is kept, with your reason, for the audit trail. This cannot be undone here.', confirmLabel: 'Mark entered in error', destructive: true, run: async (reason) => { try { await findingInError(finding.id, reason); } catch { /* toast */ } } })}
            >
              Entered in error
            </button>
          </span>
        )}
      </div>
      {inError && <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">Entered in error by {finding.errorByName} — {finding.errorReason}</p>}
      {(() => {
        const h = Array.isArray(detail.histology) ? detail.histology.find((r) => r.status !== 'cancelled') : null;
        if (!h) return null;
        return (
          <button type="button" onClick={() => setTab('procedures')}
            className={`self-start rounded-lg px-3 py-1.5 text-left text-sm ${h.status === 'resulted' ? 'bg-green-50 text-green-900' : h.overdue ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
            <b>{h.kind === 'cytology' ? 'Cytology' : 'Histology'}{h.status === 'resulted' ? ':' : h.overdue ? ' overdue' : ' pending'}</b>{' '}
            {h.status === 'resulted' ? h.resultSummary : `${h.specimenNumber} · sent ${fmtDay(h.visitDate)}`}
          </button>
        );
      })()}
      {(finding.firstNoticed || finding.concern) && (
        <p className="text-sm text-gray-600">{finding.firstNoticed && <>First noticed {finding.firstNoticed}. </>}{finding.concern && <>Concern: {finding.concern}</>}</p>
      )}

      {editing && details && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-blue-50/40 p-4">
          <DermTypePicker idPrefix="derm-edit-type" type={details.type} typeOther={details.typeOther} onChange={(t) => setDetails({ ...details, ...t })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input id="derm-edit-title" aria-label="Short name" value={details.title} onChange={(e) => setDetails({ ...details, title: e.target.value })} className={inputCls} />
            <input id="derm-edit-site" aria-label="Exact site" placeholder="Exact site" value={details.exactSite} onChange={(e) => setDetails({ ...details, exactSite: e.target.value })} className={inputCls} />
            <input id="derm-edit-noticed" aria-label="First noticed" placeholder="First noticed" value={details.firstNoticed} onChange={(e) => setDetails({ ...details, firstNoticed: e.target.value })} className={inputCls} />
            <input id="derm-edit-concern" aria-label="Patient's concern" placeholder="Patient's concern" value={details.concern} onChange={(e) => setDetails({ ...details, concern: e.target.value })} className={inputCls} />
          </div>
          <DermRegionPicker value={details.regions} onChange={(regions) => setDetails({ ...details, regions })} photoCounts={photoCounts}>
            {canViewPhotos && (
              // Photos attach to the finding's SAVED areas — a region added here
              // can take photos once Save details has kept it.
              <DermRegionPhotos uhid={detail.uhid} findingId={finding.id} regions={finding.regions} onCounts={setPhotoCounts} onSaved={refresh} />
            )}
          </DermRegionPicker>
          <div className="flex gap-2">
            <button type="button" onClick={saveDetails} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">Save details</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <SwitcherTabs ariaLabel="Finding" active={tab} onChange={setTab} tabs={[
        { id: 'today', label: 'Today' }, { id: 'timeline', label: 'Timeline', count: active.length },
        ...(canViewPhotos ? [{ id: 'photos', label: 'Photos' }] : []),
        { id: 'procedures', label: Array.isArray(detail.histology) ? 'Biopsy & procedures' : 'Procedures' },
      ]} />

      {tab === 'today' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500">Last time</span>
            {lastEarlier ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                <p className="mb-1 text-xs font-semibold text-gray-700">{fmtDay(lastEarlier.visitDate)}</p>
                <LookSummary o={lastEarlier} />
              </div>
            ) : (
              <p className="text-sm text-gray-500">No earlier visit — this finding was first recorded today.</p>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            {someoneElseToday && !amending && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="mb-2 font-medium text-amber-800">{todayObs.doctorName} already recorded this finding today.</p>
                <LookSummary o={todayObs} />
                {canWrite && !inError && <button type="button" onClick={() => startAmend(todayObs)} className="mt-2 text-sm font-semibold text-primary hover:underline">Amend their entry</button>}
              </div>
            )}
            {amending && amending.visitDate === today ? (
              <AmendBox o={amending} value={amendLook} onChange={setAmendLook} onSave={saveAmend} onCancel={() => setAmending(null)} previous={previousSized} location={finding.regionLabels || []} />
            ) : editable ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{todayObs ? 'Today — you can correct this all day' : "Today's look"}</span>
                  <DraftStatus draft={draft} className="ml-auto" />
                </div>
                <DraftRestoreBanner draft={draft} />
                <DermLookForm idPrefix={`derm-${finding.id}`} value={look} onChange={setLook} previous={previousSized} onStable={copyLast} location={finding.regionLabels || []} />
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {saving ? 'Saving…' : "Save today's look"}
                  </button>
                  <span className="text-xs text-gray-500">"Stable" copies last time's look into today; change only what differs.</span>
                </div>
              </>
            ) : !someoneElseToday && (
              <div className="text-sm text-gray-500">{inError ? 'This finding was entered in error.' : todayObs ? <LookSummary o={todayObs} /> : 'Not examined today.'}</div>
            )}
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <div className="flex flex-col gap-3">
          {detail.observations.map((o) => (
            <div key={o.id} className={`grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-lg border p-3 ${o.status === 'active' ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
              <div className="text-right text-xs tabular-nums text-gray-500">{o.visitDate === today ? 'Today' : fmtDay(o.visitDate)}</div>
              <div className="flex min-w-0 flex-col gap-2">
                {o.status === 'active' ? <LookSummary o={o} /> : <p className="text-sm text-gray-500 line-through">Entered in error — {o.doctorName}</p>}
                {amending?.id === o.id && o.visitDate !== today && (
                  <AmendBox o={o} value={amendLook} onChange={setAmendLook} onSave={saveAmend} onCancel={() => setAmending(null)} previous={earlier.find((e) => e.visitDate < o.visitDate && e.lengthMm) || null} location={finding.regionLabels || []} />
                )}
                {canWrite && !inError && o.status === 'active' && amending?.id !== o.id && (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => startAmend(o)} className="text-xs font-medium text-primary hover:underline">Amend</button>
                    <button type="button" className="text-xs font-medium text-red-600 hover:underline"
                      onClick={() => setAskReason({ title: `Mark the entry of ${fmtDay(o.visitDate)} entered in error`, message: 'It is hidden from the record and the visit note but kept, with your reason, for the audit trail.', confirmLabel: 'Mark entered in error', destructive: true, run: async (reason) => { try { await observationInError(o.id, reason); } catch { /* toast */ } } })}>
                      Entered in error
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {detail.edits.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">Amendment trail</p>
              <ul className="flex flex-col gap-2 text-sm">
                {detail.edits.map((e) => {
                  const obs = e.entity === 'observation' ? detail.observations.find((o) => o.id === e.entityId) : null;
                  const proc = e.entity === 'procedure' ? (detail.procedures || []).find((p) => p.id === e.entityId) : null;
                  const what = proc ? `the procedure ${proc.name} of ${fmtDay(proc.procedureDate)}` : obs ? `the entry of ${fmtDay(obs.visitDate)}` : 'the finding';
                  return (
                    <li key={e.id}>
                      <b>{fmtDay(String(e.createdAt).slice(0, 10))}</b> · {e.editedByName} · {e.action === 'entered_in_error' ? `marked ${what} entered in error` : `amended ${what}`}
                      {e.action === 'amend' && (
                        <span className="text-gray-700"> — {Object.entries(e.changes).map(([k, [a, b]]) => `${fieldName(k)}: ${shown(a, k)} → ${shown(b, k)}`).join('; ')}</span>
                      )}
                      <span className="text-gray-600"> · Reason: {e.reason}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'procedures' && (
        <DermProceduresTab
          finding={finding}
          histology={detail.histology}
          procedures={detail.procedures || []}
          today={today}
          uhid={detail.uhid}
          canWrite={canWrite && !inError}
          currentUserId={currentUserId}
        />
      )}

      {tab === 'photos' && canViewPhotos && (
        <DermPhotosTab uhid={detail.uhid} finding={finding} observations={detail.observations} canWrite={canWrite} onChanged={refresh} />
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

const AmendBox = ({ o, value, onChange, onSave, onCancel, previous, location = [] }) => (
  <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50/50 p-3">
    <p className="text-sm font-semibold text-amber-800">Amending the entry of {fmtDay(o.visitDate)} by {o.doctorName}</p>
    <DermLookForm idPrefix={`derm-amend-${o.id}`} value={value} onChange={onChange} previous={previous} location={location} />
    <div className="flex gap-2">
      <button type="button" onClick={onSave} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">Save amendment…</button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">Cancel</button>
    </div>
  </div>
);

export default DermFindingPanel;
