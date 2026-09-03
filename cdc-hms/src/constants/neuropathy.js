// Neuropathy Studio — frontend mirror of backend/constants/neuropathy.js.
//
// Used ONLY for live display in the exam (running average, provisional grade
// chip, band captions). The stored grade is always computed server-side on
// `complete` from the saved readings. Keep these values identical to the
// backend file; change them there first.

export const FEET = ['R', 'L'];
export const FOOT_LABELS = { R: 'Right', L: 'Left' };

// The clinic's plantar protocol: the full 6 vendor sites per foot.
export const PROTOCOL_SITES = ['greatToe', 'mth1', 'mth3', 'mth5', 'midfoot', 'heel'];

export const SITE_LABELS = {
  greatToe: 'Great toe',
  mth1:     'MTH 1',
  mth5:     'MTH 5',
  heel:     'Heel',
  mth3:     'MTH 3',
  midfoot:  'Mid-foot',
};
export const SITE_SHORT = { greatToe: 'GT', mth1: 'M1', mth3: 'M3', mth5: 'M5', midfoot: 'MF', heel: 'H' };

export const MODALITIES = ['VPT', 'COLD', 'HOT', 'MONO'];
export const MODALITY_META = {
  VPT:  { label: 'Vibration',    long: 'Vibration perception (VPT)', unit: 'V',  step: 1,   min: 0, max: 50, fromProbe: true,
          bands: 'Normal ≤15 · Mild 16–20 · Moderate 21–25 · Severe ≥26 V' },
  HOT:  { label: 'Hot',          long: 'Hot perception',              unit: '°C', step: 0.1, min: 0, max: 50, fromProbe: true,
          bands: 'Normal ≤42 · Mild 42.1–45 · Moderate 45.1–48 · Severe ≥48.1 °C' },
  COLD: { label: 'Cold',         long: 'Cold perception',             unit: '°C', step: 0.1, min: 0, max: 50, fromProbe: true,
          bands: 'Normal ≥20 · Mild 15–19.9 · Moderate 10–14.9 · Severe <10 °C' },
  MONO: { label: 'Monofilament', long: '10 g monofilament',           unit: '',   step: 1,   min: 0, max: 1,  fromProbe: false,
          bands: 'Tick the sites where the patient felt the filament; untick = not felt' },
};

export const GRADES = ['Normal', 'Mild', 'Moderate', 'Severe'];

const THRESHOLDS = {
  VPT:  { normalMax: 15,   mildMax: 20,   moderateMax: 25 },
  HOT:  { normalMax: 42.0, mildMax: 45.0, moderateMax: 48.0 },
  COLD: { normalMin: 20.0, mildMin: 15.0, moderateMin: 10.0 },
};

export const gradeValue = (modality, avg) => {
  if (avg === null || avg === undefined || Number.isNaN(Number(avg))) return null;
  const v = Number(avg);
  if (modality === 'VPT' || modality === 'HOT') {
    const t = THRESHOLDS[modality];
    if (v <= t.normalMax) return 'Normal';
    if (v <= t.mildMax) return 'Mild';
    if (v <= t.moderateMax) return 'Moderate';
    return 'Severe';
  }
  if (modality === 'COLD') {
    const t = THRESHOLDS.COLD;
    if (v >= t.normalMin) return 'Normal';
    if (v >= t.mildMin) return 'Mild';
    if (v >= t.moderateMin) return 'Moderate';
    return 'Severe';
  }
  return null;
};

/** Mean of the tested sites only (null/omitted ignored). VPT whole volts; thermal 0.1 °C. */
export const averageReadings = (modality, values) => {
  const tested = values.filter((v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))).map(Number);
  if (!tested.length) return null;
  const mean = tested.reduce((a, b) => a + b, 0) / tested.length;
  return modality === 'VPT' ? Math.round(mean) : Math.round(mean * 10) / 10;
};

export const monoSummary = (values) => {
  const tested = values.filter((v) => v === 0 || v === 1).map(Number);
  return { tested: tested.length, insensate: tested.filter((v) => v === 0).length };
};

// Semantic grade colours — separate from the app's blue accent.
export const GRADE_CLASSES = {
  Normal:   'bg-green-50 text-green-700 border-green-200',
  Mild:     'bg-amber-50 text-amber-700 border-amber-200',
  Moderate: 'bg-orange-50 text-orange-700 border-orange-200',
  Severe:   'bg-red-50 text-red-700 border-red-200',
  pending:  'bg-gray-50 text-gray-500 border-gray-200',
};

// Per-spot fill/ring for the foot diagram — the measured point tinted by its own
// grade band (green Normal · amber Mild · orange Moderate · red Severe).
export const GRADE_SPOT = {
  // Opaque pale fill + coloured ring + dark value — a clean single marker that
  // sits inside the template's printed circle (no muddy translucent double-ring)
  // and keeps the value legible. Shared by the capture screen and the PDF report.
  Normal:   { fill: '#dff2e6', ring: '#1f8a4c', text: '#14532d' },
  Mild:     { fill: '#fdf1d3', ring: '#c07d00', text: '#7a4a00' },
  Moderate: { fill: '#fbe5d8', ring: '#d9531e', text: '#8a3110' },
  Severe:   { fill: '#f9dde1', ring: '#c11d2e', text: '#8a1420' },
  none:     { fill: '#eef1f6', ring: '#9aa6b6', text: '#5b6b82' },
};
