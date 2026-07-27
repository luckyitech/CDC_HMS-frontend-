import { useState } from 'react';
import { AlertTriangle, CheckCircle2, User, Activity, MapPin, AlertCircle, Shield, Key, IdCard, Smartphone } from 'lucide-react';
import CardTitle from './CardTitle';
import useIdNumberCheck from '../../hooks/useIdNumberCheck';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import { useNavigate } from 'react-router-dom';
import { notify } from '../../utils/notify';
import { usePatientContext } from '../../contexts/PatientContext';
import { useUserContext } from '../../contexts/UserContext';

// Patient registration form shared by the admin (Create Users) and staff
// (Register Patient) portals. Portal-specific behavior comes in via props:
//   embedded  — hide the page header (when hosted inside Create Users)
//   backPath  — where the Back/Cancel buttons navigate
//   onCreated — called with the created patient after a successful submit
const PatientForm = ({ embedded = false, backPath = '/admin/dashboard', onCreated }) => {
  const navigate = useNavigate();
  const { addPatient } = usePatientContext();
  const { getDoctors } = useUserContext();
  
  const [patientData, setPatientData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    idNumber: '',
    
    // Medical Information
    diagnosis: '',
    diagnosisDate: '',
    referredBy: '',
    primaryDoctor: '',
    
    // Contact Information
    address: '',
    city: '',
    
    // Emergency Contact
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    
    // Insurance Information
    insuranceProvider: '',
    customInsuranceProvider: '',
    policyNumber: '',
    insuranceType: '',
    
    // Account Settings
    username: '',
    temporaryPassword: '',
  });

  const insuranceProviders = [
    'NHIF',
    'AAR Healthcare',
    'Jubilee Insurance',
    'Cigna',
    'APA Insurance',
    'Henner',
    'Allianz',
    'Bupa',
    'Now Health',
    'WHO',
    'CIC Insurance',
    'Madison Insurance',
    'Britam',
    'UAP Insurance',
    'Self-Pay',
    'Other',
  ];

  const doctors = getDoctors();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [existingUHID, setExistingUHID] = useState('');

  const { status: idStatus, existing: idDuplicate } = useIdNumberCheck(patientData.idNumber);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!patientData.firstName || !patientData.lastName) {
      notify('error', 'Please fill in all required fields');
      return;
    }

    // Phone and emergency contact are mandatory
    if (!patientData.phone.trim()) {
      notify('error', 'Phone number is required');
      return;
    }
    if (!patientData.emergencyContactName.trim() ||
        !patientData.emergencyContactRelationship.trim() ||
        !patientData.emergencyContactPhone.trim()) {
      notify('error', 'Emergency contact name, relationship, and phone are all required');
      return;
    }

    // Validate UHID only if existing patient mode
    if (isExistingPatient && !existingUHID.trim()) {
      notify('error', 'Please enter the UHID from the patient\'s physical file');
      return;
    }

    setIsSubmitting(true);

    // Build the patient data object for API
    const apiPatientData = {
      // Only send uhid if existing patient — backend auto-generates for new patients
      ...(isExistingPatient && existingUHID.trim() ? { uhid: existingUHID.trim() } : {}),
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      email: patientData.email || null,
      phone: patientData.phone || null,
      dateOfBirth: patientData.dateOfBirth || null,
      gender: patientData.gender || null,
      idNumber: patientData.idNumber || null,
      diagnosis: patientData.diagnosis || null,
      diagnosisDate: patientData.diagnosisDate || null,
      referredBy: patientData.referredBy || null,
      primaryDoctorId: patientData.primaryDoctor ? parseInt(patientData.primaryDoctor) : null,
      password: patientData.temporaryPassword || null,
      address: patientData.address ? `${patientData.address}${patientData.city ? ', ' + patientData.city : ''}` : null,
      // Structure emergency contact as JSON
      emergencyContact: patientData.emergencyContactName ? {
        name: patientData.emergencyContactName,
        relationship: patientData.emergencyContactRelationship,
        phone: patientData.emergencyContactPhone,
      } : null,
      // Structure insurance as JSON
      insurance: patientData.insuranceProvider ? {
        provider: patientData.insuranceProvider === 'Other'
          ? patientData.customInsuranceProvider || 'Other'
          : patientData.insuranceProvider,
        policyNumber: patientData.policyNumber,
        type: patientData.insuranceType,
      } : null,
    };

    try {
      const result = await addPatient(apiPatientData);

      if (result.success) {
        notify('success', 'Patient Account Created Successfully!');
        notify('info', `UHID: ${result.patient.uhid}\nName: ${patientData.firstName} ${patientData.lastName}\nEmail: ${patientData.email}\nTemp Password: ${result.patient.tempPassword}`, { duration: 8000 });

        // Reset form
        setPatientData({
          firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
          diagnosis: '', diagnosisDate: '', referredBy: '', primaryDoctor: '',
          address: '', city: '',
          emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
          insuranceProvider: '', customInsuranceProvider: '', policyNumber: '', insuranceType: '',
          username: '', temporaryPassword: '',
        });
        setIsExistingPatient(false);
        setExistingUHID('');
        onCreated?.(result.patient);
      } else {
        notify('error', result.message || 'Failed to create patient');
      }
    } catch (error) {
      notify('error', error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // TODO: Uncomment when username field is re-enabled
  // const generateUsername = () => {
  //   if (patientData.firstName && patientData.lastName) {
  //     const username = `${patientData.firstName.toLowerCase()}.${patientData.lastName.toLowerCase()}`;
  //     setPatientData({ ...patientData, username });
  //   }
  // };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPatientData({ ...patientData, temporaryPassword: password });
    notify('success', 'Secure password generated!', { duration: 2000 });
  };

  return (
    <div>
      {/* Page header — hidden when hosted inside Create Users */}
      {!embedded && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Create Patient Account</h2>
            <p className="text-gray-600 mt-1">Register new patient in the system</p>
          </div>
          <Button variant="outline" onClick={() => navigate(backPath)}>
            ← Back to Dashboard
          </Button>
        </div>
      )}

      {/* UHID Section */}
      <div className="mb-6 p-4 lg:p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <IdCard className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">Patient UHID (Universal Health ID)</h3>
        </div>

        {/* Patient Type Toggle */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="patientType"
              checked={!isExistingPatient}
              onChange={() => setIsExistingPatient(false)}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-medium text-gray-700">New Patient</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="patientType"
              checked={isExistingPatient}
              onChange={() => setIsExistingPatient(true)}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-medium text-gray-700">Existing Patient (has physical file)</span>
          </label>
        </div>

        {/* New Patient — auto-assign */}
        {!isExistingPatient && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 flex-shrink-0" />UHID will be automatically assigned by the system</p>
          </div>
        )}

        {/* Existing Patient — manual UHID entry */}
        {isExistingPatient && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Enter the UHID from the patient's physical file:</p>
            <input
              type="text"
              value={existingUHID}
              onChange={(e) => setExistingUHID(e.target.value.toUpperCase())}
              placeholder="e.g., CDC001"
              className="w-full max-w-xs px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary text-lg font-semibold"
            />
            <p className="text-xs text-gray-500 mt-1">For patients who already have a physical file with a UHID</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <Card title={<CardTitle icon={User}>Personal Information</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name *"
              type="text"
              value={patientData.firstName}
              onChange={(e) => setPatientData({ ...patientData, firstName: e.target.value })}
              placeholder="Enter first name"
              required
            />

            <Input
              label="Last Name *"
              type="text"
              value={patientData.lastName}
              onChange={(e) => setPatientData({ ...patientData, lastName: e.target.value })}
              placeholder="Enter last name"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={patientData.email}
              onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
              placeholder="patient@example.com"
            />

            <Input
              label="Phone Number *"
              type="tel"
              value={patientData.phone}
              onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
              placeholder="+254 712 345 678"
              required
            />

            <Input
              label="Date of Birth *"
              type="date"
              value={patientData.dateOfBirth}
              onChange={(e) => setPatientData({ ...patientData, dateOfBirth: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
              <select
                value={patientData.gender}
                onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <Input
                label="ID/Passport Number *"
                type="text"
                value={patientData.idNumber}
                onChange={(e) => setPatientData({ ...patientData, idNumber: e.target.value })}
                placeholder="ID or Passport Number"
                required
              />
              {idStatus === 'checking' && (
                <p className="text-xs text-gray-400 mt-1">Checking...</p>
              )}
              {idStatus === 'clear' && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ID number is available
                </p>
              )}
              {idStatus === 'duplicate' && idDuplicate && (
                <div className="mt-1 border border-red-100 bg-red-100 rounded p-2">
                  <p className="text-xs text-gray-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-500" />
                    Already in use — <strong>{idDuplicate.name}</strong> ({idDuplicate.uhid})
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5">Search for this patient instead of registering again.</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Medical Information */}
        <Card title={<CardTitle icon={Activity}>Medical Information</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis</label>
              <input
                type="text"
                value={patientData.diagnosis}
                onChange={(e) => setPatientData({ ...patientData, diagnosis: e.target.value })}
                placeholder="e.g. Type 2 Diabetes, Hypertension..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <Input
              label="Diagnosis Date"
              type="date"
              value={patientData.diagnosisDate}
              onChange={(e) => setPatientData({ ...patientData, diagnosisDate: e.target.value })}
            />

            <Input
              label="Referred By (Doctor/Hospital)"
              type="text"
              value={patientData.referredBy}
              onChange={(e) => setPatientData({ ...patientData, referredBy: e.target.value })}
              placeholder="Referring doctor or hospital"
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Primary Doctor</label>
              <select
                value={patientData.primaryDoctor}
                onChange={(e) => setPatientData({ ...patientData, primaryDoctor: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Select primary doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card title={<CardTitle icon={MapPin}>Contact Information</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
              <textarea
                value={patientData.address}
                onChange={(e) => setPatientData({ ...patientData, address: e.target.value })}
                placeholder="Full address"
                rows="2"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <Input
              label="City"
              type="text"
              value={patientData.city}
              onChange={(e) => setPatientData({ ...patientData, city: e.target.value })}
              placeholder="City"
            />
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card title={<CardTitle icon={AlertCircle}>Emergency Contact</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Contact Name *"
              type="text"
              value={patientData.emergencyContactName}
              onChange={(e) => setPatientData({ ...patientData, emergencyContactName: e.target.value })}
              placeholder="Full name"
              required
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship *</label>
              <select
                value={patientData.emergencyContactRelationship}
                onChange={(e) => setPatientData({ ...patientData, emergencyContactRelationship: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Child">Child</option>
                <option value="Sibling">Sibling</option>
                <option value="Guardian">Guardian</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <Input
              label="Phone Number *"
              type="tel"
              value={patientData.emergencyContactPhone}
              onChange={(e) => setPatientData({ ...patientData, emergencyContactPhone: e.target.value })}
              placeholder="+254 712 345 678"
              required
            />
          </div>
        </Card>

        {/* Insurance Information */}
        <Card title={<CardTitle icon={Shield}>Insurance Information</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance Provider</label>
              <select
                value={patientData.insuranceProvider}
                onChange={(e) => setPatientData({ ...patientData, insuranceProvider: e.target.value, customInsuranceProvider: '' })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Select provider</option>
                {insuranceProviders.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
              {patientData.insuranceProvider === 'Other' && (
                <input
                  type="text"
                  value={patientData.customInsuranceProvider}
                  onChange={(e) => setPatientData({ ...patientData, customInsuranceProvider: e.target.value })}
                  placeholder="Enter insurance provider name"
                  className="mt-2 w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-primary"
                />
              )}
            </div>

            <Input
              label="Policy Number"
              type="text"
              value={patientData.policyNumber}
              onChange={(e) => setPatientData({ ...patientData, policyNumber: e.target.value })}
              placeholder="Insurance policy number"
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Type</label>
              <select
                value={patientData.insuranceType}
                onChange={(e) => setPatientData({ ...patientData, insuranceType: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Select type</option>
                <option value="Insurance">Insurance</option>
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card title={<CardTitle icon={Key}>Account Settings</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TODO: Username field — backend does not support username yet (auth is by email).
                Uncomment and wire up once username support is added to the User model.
            <div>
              <Input
                label="Username *"
                type="text"
                value={patientData.username}
                onChange={(e) => setPatientData({ ...patientData, username: e.target.value })}
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
            */}

            <div>
              <Input
                label="Temporary Password *"
                type="text"
                value={patientData.temporaryPassword}
                onChange={(e) => setPatientData({ ...patientData, temporaryPassword: e.target.value })}
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
                <AlertTriangle className="w-4 h-4 inline mr-1 -mt-0.5" /><strong>Note:</strong> If an email is provided, the UHID and temporary password will be sent to the patient automatically.
                Patients without an email address will not have portal access and will not receive email notifications.
              </p>
            </div>
          </div>
        </Card>

        {/* Patient Portal Access */}
        <Card title={<CardTitle icon={Smartphone}>Patient Portal Access</CardTitle>} className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3">
              <strong>ℹ️ Patient will have access to:</strong>
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Log blood sugar readings (7 times daily)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>View blood sugar trends and statistics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>View prescriptions from doctors</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Book, reschedule, and cancel appointments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>View and download lab results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Upload external lab results and medical documents</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(backPath)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Patient Account'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;