import api from './api';

/**
 * Queue Service
 * Handles all queue-related API calls
 */

export const queueService = {
  /**
   * Get all queue items for today
   * @returns {Array} - List of queue items with patient info
   */
  getAll: () => api.get('/queue'),

  /**
   * Add patient to queue
   * @param {Object} data - { uhid, priority, reason, assignedDoctorId }
   * priority: "Normal" or "Urgent"
   */
  add: (data) => api.post('/queue', data),

  /**
   * Update queue item status
   * @param {number} id - Queue item ID
   * @param {Object} data - { status, assignedDoctorId }
   * status: "Waiting", "In Triage", "With Doctor", "Completed"
   */
  update: (id, data) => api.put(`/queue/${id}`, data),

  /**
   * Remove patient from queue (soft-delete — keeps record for audit)
   * @param {number} id - Queue item ID
   * @param {string} reason - Reason for removal
   */
  remove: (id, reason) => api.delete(`/queue/${id}`, { data: { reason } }),

  /**
   * Get queue statistics
   * @returns {Object} - { waiting, inTriage, withDoctor, completed, avgWaitTime }
   */
  getStats: () => api.get('/queue/stats'),

  /**
   * Call next patient (gets next "Waiting" patient)
   * @returns {Object} - The next queue item
   */
  callNext: () => api.post('/queue/call-next'),

  /**
   * Refer a patient to another doctor or an external facility.
   * @param {number} id - Queue item ID
   * @param {Object} data
   *   Internal:  { referralType: 'Internal', referralReason, referredToDoctorId, referredToDoctorName }
   *   External:  { referralType: 'External', referralReason, externalReferralTarget }
   */
  refer: (id, data) => api.post(`/queue/${id}/refer`, data),

  /**
   * Save & Print the referral NOTE without finalising the referral or moving to
   * billing (mirrors admissions saveNote). Persists it for the letterhead print
   * and the Visit History Actions tab.
   * @param {number} id - Queue item ID
   * @param {Object} data - { referralNote, referralType }
   */
  saveReferralNote: (id, data) => api.post(`/queue/${id}/refer-note`, data),

  /**
   * Referral notes documented for one patient — Visit History Actions.
   * @param {string} uhid
   */
  advisedReferrals: (uhid) => api.get('/queue/advised-referrals', { params: { uhid } }),
};

export default queueService;
