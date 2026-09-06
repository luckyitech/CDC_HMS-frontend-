import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Loader2, RefreshCw, Info, Download } from 'lucide-react';
import neuropathyService from '../../services/neuropathyService';
import NeuropathyFootMap from './NeuropathyFootMap';
import { GRADES, GRADE_SPOT, FEET } from '../../constants/neuropathy';

// Neuropathy Suite -> Analytics — the live prospective PNS cohort dashboard.
// Phase 1: prevalence & severity + screening throughput. Read-only; all numbers
// come from GET /neuropathy/analytics/overview (doctor/admin only), which grades
// each study from its raw readings so these match NeuropathyReport exactly.

const GRADE_COLOR = {
  Normal: GRADE_SPOT.Normal.ring, Mild: GRADE_SPOT.Mild.ring,
  Moderate: GRADE_SPOT.Moderate.ring, Severe: GRADE_SPOT.Severe.ring,
};
const OVERALL_LABEL = { Normal: 'No evidence', Mild: 'Mild', Moderate: 'Moderate', Severe: 'Severe' };
const MOD_LABEL = { VPT: 'Vibration (VPT)', HOT: 'Hot', COLD: 'Cold' };

const Panel = ({ title, cap, children, className = '' }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm p-4 ${className}`}>
    <h3 className="text-[13.5px] font-bold text-slate-800">{title}</h3>
    {cap && <p className="text-[11.5px] text-slate-500 mt-0.5">{cap}</p>}
    {children}
  </div>
);

const Kpi = ({ label, value, unit, meta, accent }) => (
  <div className={`rounded-xl border p-3.5 shadow-sm ${accent ? 'border-cyan-700 bg-gradient-to-br from-cyan-900 to-cyan-700 text-cyan-50' : 'border-slate-200 bg-white'}`}>
    <div className={`text-[11px] font-semibold uppercase tracking-wide ${accent ? 'text-cyan-200' : 'text-slate-500'}`}>{label}</div>
    <div className="mt-1.5 text-[26px] font-extrabold leading-none tabular-nums">
      {value}{unit && <span className={`text-sm font-semibold ${accent ? 'text-cyan-200' : 'text-slate-400'}`}>{unit}</span>}
    </div>
    {meta && <div className={`mt-1.5 text-[11.5px] ${accent ? 'text-cyan-100' : 'text-slate-500'}`}>{meta}</div>}
  </div>
);

const Donut = ({ pct }) => (
  <div className="relative grid place-items-center flex-none" style={{ width: 118, height: 118, borderRadius: '50%', background: `conic-gradient(#0891b2 ${pct}%, #e2e8f0 0)` }}>
    <div className="absolute rounded-full bg-white" style={{ inset: 13, boxShadow: 'inset 0 0 0 1px #e2e8f0' }} />
    <div className="relative text-center">
      <div className="text-[24px] font-extrabold tabular-nums leading-none text-slate-800">{pct}%</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">screened</div>
    </div>
  </div>
);

const CoverageRow = ({ label, pct, screened, total }) => (
  <div className="grid grid-cols-[76px_1fr_86px] items-center gap-3 text-[12.5px] mb-1.5">
    <span className="font-semibold text-slate-600">{label}</span>
    <div className="h-4 rounded-md bg-slate-50 border border-slate-200 overflow-hidden">
      <div className="h-full rounded" style={{ width: `${Math.min(pct, 100)}%`, background: '#0891b2' }} />
    </div>
    <span className="text-right text-slate-500 tabular-nums">{screened}/{total} · {pct}%</span>
  </div>
);

const RiskFactorPanel = ({ title, cap, factor, denom }) => (
  <Panel title={title} cap={cap}>
    {factor && factor.bands.length ? (
      <div className="mt-2 space-y-2">
        {factor.bands.map((b) => (
          <div key={b.band} className="grid grid-cols-[74px_1fr_96px] items-center gap-3 text-[12.5px]">
            <span className="font-semibold text-slate-600">{b.band}</span>
            <div className="h-4 rounded-md bg-slate-50 border border-slate-200 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${Math.min(b.prevalencePct, 100)}%`, background: '#0e7490' }} />
            </div>
            <span className="text-right text-slate-700 tabular-nums"><b>{b.prevalencePct}%</b> · n={b.n}</span>
          </div>
        ))}
        <p className="text-[11px] text-slate-400 pt-1">{factor.available} of {denom} graded patients had this recorded.</p>
      </div>
    ) : <p className="text-slate-400 text-sm text-center py-8">Not enough data recorded yet.</p>}
  </Panel>
);

const DIR_COLOR = { worsened: GRADE_SPOT.Severe.ring, improved: GRADE_SPOT.Normal.ring, stable: '#94a3b8' };

const Trajectory = ({ trajectories, maxVisits }) => {
  const W = 560, H = 210, x0 = 46, x1 = 540, yTop = 20, yBot = 184, vMax = 50;
  const xFor = (v) => x0 + (maxVisits > 1 ? (v - 1) / (maxVisits - 1) : 0) * (x1 - x0);
  const yFor = (vpt) => yBot - (Math.min(vpt, vMax) / vMax) * (yBot - yTop);
  const grid = [15, 25, 40].map((v) => ({ v, y: yFor(v) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-2" style={{ overflow: 'visible' }} role="img" aria-label="Worst-foot VPT trajectory per patient">
      {grid.map((g) => (
        <g key={g.v}>
          <line x1={x0} x2={x1} y1={g.y} y2={g.y} stroke="#eef2f7" strokeDasharray="2 3" />
          <text x={x0 - 8} y={g.y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{g.v}V</text>
        </g>
      ))}
      <line x1={x0} x2={x1} y1={yBot} y2={yBot} stroke="#e2e8f0" />
      {trajectories.map((t, i) => {
        const pts = t.points.filter((p) => p.vpt !== null && p.vpt !== undefined);
        if (pts.length < 2) return null;
        return <polyline key={i} points={pts.map((p) => `${xFor(p.visit)},${yFor(p.vpt)}`).join(' ')} fill="none" stroke={DIR_COLOR[t.direction]} strokeWidth="2" opacity="0.8" strokeLinejoin="round" />;
      })}
      {Array.from({ length: Math.max(maxVisits, 2) }, (_, i) => i + 1).map((v) => (
        <text key={v} x={xFor(v)} y={H - 6} textAnchor="middle" fontSize="10" fill="#94a3b8">{v === 1 ? 'Baseline' : `Visit ${v}`}</text>
      ))}
    </svg>
  );
};

const Oc = ({ kind, n, label }) => {
  const cls = kind === 'worse' ? 'border-red-200 bg-red-50 text-red-800'
    : kind === 'better' ? 'border-green-200 bg-green-50 text-green-800'
    : 'border-slate-200 bg-slate-50 text-slate-700';
  return (
    <div className={`rounded-xl border p-3 text-center ${cls}`}>
      <b className="block text-[22px] font-extrabold leading-none tabular-nums">{n}</b>
      <span className="text-[11.5px] font-semibold">{label}</span>
    </div>
  );
};

const NeuropathyAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filters, setFilters] = useState({ period: 'all', sex: '', ageBand: '', performedById: '' });
  const [coverage, setCoverage] = useState(null);
  const [corr, setCorr] = useState(null);
  const [longi, setLongi] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setErr(null);
    const params = {};
    if (filters.sex) params.sex = filters.sex;
    if (filters.ageBand) params.ageBand = filters.ageBand;
    if (filters.performedById) params.performedById = filters.performedById;
    if (filters.period === '12m') { const d = new Date(); d.setMonth(d.getMonth() - 12); params.from = d.toISOString().slice(0, 10); }
    if (filters.period === 'ytd') { params.from = `${new Date().getFullYear()}-01-01`; }
    neuropathyService.getAnalyticsOverview(params)
      .then((res) => setData(res?.data ?? res))
      .catch(() => setErr('Could not load analytics.'))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { neuropathyService.getCoverage().then((r) => setCoverage(r?.data ?? r)).catch(() => setCoverage(null)); }, []);
  useEffect(() => { neuropathyService.getCorrelation().then((r) => setCorr(r?.data ?? r)).catch(() => setCorr(null)); }, []);
  useEffect(() => { neuropathyService.getLongitudinal().then((r) => setLongi(r?.data ?? r)).catch(() => setLongi(null)); }, []);

  const exportCohort = () => {
    const list = corr?.exportRows || [];
    if (!list.length) return;
    const cols = Object.keys(list[0]);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [cols, ...list.map((r) => cols.map((c) => r[c]))].map((row) => row.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `neuropathy-cohort_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const heatReadings = useMemo(() => {
    if (!data?.siteHeatmap) return null;
    const out = { R: {}, L: {} };
    for (const foot of FEET) {
      const sh = data.siteHeatmap[foot] || {};
      for (const site of Object.keys(sh)) if (sh[site]?.meanVpt != null) out[foot][site] = sh[site].meanVpt;
    }
    return out;
  }, [data]);

  if (loading) return <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Building cohort analytics…</div>;
  if (err) return <div className="py-16 text-center text-slate-500">{err} <button onClick={load} className="text-cyan-700 font-semibold ml-2">Retry</button></div>;
  if (!data || data.totals.studiesCompleted === 0) {
    return <div className="py-20 text-center text-slate-500">No completed neuropathy studies yet. The cohort fills in as studies are signed.</div>;
  }

  const t = data.totals;
  const prevTotal = GRADES.reduce((n, g) => n + (data.prevalence[g] || 0), 0);
  const modalityData = ['VPT', 'HOT', 'COLD'].map((m) => ({ modality: MOD_LABEL[m], ...data.byModality[m] }));
  const mono = data.byModality.MONO || { felt: 0, notFelt: 0 };
  const vptAbnormal = ['Mild', 'Moderate', 'Severe'].reduce((n, g) => n + (data.byModality.VPT?.[g] || 0), 0);
  const vptAbnormalPct = prevTotal ? Math.round((vptAbnormal / prevTotal) * 100) : null;
  const firstMonth = data.throughput?.[0]?.month;
  const monoTotal = mono.felt + mono.notFelt;

  return (
    <div className="space-y-5">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          ['period', [['all', 'All time'], ['12m', 'Last 12 months'], ['ytd', 'This year']]],
          ['sex', [['', 'All sexes'], ['Female', 'Female'], ['Male', 'Male']]],
          ['ageBand', [['', 'All ages'], ['<40', '<40'], ['40-65', '40–65'], ['>65', '>65']]],
        ].map(([key, opts]) => (
          <select key={key} value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 shadow-sm">
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <select value={filters.performedById} onChange={(e) => setFilters((f) => ({ ...f, performedById: e.target.value }))}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-700 shadow-sm">
          <option value="">All clinicians</option>
          {(data.performers || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => setFilters({ period: 'all', sex: '', ageBand: '', performedById: '' })}
          className="text-[12.5px] text-slate-500 px-2">Clear</button>
        <div className="flex-1" />
        <button onClick={exportCohort} disabled={!corr?.exportRows?.length} title="De-identified per-patient rows (no name/UHID)"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-cyan-700 shadow-sm disabled:opacity-40">
          <Download className="w-3.5 h-3.5" /> Export cohort (CSV)
        </button>
        <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-cyan-700 shadow-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Patients screened" value={t.patientsScreened} meta={`${t.repeatPatients} re-screened`} />
        <Kpi label="Studies signed" value={t.studiesCompleted} meta={firstMonth ? `since ${firstMonth}` : "completed studies only"} />
        <Kpi label="DPN prevalence" value={t.dpnPrevalencePct ?? '—'} unit="%" meta="any grade, among screened" accent />
        <Kpi label="Median VPT" value={t.medianWorstVpt ?? '—'} unit=" V" meta="worst foot per patient" />
        <Kpi label="Abnormal VPT" value={vptAbnormalPct ?? '—'} unit="%" meta="any grade, worse foot" />
        <Kpi label="Repeat patients" value={t.repeatPatients} meta="have ≥2 studies" />
      </div>

      {/* 1. PREVALENCE & SEVERITY */}
      <div className="flex items-center gap-3 pt-1">
        <span className="grid place-items-center w-5 h-5 rounded-md bg-cyan-50 text-cyan-700 text-[11px] font-bold">1</span>
        <h2 className="text-[15px] font-bold text-slate-800">Prevalence &amp; severity</h2>
        <span className="text-[12px] text-slate-400">per patient · latest study each · {prevTotal} patients</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Panel title="Overall DPN severity" cap="Worst modality/foot grade per patient (the signed Final Result)" className="lg:col-span-3">
          <div className="flex h-9 rounded-lg overflow-hidden mt-4 gap-0.5" role="img" aria-label="Severity distribution">
            {GRADES.map((g) => {
              const v = data.prevalence[g] || 0; const pct = prevTotal ? Math.round((v / prevTotal) * 100) : 0;
              return v ? <div key={g} className="grid place-items-center text-white text-[12px] font-bold" style={{ flexGrow: v, background: GRADE_COLOR[g] }}><span className="drop-shadow">{pct}%</span></div> : null;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[11.5px] text-slate-600">
            {GRADES.map((g) => <span key={g} className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: GRADE_COLOR[g] }} />{OVERALL_LABEL[g]} · {data.prevalence[g] || 0}</span>)}
          </div>
          {data.prevalence.ungraded > 0 && <p className="text-[11px] text-slate-400 mt-2">{data.prevalence.ungraded} completed study(ies) had no gradable numeric reading.</p>}
        </Panel>

        <Panel title="Laterality" cap="Mean VPT & abnormal rate by foot" className="lg:col-span-2">
          <div className="mt-3 space-y-2.5">
            {[['R', 'Right'], ['L', 'Left']].map(([f, lbl]) => {
              const d = data.laterality[f] || {};
              return (
                <div key={f} className="grid grid-cols-[70px_1fr_46px] items-center gap-3 text-[12.5px]">
                  <span className="font-semibold text-slate-600">{lbl} foot</span>
                  <div className="h-4 rounded-md bg-slate-50 border border-slate-200 overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${Math.min((d.meanVpt || 0) / 50 * 100, 100)}%`, background: GRADE_SPOT.Moderate.ring }} />
                  </div>
                  <span className="text-right font-bold text-slate-800 tabular-nums">{d.meanVpt ?? '—'} V</span>
                </div>
              );
            })}
            <div className="pt-1 text-[11.5px] text-slate-500">
              Abnormal VPT: R {data.laterality.R?.abnormalPct ?? '—'}% · L {data.laterality.L?.abnormalPct ?? '—'}%
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Severity by modality" cap="Which sense fails first — patients by grade (worse foot)">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={modalityData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="modality" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
              {GRADES.map((g) => <Bar key={g} dataKey={g} name={OVERALL_LABEL[g]} stackId="a" fill={GRADE_COLOR[g]} radius={g === 'Severe' ? [3, 3, 0, 0] : 0} maxBarSize={46} />)}
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center justify-between text-[12px] text-slate-600 border-t border-dashed border-slate-200 pt-2.5">
            <span className="font-semibold">Monofilament (10 g)</span>
            <span>{mono.felt} felt · <span className="font-bold text-red-600">{mono.notFelt} not felt</span>{monoTotal ? ` (${Math.round(mono.notFelt / monoTotal * 100)}% insensate)` : ''}</span>
          </div>
        </Panel>

        <Panel title="Plantar-site burden" cap="Mean VPT (V) per site across latest studies — the report's own foot map">
          {heatReadings
            ? <div className="mt-1"><NeuropathyFootMap readings={heatReadings} modality="VPT" variant="bullet" readOnly showLabels /></div>
            : <p className="text-slate-400 text-sm text-center py-10">No VPT readings yet.</p>}
          <div className="flex flex-wrap gap-3 mt-2 justify-center text-[11.5px] text-slate-600">
            {[['≤15', 'Normal'], ['16–20', 'Mild'], ['21–25', 'Moderate'], ['≥26', 'Severe']].map(([r, g]) =>
              <span key={g} className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: GRADE_COLOR[g] }} />{r} V</span>)}
          </div>
        </Panel>
      </div>

      {/* 2. THROUGHPUT & ACCRUAL */}
      <div className="flex items-center gap-3 pt-1">
        <span className="grid place-items-center w-5 h-5 rounded-md bg-cyan-50 text-cyan-700 text-[11px] font-bold">2</span>
        <h2 className="text-[15px] font-bold text-slate-800">Screening coverage &amp; accrual</h2>
        <span className="text-[12px] text-slate-400">coverage of the diabetic population · per-study accrual</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {coverage && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Coverage of the diabetic population" cap={`Screened vs ${coverage.registeredActive} active registered patients`}>
            <div className="flex items-center gap-5 mt-2">
              <Donut pct={coverage.coveragePct ?? 0} />
              <div className="flex-1 space-y-1.5 text-[12.5px]">
                {[['Screened', coverage.screenedActive, 'text-cyan-700'], ['Not yet screened', coverage.notScreened, 'text-slate-500'], ['Registered (active)', coverage.registeredActive, 'text-slate-800']].map(([l, v, c]) => (
                  <div key={l} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-600">{l}</span><span className={`font-bold tabular-nums ${c}`}>{v}</span>
                  </div>
                ))}
                {coverage.screenedEver !== coverage.screenedActive && (
                  <p className="text-[11px] text-slate-400 pt-0.5">{coverage.screenedEver} screened in total, incl. since-inactive patients.</p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 border-t border-dashed border-slate-200 pt-2">Denominator = active registered patients (this is a diabetes centre); the free-text diagnosis field isn't filtered.</p>
          </Panel>

          <Panel title="Coverage by subgroup" cap="Where screening is lagging">
            <div className="mt-1 space-y-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">By age</div>
                {coverage.byAge.map((r) => <CoverageRow key={r.ageBand} label={r.ageBand} pct={r.pct} screened={r.screened} total={r.total} />)}
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">By sex</div>
                {coverage.bySex.map((r) => <CoverageRow key={r.sex} label={r.sex} pct={r.pct} screened={r.screened} total={r.total} />)}
              </div>
            </div>
          </Panel>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Cumulative recruitment" cap="Distinct patients ever screened, by month first screened">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.throughput} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <defs><linearGradient id="accr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} /><stop offset="100%" stopColor="#0891b2" stopOpacity={0.03} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="cumulativePatients" name="Patients (cumulative)" stroke="#0e7490" strokeWidth={2.5} fill="url(#accr)" />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Studies signed per month" cap="Completed studies only — drafts and cancellations are never counted">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.throughput} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="completed" name="Completed" fill="#0e7490" radius={[3, 3, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* 3. RISK CORRELATION */}
      <div className="flex items-center gap-3 pt-1">
        <span className="grid place-items-center w-5 h-5 rounded-md bg-cyan-50 text-cyan-700 text-[11px] font-bold">3</span>
        <h2 className="text-[15px] font-bold text-slate-800">Risk correlation</h2>
        <span className="text-[12px] text-slate-400">any-grade DPN prevalence by risk factor · each panel shows its own n</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {corr ? (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <RiskFactorPanel title="By HbA1c" cap="Latest HbA1c per patient vs any-grade DPN" factor={corr.hba1c} denom={corr.patientsWithGradedStudy} />
            <RiskFactorPanel title="By diabetes duration" cap="Years from recorded diagnosis date" factor={corr.duration} denom={corr.patientsWithGradedStudy} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <RiskFactorPanel title="By age band" cap="Prevalence vs age" factor={corr.age} denom={corr.patientsWithGradedStudy} />
            <RiskFactorPanel title="By sex" cap="Prevalence & cohort split" factor={corr.sex} denom={corr.patientsWithGradedStudy} />
          </div>
        </>
      ) : <div className="text-slate-400 text-sm text-center py-6">Loading risk correlation…</div>}

      {/* 4. LONGITUDINAL PROGRESSION */}
      <div className="flex items-center gap-3 pt-1">
        <span className="grid place-items-center w-5 h-5 rounded-md bg-cyan-50 text-cyan-700 text-[11px] font-bold">4</span>
        <h2 className="text-[15px] font-bold text-slate-800">Longitudinal progression</h2>
        <span className="text-[12px] text-slate-400">patients re-screened over time · sparse until follow-ups accrue</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {longi && longi.reScreened > 0 ? (
        <div className="grid lg:grid-cols-5 gap-4">
          <Panel title="Worst-foot VPT trajectory" cap={`Each line is one re-screened patient (n=${longi.reScreened})`} className="lg:col-span-3">
            <Trajectory trajectories={longi.trajectories} maxVisits={longi.maxVisits} />
            <div className="flex flex-wrap gap-3 mt-2 text-[11.5px] text-slate-600">
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: DIR_COLOR.worsened }} />Worsening</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: DIR_COLOR.stable }} />Stable</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: DIR_COLOR.improved }} />Improved</span>
            </div>
          </Panel>
          <Panel title="Change between visits" cap="Overall grade, latest vs previous" className="lg:col-span-2">
            <div className="grid grid-cols-3 gap-2.5 mt-1">
              <Oc kind="worse" n={longi.outcomes.worsened} label="Worsened" />
              <Oc kind="stable" n={longi.outcomes.stable} label="Stable" />
              <Oc kind="better" n={longi.outcomes.improved} label="Improved" />
            </div>
            <div className="mt-4 text-[12.5px] text-slate-600 space-y-1.5">
              <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>New / worsening</span><span className="font-bold tabular-nums">{longi.newOrWorseningPct}% ({longi.outcomes.worsened}/{longi.reScreened})</span></div>
              <div className="flex justify-between"><span>Median interval</span><span className="font-bold tabular-nums">{longi.medianIntervalMonths ?? '—'} mo</span></div>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 text-center text-slate-500 text-sm">
          No patients have a second study yet — this view fills in as patients are re-screened.
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
        <Info className="w-3.5 h-3.5" /> Counts collapse merged duplicate records and exclude deactivated patients throughout.
      </p>
    </div>
  );
};

export default NeuropathyAnalytics;
