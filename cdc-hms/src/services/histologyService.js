import api from './api';
import documentService from './documentService';

/**
 * Histology / cytology — a specialist module (Dermatology Phase 3, 7 Oct 2026).
 * Every route answers 404 while the clinic has the module switched off.
 *
 * - GET  /histology/worklist                  - awaiting results, clinic-wide (?mine=true), overdue first
 * - GET  /histology/patients/:uhid            - every request (?findingId=)
 * - GET  /histology/patients/:uhid/documents  - documents a report can be chosen from
 * - POST /histology/patients/:uhid            - new request (+ Pending lab request, + optional biopsy procedure)
 * - GET  /histology/:id                       - one request + its trail
 * - PUT  /histology/:id/result                - record / correct the result ({ reason } after its day)
 * - POST /histology/:id/cancel                - { reason }
 *
 * Each call returns the API body { success, data } — read `.data`.
 */
export const histologyService = {
  worklist: ({ mine = false } = {}) => api.get('/histology/worklist', { params: mine ? { mine: 'true' } : {} }),
  list: (uhid, { findingId } = {}) =>
    api.get(`/histology/patients/${encodeURIComponent(uhid)}`, { params: findingId ? { findingId } : {} }),
  reportCandidates: (uhid) => api.get(`/histology/patients/${encodeURIComponent(uhid)}/documents`),
  create: (uhid, payload) => api.post(`/histology/patients/${encodeURIComponent(uhid)}`, payload),
  get: (id) => api.get(`/histology/${id}`),
  saveResult: (id, payload) => api.put(`/histology/${id}/result`, payload),
  cancel: (id, reason) => api.post(`/histology/${id}/cancel`, { reason }),

  /**
   * Upload the report as an ordinary Medical Document of this patient (it then
   * also shows under Documents). Returns the new document's id.
   */
  uploadReport: async (uhid, file, { kind, labName, reportDate }) => {
    const form = new FormData();
    form.append('file', file);
    form.append('uhid', uhid);
    form.append('documentCategory', 'Lab Report - External');
    form.append('testType', kind === 'cytology' ? 'Cytology' : 'Histopathology');
    if (labName) form.append('labName', labName);
    if (reportDate) form.append('testDate', reportDate);
    const res = await documentService.upload(form);
    return res?.data?.id;
  },
};

export default histologyService;
