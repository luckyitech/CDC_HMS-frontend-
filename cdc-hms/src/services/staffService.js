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

  // ============================================
  // ACCESS
  // ============================================

  /** The permission vocabulary, so the UI doesn't keep its own copy. */
  getPermissionCatalog: () => api.get('/staff/permissions/catalog'),

  /**
   * Replace the granted permission list, and optionally the withdrawn one.
   * Server-side this requires a real admin account, not merely someone holding
   * admin.access.
   *
   * `deniedPermissions` is omitted rather than sent empty when a caller only
   * means to change grants — the server leaves withdrawals untouched when the
   * key is absent, so an older caller cannot silently clear them.
   */
  updatePermissions: (employeeId, permissions, deniedPermissions) =>
    api.patch(`/staff/${employeeId}/permissions`,
      deniedPermissions === undefined
        ? { permissions }
        : { permissions, deniedPermissions }),

  // ============================================
  // LEAVE
  // ============================================

  /** Balance and history for a year. */
  getLeaves: (employeeId, year) =>
    api.get(`/staff/${employeeId}/leaves`, { params: { year } }),

  /** An admin's entry is approved immediately; a staff member's is Pending. */
  createLeave: (employeeId, data) => api.post(`/staff/${employeeId}/leaves`, data),

  /** Approve, reject or cancel. Approving a doctor's leave blocks their slots. */
  decideLeave: (employeeId, id, status, decisionNote) =>
    api.patch(`/staff/${employeeId}/leaves/${id}`, { status, decisionNote }),

  setLeaveBalances: (employeeId, year, balances) =>
    api.put(`/staff/${employeeId}/leave-balances`, { year, balances }),

  // ============================================
  // DOCUMENTS
  // ============================================

  /** @param {boolean} archived - admin only; archived documents are hidden by default */
  getDocuments: (employeeId, archived = false) =>
    api.get(`/staff/${employeeId}/documents`, { params: archived ? { archived: 'true' } : {} }),

  /**
   * @param {File} file
   * @param {{ category?: string, visibility?: string, notes?: string }} meta
   */
  uploadDocument: (employeeId, file, meta = {}) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(meta).forEach(([k, v]) => { if (v) form.append(k, v); });

    // Content-Type is left unset on purpose — the browser has to add the
    // multipart boundary, and naming the type here overwrites it and breaks
    // the upload.
    return api.post(`/staff/${employeeId}/documents`, form);
  },

  updateDocument: (employeeId, id, data) =>
    api.patch(`/staff/${employeeId}/documents/${id}`, data),

  archiveDocument: (employeeId, id, reason) =>
    api.delete(`/staff/${employeeId}/documents/${id}`, { data: { reason } }),

  restoreDocument: (employeeId, id) =>
    api.patch(`/staff/${employeeId}/documents/${id}/restore`),

  /** Files stream through an authenticated route, so this fetches a blob. */
  downloadDocument: (employeeId, id) =>
    api.get(`/staff/${employeeId}/documents/${id}/file`, { responseType: 'blob' }),
};

export default staffService;
