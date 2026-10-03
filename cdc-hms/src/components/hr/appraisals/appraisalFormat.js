/**
 * Appraisal helpers (HR Tier 3 Phase 5). Non-component exports live here, not
 * in a .jsx file (react-refresh lint).
 */
export const STATUS_TONE = { self: 'warn', review: 'info', sent: 'warn', acknowledged: 'ok', cancelled: 'n' };
export const STEPS = [
  { key: 'self', label: 'Self-assessment' },
  { key: 'review', label: 'Reviewer' },
  { key: 'sent', label: 'To acknowledge' },
  { key: 'acknowledged', label: 'Acknowledged' },
];
export const RATING_HINT = '1 needs support · 2 developing · 3 meets · 4 exceeds';
// Fired after any appraisal change so the sidebar badge refreshes.
export const APPRAISALS_CHANGED = 'hr-appraisals-changed';

export const shortDate = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
