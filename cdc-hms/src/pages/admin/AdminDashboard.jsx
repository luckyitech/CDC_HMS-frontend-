import { useState, useEffect } from "react";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { useNavigate } from "react-router-dom";
import { usePatientContext } from "../../contexts/PatientContext";
import api from "../../services/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { patients } = usePatientContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users')
      .then(res => { if (res.success) setUsers(res.data.users); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
    totalPatients: patients.length,
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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'doctor':  return 'bg-blue-100 text-blue-700';
      case 'lab':     return 'bg-purple-100 text-purple-700';
      case 'staff':   return 'bg-green-100 text-green-700';
      case 'patient': return 'bg-cyan-100 text-cyan-700';
      default:        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatRole = (role) => {
    const map = { doctor: 'Doctor', staff: 'Staff', lab: 'Lab Tech', patient: 'Patient', admin: 'Admin' };
    return map[role] || role;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Admin Dashboard</h2>
        <p className="text-gray-600 mt-1">System Overview & User Management</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Doctors</p>
          <p className="text-4xl font-bold mt-2">{loading ? '...' : stats.totalDoctors}</p>
          <p className="text-sm mt-3 opacity-75">+{stats.newThisMonth.doctors} this month</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Staff</p>
          <p className="text-4xl font-bold mt-2">{loading ? '...' : stats.totalStaff}</p>
          <p className="text-sm mt-3 opacity-75">+{stats.newThisMonth.staff} this month</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Lab Technicians</p>
          <p className="text-4xl font-bold mt-2">{loading ? '...' : stats.totalLabTechs}</p>
          <p className="text-sm mt-3 opacity-75">+{stats.newThisMonth.labTechs} this month</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Total Patients</p>
          <p className="text-4xl font-bold mt-2">{patients.length}</p>
          <p className="text-sm mt-3 opacity-75">Registered patients</p>
        </div>
      </div>

      {/* System Status + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title="System Status">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Active Users</span>
              <span className="text-lg font-bold text-green-600">{loading ? '...' : stats.activeUsers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Inactive Users</span>
              <span className="text-lg font-bold text-gray-600">{loading ? '...' : stats.inactiveUsers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-semibold text-gray-700">Total Users</span>
              <span className="text-lg font-bold text-blue-600">{loading ? '...' : users.length}</span>
            </div>
          </div>
        </Card>

        <Card title="Quick Actions" className="md:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/admin/create-doctor')} className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition border-l-4 border-blue-500 text-left">
              <p className="font-semibold text-blue-700">Create Doctor</p>
              <p className="text-xs text-blue-600 mt-1">Add new medical practitioner</p>
            </button>
            <button onClick={() => navigate('/admin/create-staff')} className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition border-l-4 border-green-500 text-left">
              <p className="font-semibold text-green-700">Create Staff</p>
              <p className="text-xs text-green-600 mt-1">Add administrative staff</p>
            </button>
            <button onClick={() => navigate('/admin/create-lab')} className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition border-l-4 border-purple-500 text-left">
              <p className="font-semibold text-purple-700">Create Lab Tech</p>
              <p className="text-xs text-purple-600 mt-1">Add lab technician</p>
            </button>
            <button onClick={() => navigate('/admin/create-patient')} className="p-4 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition border-l-4 border-cyan-500 text-left">
              <p className="font-semibold text-cyan-700">Create Patient</p>
              <p className="text-xs text-cyan-600 mt-1">Register new patient</p>
            </button>
          </div>
        </Card>
      </div>

      {/* Recent Account Creations */}
      <Card title="Recent Account Creations">
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
                  {recentAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{account.name}</p>
                        <p className="text-xs text-gray-500">{account.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(account.role)}`}>
                          {formatRole(account.role)}
                        </span>
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
                  ))}
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
