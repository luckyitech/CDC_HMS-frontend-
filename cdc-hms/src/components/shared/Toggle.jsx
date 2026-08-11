/**
 * On/off switch for boolean settings.
 *
 *   <Toggle checked={enabled} onChange={setEnabled} label="Password rotation" />
 *
 * A real <button role="switch"> rather than a styled checkbox, so it is
 * keyboard-operable and announces its state to screen readers. `label` is not
 * rendered — it is the accessible name, since the visible text sits beside the
 * switch rather than inside it.
 */
const Toggle = ({ checked, onChange, disabled = false, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-7 w-14 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-green-500' : 'bg-gray-300'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-300 ${
        checked ? 'translate-x-7' : 'translate-x-0'
      }`}
    />
  </button>
);

export default Toggle;
