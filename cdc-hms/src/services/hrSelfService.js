import api from './api';

/**
 * My own record in the HR Suite (B27 phase 2) — /api/hr/me. Every call acts on
 * the signed-in person; nothing here takes whose record. Returns the
 * unwrapped { success, data } body like the other services.
 */
const hrSelfService = {
  // --- my leave ---
  leave:         (year)          => api.get('/hr/me/leave', { params: year ? { year } : {} }),
  preview:       (body)          => api.post('/hr/me/leave/preview', body),
  submit:        (body)          => api.post('/hr/me/leave', body),
  getLeave:      (id)            => api.get(`/hr/me/leave/${id}`),
  reply:         (id, note)      => api.post(`/hr/me/leave/${id}/reply`, { note }),
  withdraw:      (id, note)      => api.post(`/hr/me/leave/${id}/withdraw`, { note: note || null }),
  cancelRequest: (id, note)      => api.post(`/hr/me/leave/${id}/cancel-request`, { note: note || null }),
  addDocument:   (id, documentId) => api.patch(`/hr/me/leave/${id}/attachment`, { documentId }),

  // --- my profile (phase 4) ---
  profile:       ()              => api.get('/hr/me'),
  saveContact:   (body)          => api.patch('/hr/me/contact', body),
  changeRequests: ()             => api.get('/hr/me/change-requests'),
  requestChanges: (body)         => api.post('/hr/me/change-requests', body),
  withdrawChange: (id)           => api.post(`/hr/me/change-requests/${id}/withdraw`, {}),

  // --- my CPD (phase 5) ---
  cpd:           (year)          => api.get('/hr/me/cpd', { params: year ? { year } : {} }),
  logCpd:        (body)          => api.post('/hr/me/cpd', body),
  editCpd:       (id, body)      => api.patch(`/hr/me/cpd/${id}`, body),
  deleteCpd:     (id)            => api.delete(`/hr/me/cpd/${id}`),

  // --- colleagues to choose as approvers / acknowledgers ---
  approvers:     (q)             => api.get('/hr/me/approvers', { params: q ? { q } : {} }),
};

export default hrSelfService;
