// Histopathology requests (1 Nov 2026, Emu): one request carries one or more
// specimens, each histology or cytology, on ONE requisition. The API returns
// one row per specimen (GET /histology/patients/:uhid); these helpers rebuild
// the request — for the patient's list, the printed form and Visit History.
// Older rows (one specimen each) group on their own requisition.

import { labelOf, FIXATIVES } from '../constants/histology';

const keyOf = (r) => r.requisitionNumber || `specimen-${r.id}`;

/**
 * Specimen rows → requests, newest first; specimens in the order they were
 * requested. Request fields come from the first specimen (they are the same
 * on each).
 * @returns {Array<{ key, requisitionNumber, visitDate, createdAt, priority,
 *   sendTo, clinicalDetails, relevantHistory, requestedByName, specimens }>}
 */
export const groupHistologyRequests = (rows = []) => {
  const map = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!map.has(k)) {
      map.set(k, {
        key: k,
        requisitionNumber: r.requisitionNumber || null,
        visitDate: r.visitDate,
        createdAt: r.createdAt,
        priority: r.priority || 'Routine',
        sendTo: r.sendTo || null,
        clinicalDetails: r.clinicalDetails || '',
        relevantHistory: r.relevantHistory || null,
        requestedByName: r.requestedByName || null,
        specimens: [],
      });
    }
    map.get(k).specimens.push(r);
  }
  const list = [...map.values()];
  for (const req of list) req.specimens.sort((a, b) => a.id - b.id);
  return list.sort((a, b) => String(b.visitDate).localeCompare(String(a.visitDate))
    || (b.specimens[0]?.id || 0) - (a.specimens[0]?.id || 0));
};

/** "2 pieces" / "4 passes" for a specimen, or ''. */
export const piecesText = (s) => {
  if (!s.pieces) return '';
  if (s.kind === 'cytology') return `${s.pieces} ${s.pieces === 1 ? 'pass' : 'passes'}`;
  return `${s.pieces} ${s.pieces === 1 ? 'piece' : 'pieces'}`;
};

/** What the specimen is sent in, as a label ('Formalin', 'Slides'…). */
export const fixativeText = (s) => (s.fixative ? labelOf(FIXATIVES, s.fixative) : '');

/** One line for a specimen: "Histology · Thyroid — Right lobe, R2 (TR5) · Core needle biopsy (CNB) · 2 pieces · Formalin". */
export const specimenLine = (s) => [
  s.kind === 'cytology' ? 'Cytology' : 'Histology',
  s.site,
  s.specimenLabel,
  piecesText(s),
  fixativeText(s),
].filter(Boolean).join(' · ');
