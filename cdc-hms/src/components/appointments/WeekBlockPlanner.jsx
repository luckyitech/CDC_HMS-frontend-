import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Lock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ModalOverlay } from '../shared/Modal';
import appointmentService from '../../services/appointmentService';
import doctorBlockService from '../../services/doctorBlockService';
import hrSelfService from '../../services/hrSelfService';
import { TIME_SLOTS } from '../../constants/appointmentSlots';

// Block time — "tap the week" (12 Oct 2026, Emu chose Option A of
// claude.ai/artifact/V9HnyTtqfErHyYuynsVTUX). One week of one doctor's diary
// as a grid: tap slots, a whole day (its heading) or a time across the week
// (its label), then ONE button blocks or unblocks the selection. No
// Block/Unblock modes and no forms; a reason and "repeat weekly" are optional.
// Used by the doctor's My Schedule (own diary) and by staff holding
// calendar.block on Book Appointment (doctorId names the doctor).
//
// Patients already booked in the chosen time are NOT cancelled — the bar
// warns how many, so the front desk can call them.
//
// Leave (12 Oct 2026): where HR set "How doctors take leave" to 'record', a
// doctor on their OWN diary (ownDiary) who picks whole days can tick "This is
// leave" — it is recorded as approved leave of the chosen type (charged to
// their balance; the server blocks the diary and tells HR). Elsewhere doctors
// apply through My leave.

const toDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const key = (date, time) => `${date}|${time}`;
const REPEAT_WEEKS = [2, 4, 8, 12];

const WeekBlockPlanner = ({ doctorId, doctorName = '', ownDiary = false, onClose, onDone }) => {
  const today = toDateString(new Date());
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [week, setWeek] = useState({});          // date → { dayBlocked, slots: { time → {status, booked} } }
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(() => new Set());
  const [reason, setReason] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [busy, setBusy] = useState(false);
  const [leaveMode, setLeaveMode] = useState(null);     // 'record' | 'apply' | null
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveType, setLeaveType] = useState('');
  const [asLeave, setAsLeave] = useState(false);

  useEffect(() => {
    if (!ownDiary) return undefined;
    let live = true;
    hrSelfService.leave()
      .then((r) => {
        if (!live) return;
        const d = r.data || {};
        const types = Array.isArray(d.types) ? d.types : [];
        setLeaveMode(d.doctorLeaveMode || null);
        setLeaveTypes(types);
        setLeaveType((types.find((t) => /annual/i.test(`${t.key} ${t.name}`)) || types[0])?.key || '');
      })
      .catch(() => {});
    return () => { live = false; };
  }, [ownDiary]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: toDateString(d), label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }), weekday: d.getDay() };
  }), [weekStart]);
  const isPast = (date, time) => date < today || (date === today && time && slotPassed(time));

  const load = useCallback(async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const res = await Promise.all(days.map((d) => appointmentService.getSlots(doctorId, d.date)));
      const next = {};
      res.forEach((r, i) => {
        const data = r.data || {};
        const slots = {};
        (data.slots || []).forEach((s) => { slots[s.time] = { status: s.status, booked: (s.appointments || []).length }; });
        next[days[i].date] = { dayBlocked: !!data.dayBlocked, slots };
      });
      setWeek(next);
    } catch (err) {
      toast.error(err.message || 'Could not load the diary');
    } finally {
      setLoading(false);
    }
  }, [doctorId, days]);
  useEffect(() => { load(); setSel(new Set()); }, [load]);

  const cell = (date, time) => week[date]?.slots?.[time] || { status: 'free', booked: 0 };
  const blocked = (date, time) => cell(date, time).status === 'blocked';

  // Tap a set of slots: all already picked → unpick them, else pick them all.
  const pick = (keys) => setSel((prev) => {
    const live = keys.filter((k) => { const [d, t] = k.split('|'); return !isPast(d, t); });
    if (!live.length) return prev;
    const next = new Set(prev);
    const allOn = live.every((k) => next.has(k));
    live.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
    return next;
  });

  const picked = [...sel].map((k) => { const [date, time] = k.split('|'); return { date, time }; });
  const toBlock = picked.filter((p) => !blocked(p.date, p.time));
  const toUnblock = picked.filter((p) => blocked(p.date, p.time));
  const patients = toBlock.reduce((n, p) => n + cell(p.date, p.time).booked, 0);
  const byDate = (list) => list.reduce((m, p) => { (m[p.date] ||= []).push(p.time); return m; }, {});
  // Whole days: every slot still open on that date is picked (today counts
  // from now). Only whole days can be leave.
  const blockDates = byDate(toBlock);
  const isWholeDay = (date, times) => TIME_SLOTS.filter((t) => !isPast(date, t)).every((t) => times.includes(t));
  const canLeave = leaveMode === 'record' && toBlock.length > 0 && toUnblock.length === 0 && leaveTypes.length > 0
    && Object.entries(blockDates).every(([d, times]) => isWholeDay(d, times));
  const recording = canLeave && asLeave;
  const leaveDates = Object.keys(blockDates).sort();
  const pickedDays = [...new Set(picked.map((p) => p.date))].sort()
    .map((d) => days.find((x) => x.date === d)?.label).filter(Boolean).join(', ');

  const run = async (fn, okText) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okText);
      setSel(new Set()); setReason(''); setRepeat(false); setAsLeave(false);
      onDone?.();
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not save — nothing was changed for the slots that failed');
      await load();
    } finally {
      setBusy(false);
    }
  };

  // Leave: consecutive dates become one record each.
  const doRecordLeave = () => run(async () => {
    const runs = [];
    leaveDates.forEach((d) => {
      const last = runs[runs.length - 1];
      if (last && toDateString(addDays(new Date(`${last.endDate}T00:00:00`), 1)) === d) last.endDate = d;
      else runs.push({ startDate: d, endDate: d });
    });
    for (const r of runs) {
      await hrSelfService.record({ leaveType, startDate: r.startDate, endDate: r.endDate, reason: reason.trim() || null });
    }
  }, `Leave recorded — ${leaveDates.length} day${leaveDates.length === 1 ? '' : 's'}; your diary is blocked`);

  const doBlock = () => run(async () => {
    const r = reason.trim() || undefined;
    for (const [date, times] of Object.entries(byDate(toBlock))) {
      const wholeDay = isWholeDay(date, times);
      const slots = wholeDay ? ['ALL_DAY'] : times;
      if (repeat) {
        const until = toDateString(addDays(new Date(`${date}T00:00:00`), 7 * (repeatWeeks - 1)));
        await doctorBlockService.blockRecurring(date, until, slots, [new Date(`${date}T00:00:00`).getDay()], r, doctorId);
      } else if (wholeDay) {
        await doctorBlockService.block(date, undefined, r, doctorId);
      } else if (times.length === 1) {
        await doctorBlockService.block(date, times[0], r, doctorId);
      } else {
        await doctorBlockService.blockRange(date, times, r, doctorId);
      }
    }
  }, `${toBlock.length} slot${toBlock.length === 1 ? '' : 's'} blocked${repeat ? `, weekly for ${repeatWeeks} weeks` : ''}`);

  const doUnblock = () => run(async () => {
    for (const [date, times] of Object.entries(byDate(toUnblock))) {
      if (week[date]?.dayBlocked) {
        // A whole-day block: lift it, then keep the slots that were NOT picked blocked.
        await doctorBlockService.unblock(date, undefined, doctorId);
        const keep = TIME_SLOTS.filter((t) => !times.includes(t));
        if (keep.length === 1) await doctorBlockService.block(date, keep[0], undefined, doctorId);
        else if (keep.length > 1) await doctorBlockService.blockRange(date, keep, undefined, doctorId);
      } else {
        await doctorBlockService.unblockRange(date, times, doctorId);
      }
    }
  }, `${toUnblock.length} slot${toUnblock.length === 1 ? '' : 's'} unblocked`);

  const thisWeek = toDateString(mondayOf(new Date()));
  const weekLabel = `${days[0].label} – ${days[6].label} ${addDays(weekStart, 6).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;

  const cellClass = (date, time) => {
    const c = cell(date, time);
    const on = sel.has(key(date, time));
    const past = isPast(date, time);
    const base = 'h-9 w-full rounded-lg text-[11px] font-semibold transition-colors';
    const tone = c.status === 'blocked' ? 'bg-red-100 text-red-700'
      : c.booked ? 'bg-blue-50 text-blue-800'
        : 'bg-white text-gray-400 border border-gray-200';
    const ring = on ? 'ring-2 ring-primary ring-offset-1' : '';
    return `${base} ${tone} ${ring} ${past ? 'opacity-40 cursor-default' : 'cursor-pointer'}`;
  };
  const cellText = (date, time) => {
    const c = cell(date, time);
    if (c.status === 'blocked') return 'Blocked';
    if (c.booked) return `${c.booked} booked`;
    return 'Free';
  };

  return (
    <ModalOverlay align="top">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl my-4 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-5 h-5 text-red-500 shrink-0" />
            <h2 className="font-bold text-gray-800 truncate">Block time{doctorName ? ` — ${doctorName}` : ''}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous week" disabled={toDateString(weekStart) <= thisWeek}
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="p-2 rounded-lg border border-gray-200 ui-hover text-gray-500 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[11rem] text-center">{weekLabel}</span>
            <button type="button" aria-label="Next week" onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="p-2 rounded-lg border border-gray-200 ui-hover text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Close" onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <p className="text-xs text-gray-500 mb-2">Tap slots to pick them — or a day, or a time, to pick the whole column or row.</p>
          <div className="min-w-[44rem] grid gap-1.5" style={{ gridTemplateColumns: '5.5rem repeat(7, minmax(0, 1fr))' }}>
            <span />
            {days.map((d) => (
              <button key={d.date} type="button" disabled={d.date < today}
                onClick={() => pick(TIME_SLOTS.map((t) => key(d.date, t)))}
                className={`h-9 rounded-lg text-xs font-semibold ${d.date === today ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 ui-hover'} disabled:opacity-40`}>
                {d.label}
              </button>
            ))}
            {TIME_SLOTS.map((t) => (
              <div key={t} className="contents">
                <button type="button" onClick={() => pick(days.map((d) => key(d.date, t)))}
                  className="h-9 rounded-lg text-xs font-semibold text-gray-600 text-left pl-2 ui-hover">
                  {t}
                </button>
                {days.map((d) => (
                  <button key={d.date} type="button" disabled={loading || isPast(d.date, t)}
                    aria-label={`${d.label} ${t} — ${cellText(d.date, t)}`}
                    aria-pressed={sel.has(key(d.date, t))}
                    onClick={() => pick([key(d.date, t)])}
                    className={cellClass(d.date, t)}>
                    {loading ? '' : cellText(d.date, t)}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {loading && <p className="text-xs text-gray-400 mt-2 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading the week…</p>}
        </div>

        {sel.size > 0 ? (
          <div className="border-t-2 border-primary px-5 py-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-gray-800">{sel.size} slot{sel.size === 1 ? '' : 's'} selected · {pickedDays}</span>
              {canLeave && (
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <input type="checkbox" checked={asLeave} onChange={(e) => setAsLeave(e.target.checked)} className="w-4 h-4" />
                  This is leave
                  {asLeave && (
                    <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} aria-label="Leave type"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-normal">
                      {leaveTypes.map((t) => (
                        <option key={t.key} value={t.key}>{t.name}{!t.unlimited && t.remaining != null ? ` (${t.remaining} left)` : ''}</option>
                      ))}
                    </select>
                  )}
                </label>
              )}
              {toBlock.length > 0 && (
                <>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional) — e.g. conference"
                    aria-label="Reason (optional)"
                    className="flex-1 min-w-[12rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary" />
                  {!recording && <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} className="w-4 h-4" />
                    Repeat weekly for
                    <select value={repeatWeeks} onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                      {REPEAT_WEEKS.map((w) => <option key={w} value={w}>{w} weeks</option>)}
                    </select>
                  </label>}
                </>
              )}
            </div>
            {patients > 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                {patients} patient{patients === 1 ? ' is' : 's are'} booked in this time. They stay booked — call them to rebook.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setSel(new Set())} disabled={busy}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 ui-hover">Clear</button>
              {toUnblock.length > 0 && (
                <button type="button" onClick={doUnblock} disabled={busy}
                  className="px-4 py-2 rounded-lg border border-green-600 text-green-700 text-sm font-semibold hover:bg-green-50 disabled:opacity-50">
                  Unblock {toUnblock.length}
                </button>
              )}
              {toBlock.length > 0 && (
                <button type="button" onClick={recording ? doRecordLeave : doBlock} disabled={busy || (recording && !leaveType)}
                  className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {recording
                    ? `Record leave · ${leaveDates.length} day${leaveDates.length === 1 ? '' : 's'}`
                    : `Block ${toBlock.length} slot${toBlock.length === 1 ? '' : 's'}`}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="border-t px-5 py-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-gray-200 bg-white" /> Free</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Patients booked</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100" /> Blocked</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-primary" /> Selected</span>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
};

// Has today's slot already started? ('9:30 AM' → compare with now.)
function slotPassed(time) {
  const [hm, ap] = time.split(' ');
  let [h, m] = hm.split(':').map(Number);
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

export default WeekBlockPlanner;
