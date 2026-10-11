import { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useDermContext } from '../../../contexts/DermContext';
import { regionLabel } from '../../../constants/dermRegions';
import DermOverlay from './DermOverlay';
import DermBodyMap from './DermBodyMap';
import DermNewFinding from './DermNewFinding';
import DermFindingEditor from './DermFindingEditor';
import DermBinButton from './DermBinButton';
import { STATUS_STYLE, statusLabel, typeText, fmtDay } from './dermFormat';

/**
 * Specific site examination (9 Oct 2026, Emu) — the pop-up a dermatology
 * consultation records in. It is only for adding the day's findings and
 * photos; histories and timelines are read on the main page.
 *
 * Body map on the left: tap every site a finding covers (front and back).
 * Right: a new finding, or "Edit findings" of one already on record (today's
 * look, or a past visit's entry amended with a reason; areas tapped are added
 * to it). Save keeps the pop-up open with a clean form for the next site;
 * Done closes it. A red bin beside each saved finding retires or deletes it
 * (10 Oct 2026 — a wrong name or type is deleted and recorded again). Photos sit at the bottom of the findings: "Add photos" saves
 * first so nothing typed is lost, then offers camera, upload and phone QR.
 *
 * Props: uhid, canWrite, canViewPhotos, currentUserId, onClose,
 *        start — { kind: 'new', picked, linkPhotoIds } (default)
 *              | { kind: 'finding', id, day, addRegions } (Edit findings / Add to)
 */
const Pill = ({ status, children }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status] || 'border-gray-200 bg-gray-100 text-gray-600'}`}>
    {children || statusLabel(status)}
  </span>
);

const DermSiteExam = ({ uhid, canWrite, canViewPhotos, currentUserId, onClose, start = { kind: 'new' } }) => {
  const { board, refresh, closeFinding } = useDermContext();
  const [view, setView] = useState('front');
  const [mode, setMode] = useState(start.kind === 'finding'
    ? { kind: 'finding', id: start.id, day: start.day || null, photos: false }
    : { kind: 'new' });
  // Areas tapped: for a new finding, its areas; when editing, areas to add to it.
  const [picked, setPicked] = useState(() => [...(start.kind === 'finding' ? (start.addRegions || []) : (start.picked || []))]);
  const [formKey, setFormKey] = useState(0);
  const [linkPhotoIds, setLinkPhotoIds] = useState(() => [...(start.linkPhotoIds || [])]);
  const [saved, setSaved] = useState([]);
  const rightRef = useRef(null);

  const findings = board?.findings || [];
  const active = findings.filter((f) => f.status === 'active');
  const editing = mode.kind === 'finding' ? findings.find((f) => f.id === mode.id) : null;
  const alreadyIn = {};
  for (const f of active) for (const r of f.regions || []) (alreadyIn[r] = alreadyIn[r] || []).push(f);
  const inPicked = mode.kind === 'new' && picked.length ? active.filter((f) => f.regions.some((r) => picked.includes(r))) : [];

  const toTop = () => rightRef.current?.scrollIntoView({ block: 'start' });
  const tap = (id) => {
    if (editing && (editing.regions || []).includes(id)) return;   // already one of its areas
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const editFinding = (f, addRegions = []) => { closeFinding(); setMode({ kind: 'finding', id: f.id, day: null, photos: false }); setPicked(addRegions); toTop(); };
  const backToNew = () => { closeFinding(); setMode({ kind: 'new' }); setPicked([]); setFormKey((k) => k + 1); toTop(); };

  const finishNew = (id, opts = {}) => {
    if (id) setSaved((s) => [...s, { id, regions: picked.map(regionLabel) }]);
    setLinkPhotoIds([]);
    refresh();
    if (id && opts.photos) { setMode({ kind: 'finding', id, day: null, photos: true }); setPicked([]); toTop(); return; }
    setPicked([]);
    setFormKey((k) => k + 1);
    toTop();
  };
  // Bin (retire / delete): a deleted finding leaves the "Saved" line; editing it → back to a new finding.
  const binDone = (f) => (kind) => {
    if (kind === 'deleted') setSaved((s) => s.filter((x) => x.id !== f.id));
    if (editing?.id === f.id) backToNew();
  };

  return (
    <DermOverlay
      title="Specific site examination"
      subtitle={saved.length > 0 && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">{saved.length} new this visit</span>}
      onClose={onClose}
      footer={<button type="button" onClick={onClose} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">Done</button>}
    >
      <div className="grid min-h-full md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 md:sticky md:top-0 md:max-h-[calc(94vh-120px)] md:self-start md:overflow-y-auto md:border-b-0 md:border-r">
          <p className="m-0 text-xs text-gray-600">
            {editing
              ? <>Tap an area to <b>add it to {editing.label}</b>. Its own areas are shaded.</>
              : <>Tap every site this finding covers — use <b>Back</b> for the back of the body. A numbered marker is a finding already on record.</>}
          </p>
          <DermBodyMap view={view} onViewChange={setView} findings={active}
            selected={editing ? [...(editing.regions || []), ...picked] : picked} onRegion={tap} />
          {picked.length > 0 && (
            <p className="m-0 text-xs text-gray-700"><b>{editing ? 'Adding:' : 'Chosen:'}</b> {picked.map(regionLabel).join(' · ')}
              <button type="button" onClick={() => setPicked([])} className="ml-2 font-semibold text-primary hover:underline">Clear</button></p>
          )}
          {inPicked.length > 0 && canWrite && (
            <div className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              <b>Already recorded here:</b>
              {inPicked.map((f) => (
                <span key={f.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{f.label} {f.title}</span>
                  <button type="button" onClick={() => editFinding(f, picked.filter((r) => !f.regions.includes(r)))} className="shrink-0 font-semibold text-primary hover:underline">Edit findings</button>
                </span>
              ))}
              <span className="text-[11px]">Or carry on — a new finding may share a site.</span>
            </div>
          )}
          {mode.kind === 'new' && picked.length > 0 && !inPicked.length && active.length > 0 && canWrite && (
            <div className="flex flex-col gap-1 text-xs">
              <span className="text-gray-600">Same lesion as one already on record? Add {picked.length === 1 ? 'this area' : 'these areas'} to it:</span>
              <div className="flex flex-wrap gap-1.5">
                {active.map((f) => (
                  <button key={f.id} type="button" onClick={() => editFinding(f, picked)} className="rounded-full border border-gray-300 bg-white px-2.5 py-0.5 font-medium text-gray-700 hover:bg-gray-50">
                    Add to {f.label} {f.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {active.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Findings on record · {active.length}</span>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {active.map((f) => (
                  <li key={f.id} className="flex items-center gap-1">
                    <button type="button" onClick={() => editFinding(f)} aria-current={editing?.id === f.id}
                      className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs hover:bg-gray-50 ${editing?.id === f.id ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
                      <span className="font-mono text-gray-500">{f.label}</span>
                      <span className="min-w-0 flex-1 truncate"><b className="text-gray-800">{f.title}</b> <span className="text-gray-500">· {typeText(f)}</span></span>
                      {f.today ? <Pill status={f.today.statusToday}>Today: {statusLabel(f.today.statusToday)}</Pill> : <Pill status={null}>Not examined today</Pill>}
                    </button>
                    {canWrite && <DermBinButton finding={f} currentUserId={currentUserId} onDone={binDone(f)} />}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div ref={rightRef} className="flex min-w-0 flex-col gap-3 p-4">
          {saved.length > 0 && mode.kind === 'new' && (
            <div className="flex flex-col gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" /> <b>Saved this visit</b> — the form below is clear for the next site.</span>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0 pl-6">
                {saved.map((s) => {
                  const f = findings.find((x) => x.id === s.id);
                  return (
                    <li key={s.id} className="flex items-center gap-1">
                      <span className="min-w-0 flex-1">{f ? <><b>{f.label} {f.title}</b>{f.status === 'resolved' && ' · retired'}</> : 'Finding'} <span className="text-green-700">({s.regions.join(', ')})</span></span>
                      {f && f.status === 'active' && canWrite && <DermBinButton finding={f} currentUserId={currentUserId} onDone={binDone(f)} />}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {!canWrite && <p className="m-0 text-sm text-gray-600">Recording findings needs the doctor role or the Dermatology record permission.</p>}
          {mode.kind === 'new' && canWrite && (
            <DermNewFinding
              key={`new-${formKey}`}
              regions={picked}
              onRegionsChange={setPicked}
              alreadyIn={Object.fromEntries(Object.entries(alreadyIn).map(([r, fs]) => [r, fs.map((f) => f.label).join(', ')]))}
              linkPhotoIds={linkPhotoIds}
              onDone={finishNew}
            />
          )}
          {mode.kind === 'finding' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={backToNew} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" /> New finding
                </button>
                <span className="text-xs text-gray-500">Edit findings{mode.day ? ` · ${fmtDay(mode.day)}` : ' · today'}</span>
              </div>
              <DermFindingEditor
                key={`${mode.id}-${mode.day || 'today'}`}
                findingId={mode.id}
                day={mode.day}
                addRegions={picked}
                onAddRegionsChange={setPicked}
                canWrite={canWrite}
                canViewPhotos={canViewPhotos}
                currentUserId={currentUserId}
                startWithPhotos={mode.photos}
                onSaved={refresh}
                onBinned={(kind) => { if (kind === 'deleted') setSaved((x) => x.filter((y) => y.id !== mode.id)); backToNew(); }}
              />
            </>
          )}
        </div>
      </div>
    </DermOverlay>
  );
};

export default DermSiteExam;
