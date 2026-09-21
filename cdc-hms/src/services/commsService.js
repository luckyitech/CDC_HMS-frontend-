import api from './api';

/**
 * Communications Inbox service — patient messages on the clinic's WhatsApp
 * number (channel-generic for Messenger/Instagram later). All routes are under
 * /api/comms and gated by comms.view / comms.write (staff, doctor, nurse, admin
 * by role; lab by grant).
 */
export const commsService = {
  // badge + channels
  badge: () => api.get('/comms/badge'),
  channels: () => api.get('/comms/channels'),

  // conversations
  listConversations: (params) => api.get('/comms/conversations', { params }),
  startForPatient: (uhid) => api.post('/comms/conversations', { uhid }),
  getConversation: (id) => api.get(`/comms/conversations/${id}`),
  getMessages: (id, before) => api.get(`/comms/conversations/${id}/messages`, { params: before ? { before } : {} }),
  markRead: (id) => api.post(`/comms/conversations/${id}/read`),

  // sending
  sendText: (id, text) => api.post(`/comms/conversations/${id}/messages`, { text }),
  sendTemplate: (id, payload) => api.post(`/comms/conversations/${id}/messages`, payload),
  sendMedia: (id, formData) => api.post(`/comms/conversations/${id}/messages`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // linking + organising
  link: (id, data) => api.post(`/comms/conversations/${id}/link`, data),
  unlink: (id, reason) => api.post(`/comms/conversations/${id}/unlink`, { reason }),
  setContactType: (id, data) => api.post(`/comms/conversations/${id}/contact-type`, data),
  pin: (id) => api.post(`/comms/conversations/${id}/pin`),
  unpin: (id) => api.post(`/comms/conversations/${id}/unpin`),
  setTopic: (id, topic) => api.post(`/comms/conversations/${id}/topic`, { topic }),
  assign: (id, userId) => api.post(`/comms/conversations/${id}/assign`, { userId }),
  close: (id) => api.post(`/comms/conversations/${id}/close`),
  reopen: (id) => api.post(`/comms/conversations/${id}/reopen`),

  // escalations + notes
  escalate: (id, data) => api.post(`/comms/conversations/${id}/escalate`, data),
  internalNote: (id, text) => api.post(`/comms/conversations/${id}/internal-note`, { text }),
  resolveEscalation: (id) => api.post(`/comms/escalations/${id}/resolve`),

  // queries
  completeQuery: (msgId, data) => api.post(`/comms/messages/${msgId}/complete`, data),
  reopenQuery: (msgId) => api.post(`/comms/messages/${msgId}/reopen`),

  // media + filing
  getMedia: (msgId) => api.get(`/comms/messages/${msgId}/media`, { responseType: 'blob' }),
  fileToRecord: (msgId, data) => api.post(`/comms/messages/${msgId}/file`, data),

  // booking
  book: (id, data) => api.post(`/comms/conversations/${id}/book`, data),

  // reminders
  listReminders: (params) => api.get('/comms/reminders', { params }),
  createReminder: (id, data) => api.post(`/comms/conversations/${id}/reminders`, data),
  reminderAction: (id, action, body) => api.post(`/comms/reminders/${id}/${action}`, body || {}),

  // templates + organisations
  listTemplates: () => api.get('/comms/templates'),
  syncTemplates: () => api.post('/comms/templates/sync'),
  listOrganisations: (type) => api.get('/comms/organisations', { params: type ? { type } : {} }),
  saveOrganisation: (data) => api.post('/comms/organisations', data),

  // analytics
  analyticsOperations: (params) => api.get('/comms/analytics/operations', { params }),
  analyticsCosts: (params) => api.get('/comms/analytics/costs', { params }),

  // patient communications trail (Patient file → Communications tab)
  patientTrail: (uhid, params) => api.get(`/comms/patients/${uhid}/trail`, { params }),
};

export default commsService;
