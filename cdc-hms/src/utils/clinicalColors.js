/**
 * Clinical color coding utility
 * Returns Tailwind class objects: { bg, border, text }
 * Green = Normal, Yellow = Borderline/Elevated, Red = Alert
 */

const GREEN  = (label) => ({ bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  label: label || 'Normal'    });
const YELLOW = (label) => ({ bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: label || 'Borderline' });
const RED    = (label) => ({ bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    label: label || 'Alert'      });

/** Blood Pressure — accepts "120/80" or "120/80 mmHg" string */
export function getBpColor(bpString) {
  if (!bpString || bpString === 'N/A') return null;
  const [sys, dia] = bpString.split('/').map(s => parseFloat(s));
  if (isNaN(sys) || isNaN(dia)) return null;
  if (sys >= 140 || dia >= 90) return RED('Alert');
  if (sys >= 120)              return YELLOW('Elevated');
  return GREEN('Normal');
}

/** Random Blood Sugar (mmol/L) */
export function getRbsColor(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (v > 16)   return RED('Alert');
  if (v >= 7.8) return YELLOW('Borderline');
  return GREEN('Normal');
}

/** Fasting Blood Sugar (mmol/L) */
export function getFbsColor(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (v > 10)   return RED('Alert');
  if (v >= 6.1) return YELLOW('Borderline');
  return GREEN('Normal');
}

/** Ketones (mmol/L) — 0–1 Normal, >1 High */
export function getKetonesColor(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (v > 1) return RED('High');
  return GREEN('Normal');
}

/** Temperature (°C) — 36.5–37.5 Normal, 37.5–38.5 Elevated, >38.5 or <36.5 Alert */
export function getTemperatureColor(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (v > 38.5 || v < 36.5) return RED('Alert');
  if (v > 37.5)              return YELLOW('Elevated');
  return GREEN('Normal');
}

/** HbA1c (%) — <7 Normal, 7–8 Borderline, >8 Alert */
export function getHba1cColor(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (v > 8)  return RED('Alert');
  if (v >= 7) return YELLOW('Borderline');
  return GREEN('Normal');
}

/** O2 Saturation (%) — ≥95 Normal, 90–94 Borderline, <90 Alert */
export function getO2Color(value) {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (v < 90) return RED('Alert');
  if (v < 95) return YELLOW('Borderline');
  return GREEN('Normal');
}
