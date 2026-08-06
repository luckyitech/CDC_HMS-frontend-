// Money on the frontend is for DISPLAY ONLY.
//
// Every amount arrives from the API as an integer number of cents in a
// `...Minor` field, and every total on screen is one the SERVER computed. There
// is deliberately no arithmetic here beyond formatting: VAT, discounts and
// balances are worked out once, in utils/billingLedger.js, and a second
// implementation in JavaScript would be a second thing to keep in step. The day
// the two disagree, the patient is shown one figure and charged another.
//
// The one thing that goes the other way is what reception TYPES — that is sent
// as the plain string they entered and parsed on the server.

const MINOR_UNITS = 100;

/** 250050 → '2,500.50'. Always two decimal places, sign preserved. */
export const formatAmount = (minor) => {
  const n = Number(minor || 0);
  const negative = n < 0;
  const abs = Math.abs(n);
  const whole = Math.trunc(abs / MINOR_UNITS);
  const frac = String(abs % MINOR_UNITS).padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toLocaleString('en-KE')}.${frac}`;
};

/** 250050 → 'KES 2,500.50'. For headline figures and printed documents. */
export const formatMoney = (minor, currency = 'KES') => `${currency} ${formatAmount(minor)}`;

/**
 * What to put in an editable amount box for a stored value: '2500.50'.
 *
 * No thousands separators — this is a value being edited, and a comma the user
 * did not type reappearing mid-edit makes the field feel broken. The parser on
 * the server accepts them anyway if they paste one in.
 */
export const toAmountInput = (minor) =>
  minor === null || minor === undefined ? '' : (Number(minor) / MINOR_UNITS).toFixed(2);

/**
 * Does this look like an amount the server will accept?
 *
 * Mirrors parseAmount's rule so the desk gets told immediately rather than
 * after a round trip. The SERVER is still the authority — this only decides
 * whether to disable a button.
 */
export const isAmountLike = (value) => /^\d{1,11}(\.\d{1,2})?$/.test(String(value ?? '').trim().replace(/,/g, ''));

/** A price that has never been set, as opposed to one deliberately set to 0. */
export const isUnpriced = (minor) => minor === null || minor === undefined;
