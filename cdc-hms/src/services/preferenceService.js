import api from './api';

/**
 * My own display preferences (7 Oct 2026). Always the signed-in user's rows.
 * - GET /me/preferences       → { success, data: { 'consultation.tools': {...} } }
 * - PUT /me/preferences/:key  → { success, data: { key, value } } (value as the server cleaned it)
 */
export const preferenceService = {
  getAll: () => api.get('/me/preferences'),
  save: (key, value) => api.put(`/me/preferences/${encodeURIComponent(key)}`, { value }),
};

export default preferenceService;
