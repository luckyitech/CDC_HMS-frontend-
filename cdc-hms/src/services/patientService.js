import api from './api';

/**
 * Patient Service
 * Handles all patient-related API calls
 */

export const patientService = {
  // ============================================
  // PATIENT CRUD
  // ============================================

  /**
   * Get all patients with optional filters
   * @param {Object} params - Query params (search, status, diabetesType, page, limit)
   */
  getAll: (params) => api.get('/patients', { params }),

  /**
   * Get single patient by UHID
   * @param {string} uhid - Patient UHID (e.g., "CDC001")
   */
  getByUHID: (uhid) => api.get(`/patients/${uhid}`),

  /**
   * Create new patient
   * @param {Object} data - Patient data
   */
  create: (data) => api.post('/patients', data),

  /**
   * Update patient
   * @param {string} uhid - Patient UHID
   * @param {Object} data - Updated fields
   */
  update: (uhid, data) => api.put(`/patients/${uhid}`, data),

  /**
   * Delete patient
   * @param {string} uhid - Patient UHID
   */
  delete: (uhid) => api.delete(`/patients/${uhid}`),

  /**
   * Get patient statistics
   */
  getStats: () => api.get('/patients/stats'),

  // ============================================
  // VITALS
  // ============================================

  /**
   * Get patient's current vitals
   * @param {string} uhid - Patient UHID
   */
  getVitals: (uhid) => api.get(`/patients/${uhid}/vitals`),

  /**
   * Record new vitals for patient
   * @param {string} uhid - Patient UHID
   * @param {Object} data - Vitals data (bloodPressure, heartRate, temperature, etc.)
   */
  recordVitals: (uhid, data) => api.post(`/patients/${uhid}/vitals`, data),

  /**
   * Doctor records/completes vitals (all fields optional)
   * @param {string} uhid - Patient UHID
   * @param {Object} data - Vitals data (any fields, all optional)
   */
  recordVitalsDoctor: (uhid, data) => api.post(`/patients/${uhid}/vitals/doctor`, data),

  // ============================================
  // BLOOD SUGAR
  // ============================================

  /**
   * Get patient's blood sugar readings
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Query params (startDate, endDate, timeSlot)
   */
  getBloodSugar: (uhid, params) => api.get(`/patients/${uhid}/blood-sugar`, { params }),

  /**
   * Add blood sugar reading (single or bulk)
   * @param {string} uhid - Patient UHID
   * @param {Object|Array} data - Single reading { date, timeSlot, value, notes }
   *                              OR array of readings for bulk insert
   * Note: Backend handles both single object and array of readings
   */
  addBloodSugar: (uhid, data) => api.post(`/patients/${uhid}/blood-sugar`, data),

  // ============================================
  // EQUIPMENT (Insulin Pump & Transmitter)
  // ============================================

  /**
   * Get patient's medical equipment
   * @param {string} uhid - Patient UHID
   * @returns {Object} - { insulinPump: { current, transmitter }, history: [] }
   */
  getEquipment: (uhid) => api.get(`/patients/${uhid}/equipment`),

  /**
   * Add new equipment
   * @param {string} uhid - Patient UHID
   * @param {Object} data - Equipment data
   */
  addEquipment: (uhid, data) => api.post(`/patients/${uhid}/equipment`, data),

  /**
   * Update equipment
   * @param {string} uhid - Patient UHID
   * @param {number} id - Equipment ID
   * @param {Object} data - Updated fields
   */
  updateEquipment: (uhid, id, data) => api.put(`/patients/${uhid}/equipment/${id}`, data),

  /**
   * Replace equipment (archives old, creates new)
   * @param {string} uhid - Patient UHID
   * @param {number} id - Old equipment ID
   * @param {Object} data - New equipment data
   */
  replaceEquipment: (uhid, id, data) => api.post(`/patients/${uhid}/equipment/${id}/replace`, data),

  /**
   * Get equipment history (archived equipment)
   * @param {string} uhid - Patient UHID
   */
  getEquipmentHistory: (uhid) => api.get(`/patients/${uhid}/equipment/history`),
};

export default patientService;
