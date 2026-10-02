import { rangeLabel } from './leaveFormat';

/**
 * "Who else is away" (mockup 3) — this request against colleagues of the same
 * role over the same dates. Names, dates and approved/waiting only: never a
 * type or a reason (sick leave is health data).
 *
 * props:
 *   away      { dates|null, holidays:[{date,name}], rows:[{name,from,to,approved}], overLimit:[dates] }
 *   applicant 'Njeri Wambui'
 *   start, end
 */
const dayNum = (iso) => Number(iso.slice(8, 10));

const AwayStrip = ({ away, applicant, start, end }) => {
  if (!away) return null;
  const holidays = new Map((away.holidays || []).map((h) => [h.date, h.name]));
  const over = new Set(away.overLimit || []);

  // A long request (over two months) gets a list rather than a grid.
  if (!away.dates) {
    return away.rows.length === 0 ? <p className="text-sm text-gray-500">Nobody else in the same role is away.</p> : (
      <ul className="text-sm text-gray-700 space-y-0.5">
        {away.rows.map((r) => <li key={`${r.name}-${r.from}`}>{r.name} · {rangeLabel(r.from, r.to)} · {r.approved ? 'approved' : 'waiting'}</li>)}
      </ul>
    );
  }

  const cols = away.dates;
  const covers = (r, d) => r.from <= d && d <= r.to;
  const people = [{ name: applicant, from: start, to: end, self: true }, ...away.rows];

  return (
    <div data-testid="away-strip">
      <div className="overflow-x-auto">
        <table className="text-[11px] border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="text-left font-normal text-gray-400 pr-2" />
              {cols.map((d) => (
                <th key={d} className={`w-6 min-w-[1.5rem] font-normal ${over.has(d) ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>{dayNum(d)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((r) => (
              <tr key={`${r.name}-${r.from}`}>
                <td className="pr-2 whitespace-nowrap text-gray-600 max-w-[9rem] truncate">{r.self ? `${r.name.split(' ')[0]} (this)` : r.name}</td>
                {cols.map((d) => {
                  const hol = holidays.get(d);
                  const on = covers(r, d);
                  const cls = hol ? 'bg-gray-100 text-gray-500'
                    : !on ? ''
                      : r.self ? 'bg-amber-200' : r.approved ? 'bg-green-200' : 'bg-amber-100';
                  return <td key={d} className={`h-4 rounded-sm text-center ${cls}`} title={hol || undefined}>{hol && on ? 'H' : ''}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">
        Amber = this request · green = approved leave · pale amber = waiting · H = public holiday
        {over.size > 0 && <span className="text-red-600"> · red dates: more of this role away than the clinic usually allows</span>}
      </p>
      {away.rows.length === 0 && <p className="text-xs text-gray-500 mt-1">Nobody else in the same role is away.</p>}
    </div>
  );
};

export default AwayStrip;
