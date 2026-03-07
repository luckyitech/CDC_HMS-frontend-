import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    api.get('/users')
      .then(res => { if (res.success) setUsers(res.data.users); })
      .catch(() => toast.error('Failed to load users', {
        duration: 4000,
        position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      }))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone || '').includes(searchTerm);
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

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor':  return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'staff':   return 'bg-green-100 text-green-700 border-green-300';
      case 'lab':     return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'patient': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      default:        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatRole = (role) => {
    const map = { doctor: 'Doctor', staff: 'Staff', lab: 'Lab Tech', patient: 'Patient', admin: 'Admin' };
    return map[role] || role;
  };

  const getStatusColor = (status) => {
    return status === 'Active'
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getSpecialty = (user) => user.specialty || user.position || user.specialization || '—';

  const toastSuccess = (msg) => toast.success(msg, {
    duration: 3000, position: 'top-right',
    style: { background: '#10B981', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
  });
  const toastError = (msg) => toast.error(msg, {
    duration: 4000, position: 'top-right',
    style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
  });

  const handleEdit = (user) => {
    toast(`Edit feature coming soon for ${user.name}`, {
      duration: 3000, position: 'top-right', icon: '✏️',
      style: { background: '#3B82F6', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
    });
  };

  const handleToggleStatus = async (user) => {
    const activate = user.status !== 'Active';
    const action   = activate ? 'activate' : 'deactivate';
    if (!window.confirm(`${activate ? 'Activate' : 'Deactivate'} ${user.name}?`)) return;
    try {
      const res = await api.put(`/users/${user.id}/status`, { isActive: activate });
      if (res.success) {
        setUsers(prev => prev.map(u =>
          u.id === user.id ? { ...u, status: activate ? 'Active' : 'Inactive' } : u
        ));
        toastSuccess(`${user.name} has been ${action}d`);
      }
    } catch (err) {
      toastError(err.message || `Failed to ${action} user`);
    }
  };

  const handleResetPassword = async (user) => {
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
      const res = await api.delete(`/users/${user.id}`);
      if (res.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        toastSuccess(`${user.name} has been deleted from the system`);
      }
    } catch (err) {
      toastError(err.message || 'Failed to delete user');
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Manage All Users</h2>
        <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 lg:gap-4 mb-6">
        {[
          { label: 'Total',     value: stats.total,    from: 'from-gray-700',   to: 'to-gray-800'   },
          { label: 'Doctors',   value: stats.doctors,  from: 'from-blue-500',   to: 'to-blue-600'   },
          { label: 'Staff',     value: stats.staff,    from: 'from-green-500',  to: 'to-green-600'  },
          { label: 'Lab Techs', value: stats.lab,      from: 'from-purple-500', to: 'to-purple-600' },
          { label: 'Patients',  value: stats.patients, from: 'from-cyan-500',   to: 'to-cyan-600'   },
          { label: 'Active',    value: stats.active,   from: 'from-green-600',  to: 'to-green-700'  },
          { label: 'Inactive',  value: stats.inactive, from: 'from-gray-500',   to: 'to-gray-600'   },
        ].map(({ label, value, from, to }) => (
          <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-xl shadow-lg p-4 text-white`}>
            <p className="text-xs opacity-90">{label}</p>
            <p className="text-2xl lg:text-3xl font-bold mt-2">{loading ? '...' : value}</p>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <Card title="🔍 Search & Filter Users" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search (Name, Email, Phone)</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="staff">Staff</option>
              <option value="lab">Lab Technicians</option>
              <option value="patient">Patients</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
        </div>
      </Card>

      {/* Users Table */}
      <Card title="👥 All System Users">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-xl font-semibold text-gray-800 mb-2">No users found</p>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Name</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Role</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Contact</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Specialty / Position</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase hidden lg:table-cell">Created</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <p className="text-sm font-bold text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email || '—'}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(user.role)}`}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-700">{user.phone || '—'}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-700">{getSpecialty(user)}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-gray-600 hidden lg:table-cell">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex flex-col gap-1">
                        <Button variant="outline" className="text-xs py-1 px-2" onClick={() => handleEdit(user)}>
                          ✏️ Edit
                        </Button>
                        <Button variant="outline" className="text-xs py-1 px-2" onClick={() => handleResetPassword(user)}>
                          🔑 Reset Password
                        </Button>
                        {user.status === 'Active' ? (
                          <Button variant="outline" className="text-xs py-1 px-2 text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => handleToggleStatus(user)}>
                            ⏸️ Deactivate
                          </Button>
                        ) : (
                          <Button variant="outline" className="text-xs py-1 px-2 text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleToggleStatus(user)}>
                            ▶️ Activate
                          </Button>
                        )}
                        <Button variant="outline" className="text-xs py-1 px-2 text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleDelete(user)}>
                          🗑️ Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      <Card title="⚡ Bulk Actions" className="mt-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1">📧 Send Email to All Active Users</Button>
          <Button variant="outline" className="flex-1">📊 Export User List (Excel)</Button>
          <Button variant="outline" className="flex-1">📄 Generate User Report (PDF)</Button>
        </div>
      </Card>
    </div>
  );
};

export default ManageUsers;
