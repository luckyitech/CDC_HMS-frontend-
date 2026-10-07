import api from './api';

/**
 * Remote requests — a prescription / lab request written outside a
 * consultation. Each returns the unwrapped { success, data } body.
 */
const remoteRequestService = {
  /** Start one (doctor): { uhid, channel, requestedByType, requestedByName, note }. */
  create: (data) => api.post('/remote-requests', data),
  /** This patient's remote requests (merge family). */
  listForPatient: (uhid) => api.get('/remote-requests', { params: { uhid } }),
  /** Soft-cancel (author). */
  cancel: (id) => api.patch(`/remote-requests/${id}/cancel`),
};

export default remoteRequestService;
