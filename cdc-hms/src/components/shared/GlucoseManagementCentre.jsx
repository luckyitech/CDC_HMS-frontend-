import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ComposedChart, ScatterChart, Scatter, Bar, ErrorBar, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ReferenceArea, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Bluetooth, Clock, XCircle, Target, RotateCcw, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import Card from './Card';
import Button from './Button';
import SwitcherTabs from './SwitcherTabs';
import ReasonModal from './ReasonModal';
import Modal from './Modal';
import GlycemicChartPanel from '../doctor/GlycemicChartPanel';
import { MeterDownloadModal } from './MeterDownload';
import GlucoseDiaryPanel from './GlucoseDiaryPanel';
import GlucoseSummaryPrint from './GlucoseSummaryPrint';
import { glucoseService } from '../../services/glucoseService';
import { useUserContext } from '../../contexts/UserContext';
import { canAccessAdmin } from '../../utils/permissions';

/**
 * GlucoseManagementCentre — every glucose data point the clinic holds for a
 * patient, in one place, with the consensus glycaemic metrics.
 *
 * Replaces GlycemicChartPanel at its three homes (the doctor's Glycemic
 * Charts page, Patient File → Diagnostics → Charts, the Staff Patient
 * Profile). The old 7-slot logbook chart is kept inside it as the "Logbook"
 * view (GlycemicChartPanel embedded), because manual entries still make
 * sense per slot.
 *
 * Sources — each row in the series says which, and the colour follows the
 * source, never the value (provenance is what a clinician most needs to trust):
 *   • home meter  (GlucoseMeterReadings — Bluetooth download; MeterDownload)
 *   • logbook     (BloodSugarReadings — manual entry, patient or clinic)
 *   • clinic      (PatientVitals.rbs — triage)
 *
 * All maths are SERVER-SIDE (GET /patients/:uhid/glucose/summary →
 * backend/constants/glucose.js) so this screen, the patient's and any print
 * show the same numbers. Targets are the International Consensus defaults
 * unless a doctor has set individual ones here (Targets panel, doctor/admin).
 *
 * Time: meter readings are plotted at the METER's own wall time, unchanged.
 * A meter whose clock was out at its last download gets a banner, not a
 * silent correction.
 *
 * Props:
 *   patient   { uhid, name, … }
 *   variant   'doctor' (default) | 'patient' — patient: gentler copy, no
 *             exclude / targets editing (Phase 2 wires the patient portal)
 */

const WINDOWS = [
  { id: '7', label: '7 days', days: 7 }, { id: '14', label: '14 days', days: 14 },
  { id: '30', label: '30 days', days: 30 }, { id: '90', label: '90 days', days: 90 },
];
const UNITS = [{ id: 'mmol', label: 'mmol/L' }, { id: 'mgdl', label: 'mg/dL' }];
const SOURCE_META = {
  meter:   { label: 'Home meter', color: '#0066CC', shape: 'circle' },
  logbook: { label: 'Logbook',    color: '#0D9488', shape: 'square' },
  clinic:  { label: 'Clinic',     color: '#9333EA', shape: 'diamond' },
};
// Glucose-state colours — reserved for the TIR bar, never used for a series.
const BAND = { veryLow: '#b91c1c', low: '#ef4444', inRange: '#16a34a', high: '#f59e0b', veryHigh: '#c2410c' };
const MMOL = 18;
// Diary event types — icon colour on the chart and in the diary panel.
const DIARY_META = {
  meal:     { label: 'Meal',     color: '#0891b2' },
  activity: { label: 'Activity', color: '#16a34a' },
  insulin:  { label: 'Insulin',  color: '#7c3aed' },
  oral_med: { label: 'Oral med', color: '#d97706' },
  symptom:  { label: 'Symptom',  color: '#dc2626' },
  note:     { label: 'Note',     color: '#6b7280' },
};

const fmtDelta = (s) => { const a = Math.abs(s); const h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60); return `${h ? `${h} h ` : ''}${m} min ${s > 0 ? 'behind' : 'ahead'}`; };
const fmtWhen = (naive) => { if (!naive) return '—'; const [d, t] = naive.split(' '); const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)} ${t.slice(0, 5)}`; };
const dayLabel = (naive) => { const [, m, d] = naive.slice(0, 10).split('-'); return `${Number(d)}/${Number(m)}`; };

const GlucoseManagementCentre = ({ patient, variant = 'doctor' }) => {
  const { currentUser } = useUserContext();
  const isClinician = variant === 'doctor' && (currentUser?.role === 'doctor' || canAccessAdmin(currentUser));
  const isPatient = variant === 'patient';
  const uhid = patient?.uhid;

  const [win, setWin] = useState('14');
  const [unit, setUnit] = useState('mmol');
  const [sources, setSources] = useState({ meter: true, logbook: true, clinic: true });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [excludeRow, setExcludeRow] = useState(null);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
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

  const val = useCallback((mgdl) => (mgdl === null || mgdl === undefined ? null : unit === 'mmol' ? Math.round((mgdl / MMOL) * 10) / 10 : Math.round(mgdl)), [unit]);
  const unitLabel = unit === 'mmol' ? 'mmol/L' : 'mg/dL';
  const m = data?.metrics;
  const t = data?.targets?.targets;

  // ---- series for the charts -------------------------------------------
  const series = useMemo(() => {
    if (!data) return { points: [], byDay: [], from: null, to: null };
    const points = data.readings.filter((r) => r.mgdl !== null).map((r) => {
      const [d, tm] = r.at.split(' ');
      const [y, mo, dd] = d.split('-').map(Number); const [h, mi] = tm.split(':').map(Number);
      return { ...r, x: Date.UTC(y, mo - 1, dd, h, mi), y: val(r.mgdl) };
    });
    const byDayMap = new Map();
    points.filter((p) => p.countable && p.source === 'meter').forEach((p) => { const k = p.at.slice(0, 10); (byDayMap.get(k) || byDayMap.set(k, []).get(k)).push(p.mgdl); });
    const byDay = [...byDayMap.entries()].map(([k, xs]) => { const [y, mo, dd] = k.split('-').map(Number); return { x: Date.UTC(y, mo - 1, dd, 12), y: val(xs.reduce((a, b) => a + b, 0) / xs.length) }; }).sort((a, b) => a.x - b.x);
    const from = Date.UTC(...data.window.from.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
    const to = Date.UTC(...data.window.to.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))) + 86400000;
    const diaryBase = unit === 'mmol' ? 2 : 36;
    const diaryPoints = (data.diary || []).map((ev) => {
      const [d, tm] = ev.at.split(' ');
      const [y, mo, dd] = d.split('-').map(Number); const [h, mi] = tm.split(':').map(Number);
      return { x: Date.UTC(y, mo - 1, dd, h, mi), y: diaryBase, diary: true, diaryType: ev.eventType, label: ev.label, at: ev.at, detail: ev.detail };
    });
    return { points, byDay, from, to, diaryPoints };
  }, [data, val, unit]);

  const logbookRows = useMemo(() => (data?.readings || []).filter((r) => r.source === 'logbook' || (r.source === 'clinic' && String(r.id).startsWith('log-'))).map((r) => ({ date: r.at.slice(0, 10), timeSlot: r.tag, value: r.mgdl })), [data]);

  // The Active meter whose clock was out at its last download and has not
  // been marked corrected since.
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

  const goal = (ok, text) => <span className={`text-[11px] ${ok ? 'text-green-700' : 'text-red-700'}`}>{ok ? '✓' : '✗'} {text}</span>;
  const dim = m && !m.sufficient ? 'opacity-40' : '';

  return (
    <Card>
      {/* ---- header ---- */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-bold text-gray-800">{isPatient ? 'My Glucose Centre' : `${patient.name} — Glucose Management Centre`}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
            <span className="font-mono">{patient.uhid}</span>
            {data?.hba1c && <span>HbA1c <strong className="text-gray-700">{data.hba1c.value} %</strong>{data.hba1c.at ? ` (${fmtWhen(data.hba1c.at).slice(0, 8)})` : ''}</span>}
            <span className={`px-2 py-0.5 rounded-full border font-semibold ${data?.targets?.individualised ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
              Targets: {data?.targets?.individualised ? `individualised · ${data.targets.meta?.setByName || ''} ${data.targets.meta?.setAt ? new Date(data.targets.meta.setAt).toLocaleDateString('en-GB') : ''}` : 'consensus (adults T1/T2)'}
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

      {data && m && (
        <>
          {/* ---- metrics strip ---- */}
          <div className="grid grid-cols-12 gap-3 mb-4">
            <Metric className={`col-span-12 lg:col-span-5 ${dim}`} label={`Time in range · ${data.window.days || days}-day window`}>
              <div className="flex h-6 rounded-md overflow-hidden gap-0.5 bg-gray-200 my-2" title="Very low / low / in range / high / very high">
                {[['veryLowPct', BAND.veryLow], ['lowPct', BAND.low], ['inRangePct', BAND.inRange], ['highPct', BAND.high], ['veryHighPct', BAND.veryHigh]].map(([k, c]) => (
                  <div key={k} style={{ width: `${m.tir[k]}%`, background: c }} />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1 text-[11px] leading-tight">
                <div><b className="text-sm" style={{ color: BAND.veryLow }}>{m.tir.veryLowPct} %</b><div>&lt; {val(t.tbrLevel2Mgdl)}</div>{goal(m.tir.veryLowPct < t.tbr2GoalPct, `< ${t.tbr2GoalPct} %`)}</div>
                <div><b className="text-sm" style={{ color: BAND.low }}>{m.tir.lowPct} %</b><div>{val(t.tbrLevel2Mgdl)}–{val(t.tirLowMgdl)}</div>{goal(m.tir.belowPct < t.tbrGoalPct, `< ${t.tbrGoalPct} % total`)}</div>
                <div><b className="text-sm" style={{ color: BAND.inRange }}>{m.tir.inRangePct} %</b><div>{val(t.tirLowMgdl)}–{val(t.tirHighMgdl)}</div>{goal(m.tir.inRangePct > t.tirGoalPct, `> ${t.tirGoalPct} %`)}</div>
                <div><b className="text-sm" style={{ color: BAND.high }}>{m.tir.highPct} %</b><div>{val(t.tirHighMgdl)}–{val(t.tarLevel2Mgdl)}</div>{goal(m.tir.abovePct < t.tarGoalPct, `< ${t.tarGoalPct} % total`)}</div>
                <div><b className="text-sm" style={{ color: BAND.veryHigh }}>{m.tir.veryHighPct} %</b><div>&gt; {val(t.tarLevel2Mgdl)}</div>{goal(m.tir.veryHighPct < t.tar2GoalPct, `< ${t.tar2GoalPct} %`)}</div>
              </div>
            </Metric>
            <Metric className={`col-span-6 lg:col-span-3 ${dim}`} label="Estimated GMI (SMBG)" big={m.gmiPct !== null ? `${m.gmiPct} %` : '—'}
              note={<>{data.hba1c ? <>HbA1c <strong>{data.hba1c.value} %</strong> measured{data.hba1c.at ? ` ${fmtWhen(data.hba1c.at).slice(0, 8)}` : ''} · </> : null}a CGM formula applied to fingersticks — an estimate{!m.sufficient && <span className="text-amber-700"> · too little data to quote</span>}</>} />
            <Metric className="col-span-3 lg:col-span-2" label="Mean" big={<>{val(m.meanMgdl) ?? '—'}<small className="text-xs font-normal text-gray-500 ml-1">{unitLabel}</small></>} note={`SD ${val(m.sdMgdl) ?? '—'}`} />
            <Metric className="col-span-3 lg:col-span-2" label="Variability · CV" big={<span className={m.cvPct === null ? '' : m.cvPct <= t.cvTargetPct ? 'text-green-700' : 'text-amber-700'}>{m.cvPct ?? '—'}<small className="text-xs font-normal text-gray-500 ml-1">%</small></span>} note={`target ≤ ${t.cvTargetPct} %`} />
            <Metric className="col-span-4 lg:col-span-2" label="Hypos" big={<span className={m.hypoCount ? 'text-red-700' : ''}>{m.hypoCount}</span>} note={`${m.hypoLevel2Count} below ${val(t.tbrLevel2Mgdl)}`} />
            <Metric className="col-span-8 lg:col-span-10" label="Data in this window" big={<>{m.readings}<small className="text-xs font-normal text-gray-500 ml-1">readings · {m.days} days · {m.readingsPerDay} / day</small></>}
              note={<>{m.sufficient ? <span className="text-green-700">✓ enough for TIR and GMI (≥ {m.sufficiency.minDays} days, ≥ {m.sufficiency.minReadingsPerDay} / day)</span> : <span className="text-amber-700">⚠ below the {m.sufficiency.minDays}-day / {m.sufficiency.minReadingsPerDay}-a-day floor — TIR and GMI are faded and should not be quoted</span>} · fasting readings in the {val(t.fastingLowMgdl)}–{val(t.fastingHighMgdl)} band: <strong>{m.fasting.inBandPct === null ? '—' : `${m.fasting.inBandPct} %`}</strong> (n = {m.fasting.n}) · time-of-day by clock time</>} />
          </div>

          {m.mealTags && (m.mealTags.pre.n > 0 || m.mealTags.post.n > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[['Pre-meal', m.mealTags.pre], ['Post-meal', m.mealTags.post]].map(([label, mt]) => (
                <div key={label} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label} average</p>
                  <p className="text-2xl font-extrabold text-gray-800 leading-none">{val(mt.meanMgdl) ?? '—'}<small className="text-xs font-normal text-gray-500 ml-1">{unitLabel}</small></p>
                  <p className="text-[11px] text-gray-500 mt-1.5">{mt.inRangePct === null ? '—' : `${mt.inRangePct} % in range`} · n = {mt.n}</p>
                </div>
              ))}
              <p className="col-span-2 text-[11px] text-gray-400">Meal timing from the diary and logbook{m.mealTags.matched ? ` · ${m.mealTags.matched} meter reading${m.mealTags.matched === 1 ? '' : 's'} matched to a diary meal` : ''}. A reading up to 60 min before a meal is pre-meal; 60–180 min after is post-meal.</p>
            </div>
          )}

          {/* ---- time-series ---- */}
          <ChartCard title="Every reading in the window" caption={`Meter readings at the meter's own time · shaded band = target range ${val(t.tirLowMgdl)}–${val(t.tirHighMgdl)} ${unitLabel} · ring = below ${val(t.tirLowMgdl)}`}>
            {series.points.length === 0 ? <Empty text="No readings in this window." /> : (
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" dataKey="x" domain={[series.from, series.to]} tickFormatter={(v) => dayLabel(new Date(v).toISOString())} tick={{ fontSize: 11, fill: '#6b7280' }} tickCount={Math.min(days, 10)} />
                    <YAxis type="number" dataKey="y" domain={[0, unit === 'mmol' ? 22 : 400]} tick={{ fontSize: 11, fill: '#6b7280' }} width={34} />
                    <ZAxis range={[60, 60]} />
                    <ReferenceArea y1={val(t.tirLowMgdl)} y2={val(t.tirHighMgdl)} fill="#dbe8f7" fillOpacity={0.6} />
                    <ReferenceLine y={val(t.tbrLevel2Mgdl)} stroke={BAND.veryLow} strokeDasharray="4 4" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<PointTip unitLabel={unitLabel} />} />
                    {series.byDay.length > 1 && <Scatter data={series.byDay} line={{ stroke: SOURCE_META.meter.color, strokeWidth: 1.5, strokeOpacity: 0.3 }} shape={() => null} legendType="none" isAnimationActive={false} />}
                    {Object.entries(SOURCE_META).map(([k, meta]) => (
                      <Scatter key={k} name={meta.label} data={series.points.filter((p) => p.source === k)} fill={meta.color} shape={(props) => <PointShape {...props} lowMgdl={t.tirLowMgdl} />} isAnimationActive={false} />
                    ))}
                    {series.diaryPoints?.length > 0 && <Scatter name="Diary" data={series.diaryPoints} shape={(props) => <DiaryShape {...props} />} legendType="none" isAnimationActive={false} />}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mt-2">
              {Object.entries(SOURCE_META).map(([k, meta]) => <span key={k} className="inline-flex items-center gap-1.5"><SourceSwatch source={k} /> {meta.label}</span>)}
              <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: BAND.low }} /> Hypo</span>
              <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3" style={{ background: '#dbe8f7' }} /> In-range band</span>
              <span className="inline-flex items-center gap-1.5 text-gray-400">struck through = excluded</span>
              {series.diaryPoints?.length > 0 && <span className="inline-flex items-center gap-1.5"><i className="inline-block w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: `7px solid ${DIARY_META.meal.color}` }} /> Diary event</span>}
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
            {/* ---- time of day ---- */}
            <ChartCard className="xl:col-span-3" title="Time-of-day profile" caption="Mean ± SD per period by clock time (logbook by slot) · n under each · greyed when n < 3">
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={m.timeOfDay.map((b) => ({ ...b, mean: val(b.meanMgdl), sd: val(b.sdMgdl) ?? 0, label: `${b.label}\nn = ${b.n}` }))} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={<TwoLineTick />} interval={0} height={36} />
                    <YAxis domain={[0, unit === 'mmol' ? 18 : 324]} tick={{ fontSize: 11, fill: '#6b7280' }} width={34} />
                    <ReferenceArea y1={val(t.tirLowMgdl)} y2={val(t.tirHighMgdl)} fill="#dbe8f7" fillOpacity={0.6} />
                    <Tooltip formatter={(v, n) => [v, n === 'mean' ? `Mean (${unitLabel})` : n]} labelFormatter={(l) => l.replace('\n', ' · ')} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="mean" name="mean" radius={[4, 4, 0, 0]} isAnimationActive={false} shape={(p) => <rect x={p.x} y={p.y} width={p.width} height={p.height} rx={4} fill={p.payload.n < 3 ? '#cbd5e1' : SOURCE_META.meter.color} />}>
                      <ErrorBar dataKey="sd" width={6} strokeWidth={1.5} stroke="#374151" />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* ---- logbook (the old chart, embedded) ---- */}
            <ChartCard className="xl:col-span-2" title="Logbook — 7-slot view" caption="Manual entries, kept as-is">
              <GlycemicChartPanel patient={patient} readings={logbookRows} embedded />
            </ChartCard>
          </div>

          {/* ---- diary ---- */}
          <ChartCard title={isPatient ? 'My diary' : 'Patient diary'} caption="Meals, activity, insulin, oral medication, symptoms and notes · meal entries tag nearby meter readings pre-/post-meal automatically">
            <GlucoseDiaryPanel uhid={uhid} events={data.diary || []} onChanged={load} canEdit isPatient={isPatient} unit={unit} />
          </ChartCard>

          {/* ---- readings table ---- */}
          <ChartCard title="Readings" caption={`${data.readings.length} in the last ${data.window.days || days} days · ${data.readings.filter((r) => r.excluded).length} excluded · excluded rows stay visible with who and why — nothing is deleted`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-gray-500"><tr><th className="text-left px-2 py-2">When (meter time)</th><th className="text-left px-2 py-2">Value</th><th className="text-left px-2 py-2">Source</th><th className="text-left px-2 py-2">Tag</th><th className="text-left px-2 py-2">Flags</th>{isClinician && <th className="px-2 py-2" />}</tr></thead>
                <tbody>
                  {[...data.readings].reverse().slice(0, showAllRows ? undefined : 15).map((r) => (
                    <tr key={r.id} className={`border-t border-gray-100 ${r.excluded ? 'text-gray-400 line-through' : ''} ${!r.plausible && !r.excluded ? 'bg-amber-50' : ''}`}>
                      <td className="px-2 py-1.5 whitespace-nowrap">{fmtWhen(r.at)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap"><strong>{r.flags?.includes('resultTooHighOrLow') ? 'HI / LO' : val(r.mgdl)}</strong> {!r.flags?.includes('resultTooHighOrLow') && <span className="text-gray-500 text-xs">{unitLabel}</span>}{r.countable && r.mgdl < t.tirLowMgdl && <span className="ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 no-underline">hypo</span>}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><SourceSwatch source={r.source} /> {SOURCE_META[r.source]?.label}</span></td>
                      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{r.tagLabel || r.tag || '—'}{r.tagSource === 'clock' && <span className="text-[10px] ml-1">(by clock)</span>}</td>
                      <td className="px-2 py-1.5 text-xs whitespace-nowrap">
                        {r.controlSolution && <Chip tone="neutral">control solution</Chip>}
                        {r.flags?.length > 0 && !r.controlSolution && <Chip tone="neutral">meter: {r.flags.join(', ')}</Chip>}
                        {!r.plausible && <Chip tone="warn">implausible</Chip>}
                        {r.excluded && <span className="text-gray-400 no-underline">excluded · {r.excludedByName || ''}{r.excludeReason ? ` · ${r.excludeReason}` : ''}</span>}
                        {!r.excluded && r.plausible && !r.flags?.length && !r.controlSolution && <span className="text-gray-300">—</span>}
                      </td>
                      {isClinician && (
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          {r.source === 'meter' && (r.excluded
                            ? <button type="button" className="text-xs text-primary font-semibold inline-flex items-center gap-1 no-underline" onClick={() => onRestore(r)}><RotateCcw className="w-3 h-3" /> Restore</button>
                            : <button type="button" className="text-xs text-gray-600 border border-gray-300 rounded px-2 py-0.5 hover:bg-gray-50" onClick={() => setExcludeRow(r)}>Exclude…</button>)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {data.readings.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-gray-400">No readings in this window.</td></tr>}
                </tbody>
              </table>
            </div>
            {data.readings.length > 15 && (
              <button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={() => setShowAllRows((v) => !v)}>{showAllRows ? 'Show the 15 most recent' : `Show all ${data.readings.length}`}</button>
            )}
          </ChartCard>

          {/* ---- targets ---- */}
          <ChartCard title="Targets for this patient" caption="Consensus defaults until a doctor sets individual targets · every summary says which set was used"
            action={isClinician && <Button variant="outline" onClick={() => setTargetsOpen(true)} className="!px-4 !py-2 text-sm"><Target className="w-4 h-4" /> {data.targets.individualised ? 'Change targets' : 'Set individual targets'}</Button>}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
              {[
                ['In range · low', val(t.tirLowMgdl), val(data.targets.consensus.tirLowMgdl)], ['In range · high', val(t.tirHighMgdl), val(data.targets.consensus.tirHighMgdl)],
                ['Level-2 low', val(t.tbrLevel2Mgdl), val(data.targets.consensus.tbrLevel2Mgdl)], ['Level-2 high', val(t.tarLevel2Mgdl), val(data.targets.consensus.tarLevel2Mgdl)],
                ['Fasting band', `${val(t.fastingLowMgdl)} – ${val(t.fastingHighMgdl)}`, `${val(data.targets.consensus.fastingLowMgdl)} – ${val(data.targets.consensus.fastingHighMgdl)}`],
                ['TIR goal / CV', `> ${t.tirGoalPct} % · ≤ ${t.cvTargetPct} %`, `> ${data.targets.consensus.tirGoalPct} % · ≤ ${data.targets.consensus.cvTargetPct} %`],
              ].map(([k, v, c]) => (
                <div key={k} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200"><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{k}</p><p className="font-bold text-gray-800">{v}</p><p className="text-[11px] text-gray-400">consensus {c}</p></div>
              ))}
            </div>
            {data.targets.individualised && data.targets.meta && (
              <p className="text-xs text-amber-800 mt-2">Individualised{data.targets.meta.preset ? ` (${data.targets.presets?.[data.targets.meta.preset]?.label || data.targets.meta.preset})` : ''} by {data.targets.meta.setByName || '—'} on {new Date(data.targets.meta.setAt).toLocaleDateString('en-GB')}: &ldquo;{data.targets.meta.rationale}&rdquo;</p>
            )}
          </ChartCard>
        </>
      )}

      <MeterDownloadModal isOpen={downloadOpen} onClose={() => setDownloadOpen(false)} patient={patient} variant={variant} onImported={() => load()} />
      {printOpen && data && m && <GlucoseSummaryPrint data={data} patient={patient} unit={unit} onClose={() => setPrintOpen(false)} />}
      <ReasonModal isOpen={!!excludeRow} onClose={() => setExcludeRow(null)} title="Exclude this reading" message={excludeRow ? `${fmtWhen(excludeRow.at)} · ${val(excludeRow.mgdl)} ${unitLabel}. It stays in the record, struck through, with your name and this reason; it is left out of the metrics.` : ''} confirmLabel="Exclude" placeholder="e.g. Expired strip · control test · not this patient" onConfirm={onExclude} />
      {isClinician && data && <TargetsModal isOpen={targetsOpen} onClose={() => setTargetsOpen(false)} uhid={uhid} unit={unit} current={data.targets} onSaved={() => { setTargetsOpen(false); load(); }} />}
    </Card>
  );
};

// ---- small pieces ---------------------------------------------------------

const SourceSwatch = ({ source }) => {
  const meta = SOURCE_META[source] || SOURCE_META.meter;
  const style = { background: meta.color, width: 10, height: 10, display: 'inline-block', flexShrink: 0 };
  if (meta.shape === 'circle') style.borderRadius = '50%';
  if (meta.shape === 'diamond') style.transform = 'rotate(45deg)';
  return <i style={style} />;
};

const Chip = ({ tone, children }) => (
  <span className={`inline-block mr-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold no-underline ${tone === 'warn' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{children}</span>
);

const Metric = ({ className = '', label, big, note, children }) => (
  <div className={`p-3 rounded-xl bg-gray-50 border border-gray-200 min-w-0 ${className}`}>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
    {big !== undefined && <p className="text-2xl font-extrabold text-gray-800 leading-none">{big}</p>}
    {children}
    {note && <p className="text-[11px] text-gray-500 mt-1.5">{note}</p>}
  </div>
);

const ChartCard = ({ title, caption, action, className = '', children }) => (
  <div className={`p-4 rounded-xl border border-gray-200 bg-white mb-3 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-2">
      <div><h4 className="font-bold text-gray-800 text-sm">{title}</h4>{caption && <p className="text-xs text-gray-500">{caption}</p>}</div>
      {action}
    </div>
    {children}
  </div>
);

const Empty = ({ text }) => <div className="py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">{text}</div>;

// Scatter point: shape by source, a red ring for a hypo, a strike for excluded.
const PointShape = ({ cx, cy, payload, fill, lowMgdl }) => {
  if (cx === undefined || cy === undefined) return null;
  const meta = SOURCE_META[payload.source] || SOURCE_META.meter;
  const op = payload.excluded ? 0.3 : 0.95;
  return (
    <g>
      {payload.countable && payload.mgdl < lowMgdl && <circle cx={cx} cy={cy} r={9} fill="none" stroke={BAND.low} strokeWidth={2} />}
      {meta.shape === 'circle' && <circle cx={cx} cy={cy} r={4.5} fill={fill} stroke="#fff" strokeWidth={1.5} opacity={op} />}
      {meta.shape === 'square' && <rect x={cx - 4} y={cy - 4} width={8} height={8} fill={fill} stroke="#fff" strokeWidth={1.5} opacity={op} />}
      {meta.shape === 'diamond' && <rect x={cx - 5} y={cy - 5} width={10} height={10} transform={`rotate(45 ${cx} ${cy})`} fill={fill} stroke="#fff" strokeWidth={1.5} opacity={op} />}
      {payload.excluded && <line x1={cx - 6} y1={cy - 6} x2={cx + 6} y2={cy + 6} stroke="#6b7280" strokeWidth={1.5} />}
    </g>
  );
};

// A diary event on the chart: a small upward triangle at the baseline, coloured
// by type. Details live in the diary panel and the tooltip.
const DiaryShape = ({ cx, cy, payload }) => {
  if (cx === undefined || cy === undefined) return null;
  const color = DIARY_META[payload.diaryType]?.color || DIARY_META.note.color;
  return <path d={`M ${cx} ${cy - 7} L ${cx - 5} ${cy + 2} L ${cx + 5} ${cy + 2} Z`} fill={color} stroke="#fff" strokeWidth={1} />;
};

const PointTip = ({ active, payload, unitLabel }) => {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  if (p.diary) {
    const meta = DIARY_META[p.diaryType] || DIARY_META.note;
    const bits = [p.label, p.detail?.carbs != null ? `${p.detail.carbs} g carbs` : null, p.detail?.minutes != null ? `${p.detail.minutes} min` : null, p.detail?.units != null ? `${p.detail.units} units` : null, p.detail?.drug || null, p.detail?.severity || null].filter(Boolean);
    return (
      <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow">
        <div><strong>{meta.label}</strong> · {fmtWhen(p.at)}</div>
        {bits.length > 0 && <div className="text-gray-300">{bits.join(' · ')}</div>}
      </div>
    );
  }
  if (p.source === undefined) return null;
  return (
    <div className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow">
      <div><strong>{p.y} {unitLabel}</strong> · {fmtWhen(p.at)}</div>
      <div className="text-gray-300">{SOURCE_META[p.source]?.label} · {p.tagLabel || p.tag || ''}{p.excluded ? ' · excluded' : ''}{!p.countable && !p.excluded ? ' · not counted' : ''}</div>
    </div>
  );
};

const TwoLineTick = ({ x, y, payload }) => {
  const [a, b] = String(payload.value).split('\n');
  return <g transform={`translate(${x},${y})`}><text textAnchor="middle" fontSize={11} fill="#374151" fontWeight={600} dy={10}>{a}</text><text textAnchor="middle" fontSize={10} fill="#6b7280" dy={24}>{b}</text></g>;
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
            {[['', 'Consensus (adults T1/T2)'], ...Object.entries(current.presets || {}).filter(([id]) => id !== 'standard').map(([id, p]) => [id, p.label])].map(([id, label]) => (
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
