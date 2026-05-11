import { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CURRENT_YEAR = new Date().getFullYear();

const pad = (n) => String(n).padStart(2, '0');
const daysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m is 1-indexed

export const DEFAULT_DATE_RANGE = {
  startDate: `${CURRENT_YEAR}-01-01`,
  endDate:   `${CURRENT_YEAR}-12-31`,
  label:     String(CURRENT_YEAR),
};

const getWeekDays = (year, month, week) => {
  const start = (week - 1) * 7 + 1;
  const end = Math.min(week * 7, daysInMonth(year, month));
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const computeRange = (year, month, week, day) => {
  if (month === null) {
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }
  const m = pad(month);
  if (week === null) {
    return { startDate: `${year}-${m}-01`, endDate: `${year}-${m}-${pad(daysInMonth(year, month))}` };
  }
  const weekStart = (week - 1) * 7 + 1;
  const weekEnd   = Math.min(week * 7, daysInMonth(year, month));
  if (day === null) {
    return { startDate: `${year}-${m}-${pad(weekStart)}`, endDate: `${year}-${m}-${pad(weekEnd)}` };
  }
  return { startDate: `${year}-${m}-${pad(day)}`, endDate: `${year}-${m}-${pad(day)}` };
};

const computeLabel = (year, month, week, day) => {
  if (month === null) return String(year);
  const monthName = MONTHS[month - 1];
  if (week === null) return `${monthName} ${year}`;
  const weekStart = (week - 1) * 7 + 1;
  const weekEnd   = Math.min(week * 7, daysInMonth(year, month));
  if (day === null) return `${monthName} ${year} · Wk ${week} (${weekStart}–${weekEnd})`;
  return `${MONTHS[month - 1]} ${pad(day)}, ${year}`;
};

const Btn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
      ${active
        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
      }`}
  >
    {children}
  </button>
);

const FilterRow = ({ label, children }) => (
  <div className="flex items-start gap-3">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1.5 w-14 flex-shrink-0">
      {label}
    </span>
    <div className="flex gap-1.5 flex-wrap">{children}</div>
  </div>
);

const AnalyticsDateFilter = ({ onChange }) => {
  const [years, setYears]   = useState([CURRENT_YEAR]);
  const [year,  setYear]    = useState(CURRENT_YEAR);
  const [month, setMonth]   = useState(null);
  const [week,  setWeek]    = useState(null);
  const [day,   setDay]     = useState(null);

  useEffect(() => {
    analyticsService.getActiveYears()
      .then(res => {
        const active = res.data?.years;
        if (Array.isArray(active) && active.length > 0) {
          setYears(active);
          if (!active.includes(year)) {
            const latest = active[0];
            setYear(latest);
            setMonth(null); setWeek(null); setDay(null);
            onChange({ ...computeRange(latest, null, null, null), label: computeLabel(latest, null, null, null) });
          }
        }
      })
      .catch(() => {});
  }, []);

  const fire = (y, m, w, d) => {
    onChange({ ...computeRange(y, m, w, d), label: computeLabel(y, m, w, d) });
  };

  const handleYear  = (y) => { setYear(y);  setMonth(null); setWeek(null); setDay(null); fire(y, null, null, null); };
  const handleMonth = (m) => { setMonth(m); setWeek(null);  setDay(null);  fire(year, m, null, null); };
  const handleWeek  = (w) => { setWeek(w);  setDay(null);   fire(year, month, w, null); };
  const handleDay   = (d) => { setDay(d);   fire(year, month, week, d); };

  const weeksCount = month ? Math.ceil(daysInMonth(year, month) / 7) : 0;
  const weekDays   = week  ? getWeekDays(year, month, week) : [];

  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm space-y-3">
      {/* Year */}
      <FilterRow label="Year">
        {years.map(y => (
          <Btn key={y} active={year === y} onClick={() => handleYear(y)}>{y}</Btn>
        ))}
      </FilterRow>

      {/* Month */}
      <FilterRow label="Month">
        <Btn active={month === null} onClick={() => handleMonth(null)}>All</Btn>
        {MONTHS.map((name, i) => (
          <Btn key={i} active={month === i + 1} onClick={() => handleMonth(i + 1)}>{name}</Btn>
        ))}
      </FilterRow>

      {/* Week — visible only when a specific month is selected */}
      {month !== null && (
        <FilterRow label="Week">
          <Btn active={week === null} onClick={() => handleWeek(null)}>Full Month</Btn>
          {Array.from({ length: weeksCount }, (_, i) => (
            <Btn key={i + 1} active={week === i + 1} onClick={() => handleWeek(i + 1)}>Wk {i + 1}</Btn>
          ))}
        </FilterRow>
      )}

      {/* Day — visible only when a specific week is selected */}
      {week !== null && (
        <FilterRow label="Day">
          <Btn active={day === null} onClick={() => handleDay(null)}>All</Btn>
          {weekDays.map(d => (
            <Btn key={d} active={day === d} onClick={() => handleDay(d)}>{d}</Btn>
          ))}
        </FilterRow>
      )}
    </div>
  );
};

export default AnalyticsDateFilter;
