import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import './hr.css';

/**
 * StarCalendar — the two-star-per-day month grid (HR Suite, B21).
 *
 * Shared by the tap page and the dashboard so both draw the month the same
 * way. Renders exactly what the server's `calendar` array says: one cell per
 * calendar date with { in, out } ∈ green | gold | red | pending | null, plus
 * leave / off / future / absent flags. Left star = check-in, right = check-out.
 *
 * Imperative surface (used by the tap animation only):
 *   ref.current.starEl(side)            → the DOM element of TODAY's star on that side
 *   ref.current.landStar(side, colour)  → flip that star to `colour` with the landing pulse
 *
 * Props:
 *   month    'YYYY-MM'
 *   days     [{ date, in, out, leave, off, future, absent }]
 *   today    'YYYY-MM-DD'
 *   compact  smaller cells (tap page)
 *   pendingSide  'in' | 'out' — pre-render today's star on that side as outlined
 *                (the flight target), regardless of what `days` says
 */
const COLOUR_CLASS = {
  green: 'text-green-700',
  gold: 'text-[#D4A017]',
  red: 'text-red-700',
  pending: 'text-gray-300',
};

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Monday-first column index of a 'YYYY-MM-DD' (noon-anchored → no TZ drift)
const mondayIndex = (iso) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

const Star = ({ colour, hidden }) => {
  if (!colour) return null;
  const outlined = colour === 'pending';
  return (
    <i
      className={`not-italic leading-none ${COLOUR_CLASS[colour] || 'text-gray-300'}`}
      style={hidden ? { visibility: 'hidden' } : undefined}
      aria-hidden="true"
    >
      {outlined ? '☆' : '★'}
    </i>
  );
};

const StarCalendar = forwardRef(function StarCalendar({ month, days = [], today, compact = false, pendingSide = null }, ref) {
  const todayIn = useRef(null);
  const todayOut = useRef(null);
  const todayCell = useRef(null);
  // Overrides applied by landStar() so the star flips without a refetch.
  const [landed, setLanded] = useState({});      // { in: 'green', out: 'red' }
  const [pulse, setPulse] = useState(null);      // 'green' | 'gold' | 'red' → landed-* class on today's cell
  const [hiddenSide, setHiddenSide] = useState(null);

  // A new month resets the overrides (fresh data for the same month agrees
  // with a landed star, so it needs no reset).
  useEffect(() => { setLanded({}); setPulse(null); setHiddenSide(null); }, [month]);

  useImperativeHandle(ref, () => ({
    starEl: (side) => (side === 'out' ? todayOut.current : todayIn.current),
    hideStar: (side) => setHiddenSide(side),
    landStar: (side, colour) => {
      setHiddenSide(null);
      setLanded((prev) => ({ ...prev, [side]: colour }));
      setPulse(null);
      // restart the keyframe on repeat landings
      requestAnimationFrame(() => setPulse(colour));
    },
  }), []);

  if (!month || !days.length) return null;
  const offset = mondayIndex(days[0].date);
  const cellH = compact ? 'h-7' : 'h-9';
  const starSize = compact ? 'text-[12px]' : 'text-[15px]';

  return (
    <div className={`hr-stars grid grid-cols-7 gap-y-0.5 text-center ${compact ? 'text-[11px]' : 'text-xs'}`} role="grid" aria-label={`Stars for ${month}`}>
      {DOW.map((d, i) => (
        <div key={i} className="text-[9px] uppercase tracking-wide text-gray-400 pb-0.5" role="columnheader">{d}</div>
      ))}
      {Array.from({ length: offset }).map((_, i) => <div key={`pad-${i}`} />)}
      {days.map((c) => {
        const isToday = c.date === today;
        const dayNo = Number(c.date.slice(-2));
        let inColour = c.in, outColour = c.out;
        if (isToday) {
          if (landed.in) inColour = landed.in;
          if (landed.out) outColour = landed.out;
          if (pendingSide && !landed[pendingSide]) {
            if (pendingSide === 'in') inColour = 'pending';
            else outColour = 'pending';
          }
        }
        let inner, title;
        if (c.leave) { inner = <span className="text-[9px] font-semibold text-blue-700">L</span>; title = 'On leave'; }
        else if (c.future) { inner = <span className="text-gray-200">·</span>; title = 'Coming up'; }
        else if (c.off && !inColour && !outColour) { inner = <span className="text-gray-300">·</span>; title = 'Day off'; }
        else if (c.absent && !inColour && !outColour) { inner = <span className="text-gray-300">–</span>; title = 'No check-in recorded'; }
        else {
          inner = (
            <span className={`inline-flex items-center gap-px ${starSize}`}>
              <span ref={isToday ? todayIn : undefined} className="inline-flex"><Star colour={inColour || 'pending'} hidden={isToday && hiddenSide === 'in'} /></span>
              <span ref={isToday ? todayOut : undefined} className="inline-flex"><Star colour={outColour || 'pending'} hidden={isToday && hiddenSide === 'out'} /></span>
            </span>
          );
          const name = (s, side) => ({
            green: 'on time', gold: side === 'in' ? 'early' : 'past working hours', red: side === 'in' ? 'late' : 'early', pending: 'not yet',
          }[s] || 'not yet');
          title = `In: ${name(inColour, 'in')} · Out: ${name(outColour, 'out')}`;
        }
        return (
          <div
            key={c.date}
            ref={isToday ? todayCell : undefined}
            role="gridcell"
            title={`${dayNo} — ${title}`}
            className={`hr-day relative ${cellH} flex items-center justify-center rounded-md ${isToday ? 'outline outline-[1.5px] outline-primary' : ''} ${isToday && pulse ? `landed-${pulse}` : ''}`}
          >
            {inner}
            <small className="absolute top-0 right-0.5 text-[7px] text-gray-400 leading-none">{dayNo}</small>
          </div>
        );
      })}
    </div>
  );
});

export const StarLegend = ({ className = '' }) => (
  <div className={`flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 ${className}`}>
    <span><span className="text-gray-400">★★</span> left = check-in, right = check-out</span>
    <span><span className="text-green-700">★</span> On time</span>
    <span><span className="text-[#D4A017]">★</span> Early in · past hours out</span>
    <span><span className="text-red-700">★</span> Late in · early out</span>
    <span><span className="text-blue-700 font-semibold">L</span> = leave</span>
  </div>
);

/** "33 ★ · 4 ★ · 1 ★" — the month tally line shown above the calendar. */
export const StarTally = ({ stars, className = '' }) => {
  const all = stars?.all || { green: 0, gold: 0, red: 0 };
  return (
    <b className={`tabular-nums font-semibold text-gray-800 ${className}`}>
      {all.green} <span className="text-green-700">★</span> · {all.gold} <span className="text-[#D4A017]">★</span> · {all.red} <span className="text-red-700">★</span>
    </b>
  );
};

export default StarCalendar;
