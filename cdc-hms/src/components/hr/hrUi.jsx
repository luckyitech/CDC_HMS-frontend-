/**
 * Small layout pieces shared by the HR Suite settings screens (B21 Time &
 * Attendance settings, B27 Leave settings), so both look and behave the same.
 *
 * Everything is at module scope on purpose: a component defined inside a
 * render function remounts its input on every keystroke (the
 * WhatsAppSettingsTab bug, A5).
 */

export const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-500';
export const cellInputCls = 'w-full rounded-md border border-gray-300 px-2 py-1 text-sm tabular-nums focus:outline-none focus:border-primary disabled:bg-gray-50 disabled:text-gray-500';
export const buttonCls = 'rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap hover:bg-gray-50 disabled:opacity-60';
export const primaryButtonCls = 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60';

export const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
  </label>
);

/** A labelled on/off switch row. */
export const SwitchRow = ({ label, checked, onChange, disabled, hint }) => (
  <label className={`flex items-center justify-between gap-3 py-1.5 text-sm ${disabled ? 'opacity-60' : ''}`}>
    <span className="text-gray-700">
      {label}
      {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
    </span>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  </label>
);

export const Section = ({ title, actions, children, className = '' }) => (
  <section className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-2 mb-3">
        {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>}
        {actions}
      </div>
    )}
    {children}
  </section>
);
