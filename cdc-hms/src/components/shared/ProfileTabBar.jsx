import SwitcherTabs from './SwitcherTabs';

/**
 * ProfileTabBar — the tab strip of the record "file" pages (PatientProfile,
 * PatientFile, StaffFile, HR settings). Since 11 Oct 2026 it is SwitcherTabs
 * (one tab style app-wide); this wrapper only maps `name` → `label`.
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
  <SwitcherTabs
    className={className}
    tabs={tabs.map(({ id, name, Icon, count }) => ({ id, label: name, Icon, count }))}
    active={activeTab}
    onChange={onChange}
    ariaLabel={ariaLabel}
    idPrefix={idPrefix}
    panelId={panelId}
  />
);

export default ProfileTabBar;
