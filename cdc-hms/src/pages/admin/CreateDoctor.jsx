import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { useNavigate } from 'react-router-dom';

const CreateDoctor = () => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!doctorData.firstName || !doctorData.lastName || !doctorData.email || !doctorData.licenseNumber) {
      alert('Please fill in all required fields');
      return;
    }

    alert(`Doctor account created successfully!\n\nName: Dr. ${doctorData.firstName} ${doctorData.lastName}\nEmail: ${doctorData.email}\nSpecialty: ${doctorData.specialty}\n\nLogin credentials have been sent to the doctor's email.`);
    
    // Reset form
    setDoctorData({
      firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
      licenseNumber: '', specialty: '', subSpecialty: '', yearsOfExperience: '', qualification: '', medicalSchool: '',
      department: '', employmentType: '', startDate: '',
      address: '', city: '', emergencyContact: '', emergencyPhone: '',
      username: '', temporaryPassword: '',
    });
  };

  const generateUsername = () => {
    if (doctorData.firstName && doctorData.lastName) {
      const username = `dr.${doctorData.firstName.toLowerCase()}.${doctorData.lastName.toLowerCase()}`;
      setDoctorData({ ...doctorData, username });
    }
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Create Doctor Account</h2>
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
              value={doctorData.firstName}
              onChange={(e) => setDoctorData({ ...doctorData, firstName: e.target.value })}
              placeholder="Enter first name"
              required
            />

            <Input
              label="Last Name *"
              type="text"
              value={doctorData.lastName}
              onChange={(e) => setDoctorData({ ...doctorData, lastName: e.target.value })}
              placeholder="Enter last name"
              required
            />

            <Input
              label="Email Address *"
              type="email"
              value={doctorData.email}
              onChange={(e) => setDoctorData({ ...doctorData, email: e.target.value })}
              placeholder="doctor@example.com"
              required
            />

            <Input
              label="Phone Number *"
              type="tel"
              value={doctorData.phone}
              onChange={(e) => setDoctorData({ ...doctorData, phone: e.target.value })}
              placeholder="+254 712 345 678"
              required
            />

            <Input
              label="Date of Birth"
              type="date"
              value={doctorData.dateOfBirth}
              onChange={(e) => setDoctorData({ ...doctorData, dateOfBirth: e.target.value })}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
              <select
                value={doctorData.gender}
                onChange={(e) => setDoctorData({ ...doctorData, gender: e.target.value })}
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
              value={doctorData.idNumber}
              onChange={(e) => setDoctorData({ ...doctorData, idNumber: e.target.value })}
              placeholder="ID or Passport Number"
              required
            />
          </div>
        </Card>

        {/* Professional Information */}
        <Card title="🩺 Professional Information" className="mb-6">
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
        <Card title="💼 Employment Details" className="mb-6">
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
        <Card title="📍 Contact Information" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
              <textarea
                value={doctorData.address}
                onChange={(e) => setDoctorData({ ...doctorData, address: e.target.value })}
                placeholder="Full address"
                rows="2"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <Input
              label="City"
              type="text"
              value={doctorData.city}
              onChange={(e) => setDoctorData({ ...doctorData, city: e.target.value })}
              placeholder="City"
            />

            <Input
              label="Emergency Contact Name"
              type="text"
              value={doctorData.emergencyContact}
              onChange={(e) => setDoctorData({ ...doctorData, emergencyContact: e.target.value })}
              placeholder="Emergency contact person"
            />

            <Input
              label="Emergency Contact Phone"
              type="tel"
              value={doctorData.emergencyPhone}
              onChange={(e) => setDoctorData({ ...doctorData, emergencyPhone: e.target.value })}
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
                value={doctorData.username}
                onChange={(e) => setDoctorData({ ...doctorData, username: e.target.value })}
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
                value={doctorData.temporaryPassword}
                onChange={(e) => setDoctorData({ ...doctorData, temporaryPassword: e.target.value })}
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
                <strong>⚠️ Note:</strong> The temporary password will be sent to the doctor's email. 
                They will be required to change it upon first login.
              </p>
            </div>
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
            ✓ Create Doctor Account
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateDoctor;