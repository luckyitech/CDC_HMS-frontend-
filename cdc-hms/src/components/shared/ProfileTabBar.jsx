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
  <div className="mb-6 overflow-x-auto">
    <div className="flex gap-2 border-b-2 border-gray-200 pb-2 min-w-max">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-6 py-3 rounded-t-lg font-semibold transition whitespace-nowrap ${
            activeTab === tab.id
              ? "bg-primary text-white shadow-lg"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <tab.Icon className="w-4 h-4 inline mr-2" />
          {tab.name}
        </button>
      ))}
    </div>
  </div>
);

export default ProfileTabBar;
