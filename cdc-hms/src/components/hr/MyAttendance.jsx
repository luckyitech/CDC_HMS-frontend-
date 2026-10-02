import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Smartphone, Trash2 } from 'lucide-react';
import { useHrContext } from '../../contexts/HrContext';
import hrService from '../../services/hrService';
import Spinner from '../shared/Spinner';
import ConfirmActionModal from '../shared/ConfirmActionModal';
import { notify } from '../../utils/notify';
import StarCalendar, { StarLegend } from './StarCalendar';
import { Section } from './hrUi';
import {
  dayLabel, monthLabel, monthShort, shiftMonth, thisMonth, todayIso, hoursMinutes, hoursColon,
  StarPair, Pill, hhmmOf,
} from './hrFormat';

/**
 * MyAttendance — a person's own time & attendance (HR Suite, B21): Today,
 * My working hours, My stars (calendar + tables, month browsable), My phones,
 * Last 7 days. Extracted from HrDashboard in B27 phase 4 so the HR dashboard
 * and My profile's Activity tab show exactly the same thing.
 *
 * Everything here is the signed-in person's own. Nothing here can check
 * anyone in.
 */
const Card = ({ title, right, className = '', children }) => (
  <Section title={title} actions={right} className={className}>{children}</Section>
);

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MyAttendance = () => {
  const { summaries, loadSummary } = useHrContext();
  const [month, setMonth] = useState(thisMonth());
  const [mine, setMine] = useState(null);         // /attendance/me (this month)
  const [hours, setHours] = useState(null);       // /work-hours/me
  const [devices, setDevices] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [confirmDevice, setConfirmDevice] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const summary = summaries[month] || null;

  useEffect(() => {
    let cancelled = false;
    setLoadingMonth(true);
    loadSummary(month).catch((e) => notify('error', e?.message || 'Could not load your stars')).finally(() => { if (!cancelled) setLoadingMonth(false); });
    return () => { cancelled = true; };
  }, [month, loadSummary]);

  useEffect(() => {
    let cancelled = false;
    const from = todayIso();
    const fromDate = new Date(`${from}T12:00:00Z`); fromDate.setUTCDate(fromDate.getUTCDate() - 6);
    Promise.all([
      hrService.mine({ from: fromDate.toISOString().slice(0, 10), to: from }),
      hrService.myWorkHours(),
      hrService.myDevices(),
    ]).then(([m, h, d]) => {
      if (cancelled) return;
      setMine(m?.data || null);
      setHours(h?.data || null);
      setDevices(d?.data || []);
    }).catch((e) => notify('error', e?.message || 'Could not load your attendance'));
    return () => { cancelled = true; };
  }, []);

  // The "so far" clock on the Today card
  useEffect(() => { const t = setInterval(() => setNowTick(Date.now()), 60000); return () => clearInterval(t); }, []);

  const removeDevice = async () => {
    const d = confirmDevice;
    setConfirmDevice(null);
    try {
      await hrService.revokeDevice(d.id);
      setDevices((prev) => prev.filter((x) => x.id !== d.id));
      notify('success', 'Phone removed — it will ask you to sign in next time.');
    } catch (e) { notify('error', e?.message || 'Could not remove the phone'); }
  };

  // ---- derived: today ----
  const open = mine?.today?.open || null;
  const todayRows = (mine?.rows || []).filter((r) => r.clinicDate === mine?.today?.clinicDate && r.status !== 'refused');
  const lastToday = todayRows[0] || null;
  const expected = mine?.today?.expected || {};
  const minutesSoFar = open ? Math.max(0, Math.round((nowTick - new Date(open.checkInAt)) / 60000)) : null;
  const state = open ? 'in' : lastToday ? 'out' : expected.source === 'holiday' ? 'holiday' : (expected.source === 'off' || !expected.start) ? 'off' : 'not_in';
  const stateLabel = { in: 'Checked in', out: 'Checked out', off: 'Day off', holiday: expected.holiday || 'Public holiday', not_in: 'Not yet in' }[state];
  const statePill = { in: 'ok', out: 'n', off: 'n', holiday: 'n', not_in: 'warn' }[state];
  const punctLabel = (s) => ({ on_time: 'on time', early: 'early', late: 'late', none: null }[s] || null);
  const bigTime = open ? open.checkInHHMM : lastToday ? lastToday.checkOutHHMM || lastToday.checkInHHMM : '—';
  const bigSub = open
    ? [open.door, punctLabel(open.checkInPunctuality), minutesSoFar != null ? `${hoursMinutes(minutesSoFar)} so far` : null].filter(Boolean).join(' · ')
    : lastToday
      ? [`in ${lastToday.checkInHHMM}`, lastToday.minutesWorked != null ? hoursMinutes(lastToday.minutesWorked) : null].filter(Boolean).join(' · ')
      : expected.start ? `Your day starts at ${expected.start}` : '';

  // This week strip (Mon–Sat), from the 7-day rows
  const weekStrip = (() => {
    const today = mine?.today?.clinicDate || todayIso();
    const d = new Date(`${today}T12:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0
    const monday = new Date(d); monday.setUTCDate(d.getUTCDate() - dow);
    const cells = [];
    for (let i = 0; i < 6; i++) {
      const day = new Date(monday); day.setUTCDate(monday.getUTCDate() + i);
      const iso = day.toISOString().slice(0, 10);
      const rows = (mine?.rows || []).filter((r) => r.clinicDate === iso && r.status === 'closed');
      const mins = rows.reduce((a, r) => a + (r.minutesWorked || 0), 0) + (iso === today && open && minutesSoFar ? minutesSoFar : 0);
      cells.push({ iso, label: WEEKDAY[day.getUTCDay()], mins: rows.length || (iso === today && open) ? mins : null, isToday: iso === today, future: iso > today });
    }
    return cells;
  })();
  const weekTotal = weekStrip.reduce((a, c) => a + (c.mins || 0), 0);

  // ---- derived: working hours (weekday pattern) ----
  const hoursLine = (() => {
    if (!hours?.week) return [];
    const byDow = new Map(hours.week.map((w) => [w.weekday, w]));
    const fmt = (w) => (!w ? '—' : w.source === 'off' || !w.start ? 'Off' : `${w.start} – ${w.end}`);
    const monFri = [1, 2, 3, 4, 5].map((n) => fmt(byDow.get(n)));
    const same = monFri.every((x) => x === monFri[0]);
    const lines = same ? [['Mon – Fri', monFri[0]]] : [1, 2, 3, 4, 5].map((n) => [WEEKDAY[n], fmt(byDow.get(n))]);
    lines.push(['Saturday', fmt(byDow.get(6))], ['Sunday', fmt(byDow.get(0))], ['Grace', `${hours.graceMinutes ?? 0} min`]);
    return lines;
  })();

  const table = summary?.table;
  const prev = summary?.previousMonth?.table;
  const prevLabel = summary?.previousMonth?.month ? monthShort(summary.previousMonth.month) : '—';
  const tableRows = table ? [
    ['Working days', `${table.workingDays.worked} of ${table.workingDays.total}`, `${table.workingDays.leave} on leave`, prev ? `${prev.workingDays.worked} of ${prev.workingDays.total}` : '—'],
    ['Hours worked', hoursMinutes(table.hoursWorkedMinutes), `expected ${hoursMinutes(table.expectedMinutes)}`, prev ? hoursMinutes(prev.hoursWorkedMinutes) : '—'],
    ['Average check-in', table.avgIn || '—', expected.start ? `required ${expected.start}` : '', prev?.avgIn || '—'],
    ['Average check-out', table.avgOut || '—', expected.end ? `day ends ${expected.end}` : '', prev?.avgOut || '—'],
    ['Minutes late, total', table.lateMinutesTotal, table.lateCount ? `${table.lateCount} late check-in${table.lateCount === 1 ? '' : 's'}` : '', prev ? prev.lateMinutesTotal : '—', table.lateMinutesTotal > 0 ? 'text-red-700' : ''],
    ['Minutes left early, total', table.earlyOutMinutesTotal, table.earlyOutCount ? `${table.earlyOutCount} early check-out${table.earlyOutCount === 1 ? '' : 's'}` : '', prev ? prev.earlyOutMinutesTotal : '—', table.earlyOutMinutesTotal > 0 ? 'text-red-700' : ''],
    ['Streak without a red star', `${summary.streakNoRed ?? 0} day${summary.streakNoRed === 1 ? '' : 's'}`, '', '—'],
    ['Missed check-outs', table.missedCheckouts, '', prev ? prev.missedCheckouts : '—'],
  ] : [];


  return (
    <div>
      <div className="grid md:grid-cols-2 gap-3">
        <Card title="Today">
          <div className="flex items-center gap-4 flex-wrap">
            <Pill tone={statePill}><span className="w-1.5 h-1.5 rounded-full bg-current" />{stateLabel}</Pill>
            <div>
              <div className="text-3xl font-bold tabular-nums leading-none text-gray-800">{bigTime}</div>
              <div className="text-xs text-gray-500 mt-1">{bigSub}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-3">
            {weekStrip.map((c) => (
              <div key={c.iso} className={`rounded-lg border px-1.5 py-2 text-center ${c.isToday ? 'border-primary bg-blue-50' : 'border-gray-200 bg-gray-50'} ${c.future ? 'opacity-50' : ''}`}>
                <b className="block text-[11px] font-medium text-gray-500">{c.label}</b>
                <span className="text-sm font-semibold tabular-nums text-gray-800">{c.mins != null ? hoursColon(c.mins) : '—'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            This week: <b className="tabular-nums text-gray-800">{hoursMinutes(weekTotal)}</b>
            {expected.start && <> · Your hours today: <b className="tabular-nums text-gray-800">{expected.start} – {expected.end}</b></>}
            {open ? ' · Tap the entrance tag to check out.' : state === 'not_in' ? ' · Tap the entrance tag to check in.' : ''}
          </p>
        </Card>

        <Card title="My working hours">
          {hoursLine.length ? (
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
              {hoursLine.map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd className="tabular-nums text-gray-800 text-right">{v}</dd></div>
              ))}
            </dl>
          ) : <Spinner />}
          <p className="text-xs text-gray-500 mt-3">Set by HR. Later these will follow the shift roster and the doctors' schedule.</p>
        </Card>
      </div>

      <Card className="mt-3" title="My stars" right={(
        <div className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden text-xs font-medium">
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="px-2 py-1.5 text-gray-600 hover:bg-gray-50" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-3 py-1.5 bg-primary text-white">{monthLabel(month)}</span>
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= thisMonth()} className="px-2 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}>
        {loadingMonth && !summary ? <Spinner /> : summary ? (
          <div className="grid lg:grid-cols-[minmax(260px,320px)_1fr] gap-5">
            <div>
              <StarCalendar month={summary.month} days={summary.calendar} today={todayIso()} />
              <StarLegend className="mt-2" />
            </div>
            <div className="space-y-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="text-left py-1.5 pr-2 font-semibold">{monthShort(summary.month)}</th>
                  <th className="text-right py-1.5 px-2 font-semibold"><span className="text-green-700">★</span> On time</th>
                  <th className="text-right py-1.5 px-2 font-semibold"><span className="text-[#D4A017]">★</span> Gold</th>
                  <th className="text-right py-1.5 px-2 font-semibold"><span className="text-red-700">★</span> Red</th>
                  <th className="text-right py-1.5 pl-2 font-semibold">Pending</th>
                </tr></thead>
                <tbody className="tabular-nums">
                  {[['Check-ins', summary.stars.in], ['Check-outs', summary.stars.out], ['All stars', summary.stars.all, true]].map(([label, s, bold]) => (
                    <tr key={label} className={`border-b border-gray-100 ${bold ? 'font-semibold' : ''}`}>
                      <td className="py-1.5 pr-2 text-gray-800">{label}</td>
                      <td className="py-1.5 px-2 text-right">{s.green}</td>
                      <td className="py-1.5 px-2 text-right">{s.gold}</td>
                      <td className="py-1.5 px-2 text-right">{s.red}</td>
                      <td className="py-1.5 pl-2 text-right text-gray-500">{s.pending || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-sm">
                <thead><tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="text-left py-1.5 pr-2 font-semibold">{month === thisMonth() ? 'This month so far' : monthLabel(summary.month)}</th>
                  <th className="text-right py-1.5 px-2 font-semibold">Value</th>
                  <th className="py-1.5 px-2" />
                  <th className="text-right py-1.5 pl-2 font-semibold">{prevLabel}</th>
                </tr></thead>
                <tbody className="tabular-nums">
                  {tableRows.map(([k, v, note, p, cls]) => (
                    <tr key={k} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2 text-gray-800">{k}</td>
                      <td className={`py-1.5 px-2 text-right ${cls || ''}`}>{v}</td>
                      <td className="py-1.5 px-2 text-xs text-gray-500">{note}</td>
                      <td className="py-1.5 pl-2 text-right text-gray-600">{p}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <p className="text-sm text-gray-500">No data for this month.</p>}
      </Card>

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <Card title="My phones">
          {devices === null ? <Spinner /> : devices.length === 0 ? (
            <p className="text-sm text-gray-500">No phone is remembered yet. The first time you tap the entrance tag, sign in once and tick "remember this phone".</p>
          ) : devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-primary flex items-center justify-center flex-none"><Smartphone className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0 text-sm text-gray-800">{d.label}
                <div className="text-[11px] text-gray-500">Remembered {dayLabel(String(d.createdAt).slice(0, 10), true)} · last used {dayLabel(String(d.lastSeenAt).slice(0, 10))} {hhmmOf(d.lastSeenAt)}</div>
              </div>
              <button type="button" onClick={() => setConfirmDevice(d)} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-3">A remembered phone checks you in without signing in. Remove it if the phone is lost or replaced. HR can also remove it from your staff file.</p>
        </Card>
        <Card title="Last 7 days">
          {!mine ? <Spinner /> : (mine.rows || []).filter((r) => r.status !== 'refused').length === 0 ? <p className="text-sm text-gray-500">No sessions in the last 7 days.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="text-left py-1.5 font-semibold">Date</th><th className="text-left py-1.5 font-semibold">In</th><th className="text-left py-1.5 font-semibold">Out</th><th className="text-right py-1.5 font-semibold">Hours</th><th className="text-left py-1.5 pl-3 font-semibold">Stars</th>
              </tr></thead>
              <tbody className="tabular-nums">
                {(mine.rows || []).filter((r) => r.status !== 'refused').map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-800">{dayLabel(r.clinicDate)}</td>
                    <td className="py-1.5">{r.checkInHHMM}</td>
                    <td className="py-1.5">{r.checkOutHHMM || '—'}{r.amendedAt && <small className="text-gray-400 ml-1">amended</small>}</td>
                    <td className="py-1.5 text-right">{hoursColon(r.minutesWorked)}</td>
                    <td className="py-1.5 pl-3"><StarPair session={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <ConfirmActionModal
        isOpen={!!confirmDevice}
        onClose={() => setConfirmDevice(null)}
        onConfirm={removeDevice}
        title="Remove this phone?"
        message={`"${confirmDevice?.label}" will no longer check you in without signing in.`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  );
};

export default MyAttendance;
