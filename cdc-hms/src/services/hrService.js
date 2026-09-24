import api from './api';

/**
 * HR Suite (B21) — one function per /api/hr endpoint (plus the two auth
 * endpoints the tap page uses). Every call returns the unwrapped
 * { success, data } body like the other services.
 */
const hrService = {
  // --- Time & Attendance: tap (the tap page only) ---
  tap:            (body)          => api.post('/hr/attendance/tap', body),
  deviceSession:  (deviceToken)   => api.post('/auth/device-session', { deviceToken }),
  loginRemember:  (email, password, rememberDevice) =>
    api.post('/auth/login', { email, password, rememberDevice: !!rememberDevice, context: 'hr-tap' }),

  // --- own record ---
  mine:           (params)        => api.get('/hr/attendance/me', { params }),
  mySummary:      (month)         => api.get('/hr/attendance/me/summary', { params: { month } }),
  myWorkHours:    ()              => api.get('/hr/work-hours/me'),
  myDevices:      ()              => api.get('/hr/devices/me'),

  // --- HR ---
  today:          ()              => api.get('/hr/attendance/today'),
  list:           (params)        => api.get('/hr/attendance', { params }),
  getSession:     (id)            => api.get(`/hr/attendance/${id}`),
  manual:         (body)          => api.post('/hr/attendance/manual', body),
  amend:          (id, body)      => api.patch(`/hr/attendance/${id}`, body),
  devicesOf:      (userId)        => api.get('/hr/devices/me', { params: { userId } }),
  revokeDevice:   (id)            => api.delete(`/hr/devices/${id}`),
  workHoursAll:   ()              => api.get('/hr/work-hours'),
  setWorkHours:   (userId, body)  => api.put(`/hr/work-hours/${userId}`, body),
  tags:           ()              => api.get('/hr/tags'),
  newTagKey:      ()              => api.get('/hr/tags/new-key'),
  createTag:      (body)          => api.post('/hr/tags', body),
  updateTag:      (id, body)      => api.patch(`/hr/tags/${id}`, body),
  testTag:        (id, url)       => api.post(`/hr/tags/${id}/test`, { url }),
  settings:       ()              => api.get('/hr/settings'),
  saveSettings:   (body)          => api.put('/hr/settings', body),

  /** The server-generated CSV, downloaded through the same auth header. */
  downloadCsv: async (params, filename, own = false) => {
    const url = own ? '/hr/attendance/me' : '/hr/attendance';
    const csv = await api.get(url, { params: { ...params, format: 'csv' }, responseType: 'text', transformResponse: [(d) => d], announce403: true });
    const blob = new Blob([typeof csv === 'string' ? csv : ''], { type: 'text/csv;charset=utf-8;' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = filename; a.click();
    URL.revokeObjectURL(href);
  },
};

export default hrService;
