import api from './api';

/**
 * Nursing notes — the DAR-format Kardex (Data, Action, Response).
 *
 * Backend routes:
 * - GET    /nursing-notes?uhid=  list a patient's notes (oldest first)
 * - POST   /nursing-notes        add one { uhid, data, action, response }
 * - DELETE /nursing-notes/:id    soft delete (author or admin)
 */
const nursingNoteService = {
  getByPatient: (uhid) => api.get('/nursing-notes', { params: { uhid } }),
  create: (payload) => api.post('/nursing-notes', payload),
  remove: (id) => api.delete(`/nursing-notes/${id}`),
};

export default nursingNoteService;
