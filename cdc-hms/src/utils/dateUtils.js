// Returns "15 Jun 2008" from an ISO date string or Date object. Returns null if no value.
export const formatDOB = (dob) => {
  if (!dob) return null;
  return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
