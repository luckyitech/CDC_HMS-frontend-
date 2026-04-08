import api from './api';

/**
 * Consultation Notes Service
 * Handles all consultation notes related API calls
 *
 * Backend routes:
 * - POST   /consultation-notes     - Create (doctor, needs uhid, notes, assessment, plan)
 * - GET    /consultation-notes     - List with filters (uhid required, search optional)
 * - GET    /consultation-notes/:id - Get single note
 * - PUT    /consultation-notes/:id - Update note
 * - DELETE /consultation-notes/:id - Delete note
 */

export const consultationNotesService = {
  // ============================================
  // CONSULTATION NOTES CRUD
  // ============================================

  /**
   * Get all consultation notes with optional filters
   * @param {Object} params - Query params:
   *   - uhid: Patient UHID (REQUIRED)
   *   - search: Search in notes, assessment, plan
   *   - page: Page number
   *   - limit: Items per page
   */
  getAll: (params) => api.get('/consultation-notes', { params }),

  /**
   * Get single consultation note by ID
   * @param {number} id - Consultation note ID
   */
  getById: (id) => api.get(`/consultation-notes/${id}`),

  /**
   * Get consultation notes for a specific patient (uses query param filter)
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters (search)
   */
  getByPatient: (uhid, params = {}) => api.get('/consultation-notes', {
    params: { uhid, ...params }
  }),

  /**
   * Search consultation notes for a patient
   * @param {string} uhid - Patient UHID
   * @param {string} searchTerm - Search term
   */
  search: (uhid, searchTerm, params = {}) => api.get('/consultation-notes', {
    params: { uhid, search: searchTerm, ...params }
  }),

  /**
   * Create new consultation note
   * @param {Object} data - Required fields:
   *   - uhid: Patient UHID
   *   - notes: Consultation notes text
   *   - assessment: Clinical assessment
   *   - plan: Treatment plan
   *   - vitals: Optional JSON object
   *   - prescriptionIds: Optional array of prescription IDs
   * Note: doctorId is auto-assigned from JWT token
   */
  create: (data) => api.post('/consultation-notes', data),

  /**
   * Update consultation note
   * @param {number} id - Consultation note ID
   * @param {Object} data - Updated fields
   */
  update: (id, data) => api.put(`/consultation-notes/${id}`, data),

  /**
   * Delete consultation note
   * @param {number} id - Consultation note ID
   */
  delete: (id) => api.delete(`/consultation-notes/${id}`),
};

export default consultationNotesService;
