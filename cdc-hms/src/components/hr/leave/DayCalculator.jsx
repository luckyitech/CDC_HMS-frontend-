import { fmtDays } from './leaveFormat';

/**
 * The day calculator (mockup 2) — what a request costs, day by day, from the
 * server's answer (POST /api/hr/me/leave/preview, or the snapshot stored on a
 * request). Never counts anything itself: the numbers are the server's, so the
 * screen and the balance can't disagree.
 *
 * props:
 *   breakdown  { groups, holidays, countedAs, mode, usedPolicy } | null
 *   total      number
 *   typeName   'Annual'
 *   balance    { left, after, unlimited } | null   (preview only)
 *   usedPolicy false → the pre-policy count (whole days, weekends by the tick)
 */
const MODE_NOTE = {
  clinic_week: 'Values from the clinic week set by HR.',
  own_hours: 'Counted from your own working days in HR hours.',
  own_week: 'Counted from your personal week set by HR.',
};

const REASON_NOTE = {
  holiday: 'holiday',
  off: 'day off',
  short: 'part day',
  calendar: 'calendar day',
};

const DayCalculator = ({ breakdown, total, typeName, balance, usedPolicy = true, compact = false }) => {
  const groups = breakdown?.groups || null;

  return (
    <div className={`rounded-lg bg-gray-50 border border-gray-200 ${compact ? 'p-3' : 'p-3 sm:p-4'}`} data-testid="day-calculator">
      <div className="text-xs font-semibold text-gray-600 mb-2">Day calculator</div>

      {usedPolicy && groups ? (
        <ul className="divide-y divide-gray-200 text-sm">
          {groups.map((g) => (
            <li key={`${g.from}-${g.reason}-${g.half || ''}`} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="min-w-0 text-gray-800">
                {g.label}
                {g.holiday && <span className="text-gray-500"> · {g.holiday}</span>}
                {g.half && <span className="text-gray-500"> · {g.half === 'pm' ? 'afternoon' : 'morning'} only</span>}
                {!g.holiday && g.reason !== 'working' && REASON_NOTE[g.reason] && (
                  <span className="text-[11px] text-gray-400"> · {REASON_NOTE[g.reason]}{g.reason === 'short' ? ` ${fmtDays(g.value)}` : ''}</span>
                )}
              </span>
              <span className={`tabular-nums flex-none ${g.reason === 'holiday' && g.subtotal === 0 ? 'text-green-700' : 'text-gray-800'}`}>
                {g.reason === 'holiday' && g.subtotal === 0 ? 'holiday 0' : fmtDays(g.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">
          This year&apos;s leave policy isn&apos;t published yet, so days are counted the old way: whole days, every day in the range
          unless weekends are left out.
        </p>
      )}

      <div className="flex items-baseline justify-between gap-3 pt-2 mt-1 border-t border-gray-200">
        <span className="text-sm font-semibold text-gray-800">Charged to {typeName || '—'}</span>
        <span className="text-sm font-semibold tabular-nums text-gray-900">{fmtDays(total)} day{Number(total) === 1 ? '' : 's'}</span>
      </div>
      {balance && !balance.unlimited && balance.left !== null && (
        <div className="text-[11px] text-gray-500 mt-1">
          Balance after: {fmtDays(balance.left)} → <span className={balance.after < 0 ? 'text-red-600 font-semibold' : ''}>{fmtDays(balance.after)}</span>
          {balance.booked > 0 && <> · {fmtDays(balance.booked)} already waiting for approval</>}
        </div>
      )}
      {balance?.unlimited && <div className="text-[11px] text-gray-500 mt-1">No limit on this type.</div>}
      {usedPolicy && breakdown?.mode && <div className="text-[11px] text-gray-400 mt-0.5">{MODE_NOTE[breakdown.mode]}</div>}
      {breakdown?.countedAs === 'calendar' && (
        <div className="text-[11px] text-gray-400 mt-0.5">Counted in calendar days — every day counts, public holidays included.</div>
      )}
    </div>
  );
};

export default DayCalculator;
