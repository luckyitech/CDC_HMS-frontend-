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

/**
 * What a week reads as, given its own record (if any) and the current week.
 *
 * Assume-given applies only once a week has fully elapsed — a week strictly
 * before the current one, with no record, is taken as given. The current week
 * is 'due' (awaiting the injection, with the whole week to log a miss before it
 * is presumed given); later weeks are 'upcoming' and presume nothing. A recorded
 * week always shows exactly what was recorded.
 *
 * The single source of truth for both the per-week rows and the step adherence
 * tally, so the two can never disagree about what a week counts as.
 */
export const impliedWeekStatus = (week, currentWeek, record) => {
  if (record) return record.status;          // given | missed | omitted
  if (currentWeek === null || currentWeek === undefined) return 'due';
  if (week < currentWeek) return 'given';     // elapsed, assume given
  if (week === currentWeek) return 'due';     // this week — still open to log
  return 'upcoming';                          // not yet due
};

/**
 * Re-chains a schedule so every step after `fromIndex` starts where the previous
 * one ends, preserving each step's own length. Editing one step's range then
 * ripples the change through the later steps instead of leaving an overlap or a
 * gap for the validator to reject. The open-ended final step keeps running on.
 */
export const rechainFrom = (steps, fromIndex) => {
  const out = steps.map((s) => ({
    ...s,
    fromWeek: Number(s.fromWeek),
    toWeek:   s.toWeek === null || s.toWeek === undefined ? null : Number(s.toWeek),
  }));

  for (let i = fromIndex + 1; i < out.length; i += 1) {
    const prev = out[i - 1];
    if (prev.toWeek === null) break;                 // nothing follows an open-ended step
    const span = out[i].toWeek === null ? null : out[i].toWeek - out[i].fromWeek;
    out[i].fromWeek = prev.toWeek;
    out[i].toWeek   = span === null ? null : out[i].fromWeek + span;
  }

  return out;
};
