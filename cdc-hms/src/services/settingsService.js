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

  // ---- Lab Inbox: the clinic mailbox the labs email reports to ----

  /**
   * Connection + import policy WITHOUT the password (only `hasPassword`),
   * plus `isConfigured`, `enabled`, `allowlist`, `lastPoll`.
   */
  getLabInbox: () => api.get('/settings/lab-inbox'),

  /**
   * Save any subset of: host, port, secure, user, password, mailbox, enabled,
   * pollIntervalMin, afterImport, moveFolder, allowlist[]. A blank password
   * leaves the stored one unchanged. Real-admin only.
   */
  setLabInbox: (changes) => api.put('/settings/lab-inbox', changes),

  /**
   * Try the connection with the (possibly unsaved) form values; the stored
   * password is used when none is supplied. Saves nothing.
   * @returns {Promise} - { ok, mailbox, messages, unseen }
   */
  testLabInbox: (values) => api.post('/settings/lab-inbox/test', values),
};

export default settingsService;
