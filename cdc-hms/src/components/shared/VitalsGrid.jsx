import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  getBpColor, getTemperatureColor, getO2Color, getRbsColor,
  getHba1cColor, getKetonesColor, getBmiColor, getHeartRateColor,
} from '../../utils/clinicalColors';
import patientService from '../../services/patientService';
import Modal from './Modal';

// ── Vital group definitions ───────────────────────────────────────────────────
// Each entry maps a clickable card group to its modal title and table columns.
// colorFn (optional): receives the raw cell value and returns { text, bg, label }
// To add a new vital trend table: add one entry here — no other changes needed.
const VITAL_GROUPS = {
  bp: {
    label: 'Blood Pressure History',
    columns: [
      { key: 'bp', header: 'Blood Pressure', colorFn: getBpColor },
    ],
  },
  heartRate: {
    label: 'Heart Rate History',
    columns: [
      { key: 'heartRate', header: 'Heart Rate', colorFn: getHeartRateColor },
    ],
  },
  bodyMeasurements: {
    label: 'Weight · Height · BMI History',
    columns: [
      { key: 'weight', header: 'Weight'  },
      { key: 'height', header: 'Height'  },
      { key: 'bmi',    header: 'BMI', colorFn: getBmiColor },
    ],
  },
  temperature: {
    label: 'Temperature History',
    columns: [
      { key: 'temperature', header: 'Temperature', colorFn: getTemperatureColor },
    ],
  },
  oxygenSaturation: {
    label: 'O₂ Saturation History',
    columns: [
      { key: 'oxygenSaturation', header: 'O₂ Saturation', colorFn: getO2Color },
    ],
  },
  rbs: {
    label: 'Random Blood Sugar History',
    columns: [
      { key: 'rbs', header: 'RBS', colorFn: getRbsColor },
    ],
  },
  hba1c: {
    label: 'HbA1c History',
    columns: [
      { key: 'hba1c', header: 'HbA1c', colorFn: getHba1cColor },
    ],
  },
  ketones: {
    label: 'Ketones History',
    columns: [
      { key: 'ketones', header: 'Ketones', colorFn: getKetonesColor },
    ],
  },
};

// ── VitalCard ─────────────────────────────────────────────────────────────────
const VitalCard = ({ label, value, colorClass, textClass, cardLabel, onClick }) => (
  <div
    onClick={onClick}
    className={`${colorClass} px-2.5 py-2 rounded-md text-center ${onClick ? 'cursor-pointer hover:opacity-80 hover:shadow-sm transition-all' : ''}`}
  >
    <p className="text-[10px] text-gray-600 uppercase tracking-wide leading-tight truncate">{label}</p>
    <p className={`text-sm font-bold ${textClass} mt-0.5 leading-none`}>{value || 'N/A'}</p>
    {cardLabel && <p className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">{cardLabel}</p>}
    {onClick && (
      <p className="text-[9px] text-gray-400 mt-0.5 flex items-center justify-center gap-0.5">
        <TrendingUp className="w-2.5 h-2.5" /> Trend
      </p>
    )}
  </div>
);

// ── StatusBadge — colored pill shown in the table cells ──────────────────────
const StatusBadge = ({ colorFn, value }) => {
  if (!colorFn || !value) return null;
  const c = colorFn(value);
  if (!c?.label) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
};

// ── ColorLegend — shown only when at least one column has a colorFn ───────────
const COLOR_LEGEND = [
  { dot: 'bg-green-500',  label: 'Normal'     },
  { dot: 'bg-yellow-500', label: 'Borderline / Elevated' },
  { dot: 'bg-red-500',    label: 'Alert / High Risk'     },
];

// ── VitalsTrendModal ──────────────────────────────────────────────────────────
const VitalsTrendModal = ({ group, history, loading, onClose }) => {
  const config = VITAL_GROUPS[group];
  const hasColorCoding = config.columns.some(col => col.colorFn);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  // Latest record values for the summary strip
  const latest = history[0] ?? null;

  return (
    <Modal isOpen onClose={onClose} title={
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <span>{config.label}</span>
      </div>
    } size="lg">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500">Loading records...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">No records found</p>
          <p className="text-sm mt-1">No history has been recorded for this vital yet.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Summary strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Records</p>
                <p className="text-xl font-bold text-gray-800">{history.length}</p>
              </div>
              {latest && config.columns.map(col => latest[col.key] ? (
                <div key={col.key}>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Latest {col.header}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xl font-bold text-gray-800">{latest[col.key]}</p>
                    <StatusBadge colorFn={col.colorFn} value={latest[col.key]} />
                  </div>
                </div>
              ) : null)}
            </div>
            <p className="text-xs text-gray-400">Sorted newest first</p>
          </div>

          {/* Color legend — only shown when color coding applies */}
          {hasColorCoding && (
            <div className="flex flex-wrap gap-3 px-1">
              {COLOR_LEGEND.map(({ dot, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                    Date & Time
                  </th>
                  {config.columns.map(col => (
                    <th key={col.key} className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((record, i) => (
                  <tr key={i} className={`border-b border-gray-100 transition-colors hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                      {formatDate(record.recordedAt)}
                    </td>
                    {config.columns.map(col => (
                      <td key={col.key} className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{record[col.key] || '—'}</span>
                          <StatusBadge colorFn={col.colorFn} value={record[col.key]} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </Modal>
  );
};

// ── DenseCell — compact label–value row (variant="dense") ─────────────────────
// Status is carried by the tint alone; clicking still opens the trend modal.
const DenseCell = ({ label, value, colorClass, textClass, onClick }) => (
  <div
    onClick={onClick}
    className={`${colorClass} flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg ${
      onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
    }`}
  >
    <span className="text-[11px] text-gray-600 truncate">{label}</span>
    <b className={`text-xs font-semibold whitespace-nowrap ${textClass}`}>{value || '—'}</b>
  </div>
);

// ── VitalsGrid ────────────────────────────────────────────────────────────────
// gridClass: override the grid columns/gap for constrained containers.
// variant:   'cards' (default — the colored vital cards) or 'dense'
//            (label–value rows, tint-only status; used by the summary panel).
const VitalsGrid = ({
  vitals,
  patient,
  gridClass = 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2',
  variant = 'cards',
}) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [history, setHistory]             = useState([]);
  const [loading, setLoading]             = useState(false);

  const openTrend = async (group) => {
    if (!patient?.uhid) return;
    setSelectedGroup(group);
    setLoading(true);
    setHistory([]);
    try {
      const res = await patientService.getVitalsHistory(patient.uhid);
      setHistory(Array.isArray(res.data) ? res.data : res.data?.vitals ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const closeTrend = () => setSelectedGroup(null);

  const clickable = !!patient?.uhid;

  if (!vitals) return <p className="text-sm text-gray-500">No vitals recorded yet</p>;

  // ── Clinical colour helpers ───────────────────────────────────────────────
  const bpC      = getBpColor(vitals.bp)                   || { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   label: null };
  const tempC    = getTemperatureColor(vitals.temperature) || { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: null };
  const o2C      = getO2Color(vitals.oxygenSaturation)     || { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: null };
  const rbsC     = getRbsColor(vitals.rbs)                 || { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: null };
  const hba1cC   = getHba1cColor(vitals.hba1c)             || { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: null };
  const ketonesC = getKetonesColor(vitals.ketones)         || { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: null };

  const bmiVal = parseFloat(vitals.bmi);
  const bmiC = isNaN(bmiVal)  ? { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: null         }
    : bmiVal < 18.5           ? { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Underweight' }
    : bmiVal < 25             ? { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: 'Normal'      }
    : bmiVal < 30             ? { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Overweight'  }
    :                           { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    label: 'Obese'       };

  const whr  = parseFloat(vitals.waistHeightRatio);
  const whrC = whr < 0.5 ? { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: 'Healthy'   }
    : whr < 0.6           ? { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Inc. Risk' }
    :                       { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    label: 'High Risk' };

  // One data source for both variants — label (cards), short label (dense),
  // value, colours, optional trend group. show:false rows are skipped.
  const slate = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', label: null };
  const items = [
    { label: 'Blood Pressure', short: 'BP',      value: vitals.bp,                c: bpC,      group: 'bp' },
    { label: 'Heart Rate',     short: 'HR',      value: vitals.heartRate,         c: slate,    group: 'heartRate' },
    { label: 'Temperature',    short: 'Temp',    value: vitals.temperature,       c: tempC,    group: 'temperature' },
    { label: 'O2 Saturation',  short: 'O₂',      value: vitals.oxygenSaturation,  c: o2C,      group: 'oxygenSaturation' },
    // Weight / Height / BMI — grouped: clicking any opens the same table
    { label: 'Weight',         short: 'Weight',  value: vitals.weight,            c: slate,    group: 'bodyMeasurements' },
    { label: 'Height',         short: 'Height',  value: vitals.height,            c: slate,    group: 'bodyMeasurements' },
    { label: 'BMI',            short: 'BMI',     value: vitals.bmi,               c: bmiC,     group: 'bodyMeasurements' },
    { label: 'Waist Circ.',    short: 'Waist',   value: vitals.waistCircumference, c: slate,   group: null, show: !!vitals.waistCircumference },
    { label: 'Waist/Height',   short: 'W/H',     value: vitals.waistHeightRatio,  c: whrC,     group: null, show: !!vitals.waistHeightRatio },
    { label: 'RBS',            short: 'RBS',     value: vitals.rbs,               c: rbsC,     group: 'rbs',    show: !!vitals.rbs },
    { label: 'HbA1c',          short: 'HbA1c',   value: vitals.hba1c,             c: hba1cC,   group: 'hba1c',  show: !!vitals.hba1c },
    { label: 'Ketones',        short: 'Ketones', value: vitals.ketones,           c: ketonesC, group: 'ketones', show: !!vitals.ketones },
  ].filter((it) => it.show !== false);

  return (
    <>
      <div className={`grid ${gridClass}`}>
        {items.map((it) =>
          variant === 'dense' ? (
            <DenseCell
              key={it.label}
              label={it.short}
              value={it.value}
              colorClass={`${it.c.bg} border ${it.c.border}`}
              textClass={it.c.text}
              onClick={clickable && it.group ? () => openTrend(it.group) : undefined}
            />
          ) : (
            <VitalCard
              key={it.label}
              label={it.label}
              value={it.value}
              colorClass={`${it.c.bg} border-2 ${it.c.border}`}
              textClass={it.c.text}
              cardLabel={it.c.label}
              onClick={clickable && it.group ? () => openTrend(it.group) : undefined}
            />
          )
        )}
      </div>

      {selectedGroup && (
        <VitalsTrendModal
          group={selectedGroup}
          history={history}
          loading={loading}
          onClose={closeTrend}
        />
      )}
    </>
  );
};

export default VitalsGrid;
