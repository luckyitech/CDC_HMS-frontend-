import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Briefcase, Shield } from 'lucide-react';
import CardTitle from '../../components/shared/CardTitle';
import PersonalInfoSection from '../../components/shared/formSections/PersonalInfoSection';
import ContactInfoSection from '../../components/shared/formSections/ContactInfoSection';
import AccountSettingsSection from '../../components/shared/formSections/AccountSettingsSection';

const CreateStaff = ({ embedded = false }) => {
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
    'Nurse',
    'Admin',
    'Receptionist',
  ];

  const departments = [
    'Nursing',
    'Administration',
    'Front Desk',
  ];

  const SHIFTS = ['Morning', 'Afternoon', 'Night', 'Rotating'];

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generic field setter used by the shared form sections
  const handleChange = (field, value) => setStaffData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!staffData.firstName || !staffData.lastName || !staffData.email || !staffData.role) {
      toast.error('Please fill in all required fields', {
        duration: 3000,
        position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Every field below is sent. This form has always COLLECTED date of
      // birth, gender, national ID, address, city and the emergency contact —
      // they were simply never submitted, because StaffProfile had nowhere to
      // put them. The admin typed them in, the form cleared, and the data was
      // silently discarded. The consolidated StaffProfile has the columns now.
      const response = await api.post('/users/staff', {
        firstName: staffData.firstName,
        lastName: staffData.lastName,
        email: staffData.email,
        phone: staffData.phone,

        // The form field is called 'role' but holds a job title (Receptionist,
        // Admin). The account's User.role is always 'staff' — this maps onto
        // `position`, which is the HR job title.
        position: staffData.role,
        department: staffData.department,
        employmentType: staffData.employmentType || undefined,
        startDate: staffData.startDate || null,
        shift: staffData.shift || 'Morning',

        dateOfBirth: staffData.dateOfBirth || null,
        gender: staffData.gender || undefined,
        idNumber: staffData.idNumber || undefined,
        address: staffData.address || undefined,
        city: staffData.city || undefined,

        // Stored as one JSON column, matching how Patient holds the same thing.
        emergencyContact: staffData.emergencyContact || staffData.emergencyPhone
          ? {
              name: staffData.emergencyContact || null,
              relationship: staffData.emergencyRelationship || null,
              phone: staffData.emergencyPhone || null,
            }
          : undefined,

        password: staffData.temporaryPassword || undefined,
      });

      if (response.success) {
        toast.success(
          `Staff Account Created!\n\nName: ${staffData.firstName} ${staffData.lastName}\nEmail: ${staffData.email}\n\nLogin credentials have been sent to their email.`,
          {
            duration: 8000,
            position: 'top-right',
            style: { background: '#10B981', color: '#FFFFFF', fontWeight: 'bold', padding: '16px', whiteSpace: 'pre-line' },
          }
        );
        setStaffData({
          firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
          role: '', department: '', employmentType: '', startDate: '', shift: '',
          address: '', city: '', emergencyContact: '', emergencyPhone: '',
          username: '', temporaryPassword: '',
        });
      }
    } catch (err) {
      const isEmailTaken = err.message?.toLowerCase().includes('email already in use');
      toast.error(
        isEmailTaken
          ? `Email "${staffData.email}" is already registered. Please use a different email.`
          : err.message || 'Failed to create staff account',
        {
          duration: 5000,
          position: 'top-right',
          style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // TODO: Uncomment when username field is re-enabled
  // const generateUsername = () => {
  //   if (staffData.firstName && staffData.lastName) {
  //     const username = `${staffData.firstName.toLowerCase()}.${staffData.lastName.toLowerCase()}`;
  //     setStaffData({ ...staffData, username });
  //   }
  // };

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
      {/* Page header — hidden when hosted inside Create Users */}
      {!embedded && (
        <PageHeader
          title="Create Staff Account"
        />
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <PersonalInfoSection data={staffData} onChange={handleChange} emailPlaceholder="staff@example.com" />

        {/* Employment Details */}
        <Card title={<CardTitle icon={Briefcase}>Employment Details</CardTitle>} className="mb-6">
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

            {/* Previously commented out, while the submit handler hardcoded
                'Morning' to satisfy the backend validator — which meant every
                staff member in the database was on the morning shift whatever
                they actually worked. Optional rather than required, so a
                hospital not running shifts can leave it blank. */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Work Shift</label>
              <select
                value={staffData.shift}
                onChange={(e) => setStaffData({ ...staffData, shift: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Not applicable</option>
                {SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>{shift}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <ContactInfoSection data={staffData} onChange={handleChange} />

        {/* Account Settings */}
        <AccountSettingsSection data={staffData} onChange={handleChange} onGeneratePassword={generatePassword} roleNoun="staff member" />

        {/* Permissions Note */}
        <Card title={<CardTitle icon={Shield}>Access Permissions</CardTitle>} className="mb-6">
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
          <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : '✓ Create Staff Account'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateStaff;