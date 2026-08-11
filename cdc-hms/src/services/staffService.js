import api from './api';

/**
 * Staff Service
 * Handles the admin-side staff profile API.
 *
 * Routes resolve on employeeId (EMP014) rather than the database PK, matching
 * the way patient routes resolve on uhid.
 */
export const staffService = {
  /**
   * List staff with optional filters.
   * @param {Object} params - { role, department, ward, status, search, includeArchived }
   */
  getAll: (params) => api.get('/staff', { params }),

  /**
   * Full profile for one staff member.
   * @param {string} employeeId - e.g. "EMP014"
   */
  getByEmployeeId: (employeeId) => api.get(`/staff/${employeeId}`),

  /**
   * Update profile and/or account fields.
   * @param {string} employeeId
   * @param {Object} data - Only the fields being changed
   */
  update: (employeeId, data) => api.put(`/staff/${employeeId}`, data),

  /**
   * Change employment status. The backend keeps User.isActive in step —
   * 'On Leave' still permits login, 'Suspended' and the exit statuses do not.
   * @param {string} employeeId
   * @param {string} employmentStatus
   */
  updateStatus: (employeeId, employmentStatus) =>
    api.patch(`/staff/${employeeId}/status`, { employmentStatus }),

  /**
   * Archive. Never destroys the record — their name stays on past
   * prescriptions, notes and lab results.
   */
  archive: (employeeId) => api.delete(`/staff/${employeeId}`),

  /** Undo an archive. Login stays disabled until reactivated deliberately. */
  restore: (employeeId) => api.patch(`/staff/${employeeId}/restore`),

  /** Licences expired or expiring within 60 days. */
  getExpiringLicences: () => api.get('/staff/expiring-licences'),

  /** Login and edit history for the Activity tab. */
  getActivity: (employeeId, limit = 25) =>
    api.get(`/staff/${employeeId}/activity`, { params: { limit } }),
};

export default staffService;
