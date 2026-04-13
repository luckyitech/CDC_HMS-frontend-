import api from './api';

/**
 * Treatment Plan Service
 * Handles all treatment plan related API calls
 *
 * Backend routes:
 * - POST   /treatment-plans          - Create (doctor, needs uhid, diagnosis, plan)
 * - GET    /treatment-plans/stats    - Statistics
 * - GET    /treatment-plans          - List with filters (uhid required)
 * - GET    /treatment-plans/:id      - Get single plan
 * - PUT    /treatment-plans/:id/status - Update status only (Active, Completed)
 * - DELETE /treatment-plans/:id      - Delete plan
 *
 * Note: Creating a new plan auto-completes all previous Active plans for same patient
 */

export const treatmentPlanService = {
  // ============================================
  // TREATMENT PLAN CRUD
  // ============================================

  /**
   * Get all treatment plans with optional filters
   * @param {Object} params - Query params:
   *   - uhid: Patient UHID (REQUIRED)
   *   - page: Page number
   *   - limit: Items per page
   */
  getAll: (params) => api.get('/treatment-plans', { params }),

  /**
   * Get single treatment plan by ID
   * @param {number} id - Treatment plan ID
   */
  getById: (id) => api.get(`/treatment-plans/${id}`),

  /**
   * Get treatment plans for a specific patient (uses query param filter)
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters (status)
   */
  getByPatient: (uhid, params = {}) => api.get('/treatment-plans', {
    params: { uhid, ...params }
  }),

  /**
   * Get active treatment plans for a patient (convenience method)
   * @param {string} uhid - Patient UHID
   */
  getActive: (uhid) => api.get('/treatment-plans', {
    params: { uhid, status: 'Active' }
  }),

  /**
   * Create new treatment plan
   * Note: Creating a new plan auto-completes previous Active plans for same patient
   * @param {Object} data - Required fields:
   *   - uhid: Patient UHID
   *   - diagnosis: Diagnosis text
   *   - plan: Treatment plan text
   * Note: doctorId is auto-assigned from JWT token
   */
  create: (data) => api.post('/treatment-plans', data),

  /**
   * Update treatment plan diagnosis and/or plan text
   * @param {number} id - Treatment plan ID
   * @param {Object} data - { diagnosis?, plan? }
   */
  update: (id, data) => api.put(`/treatment-plans/${id}`, data),

  /**
   * Update treatment plan status
   * @param {number} id - Treatment plan ID
   * @param {Object} data - { status }
   *   status: "Active", "Completed"
   */
  updateStatus: (id, data) => api.put(`/treatment-plans/${id}/status`, data),

  /**
   * Delete treatment plan
   * @param {number} id - Treatment plan ID
   */
  delete: (id) => api.delete(`/treatment-plans/${id}`),

  /**
   * Get treatment plan statistics
   */
  getStats: () => api.get('/treatment-plans/stats'),
};

export default treatmentPlanService;
