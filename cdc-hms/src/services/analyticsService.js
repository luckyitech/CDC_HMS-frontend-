import api from './api';

export const analyticsService = {
  getActiveYears: () =>
    api.get('/analytics/active-years'),

  getDoctorPerformance: (startDate, endDate) =>
    api.get('/analytics/doctor-performance', { params: { startDate, endDate } }),

  getTriageMetrics: (startDate, endDate) =>
    api.get('/analytics/triage-metrics', { params: { startDate, endDate } }),

  getConsultationTiming: (startDate, endDate) =>
    api.get('/analytics/consultation-timing', { params: { startDate, endDate } }),

  getStaffTriagePerformance: (startDate, endDate) =>
    api.get('/analytics/staff-triage-performance', { params: { startDate, endDate } }),

  getTriageByPriority: (startDate, endDate) =>
    api.get('/analytics/triage-by-priority', { params: { startDate, endDate } }),

  getLengthOfStay: (startDate, endDate) =>
    api.get('/analytics/length-of-stay', { params: { startDate, endDate } }),

  getPatientVolumeByHour: (startDate, endDate) =>
    api.get('/analytics/patient-volume-by-hour', { params: { startDate, endDate } }),

  getRemovalReasons: (startDate, endDate) =>
    api.get('/analytics/removal-reasons', { params: { startDate, endDate } }),
};

export default analyticsService;
