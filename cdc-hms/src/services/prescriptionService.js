import api from './api';

/**
 * Prescription Service
 * Handles all prescription related API calls
 *
 * Backend routes:
 * - POST   /prescriptions           - Create (doctor only, needs patientId)
 * - GET    /prescriptions/stats     - Statistics (total, active, completed, cancelled)
 * - GET    /prescriptions           - List with filters (patientUhid, doctorId, status, page, limit)
 * - GET    /prescriptions/:id       - Get single prescription
 * - PUT    /prescriptions/:id       - Update (includes status changes)
 * - DELETE /prescriptions/:id       - Delete
 */

export const prescriptionService = {
  // ============================================
  // PRESCRIPTION CRUD
  // ============================================

  /**
   * Get all prescriptions with optional filters
   * @param {Object} params - Query params:
   *   - patientUhid: Filter by patient UHID
   *   - doctorId: Filter by doctor ID
   *   - status: Filter by status (Active, Completed, Cancelled)
   *   - page: Page number (default 1)
   *   - limit: Items per page (default 20)
   */
  getAll: (params) => api.get('/prescriptions', { params }),

  /**
   * Get single prescription by ID
   * @param {number} id - Prescription ID
   */
  getById: (id) => api.get(`/prescriptions/${id}`),

  /**
   * Get prescriptions for a specific patient (uses query param filter)
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters (status)
   */
  getByPatient: (uhid, params = {}) => api.get('/prescriptions', {
    params: { patientUhid: uhid, ...params }
  }),

  /**
   * Create new prescription
   * @param {Object} data - Required fields:
   *   - patientId: Patient database ID (NOT UHID)
   *   - diagnosis: Diagnosis text
   *   - medications: Array of { name, dosage, frequency, duration, instructions }
   *   - notes: Optional notes
   * Note: doctorId is auto-assigned from JWT token
   */
  create: (data) => api.post('/prescriptions', data),

  /**
   * Update prescription (use for both field updates AND status changes)
   * @param {number} id - Prescription ID
   * @param {Object} data - Updated fields (status, medications, diagnosis, notes, etc.)
   */
  update: (id, data) => api.put(`/prescriptions/${id}`, data),

  /**
   * Delete prescription
   * @param {number} id - Prescription ID
   */
  delete: (id) => api.delete(`/prescriptions/${id}`),

  /**
   * Get active prescriptions for a patient
   * @param {string} uhid - Patient UHID
   */
  getActive: (uhid) => api.get('/prescriptions', {
    params: { patientUhid: uhid, status: 'Active' }
  }),

  /**
   * Get prescription statistics
   * @returns {Object} - { total, active, completed, cancelled }
   */
  getStats: () => api.get('/prescriptions/stats'),
};

export default prescriptionService;
