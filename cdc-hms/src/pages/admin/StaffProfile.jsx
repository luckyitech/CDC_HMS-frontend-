import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClipboardList, Award, Lock, Calendar, FileText, History,
  Phone, Mail, KeyRound, MoreVertical, ArrowLeft, Loader,
  AlertTriangle, ArchiveRestore,
} from 'lucide-react';
import staffService from '../../services/staffService';
import api from '../../services/api';
import StatusBadge from '../../components/shared/StatusBadge';
import EditableSection from '../../components/admin/staff/EditableSection';
import AccessTab from '../../components/admin/staff/AccessTab';
import LeaveTab from '../../components/admin/staff/LeaveTab';
import DocumentsTab from '../../components/admin/staff/DocumentsTab';
import { formatDate, formatDateTime } from '../../components/admin/staff/staffFormat';

// Deliberately NOT the patient profile's PageHeader + avatar Card stack: that
// costs ~260px of chrome before any content, which is the wrong trade on a page
// whose job is dense administrative data. See STAFF_PROFILE_DESIGN.md §2.

const ROLE_LABEL = {
  doctor: 'Doctor', nurse: 'Nurse', lab: 'Lab Tech', staff: 'Staff', admin: 'Admin',
};

const EMPLOYMENT_STATUSES = ['Active', 'On Leave', 'Suspended', 'Resigned', 'Terminated'];
const EMPLOYMENT_TYPES    = ['Full-time', 'Part-time', 'Contract', 'Consultant', 'Locum', 'Temporary'];
const SHIFTS              = ['Morning', 'Afternoon', 'Night', 'Rotating'];

const EMPLOYMENT_STATUS_TONES = {
  'Active': 'success', 'On Leave': 'warning', 'Suspended': 'danger',
  'Resigned': 'neutral', 'Terminated': 'neutral',
};

// Front desk hold no clinical licence, so the Credentials tab is hidden for
// them rather than shown with four permanently empty fields.
const CREDENTIALLED_ROLES = ['doctor', 'nurse', 'lab'];

const PERSONAL_FIELDS = [
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'gender',      label: 'Gender',        type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'idNumber',    label: 'National ID' },
  { key: 'address',     label: 'Address' },
  { key: 'city',        label: 'City' },
];

const EMPLOYMENT_FIELDS = [
  { key: 'position',       label: 'Position' },
  { key: 'department',     label: 'Department' },
  { key: 'ward',           label: 'Ward / unit' },
  { key: 'shift',          label: 'Shift',           type: 'select', options: SHIFTS },
  { key: 'employmentType', label: 'Employment type', type: 'select', options: EMPLOYMENT_TYPES },
  { key: 'startDate',      label: 'Joined',          type: 'date' },
  { key: 'endDate',        label: 'Left',            type: 'date' },
];

// Dotted paths — emergencyContact is one JSON column, edited as three fields.
const EMERGENCY_FIELDS = [
  { key: 'emergencyContact.name',         label: 'Name' },
  { key: 'emergencyContact.relationship', label: 'Relationship' },
  { key: 'emergencyContact.phone',        label: 'Phone' },
];

const LICENCE_FIELDS = [
  { key: 'licenseNumber', label: 'Number' },
  { key: 'licenseBody',   label: 'Issuing body' },
  { key: 'licenseExpiry', label: 'Expires', type: 'date' },
  { key: 'specialty',     label: 'Specialty' },
];

const TRAINING_FIELDS = [
  { key: 'qualification',   label: 'Qualification' },
  { key: 'institution',     label: 'Institution' },
  { key: 'yearsExperience', label: 'Experience', type: 'number', suffix: 'years' },
];

const ActivityTab = ({ employeeId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    staffService.getActivity(employeeId)
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Guards against setting state after the admin has navigated away.
    return () => { cancelled = true; };
  }, [employeeId]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const logins = data?.logins || [];
  const edits  = data?.edits || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent logins</h3>
        {logins.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No logins recorded.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logins.map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between text-sm">
                <span className="text-gray-800">{formatDateTime(l.loginAt)}</span>
                <span className="text-gray-400 text-xs">{l.ipAddress || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Edit history</h3>
        {edits.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No edits recorded.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {edits.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">{e.editedByName}</span>
                  <span className="text-gray-400 text-xs">{formatDateTime(e.editedAt)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {Object.keys(e.changes || {}).join(', ') || 'No fields recorded'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const StaffProfile = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy]       = useState(false);

  // Read from the session rather than refetched: it decides whether the
  // permission toggles are offered, and the server enforces the same rule
  // regardless, so this is UX only.
  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('currentUser') || 'null'); }
    catch { return null; }
  })();
  const isAdmin = currentUser?.role === 'admin';

  const loadStaff = useCallback(async () => {
    try {
      const res = await staffService.getByEmployeeId(employeeId);
      setStaff(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load staff member');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // One save path for every inline section. Errors are re-thrown so
  // EditableSection keeps the form open with the admin's input intact rather
  // than closing and losing it.
  const saveSection = async (patch) => {
    try {
      const res = await staffService.update(employeeId, patch);
      setStaff(res.data);
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
      throw err;
    }
  };

  const handleStatusChange = async (employmentStatus) => {
    setMenuOpen(false);
    setBusy(true);
    try {
      const res = await staffService.updateStatus(employeeId, employmentStatus);
      setStaff(res.data);
      toast.success(`Status set to ${employmentStatus}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setMenuOpen(false);
    if (!staff.email) {
      toast.error(`${staff.name} has no email address on file.`);
      return;
    }
    if (!window.confirm(`Send a password reset email to ${staff.email}?`)) return;

    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email: staff.email });
      toast.success('Password reset email sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    setMenuOpen(false);
    const confirmed = window.confirm(
      `Archive ${staff.name}?\n\nTheir login will be disabled and they will drop out of staff lists. ` +
      'Their name stays on past prescriptions, notes and lab results. This can be undone.'
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      await staffService.archive(employeeId);
      toast.success(`${staff.name} archived`);
      // The record still exists, but the admin has no reason to stay on it.
      navigate('/admin/manage-users');
    } catch (err) {
      toast.error(err.message || 'Failed to archive');
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const res = await staffService.restore(employeeId);
      setStaff(res.data);
      toast.success('Restored. Set their status back to Active to allow login.');
    } catch (err) {
      toast.error(err.message || 'Failed to restore');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-bold text-red-600">Staff member not found</p>
        <p className="text-gray-500 mt-1">Employee ID: {employeeId}</p>
        <button onClick={() => navigate('/admin/manage-users')} className="mt-4 text-sm text-blue-600 hover:underline">
          ← Back to Manage Users
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview',    name: 'Overview',    Icon: ClipboardList, show: true },
    { id: 'credentials', name: 'Credentials', Icon: Award,         show: CREDENTIALLED_ROLES.includes(staff.role) },
    { id: 'access',      name: 'Access',      Icon: Lock,          show: isAdmin },
    { id: 'leave',       name: 'Leave',       Icon: Calendar,      show: true },
    { id: 'documents',   name: 'Documents',   Icon: FileText,      show: true },
    { id: 'activity',    name: 'Activity',    Icon: History,       show: isAdmin },
  ].filter((t) => t.show);

  const initial = (staff.firstName || staff.name || '?').charAt(0).toUpperCase();
  const canEdit = isAdmin && !staff.isArchived;

  return (
    <div>
      {staff.isArchived && (
        <div className="flex items-center justify-between gap-4 bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">Archived account</p>
              <p className="text-xs text-gray-600">
                Archived {formatDate(staff.archivedAt)}. Login is disabled and they are hidden from staff lists.
              </p>
            </div>
          </div>
          <button
            onClick={handleRestore}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 whitespace-nowrap"
          >
            <ArchiveRestore className="w-4 h-4" /> Restore
          </button>
        </div>
      )}

      {/* Compact header — one row, then the tab strip */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-base font-bold flex-shrink-0">
          {initial}
        </div>

        <div className="flex-1 min-w-[180px]">
          <p className="text-base font-bold text-gray-800 leading-tight">
            {staff.name} <span className="text-xs text-gray-400 font-normal">{staff.employeeId}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {[ROLE_LABEL[staff.role] || staff.role, staff.department, staff.employmentType].filter(Boolean).join(' · ')}
            {staff.startDate && ` · joined ${formatDate(staff.startDate)}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {staff.phone && (
            <a href={`tel:${staff.phone}`} className="hidden sm:flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <Phone className="w-3.5 h-3.5" />{staff.phone}
            </a>
          )}

          <StatusBadge shape="tag" size="xs" tone={EMPLOYMENT_STATUS_TONES[staff.employmentStatus] || 'neutral'}>
            {staff.employmentStatus}
          </StatusBadge>

          {/* Only shown when there is something to act on — an in-date licence
              needs no pill, and staff without one get none at all. */}
          {staff.licenceExpiringSoon && (
            <StatusBadge shape="tag" size="xs" tone={staff.licenceExpired ? 'danger' : 'warning'}>
              {staff.licenceExpired ? 'Licence expired' : `Licence ${staff.licenceExpiresInDays}d`}
            </StatusBadge>
          )}

          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                disabled={busy}
                aria-label="More actions"
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  {/* Click-away layer — without it the menu can only be closed
                      by the toggle, which traps the admin on small screens. */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={handleResetPassword}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset password
                    </button>

                    <div className="border-t border-gray-100 my-1" />
                    <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-gray-400">Employment status</p>
                    {EMPLOYMENT_STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={status === staff.employmentStatus}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:text-gray-300 disabled:hover:bg-transparent"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => navigate('/admin/manage-users')}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Back to Manage Users"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.Icon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <EditableSection title="Personal"          fields={PERSONAL_FIELDS}   values={staff} onSave={saveSection} canEdit={canEdit} />
          <EditableSection title="Employment"        fields={EMPLOYMENT_FIELDS} values={staff} onSave={saveSection} canEdit={canEdit} />
          <EditableSection title="Emergency contact" fields={EMERGENCY_FIELDS}  values={staff} onSave={saveSection} canEdit={canEdit} />
        </div>
      )}

      {activeTab === 'credentials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableSection
            title="Licence" fields={LICENCE_FIELDS} values={staff}
            onSave={saveSection} canEdit={canEdit}
            description="An expiry date here drives the warning pill in the header."
          />
          <EditableSection title="Training" fields={TRAINING_FIELDS} values={staff} onSave={saveSection} canEdit={canEdit} />
        </div>
      )}

      {activeTab === 'access' && (
        <AccessTab
          staff={staff}
          currentUser={currentUser}
          onChanged={setStaff}
          onArchive={handleArchive}
          onRestore={handleRestore}
          busy={busy}
        />
      )}

      {activeTab === 'leave'     && <LeaveTab staff={staff} isAdmin={isAdmin} />}
      {activeTab === 'documents' && <DocumentsTab staff={staff} isAdmin={isAdmin} />}
      {activeTab === 'activity'  && <ActivityTab employeeId={employeeId} />}

      <p className="mt-6 text-xs text-gray-400 flex items-center gap-1.5">
        <Mail className="w-3.5 h-3.5" />{staff.email || 'No email on file'}
      </p>
    </div>
  );
};

export default StaffProfile;
