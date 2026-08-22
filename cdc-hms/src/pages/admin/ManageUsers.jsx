import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import Pagination from '../../components/shared/Pagination';
import useDebounce from '../../hooks/useDebounce';
import { ROLE_TONES, REGISTRATION_TONES, ACCOUNT_TONES } from '../../utils/statusStyles';

// Roles that have a Staff File (clicking the name opens /admin/staff/:id).
const STAFF_FILE_ROLES = ['doctor', 'staff', 'lab', 'nurse', 'admin'];

// The file a row opens when its name is clicked. Staff-type accounts open their
// Staff File; patients open the shared patient profile — the SAME component and
// route the staff portal uses (/…/patient-profile/:uhid) so a patient file is
// opened the same way in every portal. Returns null when there's nothing to open.
// Staff resolve on employeeId (EMP014) rather than the database PK, mirroring
// how patients resolve on uhid — the same reason neither URL exposes a row id.
// A staff account with no employeeId yet (a legacy row the backfill has not
// reached) returns null and renders as plain text rather than a dead link.
const fileHref = (user) =>
  STAFF_FILE_ROLES.includes(user.role)
    ? (user.employeeId ? `/admin/staff/${user.employeeId}` : null)
    : user.uhid ? `/admin/patient-profile/${user.uhid}`
    : null;

// The clinic has hundreds of patient records; rendering them all at once
// makes the page unusable, so the list is paged.
const USERS_PER_PAGE = 25;

// Sort choices — add an entry here and it appears in the dropdown.
const SORT_OPTIONS = {
  newest: {
    label: 'Newest First',
    compare: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  },
  oldest: {
    label: 'Oldest First',
    compare: (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
  },
  az: {
    label: 'Name (A–Z)',
    compare: (a, b) => (a.name || '').localeCompare(b.name || ''),
  },
  za: {
    label: 'Name (Z–A)',
    compare: (a, b) => (b.name || '').localeCompare(a.name || ''),
  },
};

const ROLE_LABEL = {
  doctor: 'Doctor', staff: 'Staff', lab: 'Lab Tech',
  patient: 'Patient', admin: 'Admin',
};

const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
];
// id can be a number (User record) or a prefixed string like "patient_123"
const avatarColor = (id) => {
  const num = typeof id === 'string' ? parseInt(id.replace(/\D/g, ''), 10) : id;
  return AVATAR_COLORS[(num || 0) % AVATAR_COLORS.length];
};

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterRole, setFilterRole]     = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy]             = useState('newest');
  // Top-level view: everyone, patients only, or staff files only (non-patient
  // roles — the accounts that have a Staff File).
  const [view, setView]                 = useState('all'); // 'all' | 'patients' | 'staff'

  useEffect(() => {
    api.get('/users')
      .then(res => { if (res.success) setUsers(res.data.users); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  // Debounced so typing doesn't re-filter the whole list on every keystroke
  const debouncedSearch = useDebounce(searchTerm);

  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const matched = users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(q) ||
        (user.email  || '').toLowerCase().includes(q) ||
        (user.phone  || '').includes(debouncedSearch) ||
        (user.uhid   || '').toLowerCase().includes(q);
      const matchesRole   = filterRole   === 'all' || user.role   === filterRole;
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
      const matchesView =
        view === 'all' ? true
        : view === 'patients' ? user.role === 'patient'
        : user.role !== 'patient'; // 'staff' — staff files only
      return matchesSearch && matchesRole && matchesStatus && matchesView;
    });
    const { compare } = SORT_OPTIONS[sortBy] || SORT_OPTIONS.newest;
    return matched.sort(compare);
  }, [users, debouncedSearch, filterRole, filterStatus, sortBy, view]);

  // Pagination — only the current page is rendered
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  // Filters changing can shrink the list past the current page
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterRole, filterStatus, sortBy, view]);

  const stats = {
    total:    users.length,
    doctors:  users.filter(u => u.role === 'doctor').length,
    staff:    users.filter(u => u.role === 'staff').length,
    lab:      users.filter(u => u.role === 'lab').length,
    patients: users.filter(u => u.role === 'patient').length,
    active:   users.filter(u => u.status === 'Active').length,
    inactive: users.filter(u => u.status === 'Inactive').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={22} className="text-gray-600" /> Manage Users
        </h1>
        <p className="text-sm text-gray-500 mt-1">View accounts and open a patient or staff file to manage them</p>
      </div>

      {/* View tabs — All / Patients / Staff files (non-patient roles) */}
      <SwitcherTabs
        active={view}
        onChange={setView}
        tabs={[
          { id: 'all',      label: 'All Users', count: users.length },
          { id: 'patients', label: 'Patients',  count: users.filter(u => u.role === 'patient').length },
          { id: 'staff',    label: 'Staff Files', count: users.filter(u => u.role !== 'patient').length },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total',    value: stats.total,    bg: 'bg-gray-100',    text: 'text-gray-700',    num: 'text-gray-800'    },
          { label: 'Doctors',  value: stats.doctors,  bg: 'bg-blue-50',     text: 'text-blue-600',    num: 'text-blue-800'    },
          { label: 'Staff',    value: stats.staff,    bg: 'bg-violet-50',   text: 'text-violet-600',  num: 'text-violet-800'  },
          { label: 'Lab Tech', value: stats.lab,      bg: 'bg-teal-50',     text: 'text-teal-600',    num: 'text-teal-800'    },
          { label: 'Patients', value: stats.patients, bg: 'bg-emerald-50',  text: 'text-emerald-600', num: 'text-emerald-800' },
          { label: 'Active',   value: stats.active,   bg: 'bg-green-50',    text: 'text-green-600',   num: 'text-green-800'   },
          { label: 'Inactive', value: stats.inactive, bg: 'bg-red-50',      text: 'text-red-500',     num: 'text-red-700'     },
        ].map(({ label, value, bg, text, num }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-200 p-4 shadow-sm`}>
            <p className={`text-xs font-medium ${text}`}>{label}</p>
            <p className={`text-2xl font-bold mt-1 ${num}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone or UHID…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-700"
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="staff">Staff</option>
            <option value="lab">Lab Technicians</option>
            <option value="patient">Patients</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-700"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            aria-label="Sort users"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 text-gray-700"
          >
            {Object.entries(SORT_OPTIONS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        {!loading && (
          <p className="text-xs text-gray-400 mt-3">
            Showing <span className="font-semibold text-gray-600">{paginatedUsers.length}</span> of <span className="font-semibold text-gray-600">{filteredUsers.length}</span> matching users
            {filteredUsers.length !== users.length && <> (filtered from {users.length})</>}
          </p>
        )}
      </div>

      {/* Loading / Empty */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
          Loading users…
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-200">
          <Search className="w-10 h-10 mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No users found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {paginatedUsers.map(user => {
              const isActive = user.status === 'Active';
              return (
                <div key={user.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(user.id)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-sm font-bold">{getInitials(user.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {fileHref(user) ? (
                        <button
                          onClick={() => navigate(fileHref(user))}
                          className="text-sm font-semibold text-primary hover:underline truncate text-left block max-w-full"
                        >
                          {user.name}
                        </button>
                      ) : (
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                      )}
                      <p className="text-xs text-gray-400 truncate">{user.email || '—'}</p>
                      <p className="text-xs text-gray-400">{user.phone || '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge shape="tag" size="xs" bordered={false} tone={ROLE_TONES[user.role]}>
                        {ROLE_LABEL[user.role] ?? user.role}
                      </StatusBadge>
                      {user.role === 'patient' && (
                        <StatusBadge
                          shape="tag"
                          size="xs"
                          bordered={false}
                          tone={user.registrationComplete ? REGISTRATION_TONES.complete : REGISTRATION_TONES.incomplete}
                        >
                          {user.registrationComplete ? 'Registered' : 'Incomplete'}
                        </StatusBadge>
                      )}
                      <StatusBadge
                        shape="tag"
                        size="xs"
                        bordered={false}
                        tone={isActive ? ACCOUNT_TONES.active : ACCOUNT_TONES.inactive}
                      >
                        {user.status}
                      </StatusBadge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['User', 'Role', 'Phone', 'Position', 'Status', 'Joined'].map((h) => (
                    <th key={h} className={`px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide ${
                      h === 'Position' ? 'hidden lg:table-cell' :
                      h === 'Joined'   ? 'hidden xl:table-cell' : ''
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedUsers.map(user => {
                  const isActive = user.status === 'Active';
                  return (
                    <tr key={user.id} className="hover:bg-blue-50 transition-colors">

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(user.id)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
                          </div>
                          <div>
                            {fileHref(user) ? (
                              <button
                                onClick={() => navigate(fileHref(user))}
                                className="text-sm font-semibold text-primary hover:underline text-left"
                              >
                                {user.name}
                              </button>
                            ) : (
                              <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                            )}
                            <p className="text-xs text-gray-400">{user.email || '—'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <StatusBadge shape="tag" size="xs" bordered={false} className="w-fit" tone={ROLE_TONES[user.role]}>
                            {ROLE_LABEL[user.role] ?? user.role}
                          </StatusBadge>
                          {user.role === 'patient' && (
                            <StatusBadge
                              shape="tag"
                              size="xs"
                              bordered={false}
                              className="w-fit"
                              tone={user.registrationComplete ? REGISTRATION_TONES.complete : REGISTRATION_TONES.incomplete}
                            >
                              {user.registrationComplete ? 'Registered' : 'Incomplete'}
                            </StatusBadge>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-gray-600">{user.phone || '—'}</td>

                      <td className="px-5 py-3.5 text-sm text-gray-600 hidden lg:table-cell">
                        {user.specialty || user.position || user.specialization || '—'}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge
                          shape="tag"
                          size="xs"
                          bordered={false}
                          tone={isActive ? ACCOUNT_TONES.active : ACCOUNT_TONES.inactive}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                          {user.status}
                        </StatusBadge>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-gray-400 hidden xl:table-cell">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
};

export default ManageUsers;
