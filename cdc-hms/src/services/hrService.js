import api from './api';
import { saveTextFile } from '../utils/exportCsv';

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
  // --- profile change requests (B27 phase 4, hr.profile.approve) ---
  changeRequests: (status = 'pending') => api.get('/hr/change-requests', { params: { status } }),
  changeRequestCount: ()          => api.get('/hr/change-requests/count'),
  decideChange:   (id, body)      => api.patch(`/hr/change-requests/${id}`, body),
  changeAttachment: (id)          => api.get(`/hr/change-requests/${id}/attachment`, { responseType: 'blob' }),
  // --- CPD verification (B27 phase 5, cpd.verify) ---
  cpdToVerify:    (status = 'pending', year) => api.get('/hr/cpd', { params: { status, ...(year ? { year } : {}) } }),
  cpdCount:       ()              => api.get('/hr/cpd/count'),
  verifyCpd:      (id, body)      => api.patch(`/hr/cpd/${id}/verify`, body),
  cpdCertificate: (id)           => api.get(`/hr/cpd/${id}/certificate`, { responseType: 'blob' }),

  // HR Tier 3 Phase 1 — departments and positions (list = 'departments' | 'positions')
  lists:          ()              => api.get('/hr/lists'),
  addListEntry:   (list, body)    => api.post(`/hr/lists/${list}`, body),
  updateListEntry: (list, id, body) => api.patch(`/hr/lists/${list}/${id}`, body),
  listsTidy:      ()              => api.get('/hr/lists/tidy'),
  applyListsTidy: (body)          => api.post('/hr/lists/tidy', body),

  settings:       ()              => api.get('/hr/settings'),
  saveSettings:   (body)          => api.put('/hr/settings', body),

  /** The server-generated CSV, downloaded through the same auth header. */
  downloadCsv: async (params, filename, own = false) => {
    const url = own ? '/hr/attendance/me' : '/hr/attendance';
    const csv = await api.get(url, { params: { ...params, format: 'csv' }, responseType: 'text', transformResponse: [(d) => d], announce403: true });
    saveTextFile(filename, csv);
  },

  // HR Tier 3 Phase 2 — HR reports (hr.reports; department-scoped server-side).
  reports:        (params)        => api.get('/hr/reports', { params }),
  // HR Tier 3 Phase 3 — onboarding checklists and their per-role templates.
  onboardingList:     (status)       => api.get('/hr/onboarding', { params: status ? { status } : {} }),
  onboardingCount:    ()             => api.get('/hr/onboarding/count'),
  onboardingTemplates: ()            => api.get('/hr/onboarding/templates'),
  addTemplateItem:    (body)         => api.post('/hr/onboarding/templates', body),
  updateTemplateItem: (id, body)     => api.patch(`/hr/onboarding/templates/${id}`, body),
  // HR Tier 3 Phase 4 — the shift roster (hr.roster) and shift types (hr.roster.shifts).
  rosterDepartments:  ()             => api.get('/hr/roster/departments'),
  rosterWeek:         (department, weekStart) => api.get('/hr/roster/week', { params: { department, weekStart } }),
  rosterSetCell:      (body)         => api.put('/hr/roster/week/cell', body),
  rosterCopy:         (body)         => api.post('/hr/roster/week/copy', body),
  rosterUpdateWeek:   (body)         => api.patch('/hr/roster/week', body),
  rosterPublish:      (body)         => api.post('/hr/roster/week/publish', body),
  shiftTypes:         (all)          => api.get('/hr/roster/shift-types', { params: all ? { all: 1 } : {} }),
  addShiftType:       (body)         => api.post('/hr/roster/shift-types', body),
  updateShiftType:    (id, body)     => api.patch(`/hr/roster/shift-types/${id}`, body),
  myShifts:           ()             => api.get('/hr/me/roster'),
  // HR Tier 3 Phase 5 — appraisals.
  myAppraisals:       ()             => api.get('/hr/appraisals/mine'),
  appraisal:          (id)           => api.get(`/hr/appraisals/${id}`),
  appraisalReference: (id)           => api.get(`/hr/appraisals/${id}/reference`),
  saveSelfAppraisal:  (id, body)     => api.put(`/hr/appraisals/${id}/self`, body),
  saveReview:         (id, body)     => api.put(`/hr/appraisals/${id}/review`, body),
  acknowledgeAppraisal: (id, body)   => api.post(`/hr/appraisals/${id}/acknowledge`, body),
  appraisalCompetencies: ()          => api.get('/hr/appraisals/competencies'),
  addCompetency:      (body)         => api.post('/hr/appraisals/competencies', body),
  updateCompetency:   (id, body)     => api.patch(`/hr/appraisals/competencies/${id}`, body),
  appraisalCycles:    ()             => api.get('/hr/appraisals/cycles'),
  appraisalCycle:     (id)           => api.get(`/hr/appraisals/cycles/${id}`),
  openCycle:          (body)         => api.post('/hr/appraisals/cycles', body),
  updateCycle:        (id, body)     => api.patch(`/hr/appraisals/cycles/${id}`, body),
  cycleEligible:      (id)           => api.get(`/hr/appraisals/cycles/${id}/eligible`),
  addToCycle:         (id, body)     => api.post(`/hr/appraisals/cycles/${id}/people`, body),
  runAppraisal:       (id, body)     => api.patch(`/hr/appraisals/${id}/run`, body),

  /** One report as the server's .csv (every download is logged there). */
  downloadReport: async (report, params, filename) => {
    const csv = await api.get(`/hr/reports/${report}/download`, { params, responseType: 'text', transformResponse: [(d) => d] });
    saveTextFile(filename, csv);
  },
};

export default hrService;
