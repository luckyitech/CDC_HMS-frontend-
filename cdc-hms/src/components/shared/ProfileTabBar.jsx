/**
 * ProfileTabBar — the horizontal tab strip used by the record "file" pages
 * (PatientProfile, StaffFile). One source of truth for the tab look so both
 * files stay identical and neither drifts.
 *
 * @param {{id:string,name:string,Icon:React.Component}[]} tabs
 * @param {string}   activeTab   id of the active tab
 * @param {Function} onChange    (id) => void
 */
const ProfileTabBar = ({ tabs, activeTab, onChange }) => (
  <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
    <div className="flex">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
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
