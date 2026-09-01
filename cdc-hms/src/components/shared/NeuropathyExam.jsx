import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, User, X, Loader2, Usb, Zap, Thermometer, Snowflake, Footprints, SkipForward, CheckCircle2, Plug, PlugZap } from 'lucide-react';
import patientService from '../../services/patientService';
import neuropathyService from '../../services/neuropathyService';
import { notify } from '../../utils/notify';
import { connectVibrotherm, isWebSerialSupported } from '../../utils/vibrothermSerial';
import NeuropathyFootMap from './NeuropathyFootMap';
import {
  FEET, FOOT_LABELS, PROTOCOL_SITES, SITE_LABELS, MODALITIES, MODALITY_META,
  gradeValue, averageReadings, monoSummary, GRADE_CLASSES,
} from '../../constants/neuropathy';

// Neuropathy Studio — the in-portal exam. Read-only capture: the operator
// works the Vibrotherm probe as today; this screen listens on the serial port,
// files each reading against a foot × site × modality, previews the per-foot
// average + band live, and on Complete asks the server to grade and lock.
//
// Flow: pick patient (UHID first) → Draft study → capture per site → Complete.
// Monofilament is a separate physical test — a tick per site, not a probe read.

const MOD_ICON = { VPT: Zap, HOT: Thermometer, COLD: Snowflake, MONO: Footprints };

const emptyReadings = () => Object.fromEntries(MODALITIES.map((m) => [m, { R: {}, L: {} }]));

const nextOpenSite = (readings, modality, from) => {
  // Same foot first, then the other foot; null when the modality is complete.
  const order = [from.foot, from.foot === 'R' ? 'L' : 'R'];
  for (const foot of order) {
    for (const site of PROTOCOL_SITES) {
      const v = readings[modality][foot][site];
      if (v === undefined) return { foot, site };
    }
  }
  return null;
};

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

// ---------------------------------------------------------------- the exam
/**
 * Props:
 *   fixedPatient — { uhid, name, age?, gender? } to skip the picker (patient file)
 *   onCompleted  — (study) => void — called with the graded, locked study
 *   onCancelled  — () => void
 */
const NeuropathyExam = ({ fixedPatient = null, onCompleted, onCancelled }) => {
  const [patient, setPatient] = useState(fixedPatient);
  const [study, setStudy] = useState(null);
  const [creating, setCreating] = useState(false);

  const [modality, setModality] = useState('VPT');
  const [active, setActive] = useState({ foot: 'R', site: PROTOCOL_SITES[0] });
  const [readings, setReadings] = useState(emptyReadings);
  const [saving, setSaving] = useState(false);

  const [remarks, setRemarks] = useState('');
  const [impression, setImpression] = useState('');
  const [completing, setCompleting] = useState(false);

  // ---- probe link (read-only) ----
  const [device, setDevice] = useState({ status: 'idle', detail: null });
  const [live, setLive] = useState(null);           // { value, at } — latest reading for the active (tab-driven) probe
  const [manual, setManual] = useState('');
  const linkRef = useRef(null);

  // The driver streams vibration ('vpt') and thermal ('thermal') frames
  // interleaved. Show only the channel that matches the current modality so
  // the readout doesn't flicker between volts and °C. Hot vs cold is our own
  // flow state — both are thermal frames.
  // Which device screen each modality drives (VPT → vibration probe;
  // Hot / Cold → thermal probe on their own screens). MONO uses no probe.
  const screenFor = (m) => (m === 'VPT' ? 'vpt' : m === 'HOT' ? 'hot' : m === 'COLD' ? 'cold' : null);
  const modalityRef = useRef(modality);
  // The Vibrotherm tags every serial frame the same way regardless of which
  // probe is live, so HMS DRIVES the probe from the selected modality — VPT
  // commands the vibration probe, Hot/Cold the thermal probe — and takes
  // whatever streams as that modality's reading. Switching tabs re-commands
  // the probe and clears the readout until the new value settles.
  useEffect(() => {
    modalityRef.current = modality;
    setLive(null);
    const screen = screenFor(modality);
    if (screen) linkRef.current?.switchScreen?.(screen); // no-op until connected
  }, [modality]);

  const meta = MODALITY_META[modality];
  const ModIcon = MOD_ICON[modality];

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

  // Tear the serial link down on unmount.
  useEffect(() => () => { linkRef.current?.disconnect?.(); }, []);

  const connectProbe = async (silent = false) => {
    try {
      const link = await connectVibrotherm({
        silent,
        startScreen: screenFor(modality) || 'vpt',
        onReading: (r) => setLive({ value: r.value, at: Date.now() }),
        onStatus: (status, detail) => setDevice({ status, detail }),
      });
      linkRef.current = link;
    } catch (err) {
      if (err?.name === 'NotFoundError') return; // user dismissed the chooser
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

  const capture = () => {
    const src = live && device.status === 'connected' ? live.value : (manual === '' ? null : Number(manual));
    if (src === null || Number.isNaN(src)) { notify('error', 'No reading to capture — connect the probe or type a value.'); return; }
    if (src < meta.min || src > meta.max) { notify('error', `Out of range: ${meta.long} must be ${meta.min}–${meta.max}${meta.unit}.`); return; }
    record(active.foot, active.site, modality, src);
    setManual('');
    const next = nextOpenSite({ ...readings, [modality]: { ...readings[modality], [active.foot]: { ...readings[modality][active.foot], [active.site]: src } } }, modality, active);
    if (next) setActive(next);
  };

  const skipSite = () => {
    record(active.foot, active.site, modality, null);
    const next = nextOpenSite({ ...readings, [modality]: { ...readings[modality], [active.foot]: { ...readings[modality][active.foot], [active.site]: null } } }, modality, active);
    if (next) setActive(next);
  };

  const toggleMono = (foot, site) => {
    const cur = readings.MONO[foot][site];
    const val = cur === 1 ? 0 : 1;   // undefined → felt (1), felt → not felt (0), not felt → felt
    record(foot, site, 'MONO', val);
  };

  // ---- live preview of per-foot averages + bands (server recomputes on complete) ----
  const summary = useMemo(() => {
    const out = {};
    for (const foot of FEET) {
      const vals = PROTOCOL_SITES.map((s) => readings[modality][foot][s]).filter((v) => v !== undefined);
      if (modality === 'MONO') {
        const m = monoSummary(vals);
        out[foot] = { text: m.tested ? `${m.tested - m.insensate}/${m.tested} felt` : '—', grade: m.tested ? (m.insensate ? 'Severe' : 'Normal') : null, label: m.tested ? (m.insensate ? `${m.insensate} insensate` : 'Intact') : 'Pending' };
      } else {
        const avg = averageReadings(modality, vals);
        const grade = gradeValue(modality, avg);
        out[foot] = { text: avg === null ? '—' : `${avg}${meta.unit}`, grade, label: grade || 'Pending' };
      }
    }
    return out;
  }, [readings, modality, meta.unit]);

  const anyReading = useMemo(
    () => MODALITIES.some((m) => FEET.some((f) => PROTOCOL_SITES.some((s) => readings[m][f][s] != null))),
    [readings],
  );

  const complete = async () => {
    if (!study || !anyReading) { notify('error', 'Record at least one reading before completing.'); return; }
    setCompleting(true);
    try {
      const res = await neuropathyService.complete(study.id, { remarks: remarks || undefined, impression: impression || undefined });
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
    setStudy(null); setReadings(emptyReadings()); setRemarks(''); setImpression('');
    if (!fixedPatient) setPatient(null);
    onCancelled?.();
  };

  // ---------------------------------------------------------------- render
  if (!patient) return <PatientPicker onPick={setPatient} />;

  const liveFresh = live && device.status === 'connected';
  const connected = device.status === 'connected';

  return (
    <div className="space-y-4">
      {/* patient strip */}
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center gap-4 flex-wrap">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-primary font-bold grid place-items-center">
          {(patient.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800">
            {patient.name} <span className="font-mono text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 ml-1">{patient.uhid}</span>
          </p>
          <p className="text-xs text-gray-500">
            {patient.gender ?? '—'} · {patient.age != null ? `${patient.age} yrs` : '—'} · Plantar protocol — 4 sites per foot
            {creating && <span className="ml-2 text-primary">starting study…</span>}
            {study && <span className="ml-2 text-gray-400">Study #{study.id} · Draft</span>}
          </p>
        </div>
        <div className="flex-1" />
        {!fixedPatient && (
          <button type="button" onClick={discard} className="text-xs font-semibold text-gray-500 hover:text-red-600 inline-flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Discard &amp; change patient
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 items-start">
        {/* LEFT — sites + probe */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-semibold tracking-wider uppercase text-gray-400">Test point</p>
          <h3 className="text-base font-semibold text-gray-800">Tap a site, then capture the reading</h3>

          {/* modality switch */}
          <div className="flex flex-wrap gap-1.5 my-3">
            {MODALITIES.map((m) => {
              const I = MOD_ICON[m];
              const on = m === modality;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModality(m)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition ${on ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-primary'}`}
                >
                  <I className="w-3.5 h-3.5" />
                  {MODALITY_META[m].label}
                  {MODALITY_META[m].unit && <span className={`font-normal ${on ? 'text-blue-100' : 'text-gray-400'}`}>· {MODALITY_META[m].unit}</span>}
                </button>
              );
            })}
          </div>

          {modality === 'MONO' ? (
            /* monofilament — a tick per site, no probe */
            <div>
              <NeuropathyFootMap readings={readings.MONO} modality="MONO" active={null} onSelect={toggleMono} />
              <div className="grid grid-cols-2 gap-3 mt-3">
                {FEET.map((foot) => (
                  <div key={foot} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{FOOT_LABELS[foot]} — felt?</p>
                    {PROTOCOL_SITES.map((site) => {
                      const v = readings.MONO[foot][site];
                      return (
                        <label key={site} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                          <input type="checkbox" checked={v === 1} onChange={() => toggleMono(foot, site)} className="w-4 h-4 accent-primary" />
                          <span className="text-gray-700">{SITE_LABELS[site]}</span>
                          {v === 0 && <span className="ml-auto text-xs font-semibold text-red-600">not felt</span>}
                          {v === 1 && <span className="ml-auto text-xs font-semibold text-green-700">felt</span>}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">{meta.bands}. Sites left unticked and untouched are not counted.</p>
            </div>
          ) : (
            <div>
              <NeuropathyFootMap readings={readings[modality]} modality={modality} active={active} onSelect={(foot, site) => setActive({ foot, site })} />
              <p className="text-xs text-gray-500 mt-2">Protocol omits MTH 3 &amp; instep — 4 sites per foot. <span className="text-gray-400">{meta.bands}</span></p>

              {/* probe readout */}
              <div className="mt-4 rounded-xl bg-slate-900 text-white p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10.5px] tracking-widest uppercase text-slate-400">
                    {connected ? 'Live from probe' : 'Probe not connected'} · {meta.label.toLowerCase()}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-semibold tabular-nums">
                      {liveFresh ? live.value : (manual !== '' ? manual : '—')}
                    </span>
                    <span className="text-slate-400">{meta.unit}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">→ {FOOT_LABELS[active.foot]} · {SITE_LABELS[active.site]}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={capture}
                    disabled={!study || saving || (!liveFresh && manual === '')}
                    className="bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-5 py-3 font-semibold text-sm inline-flex flex-col items-center min-w-[104px]"
                  >
                    Capture
                    <span className="text-[10px] font-normal opacity-80">reading only</span>
                  </button>
                  <button type="button" onClick={skipSite} disabled={!study} className="text-xs text-slate-300 hover:text-white inline-flex items-center gap-1">
                    <SkipForward className="w-3 h-3" /> Skip this site
                  </button>
                </div>
              </div>

              {/* device controls + manual fallback */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {connected ? (
                  <button type="button" onClick={disconnectProbe} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 inline-flex items-center gap-1.5">
                    <PlugZap className="w-3.5 h-3.5" /> Vibrotherm connected · disconnect
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
                    {device.status === 'connecting' ? 'Connecting…' : 'Connect Vibrotherm probe'}
                  </button>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <label className="text-xs text-gray-500">or type</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={meta.step}
                    min={meta.min}
                    max={meta.max}
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') capture(); }}
                    placeholder={`${meta.unit || 'value'}`}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 flex items-start gap-1">
                <Plug className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Read-only: the portal only listens. Voltage and temperature are driven on the device, whose ≥49 °C cut-off stays in hardware.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — readings + grading + complete */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-semibold tracking-wider uppercase text-gray-400">This study</p>
          <h3 className="text-base font-semibold text-gray-800 inline-flex items-center gap-2"><ModIcon className="w-4 h-4 text-primary" />{meta.long}</h3>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-gray-400">
                  <th className="text-left py-2 px-2 border-b border-gray-200 font-semibold">Site</th>
                  <th className="text-right py-2 px-2 border-b border-gray-200 font-semibold">Right</th>
                  <th className="text-right py-2 px-2 border-b border-gray-200 font-semibold">Left</th>
                </tr>
              </thead>
              <tbody>
                {PROTOCOL_SITES.map((site) => {
                  const cell = (foot) => {
                    const v = readings[modality][foot][site];
                    if (v === undefined) return <span className="text-gray-300">—</span>;
                    if (v === null) return <span className="text-xs text-gray-400 italic">skipped</span>;
                    if (modality === 'MONO') return <span className={`text-xs font-semibold ${v === 1 ? 'text-green-700' : 'text-red-600'}`}>{v === 1 ? 'felt' : 'not felt'}</span>;
                    return <span className="font-mono font-semibold tabular-nums">{v}{meta.unit}</span>;
                  };
                  const isActiveRow = (foot) => modality !== 'MONO' && active.foot === foot && active.site === site;
                  return (
                    <tr key={site} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 px-2 text-gray-700">{SITE_LABELS[site]}</td>
                      <td className={`py-2 px-2 text-right ${isActiveRow('R') ? 'bg-blue-50 rounded' : ''}`}>{cell('R')}</td>
                      <td className={`py-2 px-2 text-right ${isActiveRow('L') ? 'bg-blue-50 rounded' : ''}`}>{cell('L')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {FEET.map((foot) => (
              <div key={foot} className="border border-gray-200 bg-gray-50 rounded-lg p-3">
                <p className="text-[10.5px] uppercase tracking-wider text-gray-400 font-semibold">{FOOT_LABELS[foot]} · {modality === 'MONO' ? 'protective sensation' : 'average'}</p>
                <p className="font-mono text-2xl font-semibold tabular-nums my-0.5">{summary[foot].text}</p>
                <Chip grade={summary[foot].grade}>{summary[foot].label}</Chip>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Preview only — the stored grade is computed by the server when you complete the study.</p>

          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (optional) — e.g. callus over R great toe, patient reports burning at night"
            className="w-full mt-4 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="Impression / plan (optional) — e.g. loss of protective sensation right foot; offloading review, re-assess in 3 months"
            className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex items-center justify-end gap-2 mt-4">
            {saving && <span className="text-xs text-gray-400 inline-flex items-center gap-1 mr-auto"><Loader2 className="w-3 h-3 animate-spin" /> saving…</span>}
            <button
              type="button"
              onClick={complete}
              disabled={!study || !anyReading || completing}
              className="bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 font-semibold text-sm inline-flex items-center gap-2"
            >
              {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Complete &amp; grade study
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuropathyExam;
