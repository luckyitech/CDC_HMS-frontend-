import { useState } from 'react';
import { X, User, Activity, MapPin, AlertCircle, Shield, Key, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserContext } from '../../contexts/UserContext';
import patientService from '../../services/patientService';

const INSURANCE_PROVIDERS = [
  'NHIF', 'AAR Healthcare', 'Jubilee Insurance', 'Cigna', 'APA Insurance',
  'Henner', 'Allianz', 'Bupa', 'Now Health', 'WHO', 'CIC Insurance',
  'Madison Insurance', 'Britam', 'UAP Insurance', 'Self-Pay', 'Other',
];

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary';

/**
 * Modal to complete a quick-registered patient's profile when they walk in.
 * Pre-fills existing name and phone; collects all remaining details.
 *
 * Props:
 *   patient       — the existing partial patient object
 *   onCompleted   — called with the updated patient after success
 *   onClose       — close the modal
 */
const CompleteRegistrationModal = ({ patient, onCompleted, onClose }) => {
  const { getDoctors } = useUserContext();
  const doctors = getDoctors();

  const [form, setForm] = useState({
    firstName:                    patient.name?.split(' ')[0] || '',
    lastName:                     patient.name?.split(' ').slice(1).join(' ') || '',
    email:                        '',
    phone:                        patient.phone || '',
    dateOfBirth:                  '',
    gender:                       '',
    idNumber:                     '',
    diagnosis:                    '',
    diagnosisDate:                '',
    referredBy:                   '',
    primaryDoctor:                '',
    address:                      '',
    city:                         '',
    emergencyContactName:         '',
    emergencyContactRelationship: '',
    emergencyContactPhone:        '',
    insuranceProvider:            '',
    customInsuranceProvider:      '',
    policyNumber:                 '',
    insuranceType:                '',
    temporaryPassword:            '',
  });

  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    const pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    set('temporaryPassword', pwd);
    toast.success('Password generated');
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return toast.error('First and last name are required');
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName:     form.firstName.trim(),
        lastName:      form.lastName.trim(),
        email:         form.email.trim()       || null,
        phone:         form.phone.trim()       || null,
        dateOfBirth:   form.dateOfBirth        || null,
        gender:        form.gender             || null,
        idNumber:      form.idNumber.trim()    || null,
        diagnosis:     form.diagnosis          || null,
        diagnosisDate: form.diagnosisDate      || null,
        referredBy:    form.referredBy.trim()  || null,
        primaryDoctorId: form.primaryDoctor ? parseInt(form.primaryDoctor) : null,
        address: form.address.trim()
          ? `${form.address.trim()}${form.city.trim() ? ', ' + form.city.trim() : ''}`
          : null,
        emergencyContact: form.emergencyContactName.trim() ? {
          name:         form.emergencyContactName.trim(),
          relationship: form.emergencyContactRelationship.trim(),
          phone:        form.emergencyContactPhone.trim(),
        } : null,
        insurance: form.insuranceProvider ? {
          provider:     form.insuranceProvider === 'Other'
                          ? (form.customInsuranceProvider.trim() || 'Other')
                          : form.insuranceProvider,
          policyNumber: form.policyNumber.trim() || null,
          type:         form.insuranceType || null,
        } : null,
        password: form.temporaryPassword.trim() || null,
      };

      const res = await patientService.completeRegistration(patient.uhid, payload);
      const updated = res.data;

      toast.success(`Registration complete — ${updated.name} (${updated.uhid})`);

      if (updated.tempPassword) {
        toast(
          `Portal credentials\nEmail: ${payload.email}\nTemp Password: ${updated.tempPassword}`,
          {
            duration: 10000,
            icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
            style: { background: '#DBEAFE', color: '#1E40AF', whiteSpace: 'pre-line', fontWeight: '600' },
          }
        );
      }

      onCompleted(updated);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-6">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Complete Registration</h2>
            <p className="text-sm text-gray-500">{patient.name} · {patient.uhid}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Personal Information */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-700">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First Name" required>
                <input className={inputCls} value={form.firstName} onChange={e => set('firstName', e.target.value)} />
              </Field>
              <Field label="Last Name" required>
                <input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} />
              </Field>
              <Field label="Email Address">
                <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="patient@example.com" />
              </Field>
              <Field label="Phone Number">
                <input className={inputCls} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 712 345 678" />
              </Field>
              <Field label="Date of Birth">
                <input className={inputCls} type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </Field>
              <Field label="Gender">
                <select className={inputCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="ID / Passport Number">
                <input className={inputCls} value={form.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="National ID or passport" />
              </Field>
            </div>
          </section>

          {/* Medical Information */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-700">Medical Information</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Diagnosis">
                <select className={inputCls} value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)}>
                  <option value="">Select diagnosis</option>
                  <option value="Type 1">Type 1 Diabetes</option>
                  <option value="Type 2">Type 2 Diabetes</option>
                  <option value="Gestational">Gestational Diabetes</option>
                  <option value="Pre-diabetes">Pre-Diabetes</option>
                </select>
              </Field>
              <Field label="Diagnosis Date">
                <input className={inputCls} type="date" value={form.diagnosisDate} onChange={e => set('diagnosisDate', e.target.value)} />
              </Field>
              <Field label="Referred By">
                <input className={inputCls} value={form.referredBy} onChange={e => set('referredBy', e.target.value)} placeholder="Referring doctor or facility" />
              </Field>
              <Field label="Primary Doctor">
                <select className={inputCls} value={form.primaryDoctor} onChange={e => set('primaryDoctor', e.target.value)}>
                  <option value="">Select doctor</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* Address */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-700">Address</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Street Address">
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main Street" />
              </Field>
              <Field label="City">
                <input className={inputCls} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Nairobi" />
              </Field>
            </div>
          </section>

          {/* Emergency Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-700">Emergency Contact</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Full Name">
                <input className={inputCls} value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} placeholder="Contact name" />
              </Field>
              <Field label="Relationship">
                <input className={inputCls} value={form.emergencyContactRelationship} onChange={e => set('emergencyContactRelationship', e.target.value)} placeholder="e.g. Spouse" />
              </Field>
              <Field label="Phone">
                <input className={inputCls} type="tel" value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} placeholder="Phone number" />
              </Field>
            </div>
          </section>

          {/* Insurance */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-700">Insurance</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Provider">
                <select className={inputCls} value={form.insuranceProvider} onChange={e => set('insuranceProvider', e.target.value)}>
                  <option value="">Select provider</option>
                  {INSURANCE_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              {form.insuranceProvider === 'Other' && (
                <Field label="Provider Name">
                  <input className={inputCls} value={form.customInsuranceProvider} onChange={e => set('customInsuranceProvider', e.target.value)} placeholder="Provider name" />
                </Field>
              )}
              <Field label="Policy Number">
                <input className={inputCls} value={form.policyNumber} onChange={e => set('policyNumber', e.target.value)} placeholder="Policy number" />
              </Field>
              <Field label="Insurance Type">
                <input className={inputCls} value={form.insuranceType} onChange={e => set('insuranceType', e.target.value)} placeholder="e.g. Inpatient" />
              </Field>
            </div>
          </section>

          {/* Portal Account */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-gray-700">Portal Account</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              A portal account is created only if an email is provided above. Leave password blank to auto-generate one.
            </p>
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                type="text"
                value={form.temporaryPassword}
                onChange={e => set('temporaryPassword', e.target.value)}
                placeholder="Temporary password (auto-generated if blank)"
              />
              <button
                type="button"
                onClick={generatePassword}
                className="px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 text-gray-600 whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><CheckCircle2 className="w-4 h-4" /> Complete Registration</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteRegistrationModal;
