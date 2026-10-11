// Histology / cytology requests as dated events for Visit History (Phase 4,
// 7 Oct 2026; V2): the day it was requested, and — once resulted — the day
// the result was typed. A result may land on a day with no visit; it is filed
// on that day, so the record shows when the result was known.
export const histologyEvents = (requests) => {
  const out = [];
  for (const r of requests || []) {
    if (r.visitDate) out.push({ id: `${r.id}-req`, key: `${r.id}-req`, type: 'requested', day: r.visitDate, request: r });
    if (r.status === 'resulted' && r.resultDay) out.push({ id: `${r.id}-res`, key: `${r.id}-res`, type: 'resulted', day: r.resultDay, request: r });
  }
  return out;
};
