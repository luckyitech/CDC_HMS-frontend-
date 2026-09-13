import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bluetooth, Clock, XCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from './Card';
import Button from './Button';
import SwitcherTabs from './SwitcherTabs';
import ReasonModal from './ReasonModal';
import Modal from './Modal';
import { MeterDownloadModal } from './MeterDownload';
import GlucoseSummaryPrint from './GlucoseSummaryPrint';
import { glucoseService } from '../../services/glucoseService';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin } from '../../utils/permissions';
import {
  WINDOWS, UNITS, SOURCE_META, MMOL, makeVal, unitLabelFor, fmtWhen, fmtDelta, SourceSwatch,
} from './gmc/gmcShared';
import GlucoseDailyTab from './gmc/GlucoseDailyTab';
import GlucoseSugarChartTab from './gmc/GlucoseSugarChartTab';
import GlucoseIndicesTab from './gmc/GlucoseIndicesTab';
import GlucoseLogbookTab from './gmc/GlucoseLogbookTab';

/**
 * GlucoseManagementCentre — every glucose data point the clinic holds for a
 * patient, in one place, with the consensus glycaemic metrics. IDENTICAL on the
 * doctor, staff and patient screens (one shared component): only the clinician-
 * only actions — excluding a reading, editing the targets — are gated by the
 * `variant`. The patient variant reuses everything else verbatim, so what a
 * patient sees at home is exactly what the doctor sees in clinic.
 *
 * The screen is organised into four tabs so no single view is crowded:
 *   • Daily graph — one day at a time, CGM-style, with the diary overlaid
 *   • Sugar chart — the SMBG logbook grid (days × meal slots), colour-coded
 *   • Indices     — GMI, measured HbA1c (+ trend), TIR/TAR/TBR, consistency, targets
 *   • Logbook     — the running record of every reading and diary entry
 *
 * A persistent header carries the window (7/14/30/90 days), the source filter,
 * the unit toggle (mmol/L default, switches to mg/dL — the app converts), and
 * the meter-download and print actions, so those apply across every tab.
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
  const [printOpen, setPrintOpen] = useState(false);

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
      {/* ---- header ---- */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-4">
        <div>
          {!isPatient && <h3 className="text-xl lg:text-2xl font-bold text-gray-800">{patient.name} — Glucose Management Centre</h3>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
            <span className="font-mono">{patient.uhid}</span>
            <span className={`px-2 py-0.5 rounded-full border font-semibold ${data?.targets?.individualised ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              Targets: {data?.targets?.individualised ? `individualised · ${data.targets.meta?.setByName || ''} ${data.targets.meta?.setAt ? new Date(data.targets.meta.setAt).toLocaleDateString('en-GB') : ''}` : 'clinic default (4–10 mmol/L)'}
            </span>
            {lastMeter && <span>Last meter download {new Date(lastMeter.lastSyncAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · <span className="font-mono">meter+{lastMeter.deviceSerial}</span></span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SwitcherTabs tabs={WINDOWS} active={win} onChange={setWin} />
          <div className="flex gap-1">
            {Object.entries(SOURCE_META).map(([k, meta]) => (
              <button key={k} type="button" onClick={() => setSources({ ...sources, [k]: !sources[k] })} aria-pressed={sources[k]}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold ${sources[k] ? 'bg-white border-gray-300 text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                <SourceSwatch source={k} /> {meta.label}
              </button>
            ))}
          </div>
          <SwitcherTabs tabs={UNITS} active={unit} onChange={setUnit} />
          <Button onClick={() => setDownloadOpen(true)} className="!px-4 !py-2 text-sm"><Bluetooth className="w-4 h-4" /> {isPatient ? 'Sync my meter' : 'Download meter'}</Button>
          {data && m && <Button variant="outline" onClick={() => setPrintOpen(true)} className="!px-4 !py-2 text-sm"><Printer className="w-4 h-4" /> {isPatient ? 'Save / print' : 'Print summary'}</Button>}
        </div>
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
          {/* ---- tabs ---- */}
          <div className="mb-4"><SwitcherTabs tabs={TABS} active={tab} onChange={setTab} /></div>

          {tab === 'daily' && <GlucoseDailyTab data={data} t={t} unit={unit} val={val} unitLabel={unitLabel} />}
          {tab === 'chart' && <GlucoseSugarChartTab data={data} t={t} val={val} unitLabel={unitLabel} />}
          {tab === 'indices' && <GlucoseIndicesTab data={data} m={m} t={t} unit={unit} val={val} unitLabel={unitLabel} days={days} isClinician={isClinician} onEditTargets={() => setTargetsOpen(true)} />}
          {tab === 'logbook' && <GlucoseLogbookTab data={data} t={t} val={val} unitLabel={unitLabel} uhid={uhid} isClinician={isClinician} isPatient={isPatient} load={load} onExcludeRow={setExcludeRow} onRestore={onRestore} />}
        </>
      )}

      <MeterDownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} patient={patient} variant={variant} onImported={() => load()} />
      {printOpen && data && m && <GlucoseSummaryPrint data={data} patient={patient} unit={unit} onClose={() => setPrintOpen(false)} />}
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

export default GlucoseManagementCentre;
