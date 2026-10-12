import api from './api';

// Blocking a doctor's diary. A doctor acts on their own diary (doctorId
// omitted). A holder of 'calendar.block' — chosen front-desk staff — passes
// the doctor's id as the last argument to act on that doctor's diary
// (12 Oct 2026).
const forDoctor = (doctorId) => (doctorId ? { doctorId: Number(doctorId) } : {});

const doctorBlockService = {
  // Block a slot or whole day — omit timeSlot to block the entire day
  block: (date, timeSlot, reason, doctorId) =>
    api.post('/doctor-blocks', { date, ...(timeSlot && { timeSlot }), ...(reason && { reason }), ...forDoctor(doctorId) }),

  // Unblock a slot or whole day
  unblock: (date, timeSlot, doctorId) =>
    api.delete('/doctor-blocks', { data: { date, ...(timeSlot && { timeSlot }), ...forDoctor(doctorId) } }),

  // Get blocked slots for a doctor on a date (any authenticated role)
  getBlocks: (doctorId, date) =>
    api.get('/doctor-blocks', { params: { doctorId, date } }),

  // Block a consecutive range of slots in one request
  blockRange: (date, timeSlots, reason, doctorId) =>
    api.post('/doctor-blocks/range', { date, timeSlots, ...(reason && { reason }), ...forDoctor(doctorId) }),

  // Unblock a range of slots on a single date
  unblockRange: (date, timeSlots, doctorId) =>
    api.delete('/doctor-blocks/range', { data: { date, timeSlots, ...forDoctor(doctorId) } }),

  // Block a time range across multiple days
  blockRecurring: (fromDate, toDate, timeSlots, weekdays, reason, doctorId) =>
    api.post('/doctor-blocks/recurring', { fromDate, toDate, timeSlots, weekdays, ...(reason && { reason }), ...forDoctor(doctorId) }),

  // Unblock a time range across multiple days
  unblockRecurring: (fromDate, toDate, timeSlots, weekdays, doctorId) =>
    api.delete('/doctor-blocks/recurring', { data: { fromDate, toDate, timeSlots, weekdays, ...forDoctor(doctorId) } }),

  // All upcoming blocks for the doctor, grouped by date
  getUpcoming: (doctorId) =>
    api.get('/doctor-blocks/upcoming', { params: forDoctor(doctorId) }),

  // Remove ALL blocks for a specific date
  clearDate: (date, doctorId) =>
    api.delete('/doctor-blocks/date', { data: { date, ...forDoctor(doctorId) } }),
};

export default doctorBlockService;
