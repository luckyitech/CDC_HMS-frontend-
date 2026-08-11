// Formatting shared across the staff profile tabs, so a date rendered on the
// Overview tab looks identical to one rendered on the Leave tab.

export const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d)
    ? '—'
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// <input type="date"> only accepts YYYY-MM-DD. Handing it a full ISO timestamp
// makes it render blank, which then saves as blank.
export const toDateInput = (value) => {
  if (!value) return '';
  const s = String(value);
  return s.includes('T') ? s.split('T')[0] : s.slice(0, 10);
};

// Reads 'emergencyContact.name' style paths so nested JSON columns can be
// edited by the same field config as flat columns.
export const readPath = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
