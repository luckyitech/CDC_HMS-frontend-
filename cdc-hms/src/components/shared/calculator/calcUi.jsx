import { Copy } from 'lucide-react';
import { LEVELS } from '../../../utils/clinicalCalc';

/**
 * Consultation calculator — the small presentational pieces every tab shares
 * (11 Oct 2026): a number field, a two-way unit switch, a tick-pill, a coloured
 * chip, a coloured scale with a marker, a warning line and the result card.
 * No maths here: utils/clinicalCalc.js does that.
 */

export const todayLabel = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const dayLabel = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const INPUT = 'h-10 w-full rounded-lg border border-gray-300 px-2.5 text-[15px] text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-100';

export const NumField = ({ label, hint, value, onChange, type = 'text', inputMode = 'decimal', placeholder = '' }) => (
  <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
    <span>{label}{hint && <span className="ml-1 font-normal text-gray-400">· {hint}</span>}</span>
    <input type={type} inputMode={inputMode} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={INPUT} />
  </label>
);

/** Two or more options in a grey track, one lit. options = [[value, label], …] */
export const Segmented = ({ label, value, options, onChange, small = false }) => (
  <div className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
    {label && <span>{label}</span>}
    <div className={`flex rounded-lg bg-gray-100 p-0.5 ${small ? 'h-8' : 'h-10'}`}>
      {options.map(([v, text]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`flex-1 whitespace-nowrap rounded-md px-1 font-semibold transition ${small ? 'text-[11.5px]' : 'text-[13px]'} ${value === v ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {text}
        </button>
      ))}
    </div>
  </div>
);

/** A pill that is on or off. */
export const TogglePill = ({ on, onChange, children }) => (
  <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
    className={`h-8 rounded-full border px-3 text-xs font-semibold ${on ? 'border-blue-200 bg-blue-50 text-primary' : 'border-gray-300 bg-white text-gray-500 hover:text-gray-700'}`}>
    {children}
  </button>
);

export const Check = ({ on, onChange, children }) => (
  <label className="flex min-h-[28px] cursor-pointer items-center gap-2 text-[13px] text-gray-800">
    <input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
    {children}
  </label>
);

export const Chip = ({ band, small = false }) => {
  if (!band) return null;
  const c = LEVELS[band.level] || LEVELS.ok;
  return (
    <span className={`whitespace-nowrap rounded-full font-bold ${small ? 'px-2 py-px text-[10.5px]' : 'px-2.5 py-0.5 text-xs'}`} style={{ background: c.bg, color: c.fg }}>
      {band.label}
    </span>
  );
};

/** A coloured scale: bands = [{ below, level|colour, label }], value sits as a marker between min and max. */
export const Scale = ({ bands, value, min = 0, max }) => {
  const segs = bands.map((b, i) => {
    const lower = i === 0 ? min : Math.min(bands[i - 1].below, max);
    const w = Math.max(0, Math.min(b.below, max) - lower) / (max - min);
    return { w, colour: b.colour || LEVELS[b.level].bar, label: b.label };
  });
  const p = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  return (
    <div className="relative pt-1">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded">
        {segs.map((s, i) => <div key={i} style={{ flex: `${s.w} 1 0`, background: s.colour }} />)}
      </div>
      <div className="absolute top-0 h-4 w-1 rounded-sm bg-gray-900 ring-2 ring-white" style={{ left: `calc(${p.toFixed(1)}% - 2px)` }} aria-hidden="true" />
      <div className="mt-0.5 flex gap-0.5">
        {segs.map((s, i) => <div key={i} className="truncate text-center text-[10px] text-gray-500" style={{ flex: `${s.w} 1 0` }}>{s.label}</div>)}
      </div>
    </div>
  );
};

export const Warn = ({ children }) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">{children}</div>
);

export const CopyButton = ({ onClick, primary = false, children = 'Copy' }) => (
  <button type="button" onClick={onClick}
    className={`ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold ${primary ? 'bg-primary text-white hover:bg-blue-700' : 'border border-blue-200 bg-white text-primary hover:bg-blue-50'}`}>
    <Copy className="h-3.5 w-3.5" aria-hidden="true" />{children}
  </button>
);

/**
 * One result: a title line, the value with its chip and Copy, an optional
 * scale, and a reference line underneath.
 */
export const ResultCard = ({ title, value, unit, band, scale, note, onCopy, copyLabel, primaryCopy = false, size = 'lg' }) => (
  <div className="flex flex-col gap-1 rounded-xl border border-gray-200 px-3.5 py-2.5">
    <div className="text-xs font-semibold text-gray-500">{title}</div>
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`font-bold tabular-nums leading-none text-gray-900 ${size === 'lg' ? 'text-[28px]' : 'text-[22px]'}`}>{value}</span>
      {unit && <span className="whitespace-nowrap text-[11px] text-gray-500">{unit}</span>}
      <Chip band={band} />
      {onCopy && <CopyButton onClick={onCopy} primary={primaryCopy}>{copyLabel || 'Copy'}</CopyButton>}
    </div>
    {scale && <Scale {...scale} />}
    {note && <div className="text-[11px] leading-snug text-gray-500">{note}</div>}
  </div>
);

export const SectionLabel = ({ children, right }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px] font-bold tracking-wide text-gray-500">{children}</span>
    {right}
  </div>
);
