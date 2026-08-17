import api from './api';

/**
 * Ultrasound Service (HMIS V4)
 * Images auto-ingested from the HS70A via the clinic DICOM bridge.
 *
 * Backend routes:
 * - GET /ultrasound?uhid=...          - Patient's images (doctor, nurse, admin)
 * - GET /ultrasound?unassigned=1      - Unassigned queue
 * - GET /ultrasound/file/:filename    - Serve image (authenticated)
 * - PUT /ultrasound/:id/assign        - Link unassigned image to patient
 * - PUT /ultrasound/:id/archive       - Admin soft-delete
 */
export const ultrasoundService = {
  /** All images for a patient, in received order (the PDF export order). */
  getByPatient: (uhid) => api.get('/ultrasound', { params: { uhid } }),

  /** The unassigned queue (images whose DICOM patient id matched no UHID). */
  getUnassigned: () => api.get('/ultrasound', { params: { unassigned: 1 } }),

  /** Ultrasound Studio worklist — all received images grouped into studies. */
  getStudies: () => api.get('/ultrasound/studies'),

  /** Machine inbox — everything received, until explicitly removed from the list. */
  getInbox: () => api.get('/ultrasound', { params: { inbox: 1 } }),

  /** Explicitly remove images from the inbox list (the only way rows leave it). */
  dismissInbox: (ids) => api.put('/ultrasound/inbox-dismiss', { ids }),

  /**
   * Fetch an image as a Blob (files are served authenticated, so a plain
   * <img src> cannot carry the JWT — callers create an object URL instead).
   */
  getFile: (filename) => api.get(`/ultrasound/file/${filename}`, {
    responseType: 'blob',
  }),

  /** Extract the stored filename from a row's fileUrl. */
  filenameFromUrl: (fileUrl) => (fileUrl || '').split('/').pop(),

  /** Manually link an unassigned image to a patient. */
  assign: (id, uhid) => api.put(`/ultrasound/${id}/assign`, { uhid }),

  /** Admin soft-delete (never hard-delete). */
  archive: (id, reason) => api.put(`/ultrasound/${id}/archive`, { reason }),
};

export default ultrasoundService;
