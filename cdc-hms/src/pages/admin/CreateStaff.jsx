import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { useNavigate } from 'react-router-dom';

const CreateStaff = () => {
  const navigate = useNavigate();
  
  const [staffData, setStaffData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    idNumber: '',
    
    // Employment Details
    role: '',
    department: '',
    employmentType: '',
    startDate: '',
    shift: '',
    
    // Contact Information
    address: '',
    city: '',
    emergencyContact: '',
    emergencyPhone: '',
    
    // Account Settings
    username: '',
    temporaryPassword: '',
  });

  const staffRoles = [
    'Receptionist',
    'Nurse',
    'Medical Assistant',
    'Administrative Assistant',
    'Front Desk Officer',
    'Records Officer',
    'Billing Officer',
    'Pharmacy Assistant',
  ];

  const departments = [
    'Front Desk',
    'Triage',
    'Diabetes Care',
    'Cardiology',
    'Administration',
    'Billing',
    'Pharmacy',
    'Records',
  ];

  const shifts = [
    'Morning (7AM - 3PM)',
    'Afternoon (3PM - 11PM)',
    'Night (11PM - 7AM)',
    'Rotating',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!staffData.firstName || !staffData.lastName || !staffData.email || !staffData.role) {
      alert('Please fill in all required fields');
      return;
    }

    alert(`Staff account created successfully!\n\nName: ${staffData.firstName} ${staffData.lastName}\nRole: ${staffData.role}\nEmail: ${staffData.email}\n\nLogin credentials have been sent to the staff member's email.`);
    
    // Reset form
    setStaffData({
      firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
      role: '', department: '', employmentType: '', startDate: '', shift: '',
      address: '', city: '', emergencyContact: '', emergencyPhone: '',
      username: '', temporaryPassword: '',
    });
  };

  const generateUsername = () => {
    if (staffData.firstName && staffData.lastName) {
      const username = `${staffData.firstName.toLowerCase()}.${staffData.lastName.toLowerCase()}`;
      setStaffData({ ...staffData, username });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStaffData({ ...staffData, temporaryPassword: password });
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Create Staff Account</h2>
        <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <Card title="👤 Personal Information" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              type="text"
              value={staffData.firstName}
              onChange={(e) => setStaffData({ ...staffData, firstName: e.target.value })}
              placeholder="Enter first name"
              required
            />

            <Input
              label="Last Name *"
              type="text"
              value={staffData.lastName}
              onChange={(e) => setStaffData({ ...staffData, lastName: e.target.value })}
              placeholder="Enter last name"
              required
            />

            <Input
              label="Email Address *"
              type="email"
              value={staffData.email}
              onChange={(e) => setStaffData({ ...staffData, email: e.target.value })}
              placeholder="staff@example.com"
              required
            />

            <Input
              label="Phone Number *"
              type="tel"
              value={staffData.phone}
              onChange={(e) => setStaffData({ ...staffData, phone: e.target.value })}
              placeholder="+254 712 345 678"
              required
            />

            <Input
              label="Date of Birth"
              type="date"
              value={staffData.dateOfBirth}
              onChange={(e) => setStaffData({ ...staffData, dateOfBirth: e.target.value })}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
              <select
                value={staffData.gender}
                onChange={(e) => setStaffData({ ...staffData, gender: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Input
              label="ID/Passport Number *"
              type="text"
              value={staffData.idNumber}
              onChange={(e) => setStaffData({ ...staffData, idNumber: e.target.value })}
              placeholder="ID or Passport Number"
              required
            />
          </div>
        </Card>

        {/* Employment Details */}
        <Card title="💼 Employment Details" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Role *</label>
              <select
                value={staffData.role}
                onChange={(e) => setStaffData({ ...staffData, role: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select role</option>
                {staffRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department *</label>
              <select
                value={staffData.department}
                onChange={(e) => setStaffData({ ...staffData, department: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Type *</label>
              <select
                value={staffData.employmentType}
                onChange={(e) => setStaffData({ ...staffData, employmentType: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Temporary">Temporary</option>
              </select>
            </div>

            <Input
              label="Start Date *"
              type="date"
              value={staffData.startDate}
              onChange={(e) => setStaffData({ ...staffData, startDate: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Work Shift *</label>
              <select
                value={staffData.shift}
                onChange={(e) => setStaffData({ ...staffData, shift: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift} value={shift}>{shift}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card title="📍 Contact Information" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
              <textarea
                value={staffData.address}
                onChange={(e) => setStaffData({ ...staffData, address: e.target.value })}
                placeholder="Full address"
                rows="2"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <Input
              label="City"
              type="text"
              value={staffData.city}
              onChange={(e) => setStaffData({ ...staffData, city: e.target.value })}
              placeholder="City"
            />

            <Input
              label="Emergency Contact Name"
              type="text"
              value={staffData.emergencyContact}
              onChange={(e) => setStaffData({ ...staffData, emergencyContact: e.target.value })}
              placeholder="Emergency contact person"
            />

            <Input
              label="Emergency Contact Phone"
              type="tel"
              value={staffData.emergencyPhone}
              onChange={(e) => setStaffData({ ...staffData, emergencyPhone: e.target.value })}
              placeholder="+254 712 345 678"
            />
          </div>
        </Card>

        {/* Account Settings */}
        <Card title="🔐 Account Settings" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Username *"
                type="text"
                value={staffData.username}
                onChange={(e) => setStaffData({ ...staffData, username: e.target.value })}
                placeholder="username"
                required
              />
              <button
                type="button"
                onClick={generateUsername}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Generate from name
              </button>
            </div>

            <div>
              <Input
                label="Temporary Password *"
                type="text"
                value={staffData.temporaryPassword}
                onChange={(e) => setStaffData({ ...staffData, temporaryPassword: e.target.value })}
                placeholder="Temporary password"
                required
              />
              <button
                type="button"
                onClick={generatePassword}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Generate secure password
              </button>
            </div>

            <div className="md:col-span-2 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <p className="text-sm text-gray-700">
                <strong>⚠️ Note:</strong> The temporary password will be sent to the staff member's email. 
                They will be required to change it upon first login.
              </p>
            </div>
          </div>
        </Card>

        {/* Permissions Note */}
        <Card title="🔒 Access Permissions" className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              <strong>ℹ️ Default Permissions by Role:</strong>
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Receptionist/Front Desk:</strong> Patient registration, queue management, appointment scheduling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Nurse:</strong> Triage, vitals recording, patient monitoring</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Medical Assistant:</strong> Support doctors, document management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span><strong>Administrative:</strong> Records, billing, reports access</span>
              </li>
            </ul>
            <p className="text-xs text-gray-600 mt-3">
              Permissions can be customized later from the Manage Users page.
            </p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/dashboard')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
            ✓ Create Staff Account
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateStaff;