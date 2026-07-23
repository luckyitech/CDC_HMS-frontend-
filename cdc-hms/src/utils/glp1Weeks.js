/**
 * Week-range display for the GLP-1 dose ladder.
 *
 * The stored model is half-open: fromWeek inclusive, toWeek EXCLUSIVE. So
 * { fromWeek: 52, toWeek: 56 } covers weeks 52, 53, 54, 55 and week 56 belongs
 * to the next step. That is correct and the schedule validator depends on it —
 * adjacent steps share a boundary number precisely so there is no gap.
 *
 * Printed raw, though, "52 – 56" then "56 – 60" reads as though week 56 is on
 * two different doses. Clinicians read a range as inclusive on both ends, and a
 * dose ladder is not the place to make someone doubt which dose applies.
 *
 * So: store half-open, display closed. Every ±1 lives in this file and nowhere
 * else — if it is duplicated inline somewhere, that is the bug.
 */

/** Last week actually covered by a step. null when the step is open-ended. */
export const lastWeekOf = (step) =>
  step?.toWeek === null || step?.toWeek === undefined ? null : Number(step.toWeek) - 1;

/** Turns an inclusive last week back into the exclusive toWeek we store. */
export const toWeekFromLast = (lastWeek) =>
  lastWeek === '' || lastWeek === null || lastWeek === undefined
    ? null
    : Number(lastWeek) + 1;

/** "52 – 55" or "52 onward" — what the clinician should see. */
export const formatStepRange = (step) => {
  if (!step) return '';
  const last = lastWeekOf(step);
  if (last === null) return `${step.fromWeek} onward`;
  return last === step.fromWeek ? `${step.fromWeek}` : `${step.fromWeek} – ${last}`;
};
