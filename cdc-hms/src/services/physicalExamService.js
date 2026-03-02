import api from './api';

/**
 * Physical Exam Service
 * Handles all physical examination related API calls
 *
 * Backend routes:
 * - POST   /physical-exams     - Create (doctor only, needs uhid, examFindings)
 * - GET    /physical-exams     - List with filters (uhid required, search optional)
 * - GET    /physical-exams/:id - Get single exam
 * - PUT    /physical-exams/:id - Update exam
 * - DELETE /physical-exams/:id - Delete exam
 */

export const physicalExamService = {
  // ============================================
  // PHYSICAL EXAM CRUD
  // ============================================

  /**
   * Get all physical examinations with optional filters
   * @param {Object} params - Query params:
   *   - uhid: Patient UHID (REQUIRED)
   *   - search: Search across all body system fields
   *   - page: Page number
   *   - limit: Items per page
   */
  getAll: (params) => api.get('/physical-exams', { params }),

  /**
   * Get single physical exam by ID
   * @param {number} id - Physical exam ID
   */
  getById: (id) => api.get(`/physical-exams/${id}`),

  /**
   * Get physical exams for a specific patient (uses query param filter)
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters (search)
   */
  getByPatient: (uhid, params = {}) => api.get('/physical-exams', {
    params: { uhid, ...params }
  }),

  /**
   * Search physical exams for a patient
   * @param {string} uhid - Patient UHID
   * @param {string} searchTerm - Search term
   */
  search: (uhid, searchTerm) => api.get('/physical-exams', {
    params: { uhid, search: searchTerm }
  }),

  /**
   * Create new physical examination
   * @param {Object} data - Required fields:
   *   - uhid: Patient UHID
   *   - examFindings: Overall exam findings (required)
   *   - generalAppearance, cardiovascular, respiratory, etc. (optional)
   * Note: doctorId is auto-assigned from JWT token
   */
  create: (data) => api.post('/physical-exams', data),

  /**
   * Update physical examination
   * @param {number} id - Physical exam ID
   * @param {Object} data - Updated fields
   */
  update: (id, data) => api.put(`/physical-exams/${id}`, data),

  /**
   * Delete physical examination
   * @param {number} id - Physical exam ID
   */
  delete: (id) => api.delete(`/physical-exams/${id}`),
};

export default physicalExamService;
