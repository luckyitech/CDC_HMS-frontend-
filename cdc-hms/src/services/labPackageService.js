import api from './api';

/**
 * Lab Package Service — admin-managed bundles of lab tests (e.g. "Annual
 * Diabetes Check-up"). Read by the request form; managed on the admin
 * Clinical Catalog page.
 *
 * Backend routes (see routes/labPackages.js):
 *   GET    /lab-packages            list (active only; ?all=1 for archived too)
 *   POST   /lab-packages            create (admin)
 *   PUT    /lab-packages/:id        update (admin)
 *   DELETE /lab-packages/:id        remove (admin)
 */
export const labPackageService = {
  list: (params = {}) => api.get('/lab-packages', { params }),
  create: (data) => api.post('/lab-packages', data),
  update: (id, data) => api.put(`/lab-packages/${id}`, data),
  delete: (id) => api.delete(`/lab-packages/${id}`),
};

export default labPackageService;
