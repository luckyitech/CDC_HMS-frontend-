import { useEffect, useState } from 'react';
import hrService from '../../../services/hrService';
import { SHIFT_COLOURS, OFF_CHIP, timesText, clinicToday } from './rosterFormat';

/**
 * My profile — my published shifts for today and the next 13 days (HR Tier 3
 * Phase 4, RO-11). Drafts never appear. Hidden for anyone with nothing
 * rostered (doctors keep their appointment schedule — T3-6 a).
 */
const MyShiftsCard = () => {
  const [shifts, setShifts] = useState(null);
  useEffect(() => {
    let live = true;
    hrService.myShifts()
      .then((res) => { if (live) setShifts(res?.data?.shifts || []); })
      .catch(() => { if (live) setShifts([]); });
    return () => { live = false; };
  }, []);
  if (!shifts || !shifts.length) return null;
  const today = clinicToday();
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="my-shifts">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">My shifts</h3>
      <ul className="space-y-1.5">
        {shifts.map((s) => {
          const d = new Date(`${s.date}T12:00:00Z`);
          const cls = s.isOff ? OFF_CHIP : (SHIFT_COLOURS[s.colour]?.chip || SHIFT_COLOURS.slate.chip);
          return (
            <li key={s.date} className="flex items-center gap-3 text-sm">
              <span className={`w-24 flex-none ${s.date === today ? 'font-semibold text-primary' : 'text-gray-600'}`}>
                {s.date === today ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
              </span>
              <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{s.name}</span>
              <span className="text-xs tabular-nums text-gray-500">{timesText(s)}{s.overnight ? ' (next morning)' : ''}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-gray-400">From the published roster. Days not listed follow your usual working hours.</p>
    </div>
  );
};

export default MyShiftsCard;
