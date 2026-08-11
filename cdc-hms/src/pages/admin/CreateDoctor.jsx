import { useState } from 'react';
import toast from 'react-hot-toast';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Stethoscope, Briefcase } from 'lucide-react';
import CardTitle from '../../components/shared/CardTitle';
import PersonalInfoSection from '../../components/shared/formSections/PersonalInfoSection';
import ContactInfoSection from '../../components/shared/formSections/ContactInfoSection';
import AccountSettingsSection from '../../components/shared/formSections/AccountSettingsSection';

const CreateDoctor = ({ embedded = false }) => {
  const navigate = useNavigate();
  
  const [doctorData, setDoctorData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    idNumber: '',
    
    // Professional Information
    licenseNumber: '',
    specialty: '',
    subSpecialty: '',
    yearsOfExperience: '',
    qualification: '',
    medicalSchool: '',
    
    // Employment Details
    department: '',
    employmentType: '',
    startDate: '',
    
    // Contact Information
    address: '',
    city: '',
    emergencyContact: '',
    emergencyPhone: '',
    
    // Account Settings
    username: '',
    temporaryPassword: '',
  });

  const specialties = [
    'Endocrinologist',
    'Cardiologist',
    'Diabetologist',
    'General Practitioner',
    'Nephrologist',
    'Neurologist',
    'Pediatrician',
    'Surgeon',
  ];

  const departments = [
    'Diabetes Care',
    'Cardiology',
    'Nephrology',
    'General Medicine',
    'Pediatrics',
    'Surgery',
  ];

  // Generic field setter used by the shared form sections
  const handleChange = (field, value) => setDoctorData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!doctorData.firstName || !doctorData.lastName || !doctorData.email || !doctorData.licenseNumber) {
      toast.error('Please fill in all required fields', {
        duration: 3000,
        position: 'top-right',
        style: { background: '#EF4444', color: '#FFFFFF', fontWeight: 'bold', padding: '16px' },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/users/doctors', {
        firstName: doctorData.firstName,
        lastName: doctorData.lastName,
        email: doctorData.email,
        phone: doctorData.phone,
        licenseNumber: doctorData.licenseNumber,
        specialty: doctorData.specialty,
        subSpecialty: doctorData.subSpecialty || null,
        department: doctorData.department,
        qualification: doctorData.qualification,
        medicalSchool: doctorData.medicalSchool || null,
        yearsExperience: doctorData.yearsOfExperience ? parseInt(doctorData.yearsOfExperience) : 0,
        employmentType: doctorData.employmentType,
        startDate: doctorData.startDate || null,
        shift: 'Morning',               // backend requires shift; default until hospital introduces shift scheduling
        address: doctorData.address || null,
        city: doctorData.city || null,
        password: doctorData.temporaryPassword || undefined,
      });

      if (response.success) {
        toast.success(
          `Doctor Account Created!\n\nName: Dr. ${doctorData.firstName} ${doctorData.lastName}\nEmail: ${doctorData.email}\n\nLogin credentials have been sent to their email.`,
          {
            duration: 8000,
            position: 'top-right',
            style: { background: '#10B981', color: '#FFFFFF', fontWeight: 'bold', padding: '16px', whiteSpace: 'pre-line' },
          }
        );
        setDoctorData({
          firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
          licenseNumber: '', specialty: '', subSpecialty: '', yearsOfExperience: '', qualification: '', medicalSchool: '',
          department: '', employmentType: '', startDate: '',
          address: '', city: '', emergencyContact: '', emergencyPhone: '',
          username: '', temporaryPassword: '',
        });
      }
    } catch (err) {
      const isEmailTaken = err.message?.toLowerCase().includes('email already in use');
      toast.error(
        isEmailTaken
          ? `Email "${doctorData.email}" is already registered. Please use a different email.`
          : err.message || 'Failed to create doctor account',
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setDoctorData({ ...doctorData, temporaryPassword: password });
  };

  return (
    <div>
      {/* Page header — hidden when hosted inside Create Users */}
      {!embedded && (
        <PageHeader
          title="Create Doctor Account"
          actions={
            <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
              ← Back to Dashboard
            </Button>
          }
        />
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <PersonalInfoSection data={doctorData} onChange={handleChange} emailPlaceholder="doctor@example.com" />

        {/* Professional Information */}
        <Card title={<CardTitle icon={Stethoscope}>Professional Information</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Medical License Number *"
              type="text"
              value={doctorData.licenseNumber}
              onChange={(e) => setDoctorData({ ...doctorData, licenseNumber: e.target.value })}
              placeholder="e.g., MED-KE-12345"
              required
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Specialty *</label>
              <select
                value={doctorData.specialty}
                onChange={(e) => setDoctorData({ ...doctorData, specialty: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select specialty</option>
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <Input
              label="Sub-Specialty (if any)"
              type="text"
              value={doctorData.subSpecialty}
              onChange={(e) => setDoctorData({ ...doctorData, subSpecialty: e.target.value })}
              placeholder="e.g., Pediatric Diabetes"
            />

            <Input
              label="Years of Experience"
              type="number"
              value={doctorData.yearsOfExperience}
              onChange={(e) => setDoctorData({ ...doctorData, yearsOfExperience: e.target.value })}
              placeholder="Years"
              min="0"
            />

            <Input
              label="Highest Qualification *"
              type="text"
              value={doctorData.qualification}
              onChange={(e) => setDoctorData({ ...doctorData, qualification: e.target.value })}
              placeholder="e.g., MD, MBBS, PhD"
              required
            />

            <Input
              label="Medical School"
              type="text"
              value={doctorData.medicalSchool}
              onChange={(e) => setDoctorData({ ...doctorData, medicalSchool: e.target.value })}
              placeholder="University/Institution"
            />
          </div>
        </Card>

        {/* Employment Details */}
        <Card title={<CardTitle icon={Briefcase}>Employment Details</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Department *</label>
              <select
                value={doctorData.department}
                onChange={(e) => setDoctorData({ ...doctorData, department: e.target.value })}
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
                value={doctorData.employmentType}
                onChange={(e) => setDoctorData({ ...doctorData, employmentType: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Consultant">Consultant</option>
              </select>
            </div>

            <Input
              label="Start Date *"
              type="date"
              value={doctorData.startDate}
              onChange={(e) => setDoctorData({ ...doctorData, startDate: e.target.value })}
              required
            />
          </div>
        </Card>

        {/* Contact Information */}
        <ContactInfoSection data={doctorData} onChange={handleChange} />

        {/* Account Settings */}
        <AccountSettingsSection data={doctorData} onChange={handleChange} onGeneratePassword={generatePassword} roleNoun="doctor" />

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
            {isSubmitting ? 'Creating...' : '✓ Create Doctor Account'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDoctor;