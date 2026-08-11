import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Shared top-of-page tab switcher. Groups related pages behind one tab strip so
 * they don't each need their own sidebar entry (decongests the side nav). Used
 * by the Outpatient/Inpatient dashboard switcher and the Appointments/My Schedule
 * switcher, and any future grouping.
 *
 * @param {{ label: string, path: string, Icon?: React.Component }[]} tabs
 */
const PageTabs = ({ tabs }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div className="mb-6 flex gap-2 border-b-2 border-gray-200 pb-2 overflow-x-auto">
      {tabs.map(({ label, path, Icon }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className={`px-5 py-2.5 rounded-t-lg font-semibold text-sm whitespace-nowrap flex items-center gap-2 transition ${
            isActive(path) ? 'bg-primary text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {Icon && <Icon className="w-4 h-4" />} {label}
        </button>
      ))}
    </div>
  );
};

export default PageTabs;
