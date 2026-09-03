import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, User, X, Loader2, Usb, Zap, Thermometer, Snowflake, Footprints, CheckCircle2, Check, Plug, PlugZap, ChevronDown } from 'lucide-react';
import patientService from '../../services/patientService';
import neuropathyService from '../../services/neuropathyService';
import prescriptionService from '../../services/prescriptionService';
import SummaryDock from './SummaryDock';
import ConsultationSummaryContainer from '../doctor/ConsultationSummaryContainer';
import { notify } from '../../utils/notify';
import { connectVibrotherm, isWebSerialSupported } from '../../utils/vibrothermSerial';
import NeuropathyFootMap from './NeuropathyFootMap';
import {
  FEET, FOOT_LABELS, PROTOCOL_SITES, SITE_LABELS, MODALITY_META,
  gradeValue, averageReadings, monoSummary, GRADE_CLASSES,
} from '../../constants/neuropathy';

// Neuropathy Studio — the in-portal exam, run as a step-by-step wizard:
//   Select spots -> Monofilament -> VPT -> Cold -> Hot -> Review & complete.
// The operator works the Vibrotherm probe; pressing REC on the machine files
// the reading to the active site (a 'recorded' serial frame). A value can also
// be typed as a no-probe fallback. Only the sites picked in step 1 are walked;
// unpicked sites are left not-assessed and excluded from grading server-side.

const MOD_ICON = { VPT: Zap, HOT: Thermometer, COLD: Snowflake, MONO: Footprints };

// Wizard order — monofilament first, then the probe modalities.
const CAPTURE_MODS = ['MONO', 'VPT', 'COLD', 'HOT'];
const STEP_IDS = ['spots', ...CAPTURE_MODS, 'review'];
const STEP_LABEL = { spots: 'Select spots', MONO: 'Monofilament', VPT: 'VPT', COLD: 'Cold', HOT: 'Hot', review: 'Review & complete' };

const emptyReadings = () => Object.fromEntries(CAPTURE_MODS.map((m) => [m, { R: {}, L: {} }]));
const allSelected = () => Object.fromEntries(FEET.map((f) => [f, Object.fromEntries(PROTOCOL_SITES.map((s) => [s, true]))]));

const monoGrade = (insensate) => (insensate === 0 ? 'Normal' : insensate <= 2 ? 'Mild' : insensate <= 4 ? 'Moderate' : 'Severe');

const Chip = ({ grade, children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${GRADE_CLASSES[grade] || GRADE_CLASSES.pending}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {children}
  </span>
);

// ---------------------------------------------------------------- patient picker
const PatientPicker = ({ onPick }) => {
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!search.trim()) { setPatients([]); setSearching(false); return undefined; }
    setSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patientService.getAll({ search, limit: 10 })
        .then((res) => setPatients(res.data.patients || res.data || []))
        .catch(() => setPatients([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <p className="text-xs font-semibold tracking-wider uppercase text-gray-400">Step 1</p>
      <h3 className="text-base font-semibold text-gray-800 mb-3">Who is being assessed?</h3>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, UHID or clinic number — or scan the patient card"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {searching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>
      {patients.length > 0 && (
        <ul className="mt-2 border border-gray-200 rounded-lg divide-y max-h-64 overflow-y-auto">
          {patients.map((p) => (
            <li key={p.uhid}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-3"
              >
                <User className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-mono text-primary font-semibold">{p.uhid}</span>
                    {' · '}{p.age ?? '—'} yrs · {p.gender ?? '—'}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {search.trim() && !searching && patients.length === 0 && (
        <p className="text-xs text-gray-500 mt-2">No patient matches “{search}”.</p>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- the exam wizard
/**
 * Props:
 *   fixedPatient — { uhid, name, age?, gender? } to skip the picker (patient file)
 *   onCompleted  — (study) => void — called with the graded, locked study
 *   onCancelled  — () => void
 */
const NeuropathyExam = ({ fixedPatient = null, embedded = false, overviewOpen: overviewOpenProp, onCompleted, onCancelled }) => {
  const [patient, setPatient] = useState(fixedPatient);
  const [meds, setMeds] = useState([]);
  const [overviewOpenState, setOverviewOpen] = useState(false);
  const overviewOpen = embedded ? !!overviewOpenProp : overviewOpenState;
  const [study, setStudy] = useState(null);
  const [creating, setCreating] = useState(false);

  const [step, setStep] = useState(0);                 // wizard step index into STEP_IDS
  const [selected, setSelected] = useState(allSelected);
  const [modality, setModality] = useState('MONO');    // current capture modality (driven by the step)
  const [active, setActive] = useState(null);          // { foot, site } | null
  const [readings, setReadings] = useState(emptyReadings);
  const [saving, setSaving] = useState(false);

  const [remarks, setRemarks] = useState('');
  const [completing, setCompleting] = useState(false);

  const stepId = STEP_IDS[step];
  const isCapture = CAPTURE_MODS.includes(stepId);

  // ---- probe link ----
  const [device, setDevice] = useState({ status: 'idle', detail: null });
  const [live, setLive] = useState(null);
  const [manual, setManual] = useState('');
  const linkRef = useRef(null);
  const fileReadingRef = useRef(null);

  const screenFor = (m) => (m === 'VPT' ? 'vpt' : m === 'HOT' ? 'hot' : m === 'COLD' ? 'cold' : null);
  const modalityRef = useRef(modality);
  useEffect(() => {
    modalityRef.current = modality;
    setLive(null);
    linkRef.current?.switchScreen?.(screenFor(modality));
  }, [modality]);

  const meta = MODALITY_META[modality];
  const ModIcon = MOD_ICON[modality];

  const LIVE_STALE_MS = 1500;
  const [nowTick, setNowTick] = useState(0);
  useEffect(() => {
    if (device.status !== 'connected') return undefined;
    const id = setInterval(() => setNowTick((n) => n + 1), 400);
    return () => clearInterval(id);
  }, [device.status]);

  // Entering a capture step arms the matching probe screen and parks on that
  // modality's first still-open selected site.
  useEffect(() => {
    const id = STEP_IDS[step];
    if (!CAPTURE_MODS.includes(id)) return;
    setModality(id);
    let first = null;
    for (const f of FEET) { for (const s of PROTOCOL_SITES) { if (selected[f]?.[s] && readings[id][f][s] === undefined) { first = { foot: f, site: s }; break; } } if (first) break; }
    setActive(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Create the Draft the moment a patient is chosen — UHID-linked from the start.
  useEffect(() => {
    if (!patient || study || creating) return;
    setCreating(true);
    neuropathyService.create(patient.uhid)
      .then((res) => setStudy(res.data.data || res.data))
      .catch((err) => {
        notify('error', err.response?.data?.message || 'Could not start a study for this patient.');
        if (!fixedPatient) setPatient(null);
      })
      .finally(() => setCreating(false));
  }, [patient, study, creating, fixedPatient]);

  useEffect(() => {
    if (!patient?.uhid) return undefined;
    let live = true;
    prescriptionService.getAll({ patientUhid: patient.uhid, status: 'Active' })
      .then((res) => {
        const list = res.data?.prescriptions || res.data || [];
        if (!live) return;
        setMeds((Array.isArray(list) ? list : []).flatMap((p) =>
          (p.medications || []).map((m, i) => ({
            id: `${p.id}-${i}`,
            name: m.name,
            dose: [m.dosage, m.frequency].filter(Boolean).join(' · '),
            since: p.date || p.createdAt,
          }))
        ));
      })
      .catch(() => { if (live) setMeds([]); });
    return () => { live = false; };
  }, [patient?.uhid]);

  useEffect(() => () => { linkRef.current?.disconnect?.(); }, []);

  const connectProbe = async (silent = false) => {
    try {
      const link = await connectVibrotherm({
        silent,
        startScreen: screenFor(modality) || 'vpt',
        onReading: (r) => {
          if (r.channel === 'recorded') {
            fileReadingRef.current?.(r.value, 'recorded');
            return;
          }
          setLive({ value: r.value, at: Date.now(), kind: 'stream' });
        },
        onStatus: (status, detail) => setDevice({ status, detail }),
      });
      linkRef.current = link;
    } catch (err) {
      if (err?.name === 'NotFoundError') return;
      setDevice({ status: 'error', detail: err });
      notify('error', err.message || 'Could not connect to the probe.');
    }
  };
  const disconnectProbe = async () => { await linkRef.current?.disconnect?.(); linkRef.current = null; setLive(null); };

  // ---- persisting a reading ----
  const persist = useCallback(async (foot, site, mod, value, omitted = false) => {
    if (!study) return;
    setSaving(true);
    try {
      await neuropathyService.saveReadings(study.id, [{ foot, site, modality: mod, value, omitted }]);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Reading not saved — check the connection and try again.');
    } finally {
      setSaving(false);
    }
  }, [study]);

  const record = (foot, site, mod, value) => {
    setReadings((prev) => ({ ...prev, [mod]: { ...prev[mod], [foot]: { ...prev[mod][foot], [site]: value } } }));
    persist(foot, site, mod, value, value === null);
  };

  // Next still-open SELECTED site for this modality (same foot first, then other).
  const nextOpenSelFrom = (rd, mod, from) => {
    const order = [from.foot, from.foot === 'R' ? 'L' : 'R'];
    for (const foot of order) for (const site of PROTOCOL_SITES) {
      if (!selected[foot]?.[site]) continue;
      if (rd[mod][foot][site] === undefined) return { foot, site };
    }
    return null;
  };

  // File a value to the active site and advance to the next selected site.
  // Shared by the manual fallback and the machine's REC button ('recorded').
  const fileValue = (src, source = 'capture') => {
    if (modality === 'MONO' || !active) return;
    if (src === null || Number.isNaN(src)) { notify('error', 'No reading to file — press REC on the machine or type a value.'); return; }
    if (src < meta.min || src > meta.max) { notify('error', `Out of range: ${meta.long} must be ${meta.min}–${meta.max}${meta.unit}.`); return; }
    record(active.foot, active.site, modality, src);
    setManual('');
    setLive(null);
    if (source === 'recorded') notify('success', `Recorded: ${src}${meta.unit} → ${FOOT_LABELS[active.foot]} · ${SITE_LABELS[active.site]}`);
    const rd = { ...readings, [modality]: { ...readings[modality], [active.foot]: { ...readings[modality][active.foot], [active.site]: src } } };
    setActive(nextOpenSelFrom(rd, modality, active));
  };
  fileReadingRef.current = fileValue;

  const captureManual = () => {
    const fresh = live && device.status === 'connected' && (Date.now() - live.at) < LIVE_STALE_MS;
    const src = fresh ? live.value : (manual === '' ? null : Number(manual));
    fileValue(src, 'capture');
  };

  const toggleMono = (foot, site) => {
    if (!selected[foot]?.[site]) return;
    const cur = readings.MONO[foot][site];
    record(foot, site, 'MONO', cur === 1 ? 0 : 1);   // undefined -> felt, felt -> not felt, not felt -> felt
  };

  // ---- spot selection ----
  const toggleSelect = (foot, site) => setSelected((prev) => ({ ...prev, [foot]: { ...prev[foot], [site]: !prev[foot][site] } }));
  const allSpots = (on) => setSelected(Object.fromEntries(FEET.map((f) => [f, Object.fromEntries(PROTOCOL_SITES.map((s) => [s, on]))])));
  const selCount = useMemo(() => FEET.reduce((n, f) => n + PROTOCOL_SITES.filter((s) => selected[f]?.[s]).length, 0), [selected]);

  // ---- summaries ----
  const footMod = (foot, mod) => {
    if (mod === 'MONO') {
      const m = monoSummary(PROTOCOL_SITES.map((s) => readings.MONO[foot][s]).filter((v) => v != null));
      if (!m.tested) return { text: '—', grade: null };
      return { text: m.insensate ? `${m.insensate}/${m.tested} not felt` : `${m.tested}/${m.tested} felt`, grade: monoGrade(m.insensate) };
    }
    const vals = PROTOCOL_SITES.map((s) => readings[mod][foot][s]).filter((v) => v != null);
    const avg = averageReadings(mod, vals);
    return { text: avg === null ? '—' : `${avg}${MODALITY_META[mod].unit}`, grade: gradeValue(mod, avg) };
  };
  // running preview for the current capture modality
  const summary = useMemo(() => Object.fromEntries(FEET.map((f) => [f, footMod(f, modality)])), [readings, modality]); // eslint-disable-line react-hooks/exhaustive-deps

  const capturedCount = useMemo(() => {
    if (!isCapture) return { done: 0, total: 0 };
    let done = 0; let total = 0;
    for (const f of FEET) for (const s of PROTOCOL_SITES) {
      if (!selected[f]?.[s]) continue;
      total += 1;
      if (readings[modality][f][s] !== undefined) done += 1;
    }
    return { done, total };
  }, [readings, modality, selected, isCapture]);

  const anyReading = useMemo(
    () => CAPTURE_MODS.some((m) => FEET.some((f) => PROTOCOL_SITES.some((s) => readings[m][f][s] != null))),
    [readings],
  );

  // ---- wizard nav ----
  const goNext = () => setStep((s) => Math.min(s + 1, STEP_IDS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const complete = async () => {
    if (!study || !anyReading) { notify('error', 'Record at least one reading before completing.'); return; }
    setCompleting(true);
    try {
      const res = await neuropathyService.complete(study.id, { remarks: remarks || undefined });
      await disconnectProbe();
      notify('success', 'Study graded and saved to the patient’s record.');
      onCompleted?.(res.data.data || res.data);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Could not complete the study.');
    } finally {
      setCompleting(false);
    }
  };

  const discard = async () => {
    if (study) {
      try { await neuropathyService.cancel(study.id, 'Discarded before completion'); } catch { /* nurses cannot cancel — the empty Draft is harmless */ }
    }
    await disconnectProbe();
    setStudy(null); setReadings(emptyReadings()); setRemarks(''); setSelected(allSelected()); setStep(0);
    if (!fixedPatient) setPatient(null);
    onCancelled?.();
  };

  // ---------------------------------------------------------------- render
  if (!patient) return <PatientPicker onPick={setPatient} />;

  const connected = device.status === 'connected';
  void nowTick;
  const liveFresh = connected && live && (Date.now() - live.at) < LIVE_STALE_MS;

  // ---- probe connect / disconnect control (shared by capture steps) ----
  const ProbeControl = () => (
    connected ? (
      <button type="button" onClick={disconnectProbe} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 inline-flex items-center gap-1.5">
        <PlugZap className="w-3.5 h-3.5" /> Probe connected · disconnect
      </button>
    ) : (
      <button
        type="button"
        onClick={() => connectProbe(false)}
        disabled={!isWebSerialSupported() || device.status === 'connecting'}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-primary inline-flex items-center gap-1.5 disabled:opacity-50"
        title={isWebSerialSupported() ? 'Choose the probe’s USB port' : 'Use Chrome or Edge on the exam PC'}
      >
        {device.status === 'connecting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Usb className="w-3.5 h-3.5" />}
        {device.status === 'connecting' ? 'Connecting…' : 'Connect probe'}
      </button>
    )
  );

  const Legend = () => (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[11px] text-gray-500 mt-3">
      {[['#1f8a4c', 'Normal / felt'], ['#c07d00', 'Mild'], ['#d9531e', 'Moderate'], ['#c11d2e', 'Severe / not felt'], ['#9aa6b6', 'Not assessed']].map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />{l}</span>
      ))}
    </div>
  );

  const AvgFooter = () => (
    <>
      <div className="grid grid-cols-2 gap-3 mt-4 max-w-[520px] mx-auto">
        {FEET.map((foot) => (
          <div key={foot} className="border border-gray-200 bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold">{FOOT_LABELS[foot]} · {modality === 'MONO' ? 'protective sensation' : 'average'}</p>
            <p className="font-mono text-2xl font-semibold tabular-nums my-0.5">{summary[foot].text}</p>
            <Chip grade={summary[foot].grade}>{summary[foot].grade || 'Pending'}</Chip>
          </div>
        ))}
      </div>
      <Legend />
      <p className="text-center text-xs text-gray-500 mt-2">{capturedCount.done} of {capturedCount.total} selected points recorded. Preview only — the server grades on complete.</p>
    </>
  );

  const NavRow = ({ nextLabel, nextDisabled }) => (
    <div className="flex items-center justify-between gap-2 mt-4 max-w-[520px] mx-auto">
      <button type="button" onClick={goBack} disabled={step === 0} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Back</button>
      <button type="button" onClick={goNext} disabled={nextDisabled} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{nextLabel} →</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <SummaryDock
        overviewOpen={overviewOpen}
        xlTop={embedded ? undefined : "xl:top-[9.5rem] xl:max-h-[calc(100dvh-11rem)]"}
        panel={<ConsultationSummaryContainer patient={patient} medications={meds} />}
      >
        {!embedded && (
        <>
        <div
          onClick={() => setOverviewOpen((o) => !o)}
          className={`mb-1 px-4 py-2 rounded-lg shadow-sm border flex items-center justify-between gap-4 cursor-pointer transition-colors ${overviewOpen ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 hover:bg-blue-50'}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${overviewOpen ? 'rotate-180 text-white' : 'text-gray-400'}`} />
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-primary font-bold grid place-items-center flex-shrink-0">
              {(patient.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <h2 className={`text-base font-bold truncate ${overviewOpen ? 'text-white' : 'text-gray-800'}`}>{patient.name}</h2>
            <span className={`hidden sm:inline text-sm truncate ${overviewOpen ? 'text-blue-100' : 'text-gray-400'}`}>
              {patient.uhid} · {patient.gender ?? '—'} · {patient.age != null ? `${patient.age} yrs` : '—'} · Plantar protocol — 6 sites/foot
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {creating && <span className={`text-xs ${overviewOpen ? 'text-blue-100' : 'text-primary'}`}>starting study…</span>}
            {study && <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${overviewOpen ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>Study #{study.id} · Draft</span>}
          </div>
        </div>

        <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${overviewOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden min-h-0">
            <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Personal Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Full name</span><span className="font-semibold text-right">{patient.name || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">UHID</span><span className="font-semibold text-primary">{patient.uhid}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Age / Gender</span><span className="font-semibold">{patient.age ?? '—'} yrs · {patient.gender ?? '—'}</span></div>
                  {patient.phone && <div className="flex justify-between gap-3"><span className="text-gray-500">Phone</span><span className="font-semibold">{patient.phone}</span></div>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Medical Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Diagnosis</span><span className="font-semibold text-right">{patient.diagnosis || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Risk level</span><span className="font-semibold">{patient.riskLevel || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500">Primary doctor</span><span className="font-semibold text-right">{patient.primaryDoctor || '—'}</span></div>
                </div>
              </div>
            </div>
            {!fixedPatient && (
              <div className="flex justify-end pb-1">
                <button type="button" onClick={discard} className="text-xs font-semibold text-gray-500 hover:text-red-600 inline-flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Discard &amp; change patient
                </button>
              </div>
            )}
          </div>
        </div>
        </>
        )}

        <div className="mt-3">
          {/* ---- step rail ---- */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {STEP_IDS.map((id, i) => {
              const done = i < step; const cur = i === step;
              return (
                <div key={id} className={`flex-1 min-w-[104px] flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${cur ? 'border-primary text-primary ring-2 ring-primary/10' : done ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-400'}`}>
                  <span className={`w-5 h-5 rounded-full grid place-items-center text-[11px] flex-none ${cur ? 'bg-primary text-white' : done ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {done ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  {STEP_LABEL[id]}
                </div>
              );
            })}
          </div>

          {/* ---- STEP: select spots ---- */}
          {stepId === 'spots' && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-gray-800">Select the points to assess</h3>
              <p className="text-sm text-gray-500 mt-1">Tap a point to include or exclude it. Excluded points are recorded as <span className="font-semibold">not assessed</span> and left out of the grade.</p>
              <div className="flex items-center gap-2 mt-3">
                <button type="button" onClick={() => allSpots(true)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">Assess all</button>
                <button type="button" onClick={() => allSpots(false)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50">Clear all</button>
                <span className="ml-auto text-sm text-gray-500">{selCount} of 12 points selected</span>
              </div>
              <div className="mt-4 flex justify-center">
                <NeuropathyFootMap variant="select" size="large" readings={{}} modality="MONO" selected={selected} onSelect={toggleSelect} />
              </div>
              <div className="flex justify-end mt-4">
                <button type="button" onClick={goNext} disabled={selCount === 0} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">Continue →</button>
              </div>
            </div>
          )}

          {/* ---- STEP: monofilament ---- */}
          {stepId === 'MONO' && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-gray-800 inline-flex items-center gap-2"><Footprints className="w-4 h-4 text-primary" /> Monofilament · 10 g</h3>
              <p className="text-sm text-gray-500 mt-1">Tap each selected point: a tap marks it <span className="text-green-700 font-semibold">felt</span>; tap again for <span className="text-red-600 font-semibold">not felt</span>.</p>
              <div className="mt-4 flex justify-center">
                <NeuropathyFootMap size="large" readings={readings.MONO} modality="MONO" active={null} onSelect={toggleMono} selected={selected} />
              </div>
              <AvgFooter />
              <NavRow nextLabel="Next: VPT" nextDisabled={false} />
            </div>
          )}

          {/* ---- STEP: VPT / Cold / Hot ---- */}
          {isCapture && stepId !== 'MONO' && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 inline-flex items-center gap-2"><ModIcon className="w-4 h-4 text-primary" /> {meta.long}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Work the probe and press <span className="font-semibold">REC</span> on the machine to file each reading — it advances to the next selected point.</p>
                </div>
                <div className="flex-none"><ProbeControl /></div>
              </div>

              <div className="mt-4 flex justify-center">
                <NeuropathyFootMap size="large" readings={readings[modality]} modality={modality} active={active} onSelect={(foot, site) => selected[foot]?.[site] && setActive({ foot, site })} selected={selected} />
              </div>

              {/* readout — white with blue reading */}
              <div className="rounded-xl bg-white border-2 border-primary p-4 flex flex-nowrap justify-between items-center gap-4 max-w-[520px] mx-auto mt-4">
                <div className="min-w-0">
                  <p className="text-[10.5px] tracking-widest uppercase text-gray-400 font-semibold">
                    {active ? `Reading → ${FOOT_LABELS[active.foot]} · ${SITE_LABELS[active.site]}` : 'All selected points recorded'}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-semibold text-primary tabular-nums">{liveFresh ? live.value : (manual !== '' ? manual : '—')}</span>
                    <span className="text-blue-300 font-semibold">{meta.unit}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {connected
                      ? <>Press <span className="font-semibold">REC</span> on the Vibrotherm to file the reading{active ? ' to this point' : ''}.</>
                      : 'Connect the probe, then press REC on the machine to file each reading.'}
                  </p>
                  {connected && !liveFresh && (modality === 'HOT' || modality === 'COLD') && active && (
                    <p className="text-xs text-amber-600 mt-1">Ramping — no live °C during the ramp; watch the LCD and press <span className="font-semibold">REC</span> at the patient’s response.</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-none">
                  <label className="text-[10.5px] text-gray-500">no probe? type + Enter</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={meta.step}
                    min={meta.min}
                    max={meta.max}
                    value={manual}
                    disabled={!active}
                    onChange={(e) => setManual(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') captureManual(); }}
                    placeholder={`${meta.unit || 'value'}`}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <NavRow nextLabel={`Next: ${STEP_LABEL[STEP_IDS[step + 1]]}`} nextDisabled={false} />
              <AvgFooter />
              {saving && <p className="text-center text-xs text-gray-400 mt-2 inline-flex items-center gap-1 justify-center w-full"><Loader2 className="w-3 h-3 animate-spin" /> saving…</p>}
              <p className="text-[11px] text-gray-400 mt-2 flex items-start gap-1 justify-center">
                <Plug className="w-3 h-3 mt-0.5 flex-shrink-0" />
                The portal commands the probe with the same signals as the vendor app and records what it reads — no firmware change, and the ≥49 °C cut-off stays in hardware.
              </p>
            </div>
          )}

          {/* ---- STEP: review & complete ---- */}
          {stepId === 'review' && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-gray-800">Review &amp; complete</h3>
              <p className="text-sm text-gray-500 mt-1">The server grades and locks the study, then opens the report to print &amp; save.</p>

              <div className="overflow-x-auto mt-4 max-w-[560px] mx-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10.5px] uppercase tracking-wider text-gray-400">
                      <th className="text-left py-2 px-2 border-b border-gray-200 font-semibold">Test</th>
                      <th className="text-right py-2 px-2 border-b border-gray-200 font-semibold">Right</th>
                      <th className="text-right py-2 px-2 border-b border-gray-200 font-semibold">Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[['MONO', 'Monofilament'], ['VPT', 'Biothesiometry (VPT)'], ['COLD', 'Cold perception'], ['HOT', 'Hot perception']].map(([mod, label]) => {
                      const r = footMod('R', mod); const l = footMod('L', mod);
                      return (
                        <tr key={mod} className="border-b border-gray-100 last:border-0">
                          <td className="py-2 px-2 text-gray-700">{label}</td>
                          <td className="py-2 px-2 text-right"><span className="font-mono tabular-nums mr-2">{r.text}</span>{r.grade && <Chip grade={r.grade}>{r.grade}</Chip>}</td>
                          <td className="py-2 px-2 text-right"><span className="font-mono tabular-nums mr-2">{l.text}</span>{l.grade && <Chip grade={l.grade}>{l.grade}</Chip>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="max-w-[560px] mx-auto mt-4">
                <label className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Remarks (optional) — e.g. callus over R great toe, patient reports burning at night"
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[66px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <p className="text-center text-xs text-gray-500 mt-3 max-w-[560px] mx-auto">Completing generates the report → <span className="font-semibold">Print</span> and <span className="font-semibold">Save to record</span>. The report can be saved <span className="font-semibold">once</span>; after that the study is view / print only.</p>

              <div className="flex items-center justify-between gap-2 mt-4 max-w-[560px] mx-auto">
                <button type="button" onClick={goBack} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">← Back</button>
                <button
                  type="button"
                  onClick={complete}
                  disabled={!study || !anyReading || completing}
                  className="bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 font-semibold text-sm inline-flex items-center gap-2"
                >
                  {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Complete &amp; grade → report
                </button>
              </div>
            </div>
          )}
        </div>
      </SummaryDock>
    </div>
  );
};

export default NeuropathyExam;
