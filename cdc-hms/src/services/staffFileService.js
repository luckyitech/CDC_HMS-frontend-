import api from './api';

/**
 * Staff File service — admin-only. Backs the /admin/staff/:id file:
 * the staff member's account + profile, their documents, and permission edits.
 * Activity is served by the existing activityService (?staff=<name>).
 */
export const staffFileService = {
  // ── Overview ──────────────────────────────────────────────────────────────
  // GET /api/users/:id → { success, data: { user } }
  getUser: (id) => api.get(`/users/${id}`),

  // Update account/profile fields (position, department, shift, etc.).
  // Reuses PUT /api/users/:id, the same endpoint the Manage Users edit modal uses.
  updateUser: (id, changes) => api.put(`/users/${id}`, changes),

  // ── Permissions ───────────────────────────────────────────────────────────
  // Server enforces "admin account only" — this just sends the new list.
  setPermissions: (id, permissions) => api.put(`/users/${id}`, { permissions }),

  // ── Account actions (relocated from the Manage Users row icons) ────────────
  resetPassword: (email) => api.post('/auth/forgot-password', { email }),
  setStatus: (id, isActive) => api.put(`/users/${id}/status`, { isActive }),
  deleteUser: (id) => api.delete(`/users/${id}`),

  // ── Documents ─────────────────────────────────────────────────────────────
  // GET /api/staff-documents?staffUserId=&archived=
  listDocuments: (staffUserId, archived = false) =>
    api.get('/staff-documents', { params: { staffUserId, archived } }),

  // Upload — multipart/form-data. Caller builds the FormData (file + fields).
  uploadDocument: (formData) =>
    api.post('/staff-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  archiveDocument: (id, reason) => api.put(`/staff-documents/${id}/archive`, { reason }),
  restoreDocument: (id) => api.put(`/staff-documents/${id}/restore`, {}),

  // Fetch a document as a blob (auth header is added by the api interceptor) and
  // open it in a new tab. Files are served only through the authenticated route,
  // so a plain link would 401.
  viewDocument: async (fileUrl) => {
    const filename = fileUrl.split('/').pop();
    const blob = await api.get(`/staff-documents/file/${filename}`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    // Revoke a little later so the new tab has time to load it.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export default staffFileService;
