import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, History, Plus, ScanSearch } from 'lucide-react';
import { DermProvider, useDermContext } from '../../../contexts/DermContext';
import { useUserContext } from '../../../contexts/UserContext';
import { canRecordDerm } from '../../../utils/permissions';
import { dermService } from '../../../services/dermService';
import DermPhoto from './DermPhoto';
import DermOverlay from './DermOverlay';
import DermSiteExam from './DermSiteExam';
import DermSkinExamCard from './DermSkinExamCard';
import DermVisitViewer from './DermVisitViewer';
import DermProgressionBoard from './DermProgressionBoard';
import { photosByArea } from './dermAreaPhotoUtils';
import { DermFigureContext, figureFor } from './dermFigure';

/**
 * Dermatology · skin record — the tool inside Today's Consultation's Clinical
 * Tools (specialist module, 7 Oct 2026). Laid out as a consultation (9 Oct
 * 2026, Emu): two action cards — History (to be specified) and Examination
 * (General examination · Specific site examination) — whose pop-ups do the
 * recording, and a visit viewer below that reads what was recorded: the visit
 * list (Today first), that visit's body map, and its findings. Treatment plan
 * stays the clinic's existing module (placed below this tool once the
 * consultation becomes choosable modules).
 *
 * Lesion-centric underneath, as before: persistent findings, one look per
 * clinic day, "Not examined" never carried forward as if looked at.
 *
 * Shown only while the clinic has the Dermatology module on (the parent
 * checks); writing needs the doctor role or derm.record.
 *
 * Props: patient
 */
const ActionCard = ({ icon: Icon, title, text, children }) => (
  <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" aria-hidden="true" /><h4 className="m-0 text-sm font-semibold text-gray-800">{title}</h4></div>
    <p className="m-0 text-xs text-gray-600">{text}</p>
    <div className="mt-auto flex flex-wrap gap-2">{children}</div>
  </div>
);

const Workspace = ({ patient }) => {
  const { board, loading, loadError, refresh, closeFinding } = useDermContext();
  const { currentUser } = useUserContext();
  const uhid = patient?.uhid;
  const canWrite = canRecordDerm(currentUser) && !!board?.canWrite;
  const canViewPhotos = canRecordDerm(currentUser);
  const findings = useMemo(() => board?.findings || [], [board]);
  // The pop-up open now: { kind: 'site' (start) | 'general' | 'history' | 'progress' (region) }
  const [pop, setPop] = useState(null);
  const [followNewest, setFollowNewest] = useState(0);   // the viewer jumps to Today after recording
  const close = () => {
    if (pop?.kind === 'site') closeFinding();
    if (pop?.kind === 'site' || pop?.kind === 'general') setFollowNewest((n) => n + 1);
    setPop(null);
  };

  // Photos by area (doctors only): the progression board and the map's camera badges.
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    if (!canViewPhotos || !uhid || !board) { setPhotos([]); return undefined; }
    let live = true;
    dermService.listPhotos(uhid)
      .then((res) => { if (live) setPhotos(res?.data?.photos || []); })
      .catch(() => { if (live) setPhotos([]); });
    return () => { live = false; };
  }, [canViewPhotos, uhid, board]);
  const areaPhotos = useMemo(() => photosByArea(photos, findings), [photos, findings]);
  const findingName = (id) => { const f = findings.find((x) => x.id === id); return f ? `${f.label} ${f.title}` : ''; };

  // Every skin visit, as recorded that day (same days and wording as Visit
  // History) — refreshed whenever the board changes.
  const [visits, setVisits] = useState(null);
  useEffect(() => {
    if (!uhid || !board) return undefined;
    let live = true;
    dermService.getVisits(uhid)
      .then((res) => { if (live) setVisits(res?.data || null); })
      .catch(() => { if (live) setVisits(null); });
    return () => { live = false; };
  }, [uhid, board]);

  // Area photos not filed under a finding yet (taken with "Photos only" or from a phone).
  const areaOnly = photos.filter((p) => !p.findingId);
  const [linking, setLinking] = useState(null);
  const fileUnder = async (photo, value) => {
    if (!value) return;
    if (value === 'new') { setPop({ kind: 'site', start: { kind: 'new', picked: photo.regions || [], linkPhotoIds: [photo.id] } }); return; }
    setLinking(photo.id);
    try { await dermService.linkPhoto(photo.id, Number(value)); refresh(); } catch { /* toast via api */ } finally { setLinking(null); }
  };

  if (loading) return <p className="py-6 text-center text-sm text-gray-500">Loading the skin record…</p>;
  if (loadError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {loadError} <button type="button" onClick={refresh} className="ml-2 font-semibold underline">Try again</button>
      </div>
    );
  }
  const active = findings.filter((f) => f.status === 'active');

  return (
    <div className="flex flex-col gap-4">
      {!board?.canWrite && <p className="m-0 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">This file was merged into another. Open the active file to record findings.</p>}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ActionCard icon={History} title="History" text="Skin history — onset, previous treatments, family history, triggers. To be specified.">
          <button type="button" onClick={() => setPop({ kind: 'history' })} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Add history</button>
        </ActionCard>
        <ActionCard icon={ScanSearch} title="Examination"
          text={`General examination is one per visit (hair, nails, lymph nodes, mucosa). Specific site examination records a finding for the sites you tap; save it and go on to the next.${active.length ? ` ${active.length} finding${active.length === 1 ? '' : 's'} on record.` : ''}`}>
          <button type="button" onClick={() => setPop({ kind: 'general' })}
            className="inline-flex items-center gap-1 rounded-lg border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary ui-hover">
            <ClipboardList className="h-4 w-4" /> General examination
          </button>
          <button type="button" onClick={() => setPop({ kind: 'site' })}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Specific site examination
          </button>
        </ActionCard>
      </div>

      <DermVisitViewer
        visits={visits}
        canWrite={canWrite}
        areaPhotos={canViewPhotos ? areaPhotos : {}}
        findings={active}
        onRecord={(start) => setPop({ kind: 'site', start })}
        onOpenFinding={(id, day) => setPop({ kind: 'site', start: { kind: 'finding', id, day } })}
        onProgress={(region) => setPop({ kind: 'progress', region })}
        followNewest={followNewest}
      />

      {canViewPhotos && areaOnly.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-500">Photos not filed under a finding · {areaOnly.length}</h4>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {areaOnly.map((p) => (
              <div key={p.id} className="flex flex-col gap-1">
                <DermPhoto photo={p} aspect="1/1" caption={<><span>{(p.regionLabels || []).join(', ')}</span><span>{p.fromPhone ? 'Phone' : ''}</span></>} />
                {canWrite && (
                  <select aria-label="File this photo under" value="" disabled={linking === p.id} onChange={(e) => fileUnder(p, e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs">
                    <option value="">{linking === p.id ? 'Filing…' : 'File under…'}</option>
                    {active.map((f) => <option key={f.id} value={f.id}>{f.label} {f.title}</option>)}
                    <option value="new">A new finding…</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {pop?.kind === 'site' && (
        <DermSiteExam uhid={uhid} canWrite={canWrite} canViewPhotos={canViewPhotos} currentUserId={currentUser?.id}
          start={pop.start} onClose={() => { close(); refresh(); }} />
      )}
      {pop?.kind === 'general' && (
        <DermOverlay title="General examination" width="lg" onClose={close}
          subtitle={<span className="text-xs text-gray-500">Today · one per visit</span>}
          footer={<button type="button" onClick={close} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Done</button>}>
          <div className="p-4"><DermSkinExamCard uhid={uhid} canWrite={canWrite} embedded onSaved={refresh} /></div>
        </DermOverlay>
      )}
      {pop?.kind === 'history' && (
        <DermOverlay title="Skin history" width="md" onClose={close}>
          <p className="m-4 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
            To be specified: onset and course, previous treatments, family history, triggers, occupation and exposures. It will fill the visit viewer the same way.
          </p>
        </DermOverlay>
      )}
      {pop?.kind === 'progress' && (
        <DermProgressionBoard region={pop.region} photos={areaPhotos[pop.region] || []} findingName={findingName} onClose={close} />
      )}
    </div>
  );
};

const DermatologyTool = ({ patient }) => {
  // The figure follows the patient's file automatically (sex, and child by age) — no switch (Emu, 8 Oct).
  const figure = figureFor(patient);
  const figureCtx = useMemo(() => ({ figure, setFigure: null }), [figure]);
  return (
    <DermProvider uhid={patient?.uhid}>
      <DermFigureContext.Provider value={figureCtx}>
        <Workspace patient={patient} />
      </DermFigureContext.Provider>
    </DermProvider>
  );
};

export default DermatologyTool;
