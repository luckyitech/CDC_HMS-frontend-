import api from './api';

/**
 * Dermatology — the skin record (specialist module, 7 Oct 2026).
 * Every route answers 404 while the clinic has the module switched off.
 *
 * - GET  /derm/patients/:uhid/findings           - case board (?includeErrors=true)
 * - POST /derm/patients/:uhid/findings           - new finding + today's first look
 * - GET  /derm/findings/:id                      - finding + timeline + amendment trail
 * - PUT  /derm/findings/:id                      - change what/where (reason unless creator same day)
 * - PUT  /derm/findings/:id/today                - record / correct today's look
 * - POST /derm/findings/:id/entered-in-error     - { reason }
 * - PUT  /derm/observations/:id                  - amend an earlier look (reason required)
 * - POST /derm/observations/:id/entered-in-error - { reason }
 *
 *
 * Phase 2 — photos (doctor / derm.record only) and consent:
 * - GET  /derm/patients/:uhid/consent            - { current, history }
 * - POST /derm/patients/:uhid/consent            - { clinical, teaching, note }
 * - GET  /derm/patients/:uhid/photos             - metadata (?findingId=)
 * - POST /derm/findings/:id/photos               - multipart: photo (JPEG), photoType, marker
 * - GET  /derm/photos/:id/file                   - the picture (every opening logged)
 * - GET  /derm/photos/:id/views                  - who opened it
 * - PUT  /derm/photos/:id/marker                 - uploader, same day
 * - POST /derm/photos/:id/entered-in-error       - { reason }
 *
 * Phase 3 — procedures (recorded, not billed):
 * - GET  /derm/procedure-list                    - the clinic's list
 * - GET  /derm/patients/:uhid/procedures         - (?includeErrors=true)
 * - POST /derm/patients/:uhid/procedures         - { name, details, findingIds }
 * - PUT  /derm/procedures/:id                    - edit (author, same day) / amend ({ reason })
 * - POST /derm/procedures/:id/entered-in-error   - { reason }
 * The list itself is kept in System Settings: settingsService.setDermProcedures.
 *
 * Phase 4 — skin visits (Visit History, generated note, "All skin visits"):
 * - GET  /derm/patients/:uhid/visits             - { days, grid, canViewPhotos } (?date= → { day })
 *
 * Today's whole-skin exam (9 Oct 2026) — hair, nails, lymph nodes, mucosa:
 * - GET  /derm/patients/:uhid/skin-exam          - { today, date, exam, amendments, mode } (?date=)
 * - PUT  /derm/patients/:uhid/skin-exam          - record / correct today's (author, same day)
 * - PUT  /derm/skin-exams/:id                    - amend ({ …exam, reason })
 *
 * Each call returns the API body { success, data } — read `.data`.
 */
export const dermService = {
  getBoard: (uhid, { includeErrors = false } = {}) =>
    api.get(`/derm/patients/${encodeURIComponent(uhid)}/findings`, { params: includeErrors ? { includeErrors: 'true' } : {} }),
  createFinding: (uhid, payload) => api.post(`/derm/patients/${encodeURIComponent(uhid)}/findings`, payload),
  getFinding: (id) => api.get(`/derm/findings/${id}`),
  updateFinding: (id, changes) => api.put(`/derm/findings/${id}`, changes),
  saveToday: (id, observation) => api.put(`/derm/findings/${id}/today`, observation),
  findingInError: (id, reason) => api.post(`/derm/findings/${id}/entered-in-error`, { reason }),
  amendObservation: (id, changes) => api.put(`/derm/observations/${id}`, changes),
  observationInError: (id, reason) => api.post(`/derm/observations/${id}/entered-in-error`, { reason }),

  vocabulary: () => api.get('/derm/vocabulary'),
  getSkinExam: (uhid, date) => api.get(`/derm/patients/${encodeURIComponent(uhid)}/skin-exam`, { params: date ? { date } : {} }),
  saveSkinExam: (uhid, exam) => api.put(`/derm/patients/${encodeURIComponent(uhid)}/skin-exam`, exam),
  amendSkinExam: (id, exam) => api.put(`/derm/skin-exams/${id}`, exam),
  // Area photos — attached to body areas before (or without) a finding (8 Oct 2026)
  uploadAreaPhoto: (uhid, blob, { photoType, marker, regions }) => {
    const form = new FormData();
    form.append('photo', blob, 'skin.jpg');
    form.append('photoType', photoType || 'close_up');
    if (marker) form.append('marker', JSON.stringify(marker));
    form.append('regions', JSON.stringify(regions || []));
    return api.post(`/derm/patients/${encodeURIComponent(uhid)}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  linkPhoto: (photoId, findingId) => api.put(`/derm/photos/${photoId}/link`, { findingId }),
  // Phone hand-off: a one-time QR link the computer watches
  createCapture: (uhid, { regions, findingId, purpose }) => api.post(`/derm/patients/${encodeURIComponent(uhid)}/capture`, { regions, findingId, purpose }),
  getCapture: (id) => api.get(`/derm/capture/${id}`),
  updateCapture: (id, regions) => api.put(`/derm/capture/${id}`, { regions }),
  closeCapture: (id) => api.post(`/derm/capture/${id}/close`),

  getConsent: (uhid) => api.get(`/derm/patients/${encodeURIComponent(uhid)}/consent`),
  recordConsent: (uhid, consent) => api.post(`/derm/patients/${encodeURIComponent(uhid)}/consent`, consent),
  listPhotos: (uhid, { findingId } = {}) => api.get(`/derm/patients/${encodeURIComponent(uhid)}/photos`, { params: findingId ? { findingId } : {} }),
  uploadPhoto: (findingId, blob, { photoType, marker, regions }) => {
    const form = new FormData();
    form.append('photo', blob, 'skin.jpg');
    form.append('photoType', photoType || 'close_up');
    if (marker) form.append('marker', JSON.stringify(marker));
    if (regions && regions.length) form.append('regions', JSON.stringify(regions));   // the finding's areas it shows; none = overview
    // The api instance defaults to JSON; multipart must be named so axios
    // hands the FormData over and the browser adds the boundary.
    return api.post(`/derm/findings/${findingId}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  /** The picture as a Blob (served behind login — an <img src> can't carry the token). Logged on the server. */
  photoFile: (id) => api.get(`/derm/photos/${id}/file`, { responseType: 'blob' }),
  photoViews: (id) => api.get(`/derm/photos/${id}/views`),
  setMarker: (id, marker) => api.put(`/derm/photos/${id}/marker`, { marker }),
  photoInError: (id, reason) => api.post(`/derm/photos/${id}/entered-in-error`, { reason }),

  getVisits: (uhid, { date } = {}) =>
    api.get(`/derm/patients/${encodeURIComponent(uhid)}/visits`, { params: date ? { date } : {} }),

  procedureList: () => api.get('/derm/procedure-list'),
  listProcedures: (uhid, { includeErrors = false } = {}) =>
    api.get(`/derm/patients/${encodeURIComponent(uhid)}/procedures`, { params: includeErrors ? { includeErrors: 'true' } : {} }),
  createProcedure: (uhid, payload) => api.post(`/derm/patients/${encodeURIComponent(uhid)}/procedures`, payload),
  updateProcedure: (id, changes) => api.put(`/derm/procedures/${id}`, changes),
  procedureInError: (id, reason) => api.post(`/derm/procedures/${id}/entered-in-error`, { reason }),
};

export default dermService;
