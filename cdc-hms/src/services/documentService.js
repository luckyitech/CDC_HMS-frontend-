import api from './api';

/**
 * Document Service
 * Handles all medical document related API calls
 *
 * Backend routes:
 * - POST   /documents              - Upload document (patient, doctor, staff)
 * - GET    /documents              - List documents with filters (uhid)
 * - PUT    /documents/:id/status   - Update status (Pending Review, Reviewed, Archived)
 * - DELETE /documents/:id          - Delete document
 * - GET    /documents/file/:filename - Serve file (authenticated)
 */

export const documentService = {
  // ============================================
  // DOCUMENT CRUD
  // ============================================

  /**
   * Get all documents with optional filters
   * @param {Object} params - Query params:
   *   - uhid: Filter by patient UHID (required for patients)
   *   - status: Filter by status
   *   - category: Filter by document category
   *   - page: Page number
   *   - limit: Items per page
   */
  getAll: (params) => api.get('/documents', { params }),

  /**
   * Get documents for a specific patient
   * @param {string} uhid - Patient UHID
   * @param {Object} params - Optional filters (status, category)
   */
  getByPatient: (uhid, params = {}) => api.get('/documents', {
    params: { uhid, ...params }
  }),

  /**
   * Upload new document
   * Uses FormData for file upload
   * @param {FormData} formData - Must contain:
   *   - file: The file to upload
   *   - uhid: Patient UHID
   *   - documentCategory: Category of document
   *   - testType: Optional test type
   *   - labName: Optional lab name
   *   - testDate: Optional test date
   *   - notes: Optional notes
   */
  upload: (formData) => api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  /**
   * Update document status (review/archive)
   * @param {number} id - Document ID
   * @param {Object} data - { status }
   *   status: "Pending Review", "Reviewed", "Archived"
   */
  updateStatus: (id, data) => api.put(`/documents/${id}/status`, data),

  /**
   * Delete document
   * @param {number} id - Document ID
   */
  delete: (id) => api.delete(`/documents/${id}`),

  /**
   * Get file URL for viewing/downloading
   * @param {string} filename - The filename stored in database
   * @returns {string} - Full URL to access the file
   */
  getFileUrl: (filename) => {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/documents/file/${filename}`;
  },

  /**
   * Fetch file directly (for authenticated access)
   * @param {string} filename - The filename
   * @returns {Blob} - File blob
   */
  getFile: (filename) => api.get(`/documents/file/${filename}`, {
    responseType: 'blob',
  }),
};

export default documentService;
