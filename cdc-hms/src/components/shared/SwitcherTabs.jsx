/**
 * SwitcherTabs — THE switcher design, everywhere a view toggles in place.
 * Grey track, the active tab in CDC blue (bg-primary, flat), optional icon,
 * optional count badge in the app's one badge colour (.ui-badge — the same
 * cyan as the sidebar's Inbox badge). One source of truth so switchers can't
 * drift. `size="sm"` is the compact version for side panels.
 *
 * @param {{ id: string, label: string, Icon?: React.Component, count?: number,
 *           disabled?: boolean, title?: string }[]} tabs
 * @param {string}   active    id of the active tab
 * @param {Function} onChange  (id) => void
 * @param {string}   className extra classes on the track (spacing etc.)
 * @param {string}   ariaLabel  opt-in tab semantics: when given, the track is a
 *                   role="tablist" with this label and each button a role="tab"
 *                   with aria-selected (ids `${idPrefix}-${id}`, aria-controls
 *                   `panelId`). Without it the markup is exactly as before.
 */
const SIZES = {
  md: 'gap-2 px-4 py-2 rounded-md text-sm',
  sm: 'gap-1.5 px-3 py-1.5 rounded-md text-xs',
};

// Small screens scroll the track sideways (nowrap + hidden scrollbar) instead
// of wrapping into stacked rows; ≥sm wraps as before.
const SwitcherTabs = ({ tabs, active, onChange, className = '', ariaLabel, idPrefix = 'tab', panelId, size = 'md' }) => (
  <div {...(ariaLabel ? { role: 'tablist', 'aria-label': ariaLabel } : {})} className={`flex flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar overscroll-contain gap-1 p-1 bg-gray-100 rounded-lg w-fit max-w-full ${className}`}>
    {tabs.map(({ id, label, Icon, count, disabled, title }) => {
      const on = id === active;
      return (
        <button
          key={id}
          type="button"
          title={title}
          {...(ariaLabel ? { role: 'tab', id: `${idPrefix}-${id}`, 'aria-selected': on, 'aria-controls': panelId } : {})}
          onClick={() => onChange(id)}
          className={`flex items-center ${SIZES[size] || SIZES.md} font-semibold transition-colors whitespace-nowrap ${
            on ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {label}
          {count != null && (
            <span className="ui-badge px-1.5 py-0.5 rounded-full text-xs font-bold">
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default SwitcherTabs;
