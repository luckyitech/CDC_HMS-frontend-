import { Plus, ChevronRight } from 'lucide-react';
import { Pill } from '../hrFormat';
import { primaryButtonCls } from '../hrUi';
import {
  fmtDays, rangeLabel, progressLabel, STATUS_TONES, holidayDateLabel, monthDayLabel,
} from './leaveFormat';

/**
 * LeaveOverview — a person's own leave at a glance (mockup 4's Leave card):
 * tiles, My applications with where each stands, and Coming up (their leave
 * and public holidays). B27 phase 2 renders it on My leave; phase 4 moves the
 * same component into My profile's Leave tab.
 *
 * props:
 *   data     GET /api/hr/me/leave
 *   onApply  () => void          (hidden when absent)
 *   onOpen   (applicationId) => void   (rows aren't clickable without it)
 *   actions  extra buttons beside Apply (the staff file's Record leave)
 *   year, years, onYear          the year switch
 */
const Tile = ({ label, value, sub }) => (
  <div className="rounded-lg bg-gray-50 px-3 py-2.5 min-w-0">
    <div className="text-[11px] text-gray-500 truncate">{label}</div>
    <div className="text-xl font-semibold text-gray-900 tabular-nums">{value}</div>
    {sub && <div className="text-[11px] text-gray-500 truncate">{sub}</div>}
  </div>
);

const tilesFor = (data) => {
  const bal = data.balances || [];
  const tiles = [];
  for (const key of ['Annual', 'Sick']) {
    const b = bal.find((x) => x.leaveType === key);
    if (!b || b.unlimited) continue;
    const of = b.entitled !== null ? `of ${fmtDays(b.entitled)}${b.carriedIn > 0 ? ` + ${fmtDays(b.carriedIn)} carried` : ''}` : '';
    tiles.push({ label: `${b.name} left`, value: fmtDays(b.remaining), sub: `${of}${b.booked > 0 ? ` · ${fmtDays(b.booked)} waiting` : ''}` });
  }
  const used = bal.filter((b) => b.taken > 0);
  const total = used.reduce((s, b) => s + b.taken, 0);
  tiles.push({
    label: 'Used this year',
    value: fmtDays(total),
    sub: used.length ? used.map((b) => `${fmtDays(b.taken)} ${b.name.toLowerCase()}`).join(' · ') : 'none yet',
  });
  const carry = bal.find((b) => b.carriedLeft > 0 && b.carryExpires);
  if (carry) tiles.push({ label: 'Carried days expire', value: fmtDays(carry.carriedLeft), sub: `on ${holidayDateLabel(carry.carryExpires)}` });
  return tiles;
};

const LeaveOverview = ({ data, onApply, onOpen, year, years = [], onYear, actions = null, title = 'Leave' }) => {
  const tiles = tilesFor(data);
  const apps = data.applications || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5" data-testid="leave-overview">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title} — {data.year}</h3>
          {years.length > 1 && onYear && (
            <select className="rounded-md border border-gray-300 px-2 py-1 text-xs" value={year} onChange={(e) => onYear(Number(e.target.value))} aria-label="Year">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {onApply && (
            <button type="button" onClick={onApply} className={`${primaryButtonCls} inline-flex items-center gap-1.5`}>
              <Plus className="w-4 h-4" /> Apply for leave
            </button>
          )}
        </div>
      </div>

      {!data.policyPublished && (
        <p className="mt-2 text-[11px] text-gray-500">
          The {data.year} leave policy isn&apos;t published yet — days are counted the old way and your balance won&apos;t stop a request.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 my-3">
        {tiles.map((t) => <Tile key={t.label} {...t} />)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">My applications</h4>
          {apps.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">Nothing yet this year.</p>
          ) : (
            <ul className="divide-y divide-gray-100" data-testid="my-applications">
              {apps.map((a) => {
                const row = (
                  <>
                    <span className="flex-1 min-w-0 truncate text-gray-800">
                      {a.typeName} · {rangeLabel(a.startDate, a.endDate)} · {fmtDays(a.days)} d
                      {a.flags?.documentOwed && <span className="text-amber-700"> · document owed</span>}
                      {a.onBehalf && <span className="text-gray-400"> · recorded by HR</span>}
                    </span>
                    <Pill tone={STATUS_TONES[a.status] || 'n'}>{progressLabel(a)}</Pill>
                  </>
                );
                return (
                  <li key={a.id}>
                    {onOpen ? (
                      <button type="button" onClick={() => onOpen(a.id)} className="flex w-full items-center gap-2 py-2 text-left text-sm hover:bg-gray-50 rounded-md px-1 -mx-1">
                        {row}
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-none" />
                      </button>
                    ) : <div className="flex items-center gap-2 py-2 text-sm">{row}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Coming up</h4>
          {(data.upcoming || []).length === 0 ? (
            <p className="text-sm text-gray-500 py-2">Nothing in the next four months.</p>
          ) : (
            <ul className="divide-y divide-gray-100" data-testid="coming-up">
              {data.upcoming.slice(0, 10).map((u) => (
                <li key={`${u.kind}-${u.id || u.date}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-gray-800">{u.label}</span>
                  <span className="flex-none text-xs text-gray-500">
                    {u.kind === 'holiday' ? holidayDateLabel(u.date) : `${rangeLabel(u.date, u.endDate)} · ${['Approved', 'CancelRequested'].includes(u.status) ? 'approved' : 'waiting'}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {data.policy?.carryExpiry && (
            <p className="text-[11px] text-gray-400 mt-2">Carried days expire on {monthDayLabel(data.policy.carryExpiry)} each year.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveOverview;
