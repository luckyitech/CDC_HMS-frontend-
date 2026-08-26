import { useState, useEffect } from "react";
import {
  Activity,
  Stethoscope,
  UserCog,
  FlaskConical,
  UserPlus,
  Users,
  UserX,
  ClipboardList,
  AlertTriangle,
  Copy,
  Waves,
  LogIn,
  ChevronRight,
} from "lucide-react";
import Card from "../../components/shared/Card";
import PageHeader from "../../components/shared/PageHeader";
import Button from "../../components/shared/Button";
import StatusBadge from "../../components/shared/StatusBadge";
import { ROLE_TONES } from "../../utils/statusStyles";
// Shared with Manage Users so a user row opens the same file from either page.
import { fileHref } from "../../utils/userLinks";
import { useNavigate } from "react-router-dom";
import { usePatientContext } from "../../contexts/PatientContext";
import api from "../../services/api";
import patientService from "../../services/patientService";
import ultrasoundService from "../../services/ultrasoundService";
import activityService from "../../services/activityService";

const todayISO = () => new Date().toISOString().slice(0, 10);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { getPatientStats } = usePatientContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPatients, setTotalPatients] = useState(0);
  // Work waiting on an admin. Each is a count the admin can act on, not a
  // headcount — the old gradient tiles counted things that change monthly.
  const [duplicateGroups, setDuplicateGroups] = useState(null);
  const [unassignedScans, setUnassignedScans] = useState(null);
  // Today's activity, derived from the activity log filtered to today.
  const [todayEvents, setTodayEvents] = useState(null);

  useEffect(() => {
    api.get('/users')
      .then(res => { if (res.success) setUsers(res.data.users); })
      .catch(() => {})
      .finally(() => setLoading(false));

    getPatientStats().then(data => {
      if (data) setTotalPatients(data.total);
    });

    // Each of these is independent and non-critical: a failure leaves its tile
    // showing "—" rather than taking the whole dashboard down.
    patientService.getDuplicates()
      .then(res => { if (res.success) setDuplicateGroups(res.data?.length ?? 0); })
      .catch(() => {});

    ultrasoundService.getUnassigned()
      .then(res => { if (res.success) setUnassignedScans(res.data?.length ?? 0); })
      .catch(() => {});

    activityService.getLog({ startDate: todayISO() })
      .then(res => { if (res.success) setTodayEvents(res.data?.events ?? []); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentDate = new Date();

  const isThisMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  };

  const doctors  = users.filter(u => u.role === 'doctor');
  const staff    = users.filter(u => u.role === 'staff');
  const labTechs = users.filter(u => u.role === 'lab');

  const stats = {
    totalDoctors:  doctors.length,
    totalStaff:    staff.length,
    totalLabTechs: labTechs.length,
    totalPatients,
    newThisMonth: {
      doctors:  doctors.filter(u => isThisMonth(u.createdAt)).length,
      staff:    staff.filter(u => isThisMonth(u.createdAt)).length,
      labTechs: labTechs.filter(u => isThisMonth(u.createdAt)).length,
    },
    activeUsers:   users.filter(u => u.status === 'Active').length,
    inactiveUsers: users.filter(u => u.status === 'Inactive').length,
  };

  // Most recently created accounts (API returns DESC order)
  const recentAccounts = users.slice(0, 5);

  // Today's counts, by activity type. null while loading → tiles show "—".
  const countToday = (type) =>
    todayEvents === null ? null : todayEvents.filter(e => e.type === type).length;

  const today = {
    logins:        countToday('user_login'),
    registrations: countToday('registered'),
    consultations: countToday('consultation_completed'),
    total:         todayEvents === null ? null : todayEvents.length,
  };

  // Anything with a non-zero count is work outstanding; zero reads as "clear".
  const attention = [
    {
      label: 'Inactive accounts',
      count: loading ? null : stats.inactiveUsers,
      icon: UserX,
      to: '/admin/manage-users?status=Inactive',
    },
    {
      label: 'Possible duplicate patients',
      count: duplicateGroups,
      icon: Copy,
      to: '/admin/duplicate-patients',
    },
    {
      label: 'Unassigned scans',
      count: unassignedScans,
      icon: Waves,
      to: '/admin/unassigned-ultrasound',
    },
  ];

  const roster = [
    { label: 'Doctors',       count: loading ? null : stats.totalDoctors,  to: '/admin/manage-users?role=doctor' },
    { label: 'Staff',         count: loading ? null : stats.totalStaff,    to: '/admin/manage-users?role=staff' },
    { label: 'Lab Techs',     count: loading ? null : stats.totalLabTechs, to: '/admin/manage-users?role=lab' },
    { label: 'Patients',      count: totalPatients || null,                to: '/admin/manage-users?view=patients' },
    { label: 'Active',        count: loading ? null : stats.activeUsers,   to: '/admin/manage-users?status=Active' },
    { label: 'Inactive',      count: loading ? null : stats.inactiveUsers, to: '/admin/manage-users?status=Inactive' },
  ];

  const show = (n) => (n === null || n === undefined ? '—' : n);

  const formatRole = (role) => {
    const map = { doctor: 'Doctor', staff: 'Staff', lab: 'Lab Tech', patient: 'Patient', admin: 'Admin' };
    return map[role] || role;
  };

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System Overview & User Management" />

      {/* Today — what has actually happened in the clinic since midnight. Leads
          the page because it is the only thing here that changes daily; the
          headcounts it replaced move maybe once a month. Four counts alone left
          most of the width empty, so the recent events run alongside them: the
          numbers say how much, the feed says what. */}
      <div className="mb-6">
        <Card title={
          <span className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Today
            </span>
            <button
              onClick={() => navigate('/admin/activity-log')}
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Activity log <ChevronRight className="w-4 h-4" />
            </button>
          </span>
        }>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Each tile opens today's activity log filtered to its own type —
                the whole band used to be one big link, so leaving the numbers
                inert made them look broken. */}
            <div className="grid grid-cols-2 gap-3 content-start">
              {[
                { label: 'Logins',        value: today.logins,        icon: LogIn,        action: 'user_login' },
                { label: 'Registrations', value: today.registrations, icon: UserPlus,     action: 'registered' },
                { label: 'Consultations', value: today.consultations, icon: Stethoscope,  action: 'consultation_completed' },
                { label: 'Total actions', value: today.total,         icon: Activity,     action: null },
              ].map(({ label, value, icon: Icon, action }) => (
                <button
                  key={label}
                  onClick={() => navigate(
                    `/admin/activity-log?startDate=${todayISO()}${action ? `&action=${action}` : ''}`
                  )}
                  className="bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 text-left transition"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-500 truncate">{label}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-800 leading-tight">{show(value)}</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2 lg:border-l lg:border-gray-100 lg:pl-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Latest</p>
              {todayEvents === null ? (
                <p className="text-sm text-gray-400 py-4">Loading…</p>
              ) : todayEvents.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">Nothing recorded yet today.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {todayEvents.slice(0, 5).map((e, i) => (
                    <li key={i}>
                      {/* Opens today's log filtered to this person, so a row is a
                          way into "what else have they done today". */}
                      <button
                        onClick={() => navigate(
                          `/admin/activity-log?startDate=${todayISO()}&staff=${encodeURIComponent(e.staff)}`
                        )}
                        className="w-full py-2 px-1 -mx-1 rounded flex items-baseline gap-3 text-sm text-left hover:bg-gray-50 transition"
                      >
                        <span className="text-xs text-gray-400 tabular-nums shrink-0 w-11">
                          {new Date(e.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="font-semibold text-gray-800 shrink-0">{e.staff}</span>
                        <span className="text-gray-500 truncate">
                          {e.label}{e.patient ? ` · ${e.patient}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions + Needs Attention + Roster — three equal columns, the
          icon-led card style shared with the staff and doctor dashboards. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title={
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Quick Actions
          </span>
        }>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin/create-doctor')}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
            >
              <Stethoscope className="w-5 h-5 text-primary" />
              <p className="font-semibold text-gray-800">Create Doctor</p>
            </button>
            <button
              onClick={() => navigate('/admin/create-staff')}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
            >
              <UserCog className="w-5 h-5 text-primary" />
              <p className="font-semibold text-gray-800">Create Staff</p>
            </button>
            <button
              onClick={() => navigate('/admin/create-lab')}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
            >
              <FlaskConical className="w-5 h-5 text-primary" />
              <p className="font-semibold text-gray-800">Create Lab Tech</p>
            </button>
            <button
              onClick={() => navigate('/admin/create-patient')}
              className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center gap-3"
            >
              <UserPlus className="w-5 h-5 text-primary" />
              <p className="font-semibold text-gray-800">Create Patient</p>
            </button>
          </div>
        </Card>

        {/* Needs Attention — outstanding work, each row a way straight into the
            page that clears it. A zero count reads as "clear" rather than being
            hidden, so the admin can see it was checked. */}
        <Card title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Needs Attention
          </span>
        }>
          <div className="space-y-3">
            {attention.map(({ label, count, icon: Icon, to }) => {
              const outstanding = count > 0;
              return (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${outstanding ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-700 truncate">{label}</span>
                  </span>
                  <span className={`font-bold shrink-0 ${outstanding ? 'text-gray-800' : 'text-gray-400'}`}>
                    {show(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Roster — the headcounts, demoted from the top of the page to a
            compact reference list. Each row filters Manage Users. */}
        <Card title={
          <span className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Roster
          </span>
        }>
          <div className="divide-y divide-gray-100">
            {roster.map(({ label, count, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded transition text-left"
              >
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-bold text-gray-800">{show(count)}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Account Creations */}
      <Card title={
        <span className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Recent Account Creations
        </span>
      }>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading recent accounts...</div>
        ) : recentAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No accounts created yet</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden md:table-cell">Specialty / Position</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentAccounts.map((account) => {
                    // Null for a staff account with no employeeId yet — that row
                    // stays plain text rather than becoming a dead link.
                    const href = fileHref(account);
                    return (
                    <tr
                      key={account.id}
                      onClick={href ? () => navigate(href) : undefined}
                      className={`hover:bg-blue-50 ${href ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <p className={`font-semibold ${href ? 'text-primary hover:underline' : 'text-gray-800'}`}>{account.name}</p>
                        <p className="text-xs text-gray-500">{account.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge bordered={false} tone={ROLE_TONES[account.role]}>
                          {formatRole(account.role)}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                        {account.specialty || account.position || account.specialization || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                        {account.createdAt
                          ? new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${account.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {account.status}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <Button onClick={() => navigate('/admin/manage-users')} variant="outline">
                View All Users
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
