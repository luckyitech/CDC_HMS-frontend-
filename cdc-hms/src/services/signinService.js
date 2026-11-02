import api from './api';

// Sign-in records and sign-in security settings (16 Oct 2026).
// Reading needs it.signins.view; the settings need it.security.settings —
// both explicit grants or the main admin account (never admin.access).
const signinService = {
  list: (params = {}) => api.get('/signins', { params }),
  get: (id) => api.get(`/signins/${id}`),
  mine: () => api.get('/signins/mine'),
  getSettings: () => api.get('/signins/settings'),
  saveSettings: (changes) => api.put('/signins/settings', changes),
};

export default signinService;
