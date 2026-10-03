/**
 * Shift roster helpers (HR Tier 3 Phase 4). Non-component exports live here,
 * not in a .jsx file (react-refresh lint).
 */

// One literal class string per colour so Tailwind keeps them. The keys match
// the backend's utils/roster COLOURS.
export const SHIFT_COLOURS = {
  blue:   { chip: 'bg-blue-100 text-blue-800 border-blue-200',       label: 'Blue' },
  green:  { chip: 'bg-green-100 text-green-800 border-green-200',    label: 'Green' },
  indigo: { chip: 'bg-indigo-800 text-indigo-50 border-indigo-900',  label: 'Night blue' },
  amber:  { chip: 'bg-amber-100 text-amber-800 border-amber-200',    label: 'Amber' },
  rose:   { chip: 'bg-rose-100 text-rose-800 border-rose-200',       label: 'Rose' },
  teal:   { chip: 'bg-teal-100 text-teal-800 border-teal-200',       label: 'Teal' },
  violet: { chip: 'bg-violet-100 text-violet-800 border-violet-200', label: 'Violet' },
  slate:  { chip: 'bg-slate-200 text-slate-800 border-slate-300',    label: 'Grey' },
};
export const OFF_CHIP = 'bg-gray-100 text-gray-500 border-gray-200';
export const LEAVE_CHIP = 'bg-amber-50 text-amber-700 border-amber-200';

export const ROSTER_ROLE_LABEL = { nurse: 'Nurse', lab: 'Lab', staff: 'Front office' };

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** 'YYYY-MM-DD' plus n days. */
export const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return isoOf(new Date(Date.UTC(y, m - 1, d + n)));
};

/** The Monday on or before a date. */
export const mondayOf = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
};

/** Today at the clinic (Nairobi), as 'YYYY-MM-DD'. */
export const clinicToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const dayHead = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return { wd: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }), day: d.getUTCDate() };
};

export const longDay = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export const weekTitle = (weekStart) => new Date(`${weekStart}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** 450 → '7 h 30'. */
export const hoursText = (minutes) => {
  if (!minutes) return '0 h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
};

export const timesText = (c) => (c && !c.isOff && c.startTime ? `${c.startTime}–${c.endTime}` : '');

/** One warning as a sentence (RO-8). */
export const warningText = (w, nameOf) => {
  const day = longDay(w.date);
  if (w.kind === 'rest') return `${nameOf(w.userId)}: ${day} starts ${w.hours} h after the previous shift ends (rest under 11 h).`;
  if (w.kind === 'leave') return `${nameOf(w.userId)} is on approved leave on ${day} but has a shift.`;
  if (w.kind === 'cover') return `${day}: ${w.count} on shift — below the minimum of ${w.min}.`;
  return '';
};
