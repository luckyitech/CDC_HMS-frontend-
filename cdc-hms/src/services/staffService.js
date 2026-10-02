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

  /** Unified activity timeline for the Activity tab (logins + edits + clinical). */
  getActivity: (employeeId, params = {}) =>
    api.get(`/staff/${employeeId}/activity`, { params: { limit: 200, ...params } }),

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
  updatePermissions: (employeeId, permissions, deniedPermissions, staffType) => {
    const body = { permissions };
    if (deniedPermissions !== undefined) body.deniedPermissions = deniedPermissions;
    if (staffType !== undefined) body.staffType = staffType;
    return api.patch(`/staff/${employeeId}/permissions`, body);
  },

  /**
   * Classify someone clinical or non-clinical.
   *
   * Goes through the permissions route because it IS an access decision — it
   * decides whether this person can read a consultation note — so it belongs on
   * the same real-admin-only, audited path as the grants rather than on the
   * general profile update.
   *
   * `permissions` is sent unchanged rather than omitted: the endpoint requires
   * the field, and sending the current list means the classification cannot
   * disturb what has been granted.
   */
  updateStaffType: (employeeId, permissions, staffType) =>
    api.patch(`/staff/${employeeId}/permissions`, { permissions, staffType }),

  // ============================================
  // LEAVE
  // ============================================

  /** The person's leave for a year — the same overview as My leave (B27 phase 3). */
  getLeaves: (employeeId, year) =>
    api.get(`/staff/${employeeId}/leaves`, { params: { year } }),

  /** HR's calculator for recording on someone's behalf (leave.manage). */
  previewLeave: (employeeId, data) => api.post(`/staff/${employeeId}/leaves/preview`, data),

  /** Record on behalf (leave.manage): approved on the spot; never your own file. */
  createLeave: (employeeId, data) => api.post(`/staff/${employeeId}/leaves`, data),

  /** The staff photo (2 Oct 2026) — a blob through the authenticated route. */
  getPhoto: (employeeId) => api.get(`/staff/${employeeId}/photo`, { responseType: 'blob' }),
  setPhoto: (employeeId, file) => {
    const form = new FormData();
    form.append('photo', file);
    return api.put(`/staff/${employeeId}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  removePhoto: (employeeId) => api.delete(`/staff/${employeeId}/photo`),

  /** Required approvers (HR Tier 2): read with the Leave tab; set by leave.manage. */
  getRequiredApprovers: (employeeId) => api.get(`/staff/${employeeId}/required-approvers`),
  setRequiredApprovers: (employeeId, approverIds) => api.put(`/staff/${employeeId}/required-approvers`, { approverIds }),

  /** CPD for a year, read-only (the staff file's Credentials tab). */
  getCpd: (employeeId, year) =>
    api.get(`/staff/${employeeId}/cpd`, { params: year ? { year } : {} }),

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

    // Named explicitly (B27 phase 2 fix). The api instance defaults every
    // request to application/json, and with that default axios 1.x serialises
    // a FormData to JSON — the server then answered "No file uploaded". Naming
    // multipart/form-data lets axios hand the FormData over and the browser
    // add the boundary, as documentService.upload and mailService already do.
    return api.post(`/staff/${employeeId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
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
