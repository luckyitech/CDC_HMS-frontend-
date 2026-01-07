import { useState } from 'react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { useNavigate } from 'react-router-dom';

const CreateLabTech = () => {
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

  const shifts = [
    'Morning (7AM - 3PM)',
    'Afternoon (3PM - 11PM)',
    'Night (11PM - 7AM)',
    'Rotating',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!labTechData.firstName || !labTechData.lastName || !labTechData.email || !labTechData.certificationNumber) {
      alert('Please fill in all required fields');
      return;
    }

    alert(`Lab Technician account created successfully!\n\nName: ${labTechData.firstName} ${labTechData.lastName}\nEmail: ${labTechData.email}\nSpecialization: ${labTechData.specialization}\n\nLogin credentials have been sent to the lab technician's email.`);
    
    // Reset form
    setLabTechData({
      firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
      certificationNumber: '', specialization: '', qualification: '', institution: '', yearsOfExperience: '',
      employmentType: '', startDate: '', shift: '',
      address: '', city: '', emergencyContact: '', emergencyPhone: '',
      username: '', temporaryPassword: '',
    });
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Create Lab Technician Account</h2>
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
              value={labTechData.firstName}
              onChange={(e) => setLabTechData({ ...labTechData, firstName: e.target.value })}
              placeholder="Enter first name"
              required
            />

            <Input
              label="Last Name *"
              type="text"
              value={labTechData.lastName}
              onChange={(e) => setLabTechData({ ...labTechData, lastName: e.target.value })}
              placeholder="Enter last name"
              required
            />

            <Input
              label="Email Address *"
              type="email"
              value={labTechData.email}
              onChange={(e) => setLabTechData({ ...labTechData, email: e.target.value })}
              placeholder="labtech@example.com"
              required
            />

            <Input
              label="Phone Number *"
              type="tel"
              value={labTechData.phone}
              onChange={(e) => setLabTechData({ ...labTechData, phone: e.target.value })}
              placeholder="+254 712 345 678"
              required
            />

            <Input
              label="Date of Birth"
              type="date"
              value={labTechData.dateOfBirth}
              onChange={(e) => setLabTechData({ ...labTechData, dateOfBirth: e.target.value })}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
              <select
                value={labTechData.gender}
                onChange={(e) => setLabTechData({ ...labTechData, gender: e.target.value })}
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
              value={labTechData.idNumber}
              onChange={(e) => setLabTechData({ ...labTechData, idNumber: e.target.value })}
              placeholder="ID or Passport Number"
              required
            />
          </div>
        </Card>

        {/* Professional Information */}
        <Card title="🔬 Professional Information" className="mb-6">
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
        <Card title="💼 Employment Details" className="mb-6">
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
        <Card title="📍 Contact Information" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
              <textarea
                value={labTechData.address}
                onChange={(e) => setLabTechData({ ...labTechData, address: e.target.value })}
                placeholder="Full address"
                rows="2"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <Input
              label="City"
              type="text"
              value={labTechData.city}
              onChange={(e) => setLabTechData({ ...labTechData, city: e.target.value })}
              placeholder="City"
            />

            <Input
              label="Emergency Contact Name"
              type="text"
              value={labTechData.emergencyContact}
              onChange={(e) => setLabTechData({ ...labTechData, emergencyContact: e.target.value })}
              placeholder="Emergency contact person"
            />

            <Input
              label="Emergency Contact Phone"
              type="tel"
              value={labTechData.emergencyPhone}
              onChange={(e) => setLabTechData({ ...labTechData, emergencyPhone: e.target.value })}
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
                value={labTechData.username}
                onChange={(e) => setLabTechData({ ...labTechData, username: e.target.value })}
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
                value={labTechData.temporaryPassword}
                onChange={(e) => setLabTechData({ ...labTechData, temporaryPassword: e.target.value })}
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
                <strong>⚠️ Note:</strong> The temporary password will be sent to the lab technician's email. 
                They will be required to change it upon first login.
              </p>
            </div>
          </div>
        </Card>

        {/* Permissions Note */}
        <Card title="🔒 Lab Portal Access" className="mb-6">
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
          <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
            ✓ Create Lab Technician Account
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateLabTech;