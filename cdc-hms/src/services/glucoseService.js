import api from './api';

/**
 * Glucose Service — the Glucose Management Centre.
 *
 * Backend routes (all JWT, merge-aware, under /patients/:uhid/glucose):
 * - GET  /summary?days=14 | from&to · sources=meter,logbook,clinic
 *                                     — §6 metrics + unified series + targets + meters
 * - GET  /meters                      — this patient's meter links
 * - GET  /batches                     — one row per import (Visit History)
 * - GET  /targets · PUT /targets      — consensus / per-patient targets (PUT: doctor/admin)
 * - POST /meter/preflight             — link state + last sequence number for a serial
 * - POST /meter/import                — file a download (idempotent on serial+seq)
 * - PUT  /meter/readings/:id/exclude · /restore   (doctor/admin)
 * - PUT  /meters/:id/clock-corrected · /retire
 *
 * The maths are server-side (constants/glucose.js) so the doctor, the patient
 * and any print see the same numbers; this file only moves data.
 */
export const glucoseService = {
  getSummary: (uhid, params = {}) => api.get(`/patients/${uhid}/glucose/summary`, { params }),
  getMeters: (uhid) => api.get(`/patients/${uhid}/glucose/meters`),
  getBatches: (uhid) => api.get(`/patients/${uhid}/glucose/batches`),
  getTargets: (uhid) => api.get(`/patients/${uhid}/glucose/targets`),
  setTargets: (uhid, data) => api.put(`/patients/${uhid}/glucose/targets`, data),

  /** { serial?, name?, modelId?, firmware? } → { link, meter, others, lastSequenceNumber, … } */
  preflightMeter: (uhid, device) => api.post(`/patients/${uhid}/glucose/meter/preflight`, device),

  /** { device, readings, hostTime, meterTime, batchId?, link?, excludeSequenceNumbers? } */
  importMeter: (uhid, payload) => api.post(`/patients/${uhid}/glucose/meter/import`, payload),

  excludeReading: (uhid, id, reason) => api.put(`/patients/${uhid}/glucose/meter/readings/${id}/exclude`, { reason }),
  restoreReading: (uhid, id) => api.put(`/patients/${uhid}/glucose/meter/readings/${id}/restore`),
  markClockCorrected: (uhid, meterId) => api.put(`/patients/${uhid}/glucose/meters/${meterId}/clock-corrected`),
  retireMeter: (uhid, meterId, reason) => api.put(`/patients/${uhid}/glucose/meters/${meterId}/retire`, { reason }),
};

export default glucoseService;
