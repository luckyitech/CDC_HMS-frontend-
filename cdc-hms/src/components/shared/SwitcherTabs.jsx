/**
 * SwitcherTabs — THE switcher design, everywhere a view toggles in place.
 * Grey track, white active pill with shadow, optional icon, optional count
 * badge (blue when active). One source of truth so switchers can't drift.
 *
 * @param {{ id: string, label: string, Icon?: React.Component, count?: number,
 *           disabled?: boolean, title?: string }[]} tabs
 * @param {string}   active    id of the active tab
 * @param {Function} onChange  (id) => void
 * @param {string}   className extra classes on the track (spacing etc.)
 */
// Small screens scroll the track sideways (nowrap + hidden scrollbar) instead
// of wrapping into stacked rows; ≥sm wraps as before.
const SwitcherTabs = ({ tabs, active, onChange, className = '' }) => (
  <div className={`flex flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar overscroll-contain gap-1 p-1 bg-gray-100 rounded-lg w-fit max-w-full ${className}`}>
    {tabs.map(({ id, label, Icon, count, disabled, title }) => {
      const on = id === active;
      return (
        <button
          key={id}
          type="button"
          title={title}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${
            on ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {Icon && <Icon className="w-4 h-4" />}
          {label}
          {count != null && (
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              on ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default SwitcherTabs;
