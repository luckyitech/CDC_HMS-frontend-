import api from './api';

/**
 * HR Suite → Manual → Checklist — one function per /api/hr/manual endpoint.
 * The clinic's ONE shared go-live / first-week checklist (HR staff only; the
 * server gates every call). Each returns the unwrapped { success, data } body.
 */
const hrChecklistService = {
  list:      ()             => api.get('/hr/manual/checklist'),
  setDone:   (key, done)    => api.put(`/hr/manual/checklist/${encodeURIComponent(key)}/done`, { done }),
  setNote:   (key, note)    => api.put(`/hr/manual/checklist/${encodeURIComponent(key)}/note`, { note }),
  addItem:   (section, label) => api.post('/hr/manual/checklist/items', { section, label }),
  setStatus: (key, status)  => api.patch(`/hr/manual/checklist/items/${encodeURIComponent(key)}`, { status }),
};

export default hrChecklistService;
