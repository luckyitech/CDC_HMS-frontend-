import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ChevronDown, ClipboardList, Award, Lock, Calendar,
  FolderOpen, Activity, Loader, AlertTriangle, ArchiveRestore, Phone, Mail,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import ProfileTabBar from '../../components/shared/ProfileTabBar';
import StatusBadge from '../../components/shared/StatusBadge';
import staffService from '../../services/staffService';
import EditableSection from '../../components/admin/staff/EditableSection';
import AccessTab from '../../components/admin/staff/AccessTab';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import LeaveTab from '../../components/admin/staff/LeaveTab';
import DocumentsTab from '../../components/admin/staff/DocumentsTab';
import ActivityTab from '../../components/admin/staff/ActivityTab';
import { formatDate } from '../../components/admin/staff/staffFormat';

// The staff record "file".
//
// The shell — PageHeader, the clickable name bar that slides the overview open,
// and ProfileTabBar — is deliberately identical to PatientFile, so the two
// record files behave the same way and neither drifts. The data behind it comes
// from /api/staff/:employeeId.

const ROLE_LABEL = {
  doctor: 'Doctor', nurse: 'Nurse', lab: 'Lab Tech', staff: 'Staff', admin: 'Admin',
};

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Consultant', 'Locum', 'Temporary'];
const SHIFTS           = ['Morning', 'Afternoon', 'Night', 'Rotating'];

const EMPLOYMENT_STATUS_TONES = {
  'Active': 'success', 'On Leave': 'warning', 'Suspended': 'danger',
  'Resigned': 'neutral', 'Terminated': 'neutral',
};

// Front desk hold no clinical licence, so Credentials is hidden for them rather
// than shown with four permanently empty fields.
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

const StaffFile = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [staff, setStaff]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'credentials');
  const [busy, setBusy]           = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  // Read from the session rather than refetched: it decides whether the
  // permission toggles are offered. The server enforces the same rule
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
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // One save path for every inline section. The error is re-thrown so
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

  // Asking happens in the modal below rather than window.confirm — the Archive
  // button sits on the Permissions tab, whose other confirmations are already
  // system-styled, and one native dialog on an otherwise themed screen reads as
  // a bug.
  const handleArchive = () => setConfirmingArchive(true);

  const archive = async () => {
    setConfirmingArchive(false);
    setBusy(true);
    try {
      await staffService.archive(employeeId);
      toast.success(`${staff.name} archived`);
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
      <div className="text-center py-12">
        <p className="text-2xl font-bold text-red-600">Staff member not found</p>
        <p className="text-gray-600 mt-2">Employee ID: {employeeId}</p>
        <Button onClick={() => navigate('/admin/manage-users')} className="mt-4">← Back to Users</Button>
      </div>
    );
  }

  const tabs = [
    { id: 'credentials', name: 'Credentials', Icon: Award,      show: CREDENTIALLED_ROLES.includes(staff.role) },
    { id: 'documents',   name: 'Documents',   Icon: FolderOpen, show: true },
    { id: 'leave',       name: 'Leave',       Icon: Calendar,   show: true },
    { id: 'access',      name: 'Permissions', Icon: Lock,       show: isAdmin },
    { id: 'activity',    name: 'Activity',    Icon: Activity,   show: isAdmin },
  ].filter((t) => t.show);

  // Credentials is hidden for front desk, so the default tab has to fall back
  // to one that exists or the page opens on nothing.
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  const subline = [ROLE_LABEL[staff.role] || staff.role, staff.department, staff.employmentType]
    .filter(Boolean).join(' · ');

  const canEdit = isAdmin && !staff.isArchived;

  return (
    <div>
      <PageHeader
        title="Staff File"
        actions={
          <Button variant="outline" onClick={() => navigate('/admin/manage-users')} className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" /> <span>Back to Users</span>
          </Button>
        }
      />

      {staff.isArchived && (
        <div className="flex items-center justify-between gap-4 bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 mb-3">
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

      {/* Name bar — click to slide the overview open. Takes the active-tab
          treatment while open. Mirrors PatientFile so the two files stay
          identical. */}
      <div
        onClick={() => setOverviewOpen((o) => !o)}
        className={`mb-1 px-4 py-2 rounded-lg shadow-sm border flex items-center justify-between gap-4 cursor-pointer transition-colors ${
          overviewOpen ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${overviewOpen ? 'rotate-180 text-white' : 'text-gray-400'}`} />
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(staff.firstName || staff.name || '?').charAt(0).toUpperCase()}
          </div>
          <h2 className={`text-base font-bold truncate ${overviewOpen ? 'text-white' : 'text-gray-800'}`}>
            {staff.name}
          </h2>
          <span className={`text-xs flex-shrink-0 ${overviewOpen ? 'text-blue-100' : 'text-gray-400'}`}>
            {staff.employeeId}
          </span>
          {subline && (
            <span className={`hidden sm:inline text-sm truncate ${overviewOpen ? 'text-blue-100' : 'text-gray-400'}`}>
              {subline}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Only shown when there is something to act on — an in-date licence
              needs no pill, and front desk have no licence at all. */}
          {staff.licenceExpiringSoon && (
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
              staff.licenceExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {staff.licenceExpired ? 'Licence expired' : `Licence ${staff.licenceExpiresInDays}d`}
            </span>
          )}
          {staff.hasAdminAccess && staff.role !== 'admin' && (
            <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-md text-xs font-semibold">
              Admin access
            </span>
          )}
          <StatusBadge shape="tag" size="xs" tone={EMPLOYMENT_STATUS_TONES[staff.employmentStatus] || 'neutral'}>
            {staff.employmentStatus}
          </StatusBadge>
        </div>
      </div>

      {/* Overview panel — expands in flow with a smooth slide. */}
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          overviewOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <EditableSection title="Personal"          fields={PERSONAL_FIELDS}   values={staff} onSave={saveSection} canEdit={canEdit} />
              <EditableSection title="Employment"        fields={EMPLOYMENT_FIELDS} values={staff} onSave={saveSection} canEdit={canEdit} />
              <EditableSection title="Emergency contact" fields={EMERGENCY_FIELDS}  values={staff} onSave={saveSection} canEdit={canEdit} />
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{staff.phone || '—'}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{staff.email || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <ProfileTabBar tabs={tabs} activeTab={currentTab} onChange={setActiveTab} />

      <div>
        {currentTab === 'credentials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableSection
              title="Licence" fields={LICENCE_FIELDS} values={staff}
              onSave={saveSection} canEdit={canEdit}
              description="An expiry date here drives the warning pill in the name bar."
            />
            <EditableSection title="Training" fields={TRAINING_FIELDS} values={staff} onSave={saveSection} canEdit={canEdit} />
          </div>
        )}

        {currentTab === 'documents' && <DocumentsTab staff={staff} isAdmin={isAdmin} />}
        {currentTab === 'leave'     && <LeaveTab staff={staff} isAdmin={isAdmin} />}

        {currentTab === 'access' && (
          <AccessTab
            staff={staff}
            currentUser={currentUser}
            onChanged={setStaff}
            onArchive={handleArchive}
            onRestore={handleRestore}
            onStatusChanged={setStaff}
            busy={busy}
          />
        )}

        {currentTab === 'activity' && <ActivityTab employeeId={employeeId} />}
      </div>

      <ConfirmActionModal
        isOpen={confirmingArchive}
        onClose={() => setConfirmingArchive(false)}
        onConfirm={archive}
        title={`Archive ${staff.name}?`}
        message={
          'Their login will be disabled and they will drop out of staff lists. Their name stays '
          + 'on past prescriptions, notes and lab results, and this can be undone.'
        }
        confirmLabel="Archive"
        confirmVariant="danger"
      />
    </div>
  );
};

export default StaffFile;
