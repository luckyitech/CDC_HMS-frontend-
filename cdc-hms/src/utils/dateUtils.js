// Returns "15 Jun 2008" from an ISO date string or Date object. Returns null if no value.
export const formatDOB = (dob) => {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
