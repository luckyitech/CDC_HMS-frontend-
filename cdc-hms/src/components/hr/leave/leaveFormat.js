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

// ---------------------------------------------------------------------------
// Applications (B27 phase 2)
// ---------------------------------------------------------------------------

/** What each status is called on screen. "Rejected" reads as Declined. */
export const STATUS_LABELS = {
  Pending: 'Waiting',
  InfoRequested: 'Question asked',
  Approved: 'Approved',
  Rejected: 'Declined',
  Withdrawn: 'Withdrawn',
  CancelRequested: 'Cancel requested',
  Cancelled: 'Cancelled',
};

/** hrFormat Pill tones per status. */
export const STATUS_TONES = {
  Pending: 'warn',
  InfoRequested: 'warn',
  Approved: 'ok',
  Rejected: 'bad',
  Withdrawn: 'n',
  CancelRequested: 'warn',
  Cancelled: 'n',
};

const short = (iso, withMonth = true) => new Date(`${iso}T12:00:00Z`)
  .toLocaleDateString('en-GB', withMonth ? { day: 'numeric', month: 'short', timeZone: 'UTC' } : { day: 'numeric', timeZone: 'UTC' });

/** '7–18 Dec', '30 Nov – 2 Dec', '9 Mar'. */
export const rangeLabel = (start, end) => {
  if (!start) return '—';
  if (!end || start === end) return short(start);
  if (start.slice(0, 7) === end.slice(0, 7)) return `${short(start, false)}–${short(end)}`;
  return `${short(start)} – ${short(end)}`;
};

/** 'Tue 20 Oct 2026' */
export const longDate = (iso) => (iso
  ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  : '—');

export const START_PARTS = [{ value: 'full', label: 'Full day' }, { value: 'pm', label: 'Afternoon only' }];
export const END_PARTS = [{ value: 'full', label: 'Full day' }, { value: 'am', label: 'Morning only' }];

/** ' (from the afternoon)' / ' (back after lunch)' — for a sentence. */
export const partsNote = (startPart, endPart) => [
  startPart === 'pm' ? 'starts after lunch' : null,
  endPart === 'am' ? 'ends at lunch' : null,
].filter(Boolean).join(' · ');

/** "1 of 2 approved" — or the status label once it is no longer waiting. */
export const progressLabel = (app) => {
  if (!['Pending', 'InfoRequested'].includes(app.status)) return STATUS_LABELS[app.status] || app.status;
  if (app.status === 'InfoRequested') return STATUS_LABELS.InfoRequested;
  const approvers = (app.participants || []).filter((p) => p.kind === 'approver');
  const done = approvers.filter((p) => p.decision === 'approved').length;
  return approvers.length ? `${done} of ${approvers.length} approved` : STATUS_LABELS.Pending;
};

/** The staff-document category an attachment for this leave type is filed as. */
export const attachmentCategoryFor = (leaveType) => {
  if (leaveType === 'Sick') return 'Sick Note';
  if (leaveType === 'Study') return 'Training Certificate';
  return 'Other';
};

/** What a leave event says on the timeline. */
export const EVENT_LABELS = {
  submitted: 'Applied',
  approved: 'Approved',
  declined: 'Declined',
  info_requested: 'Asked for more information',
  info_replied: 'Answered',
  charge_changed: 'Changed which balance it comes off',
  withdrawn: 'Withdrew the request',
  cancel_requested: 'Asked to cancel',
  cancelled: 'Cancelled',
  recorded: 'Recorded',
  notified: 'Told',
  document_added: 'Added the supporting document',
};

/** 'Mon 7 – Fri 11 Dec' style label is built by the server; this is the day-back line. */
export const returnLabel = (returnDate, returnPart) => {
  if (!returnDate) return null;
  return returnPart === 'pm' ? `${longDate(returnDate)}, after lunch` : longDate(returnDate);
};

// ---------------------------------------------------------------------------
// The charge split (B27 phase 3, revision B)
// ---------------------------------------------------------------------------

/** Is this split ready to send? */
export const splitReady = (rows, total) => rows.length > 0
  && rows.every((r) => r.leaveType && Number(r.days) > 0 && Math.round(Number(r.days) * 100) % 25 === 0)
  && Math.abs(rows.reduce((s, r) => s + Number(r.days), 0) - Number(total)) < 0.001;

/** "2 sick + 3 annual" — for the Approve button (revision B). */
export const splitLabel = (rows, types = []) => rows
  .map((r) => `${fmtDays(r.days)} ${(types.find((t) => t.key === r.leaveType)?.name || r.leaveType).toLowerCase()}`)
  .join(' + ');

/** Fired on window after a decision or cancel, so the sidebar badge refreshes. */
export const LEAVE_CHANGED_EVENT = 'leave:changed';
