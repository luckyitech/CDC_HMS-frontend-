// Until 10 Oct 2026 the consultation note and the treatment plan shared ONE
// autosave draft ('consultation-notes' = { notes, plan }). They are separate
// modules now, each with its own draft ('consultation-notes' = { notes },
// 'treatment-plan' = { plan }). An old combined draft (kept up to 14 days) is
// restored by the notes module; its plan text is handed to the plan module
// here, so nothing typed before the change is lost (plan M5).
export const LEGACY_PLAN_RESTORE = 'consultation-plan:restore';

const pending = new Map();   // uhid → plan text waiting for the plan module

export const handOverLegacyPlan = (uhid, text) => {
  if (!uhid || !String(text || '').trim()) return;
  pending.set(uhid, String(text));
  window.dispatchEvent(new CustomEvent(LEGACY_PLAN_RESTORE, { detail: { uhid } }));
};

/** The plan module's side: the handed-over text (once), or ''. */
export const takeLegacyPlan = (uhid) => {
  const t = pending.get(uhid) || '';
  pending.delete(uhid);
  return t;
};
