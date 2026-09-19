import api from './api';

/**
 * Lab Inbox Service — external lab-report PDFs pulled from the clinic mailbox,
 * waiting to be paired to a patient.
 *
 * Backend routes (all under /api/lab-inbox, staff / lab / admin):
 * - GET  /lab-inbox?status=New|Matched|Discarded|All  — list items
 * - GET  /lab-inbox/count                             — New count + sync status
 * - GET  /lab-inbox/:id/file                          — the staged PDF (authenticated)
 * - POST /lab-inbox/poll                              — "Pull now"
 * - POST /lab-inbox/:id/match                         — pair → creates a MedicalDocument
 * - POST /lab-inbox/:id/discard                       — soft-discard a wrong pull
 */
export const labInboxService = {
  /** @param {'New'|'Matched'|'Discarded'|'All'} status */
  list: (status = 'New') => api.get('/lab-inbox', { params: { status } }),

  /** { count, lastPoll, isConfigured, autoImport, pollIntervalMin } */
  count: () => api.get('/lab-inbox/count'),

  /** The staged PDF as a Blob — callers turn it into an object URL for an <iframe>. */
  getFile: (id) => api.get(`/lab-inbox/${id}/file`, { responseType: 'blob' }),

  /** Manual mailbox check. Resolves to the poll summary. */
  poll: () => api.post('/lab-inbox/poll'),

  /**
   * Pair a report to a patient. Creates the MedicalDocument (category defaults
   * to "Lab Report - External", status "Pending Review") and marks the item Matched.
   * @param {number} id
   * @param {{ uhid: string, category?: string, testType?: string, labName?: string, testDate?: string, notes?: string }} data
   */
  match: (id, data) => api.post(`/lab-inbox/${id}/match`, data),

  /** Soft-discard (kept for audit, never deleted). */
  discard: (id, reason) => api.post(`/lab-inbox/${id}/discard`, { reason }),
};

export default labInboxService;
