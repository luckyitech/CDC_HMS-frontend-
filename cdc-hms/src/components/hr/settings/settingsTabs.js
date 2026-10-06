import {
  Clock, CalendarCog, Network, Bell, SlidersHorizontal, CalendarClock, Nfc, History,
  CalendarDays, Users, Building2, Briefcase, Wand2, GraduationCap,
} from 'lucide-react';
import {
  canViewHr, canManageTags, canSetWorkHours, canChangeHrSettings,
  canSetLeavePolicy, canSetHolidays, canSetEntitlements, canManageLists,
} from '../../../utils/permissions';

/**
 * HR Suite → Settings (6 Oct 2026): the three setup pages (Time & Attendance
 * settings, Leave settings, Departments & positions) merged into one page with
 * group tabs and sub-tabs. URL: /hr/settings/:group/:section (?year= on the
 * leave sub-tabs).
 *
 * Every gate below is the gate the section had on its old page, unchanged:
 *   Attendance — the old page opened for hr.tags, hr.workhours or hr.settings
 *     (`attendance`), and inside it: rules + recent changes for hr.view or
 *     hr.settings; working hours for hr.view or hr.workhours; entrance tags for
 *     hr.tags or hr.settings.
 *   Leave — leave.policy / leave.holidays / leave.entitlements, one each.
 *   Staff lists — hr.lists for all three.
 *   Alerts & reminders — hr.settings for both.
 * A group with no visible sub-tab is hidden; the sidebar item shows when any
 * sub-tab does.
 */

const capsOf = (user) => {
  const tags = canManageTags(user);
  const hours = canSetWorkHours(user);
  const config = canChangeHrSettings(user);
  return {
    tags, hours, config,
    view: canViewHr(user),
    attendance: tags || hours || config,
    policy: canSetLeavePolicy(user),
    holidays: canSetHolidays(user),
    entitlements: canSetEntitlements(user),
    lists: canManageLists(user),
  };
};

export const SETTINGS_GROUPS = [
  {
    id: 'attendance', name: 'Attendance', Icon: Clock,
    sections: [
      { id: 'rules', label: 'Check-in rules', Icon: SlidersHorizontal, gate: (c) => c.attendance && (c.view || c.config) },
      { id: 'hours', label: 'Working hours', Icon: CalendarClock, gate: (c) => c.attendance && (c.view || c.hours) },
      { id: 'tags', label: 'Entrance tags', Icon: Nfc, gate: (c) => c.attendance && (c.tags || c.config) },
      { id: 'changes', label: 'Recent changes', Icon: History, gate: (c) => c.attendance && (c.view || c.config) },
    ],
  },
  {
    id: 'leave', name: 'Leave', Icon: CalendarCog,
    sections: [
      { id: 'policy', label: 'Leave policy', Icon: CalendarCog, gate: (c) => c.policy },
      { id: 'holidays', label: 'Public holidays', Icon: CalendarDays, gate: (c) => c.holidays },
      { id: 'entitlements', label: 'Staff entitlements', Icon: Users, gate: (c) => c.entitlements },
    ],
  },
  {
    id: 'lists', name: 'Staff lists', Icon: Network,
    sections: [
      { id: 'departments', label: 'Departments', Icon: Building2, gate: (c) => c.lists },
      { id: 'positions', label: 'Positions', Icon: Briefcase, gate: (c) => c.lists },
      { id: 'tidy', label: 'Tidy', Icon: Wand2, gate: (c) => c.lists },
    ],
  },
  {
    id: 'alerts', name: 'Alerts & reminders', Icon: Bell,
    sections: [
      { id: 'alerts', label: 'Alerts', Icon: Bell, gate: (c) => c.config },
      { id: 'credentials', label: 'Credentials & reminders', Icon: GraduationCap, gate: (c) => c.config },
    ],
  },
];

/** The groups this person can open, each with only its visible sub-tabs. */
export const visibleSettingsGroups = (user) => {
  const caps = capsOf(user);
  return SETTINGS_GROUPS
    .map((g) => ({ ...g, sections: g.sections.filter((s) => s.gate(caps)) }))
    .filter((g) => g.sections.length > 0);
};

/** Sidebar: show "Settings" when any sub-tab is visible. */
export const canOpenHrSettings = (user) => visibleSettingsGroups(user).length > 0;

/** /hr/settings/:group/:section, carrying ?year= (the leave sub-tabs' year). */
export const settingsPath = (group, section, year) => {
  const base = `/hr/settings/${group}${section ? `/${section}` : ''}`;
  return year ? `${base}?year=${encodeURIComponent(year)}` : base;
};

/**
 * Old /hr/leave-settings?tab=…&year=… → its new home. Without a (known) tab
 * the old page opened on its first visible tab, so this does the same.
 */
const LEAVE_PAGE_TABS = [
  ['policy', 'leave'], ['holidays', 'leave'], ['entitlements', 'leave'],
  ['alerts', 'alerts'], ['credentials', 'alerts'],
];
export const legacyLeaveSettingsPath = (user, tab, year) => {
  const visible = visibleSettingsGroups(user);
  const open = (g, s) => visible.some((x) => x.id === g && x.sections.some((y) => y.id === s));
  const known = LEAVE_PAGE_TABS.find(([s]) => s === tab);
  const target = known && open(known[1], known[0]) ? known : LEAVE_PAGE_TABS.find(([s, g]) => open(g, s));
  return target ? settingsPath(target[1], target[0], year) : settingsPath('leave', null, year);
};
