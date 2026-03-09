import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  User,
  IdCard,
  Activity,
  MapPin,
  AlertCircle,
  Shield,
  Key,
  CheckCircle2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { usePatientContext } from '../../contexts/PatientContext';

const CreatePatient = () => {
  const navigate = useNavigate();
  const { getDoctors } = useUserContext();
  const { addPatient } = usePatientContext();
  
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
    diabetesType: '',
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
    policyNumber: '',
    insuranceType: '',
    
    // Account Settings
    username: '',
    temporaryPassword: '',
  });

  const diabetesTypes = [
    { label: 'Type 1 Diabetes', value: 'Type 1' },
    { label: 'Type 2 Diabetes', value: 'Type 2' },
    { label: 'Gestational Diabetes', value: 'Gestational' },
    { label: 'Pre-Diabetes', value: 'Pre-diabetes' },
  ];

  const insuranceProviders = [
    'NHIF',
    'AAR Healthcare',
    'Jubilee Insurance',
    'CIC Insurance',
    'Madison Insurance',
    'Britam',
    'UAP Insurance',
    'Self-Pay',
  ];

  const doctors = getDoctors();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uhidMode, setUhidMode] = useState('generate'); // 'generate' or 'manual'
  const [generatedUHID, setGeneratedUHID] = useState('');
  const [manualUHID, setManualUHID] = useState('');

  const generateUHID = () => {
    // Generate UHID in format CDC### (e.g., CDC001, CDC002)
    const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
    const uhid = `CDC${randomNum}`;
    setGeneratedUHID(uhid);

    toast.success('UHID Generated!', {
      duration: 2000,
      icon: <Sparkles className="w-5 h-5" />,
      style: {
        background: '#DBEAFE',
        color: '#1E40AF',
        fontWeight: 'bold',
        padding: '16px',
      },
    });

    return uhid;
  };

  const getUHID = () => {
    if (uhidMode === 'manual') {
      return manualUHID.trim();
    }
    return generatedUHID;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation with toast notifications
    if (!patientData.firstName || !patientData.lastName || !patientData.email || !patientData.phone) {
      toast.error('Please fill in all required fields', {
        duration: 4000,
        icon: <AlertCircle className="w-5 h-5" />,
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }

    // Validate UHID
    const uhid = getUHID();
    if (!uhid) {
      toast.error(uhidMode === 'manual' ? 'Please enter a UHID' : 'Please generate a UHID first', {
        duration: 4000,
        icon: <AlertCircle className="w-5 h-5" />,
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
      return;
    }

    setIsSubmitting(true);

    // Build the patient data object for API
    const apiPatientData = {
      uhid, // Include UHID from frontend
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      email: patientData.email,
      phone: patientData.phone,
      dateOfBirth: patientData.dateOfBirth || null,
      gender: patientData.gender || null,
      idNumber: patientData.idNumber || null,
      diabetesType: patientData.diabetesType || null,
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
        provider: patientData.insuranceProvider,
        policyNumber: patientData.policyNumber,
        type: patientData.insuranceType,
      } : null,
    };

    try {
      const result = await addPatient(apiPatientData);

      if (result.success) {
        // Success toast with details
        toast.success('Patient Account Created Successfully!', {
          duration: 4000,
          icon: <CheckCircle2 className="w-5 h-5" />,
          style: {
            background: '#D1FAE5',
            color: '#065F46',
            fontWeight: 'bold',
            padding: '16px',
          },
        });

        // Info toast with UHID and login credentials
        toast(
          `UHID: ${result.patient.uhid}\nEmail: ${patientData.email}\nTemp Password: ${result.patient.tempPassword}`,
          {
            duration: 8000,
            icon: <Sparkles className="w-5 h-5" />,
            style: {
              background: '#DBEAFE',
              color: '#1E40AF',
              fontWeight: 'bold',
              padding: '16px',
              whiteSpace: 'pre-line',
            },
          }
        );

        // Reset form
        setPatientData({
          firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
          diabetesType: '', diagnosisDate: '', referredBy: '', primaryDoctor: '',
          address: '', city: '',
          emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
          insuranceProvider: '', policyNumber: '', insuranceType: '',
          username: '', temporaryPassword: '',
        });
        setGeneratedUHID('');
        setManualUHID('');
        setUhidMode('generate');

        // Navigate after delay
        setTimeout(() => navigate('/staff/dashboard'), 2000);
      } else {
        toast.error(result.message || 'Failed to create patient', {
          duration: 4000,
          icon: <AlertCircle className="w-5 h-5" />,
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            fontWeight: 'bold',
            padding: '16px',
          },
        });
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred', {
        duration: 4000,
        icon: <AlertCircle className="w-5 h-5" />,
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          fontWeight: 'bold',
          padding: '16px',
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // TODO: Uncomment when username field is re-enabled
  // const generateUsername = () => { ... };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPatientData({ ...patientData, temporaryPassword: password });
    
    toast.success('Secure password generated!', {
      duration: 2000,
      style: {
        background: '#D1FAE5',
        color: '#065F46',
        padding: '12px',
      },
    });
  };

  return (
    <div>
      <Toaster position="top-right" />
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">Create Patient Account</h2>
          <p className="text-gray-600 mt-1">Register new patient in the system</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/staff/dashboard')}>
          {/* <ArrowLeft className="w-4 h-4 mr-2" /> */}
          Back to Dashboard
        </Button>
      </div>

      {/* UHID Section */}
      <div className="mb-6 p-4 lg:p-6 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <IdCard className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">Patient UHID (Universal Health ID)</h3>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="uhidMode"
              value="generate"
              checked={uhidMode === 'generate'}
              onChange={() => setUhidMode('generate')}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-medium text-gray-700">Generate New UHID</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="uhidMode"
              value="manual"
              checked={uhidMode === 'manual'}
              onChange={() => setUhidMode('manual')}
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm font-medium text-gray-700">Enter Existing UHID</span>
          </label>
        </div>

        {/* Generate Mode */}
        {uhidMode === 'generate' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {generatedUHID ? (
              <>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Generated UHID:</p>
                  <p className="text-2xl font-bold text-primary">{generatedUHID}</p>
                </div>
                <Button type="button" onClick={generateUHID} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </Button>
              </>
            ) : (
              <Button type="button" onClick={generateUHID} className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generate UHID
              </Button>
            )}
          </div>
        )}

        {/* Manual Entry Mode */}
        {uhidMode === 'manual' && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Enter the UHID from the patient's physical file:</p>
            <input
              type="text"
              value={manualUHID}
              onChange={(e) => setManualUHID(e.target.value.toUpperCase())}
              placeholder="e.g., OLD-12345 or existing ID"
              className="w-full max-w-xs px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary text-lg font-semibold"
            />
            <p className="text-xs text-gray-500 mt-1">For patients with existing physical files</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <Card title={
          <span className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </span>
        } className="mb-6">
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
              label="Email Address *"
              type="email"
              value={patientData.email}
              onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
              placeholder="patient@example.com"
              required
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

            <Input
              label="ID/Passport Number *"
              type="text"
              value={patientData.idNumber}
              onChange={(e) => setPatientData({ ...patientData, idNumber: e.target.value })}
              placeholder="ID or Passport Number"
              required
            />
          </div>
        </Card>

        {/* Medical Information */}
        <Card title={
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Medical Information
          </span>
        } className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Diagnosis</label>
              <select
                value={patientData.diabetesType}
                onChange={(e) => setPatientData({ ...patientData, diabetesType: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Select diabetes type</option>
                {diabetesTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
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
        <Card title={
          <span className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Contact Information
          </span>
        } className="mb-6">
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
        <Card title={
          <span className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Emergency Contact
          </span>
        } className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Contact Name *"
              type="text"
              value={patientData.emergencyContactName}
              onChange={(e) => setPatientData({ ...patientData, emergencyContactName: e.target.value })}
              placeholder="Full name"
              required
            />

            <Input
              label="Relationship *"
              type="text"
              value={patientData.emergencyContactRelationship}
              onChange={(e) => setPatientData({ ...patientData, emergencyContactRelationship: e.target.value })}
              placeholder="e.g., Spouse, Parent, Sibling"
              required
            />

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
        <Card title={
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Insurance Information
          </span>
        } className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance Provider</label>
              <select
                value={patientData.insuranceProvider}
                onChange={(e) => setPatientData({ ...patientData, insuranceProvider: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="">Select provider</option>
                {insuranceProviders.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
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
                <option value="Corporate">Corporate</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card title={
          <span className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Account Settings
          </span>
        } className="mb-6">
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
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
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
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                Generate secure password
              </button>
            </div>

            <div className="md:col-span-2 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> The UHID, username, and temporary password will be sent to the patient via email and SMS. 
                  Patient must change password on first login.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Patient Portal Access */}
        <Card title="Patient Portal Access" className="mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-3 font-semibold">
              Patient will have access to:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Log blood sugar readings (7 times daily)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>View blood sugar trends and statistics</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>View prescriptions from doctors</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Book, reschedule, and cancel appointments</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>View and download lab results</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
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
            onClick={() => navigate('/staff/dashboard')}
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

export default CreatePatient;