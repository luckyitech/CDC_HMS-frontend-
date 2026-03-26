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
};

export default queueService;
