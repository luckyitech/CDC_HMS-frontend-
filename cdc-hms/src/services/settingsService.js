import api from './api';

/**
 * System Settings Service — admin-only system-wide switches.
 */
export const settingsService = {
  /**
   * Scheduled staff password rotation state.
   * @returns {Promise} - { success, data: { enabled, interval, intervalLabel,
   *                        intervalOptions, rotationDay, affectedRoles,
   *                        periodStart, nextRotation, dueCount, totalStaff } }
   */
  getPasswordRotation: () => api.get('/settings/password-rotation'),

  /**
   * Change the rotation setting. Pass either field or both — whatever is
   * omitted is left as it is.
   * @param {{ enabled?: boolean, interval?: 'weekly'|'fortnightly'|'monthly' }} changes
   * @returns {Promise} - same shape as getPasswordRotation
   */
  setPasswordRotation: (changes) => api.put('/settings/password-rotation', changes),
};

export default settingsService;
