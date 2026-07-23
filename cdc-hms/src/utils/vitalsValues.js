/**
 * Triage vitals arrive from the API already formatted for display, with units
 * baked into the string: "94.1 kg", "128/80 mmHg", "8.1%".
 *
 * That is fine to render and wrong to put in a form field — a number input
 * silently rejects "94.1 kg" and the value disappears. These helpers pull the
 * raw value back out for auto-fill.
 */

/** "94.1 kg" -> 94.1 ; null / "" / "—" -> '' (so the input renders empty) */
export const numericVital = (value) => {
  if (value === null || value === undefined || value === '') return '';

  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : '';
};

/** "128/80 mmHg" -> "128/80" */
export const bpVital = (value) => {
  if (!value) return '';

  const match = String(value).match(/\d{1,3}\s*\/\s*\d{1,3}/);
  return match ? match[0].replace(/\s/g, '') : '';
};
