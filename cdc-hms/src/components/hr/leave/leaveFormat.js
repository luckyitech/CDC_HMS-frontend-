/**
 * Display helpers for leave (B27). Days are DECIMAL on the server (half and
 * quarter days), so every number on a leave screen goes through fmtDays.
 */

/** 10 → '10', 2.5 → '2.5', 0.25 → '0.25', null → '—'. */
export const fmtDays = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return String(Math.round(v * 100) / 100);
};

/** A weekday's value as HR sees it: 1, ½ or 0. */
export const weightLabel = (v) => (Number(v) === 0.5 ? '½' : String(Number(v)));

/** Monday-first, as the clinic reads a week; values are JS getDay() numbers. */
export const WEEK_ORDER = [
  { d: 1, short: 'Mon' }, { d: 2, short: 'Tue' }, { d: 3, short: 'Wed' }, { d: 4, short: 'Thu' },
  { d: 5, short: 'Fri' }, { d: 6, short: 'Sat' }, { d: 0, short: 'Sun' },
];

export const GRANT_LABELS = {
  up_front: 'Up front',
  monthly: 'Monthly accrual',
  per_event: 'Per event',
  unlimited: 'No limit',
};

export const COUNTED_LABELS = { working: 'Working days', calendar: 'Calendar days' };

/** '03-31' → '31 Mar'; null → 'Never'. */
export const monthDayLabel = (mmdd) => {
  if (!mmdd) return 'Never';
  const [m, d] = mmdd.split('-').map(Number);
  return new Date(Date.UTC(2024, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 'YYYY-MM-DD' → 'Tue 20 Oct'. */
export const holidayDateLabel = (iso) => (iso
  ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  : '—');
