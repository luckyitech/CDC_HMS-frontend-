import api from './api';

/**
 * Thyroid Ultrasound Reporting service.
 * Backend: /api/thyroid-ultrasounds (authored in the Radiology workspace).
 * Reads: any clinical role. Writes: doctor / reporting tech (staff) / admin.
 */
export const thyroidUltrasoundService = {
  // ----- reports -----
  list: (uhid) => api.get('/thyroid-ultrasounds', { params: { uhid } }),
  create: (payload) => api.post('/thyroid-ultrasounds', payload),
  getFull: (id) => api.get(`/thyroid-ultrasounds/${id}/full`),
  patch: (id, patch) => api.patch(`/thyroid-ultrasounds/${id}`, patch),
  remove: (id, reason) => api.delete(`/thyroid-ultrasounds/${id}`, { data: { reason } }),

  // ----- nodules -----
  addNodule: (id, nodule) => api.post(`/thyroid-ultrasounds/${id}/nodules`, nodule),
  updateNodule: (id, nid, patch) => api.patch(`/thyroid-ultrasounds/${id}/nodules/${nid}`, patch),
  deleteNodule: (id, nid) => api.delete(`/thyroid-ultrasounds/${id}/nodules/${nid}`),
  upsertFollicular: (id, nid, fa) => api.put(`/thyroid-ultrasounds/${id}/nodules/${nid}/follicular`, fa),

  // ----- preview / sign / reopen -----
  preview: (id) => api.post(`/thyroid-ultrasounds/${id}/preview`, {}),
  sign: (id, payload) => api.post(`/thyroid-ultrasounds/${id}/sign`, payload),
  reopen: (id) => api.post(`/thyroid-ultrasounds/${id}/reopen`, {}),

  // ----- catalogue -----
  getCatalog: (type) => api.get(`/thyroid-ultrasounds/catalog/${type}`),
  addCatalog: (type, label) => api.post(`/thyroid-ultrasounds/catalog/${type}`, { label }),
  retireCatalog: (type, id) => api.patch(`/thyroid-ultrasounds/catalog/${type}/${id}/retire`),

  // ----- images (machine-fed selection for the combined PDF) -----
  setImages: (id, images) => api.put(`/thyroid-ultrasounds/${id}/images`, { images }),
};

export default thyroidUltrasoundService;
