import { useNavigate, useLocation } from 'react-router-dom';
import { Stethoscope, BedDouble } from 'lucide-react';

/**
 * Outpatient / Inpatient dashboard switcher shown at the top of every non-admin
 * dashboard for users with inpatient access. Outpatient = the user's own portal
 * dashboard (passed in, since a doctor viewing the inpatient board still returns
 * to /doctor); Inpatient = the shared ward board.
 *
 * @param {string} outpatientPath  the "/{portal}/dashboard" to return to
 */
const DashboardWorkspaceTabs = ({ outpatientPath }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onInpatient = pathname.startsWith('/inpatient/');

  const tabs = [
    { label: 'Outpatient Dashboard', Icon: Stethoscope, active: !onInpatient, path: outpatientPath },
    { label: 'Inpatient Dashboard', Icon: BedDouble, active: onInpatient, path: '/inpatient/board' },
  ];

  return (
    <div className="mb-6 flex gap-2 border-b-2 border-gray-200 pb-2 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.label}
          onClick={() => navigate(t.path)}
          className={`px-5 py-2.5 rounded-t-lg font-semibold text-sm whitespace-nowrap flex items-center gap-2 transition ${
            t.active ? 'bg-primary text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <t.Icon className="w-4 h-4" /> {t.label}
        </button>
      ))}
    </div>
  );
};

export default DashboardWorkspaceTabs;
