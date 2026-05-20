// Clinic time slots — must match AppointmentContext.jsx exactly.
// Lunch break: 12:30 PM–1:30 PM excluded.
export const TIME_SLOTS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM',
];

export const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow-up',    label: 'Follow-up' },
  { value: 'check-up',     label: 'Check-up' },
  { value: 'emergency',    label: 'Emergency' },
];

export const SLOT_STATUS_STYLES = {
  free:         'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 cursor-pointer',
  scheduled:    'bg-blue-100 border-blue-300 text-blue-800 cursor-pointer',
  'checked-in': 'bg-yellow-100 border-yellow-300 text-yellow-800 cursor-pointer',
  completed:    'bg-gray-100 border-gray-300 text-gray-500 cursor-default',
  blocked:      'bg-red-50 border-red-200 text-red-500 cursor-default',
};
