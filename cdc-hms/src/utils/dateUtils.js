// Returns "15 Jun 2008" from an ISO date string or Date object. Returns null if no value.
export const formatDOB = (dob) => {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Today as "YYYY-MM-DD" in the browser's LOCAL calendar — the same day the
 * backend files records under (clinicToday, Africa/Nairobi). Never derive this
 * from toISOString(): that is the UTC date, which is yesterday until 03:00 in
 * Nairobi and made "today's note" lookups miss.
 */
export const localToday = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Pick the record that belongs to THIS visit by THIS clinician from a list of
 * dated clinical records (notes, plans …). A visit is a queue row; a second
 * check-in on the same day is a second visit and must not inherit — or
 * overwrite — the first visit's record. Match rule, all of which must hold:
 *   - filed today (record[dateField] === today)
 *   - written by the current user (doctorId), so another doctor's note is never
 *     opened for editing (the API refuses that update anyway)
 *   - created at/after the visit's check-in when visitStartedAt is known
 *     (rows from before the API returned createdAt pass this test)
 * Returns the newest match, or null.
 */
export const findThisVisitsRecord = (records, { today, doctorId, visitStartedAt, dateField = 'date' }) => {
  const list = Array.isArray(records) ? records : [];
  const startMs = visitStartedAt ? new Date(visitStartedAt).getTime() : null;
  const mine = list.filter((r) => {
    if ((r[dateField] || r.createdAt || '').slice(0, 10) !== today) return false;
    if (doctorId != null && r.doctorId != null && r.doctorId !== doctorId) return false;
    if (startMs && r.createdAt && new Date(r.createdAt).getTime() < startMs) return false;
    return true;
  });
  mine.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return mine[0] || null;
};

/** True when a timestamp falls on the local calendar day we are in now. */
export const isToday = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth()    === now.getMonth()
    && date.getDate()     === now.getDate();
};

/**
 * Returns "15 Jun 2008, 14:05" — the same en-GB shape as formatDOB, with the
 * time of day. Used where a clinical entry has to say exactly when it was
 * written, not just on which day.
 */
export const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};
