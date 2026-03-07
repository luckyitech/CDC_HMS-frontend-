import api from './api';

/**
 * Lab Service
 * Handles all lab test related API calls
 *
 * Backend routes:
 * - POST   /lab-tests           - Order new test (doctor, needs uhid, testType, sampleType, priority)
 * - GET    /lab-tests/stats     - Statistics
 * - GET    /lab-tests/pending   - Pending/In-Progress tests
 * - GET    /lab-tests/critical  - Critical results
 * - GET    /lab-tests           - List with filters (uhid, status, testType, priority, page, limit)
 * - GET    /lab-tests/:id       - Get single test
 * - PUT    /lab-tests/:id       - Update (enter results, change status, etc.)
 * - DELETE /lab-tests/:id       - Delete
 */

export const labService = {
  // ============================================
  // LAB TESTS CRUD
  // ============================================

  /**
   * Get all lab tests with optional filters
   * @param {Object} params - Query params:
   *   - uhid: Filter by patient UHID
   *   - status: Filter by status (Pending, Sample Collected, In Progress, Completed)
   *   - testType: Filter by test type
   *   - priority: Filter by priority (Routine, Urgent, STAT)
   *   - page: Page number (default 1)
   *   - limit: Items per page (default 20)
   */
  getAll: (params) => api.get('/lab-tests', { params }),

  /**
   * Get single lab test by ID
   * @param {number} id - Lab test ID
   */
  getById: (id) => api.get(`/lab-tests/${id}`),

  /**
   * Get lab tests for a specific patient (uses query param filter)
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters (status, testType)
   */
  getByPatient: (uhid, params = {}) => api.get('/lab-tests', {
    params: { uhid, ...params }
  }),

  /**
   * Order new lab test (doctor creates test order)
   * @param {Object} data - Required fields:
   *   - uhid: Patient UHID
   *   - testType: Type of test (e.g., "HbA1c", "Fasting Blood Sugar")
   *   - sampleType: Sample type (e.g., "Blood", "Urine")
   *   - priority: Optional (Routine, Urgent, STAT) - defaults to Routine
   *   - notes: Optional notes
   * Note: orderedById is auto-assigned from JWT token
   */
  order: (data) => api.post('/lab-tests', data),

  /**
   * Update lab test (use for entering results AND status changes)
   * @param {number} id - Lab test ID
   * @param {Object} data - Fields to update:
   *   - status: New status
   *   - sampleCollected: Boolean
   *   - collectionDate: Date string
   *   - results: JSON object with test results
   *   - normalRange: String
   *   - interpretation: "Normal", "Abnormal", "Critical", etc.
   *   - isCritical: Boolean
   *   - technicianNotes: Notes from lab tech
   *   - completedBy: Name of person who completed test
   *   - completedDate: Date string
   *   - reportGenerated: Boolean
   */
  update: (id, data) => api.put(`/lab-tests/${id}`, data),

  /**
   * Get pending lab tests (via dedicated endpoint)
   * Returns tests with status: Pending, Sample Collected, In Progress
   * @param {Object} params - Optional (page, limit)
   */
  getPending: (params) => api.get('/lab-tests/pending', { params }),

  /**
   * Get critical lab tests
   * Returns completed tests where isCritical = true
   */
  getCritical: () => api.get('/lab-tests/critical'),

  /**
   * Get lab statistics
   * @returns {Object} - { totalTests, completed, pending, critical, normal, abnormal }
   */
  getStats: () => api.get('/lab-tests/stats'),

  /**
   * Delete lab test
   * @param {number} id - Lab test ID
   */
  delete: (id) => api.delete(`/lab-tests/${id}`),
};

export default labService;
