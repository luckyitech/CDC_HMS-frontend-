import api from './api';

/**
 * Leave (B27) — one function per /api/leave endpoint. Every call returns the
 * unwrapped { success, data } body like the other services.
 *
 * Phase 1: HR's Leave settings (all leave.policy). Phase 3: the approvals
 * inbox and the request an approver opens. Phase 5: the team calendar.
 * Applying for one's own leave is hrSelfService (/api/hr/me).
 */
const leaveService = {
  // --- the yearly policy ---
  policies:       ()                 => api.get('/leave/policies'),
  policy:         (year)             => api.get(`/leave/policy/${year}`),
  savePolicy:     (year, body)       => api.put(`/leave/policy/${year}`, body),
  publishPolicy:  (year)             => api.post(`/leave/policy/${year}/publish`, {}),
  copyPolicy:     (year, from)       => api.post(`/leave/policy/${year}/copy-from/${from}`, {}),

  // --- leave types ---
  types:          (all = false)      => api.get('/leave/types', { params: all ? { all: 1 } : {} }),
  createType:     (name)             => api.post('/leave/types', { name }),
  updateType:     (id, body)         => api.patch(`/leave/types/${id}`, body),

  // --- public holidays ---
  holidays:       (year, all = false) => api.get('/leave/holidays', { params: { year, ...(all ? { all: 1 } : {}) } }),
  createHoliday:  (body)             => api.post('/leave/holidays', body),
  updateHoliday:  (id, body)         => api.patch(`/leave/holidays/${id}`, body),
  setObserveSunday: (on)             => api.put('/leave/holidays/observe-sunday', { on }),

  // --- the leave register (HR Tier 2, leave.manage) — server-made .csv ---
  downloadRegister: async (year) => {
    const csv = await api.get('/leave/register', { params: { year }, responseType: 'text', transformResponse: [(d) => d] });
    const blob = new Blob([typeof csv === 'string' ? csv : ''], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = `leave-register-${year}.csv`; a.click();
    URL.revokeObjectURL(href);
  },

  // --- entitlements ---
  entitlements:   (year)             => api.get('/leave/entitlements', { params: { year } }),
  saveEntitlement: (userId, year, body) => api.put(`/leave/entitlements/${userId}/${year}`, body),

  // --- audit ---
  changes:        ()                 => api.get('/leave/changes'),

  // --- team calendar (phase 5) ---
  calendar:       (params)           => api.get('/leave/calendar', { params }),

  // --- approvals (phase 3) — the request an approver opens, the inbox ---
  inbox:          (tab = 'waiting', year) => api.get('/leave/inbox', { params: { tab, ...(year ? { year } : {}) } }),
  inboxCount:     ()                 => api.get('/leave/inbox/count'),
  request:        (id)               => api.get(`/leave/requests/${id}`),
  decide:         (id, body)         => api.post(`/leave/requests/${id}/decide`, body),
  saveSplit:      (id, charges)      => api.post(`/leave/requests/${id}/split`, { charges }),
  answerCover:    (id, answer, note) => api.post(`/leave/requests/${id}/cover`, { answer, note: note || null }),
  cancel:         (id, note)         => api.post(`/leave/requests/${id}/cancel`, { note: note || null }),
  // The supporting document, as a blob (the route is authenticated — no plain link).
  attachment:     (id)               => api.get(`/leave/requests/${id}/attachment`, { responseType: 'blob' }),
};

export default leaveService;
