import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Pencil, KeyRound, Trash2,
  ArrowLeft, UserCheck, UserX,
} from 'lucide-react';
import api from '../../services/api';
import patientService from '../../services/patientService';
import EditUserModal from '../../components/admin/EditUserModal';
import EditPatientModal from '../../components/staff/EditPatientModal';
import StatusBadge from '../../components/shared/StatusBadge';
import { ROLE_TONES, REGISTRATION_TONES, ACCOUNT_TONES } from '../../utils/statusStyles';

const Tip = ({ label, children }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
      {label}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
    </div>
  </div>
);

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
  const [editingUser, setEditingUser]       = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);

  useEffect(() => {
    api.get('/users')
      .then(res => { if (res.success) setUsers(res.data.users); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(user => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(q) ||
      (user.email  || '').toLowerCase().includes(q) ||
      (user.phone  || '').includes(searchTerm) ||
      (user.uhid   || '').toLowerCase().includes(q);
    const matchesRole   = filterRole   === 'all' || user.role   === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total:    users.length,
    doctors:  users.filter(u => u.role === 'doctor').length,
    staff:    users.filter(u => u.role === 'staff').length,
    lab:      users.filter(u => u.role === 'lab').length,
    patients: users.filter(u => u.role === 'patient').length,
    active:   users.filter(u => u.status === 'Active').length,
    inactive: users.filter(u => u.status === 'Inactive').length,
  };

  const toastSuccess = (msg) => toast.success(msg, { duration: 3000, position: 'top-right' });
  const toastError   = (msg) => toast.error(msg,   { duration: 4000, position: 'top-right' });

  const handleUserSaved = (updatedUser) =>
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));

  const handleToggleStatus = async (user) => {
    const activate = user.status !== 'Active';
    if (!window.confirm(`${activate ? 'Activate' : 'Deactivate'} ${user.name}?`)) return;
    try {
      if (user.hasUserAccount === false) {
        // Patient-only record — no User account, update status directly on Patient record
        if (!user.uhid) { toastError('Cannot update status — UHID is missing.'); return; }
        await api.put(`/patients/${user.uhid}`, { status: activate ? 'Active' : 'Inactive' });
      } else {
        const res = await api.put(`/users/${user.id}/status`, { isActive: activate });
        if (!res.success) throw new Error('Status update failed');
      }
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, status: activate ? 'Active' : 'Inactive' } : u
      ));
      toastSuccess(`${user.name} has been ${activate ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toastError(err.message || 'Failed to update status');
    }
  };

  const handleResetPassword = async (user) => {
    if (!user.email) {
      toastError(`${user.name} has no email address on file. Update their profile first.`);
      return;
    }
    if (!window.confirm(`Send a password reset link to ${user.email}?`)) return;
    try {
      await api.post('/auth/forgot-password', { email: user.email });
      toastSuccess(`Password reset link sent to ${user.email}`);
    } catch (err) {
      toastError(err.message || 'Failed to send reset link');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    if (!window.confirm(`Are you absolutely sure you want to permanently delete ${user.name}?`)) return;
    try {
      // Patient-only records have no User account — delete via the patients API using UHID
      if (user.hasUserAccount === false && !user.uhid) {
        toastError('Cannot delete this patient — UHID is missing. Contact support.');
        return;
      }
      const endpoint = user.hasUserAccount === false
        ? `/patients/${user.uhid}`
        : `/users/${user.id}`;
      const res = await api.delete(endpoint);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        toastSuccess(`${user.name} has been deleted`);
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete user');
    }
  };

  const ActionButtons = ({ user, mobile = false }) => {
    const isActive   = user.status === 'Active';
    const hasAccount = user.hasUserAccount !== false;
    const openEdit   = async () => {
      if (hasAccount) { setEditingUser(user); return; }
      // Fetch full patient data first — the minimal ManageUsers record lacks
      // dateOfBirth, gender, diagnosis, address, etc. Saving without fetching
      // first would overwrite those fields with null.
      try {
        const res = await patientService.getByUHID(user.uhid);
        setEditingPatient(res.data);
      } catch {
        toastError('Failed to load patient details. Please try again.');
      }
    };
    const base = mobile
      ? 'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition'
      : 'p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition';
    const disabled = 'p-1.5 rounded-lg text-gray-200 cursor-not-allowed';

    if (mobile) return (
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
        <button onClick={openEdit} className={base}>
          <Pencil size={13} /> Edit
        </button>
        {hasAccount ? (
          <button onClick={() => handleResetPassword(user)} className={base}>
            <KeyRound size={13} /> Reset Password
          </button>
        ) : (
          <span className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed">
            <KeyRound size={13} /> No Account
          </span>
        )}
        <button onClick={() => handleToggleStatus(user)} className={base}>
          {isActive ? <><UserX size={13} /> Deactivate</> : <><UserCheck size={13} /> Activate</>}
        </button>
        <button onClick={() => handleDelete(user)} className={`${base} text-red-600 hover:bg-red-50 hover:text-red-700`}>
          <Trash2 size={13} /> Delete
        </button>
      </div>
    );

    return (
      <div className="flex items-center justify-end gap-0.5">
        <Tip label="Edit">
          <button onClick={openEdit} className={base}>
            <Pencil size={15} />
          </button>
        </Tip>
        <Tip label={hasAccount ? 'Reset Password' : 'No account yet'}>
          <button
            onClick={() => hasAccount && handleResetPassword(user)}
            className={hasAccount ? base : disabled}
          >
            <KeyRound size={15} />
          </button>
        </Tip>
        <Tip label={isActive ? 'Deactivate' : 'Activate'}>
          <button onClick={() => handleToggleStatus(user)} className={base}>
            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
          </button>
        </Tip>
        <Tip label="Delete">
          <button onClick={() => handleDelete(user)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
            <Trash2 size={15} />
          </button>
        </Tip>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={handleUserSaved}
        />
      )}
      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onUpdated={(updated) => {
            // Only update fields shown in the list — do not replace the full record
            // shape (which includes id: "patient_123", hasUserAccount, etc.)
            setUsers(prev => prev.map(u =>
              u.uhid === editingPatient.uhid
                ? { ...u, name: updated.name || u.name, email: updated.email || u.email, phone: updated.phone || u.phone, status: updated.status || u.status }
                : u
            ));
            setEditingPatient(null);
          }}
        />
      )}

      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 transition"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={22} className="text-gray-600" /> Manage Users
        </h1>
        <p className="text-sm text-gray-500 mt-1">View, edit and manage all system accounts</p>
      </div>

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
        </div>
        {!loading && (
          <p className="text-xs text-gray-400 mt-3">
            Showing <span className="font-semibold text-gray-600">{filteredUsers.length}</span> of <span className="font-semibold text-gray-600">{users.length}</span> users
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
            {filteredUsers.map(user => {
              const isActive = user.status === 'Active';
              return (
                <div key={user.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(user.id)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-sm font-bold">{getInitials(user.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
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
                  <ActionButtons user={user} mobile />
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['User', 'Role', 'Phone', 'Position', 'Status', 'Joined', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide ${
                      h === 'Position' ? 'hidden lg:table-cell' :
                      h === 'Joined'   ? 'hidden xl:table-cell' :
                      h === 'Actions'  ? 'text-right' : ''
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => {
                  const isActive = user.status === 'Active';
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(user.id)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-white text-xs font-bold">{getInitials(user.name)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{user.name}</p>
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

                      <td className="px-5 py-3.5">
                        <ActionButtons user={user} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ManageUsers;
