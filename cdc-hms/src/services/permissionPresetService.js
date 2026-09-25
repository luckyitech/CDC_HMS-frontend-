import api from './api';

/**
 * Permission presets — the growable list of job shapes the onboarding wizard
 * applies to new hires. Reads need users.view; every write goes through the
 * server's permissions-administrator gate (a permissions.grant holder or the
 * true admin), the same gate as granting on the Staff File.
 */
const permissionPresetService = {
  /** Active presets, optionally for one cadre. { includeArchived: true } for Settings. */
  list: ({ baseRole, includeArchived } = {}) => api.get('/permission-presets', {
    params: {
      ...(baseRole ? { baseRole } : {}),
      ...(includeArchived ? { includeArchived: '1' } : {}),
    },
  }),
  create:  (data)     => api.post('/permission-presets', data),
  update:  (id, data) => api.put(`/permission-presets/${id}`, data),
  archive: (id)       => api.patch(`/permission-presets/${id}/archive`),
  restore: (id)       => api.patch(`/permission-presets/${id}/restore`),
};

export default permissionPresetService;
