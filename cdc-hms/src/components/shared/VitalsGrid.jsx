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
    className={`${colorClass} p-4 rounded-lg text-center ${onClick ? 'cursor-pointer hover:opacity-80 hover:shadow-md transition-all' : ''}`}
  >
    <p className="text-xs text-gray-600 uppercase">{label}</p>
    <p className={`text-lg font-bold ${textClass} mt-1`}>{value || 'N/A'}</p>
    {cardLabel && <p className="text-xs text-gray-500 mt-1">{cardLabel}</p>}
    {onClick && (
      <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-center gap-1">
        <TrendingUp className="w-3 h-3" /> View trend
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

// ── VitalsGrid ────────────────────────────────────────────────────────────────
const VitalsGrid = ({ vitals, patient }) => {
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

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

        <VitalCard label="Blood Pressure" value={vitals.bp}
          colorClass={`${bpC.bg} border-2 ${bpC.border}`} textClass={bpC.text} cardLabel={bpC.label}
          onClick={clickable ? () => openTrend('bp') : undefined} />

        <VitalCard label="Heart Rate" value={vitals.heartRate}
          colorClass="bg-slate-50 border-2 border-slate-200" textClass="text-slate-700"
          onClick={clickable ? () => openTrend('heartRate') : undefined} />

        <VitalCard label="Temperature" value={vitals.temperature}
          colorClass={`${tempC.bg} border-2 ${tempC.border}`} textClass={tempC.text} cardLabel={tempC.label}
          onClick={clickable ? () => openTrend('temperature') : undefined} />

        <VitalCard label="O2 Saturation" value={vitals.oxygenSaturation}
          colorClass={`${o2C.bg} border-2 ${o2C.border}`} textClass={o2C.text} cardLabel={o2C.label}
          onClick={clickable ? () => openTrend('oxygenSaturation') : undefined} />

        {/* Weight / Height / BMI — grouped: clicking any opens the same table */}
        <VitalCard label="Weight" value={vitals.weight}
          colorClass="bg-slate-50 border-2 border-slate-200" textClass="text-slate-700"
          onClick={clickable ? () => openTrend('bodyMeasurements') : undefined} />

        <VitalCard label="Height" value={vitals.height}
          colorClass="bg-slate-50 border-2 border-slate-200" textClass="text-slate-700"
          onClick={clickable ? () => openTrend('bodyMeasurements') : undefined} />

        <VitalCard label="BMI" value={vitals.bmi}
          colorClass={`${bmiC.bg} border-2 ${bmiC.border}`} textClass={bmiC.text} cardLabel={bmiC.label}
          onClick={clickable ? () => openTrend('bodyMeasurements') : undefined} />

        {vitals.waistCircumference && (
          <VitalCard label="Waist Circ." value={vitals.waistCircumference}
            colorClass="bg-slate-50 border-2 border-slate-200" textClass="text-slate-700" />
        )}

        {vitals.waistHeightRatio && (
          <VitalCard label="Waist/Height" value={vitals.waistHeightRatio}
            colorClass={`${whrC.bg} border-2 ${whrC.border}`} textClass={whrC.text} cardLabel={whrC.label} />
        )}

        {vitals.rbs && (
          <VitalCard label="RBS" value={vitals.rbs}
            colorClass={`${rbsC.bg} border-2 ${rbsC.border}`} textClass={rbsC.text} cardLabel={rbsC.label}
            onClick={clickable ? () => openTrend('rbs') : undefined} />
        )}

        {vitals.hba1c && (
          <VitalCard label="HbA1c" value={vitals.hba1c}
            colorClass={`${hba1cC.bg} border-2 ${hba1cC.border}`} textClass={hba1cC.text} cardLabel={hba1cC.label}
            onClick={clickable ? () => openTrend('hba1c') : undefined} />
        )}

        {vitals.ketones && (
          <VitalCard label="Ketones" value={vitals.ketones}
            colorClass={`${ketonesC.bg} border-2 ${ketonesC.border}`} textClass={ketonesC.text} cardLabel={ketonesC.label}
            onClick={clickable ? () => openTrend('ketones') : undefined} />
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
