import api from './api';

// HMIS V3 — all inpatient API calls in one service (matches the existing
// service pattern; the response interceptor unwraps to { success, data }).
export const inpatientService = {
  // --- Config: wards / rooms / beds ---
  getWards:    () => api.get('/wards'),
  createWard:  (data) => api.post('/wards', data),
  updateWard:  (id, data) => api.put(`/wards/${id}`, data),
  createRoom:  (data) => api.post('/rooms', data),
  updateRoom:  (id, data) => api.put(`/rooms/${id}`, data),
  createBed:   (data) => api.post('/beds', data),
  updateBed:   (id, data) => api.put(`/beds/${id}`, data),
  releaseBed:  (id) => api.put(`/beds/${id}/release`),
  getBoard:    () => api.get('/beds/board'),

  // --- Admission flow ---
  requestAdmission: (data) => api.post('/admissions/request', data),
  cancelRequest:    (data) => api.post('/admissions/cancel-request', data),
  convert:          (data) => api.post('/admissions/convert', data),
  directAdmit:      (data) => api.post('/admissions/direct', data),
  listAdmissions:   (params) => api.get('/admissions', { params }),
  // Save & Print — persist the admission note (visit history) without billing.
  saveAdmissionNote:(data) => api.post('/admissions/note', data),
  // Advised admissions for one patient (the admission notes) — Visit History Actions.
  advisedAdmissions:(uhid) => api.get('/admissions/advised', { params: { uhid } }),
  getAdmission:     (id) => api.get(`/admissions/${id}`),
  transfer:         (id, data) => api.put(`/admissions/${id}/transfer`, data),
  reassignAttending:(id, data) => api.put(`/admissions/${id}/attending`, data),
  discharge:        (id, data) => api.put(`/admissions/${id}/discharge`, data),

  // --- Observations (NEWS2) ---
  createObs: (data) => api.post('/inpatient/observations', data),
  listObs:   (admissionId) => api.get('/inpatient/observations', { params: { admissionId } }),
  amendObs:  (id, data) => api.put(`/inpatient/observations/${id}`, data),

  // --- MAR ---
  createOrder: (data) => api.post('/inpatient/mar/orders', data),
  listOrders:  (admissionId) => api.get('/inpatient/mar/orders', { params: { admissionId } }),
  updateOrder: (id, data) => api.put(`/inpatient/mar/orders/${id}`, data),
  dueList:     (params) => api.get('/inpatient/mar/due', { params }),
  administer:  (data) => api.post('/inpatient/mar/administer', data),
  marHistory:  (admissionId) => api.get('/inpatient/mar/history', { params: { admissionId } }),

  // --- Ward-round notes ---
  createNote: (data) => api.post('/ward-round-notes', data),
  listNotes:  (admissionId) => api.get('/ward-round-notes', { params: { admissionId } }),
  amendNote:  (id, data) => api.put(`/ward-round-notes/${id}`, data),

  // --- Discharge summary ---
  generateSummary: (admissionId) => api.post('/discharge-summaries/generate', { admissionId }),
  saveSummary:     (data) => api.post('/discharge-summaries', data),
  updateSummary:   (id, data) => api.put(`/discharge-summaries/${id}`, data),
  getSummary:      (admissionId) => api.get('/discharge-summaries', { params: { admissionId } }),

  // --- Radiology ---
  createRadiology: (data) => api.post('/radiology', data),
  listRadiology:   (params) => api.get('/radiology', { params }),
  reportRadiology: (id, data) => api.put(`/radiology/${id}/report`, data),

  // --- Fluid balance ---
  createFluid: (data) => api.post('/inpatient/fluid-balance', data),
  listFluid:   (admissionId) => api.get('/inpatient/fluid-balance', { params: { admissionId } }),

  // --- Inpatient billing ---
  getAccount:   (admissionId) => api.get('/inpatient/billing', { params: { admissionId } }),
  addCharge:    (data) => api.post('/inpatient/billing', data),
  accrueBedDays:(data) => api.post('/inpatient/billing/accrue-beddays', data),
};

export default inpatientService;
