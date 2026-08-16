import { useNavigate, useLocation } from 'react-router-dom';
import SwitcherTabs from './SwitcherTabs';

/**
 * Shared top-of-page tab switcher. Groups related pages behind one tab strip so
 * they don't each need their own sidebar entry (decongests the side nav). Used
 * by the Outpatient/Inpatient dashboard switcher and the Appointments/My Schedule
 * switcher, and any future grouping. Route-backed SwitcherTabs: id = path.
 *
 * @param {{ label: string, path: string, Icon?: React.Component }[]} tabs
 */
const PageTabs = ({ tabs }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const active = tabs.find((t) => pathname === t.path || pathname.startsWith(`${t.path}/`))?.path;

  return (
    <SwitcherTabs
      className="mb-6"
      tabs={tabs.map(({ label, path, Icon }) => ({ id: path, label, Icon }))}
      active={active}
      onChange={(path) => navigate(path)}
    />
  );
};

export default PageTabs;
