import api from './api';

/**
 * Leave (B27) — one function per /api/leave endpoint. Every call returns the
 * unwrapped { success, data } body like the other services.
 *
 * Phase 1: HR's Leave settings (all leave.policy). The application and
 * approval calls join this file in phases 2–3.
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

  // --- entitlements ---
  entitlements:   (year)             => api.get('/leave/entitlements', { params: { year } }),
  saveEntitlement: (userId, year, body) => api.put(`/leave/entitlements/${userId}/${year}`, body),

  // --- audit ---
  changes:        ()                 => api.get('/leave/changes'),
};

export default leaveService;
