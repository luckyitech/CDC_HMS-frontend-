/**
 * ProfileTabBar — the horizontal tab strip used by the record "file" pages
 * (PatientProfile, StaffFile). One source of truth for the tab look so both
 * files stay identical and neither drifts.
 *
 * @param {{id:string,name:string,Icon:React.Component}[]} tabs
 * @param {string}   activeTab   id of the active tab
 * @param {Function} onChange    (id) => void
 * @param {string}   ariaLabel   opt-in tab semantics (role="tablist"/"tab",
 *                   aria-selected; ids `${idPrefix}-${id}`, aria-controls
 *                   `panelId`). Without it the markup is exactly as before.
 * @param {string}   className   replaces the default bottom margin (mb-6)
 */
const ProfileTabBar = ({ tabs, activeTab, onChange, ariaLabel, idPrefix = 'tab', panelId, className = 'mb-6' }) => (
  <div className={`${className} bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto`}>
    <div className="flex" {...(ariaLabel ? { role: 'tablist', 'aria-label': ariaLabel } : {})}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          {...(ariaLabel ? { type: 'button', role: 'tab', id: `${idPrefix}-${tab.id}`, 'aria-selected': activeTab === tab.id, 'aria-controls': panelId } : {})}
          className={`flex-1 min-w-max px-4 py-2.5 text-sm font-medium transition-all ${
            activeTab === tab.id
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-blue-50"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <tab.Icon className="w-4 h-4" />
            {tab.name}
          </span>
        </button>
      ))}
    </div>
  </div>
);

export default ProfileTabBar;
