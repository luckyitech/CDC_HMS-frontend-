// Small presentation helpers shared across the Inbox components.

export const fmtTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const fmtDay = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  const yst = new Date(today); yst.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yst.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

export const fmtRelative = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return fmtDay(d);
};

// Countdown text for the Meta 24-hour free-form window.
export const windowLabel = (conv) => {
  if (!conv) return null;
  if (!conv.windowOpen) return 'Window closed — templates only';
  if (!conv.windowExpiresAt) return 'Window open';
  const ms = new Date(conv.windowExpiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Window closed — templates only';
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `Window closes in ${hrs}h ${mins}m`;
};

export const STATUS_TICK = {
  received: '', queued: '·', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '⚠',
};

export const contactTypeLabel = { patient: 'Patient', lab: 'Lab', organisation: 'Organisation' };

export const RESOLUTION_KINDS = [
  { value: 'answered', label: 'Answered' },
  { value: 'appointment_booked', label: 'Appointment booked' },
  { value: 'document_filed', label: 'Document filed' },
  { value: 'referred', label: 'Referred / escalated' },
  { value: 'no_action', label: 'No action needed' },
];

// Light EN/SW topic keyword suggestions from a message body.
const TOPIC_HINTS = [
  { topic: 'Appointment', words: ['appointment', 'book', 'reschedule', 'miadi', 'tarehe'] },
  { topic: 'Results', words: ['result', 'report', 'lab', 'majibu', 'ripoti'] },
  { topic: 'Prescription', words: ['prescription', 'refill', 'medicine', 'dawa', 'dose'] },
  { topic: 'Billing', words: ['bill', 'payment', 'invoice', 'malipo', 'bei'] },
  { topic: 'Insulin / Sugar', words: ['insulin', 'sugar', 'glucose', 'sukari', 'hba1c'] },
];
export const suggestTopics = (text) => {
  const t = (text || '').toLowerCase();
  return TOPIC_HINTS.filter((h) => h.words.some((w) => t.includes(w))).map((h) => h.topic);
};
