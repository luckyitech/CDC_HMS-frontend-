// Shared booking-priority UI for the queue pages — ONE definition, many
// consumers (staff Queue Management, nurse Triage worklist). Mirrors the
// backend ordering in utils/queuePriority.js so what staff read matches how the
// queue is actually served.
import { Info } from 'lucide-react';

const fmtSlot = (scheduledTime) => {
  if (!scheduledTime) return '';
  const d = new Date(scheduledTime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// A small pill describing why a patient sits where they do. Returns null for
// Urgent (the row already shows an Urgent badge) and when state is missing.
export const QueueBookingBadge = ({ patient, className = '' }) => {
  const state = patient?.bookingState;
  const slot = fmtSlot(patient?.scheduledTime);
  let label;
  let tone;
  switch (state) {
    case 'booked-on-time':
      label = slot ? `Booked ${slot}` : 'Booked';
      tone = 'bg-violet-100 text-violet-700';
      break;
    case 'booked-late':
      label = slot ? `Late · booked ${slot}` : 'Late booking';
      tone = 'bg-amber-100 text-amber-700';
      break;
    case 'booked-walkin':
      label = slot ? `Walk-in · missed ${slot}` : 'Walk-in · missed slot';
      tone = 'bg-sky-100 text-sky-700';
      break;
    case 'walk-in':
      label = 'Walk-in';
      tone = 'bg-sky-100 text-sky-700';
      break;
    default:
      return null; // urgent or unknown
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${tone} ${className}`}>
      {label}
    </span>
  );
};

// The plain-language rules, shown on the queue pages so the ordering is visible.
export const QUEUE_PRIORITY_RULES = [
  'Urgent patients are always seen first.',
  'Booked patients are served at their appointment time, ahead of walk-ins, if they arrive within 30 minutes of their slot.',
  'A booked patient 30–60 minutes late keeps priority over walk-ins, but after on-time bookings.',
  'More than 1 hour late, a booked patient becomes a walk-in (seen by arrival time).',
  'Walk-ins are seen in the order they arrived.',
];

export const QueuePriorityLegend = ({ className = '' }) => (
  <div className={`rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 ${className}`}>
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-800">
      <Info className="w-3.5 h-3.5" /> How the queue is ordered
    </p>
    <ol className="mt-1.5 list-decimal list-inside space-y-0.5 text-[13px] text-blue-900">
      {QUEUE_PRIORITY_RULES.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ol>
  </div>
);
