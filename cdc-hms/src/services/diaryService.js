import api from './api';

/**
 * Diary Service — the Glucose Management Centre patient diary (Phase 2).
 *
 * Backend routes (all JWT, merge-aware, under /patients/:uhid/glucose/diary):
 * - GET    /diary?days=14 | from&to   — Active diary events in the window
 * - POST   /diary                     — { eventType, occurredAt, label?, detail? }
 * - PUT    /diary/:id                 — edit an entry
 * - DELETE /diary/:id                 — soft-delete an entry
 *
 * A meal entry re-runs the server-side time-matcher, which tags nearby meter
 * readings pre-/post-meal without ever altering their values or meter times.
 */
export const diaryService = {
  list: (uhid, params = {}) => api.get(`/patients/${uhid}/glucose/diary`, { params }),
  create: (uhid, data) => api.post(`/patients/${uhid}/glucose/diary`, data),
  update: (uhid, id, data) => api.put(`/patients/${uhid}/glucose/diary/${id}`, data),
  remove: (uhid, id) => api.delete(`/patients/${uhid}/glucose/diary/${id}`),
};

export default diaryService;
