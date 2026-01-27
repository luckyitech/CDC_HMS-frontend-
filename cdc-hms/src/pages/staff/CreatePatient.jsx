import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
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
    'Type 1 Diabetes',
    'Type 2 Diabetes',
    'Gestational Diabetes',
    'Pre-Diabetes',
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

  const doctors = getDoctors().map(d => d.name);

  const [generatedUHID, setGeneratedUHID] = useState('');

  const generateUHID = () => {
    // Generate UHID in format CDC### (e.g., CDC001, CDC002)
    const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999
    const uhid = `CDC${randomNum}`;
    setGeneratedUHID(uhid);
    
    toast.success('UHID Generated Successfully!', {
      duration: 3000,
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

  const handleSubmit = (e) => {
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

    if (!generatedUHID) {
      toast.error('Please generate UHID first', {
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

    const uhid = generatedUHID || generateUHID();
    
    // Create patient using context
    const newPatient = {
      uhid,
      name: `${patientData.firstName} ${patientData.lastName}`,
      email: patientData.email,
      phone: patientData.phone,
      dateOfBirth: patientData.dateOfBirth,
      gender: patientData.gender,
      idNumber: patientData.idNumber,
      age: new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear(),
      diabetesType: patientData.diabetesType,
      diagnosisDate: patientData.diagnosisDate,
      referredBy: patientData.referredBy,
      primaryDoctor: patientData.primaryDoctor,
      address: `${patientData.address}, ${patientData.city}`,
      emergencyContact: {
        name: patientData.emergencyContactName,
        relationship: patientData.emergencyContactRelationship,
        phone: patientData.emergencyContactPhone
      },
      insurance: {
        provider: patientData.insuranceProvider,
        policyNumber: patientData.policyNumber,
        type: patientData.insuranceType
      },
      hba1c: 'Not yet tested',
      riskLevel: 'Medium',
      lastVisit: new Date().toISOString().split('T')[0],
      nextVisit: '',
      vitals: {},
      medications: [],
      allergies: 'None reported',
      comorbidities: []
    };
    
    addPatient(newPatient);
    
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

    // Info toast with credentials
    toast(
      `Credentials sent to ${patientData.email}`,
      {
        duration: 5000,
        icon: <Mail className="w-5 h-5" />,
        style: {
          background: '#DBEAFE',
          color: '#1E40AF',
          fontWeight: 'bold',
          padding: '16px',
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
    
    // Navigate after delay
    setTimeout(() => navigate('/staff/dashboard'), 2000);
  };

  const generateUsername = () => {
    if (patientData.firstName && patientData.lastName) {
      const username = `${patientData.firstName.toLowerCase()}.${patientData.lastName.toLowerCase()}`;
      setPatientData({ ...patientData, username });
      
      toast.success('Username generated!', {
        duration: 2000,
        style: {
          background: '#D1FAE5',
          color: '#065F46',
          padding: '12px',
        },
      });
    } else {
      toast.error('Please enter first and last name first', {
        duration: 3000,
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          padding: '12px',
        },
      });
    }
  };

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

      {/* UHID Display */}
      {generatedUHID && (
        <div className="mb-6 p-4 lg:p-6 bg-blue-50 border-2 border-blue-500 rounded-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                <IdCard className="w-4 h-4" />
                Generated UHID (Universal Health ID)
              </p>
              <p className="text-3xl font-bold text-primary mt-2">{generatedUHID}</p>
            </div>
            <button
              type="button"
              onClick={generateUHID}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Generate New
            </button>
          </div>
        </div>
      )}

      {!generatedUHID && (
        <div className="mb-6">
          <Button onClick={generateUHID} className="w-full sm:w-auto">
            {/* <Sparkles className="w-4 h-4 mr-2" /> */}
            Generate UHID First
          </Button>
        </div>
      )}

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
                required
              >
                <option value="">Select diabetes type</option>
                {diabetesTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Primary Doctor *</label>
              <select
                value={patientData.primaryDoctor}
                onChange={(e) => setPatientData({ ...patientData, primaryDoctor: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                required
              >
                <option value="">Select primary doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor} value={doctor}>{doctor}</option>
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
            disabled={!generatedUHID}
          >
            {/* <CheckCircle2 className="w-4 h-4 mr-2" /> */}
            Create Patient Account
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePatient;