import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Briefcase, Microscope, Shield } from 'lucide-react';
import CardTitle from '../../components/shared/CardTitle';
import PersonalInfoSection from '../../components/shared/formSections/PersonalInfoSection';
import ContactInfoSection from '../../components/shared/formSections/ContactInfoSection';
import AccountSettingsSection from '../../components/shared/formSections/AccountSettingsSection';

const CreateLabTech = ({ embedded = false }) => {
  const navigate = useNavigate();
  
  const [labTechData, setLabTechData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    idNumber: '',
    
    // Professional Information
    certificationNumber: '',
    specialization: '',
    qualification: '',
    institution: '',
    yearsOfExperience: '',
    
    // Employment Details
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

  const specializations = [
    'Clinical Chemistry',
    'Hematology',
    'Microbiology',
    'Immunology',
    'Blood Bank',
    'Molecular Diagnostics',
    'General Laboratory',
  ];

  const qualifications = [
    'Diploma in Medical Laboratory Technology',
    'BSc in Medical Laboratory Science',
    'Higher Diploma in Medical Laboratory Technology',
    'MSc in Medical Laboratory Science',
    'Certificate in Laboratory Technology',
  ];

  const shifts = ['Morning', 'Afternoon', 'Night'];

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generic field setter used by the shared form sections
  const handleChange = (field, value) => setLabTechData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!labTechData.firstName || !labTechData.lastName || !labTechData.email || !labTechData.certificationNumber) {
      toast.error('Please fill in all required fields', {
        duration: 3000,
        position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/users/lab-techs', {
        firstName: labTechData.firstName,
        lastName: labTechData.lastName,
        email: labTechData.email,
        phone: labTechData.phone,
        specialization: labTechData.specialization,
        certificationNumber: labTechData.certificationNumber,
        qualification: labTechData.qualification,
        institution: labTechData.institution || null,
        yearsExperience: labTechData.yearsOfExperience ? parseInt(labTechData.yearsOfExperience) : 0,
        shift: labTechData.shift || 'Morning',
        startDate: labTechData.startDate || null,
        password: labTechData.temporaryPassword || undefined,
      });

      if (response.success) {
        toast.success(
          `Lab Technician Account Created!\n\nName: ${labTechData.firstName} ${labTechData.lastName}\nEmail: ${labTechData.email}\n\nLogin credentials have been sent to their email.`,
          {
            duration: 8000,
            position: 'top-right',
            style: { background: '#10B981', color: '#FFFFFF', fontWeight: 'bold', padding: '16px', whiteSpace: 'pre-line' },
          }
        );
        setLabTechData({
          firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
          certificationNumber: '', specialization: '', qualification: '', institution: '', yearsOfExperience: '',
          employmentType: '', startDate: '', shift: '',
          address: '', city: '', emergencyContact: '', emergencyPhone: '',
          username: '', temporaryPassword: '',
        });
      }
    } catch (err) {
      const isEmailTaken = err.message?.toLowerCase().includes('email already in use');
      toast.error(
        isEmailTaken
          ? `Email "${labTechData.email}" is already registered. Please use a different email.`
          : err.message || 'Failed to create lab technician account',
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

  const generateUsername = () => {
    if (labTechData.firstName && labTechData.lastName) {
      const username = `lab.${labTechData.firstName.toLowerCase()}.${labTechData.lastName.toLowerCase()}`;
      setLabTechData({ ...labTechData, username });
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLabTechData({ ...labTechData, temporaryPassword: password });
  };

  return (
    <div>
      {/* Page header — hidden when hosted inside Create Users */}
      {!embedded && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Create Lab Technician Account</h2>
          <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
            ← Back to Dashboard
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <PersonalInfoSection data={labTechData} onChange={handleChange} emailPlaceholder="labtech@example.com" />

        {/* Professional Information */}
        <Card title={<CardTitle icon={Microscope}>Professional Information</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Certification/License Number *"
              type="text"
              value={labTechData.certificationNumber}
              onChange={(e) => setLabTechData({ ...labTechData, certificationNumber: e.target.value })}
              placeholder="e.g., MLT-KE-12345"
              required
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Specialization *</label>
              <select
                value={labTechData.specialization}
                onChange={(e) => setLabTechData({ ...labTechData, specialization: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select specialization</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Highest Qualification *</label>
              <select
                value={labTechData.qualification}
                onChange={(e) => setLabTechData({ ...labTechData, qualification: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select qualification</option>
                {qualifications.map((qual) => (
                  <option key={qual} value={qual}>{qual}</option>
                ))}
              </select>
            </div>

            <Input
              label="Institution/College"
              type="text"
              value={labTechData.institution}
              onChange={(e) => setLabTechData({ ...labTechData, institution: e.target.value })}
              placeholder="Training institution"
            />

            <Input
              label="Years of Experience"
              type="number"
              value={labTechData.yearsOfExperience}
              onChange={(e) => setLabTechData({ ...labTechData, yearsOfExperience: e.target.value })}
              placeholder="Years"
              min="0"
            />
          </div>
        </Card>

        {/* Employment Details */}
        <Card title={<CardTitle icon={Briefcase}>Employment Details</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Type *</label>
              <select
                value={labTechData.employmentType}
                onChange={(e) => setLabTechData({ ...labTechData, employmentType: e.target.value })}
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
              value={labTechData.startDate}
              onChange={(e) => setLabTechData({ ...labTechData, startDate: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Work Shift *</label>
              <select
                value={labTechData.shift}
                onChange={(e) => setLabTechData({ ...labTechData, shift: e.target.value })}
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
        <ContactInfoSection data={labTechData} onChange={handleChange} />

        {/* Account Settings */}
        <AccountSettingsSection data={labTechData} onChange={handleChange} onGeneratePassword={generatePassword} roleNoun="lab technician" />

        {/* Permissions Note */}
        <Card title={<CardTitle icon={Shield}>Lab Portal Access</CardTitle>} className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              <strong>ℹ️ Lab Technician will have access to:</strong>
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>View pending test orders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Enter test results and values</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Generate laboratory reports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Flag critical results for immediate doctor notification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>View test history and search records</span>
              </li>
            </ul>
            <p className="text-xs text-gray-600 mt-3">
              Access is limited to laboratory functions only. Cannot access patient clinical records or prescriptions.
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
            {isSubmitting ? 'Creating...' : '✓ Create Lab Technician Account'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateLabTech;