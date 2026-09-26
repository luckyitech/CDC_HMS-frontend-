import api from './api';

/**
 * Mail Service — Staff Email (B26). The signed-in user's OWN clinic mailbox,
 * read live from the provider; the HMS stores no mail.
 *
 * Backend routes (/api/mail, every internal role, own mailbox only):
 * - GET    /mail/account                 — connection (no secrets) + setup info
 * - POST   /mail/account/test            — try a login without saving
 * - PUT    /mail/account                 — connect / reconnect (saves only after a good login)
 * - PATCH  /mail/account                 — display name, signature, image preferences
 * - DELETE /mail/account                 — disconnect (forgets the password)
 * - GET    /mail/unread                  — { connected, status, unread, canSetUp }
 * - GET    /mail/folders
 * - GET    /mail/messages?folder&page&q
 * - GET    /mail/messages/:uid?folder&peek
 * - GET    /mail/messages/:uid/attachments/:part?folder   (Blob)
 * - POST   /mail/messages/seen           — { folder, uids, seen }
 * Admin (config.write): GET /mail/admin/accounts, POST /mail/admin/accounts/:userId/disconnect
 */
export const mailService = {
  getAccount: () => api.get('/mail/account'),
  testAccount: (emailAddress, password) => api.post('/mail/account/test', { emailAddress, password }),
  connect: (data) => api.put('/mail/account', data),
  updatePreferences: (prefs) => api.patch('/mail/account', prefs),
  disconnect: () => api.delete('/mail/account'),

  unread: () => api.get('/mail/unread'),
  folders: () => api.get('/mail/folders'),
  messages: ({ folder = 'INBOX', page = 1, q = '' } = {}) =>
    api.get('/mail/messages', { params: { folder, page, q: q || undefined } }),
  message: (uid, folder = 'INBOX', { peek = false } = {}) =>
    api.get(`/mail/messages/${uid}`, { params: { folder, peek: peek ? 1 : undefined } }),
  attachment: (uid, part, folder = 'INBOX') =>
    api.get(`/mail/messages/${uid}/attachments/${part}`, { params: { folder }, responseType: 'blob' }),
  setSeen: (folder, uids, seen) => api.post('/mail/messages/seen', { folder, uids, seen }),

  adminAccounts: () => api.get('/mail/admin/accounts'),
  adminDisconnect: (userId) => api.post(`/mail/admin/accounts/${userId}/disconnect`),
};

/** Tell the sidebar badge (MainLayout) something changed. */
export const announceMailChange = () => window.dispatchEvent(new CustomEvent('mail:changed'));

export default mailService;
