/**
 * Small display helpers shared by the HR Suite pages (B21). Times come from
 * the server already formatted in clinic time (checkInHHMM etc.); these only
 * cover what the pages derive locally.
 */
const CLINIC_TZ = 'Africa/Nairobi';

export const hhmmOf = (iso) => (iso
  ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CLINIC_TZ })
  : '—');

/** 'YYYY-MM-DD' → 'Wed 23' (short) or 'Wed 23 Sep' (long). */
export const dayLabel = (iso, long = false) => (iso
  ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', long
    ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }
    : { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
  : '—');

export const monthLabel = (month) => (month
  ? new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  : '');

export const monthShort = (month) => (month
  ? new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  : '');

export const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: CLINIC_TZ }).slice(0, 7);
export const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: CLINIC_TZ });

/** minutes → '8 h 41 m'; null → '—' */
export const hoursMinutes = (minutes) => {
  if (minutes == null) return '—';
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)} h ${m % 60} m`;
};

/** minutes → '8:41'; null → '—' */
export const hoursColon = (minutes) => {
  if (minutes == null) return '—';
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';

const STAR_CLASS = { green: 'text-green-700', gold: 'text-[#D4A017]', red: 'text-red-700', pending: 'text-gray-300' };

/** The In★/Out★ pair for a session row. */
export const StarPair = ({ session }) => {
  const inColour = starColour('in', session?.checkInPunctuality);
  const outColour = session?.status === 'closed' ? starColour('out', session?.checkOutPunctuality) : null;
  return (
    <span className="inline-flex gap-px text-sm leading-none" aria-label={`In ${inColour || 'none'}, out ${outColour || 'pending'}`}>
      <span className={STAR_CLASS[inColour] || 'text-gray-300'}>{inColour ? '★' : '☆'}</span>
      <span className={STAR_CLASS[outColour] || 'text-gray-300'}>{outColour ? '★' : '☆'}</span>
    </span>
  );
};

export const starColour = (kind, state) => {
  if (!state || state === 'none') return null;
  if (kind === 'in') return { early: 'gold', on_time: 'green', late: 'red' }[state] || null;
  return { late: 'gold', on_time: 'green', early: 'red' }[state] || null;
};

const PILL = {
  ok:   'bg-green-50 text-green-700',
  warn: 'bg-amber-50 text-amber-700',
  bad:  'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  n:    'bg-gray-50 text-gray-500 border border-gray-200',
};

export const Pill = ({ tone = 'n', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILL[tone] || PILL.n} ${className}`}>{children}</span>
);

const REASONS = { unknown_tag: 'unknown tag', bad_signature: 'bad signature', replayed_counter: 'replayed', static_tag: 'static tag' };

/** Verification / status pill for a session row. */
export const VerificationPill = ({ session }) => {
  if (!session) return null;
  if (session.status === 'refused') return <Pill tone="bad">Refused{session.diagnostics?.reason ? ` · ${REASONS[session.diagnostics.reason] || session.diagnostics.reason}` : ''}</Pill>;
  if (session.status === 'missed_checkout') return <Pill tone="warn">Missed check-out</Pill>;
  if (session.status === 'voided') return <Pill tone="n">Voided</Pill>;
  if (session.checkInVerification === 'flagged' || session.checkOutVerification === 'flagged') return <Pill tone="warn">Flagged</Pill>;
  if (session.checkInVerification === 'manual') return <Pill tone="info">Manual</Pill>;
  if (session.checkInMethod === 'code') return <Pill tone="info">Code</Pill>;
  return <Pill tone="ok">Verified</Pill>;
};

export const METHOD_LABEL = { nfc: 'NFC', code: 'code', manual: 'manual' };

export const roleLabel = (role) => ({ doctor: 'Doctor', nurse: 'Nurse', staff: 'Staff', lab: 'Lab technician', admin: 'Administrator' }[role] || role || '');

export const greetingFor = (date = new Date()) => {
  const h = Number(date.toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: CLINIC_TZ }).slice(0, 2));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const titleFor = (user) => (user?.role === 'doctor' ? 'Dr' : '');
export const firstNameOf = (user) => user?.firstName || (user?.name || '').split(' ')[0] || '';
