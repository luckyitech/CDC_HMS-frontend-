import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bluetooth, Clock, XCircle, Printer, SlidersHorizontal, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from './Card';
import Button from './Button';
import SwitcherTabs from './SwitcherTabs';
import ReasonModal from './ReasonModal';
import Modal from './Modal';
import { MeterDownloadModal } from './MeterDownload';
import GlucoseReportPrint from './GlucoseReportPrint';
import { glucoseService } from '../../services/glucoseService';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin } from '../../utils/permissions';
import {
  WINDOWS, UNITS, SOURCE_META, MMOL, makeVal, unitLabelFor, fmtWhen, fmtDelta, SourceSwatch,
} from './gmc/gmcShared';
import GlucoseDailyTab from './gmc/GlucoseDailyTab';
import GlucoseSugarChartTab from './gmc/GlucoseSugarChartTab';
import GlucoseIndicesTab from './gmc/GlucoseIndicesTab';
import GlucoseHyposTab from './gmc/GlucoseHyposTab';
import GlucoseLogbookTab from './gmc/GlucoseLogbookTab';

/**
 * GlucoseManagementCentre — every glucose data point the clinic holds for a
 * patient, in one place, with the consensus glycaemic metrics. IDENTICAL on the
 * doctor, staff and patient screens (one shared component): only the clinician-
 * only actions — excluding a reading, editing the targets — are gated by the
 * `variant`. The patient variant reuses everything else verbatim, so what a
 * patient sees at home is exactly what the doctor sees in clinic.
 *
 * The screen is organised into five tabs so no single view is crowded:
 *   • Daily graph — one day at a time (or the overlaid modal-day), CGM-style
 *   • Sugar chart — the SMBG logbook grid (days × meal slots), colour-coded
 *   • Indices     — GMI, measured HbA1c (+ trend), TIR/TAR/TBR, consistency, targets
 *   • Hypos       — the low-glucose picture
 *   • Logbook     — the running record of every reading and diary entry
 *
 * A persistent header carries the window (7/14/30/90 days), the source filter,
 * the unit toggle (mmol/L default, switches to mg/dL — the app converts), and
 * the meter-download and print actions, so those apply across every tab. The
 * Print action opens a report builder (ReportMenu → GlucoseReportPrint): pick
 * any sections onto one letterhead document, Indices always first.
 *
 * All maths are SERVER-SIDE (GET /patients/:uhid/glucose/summary →
 * backend/constants/glucose.js) so this screen, the patient's and any print
 * show the same numbers. Meter readings are plotted at the meter's own wall
 * time, unchanged; a meter whose clock was out gets a banner, not a silent fix.
 *
 * Props:
 *   patient  { uhid, name, … }
 *   variant  'doctor' (default) | 'patient'
 */

const TABS = [
  { id: 'daily', label: 'Daily graph' },
  { id: 'chart', label: 'Sugar chart' },
  { id: 'indices', label: 'Indices' },
  { id: 'hypos', label: 'Hypos' },
  { id: 'logbook', label: 'Logbook' },
];

// The sections a report can carry beyond Indices (which is always included and
// always first). Order here is the order they print after Indices.
const REPORT_PICKS = [
  { id: 'daily', label: 'Daily graph' },
  { id: 'chart', label: 'Sugar chart' },
  { id: 'hypos', label: 'Hypos' },
  { id: 'logbook', label: 'Logbook' },
];

const GlucoseManagementCentre = ({ patient, variant = 'doctor' }) => {
  const { currentUser } = useUserContext();
  const isClinician = variant === 'doctor' && (currentUser?.role === 'doctor' || canAccessAdmin(currentUser));
  const isPatient = variant === 'patient';
  const uhid = patient?.uhid;

  const [tab, setTab] = useState('daily');
  const [win, setWin] = useState('14');
  const [unit, setUnit] = useState('mmol');
  const [sources, setSources] = useState({ meter: true, logbook: true, clinic: true });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [excludeRow, setExcludeRow] = useState(null);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [reportSections, setReportSections] = useState(null); // null = closed; array of section ids = open

  const days = WINDOWS.find((w) => w.id === win)?.days || 14;
  const activeSources = Object.entries(sources).filter(([, on]) => on).map(([k]) => k);

  const load = useCallback(async () => {
    if (!uhid) return;
    setLoading(true); setErr(null);
    try {
      const res = await glucoseService.getSummary(uhid, { days, sources: activeSources.join(',') || 'none' });
      setData(res?.data || res);
    } catch (e) {
      setErr(e?.message || 'Could not load the glucose summary.');
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uhid, days, sources]);
  useEffect(() => { load(); }, [load]);

  const val = useMemo(() => makeVal(unit), [unit]);
  const unitLabel = unitLabelFor(unit);
  const m = data?.metrics;
  const t = data?.targets?.targets;

  // The Active meter whose clock was out at its last download and not marked corrected since.
  const clockMeter = useMemo(() => (data?.meters || []).find((mt) => mt.status === 'Active' && mt.lastClockDeltaSec !== null && Math.abs(mt.lastClockDeltaSec) > 600 && (!mt.clockCorrectedAt || new Date(mt.clockCorrectedAt) < new Date(mt.lastSyncAt))), [data]);
  const lastMeter = useMemo(() => (data?.meters || []).filter((mt) => mt.lastSyncAt).sort((a, b) => new Date(b.lastSyncAt) - new Date(a.lastSyncAt))[0] || null, [data]);

  const onExclude = async (reason) => {
    try { await glucoseService.excludeReading(uhid, excludeRow.id, reason); toast.success('Reading excluded'); setExcludeRow(null); load(); }
    catch (e) { toast.error(e?.message || 'Could not exclude'); }
  };
  const onRestore = async (row) => {
    try { await glucoseService.restoreReading(uhid, row.id); toast.success('Reading restored'); load(); }
    catch (e) { toast.error(e?.message || 'Could not restore'); }
  };
  const onClockCorrected = async () => {
    try { await glucoseService.markClockCorrected(uhid, clockMeter.id); toast.success('Noted — applies to future downloads'); load(); }
    catch (e) { toast.error(e?.message || 'Could not save'); }
  };

  if (!patient) return null;

  return (
    <Card className="!p-4 sm:!p-6 lg:!p-8">
      {/* ---- meta line ---- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
        <span className="font-mono">{patient.uhid}</span>
        <span className={`px-2 py-0.5 rounded-full border font-semibold ${data?.targets?.individualised ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          Targets: {data?.targets?.individualised ? `individualised · ${data.targets.meta?.setByName || ''} ${data.targets.meta?.setAt ? new Date(data.targets.meta.setAt).toLocaleDateString('en-GB') : ''}` : 'clinic default (4–10 mmol/L)'}
        </span>
        {lastMeter && <span>Meter synced {new Date(lastMeter.lastSyncAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {/* ---- tabs + view/actions (one row) ---- */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {data && m && t && <SwitcherTabs tabs={TABS} active={tab} onChange={setTab} />}
        <div className="flex-1 min-w-[1px]" />
        <ViewMenu win={win} setWin={setWin} unit={unit} setUnit={setUnit} sources={sources} setSources={setSources} />
        <Button onClick={() => setDownloadOpen(true)} className="!px-3 !py-2 text-sm" title={isPatient ? 'Sync my meter' : 'Download meter'} aria-label={isPatient ? 'Sync my meter' : 'Download meter'}><Bluetooth className="w-4 h-4" /></Button>
        {data && m && <ReportMenu currentTab={tab} isPatient={isPatient} onRun={setReportSections} />}
      </div>

      {clockMeter && (
        <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
          <Clock className="w-5 h-5 flex-shrink-0" />
          <span><strong>Meter clock was {fmtDelta(clockMeter.lastClockDeltaSec)} at the last download.</strong> Reading times are the meter&rsquo;s own and are not adjusted; time-of-day buckets for this meter are low-confidence until the clock is set. Marking it set applies to future downloads only — readings already filed keep the meter&rsquo;s own time.{' '}
            <button type="button" className="font-semibold underline" onClick={onClockCorrected}>{isPatient ? "I've set my meter clock" : "I've set the meter clock"}</button></span>
        </div>
      )}

      {err && <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2"><XCircle className="w-5 h-5" />{err}</div>}
      {loading && !data && (
        <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" /><p className="text-gray-500">Loading glucose data…</p></div>
      )}

      {data && m && t && (
        <>
          {tab === 'daily' && <GlucoseDailyTab data={data} t={t} unit={unit} val={val} unitLabel={unitLabel} />}
          {tab === 'chart' && <GlucoseSugarChartTab data={data} t={t} val={val} unitLabel={unitLabel} />}
          {tab === 'indices' && <GlucoseIndicesTab data={data} m={m} t={t} unit={unit} val={val} unitLabel={unitLabel} days={days} isClinician={isClinician} onEditTargets={() => setTargetsOpen(true)} />}
          {tab === 'hypos' && <GlucoseHyposTab data={data} m={m} t={t} val={val} unitLabel={unitLabel} />}
          {tab === 'logbook' && <GlucoseLogbookTab data={data} t={t} val={val} unitLabel={unitLabel} uhid={uhid} isClinician={isClinician} isPatient={isPatient} load={load} onExcludeRow={setExcludeRow} onRestore={onRestore} />}
        </>
      )}

      <MeterDownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} patient={patient} variant={variant} onImported={() => load()} />
      {reportSections && data && m && <GlucoseReportPrint data={data} patient={patient} unit={unit} sections={reportSections} onClose={() => setReportSections(null)} />}
      <ReasonModal isOpen={!!excludeRow} onClose={() => setExcludeRow(null)} title="Exclude this reading" message={excludeRow ? `${fmtWhen(excludeRow.at)} · ${val(excludeRow.mgdl)} ${unitLabel}. It stays in the record, struck through, with your name and this reason; it is left out of the metrics.` : ''} confirmLabel="Exclude" placeholder="e.g. Expired strip · control test · not this patient" onConfirm={onExclude} />
      {isClinician && data && <TargetsModal isOpen={targetsOpen} onClose={() => setTargetsOpen(false)} uhid={uhid} unit={unit} current={data.targets} onSaved={() => { setTargetsOpen(false); load(); }} />}
    </Card>
  );
};

// Doctor/admin: set or change the patient's individual targets.
const TargetsModal = ({ isOpen, onClose, uhid, unit, current, onSaved }) => {
  const keys = ['tirLowMgdl', 'tirHighMgdl', 'tbrLevel2Mgdl', 'tarLevel2Mgdl', 'fastingLowMgdl', 'fastingHighMgdl'];
  const labels = { tirLowMgdl: 'In range · low', tirHighMgdl: 'In range · high', tbrLevel2Mgdl: 'Level-2 low', tarLevel2Mgdl: 'Level-2 high', fastingLowMgdl: 'Fasting band · low', fastingHighMgdl: 'Fasting band · high' };
  const toU = (mg) => (unit === 'mmol' ? Math.round((mg / MMOL) * 10) / 10 : mg);
  const toMg = (v) => (unit === 'mmol' ? Math.round(Number(v) * MMOL) : Number(v));
  const [preset, setPreset] = useState(current?.meta?.preset || '');
  const [vals, setVals] = useState(() => Object.fromEntries(keys.map((k) => [k, toU(current.targets[k])])));
  const [goals, setGoals] = useState({ tirGoalPct: current.targets.tirGoalPct, tbrGoalPct: current.targets.tbrGoalPct, tarGoalPct: current.targets.tarGoalPct, cvTargetPct: current.targets.cvTargetPct });
  const [rationale, setRationale] = useState(current?.meta?.rationale || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPreset(current?.meta?.preset || '');
    setVals(Object.fromEntries(keys.map((k) => [k, toU(current.targets[k])])));
    setGoals({ tirGoalPct: current.targets.tirGoalPct, tbrGoalPct: current.targets.tbrGoalPct, tarGoalPct: current.targets.tarGoalPct, cvTargetPct: current.targets.cvTargetPct });
    setRationale(current?.meta?.rationale || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const applyPreset = (id) => {
    setPreset(id);
    const base = { ...current.consensus, ...(current.presets?.[id]?.values || {}) };
    setVals(Object.fromEntries(keys.map((k) => [k, toU(base[k])])));
    setGoals({ tirGoalPct: base.tirGoalPct, tbrGoalPct: base.tbrGoalPct, tarGoalPct: base.tarGoalPct, cvTargetPct: base.cvTargetPct });
  };
  const save = async () => {
    if (!rationale.trim()) { toast.error('A rationale is required'); return; }
    setSaving(true);
    try {
      await glucoseService.setTargets(uhid, { preset: preset || null, rationale: rationale.trim(), ...Object.fromEntries(keys.map((k) => [k, toMg(vals[k])])), ...goals });
      toast.success('Targets saved'); onSaved();
    } catch (e) { toast.error(e?.message || 'Could not save targets'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Individual glucose targets" size="lg">
      <div className="space-y-4 text-sm">
        <div>
          <p className="font-semibold text-gray-700 mb-1">Start from</p>
          <div className="flex flex-wrap gap-2">
            {[['', 'Clinic default (4–10 mmol/L)'], ...Object.entries(current.presets || {}).filter(([id]) => id !== 'standard').map(([id, p]) => [id, p.label])].map(([id, label]) => (
              <button key={id} type="button" onClick={() => applyPreset(id)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${preset === id ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700'}`}>{label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {keys.map((k) => (
            <label key={k} className="block"><span className="text-xs font-semibold text-gray-600">{labels[k]} ({unit === 'mmol' ? 'mmol/L' : 'mg/dL'})</span>
              <input type="number" step={unit === 'mmol' ? 0.1 : 1} className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} /></label>
          ))}
          {[['tirGoalPct', 'TIR goal (> %)'], ['tbrGoalPct', 'TBR goal (< %)'], ['tarGoalPct', 'TAR goal (< %)'], ['cvTargetPct', 'CV target (≤ %)']].map(([k, l]) => (
            <label key={k} className="block"><span className="text-xs font-semibold text-gray-600">{l}</span>
              <input type="number" step={1} className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg" value={goals[k]} onChange={(e) => setGoals({ ...goals, [k]: e.target.value })} /></label>
          ))}
        </div>
        <label className="block"><span className="text-xs font-semibold text-gray-600">Rationale (required — shown beside every metric these targets affect)</span>
          <textarea rows={2} className="mt-1 w-full px-3 py-2 border-2 border-gray-300 rounded-lg" placeholder="e.g. Pregnant, 14 weeks · Frail, recurrent hypoglycaemia" value={rationale} onChange={(e) => setRationale(e.target.value)} /></label>
        <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save targets'}</Button></div>
      </div>
    </Modal>
  );
};

// ViewMenu — Option 2: the day-window, unit and source filter tucked behind one
// compact "View" popover so the header stays a single row. Shared component, so
// every portal (doctor, staff, patient) gets the same tidy header (DRY).
const ViewMenu = ({ win, setWin, unit, setUnit, sources, setSources }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
        <SlidersHorizontal className="w-4 h-4" /> View <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Window</p>
              <SwitcherTabs tabs={WINDOWS} active={win} onChange={setWin} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Unit</p>
              <SwitcherTabs tabs={UNITS} active={unit} onChange={setUnit} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Sources</p>
              <div className="space-y-0.5">
                {Object.entries(SOURCE_META).map(([k, meta]) => (
                  <label key={k} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={sources[k]} onChange={() => setSources({ ...sources, [k]: !sources[k] })} className="rounded" />
                    <SourceSwatch source={k} /> {meta.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ReportMenu — the Print button opens this chooser: tick which sections to build
// into one letterhead report. Indices is always included and always prints
// first (pinned, disabled here); the rest print in tab order after it. "Current
// tab" pre-selects whatever tab the user is on; "All" or "Indices only" are one
// tap. Confirming hands the section-id list up to open GlucoseReportPrint. DRY:
// every portal (doctor, staff, patient) gets the same builder.
const ReportMenu = ({ currentTab, isPatient, onRun }) => {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState({});

  // On open, seed the picks with the tab the user is currently viewing.
  useEffect(() => {
    if (!open) return;
    setSel(currentTab && currentTab !== 'indices' ? { [currentTab]: true } : {});
  }, [open, currentTab]);

  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const run = () => {
    setOpen(false);
    onRun(REPORT_PICKS.map((p) => p.id).filter((id) => sel[id])); // Indices is added by the report itself
  };

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((o) => !o)} className="!px-3 !py-2 text-sm" title={isPatient ? 'Save report' : 'Print / report'} aria-label={isPatient ? 'Save report' : 'Print report'}>
        <Printer className="w-4 h-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3">
            <p className="font-bold text-gray-800 text-sm">Build a report</p>
            <p className="text-[11px] text-gray-500 mb-2">Tick what to include. Indices always prints first.</p>
            <label className="flex items-center gap-2 py-1 text-sm text-indigo-800">
              <input type="checkbox" checked disabled className="rounded" />
              Indices <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5">1st</span>
            </label>
            {REPORT_PICKS.map((p) => (
              <label key={p.id} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={!!sel[p.id]} onChange={() => toggle(p.id)} className="rounded" /> {p.label}
              </label>
            ))}
            <div className="flex gap-1.5 mt-2 mb-2">
              <button type="button" onClick={() => setSel(Object.fromEntries(REPORT_PICKS.map((p) => [p.id, true])))} className="flex-1 text-[11px] font-semibold text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50">All</button>
              <button type="button" onClick={() => setSel(currentTab && currentTab !== 'indices' ? { [currentTab]: true } : {})} className="flex-1 text-[11px] font-semibold text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50">Current tab</button>
              <button type="button" onClick={() => setSel({})} className="flex-1 text-[11px] font-semibold text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50">Indices only</button>
            </div>
            <Button onClick={run} className="w-full !py-2 text-sm">Preview / Print</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default GlucoseManagementCentre;
