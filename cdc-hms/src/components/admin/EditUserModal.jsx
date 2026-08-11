import { useState, useEffect } from 'react';
import { X, Save, Loader, History, ClipboardEdit } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const INSURANCE_PROVIDERS = [
  'NHIF', 'AAR Healthcare', 'Jubilee Insurance', 'Cigna', 'APA Insurance',
  'Henner', 'Allianz', 'Bupa', 'Now Health', 'WHO', 'CIC Insurance',
  'Madison Insurance', 'Britam', 'UAP Insurance', 'Self-Pay', 'Other',
];

// ── Field config per role ────────────────────────────────────────────────────
// To add a new field: add one entry here. No other changes needed.
const COMMON_FIELDS = [
  { key: 'firstName',  label: 'First Name', type: 'text' },
  { key: 'lastName',   label: 'Last Name',  type: 'text' },
  { key: 'email',      label: 'Email',      type: 'email' },
  { key: 'phone',      label: 'Phone',      type: 'text' },
];

const SHIFTS           = ['Morning', 'Afternoon', 'Night', 'Rotating'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Consultant', 'Locum', 'Temporary'];

// Identity and contact fields shared by every staff cadre, since they all share
// one StaffProfile table. Without these the profile page displays date of
// birth, national ID, address and emergency contact with no way to enter them.
const STAFF_IDENTITY_FIELDS = [
  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
  { key: 'gender',      label: 'Gender',        type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'idNumber',    label: 'National ID',   type: 'text' },
  { key: 'address',     label: 'Address',       type: 'text' },
  { key: 'city',        label: 'City',          type: 'text' },
];

// Emergency contact is one JSON column, so it is split into three inputs here
// and reassembled on save — the same treatment the patient form already gives it.
const STAFF_EMERGENCY_FIELDS = [
  { key: 'emergencyContactName',         label: 'Emergency Contact Name',  type: 'text' },
  { key: 'emergencyContactRelationship', label: 'Relationship',            type: 'text' },
  { key: 'emergencyContactPhone',        label: 'Emergency Contact Phone', type: 'text' },
];

const STAFF_EMPLOYMENT_FIELDS = [
  { key: 'employmentType', label: 'Employment Type', type: 'select', options: EMPLOYMENT_TYPES },
  { key: 'startDate',      label: 'Start Date',      type: 'date' },
  { key: 'ward',           label: 'Ward / Unit',     type: 'text' },
];

// Licence details, for the cadres that hold one. Front desk staff get none.
const LICENCE_FIELDS = [
  { key: 'licenseBody',   label: 'Issuing Body',   type: 'text' },
  { key: 'licenseExpiry', label: 'Licence Expiry', type: 'date' },
];

const ROLE_FIELDS = {
  patient: [
    { key: 'dateOfBirth',   label: 'Date of Birth',   type: 'date' },
    { key: 'gender',        label: 'Gender',           type: 'select', options: ['Male', 'Female', 'Other'] },
    { key: 'address',       label: 'Address',          type: 'text' },
    { key: 'diagnosis',     label: 'Diagnosis',        type: 'text' },
    { key: 'diagnosisDate', label: 'Diagnosis Date',   type: 'date' },
  ],
  doctor: [
    { key: 'specialty',       label: 'Specialty',          type: 'text' },
    { key: 'subSpecialty',    label: 'Sub-specialty',      type: 'text' },
    { key: 'department',      label: 'Department',         type: 'text' },
    { key: 'licenseNumber',   label: 'License Number',     type: 'text' },
    { key: 'qualification',   label: 'Qualification',      type: 'text' },
    { key: 'medicalSchool',   label: 'Medical School',     type: 'text' },
    { key: 'yearsExperience', label: 'Years of Experience',type: 'number' },
    ...LICENCE_FIELDS,
    ...STAFF_EMPLOYMENT_FIELDS,
    ...STAFF_IDENTITY_FIELDS,
    ...STAFF_EMERGENCY_FIELDS,
  ],
  staff: [
    { key: 'position',   label: 'Position',   type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'shift',      label: 'Shift',      type: 'select', options: SHIFTS },
    ...STAFF_EMPLOYMENT_FIELDS,
    ...STAFF_IDENTITY_FIELDS,
    ...STAFF_EMERGENCY_FIELDS,
  ],
  // Nurses had no entry at all here, so the modal showed them no profile fields
  // whatsoever — they borrowed the staff profile and nothing surfaced it.
  nurse: [
    { key: 'position',        label: 'Position',              type: 'text' },
    { key: 'department',      label: 'Department',            type: 'text' },
    { key: 'shift',           label: 'Shift',                 type: 'select', options: SHIFTS },
    { key: 'licenseNumber',   label: 'Council Registration',  type: 'text' },
    ...LICENCE_FIELDS,
    { key: 'qualification',   label: 'Qualification',         type: 'text' },
    { key: 'institution',     label: 'Training Institution',  type: 'text' },
    { key: 'yearsExperience', label: 'Years of Experience',   type: 'number' },
    ...STAFF_EMPLOYMENT_FIELDS,
    ...STAFF_IDENTITY_FIELDS,
    ...STAFF_EMERGENCY_FIELDS,
  ],
  lab: [
    { key: 'specialization',      label: 'Specialization',      type: 'text' },
    { key: 'certificationNumber', label: 'Certification Number',type: 'text' },
    { key: 'qualification',       label: 'Qualification',       type: 'text' },
    { key: 'institution',         label: 'Institution',         type: 'text' },
    { key: 'yearsExperience',     label: 'Years of Experience', type: 'number' },
    { key: 'shift',               label: 'Shift',               type: 'select', options: SHIFTS },
    ...LICENCE_FIELDS,
    ...STAFF_EMPLOYMENT_FIELDS,
    ...STAFF_IDENTITY_FIELDS,
    ...STAFF_EMERGENCY_FIELDS,
  ],
};

// Cadres whose emergency contact must be reassembled into the JSON column on
// save. Patients are handled separately because they also carry insurance.
const STAFF_ROLES = ['doctor', 'nurse', 'staff', 'lab', 'admin'];

// ── Small reusable field renderer ────────────────────────────────────────────
const Field = ({ field, value, onChange }) => {
  const base = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  if (field.type === 'select') {
    return (
      <select value={value ?? ''} onChange={e => onChange(field.key, e.target.value)} className={base}>
        <option value="">— Select —</option>
        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input
      type={field.type}
      value={value ?? ''}
      onChange={e => onChange(field.key, e.target.value)}
      className={base}
    />
  );
};

// ── Field label map for readable history display ─────────────────────────────
const FIELD_LABELS = {
  firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone',
  dateOfBirth: 'Date of Birth', gender: 'Gender', address: 'Address',
  diagnosis: 'Diagnosis', diagnosisDate: 'Diagnosis Date', hba1c: 'HbA1c', riskLevel: 'Risk Level',
  specialty: 'Specialty', subSpecialty: 'Sub-specialty', department: 'Department',
  licenseNumber: 'License Number', qualification: 'Qualification', medicalSchool: 'Medical School',
  yearsExperience: 'Years of Experience', employmentType: 'Employment Type', city: 'City',
  position: 'Position', shift: 'Shift',
  specialization: 'Specialization', certificationNumber: 'Certification Number', institution: 'Institution',
  emergencyContact: 'Emergency Contact', insurance: 'Insurance',
  idNumber: 'National ID', ward: 'Ward / Unit', startDate: 'Start Date',
  licenseBody: 'Issuing Body', licenseExpiry: 'Licence Expiry',
  employmentStatus: 'Employment Status', archived: 'Archived',
};

// ── Main component ───────────────────────────────────────────────────────────
const EditUserModal = ({ user, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState('edit');
  const [form, setForm]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [logs, setLogs]           = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch full user data (includes all profile fields)
  useEffect(() => {
    api.get(`/users/${user.id}`)
      .then(res => {
        if (res.success) {
          const u = res.data.user;
          // Flatten emergencyContact / insurance sub-objects for patient
          const rawProvider = u.insurance?.provider ?? '';
          const knownProvider = INSURANCE_PROVIDERS.includes(rawProvider) ? rawProvider : (rawProvider ? 'Other' : '');
          setForm({
            ...u,
            // <input type="date"> only accepts YYYY-MM-DD; the API returns full
            // ISO timestamps, which the input silently rejects and renders blank.
            dateOfBirth:   u.dateOfBirth   ? u.dateOfBirth.split('T')[0]   : '',
            diagnosisDate: u.diagnosisDate ? u.diagnosisDate.split('T')[0] : '',
            startDate:     u.startDate     ? u.startDate.split('T')[0]     : '',
            licenseExpiry: u.licenseExpiry ? u.licenseExpiry.split('T')[0] : '',
            emergencyContactName:         u.emergencyContact?.name         ?? '',
            emergencyContactRelationship: u.emergencyContact?.relationship ?? '',
            emergencyContactPhone:        u.emergencyContact?.phone        ?? '',
            insuranceProvider:        knownProvider,
            customInsuranceProvider:  knownProvider === 'Other' ? rawProvider : '',
            insurancePolicyNumber:    u.insurance?.policyNumber ?? '',
            insuranceType:            u.insurance?.type         ?? '',
          });
        }
      })
      .catch(() => toast.error('Failed to load user details'))
      .finally(() => setLoading(false));
  }, [user.id]);

  // Fetch edit history when history tab is opened
  useEffect(() => {
    if (activeTab !== 'history') return;
    setLogsLoading(true);
    api.get(`/users/${user.id}/edit-logs`)
      .then(res => { if (res.success) setLogs(res.data.logs); })
      .catch(() => toast.error('Failed to load edit history'))
      .finally(() => setLogsLoading(false));
  }, [activeTab, user.id]);

  const handleChange = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!window.confirm(`Are you sure you want to save changes to ${user.name}? This will update their details across the entire system.`)) return;
    setSaving(true);
    try {
      // Re-assemble emergencyContact / insurance JSON
      const payload = { ...form };

      if (STAFF_ROLES.includes(user.role)) {
        const name         = form.emergencyContactName;
        const relationship = form.emergencyContactRelationship;
        const phone        = form.emergencyContactPhone;

        // Sending an object of three empty strings would overwrite a real
        // contact with blanks whenever the admin edits some other field.
        payload.emergencyContact = (name || relationship || phone)
          ? { name: name || null, relationship: relationship || null, phone: phone || null }
          : null;
      }

      if (user.role === 'patient') {
        payload.emergencyContact = {
          name:         form.emergencyContactName,
          relationship: form.emergencyContactRelationship,
          phone:        form.emergencyContactPhone,
        };
        payload.insurance = {
          provider:     form.insuranceProvider === 'Other'
                          ? (form.customInsuranceProvider.trim() || 'Other')
                          : form.insuranceProvider,
          policyNumber: form.insurancePolicyNumber,
          type:         form.insuranceType,
        };
      }

      const res = await api.put(`/users/${user.id}`, payload);
      if (res.success) {
        toast.success(`${user.name} updated successfully`, {
          duration: 3000, position: 'top-right',
          style: { background: '#10B981', color: '#fff', fontWeight: 'bold', padding: '16px' },
        });
        onSaved(res.data.user);
        onClose();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save changes', {
        duration: 4000, position: 'top-right',
        style: { background: '#EF4444', color: '#fff', fontWeight: 'bold', padding: '16px' },
      });
    } finally {
      setSaving(false);
    }
  };

  const roleFields = ROLE_FIELDS[user.role] ?? [];
  const roleLabel  = { patient: 'Patient', doctor: 'Doctor', staff: 'Staff', lab: 'Lab Tech' }[user.role] ?? user.role;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Edit {roleLabel}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{user.name} · {user.email}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            {[
              { id: 'edit',    label: 'Edit Details', icon: ClipboardEdit },
              { id: 'history', label: 'Edit History',  icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {activeTab === 'history' ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {logsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                <Loader className="animate-spin w-5 h-5 mr-2" /> Loading history…
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No edits recorded yet</p>
                <p className="text-sm text-gray-400 mt-1">Changes made through this form will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Log header */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Edited by {log.editedByName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(log.editedAt).toLocaleString('en-US', {
                            weekday: 'short', year: 'numeric', month: 'short',
                            day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                        {Object.keys(log.changes).length} field{Object.keys(log.changes).length !== 1 ? 's' : ''} changed
                      </span>
                    </div>
                    {/* Changes */}
                    <div className="divide-y divide-gray-100">
                      {Object.entries(log.changes).map(([field, { from, to }]) => (
                        <div key={field} className="px-4 py-3 grid grid-cols-3 gap-3 text-sm">
                          <p className="font-semibold text-gray-600">
                            {FIELD_LABELS[field] ?? field}
                          </p>
                          <div className="bg-red-50 rounded px-2 py-1 text-red-700 text-xs">
                            <span className="font-semibold block mb-0.5 text-red-400 uppercase text-[10px]">Before</span>
                            {from ? String(typeof from === 'object' ? JSON.stringify(from) : from) : <span className="italic text-gray-400">empty</span>}
                          </div>
                          <div className="bg-green-50 rounded px-2 py-1 text-green-700 text-xs">
                            <span className="font-semibold block mb-0.5 text-green-400 uppercase text-[10px]">After</span>
                            {to ? String(typeof to === 'object' ? JSON.stringify(to) : to) : <span className="italic text-gray-400">empty</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center py-16 text-gray-400 text-sm">
            <Loader className="animate-spin w-5 h-5 mr-2" /> Loading details…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Common fields */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COMMON_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                    <Field field={f} value={form[f.key]} onChange={handleChange} />
                  </div>
                ))}
              </div>
            </section>

            {/* Role-specific fields */}
            {roleFields.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{roleLabel} Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roleFields.map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                      <Field field={f} value={form[f.key]} onChange={handleChange} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Emergency contact — patients only */}
            {user.role === 'patient' && (
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'emergencyContactName',         label: 'Name',         type: 'text' },
                    { key: 'emergencyContactRelationship', label: 'Relationship', type: 'select', options: ['Spouse', 'Parent', 'Child', 'Sibling', 'Guardian', 'Friend', 'Other'] },
                    { key: 'emergencyContactPhone',        label: 'Phone',        type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                      <Field field={f} value={form[f.key]} onChange={handleChange} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Insurance — patients only */}
            {user.role === 'patient' && (
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Insurance & Payment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'insurancePolicyNumber',label: 'Policy Number', type: 'text' },
                    { key: 'insuranceType',        label: 'Payment Type',  type: 'select', options: ['Insurance', 'Cash', 'M-Pesa'] },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                      <Field field={f} value={form[f.key]} onChange={handleChange} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Provider</label>
                    <Field
                      field={{ key: 'insuranceProvider', type: 'select', options: INSURANCE_PROVIDERS }}
                      value={form.insuranceProvider}
                      onChange={(key, val) => handleChange(key, val)}
                    />
                    {form.insuranceProvider === 'Other' && (
                      <input
                        className="mt-2 w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter provider name"
                        value={form.customInsuranceProvider}
                        onChange={e => handleChange('customInsuranceProvider', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </section>
            )}

          </div>
        )}

        {/* Footer — only shown on edit tab */}
        {activeTab === 'edit' && <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>}

      </div>
    </div>
  );
};

export default EditUserModal;
