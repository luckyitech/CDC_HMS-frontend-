import api from './api';

/**
 * Autosave drafts — one function per /api/drafts endpoint. A draft is the
 * signed-in person's OWN unsaved typing; the server scopes every call to them.
 * Each returns the unwrapped { success, data } body.
 */
const draftService = {
  /** My drafts on one patient's file (with payloads). */
  listForPatient: (uhid, { formKey, contextKey } = {}) =>
    api.get('/drafts', { params: { uhid, ...(formKey ? { formKey } : {}), ...(contextKey !== undefined ? { contextKey } : {}) } }),
  /** Every draft of mine, newest first (no payloads) — "My drafts". */
  listMine: () => api.get('/drafts/mine'),
  /** Save (create or replace) one draft. */
  save: ({ uhid, formKey, contextKey = '', label, device, payload }) =>
    api.put('/drafts', { uhid, formKey, contextKey, label, device, payload }),
  /** Discard one draft by its key (also called after the real save). */
  remove: (uhid, formKey, contextKey = '') =>
    api.delete('/drafts', { params: { uhid, formKey, contextKey } }),
  /** Discard one of my drafts by id (My drafts list). */
  removeById: (id) => api.delete(`/drafts/${id}`),
};

export default draftService;
