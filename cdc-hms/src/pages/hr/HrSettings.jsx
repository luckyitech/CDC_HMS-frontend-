import { useEffect } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import PageHeader from '../../components/shared/PageHeader';
import ProfileTabBar from '../../components/shared/ProfileTabBar';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import AttendanceSettings from '../../components/hr/settings/AttendanceSettings';
import LeaveSettingsPanel from '../../components/hr/settings/LeaveSettingsPanel';
import StaffListsPanel from '../../components/hr/settings/StaffListsPanel';
import AlertChannels from '../../components/hr/leave/AlertChannels';
import CredentialsReminders from '../../components/hr/leave/CredentialsReminders';
import { visibleSettingsGroups, settingsPath, legacyLeaveSettingsPath } from '../../components/hr/settings/settingsTabs';

/**
 * HrSettings — HR Suite → Settings, /hr/settings/:group/:section (6 Oct 2026).
 *
 * The three setup pages in one: group tabs (Attendance · Leave · Staff lists ·
 * Alerts & reminders) and the active group's sub-tabs. Which groups and
 * sub-tabs a person sees, and every gate, live in settingsTabs.js. The panels
 * are the old page bodies, moved (components/hr/settings/).
 *
 * A missing or unavailable group/section is replaced (not pushed) with the
 * first visible one, so /hr/settings lands on the first sub-tab the person
 * can open and Back never bounces. Choosing a tab pushes a history entry, so
 * Back returns to the previous tab. ?year= rides along (leave sub-tabs).
 *
 * Old addresses redirect here: /hr/leave-settings(?tab=&year=) and /hr/lists
 * (LeaveSettingsRedirect, ListsRedirect below; routes in App.jsx).
 */

const PANEL_ID = 'hr-settings-panel';

const HrSettings = () => {
  const { currentUser } = useUserContext();
  const { group: groupId, section: sectionId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const year = params.get('year');

  // At phone width the tab strips scroll sideways: bring the active tabs into view.
  useEffect(() => {
    for (const id of [`hr-settings-group-${groupId}`, `hr-settings-sub-${sectionId}`]) {
      document.getElementById(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [groupId, sectionId]);

  const groups = visibleSettingsGroups(currentUser);

  if (!groups.length) {
    return (
      <div>
        <PageHeader title="Settings" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          These settings are for people who look after attendance, leave, the staff lists or HR alerts. Ask whoever handles HR permissions if you need one.
        </div>
      </div>
    );
  }

  const group = groups.find((g) => g.id === groupId);
  if (!group) return <Navigate to={settingsPath(groups[0].id, groups[0].sections[0].id, year)} replace />;
  const section = group.sections.find((s) => s.id === sectionId);
  if (!section) return <Navigate to={settingsPath(group.id, group.sections[0].id, year)} replace />;

  const go = (g, s) => navigate(settingsPath(g, s, year));

  const subTabs = (
    <SwitcherTabs
      ariaLabel={`${group.name} settings`}
      idPrefix="hr-settings-sub"
      panelId={PANEL_ID}
      tabs={group.sections}
      active={section.id}
      onChange={(id) => id !== section.id && go(group.id, id)}
    />
  );

  return (
    <div>
      <PageHeader title="Settings" subtitle="Attendance rules and working hours, leave policy and holidays, departments and positions, alerts and reminders" />
      <div className="print:hidden">
        <ProfileTabBar
          className="mb-3"
          ariaLabel="Settings groups"
          idPrefix="hr-settings-group"
          panelId={PANEL_ID}
          tabs={groups}
          activeTab={group.id}
          onChange={(id) => id !== group.id && go(id, groups.find((g) => g.id === id).sections[0].id)}
        />
      </div>

      {group.id === 'leave' ? (
        // The leave panel lays out its own row: these sub-tabs + its Year selector.
        <div role="tabpanel" id={PANEL_ID} aria-labelledby={`hr-settings-sub-${section.id}`}>
          <LeaveSettingsPanel tab={section.id} subTabs={<div className="print:hidden min-w-0">{subTabs}</div>} />
        </div>
      ) : (
        <>
          <div className="print:hidden mb-4">{subTabs}</div>
          <div role="tabpanel" id={PANEL_ID} aria-labelledby={`hr-settings-sub-${section.id}`}>
            {group.id === 'attendance' && <AttendanceSettings tab={section.id} />}
            {group.id === 'lists' && <StaffListsPanel tab={section.id} />}
            {group.id === 'alerts' && section.id === 'alerts' && <AlertChannels canEdit />}
            {group.id === 'alerts' && section.id === 'credentials' && <CredentialsReminders canEdit />}
          </div>
        </>
      )}
    </div>
  );
};

/** /hr/leave-settings?tab=…&year=… (the old Leave settings page) → its tab here. */
export const LeaveSettingsRedirect = () => {
  const { currentUser } = useUserContext();
  const [params] = useSearchParams();
  return <Navigate to={legacyLeaveSettingsPath(currentUser, params.get('tab'), params.get('year'))} replace />;
};

/** /hr/lists (the old Departments & positions page; it took no parameters) → Staff lists. */
export const ListsRedirect = () => <Navigate to={settingsPath('lists', 'departments')} replace />;

export default HrSettings;
