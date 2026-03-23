import { getBpColor, getTemperatureColor, getO2Color, getRbsColor, getHba1cColor, getKetonesColor } from '../../utils/clinicalColors';

const VitalCard = ({ label, value, colorClass, textClass, cardLabel }) => (
  <div className={`${colorClass} p-4 rounded-lg text-center`}>
    <p className="text-xs text-gray-600 uppercase">{label}</p>
    <p className={`text-lg font-bold ${textClass} mt-1`}>{value || 'N/A'}</p>
    {cardLabel && <p className="text-xs text-gray-500 mt-1">{cardLabel}</p>}
  </div>
);

const VitalsGrid = ({ vitals }) => {
  if (!vitals) return <p className="text-sm text-gray-500">No vitals recorded yet</p>;

  // Blood Pressure
  const bpC = getBpColor(vitals.bp) || { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: null };

  // Temperature
  const tempC = getTemperatureColor(vitals.temperature) || { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: null };

  // O2 Saturation
  const o2C = getO2Color(vitals.oxygenSaturation) || { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: null };

  // BMI
  const bmiVal = parseFloat(vitals.bmi);
  const bmiC = isNaN(bmiVal)  ? { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: null          }
    : bmiVal < 18.5           ? { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Underweight'  }
    : bmiVal < 25             ? { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: 'Normal'       }
    : bmiVal < 30             ? { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Overweight'   }
    :                           { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    label: 'Obese'        };

  // Waist-to-Height Ratio
  const whr = parseFloat(vitals.waistHeightRatio);
  const whrC = whr < 0.5 ? { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: 'Healthy'   }
    : whr < 0.6           ? { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Inc. Risk' }
    :                       { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    label: 'High Risk' };

  // RBS
  const rbsC = getRbsColor(vitals.rbs) || { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: null };

  // HbA1c
  const hba1cC = getHba1cColor(vitals.hba1c) || { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: null };

  // Ketones
  const ketonesC = getKetonesColor(vitals.ketones) || { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: null };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Blood Pressure */}
      <VitalCard
        label="Blood Pressure"
        value={vitals.bp}
        colorClass={`${bpC.bg} border-2 ${bpC.border}`}
        textClass={bpC.text}
        cardLabel={bpC.label}
      />

      {/* Heart Rate — no clinical range */}
      <VitalCard
        label="Heart Rate"
        value={vitals.heartRate}
        colorClass="bg-slate-50 border-2 border-slate-200"
        textClass="text-slate-700"
      />

      {/* Temperature */}
      <VitalCard
        label="Temperature"
        value={vitals.temperature}
        colorClass={`${tempC.bg} border-2 ${tempC.border}`}
        textClass={tempC.text}
        cardLabel={tempC.label}
      />

      {/* O2 Saturation */}
      <VitalCard
        label="O2 Saturation"
        value={vitals.oxygenSaturation}
        colorClass={`${o2C.bg} border-2 ${o2C.border}`}
        textClass={o2C.text}
        cardLabel={o2C.label}
      />

      {/* Weight */}
      <VitalCard
        label="Weight"
        value={vitals.weight}
        colorClass="bg-slate-50 border-2 border-slate-200"
        textClass="text-slate-700"
      />

      {/* Height */}
      <VitalCard
        label="Height"
        value={vitals.height}
        colorClass="bg-slate-50 border-2 border-slate-200"
        textClass="text-slate-700"
      />

      {/* BMI */}
      <VitalCard
        label="BMI"
        value={vitals.bmi}
        colorClass={`${bmiC.bg} border-2 ${bmiC.border}`}
        textClass={bmiC.text}
        cardLabel={bmiC.label}
      />

      {/* Waist Circumference */}
      {vitals.waistCircumference && (
        <VitalCard
          label="Waist Circ."
          value={vitals.waistCircumference}
          colorClass="bg-slate-50 border-2 border-slate-200"
          textClass="text-slate-700"
        />
      )}

      {/* Waist-to-Height Ratio */}
      {vitals.waistHeightRatio && (
        <VitalCard
          label="Waist/Height"
          value={vitals.waistHeightRatio}
          colorClass={`${whrC.bg} border-2 ${whrC.border}`}
          textClass={whrC.text}
          cardLabel={whrC.label}
        />
      )}

      {/* RBS */}
      {vitals.rbs && (
        <VitalCard
          label="RBS"
          value={vitals.rbs}
          colorClass={`${rbsC.bg} border-2 ${rbsC.border}`}
          textClass={rbsC.text}
          cardLabel={rbsC.label}
        />
      )}

      {/* HbA1c */}
      {vitals.hba1c && (
        <VitalCard
          label="HbA1c"
          value={vitals.hba1c}
          colorClass={`${hba1cC.bg} border-2 ${hba1cC.border}`}
          textClass={hba1cC.text}
          cardLabel={hba1cC.label}
        />
      )}

      {/* Ketones */}
      {vitals.ketones && (
        <VitalCard
          label="Ketones"
          value={vitals.ketones}
          colorClass={`${ketonesC.bg} border-2 ${ketonesC.border}`}
          textClass={ketonesC.text}
          cardLabel={ketonesC.label}
        />
      )}
    </div>
  );
};

export default VitalsGrid;
