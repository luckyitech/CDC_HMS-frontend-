import api from './api';

/**
 * Neuropathy Service — the in-portal Vibrotherm Dx assessment
 * (biothesiometry / thermal perception / 10 g monofilament).
 *
 * Backend routes (all JWT):
 * - POST /neuropathy                  - create a Draft study for a UHID
 * - GET  /neuropathy?uhid=…           - a patient's studies (merge-aware)
 * - GET  /neuropathy                  - recent worklist
 * - GET  /neuropathy/:id              - full study with readings
 * - PUT  /neuropathy/:id/readings     - upsert site readings (Draft only)
 * - PUT  /neuropathy/:id/complete     - grade SERVER-SIDE and lock
 * - PUT  /neuropathy/:id/cancel       - soft-delete with attribution
 *
 * The grade shown live in the exam UI is a preview only; the stored grade is
 * whatever the backend computes on `complete`.
 */
export const neuropathyService = {
  create: (uhid, extra = {}) => api.post('/neuropathy', { uhid, ...extra }),

  getByPatient: (uhid, opts = {}) => api.get('/neuropathy', { params: { uhid, ...opts } }),

  getRecent: (limit = 100) => api.get('/neuropathy', { params: { limit } }),

  getById: (id) => api.get(`/neuropathy/${id}`),

  /** readings: [{ foot:'R'|'L', site, modality:'VPT'|'HOT'|'COLD'|'MONO', value, omitted? }] */
  saveReadings: (id, readings) => api.put(`/neuropathy/${id}/readings`, { readings }),

  complete: (id, { remarks, impression } = {}) => api.put(`/neuropathy/${id}/complete`, { remarks, impression }),

  cancel: (id, reason) => api.put(`/neuropathy/${id}/cancel`, { reason }),
};

export default neuropathyService;
