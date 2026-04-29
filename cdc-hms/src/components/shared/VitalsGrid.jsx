import { useState } from 'react';
import { TrendingUp, X } from 'lucide-react';
import { getBpColor, getTemperatureColor, getO2Color, getRbsColor, getHba1cColor, getKetonesColor } from '../../utils/clinicalColors';
import patientService from '../../services/patientService';
import Modal from './Modal';

// ── Vital group definitions ───────────────────────────────────────────────────
// Each entry maps a clickable card group to its modal title and table columns.
// To add a new vital trend table: add an entry here — no other changes needed.
const VITAL_GROUPS = {
  bp: {
    label: 'Blood Pressure History',
    columns: [
      { key: 'bp',         header: 'Blood Pressure' },
    ],
  },
  heartRate: {
    label: 'Heart Rate History',
    columns: [
      { key: 'heartRate',  header: 'Heart Rate' },
    ],
  },
  bodyMeasurements: {
    label: 'Weight · Height · BMI History',
    columns: [
      { key: 'weight',     header: 'Weight'  },
      { key: 'height',     header: 'Height'  },
      { key: 'bmi',        header: 'BMI'     },
    ],
  },
  temperature: {
    label: 'Temperature History',
    columns: [
      { key: 'temperature', header: 'Temperature' },
    ],
  },
  oxygenSaturation: {
    label: 'O₂ Saturation History',
    columns: [
      { key: 'oxygenSaturation', header: 'O₂ Saturation' },
    ],
  },
  rbs: {
    label: 'Random Blood Sugar History',
    columns: [
      { key: 'rbs',        header: 'RBS' },
    ],
  },
  hba1c: {
    label: 'HbA1c History',
    columns: [
      { key: 'hba1c',      header: 'HbA1c' },
    ],
  },
  ketones: {
    label: 'Ketones History',
    columns: [
      { key: 'ketones',    header: 'Ketones' },
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
    {onClick && <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> View trend</p>}
  </div>
);

// ── VitalsTrendModal ──────────────────────────────────────────────────────────
const VitalsTrendModal = ({ group, history, loading, onClose }) => {
  const config = VITAL_GROUPS[group];

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={config.label}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No records found for this vital.</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Date & Time</th>
                {config.columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((record, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(record.recordedAt)}</td>
                  {config.columns.map(col => (
                    <td key={col.key} className="px-4 py-3 font-semibold text-gray-800">
                      {record[col.key] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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

  // Only make cards clickable when a patient uhid is available
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
