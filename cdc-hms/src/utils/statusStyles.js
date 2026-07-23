/**
 * Status / badge styling — SINGLE SOURCE OF TRUTH.
 *
 * The whole app used to redefine `getStatusColor` / `getPriorityColor` /
 * `getSeverityColor` / `getRiskColor` / `getRoleBadgeColor` in every page,
 * each hardcoding Tailwind colour classes. Change a colour once here and every
 * <StatusBadge> across the app updates.
 *
 * Two layers:
 *   1. TONES / SOLID_TONES — the palette (semantic colour -> Tailwind classes).
 *   2. *_TONES maps        — domain label -> semantic tone.
 *
 * NOTE: Tailwind only keeps classes it can see as complete literal strings, so
 * every class string below must stay whole (never build them dynamically).
 */

// 1. Palette — soft "pill" badges (bg-100 / text-700 / border-300)
export const TONES = {
  // --- Semantic tones: these carry MEANING. Pick by what the label says,
  //     not by the colour you want. Restyle here to restyle the whole app.
  success: 'bg-green-100 text-green-700 border-green-300',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  danger:  'bg-red-100 text-red-700 border-red-300',
  info:    'bg-blue-100 text-blue-700 border-blue-300',
  amber:   'bg-amber-100 text-amber-700 border-amber-300',
  purple:  'bg-purple-100 text-purple-700 border-purple-300',
  cyan:    'bg-cyan-100 text-cyan-700 border-cyan-300',
  neutral: 'bg-gray-100 text-gray-700 border-gray-300',

  // --- Categorical tones: these carry IDENTITY, not meaning (e.g. user roles).
  //     A staff member is not "success" — they're just violet. Keep these
  //     separate so nobody reads significance into the colour.
  blue:    'bg-blue-100 text-blue-700 border-blue-300',
  violet:  'bg-violet-100 text-violet-700 border-violet-300',
  teal:    'bg-teal-100 text-teal-700 border-teal-300',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rose:    'bg-rose-100 text-rose-700 border-rose-300',
};

// Palette — solid badges (used for severity/critical emphasis)
export const SOLID_TONES = {
  danger:  'bg-red-500 text-white',
  orange:  'bg-orange-500 text-white',
  warning: 'bg-yellow-500 text-white',
};

// 2. Domain label -> tone maps
export const QUEUE_STATUS_TONES = {
  'Awaiting Triage':   'warning',
  'In Triage':         'info',
  'Awaiting Doctor':   'purple',
  'With Doctor':       'success',
  // GLP-1: consultation done, patient with the nurse for their injection, not yet billed
  'Pending Injection': 'teal',
  'Pending Billing':   'amber',
  'Completed':         'neutral',
};

export const REPORT_STATUS_TONES = {
  Generated:  'success',
  Processing: 'warning',
  Failed:     'danger',
};

// Lab result interpretation (Normal / Abnormal / Critical)
export const LAB_RESULT_TONES = {
  Normal:   'success',
  Abnormal: 'warning',
  Critical: 'danger',
};

// Lab workflow status
export const LAB_STATUS_TONES = {
  Pending:            'warning',
  'In Progress':      'info',
  Completed:          'success',
  'Sample Collected': 'success',
  'Pending Sample':   'warning',
};

// Lab queue priority — non-urgent reads as neutral
export const PRIORITY_TONES = {
  Urgent:  'danger',
  Routine: 'neutral',
};

// Front-desk queue priority — non-urgent reads as "all good" (green), not neutral.
// Callers should default to 'success': QUEUE_PRIORITY_TONES[p] || 'success'
export const QUEUE_PRIORITY_TONES = {
  Urgent:  'danger',
  Routine: 'success',
};

// Patient-facing prescription status
export const PRESCRIPTION_TONES = {
  Active:    'success',
  Completed: 'info',
  Cancelled: 'danger',
  Expired:   'neutral',
};

// Patient-facing vitals/reading status (lowercase keys, as stored)
export const READING_TONES = {
  normal:   'success',
  elevated: 'warning',
  high:     'danger',
};

export const RISK_TONES = {
  High:   'danger',
  Medium: 'warning',
  Low:    'success',
};

// User roles — categorical identity colours, not semantic.
// ManageUsers and AdminDashboard used to disagree (patient was emerald on one
// page and cyan on the other); this map is now the only definition.
export const ROLE_TONES = {
  doctor:  'blue',
  staff:   'violet',
  lab:     'teal',
  patient: 'emerald',
  admin:   'rose',
};

// Patient registration completeness
export const REGISTRATION_TONES = {
  complete:   'success',
  incomplete: 'amber',
};

// Account active/suspended
export const ACCOUNT_TONES = {
  active:   'success',
  inactive: 'danger',
};

// Severity uses the SOLID palette; default (unmatched) -> warning
export const SEVERITY_SOLID_TONES = {
  Critical: 'danger',
  High:     'orange',
};
