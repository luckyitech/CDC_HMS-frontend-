// Dermatology — labels and small pure helpers shared by the derm components
// (kept out of .jsx files for react-refresh). The tokens match the backend's
// utils/dermRules.js; the labels are what a doctor reads. The structured
// examination fields (9 Oct 2026) live in ./dermExam.js.
import { LOOK_FIELDS, LOOK_SECTIONS, LOOK_EXAM_KEYS, asList as listOf, phrase, hasValue } from './dermExam';

export const FINDING_TYPES = [
  { id: 'lesion', label: 'Lesion' },
  { id: 'rash', label: 'Rash' },
  { id: 'ulcer', label: 'Ulcer' },
  { id: 'scar', label: 'Scar' },
  { id: 'pigmentation', label: 'Pigmentation' },
  { id: 'hair_loss', label: 'Hair loss' },
  { id: 'nail', label: 'Nail' },
  { id: 'other', label: 'Other' },
];

export const STATUS_TODAY = [
  { id: 'new', label: 'New' },
  { id: 'improved', label: 'Improved' },
  { id: 'stable', label: 'Stable' },
  { id: 'worsened', label: 'Worsened' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'recurrence', label: 'Recurrence' },
];

export const MORPHOLOGY = ['macule', 'patch', 'papule', 'plaque', 'nodule', 'tumour', 'vesicle', 'bulla',
  'pustule', 'wheal', 'cyst', 'erosion', 'ulcer', 'other'];
export const BORDERS = [['regular', 'Regular'], ['irregular', 'Irregular'], ['well_defined', 'Well-defined'], ['ill_defined', 'Ill-defined']];
export const SURFACES = ['smooth', 'scaly', 'crusted', 'verrucous', 'ulcerated', 'bleeding'];
export const COLOURS = [['skin_coloured', 'Skin-coloured'], ['erythematous', 'Erythematous'], ['brown', 'Brown'],
  ['black', 'Black'], ['blue_grey', 'Blue-grey'], ['hypopigmented', 'Hypopigmented'], ['hyperpigmented', 'Hyperpigmented'],
  ['violaceous', 'Violaceous'], ['yellow', 'Yellow'], ['variegated', 'Variegated']];
export const SYMPTOMS = [['itch', 'Itch'], ['pain', 'Pain'], ['bleeding', 'Bleeding'], ['none', 'None']];
export const PLANS = [['monitor', 'Monitor'], ['treat', 'Treat'], ['biopsy', 'Biopsy'], ['excise', 'Excise'], ['refer', 'Refer'], ['discharge', 'Discharge']];
export const MEASURED_BY = [['ruler', 'Ruler'], ['dermatoscope', 'Dermatoscope scale'], ['estimated', 'Estimated']];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');
const fromPairs = (pairs) => Object.fromEntries(pairs.map(([k, v]) => [k, v]));
const LABELS = {
  type: Object.fromEntries(FINDING_TYPES.map((t) => [t.id, t.label])),
  status: Object.fromEntries(STATUS_TODAY.map((t) => [t.id, t.label])),
  border: fromPairs(BORDERS), colour: fromPairs(COLOURS), symptom: fromPairs(SYMPTOMS),
  plan: fromPairs(PLANS), measuredBy: fromPairs(MEASURED_BY),
};
export const label = (kind, id) => (id ? (LABELS[kind]?.[id] || cap(id)) : '');
export const statusLabel = (id) => label('status', id);
export const typeLabel = (id) => label('type', id);
/** What a finding is called: its typed name when the type is "Other". */
export const typeText = (f) => (f && f.type === 'other' && f.typeOther ? f.typeOther : typeLabel(f?.type));

/** Tailwind classes for a status pill — the same colours the mockup used. */
export const STATUS_STYLE = {
  new: 'bg-teal-50 text-teal-700 border-teal-200',
  improved: 'bg-green-50 text-green-700 border-green-200',
  stable: 'bg-gray-100 text-gray-600 border-gray-200',
  worsened: 'bg-red-50 text-red-700 border-red-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  recurrence: 'bg-amber-50 text-amber-700 border-amber-200',
};
/** Marker colour on the body map (SVG fill). */
export const STATUS_DOT = {
  new: '#0d9488', improved: '#16a34a', stable: '#9ca3af', worsened: '#dc2626', resolved: '#16a34a', recurrence: '#d97706',
};

/** "7 × 6 mm", "7 × 6 × 2 mm", "7 mm", or '' when no size was typed. */
export const sizeText = (o) => {
  if (!o || !o.lengthMm) return '';
  const parts = [o.lengthMm, o.widthMm, o.depthMm].filter((v) => v !== null && v !== undefined && v !== '');
  return `${parts.join(' × ')} mm`;
};

/**
 * How today's typed size compares with an earlier typed size. Purely from the
 * typed numbers — never from a photo. Returns null when either side is missing.
 *   { longest: [5, 7], deltaMm: 2, area: [20, 42], pct: 110, flag: true }
 * `flag` = the change a doctor would want highlighted (≥ 2 mm longest diameter
 * or ≥ 20 % area by L × W).
 */
export const sizeChange = (prev, now) => {
  const l0 = Number(prev?.lengthMm), l1 = Number(now?.lengthMm);
  if (!(l0 > 0 && l1 > 0)) return null;
  const w0 = Number(prev?.widthMm) || l0, w1 = Number(now?.widthMm) || l1;
  const long0 = Math.max(l0, w0), long1 = Math.max(l1, w1);
  const a0 = l0 * w0, a1 = l1 * w1;
  const pct = Math.round(((a1 - a0) / a0) * 100);
  const deltaMm = Math.round((long1 - long0) * 10) / 10;
  return { longest: [long0, long1], deltaMm, area: [Math.round(a0 * 10) / 10, Math.round(a1 * 10) / 10], pct, flag: Math.abs(deltaMm) >= 2 || Math.abs(pct) >= 20 };
};

/** '2026-09-02' → '2 Sep 2026' (dates are clinic DATEONLY strings). */
export const fmtDay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

/** A one-line description of a look, from its structured fields (carry-forward card, timeline). */
export const describe = (o) => {
  if (!o) return '';
  const bits = [];
  const head = [phrase('colours', o.colours), phrase('morphology', o.morphology)].filter(Boolean).join(' ');
  if (head) bits.push(cap(head));
  if (sizeText(o)) bits.push(`${sizeText(o)}${o.measuredBy ? ` (${label('measuredBy', o.measuredBy).toLowerCase()})` : ''}`);
  if (hasValue(o.configuration)) bits.push(phrase('configuration', o.configuration));
  if (hasValue(o.border)) bits.push(`${phrase('border', o.border)} border`);
  if (hasValue(o.surface)) bits.push(`${phrase('surface', o.surface)} surface`);
  const sym = listOf(o.symptoms).filter((s) => s !== 'none');
  if (sym.length) bits.push(phrase('symptoms', sym));
  return bits.join(', ');
};

// Every structured field starts blank ('' or [] for a list) — blank = not recorded.
const blankExam = () => Object.fromEntries(LOOK_FIELDS
  .filter((f) => !['morphology', 'colours', 'symptoms', 'plan'].includes(f.key))
  .map((f) => [f.key, f.kind === 'many' ? [] : '']));

/** The empty "today" form, or one started from an earlier look (Stable copies it). */
export const blankLook = () => ({
  statusToday: '', lengthMm: '', widthMm: '', depthMm: '', measuredBy: 'ruler', sizeMinMm: '', sizeMaxMm: '',
  morphology: [], colours: [], symptoms: [],
  ...blankExam(), dermoscopy: false,
  description: '', plan: '', planNote: '',
});

const MANY_KEYS = new Set(LOOK_FIELDS.filter((f) => f.kind === 'many').map((f) => f.key));
export const lookFrom = (o) => {
  if (!o) return blankLook();
  const base = blankLook();
  const out = { ...base };
  for (const k of Object.keys(base)) {
    const v = o[k];
    if (MANY_KEYS.has(k)) out[k] = listOf(v);
    else if (k === 'dermoscopy') out[k] = !!v;
    else out[k] = v === null || v === undefined ? base[k] : v;
  }
  out.measuredBy = o.measuredBy || 'ruler';
  return out;
};

/** Older drafts (before 9 Oct 2026) held border / surface as one word. */
export const lookFromDraft = (p) => {
  const out = { ...blankLook(), ...(p || {}) };
  for (const k of MANY_KEYS) out[k] = listOf(out[k]);
  out.dermoscopy = !!out.dermoscopy;
  out.measuredBy = out.measuredBy || 'ruler';
  return out;
};

/**
 * The form as the API wants it (blank strings → null, sizes as numbers). Mirrors
 * the server's follow-on rules (no ulcer base without ulceration, a count OR
 * innumerable/confluent, nothing from dermoscopy unless performed) so an
 * amendment's before/after compare like for like.
 */
export const lookPayload = (f) => {
  const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
  const s = (v) => (v === '' || v === undefined ? null : (typeof v === 'string' ? v.trim() || null : v));
  const out = {
    statusToday: f.statusToday,
    lengthMm: n(f.lengthMm), widthMm: n(f.widthMm), depthMm: n(f.depthMm),
    measuredBy: n(f.lengthMm) ? f.measuredBy : null,
    sizeMinMm: n(f.sizeMinMm), sizeMaxMm: n(f.sizeMaxMm),
    morphology: listOf(f.morphology), colours: listOf(f.colours), symptoms: listOf(f.symptoms),
    // Diagnosis, differential and review are no longer on the form (8 Oct 2026) —
    // not sent, so an older look keeps whatever it already had.
    description: s(f.description), plan: s(f.plan), planNote: s(f.planNote),
    dermoscopy: !!f.dermoscopy,
  };
  for (const k of LOOK_EXAM_KEYS) {
    if (k === 'dermoscopy') continue;
    const spec = LOOK_FIELDS.find((x) => x.key === k);
    if (spec.kind === 'many') out[k] = listOf(f[k]);
    else if (spec.kind === 'int' || spec.kind === 'pct') out[k] = n(f[k]);
    else out[k] = s(f[k]);
  }
  if (!out.ulceration || out.ulceration === 'none') out.ulcerBase = null;
  if (out.lesionCountKind) out.lesionCount = null;
  if (!out.dermoscopy) for (const fld of LOOK_SECTIONS.find((x) => x.id === 'dermoscopy').fields) out[fld.key] = fld.kind === 'many' ? [] : null;
  return out;
};
