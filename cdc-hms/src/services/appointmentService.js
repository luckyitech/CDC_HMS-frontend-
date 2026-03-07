import api from './api';

/**
 * Appointment Service
 * Handles all appointment related API calls
 *
 * Backend routes:
 * - POST   /appointments           - Book appointment (patient only)
 * - GET    /appointments/stats     - Statistics
 * - GET    /appointments           - List with filters (uhid, doctor, date, status, page, limit)
 * - PUT    /appointments/:id/status - Update status (scheduled, checked-in, completed, cancelled)
 */

export const appointmentService = {
  // ============================================
  // APPOINTMENT OPERATIONS
  // ============================================

  /**
   * Get all appointments with optional filters
   * @param {Object} params - Query params:
   *   - uhid: Filter by patient UHID
   *   - doctor: Filter by doctor ID
   *   - date: Filter by date (YYYY-MM-DD) or "today"
   *   - status: Filter by status (scheduled, checked-in, completed, cancelled)
   *   - page: Page number (default 1)
   *   - limit: Items per page (default 20)
   */
  getAll: (params) => api.get('/appointments', { params }),

  /**
   * Get appointments for a specific patient (uses query param filter)
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters (status, date)
   */
  getByPatient: (uhid, params = {}) => api.get('/appointments', {
    params: { uhid, ...params }
  }),

  /**
   * Get appointments for a specific doctor (uses query param filter)
   * @param {number} doctorId - Doctor ID
   * @param {Object} params - Optional filters (date, status)
   */
  getByDoctor: (doctorId, params = {}) => api.get('/appointments', {
    params: { doctor: doctorId, ...params }
  }),

  /**
   * Get appointments for a specific date
   * @param {string} date - Date in YYYY-MM-DD format or "today"
   */
  getByDate: (date) => api.get('/appointments', { params: { date } }),

  /**
   * Get today's appointments
   */
  getTodays: () => api.get('/appointments', { params: { date: 'today' } }),

  /**
   * Book new appointment (patient only)
   * @param {Object} data - Required fields:
   *   - doctorId: Doctor's user ID
   *   - date: Appointment date (YYYY-MM-DD)
   *   - timeSlot: Time slot (e.g., "9:00 AM")
   *   - appointmentType: Type (consultation, follow-up, check-up, emergency)
   *   - reason: Reason for appointment
   *   - notes: Additional notes (optional)
   * Note: PatientId is auto-assigned from JWT token
   */
  book: (data) => api.post('/appointments', data),

  /**
   * Update appointment status
   * @param {number} id - Appointment ID
   * @param {Object} data - { status }
   *   status: "scheduled", "checked-in", "completed", "cancelled"
   *
   * Note: For check-in, appointment must be today and currently scheduled
   */
  updateStatus: (id, data) => api.put(`/appointments/${id}/status`, data),

  /**
   * Check in patient for appointment (convenience method)
   * @param {number} id - Appointment ID
   */
  checkIn: (id) => api.put(`/appointments/${id}/status`, { status: 'checked-in' }),

  /**
   * Cancel appointment (convenience method)
   * @param {number} id - Appointment ID
   */
  cancel: (id) => api.put(`/appointments/${id}/status`, { status: 'cancelled' }),

  /**
   * Complete appointment (convenience method)
   * @param {number} id - Appointment ID
   */
  complete: (id) => api.put(`/appointments/${id}/status`, { status: 'completed' }),

  /**
   * Get appointment statistics
   * @returns {Object} - { total, scheduled, checkedIn, completed, cancelled, today, todayScheduled, todayCheckedIn }
   */
  getStats: () => api.get('/appointments/stats'),
};

export default appointmentService;
