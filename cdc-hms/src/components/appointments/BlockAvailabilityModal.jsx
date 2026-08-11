import { useState, useEffect, useCallback } from 'react';
import {
  X, Lock, Unlock, CalendarDays, Clock,
  Sunrise, Sun, SlidersHorizontal, RefreshCw, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import doctorBlockService from '../../services/doctorBlockService';
import { TIME_SLOTS } from '../../constants/appointmentSlots';

const MORNING_SLOTS   = TIME_SLOTS.slice(0, TIME_SLOTS.indexOf('12:00 PM') + 1);
const AFTERNOON_SLOTS = TIME_SLOTS.slice(TIME_SLOTS.indexOf('2:00 PM'));

const DAYS = [
  { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 }, { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const toDateString = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const SectionLabel = ({ children }) => (
  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{children}</p>
);

const BlockAvailabilityModal = ({ onClose, onDone }) => {
  const today = toDateString(new Date());

  // ── Mode ────────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState('block');
  const isBlock = mode === 'block';

  // ── Block form state ─────────────────────────────────────────────────────────
  const [blockType,    setBlockType]    = useState('full-day');
  const [timePreset,   setTimePreset]   = useState('morning');
  const [customFrom,   setCustomFrom]   = useState('');
  const [customTo,     setCustomTo]     = useState('');
  const [whenType,     setWhenType]     = useState('today');
  const [specificDate, setSpecificDate] = useState('');
  const [rangeFrom,    setRangeFrom]    = useState('');
  const [rangeTo,      setRangeTo]      = useState('');
  const [weekdays,     setWeekdays]     = useState(new Set([1, 2, 3, 4, 5]));
  const [reason,       setReason]       = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  // ── Unblock list state ───────────────────────────────────────────────────────
  const [upcomingBlocks, setUpcomingBlocks] = useState([]);
  const [listLoading,    setListLoading]    = useState(false);
  const [clearing,       setClearing]       = useState(null);

  const fetchUpcoming = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await doctorBlockService.getUpcoming();
      setUpcomingBlocks(res.data?.blocks ?? []);
    } catch {
      toast.error('Failed to load blocked dates');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isBlock) fetchUpcoming();
  }, [isBlock, fetchUpcoming]);

  // Group consecutive dates (gap ≤ 3 days for weekends) with identical slots
  const groupedBlocks = (() => {
    if (!upcomingBlocks.length) return [];
    const sorted = [...upcomingBlocks].sort((a, b) => a.date.localeCompare(b.date));
    const groups = [];
    let cur = { fromDate: sorted[0].date, toDate: sorted[0].date, isFullDay: sorted[0].isFullDay, slots: sorted[0].slots, dates: [sorted[0].date] };
    for (let i = 1; i < sorted.length; i++) {
      const entry = sorted[i];
      const diff  = Math.round((new Date(entry.date + 'T00:00:00') - new Date(cur.toDate + 'T00:00:00')) / 86400000);
      const same  = entry.isFullDay === cur.isFullDay &&
        JSON.stringify([...entry.slots].sort()) === JSON.stringify([...cur.slots].sort());
      if (diff >= 1 && diff <= 3 && same) {
        cur.toDate = entry.date;
        cur.dates.push(entry.date);
      } else {
        groups.push(cur);
        cur = { fromDate: entry.date, toDate: entry.date, isFullDay: entry.isFullDay, slots: entry.slots, dates: [entry.date] };
      }
    }
    groups.push(cur);
    return groups;
  })();

  const handleClearGroup = async (group) => {
    setClearing(group.fromDate);
    try {
      await Promise.all(group.dates.map(d => doctorBlockService.clearDate(d)));
      const removed = new Set(group.dates);
      setUpcomingBlocks(prev => prev.filter(b => !removed.has(b.date)));
      toast.success(
        group.dates.length === 1
          ? `Blocks removed for ${group.fromDate}`
          : `Blocks removed: ${group.fromDate} → ${group.toDate} (${group.dates.length} days)`
      );
      onDone();
    } catch {
      toast.error('Failed to unblock');
    } finally {
      setClearing(null);
    }
  };

  // ── Switch mode ──────────────────────────────────────────────────────────────
  const switchMode = (m) => {
    setMode(m);
    setBlockType('full-day'); setTimePreset('morning');
    setCustomFrom(''); setCustomTo('');
    setWhenType('today'); setSpecificDate(''); setRangeFrom(''); setRangeTo('');
    setWeekdays(new Set([1, 2, 3, 4, 5]));
    setReason('');
  };

  // ── Block form computed values ───────────────────────────────────────────────
  const resolvedSlots = (() => {
    if (blockType === 'full-day')   return ['ALL_DAY'];
    if (timePreset === 'morning')   return MORNING_SLOTS;
    if (timePreset === 'afternoon') return AFTERNOON_SLOTS;
    const fi = TIME_SLOTS.indexOf(customFrom);
    const ti = TIME_SLOTS.indexOf(customTo);
    return fi >= 0 && ti > fi ? TIME_SLOTS.slice(fi, ti + 1) : [];
  })();

  const previewTime = (() => {
    if (blockType === 'full-day')   return 'Full Day';
    if (timePreset === 'morning')   return 'Morning (8:00 AM – 12:00 PM)';
    if (timePreset === 'afternoon') return 'Afternoon (2:00 PM – 5:00 PM)';
    if (resolvedSlots.length > 0)  return `${resolvedSlots[0]} – ${resolvedSlots[resolvedSlots.length - 1]}`;
    return '';
  })();

  const matchingDays = (() => {
    if (whenType === 'today')    return 1;
    if (whenType === 'specific') return specificDate ? 1 : 0;
    if (!rangeFrom || !rangeTo)  return 0;
    const start = new Date(rangeFrom + 'T00:00:00');
    const end   = new Date(rangeTo   + 'T00:00:00');
    if (end < start) return 0;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) { if (weekdays.has(cur.getDay())) count++; cur.setDate(cur.getDate() + 1); }
    return count;
  })();

  const totalBlocks = matchingDays * resolvedSlots.length;
  const canSubmit   = resolvedSlots.length > 0 && matchingDays > 0 && (
    whenType === 'today' ||
    (whenType === 'specific' && specificDate) ||
    (whenType === 'range' && rangeFrom && rangeTo && weekdays.size > 0)
  );

  const toggleWeekday = (day) => setWeekdays(prev => {
    const next = new Set(prev);
    next.has(day) ? next.delete(day) : next.add(day);
    return next;
  });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const date = whenType === 'today' ? today : specificDate;
      const r = reason.trim() || undefined;
      if (whenType === 'range') {
        await doctorBlockService.blockRecurring(rangeFrom, rangeTo, resolvedSlots, Array.from(weekdays), r);
      } else if (blockType === 'full-day') {
        await doctorBlockService.block(date, undefined, r);
      } else {
        await doctorBlockService.blockRange(date, resolvedSlots, r);
      }
      toast.success(`${totalBlocks} slot(s) blocked successfully`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to block availability');
    } finally {
      setSubmitting(false);
    }
  };

  const customToOptions = customFrom ? TIME_SLOTS.slice(TIME_SLOTS.indexOf(customFrom) + 1) : [];

  const Choice = ({ selected, onClick, icon: Icon, children }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all ${
        selected
          ? 'border-red-500 bg-red-50 text-red-700'
          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-blue-50'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            {isBlock ? <Lock className="w-5 h-5 text-red-500" /> : <Unlock className="w-5 h-5 text-green-500" />}
            <h2 className="font-bold text-gray-800">Manage Availability</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => switchMode('block')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${isBlock ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-blue-50'}`}
            >
              <Lock className="w-4 h-4" /> Block
            </button>
            <button
              onClick={() => switchMode('unblock')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${!isBlock ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-blue-50'}`}
            >
              <Unlock className="w-4 h-4" /> Unblock
            </button>
          </div>

          {/* ── UNBLOCK: list of existing blocks ── */}
          {!isBlock && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionLabel>Tap a block to remove it</SectionLabel>
                <button onClick={fetchUpcoming} className="text-gray-400 hover:text-gray-600 p-1 rounded" title="Refresh">
                  <RefreshCw className={`w-3.5 h-3.5 ${listLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {listLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : groupedBlocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Unlock className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No upcoming blocks found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {groupedBlocks.map((group) => {
                    const isRange = group.fromDate !== group.toDate;
                    const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                    const dateLabel = isRange
                      ? `${fmt(group.fromDate)} → ${fmt(group.toDate)}`
                      : new Date(group.fromDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
                    const slotLabel = group.isFullDay
                      ? 'Full Day'
                      : group.slots.length === 1
                        ? group.slots[0]
                        : `${group.slots[0]} – ${group.slots[group.slots.length - 1]} (${group.slots.length} slots)`;

                    return (
                      <div key={group.fromDate} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{dateLabel}</p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            {group.isFullDay ? <CalendarDays className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {slotLabel}
                            {isRange && <span className="text-gray-400">· {group.dates.length} days</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => handleClearGroup(group)}
                          disabled={clearing === group.fromDate}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {clearing === group.fromDate ? 'Removing...' : 'Unblock'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── BLOCK: form ── */}
          {isBlock && (
            <>
              <div>
                <SectionLabel>What?</SectionLabel>
                <div className="flex gap-2">
                  <Choice selected={blockType === 'full-day'} onClick={() => setBlockType('full-day')} icon={CalendarDays}>Full Day</Choice>
                  <Choice selected={blockType === 'time-range'} onClick={() => setBlockType('time-range')} icon={Clock}>Time Range</Choice>
                </div>
              </div>

              {blockType === 'time-range' && (
                <div>
                  <SectionLabel>Which time?</SectionLabel>
                  <div className="space-y-2">
                    {[
                      { value: 'morning',   Icon: Sunrise,           label: 'Morning',   sub: '8:00 AM – 12:00 PM' },
                      { value: 'afternoon', Icon: Sun,               label: 'Afternoon', sub: '2:00 PM – 5:00 PM'  },
                      { value: 'custom',    Icon: SlidersHorizontal, label: 'Custom',    sub: 'Pick specific slots' },
                    ].map(({ value, Icon, label, sub }) => (
                      <button
                        key={value}
                        onClick={() => setTimePreset(value)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                          timePreset === value ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300 hover:bg-blue-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="font-semibold text-sm flex-1">{label}</span>
                        <span className="text-xs text-gray-400">{sub}</span>
                      </button>
                    ))}
                  </div>
                  {timePreset === 'custom' && (
                    <div className="flex gap-3 mt-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">From</label>
                        <select value={customFrom} onChange={e => { setCustomFrom(e.target.value); setCustomTo(''); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary">
                          <option value="">Start time</option>
                          {TIME_SLOTS.slice(0, -1).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">To</label>
                        <select value={customTo} onChange={e => setCustomTo(e.target.value)} disabled={!customFrom}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50">
                          <option value="">End time</option>
                          {customToOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <SectionLabel>When?</SectionLabel>
                <div className="flex gap-2">
                  <Choice selected={whenType === 'today'}    onClick={() => setWhenType('today')}>Today</Choice>
                  <Choice selected={whenType === 'specific'} onClick={() => setWhenType('specific')}>Pick a Date</Choice>
                  <Choice selected={whenType === 'range'}    onClick={() => setWhenType('range')}>Date Range</Choice>
                </div>

                {whenType === 'specific' && (
                  <input type="date" value={specificDate} onChange={e => setSpecificDate(e.target.value)}
                    className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary" />
                )}

                {whenType === 'range' && (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">From</label>
                        <input type="date" value={rangeFrom} onChange={e => { setRangeFrom(e.target.value); setRangeTo(''); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">To</label>
                        <input type="date" value={rangeTo} min={rangeFrom || undefined} disabled={!rangeFrom} onChange={e => setRangeTo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-gray-500">Apply on</label>
                        <div className="flex gap-2 text-xs">
                          <button onClick={() => setWeekdays(new Set([1,2,3,4,5]))} className="text-red-500 hover:underline">Weekdays</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setWeekdays(new Set([0,1,2,3,4,5,6]))} className="text-red-500 hover:underline">Every day</button>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {DAYS.map(d => (
                          <button key={d.value} onClick={() => toggleWeekday(d.value)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              weekdays.has(d.value) ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <SectionLabel>Reason (optional · private)</SectionLabel>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Attending a conference — not visible to patients or staff"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-gray-400 mt-1">Only visible to you and admins</p>
              </div>

              {canSubmit && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-1.5">
                  <p className="text-sm font-bold text-red-700 mb-1">Summary</p>
                  <p className="text-sm text-gray-700"><span className="text-gray-400">Blocking:</span> <span className="font-medium">{previewTime}</span></p>
                  <p className="text-sm text-gray-700">
                    <span className="text-gray-400">When:</span>{' '}
                    <span className="font-medium">
                      {whenType === 'today' && 'Today'}
                      {whenType === 'specific' && specificDate}
                      {whenType === 'range' && rangeFrom && rangeTo && `${rangeFrom} → ${rangeTo}`}
                    </span>
                  </p>
                  {whenType === 'range' && (
                    <p className="text-sm text-gray-700">
                      <span className="text-gray-400">Days:</span>{' '}
                      <span className="font-medium">{DAYS.filter(d => weekdays.has(d.value)).map(d => d.label).join(', ')}</span>
                    </p>
                  )}
                  <p className="text-sm font-bold text-red-600 pt-1 border-t border-red-100 mt-1">
                    {matchingDays} day(s) × {blockType === 'full-day' ? 'full day' : `${resolvedSlots.length} slot(s)`} = <span className="text-base">{totalBlocks}</span> total
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t shrink-0">
          <button onClick={onClose}
            className={`py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-blue-50 transition-colors ${isBlock ? 'flex-1' : 'w-full'}`}>
            {isBlock ? 'Cancel' : 'Close'}
          </button>
          {isBlock && (
            <button onClick={handleSubmit} disabled={!canSubmit || submitting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Blocking...' : `Confirm Block${totalBlocks > 0 ? ` (${totalBlocks})` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockAvailabilityModal;
