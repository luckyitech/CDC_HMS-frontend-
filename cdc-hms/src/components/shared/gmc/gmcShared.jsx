import { Utensils, Activity, Syringe, Pill, AlertCircle, StickyNote } from 'lucide-react';

// =====================================================================
// gmcShared — the pieces every Glucose Management Centre tab shares.
//
// One home for the colours, the unit maths, the reading→meal-slot mapping and
// the small presentational atoms, so the four tabs (Daily graph, Sugar chart,
// Indices, Logbook) stay DRY and can never disagree on how a reading is
// classified or coloured. The clinical numbers themselves are all computed
// SERVER-SIDE (constants/glucose.js via /glucose/summary); nothing here
// recomputes a metric — it only formats and lays out what the server sent.
// =====================================================================

export const MMOL = 18;

export const WINDOWS = [
  { id: '7', label: '7 days', days: 7 }, { id: '14', label: '14 days', days: 14 },
  { id: '30', label: '30 days', days: 30 }, { id: '90', label: '90 days', days: 90 },
];
export const UNITS = [{ id: 'mmol', label: 'mmol/L' }, { id: 'mgdl', label: 'mg/dL' }];

// Source colour follows provenance, never the value — a clinician trusts a
// number differently depending on where it came from.
export const SOURCE_META = {
  meter:   { label: 'Home meter', color: '#0066CC', shape: 'circle' },
  logbook: { label: 'Logbook',    color: '#0D9488', shape: 'square' },
  clinic:  { label: 'Clinic',     color: '#9333EA', shape: 'diamond' },
};

// Glucose-state colours — reserved for the TIR bar / grid cells, never a series.
export const BAND = { veryLow: '#b91c1c', low: '#ef4444', inRange: '#16a34a', high: '#f59e0b', veryHigh: '#c2410c' };
export const BAND_BG = { veryLow: '#fee2e2', low: '#fee2e2', inRange: '#dcfce7', high: '#fef3c7', veryHigh: '#ffedd5' };

// The diary event types — ONE source of the id, label, colour and icon, used
// by the diary entry form, the chart overlay, the logbook feed and the tooltip.
export const DIARY_TYPES = [
  { id: 'meal',     label: 'Meal',     color: '#0891b2', Icon: Utensils },
  { id: 'activity', label: 'Activity', color: '#16a34a', Icon: Activity },
  { id: 'insulin',  label: 'Insulin',  color: '#7c3aed', Icon: Syringe },
  { id: 'oral_med', label: 'Oral med', color: '#d97706', Icon: Pill },
  { id: 'symptom',  label: 'Symptom',  color: '#dc2626', Icon: AlertCircle },
  { id: 'note',     label: 'Note',     color: '#6b7280', Icon: StickyNote },
];
export const DIARY_META = Object.fromEntries(DIARY_TYPES.map((t) => [t.id, t]));

// The type-specific extras of a diary event, as display bits (carbs / minutes /
// units / drug / severity). One formatter for the panel, the logbook and the
// chart tooltip so they never drift.
export const diaryDetailBits = (ev) => {
  const d = (ev && ev.detail) || {};
  return [
    d.carbs != null ? `${d.carbs} g carbs` : null,
    d.minutes != null ? `${d.minutes} min` : null,
    d.units != null ? `${d.units} units` : null,
    d.drug || null,
    d.severity || null,
  ].filter(Boolean);
};

// The seven clinic logbook slots — the columns of the Sugar chart grid, and
// the order readings read left-to-right across a day.
export const TIME_COLUMNS = [
  { key: 'fasting',        label: 'Fasting',    sub: 'pre-breakfast' },
  { key: 'afterBreakfast', label: 'Breakfast',  sub: 'post' },
  { key: 'beforeLunch',    label: 'Lunch',      sub: 'pre' },
  { key: 'afterLunch',     label: 'Lunch',      sub: 'post' },
  { key: 'beforeDinner',   label: 'Dinner',     sub: 'pre' },
  { key: 'afterDinner',    label: 'Dinner',     sub: 'post' },
  { key: 'bedtime',        label: 'Bedtime',    sub: 'night' },
];

// ---- unit maths ----------------------------------------------------------
export const makeVal = (unit) => (mgdl) =>
  (mgdl === null || mgdl === undefined ? null : unit === 'mmol' ? Math.round((mgdl / MMOL) * 10) / 10 : Math.round(mgdl));

export const unitLabelFor = (unit) => (unit === 'mmol' ? 'mmol/L' : 'mg/dL');

// Which glucose band a mg/dL value sits in, against the effective targets.
export const bandOf = (mgdl, t) => {
  if (mgdl === null || mgdl === undefined) return null;
  if (mgdl < t.tbrLevel2Mgdl) return 'veryLow';
  if (mgdl < t.tirLowMgdl) return 'low';
  if (mgdl <= t.tirHighMgdl) return 'inRange';
  if (mgdl <= t.tarLevel2Mgdl) return 'high';
  return 'veryHigh';
};

// ---- reading → grid column ----------------------------------------------
const clockColumn = (h) => {
  if (h < 5) return 'bedtime';        // overnight → night / bedtime column
  if (h < 9) return 'fasting';
  if (h < 12) return 'afterBreakfast';
  if (h < 13) return 'beforeLunch';
  if (h < 15) return 'afterLunch';
  if (h < 18) return 'beforeDinner';
  if (h < 20) return 'afterDinner';
  return 'bedtime';
};

// Map a summary reading to one of the seven columns: a matched meal tag or a
// manual logbook slot wins; otherwise fall back to the clock hour.
export const columnForReading = (r) => {
  const tag = String(r.tag || '').toLowerCase();
  if (/^pre-/.test(tag)) {
    if (tag.includes('breakfast')) return 'fasting';
    if (tag.includes('lunch')) return 'beforeLunch';
    if (tag.includes('dinner')) return 'beforeDinner';
  }
  if (/^post-/.test(tag)) {
    if (tag.includes('breakfast')) return 'afterBreakfast';
    if (tag.includes('lunch')) return 'afterLunch';
    if (tag.includes('dinner')) return 'afterDinner';
  }
  const slotMap = {
    fasting: 'fasting', breakfast: 'afterBreakfast', beforelunch: 'beforeLunch',
    afterlunch: 'afterLunch', beforedinner: 'beforeDinner', afterdinner: 'afterDinner', bedtime: 'bedtime',
  };
  if (slotMap[tag]) return slotMap[tag];
  const hh = Number(String(r.at).slice(11, 13));
  return Number.isNaN(hh) ? 'bedtime' : clockColumn(hh);
};

// ---- formatters ----------------------------------------------------------
export const fmtDelta = (s) => { const a = Math.abs(s); const h = Math.floor(a / 3600), m = Math.round((a % 3600) / 60); return `${h ? `${h} h ` : ''}${m} min ${s > 0 ? 'behind' : 'ahead'}`; };
export const fmtWhen = (naive) => { if (!naive) return '—'; const [d, t] = naive.split(' '); const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)} ${t.slice(0, 5)}`; };
export const fmtTime = (naive) => (naive ? (naive.split(' ')[1] || '').slice(0, 5) : '');
export const dayLabel = (naive) => { const [, m, d] = naive.slice(0, 10).split('-'); return `${Number(d)}/${Number(m)}`; };
export const dayHeading = (naive) => {
  const [y, m, d] = naive.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

// ---- small presentational atoms -----------------------------------------
export const SourceSwatch = ({ source }) => {
  const meta = SOURCE_META[source] || SOURCE_META.meter;
  const style = { background: meta.color, width: 10, height: 10, display: 'inline-block', flexShrink: 0 };
  if (meta.shape === 'circle') style.borderRadius = '50%';
  if (meta.shape === 'diamond') style.transform = 'rotate(45deg)';
  return <i style={style} />;
};

export const Chip = ({ tone, children }) => (
  <span className={`inline-block mr-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold no-underline ${tone === 'warn' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{children}</span>
);

export const Metric = ({ className = '', label, big, note, children }) => (
  <div className={`p-3 rounded-xl bg-gray-50 border border-gray-200 min-w-0 ${className}`}>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
    {big !== undefined && <p className="text-2xl font-extrabold text-gray-800 leading-none">{big}</p>}
    {children}
    {note && <p className="text-[11px] text-gray-500 mt-1.5">{note}</p>}
  </div>
);

export const ChartCard = ({ title, caption, action, className = '', children }) => (
  <div className={`p-4 rounded-xl border border-gray-200 bg-white mb-3 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-2">
      <div><h4 className="font-bold text-gray-800 text-sm">{title}</h4>{caption && <p className="text-xs text-gray-500">{caption}</p>}</div>
      {action}
    </div>
    {children}
  </div>
);

export const Empty = ({ text }) => <div className="py-8 text-center text-sm text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">{text}</div>;

// Scatter point: shape by source, a red ring for a hypo, a strike for excluded.
export const PointShape = ({ cx, cy, payload, fill, lowMgdl }) => {
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

// A diary event on a chart: a small upward triangle at the baseline, coloured
// by type. Details live in the tooltip and the logbook.
export const DiaryShape = ({ cx, cy, payload }) => {
  if (cx === undefined || cy === undefined) return null;
  const color = DIARY_META[payload.diaryType]?.color || DIARY_META.note.color;
  return <path d={`M ${cx} ${cy - 7} L ${cx - 5} ${cy + 2} L ${cx + 5} ${cy + 2} Z`} fill={color} stroke="#fff" strokeWidth={1} />;
};

export const PointTip = ({ active, payload, unitLabel }) => {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  if (p.diary) {
    const meta = DIARY_META[p.diaryType] || DIARY_META.note;
    const bits = [p.label, ...diaryDetailBits({ detail: p.detail })].filter(Boolean);
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

export const TwoLineTick = ({ x, y, payload }) => {
  const [a, b] = String(payload.value).split('\n');
  return <g transform={`translate(${x},${y})`}><text textAnchor="middle" fontSize={11} fill="#374151" fontWeight={600} dy={10}>{a}</text><text textAnchor="middle" fontSize={10} fill="#6b7280" dy={24}>{b}</text></g>;
};
