import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { useNavigate } from 'react-router-dom';
import {  SquarePen } from 'lucide-react';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock users data - all system users
  const [users] = useState([
    // Doctors
    { id: 1, name: 'Dr. Ahmed Hassan', role: 'Doctor', email: 'ahmed.hassan@cdc.com', phone: '+254 720 111 222', specialty: 'Endocrinologist', status: 'Active', createdDate: '2023-01-15', lastLogin: '2024-12-09' },
    { id: 2, name: 'Dr. Sarah Kamau', role: 'Doctor', email: 'sarah.kamau@cdc.com', phone: '+254 720 333 444', specialty: 'Cardiologist', status: 'Active', createdDate: '2023-02-20', lastLogin: '2024-12-08' },
    { id: 3, name: 'Dr. James Omondi', role: 'Doctor', email: 'james.omondi@cdc.com', phone: '+254 720 555 666', specialty: 'Diabetologist', status: 'Active', createdDate: '2023-03-10', lastLogin: '2024-12-09' },
    
    // Staff
    { id: 4, name: 'Mary Njeri', role: 'Staff', email: 'mary.njeri@cdc.com', phone: '+254 712 111 222', specialty: 'Receptionist', status: 'Active', createdDate: '2023-04-05', lastLogin: '2024-12-09' },
    { id: 5, name: 'John Mwangi', role: 'Staff', email: 'john.mwangi@cdc.com', phone: '+254 712 333 444', specialty: 'Nurse', status: 'Active', createdDate: '2023-05-12', lastLogin: '2024-12-08' },
    { id: 6, name: 'Grace Wambui', role: 'Staff', email: 'grace.wambui@cdc.com', phone: '+254 712 555 666', specialty: 'Administrative Assistant', status: 'Inactive', createdDate: '2023-06-18', lastLogin: '2024-11-20' },
    
    // Lab Technicians
    { id: 7, name: 'Sarah Mwangi', role: 'Lab', email: 'sarah.mwangi@cdc.com', phone: '+254 713 111 222', specialty: 'Clinical Chemistry', status: 'Active', createdDate: '2023-07-22', lastLogin: '2024-12-09' },
    { id: 8, name: 'John Kamau', role: 'Lab', email: 'john.kamau@cdc.com', phone: '+254 713 333 444', specialty: 'Hematology', status: 'Active', createdDate: '2023-08-30', lastLogin: '2024-12-09' },
    
    // Patients
    { id: 9, name: 'John Doe', role: 'Patient', email: 'john.doe@email.com', phone: '+254 712 345 678', specialty: 'Type 2 Diabetes', status: 'Active', createdDate: '2024-01-10', lastLogin: '2024-12-09' },
    { id: 10, name: 'Mary Johnson', role: 'Patient', email: 'mary.johnson@email.com', phone: '+254 723 456 789', specialty: 'Type 1 Diabetes', status: 'Active', createdDate: '2024-02-15', lastLogin: '2024-12-08' },
    { id: 11, name: 'Ali Hassan', role: 'Patient', email: 'ali.hassan@email.com', phone: '+254 734 567 890', specialty: 'Type 2 Diabetes', status: 'Active', createdDate: '2024-03-20', lastLogin: '2024-12-07' },
    { id: 12, name: 'Grace Wanjiru', role: 'Patient', email: 'grace.wanjiru@email.com', phone: '+254 745 678 901', specialty: 'Pre-Diabetes', status: 'Inactive', createdDate: '2024-04-25', lastLogin: '2024-11-15' },
  ]);

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm);
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Statistics
  const stats = {
    total: users.length,
    doctors: users.filter(u => u.role === 'Doctor').length,
    staff: users.filter(u => u.role === 'Staff').length,
    lab: users.filter(u => u.role === 'Lab').length,
    patients: users.filter(u => u.role === 'Patient').length,
    active: users.filter(u => u.status === 'Active').length,
    inactive: users.filter(u => u.status === 'Inactive').length,
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Doctor': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Staff': return 'bg-green-100 text-green-700 border-green-300';
      case 'Lab': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'Patient': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-700 border-green-300';
      case 'Inactive': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'Suspended': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleEdit = (user) => {
    toast.info(`Edit User: ${user.name}\n\nThis will open an edit form to update user details.`, {
      duration: 3000,
      position: 'top-right',
      icon: '✏️',
      style: {
        background: '#3B82F6',
        color: '#FFFFFF',
        fontWeight: 'bold',
        padding: '16px',
        whiteSpace: 'pre-line',
      },
    });
  };

  const handleDeactivate = (user) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.name}?\n\nThey will not be able to login until reactivated.`)) {
      toast.success(`${user.name} has been deactivated`, {
        duration: 3000,
        position: 'top-right',
        icon: '✅',
        style: {
          background: '#10B981',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
    }
  };

  const handleResetPassword = (user) => {
    if (window.confirm(`Reset password for ${user.name}?\n\nA new temporary password will be sent to their email.`)) {
      toast.success(`Password reset email sent to ${user.email}`, {
        duration: 3000,
        position: 'top-right',
        icon: '✅',
        style: {
          background: '#10B981',
          color: '#FFFFFF',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
    }
  };

  const handleDelete = (user) => {
    if (window.confirm(`⚠️ WARNING: Delete ${user.name}?\n\nThis action cannot be undone. All user data will be permanently deleted.`)) {
      if (window.confirm(`Are you absolutely sure? Type DELETE to confirm.`)) {
        toast.success(`${user.name} has been deleted from the system`, {
          duration: 3000,
          position: 'top-right',
          icon: '✅',
          style: {
            background: '#10B981',
            color: '#FFFFFF',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
      }
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
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Total Users</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats.total}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Doctors</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats.doctors}</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Staff</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats.staff}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Lab Techs</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats.lab}</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Patients</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats.patients}</p>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Active</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats.active}</p>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl shadow-lg p-4 text-white">
          <p className="text-xs opacity-90">Inactive</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2">{stats.inactive}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card title="🔍 Search & Filter Users" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search (Name, Email, Phone)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          {/* Filter by Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="all">All Roles</option>
              <option value="Doctor">Doctors</option>
              <option value="Staff">Staff</option>
              <option value="Lab">Lab Technicians</option>
              <option value="Patient">Patients</option>
            </select>
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Filter by Status
            </label>
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
        {filteredUsers.length === 0 ? (
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
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Specialty/Position</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Created</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Last Login</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <p className="text-sm font-bold text-gray-800">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-700">
                      {user.phone}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-700">
                      {user.specialty}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-gray-600">
                      {new Date(user.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs text-gray-600">
                      {new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex flex-col gap-1">
                        <Button 
                          variant="outline" 
                          className="text-xs py-1 px-2"
                          onClick={() => handleEdit(user)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          className="text-xs py-1 px-2"
                          onClick={() => handleResetPassword(user)}
                        >
                          🔑 Reset Password
                        </Button>
                        {user.status === 'Active' ? (
                          <Button 
                            variant="outline" 
                            className="text-xs py-1 px-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => handleDeactivate(user)}
                          >
                            ⏸️ Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2 text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => toast.success(`${user.name} has been activated`, {
                              duration: 3000,
                              position: 'top-right',
                              icon: '✅',
                              style: {
                                background: '#10B981',
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                padding: '16px',
                              },
                            })}
                          >
                            ▶️ Activate
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          className="text-xs py-1 px-2 text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleDelete(user)}
                        >
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
          <Button variant="outline" className="flex-1">
            📧 Send Email to All Active Users
          </Button>
          <Button variant="outline" className="flex-1">
            📊 Export User List (Excel)
          </Button>
          <Button variant="outline" className="flex-1">
            📄 Generate User Report (PDF)
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ManageUsers;