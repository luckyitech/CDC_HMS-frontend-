import { useEffect, useState } from 'react';
import { useConsultationNotesContext } from '../contexts/ConsultationNotesContext';
import { useTreatmentPlanContext } from '../contexts/TreatmentPlanContext';
import physicalExamService from '../services/physicalExamService';
import { dermService } from '../services/dermService';
import { localToday, findThisVisitsRecord } from '../utils/dateUtils';

/**
 * Today's recorded work in the modules a doctor has HIDDEN (10 Oct 2026,
 * plan M6): nothing recorded today may disappear because a layout hides its
 * module. Returns { [moduleId]: 'reason' } for each hidden module that has an
 * entry today; the screen shows that module for this visit, marked
 * "Hidden in your layout — shown because …".
 *
 * Only hidden modules are looked up (a shown module shows its own entry), one
 * light request each, once per patient / change of hidden set:
 *   notes, plan   this visit's note / plan by this doctor (same rule as the
 *                 modules themselves — findThisVisitsRecord)
 *   exam          an examination dated today (anyone)
 *   dermatology   a skin finding looked at today (anyone; module on only)
 * GLP-1 (a nurse's note today) and unsaved drafts are known to the screen
 * already and are added there.
 *
 * @param {{ uhid, hiddenIds: string[], doctorId, visitStartedAt, dermOn: boolean }} args
 */
export default function useTodaysWork({ uhid, hiddenIds = [], doctorId, visitStartedAt = null, dermOn = false }) {
  const { getNotesByPatient } = useConsultationNotesContext();
  const { getPlansByPatient } = useTreatmentPlanContext();
  const [work, setWork] = useState({});
  const key = [...hiddenIds].sort().join(',');

  useEffect(() => {
    if (!uhid || !key) { setWork({}); return undefined; }
    let live = true;
    const ids = key.split(',');
    const today = localToday();
    const scope = { today, doctorId, visitStartedAt };
    const onDay = (r) => String(r?.date || r?.createdAt || '').slice(0, 10) === today;
    const list = (res, field) => {
      const d = res?.data;
      return Array.isArray(d?.[field]) ? d[field] : (Array.isArray(d) ? d : []);
    };
    const checks = {
      notes: async () => (findThisVisitsRecord((await getNotesByPatient(uhid))?.notes, scope) ? 'a note was saved this visit' : null),
      plan: async () => (findThisVisitsRecord(await getPlansByPatient(uhid), scope) ? 'a plan was saved this visit' : null),
      exam: async () => (list(await physicalExamService.getByPatient(uhid, { limit: 1 }), 'physicalExams').some(onDay) ? 'today has an examination' : null),
      dermatology: async () => {
        if (!dermOn) return null;
        const board = (await dermService.getBoard(uhid))?.data;
        return (board?.findings || []).some((f) => f.today) ? 'today has skin findings' : null;
      },
    };
    Promise.all(ids.filter((id) => checks[id]).map(async (id) => {
      try { return [id, await checks[id]()]; } catch { return [id, null]; }
    })).then((pairs) => {
      if (live) setWork(Object.fromEntries(pairs.filter(([, why]) => why)));
    });
    return () => { live = false; };
    // Context getters are re-created on every render; the lookup is keyed on
    // the patient, the hidden set and the visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uhid, key, doctorId, visitStartedAt, dermOn]);

  return work;
}
