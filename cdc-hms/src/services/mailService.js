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
 * Phase 2 (send):
 * - GET    /mail/messages/:uid/compose?folder&mode — reply | replyAll | forward | draft
 * - POST   /mail/send                    — multipart: message (JSON) + files[]
 * - POST   /mail/drafts                  — multipart: save / replace a draft
 * - DELETE /mail/drafts/:uid             — discard a draft (moves it to Trash)
 * - GET    /mail/signature               — { html } preview of the signature added on send
 * Phase 3a (HMS / patient tie-ins — patient data gated like the patient + document routes):
 * - GET    /mail/suggest?q                — { recent, staff, patients, patientsShown }
 * - GET    /mail/patients?q               — the patient picker (name / UHID / phone / email / ID)
 * - GET    /mail/patients/:uhid/documents — the documents on a patient's file (whole merge family)
 * - POST   /mail/messages/:uid/attachments/:part/save-to-patient — { folder, uhid, category, testDate, notes }
 * Composer payloads carry `patientDocuments: [documentId]` — read from the HMS at send time.
 * Phase 4 ("Email this patient" from the patient file):
 * - GET    /mail/patients/:uhid/contact   — { uhid, name, yearOfBirth, address } (merged UHID → 409)
 * Composer payloads also carry `patientRecipients: [uhid]` — the chips picked AS a patient;
 * the server confirms each against the file and notes the email there.
 * Phase 5: `linkPatients: [uhid]` (the Composer's "Patient file" row) and
 * - POST   /mail/messages/:uid/link-patient — { folder, uhid, scope: thread | message }
 * Debt pass (27 Sep): POST /mail/folders, /mail/folders/rename, /mail/folders/delete;
 * organise + seen accept `all` in place of `uids`; send accepts
 * `hmsReports: [{ uhid, filename, title }]` — PDFs of HMS printouts, checked by
 * the server, never kept in drafts, and (27 Sep evening) not filed on the patient.
 * Admin (config.write): GET /mail/admin/accounts, POST /mail/admin/accounts/:userId/disconnect
 */
// The api instance defaults to JSON; multipart must be named so axios hands the
// FormData to the browser, which adds the boundary itself.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

/** The composer's state → multipart: `message` (JSON) + each new file as `files`. */
const composeForm = (message, files) => {
  const form = new FormData();
  form.append('message', JSON.stringify(message));
  files.forEach((f) => form.append('files', f, f.name));
  return form;
};

const pick = (target) => (Array.isArray(target) ? { uids: target } : { all: target.all });

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
  // `target` is a page's UIDs, or { all: { uidMax, uidValidity, q } } — "select
  // all N in this folder": the server re-finds exactly those (never newer mail)
  // and answers with { count, newerLeft }.
  setSeen: (folder, target, seen) => api.post('/mail/messages/seen', { folder, ...pick(target), seen }),

  // Phase 3b — organise. Delete = move to Trash; only emptyTrash is permanent.
  move: (folder, target, to) => api.post('/mail/messages/move', { folder, ...pick(target), to }),
  archive: (folder, target) => api.post('/mail/messages/archive', { folder, ...pick(target) }),
  trash: (folder, target) => api.post('/mail/messages/trash', { folder, ...pick(target) }),
  restore: (folder, target) => api.post('/mail/messages/restore', { folder, ...pick(target) }),
  flag: (folder, target, flagged) => api.post('/mail/messages/flag', { folder, ...pick(target), flagged }),

  // Folders — the caller's own only: create, rename, delete (only when empty).
  createFolder: (name) => api.post('/mail/folders', { name }),
  renameFolder: (path, name) => api.post('/mail/folders/rename', { path, name }),
  deleteFolder: (path) => api.post('/mail/folders/delete', { path }),
  trashInfo: () => api.get('/mail/trash'),
  emptyTrash: (count) => api.post('/mail/trash/empty', { confirm: 'EMPTY', count }),

  signature: () => api.get('/mail/signature'),
  patientContact: (uhid) => api.get(`/mail/patients/${encodeURIComponent(uhid)}/contact`),
  // Phase 5 — put a message (or its whole conversation) on a patient's Communications trail.
  linkToPatient: (uid, folder, uhid, scope = 'thread') => api.post(`/mail/messages/${uid}/link-patient`, { folder, uhid, scope }),
  composeContext: (uid, folder, mode) => api.get(`/mail/messages/${uid}/compose`, { params: { folder, mode } }),
  send: (message, files = []) => api.post('/mail/send', composeForm(message, files), MULTIPART),
  saveDraft: (message, files = []) => api.post('/mail/drafts', composeForm(message, files), MULTIPART),
  discardDraft: (uid) => api.delete(`/mail/drafts/${uid}`),

  suggest: (q) => api.get('/mail/suggest', { params: { q } }),
  patients: (q) => api.get('/mail/patients', { params: { q } }),
  patientDocuments: (uhid) => api.get(`/mail/patients/${encodeURIComponent(uhid)}/documents`),
  saveToPatient: (uid, part, folder, data) =>
    api.post(`/mail/messages/${uid}/attachments/${part}/save-to-patient`, { folder, ...data }),

  adminAccounts: () => api.get('/mail/admin/accounts'),
  adminDisconnect: (userId) => api.post(`/mail/admin/accounts/${userId}/disconnect`),
};

/** Tell the sidebar badge (MainLayout) something changed. */
export const announceMailChange = () => window.dispatchEvent(new CustomEvent('mail:changed'));

/**
 * Phase 3b: MainLayout asks GET /mail/unread every 30 s (the server answers
 * from its live INBOX watcher) and re-broadcasts each answer as `mail:state`,
 * so the Inbox page and My mail react without asking again themselves.
 * detail = { connected, status, unread, latest: { uid, uidValidity, from, subject } | null }
 */
export const MAIL_STATE_EVENT = 'mail:state';

export default mailService;
