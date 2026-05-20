import api from './api';

const doctorBlockService = {
  // Block a slot or whole day (doctor only)
  // omit timeSlot to block the entire day
  block: (date, timeSlot, reason) =>
    api.post('/doctor-blocks', { date, ...(timeSlot && { timeSlot }), ...(reason && { reason }) }),

  // Unblock a slot or whole day (doctor only)
  unblock: (date, timeSlot) =>
    api.delete('/doctor-blocks', { data: { date, ...(timeSlot && { timeSlot }) } }),

  // Get blocked slots for a doctor on a date (any authenticated role)
  getBlocks: (doctorId, date) =>
    api.get('/doctor-blocks', { params: { doctorId, date } }),

  // Block a consecutive range of slots in one request (doctor only)
  blockRange: (date, timeSlots, reason) =>
    api.post('/doctor-blocks/range', { date, timeSlots, ...(reason && { reason }) }),

  // Unblock a range of slots on a single date (doctor only)
  unblockRange: (date, timeSlots) =>
    api.delete('/doctor-blocks/range', { data: { date, timeSlots } }),

  // Block a time range across multiple days (doctor only)
  blockRecurring: (fromDate, toDate, timeSlots, weekdays, reason) =>
    api.post('/doctor-blocks/recurring', { fromDate, toDate, timeSlots, weekdays, ...(reason && { reason }) }),

  // Unblock a time range across multiple days (doctor only)
  unblockRecurring: (fromDate, toDate, timeSlots, weekdays) =>
    api.delete('/doctor-blocks/recurring', { data: { fromDate, toDate, timeSlots, weekdays } }),

  // Get all upcoming blocks for the requesting doctor, grouped by date (doctor only)
  getUpcoming: () =>
    api.get('/doctor-blocks/upcoming'),

  // Remove ALL blocks for a specific date (doctor only)
  clearDate: (date) =>
    api.delete('/doctor-blocks/date', { data: { date } }),
};

export default doctorBlockService;
