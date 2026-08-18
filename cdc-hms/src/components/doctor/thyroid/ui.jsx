/* Shared, dumb controls for the thyroid workspace. Big tap targets, chips
 * over dropdowns, matching the mockup. */

export function Chip({ selected, onClick, children, disabled }) {
  const base = 'border rounded-lg px-2.5 py-1.5 text-xs transition disabled:opacity-50';
  const on = 'bg-teal-50 border-teal-300 text-teal-800 ring-2 ring-teal-300 ring-inset';
  const off = 'bg-white border-slate-200 text-slate-600 hover:border-slate-300';
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${selected ? on : off}`}>
      {children}
    </button>
  );
}

// options: array of [value, label]
export function ChipRow({ options, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <Chip key={v} selected={value === v} disabled={disabled} onClick={() => onChange(value === v ? null : v)}>{l}</Chip>
      ))}
    </div>
  );
}

// multi-select: keys held as booleans on an object (foci) or as an array (invasive)
export function MultiRow({ options, isOn, onToggle, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <Chip key={v} selected={isOn(v)} disabled={disabled} onClick={() => onToggle(v)}>{l}</Chip>
      ))}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] text-slate-400 block mb-1">{label}</label>
      {children}
    </div>
  );
}

export function Num({ value, onChange, disabled, step = 0.1, className = '' }) {
  return (
    <input
      type="number" step={step} value={value ?? ''} disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      className={`border border-slate-300 rounded-lg px-2 py-1.5 text-sm disabled:bg-slate-50 ${className}`}
    />
  );
}

// L × H × W triple with a live value label
export function DimTriplet({ dims, onChange, disabled, volume, unit = 'mL' }) {
  const [L, H, W] = dims;
  return (
    <div className="flex items-center gap-2">
      {[['length', L], ['height', H], ['width', W]].map(([k, v], i) => (
        <span key={k} className="flex items-center gap-2">
          <Num value={v} disabled={disabled} onChange={(x) => onChange(k, x)} className="w-16" />
          {i < 2 && <span className="text-slate-300">×</span>}
        </span>
      ))}
      <span className="ml-1 text-sm">{volume != null ? <b className="text-teal-700">{volume} {unit}</b> : <span className="text-slate-300">— {unit}</span>}</span>
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{children}</div>
      {right}
    </div>
  );
}
