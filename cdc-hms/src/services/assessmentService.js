import api from './api';

/**
 * Assessment Service
 * Handles all initial assessment related API calls
 *
 * Backend routes:
 * - POST   /assessments     - Create (doctor, needs uhid, hpi, ros)
 * - GET    /assessments     - List with filters (uhid required)
 * - GET    /assessments/:id - Get single assessment
 * - PUT    /assessments/:id - Update assessment
 * - DELETE /assessments/:id - Delete assessment
 */

export const assessmentService = {
  // ============================================
  // ASSESSMENT CRUD
  // ============================================

  /**
   * Get all assessments with optional filters
   * @param {Object} params - Query params:
   *   - uhid: Patient UHID (REQUIRED)
   *   - page: Page number
   *   - limit: Items per page
   */
  getAll: (params) => api.get('/assessments', { params }),

  /**
   * Get single assessment by ID
   * @param {number} id - Assessment ID
   */
  getById: (id) => api.get(`/assessments/${id}`),

  /**
   * Get assessments for a specific patient (uses query param filter)
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters
   */
  getByPatient: (uhid, params = {}) => api.get('/assessments', {
    params: { uhid, ...params }
  }),

  /**
   * Create new assessment
   * @param {Object} data - Required fields:
   *   - uhid: Patient UHID
   *   - hpi: History of Present Illness
   *   - ros: Review of Systems
   *   - pastMedicalHistory: Optional
   *   - familyHistory: Optional
   *   - socialHistory: Optional
   * Note: doctorId is auto-assigned from JWT token
   */
  create: (data) => api.post('/assessments', data),

  /**
   * Update assessment
   * @param {number} id - Assessment ID
   * @param {Object} data - Updated fields
   */
  update: (id, data) => api.put(`/assessments/${id}`, data),

  /**
   * Delete assessment
   * @param {number} id - Assessment ID
   */
  delete: (id) => api.delete(`/assessments/${id}`),
};

export default assessmentService;
