import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
import hrService from '../../services/hrService';
import EditableSection from '../../components/admin/staff/EditableSection';
import AccessTab from '../../components/admin/staff/AccessTab';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import StaffLeaveTab from '../../components/hr/leave/StaffLeaveTab';
import hrSelfService from '../../services/hrSelfService';
import SelfTodo from '../../components/hr/profile/SelfTodo';
import ChangeRequestList from '../../components/hr/profile/ChangeRequestList';
import SelfActivity from '../../components/hr/profile/SelfActivity';
import CpdSection from '../../components/hr/cpd/CpdSection';
import StaffAvatar from '../../components/hr/profile/StaffAvatar';
import PhotoControl from '../../components/hr/profile/PhotoControl';
import DocumentsTab from '../../components/admin/staff/DocumentsTab';
import ActivityTab from '../../components/admin/staff/ActivityTab';
import OnboardingCard from '../../components/hr/onboarding/OnboardingCard';
import MyShiftsCard from '../../components/hr/roster/MyShiftsCard';
import MyAppraisalCard from '../../components/hr/appraisals/MyAppraisalCard';
import { formatDate } from '../../components/admin/staff/staffFormat';
import {
  canViewConfidential, canViewStaff, canEditStaff, canManageStaffDocuments, canRunOnboarding, canRunAppraisals,
} from '../../utils/permissions';

// The staff record "file".
//
// mode="self" (B27 phase 4) is My profile — /hr/me, the avatar in the sidebar.
// The same shell and tabs, loaded from GET /api/hr/me, with: contact and
// emergency contact saved directly; name, ID, date of birth, licence and
// qualification sent as change requests HR decides (D11); employment
// read-only; a to-do list; Activity = the person's own attendance. Never the
// Permissions tab, archive/restore or the confidential drawer.
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

// HR Tier 3 Phase 1: position and department are picked from the clinic's
// lists (HR Suite → Departments & positions). Read-only views show the text.
const entryOptions = (entries, currentId) => (entries || [])
  .filter((x) => x.status === 'active' || x.id === currentId)
  .map((x) => ({ value: x.id, label: x.status === 'active' ? x.name : `${x.name} (archived)` }));
// Reports to (line manager, 5 Oct 2026): any active colleague but the person
// themselves. Leave pre-adds them as an approver; a NEW appraisal defaults its
// reviewer to them (existing appraisals keep theirs).
// You may not name yourself unless you run appraisals (the server refuses it).
const reportsToOptions = (colleagues, staff, viewer) => (colleagues || [])
  .filter((c) => c.id !== staff?.userId)
  .filter((c) => !viewer || c.id !== viewer.id || canRunAppraisals(viewer))
  .map((c) => ({ value: c.id, label: c.position ? `${c.name} — ${c.position}` : c.name }));
const employmentFields = (lists, staff, colleagues, viewer) => (lists ? [
  { key: 'positionId',   label: 'Position',   type: 'entry', displayKey: 'position',   options: entryOptions(lists.positions, staff?.positionId) },
  { key: 'departmentId', label: 'Department', type: 'entry', displayKey: 'department', options: entryOptions(lists.departments, staff?.departmentId) },
  { key: 'reportsToId',  label: 'Reports to', type: 'entry', displayKey: 'reportsTo.name', options: reportsToOptions(colleagues, staff, viewer) },
  ...EMPLOYMENT_FIELDS,
] : [
  { key: 'position',   label: 'Position' },
  { key: 'department', label: 'Department' },
  // Read-only here: without the lists (not an editor, or they failed to load)
  // there is nothing to pick from, and the text would save nothing.
  { key: 'reportsTo.name', label: 'Reports to', readOnly: true },
  ...EMPLOYMENT_FIELDS,
]);

const EMPLOYMENT_FIELDS = [
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

// My profile (D11): saved directly by the person.
const CONTACT_FIELDS = [
  { key: 'phone',   label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'city',    label: 'City' },
];
// My profile: asked of HR.
const IDENTITY_FIELDS = [
  { key: 'firstName',   label: 'First name' },
  { key: 'lastName',    label: 'Last name' },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'gender',      label: 'Gender',        type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'idNumber',    label: 'National ID' },
];

const TRAINING_FIELDS = [
  { key: 'qualification',   label: 'Qualification' },
  { key: 'institution',     label: 'Institution' },
  { key: 'yearsExperience', label: 'Experience', type: 'number', suffix: 'years' },
];

const SELF_TABS = ['credentials', 'documents', 'leave', 'activity'];

const StaffFile = ({ mode = 'staff' }) => {
  const self = mode === 'self';
  const { employeeId: routeEmployeeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  // The same file is mounted under /admin (from Manage Users) and /hr (from
  // the HR Suite staff directory). Send Back and the post-archive redirect
  // to wherever it was opened from, so neither entry point strands the user
  // in the other portal.
  const fromHr    = location.pathname.startsWith('/hr/');
  const backPath  = fromHr ? '/hr/staff' : '/admin/manage-users';
  const backLabel = fromHr ? 'Back to Staff' : 'Back to Users';

  const [staff, setStaff]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(
    (self && SELF_TABS.includes(params.get('tab')) ? params.get('tab') : null) || location.state?.activeTab || 'credentials'
  );
  const [selfData, setSelfData]   = useState(null);   // My profile: { requests, todo }
  const [noFile, setNoFile]       = useState(false);  // My profile: no StaffProfile yet
  const employeeId = self ? staff?.employeeId : routeEmployeeId;
  const [busy, setBusy]           = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  // Read from the session rather than refetched: it decides which tabs and
  // controls are offered. The server enforces the same rules regardless, so
  // this is UX only.
  //
  // Three separate questions, each mirroring the API gate on the routes it
  // unlocks — never `role === 'admin'`, which refused a doctor holding
  // admin.access (the way the clinic runs once the true admin account is
  // benched):
  //   canView     staff.view      — the Permissions and Activity tabs
  //   canManage   staff.edit      — editing the file and the photo
  //   canDocs     staff.documents — uploading to, reclassifying and archiving
  //               someone else's documents (HR Tier 3 Phase 0 — all three were
  //               users.view / users.write, which still carry them)
  //   leave       leave.manage decides and records leave for others,
  //               leave.policy sets entitlement (B27, D8 — were users.write)
  //   canSeeConfidential  hr.confidential — the confidential drawer of the
  //                             Documents tab; NOT carried by admin.access
  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('currentUser') || 'null'); }
    catch { return null; }
  })();
  const canView   = canViewStaff(currentUser);
  const canManage = canEditStaff(currentUser);
  const canDocs   = canManageStaffDocuments(currentUser);
  const canSeeConfidential = canViewConfidential(currentUser);

  const loadStaff = useCallback(async () => {
    try {
      if (self) {
        const res = await hrSelfService.profile();
        setStaff(res.data.profile);
        setSelfData({ requests: res.data.requests, todo: res.data.todo });
      } else {
        const res = await staffService.getByEmployeeId(routeEmployeeId);
        setStaff(res.data);
      }
    } catch (err) {
      if (self && err.data?.code === 'NO_STAFF_FILE') setNoFile(true);
      else toast.error(err.message || 'Failed to load staff member');
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, [self, routeEmployeeId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // The lists the Employment card picks from — only when this viewer may edit.
  const [lists, setLists] = useState(null);
  const [colleagues, setColleagues] = useState(null);
  useEffect(() => {
    if (self || !canManage) return;
    hrService.lists().then((res) => setLists(res?.data || null)).catch(() => setLists(null));
    // Everyone active (the manager may sit in another department).
    hrSelfService.approvers('', true).then((res) => setColleagues(res?.data?.people || [])).catch(() => setColleagues([]));
  }, [self, canManage]);

  // One save path for every inline section. The error is re-thrown so
  // EditableSection keeps the form open with the admin's input intact rather
  // than closing and losing it.
  const saveSection = async (patch) => {
    try {
      if (self) {
        // My profile: only the contact sections save directly (PATCH /api/hr/me/contact).
        const res = await hrSelfService.saveContact(patch);
        setStaff(res.data.profile);
      } else {
        const res = await staffService.update(employeeId, patch);
        setStaff(res.data);
      }
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
      throw err;
    }
  };

  // My profile: what the person may not change themselves goes to HR (D11).
  const requestChanges = async (changes, reason, documentId = null) => {
    try {
      await hrSelfService.requestChanges({ changes, reason, documentId });
      toast.success('Sent to HR');
      loadStaff();
    } catch (err) {
      toast.error(err.message || 'Could not send the request');
      throw err;
    }
  };
  const withdrawChange = async (id) => {
    try {
      await hrSelfService.withdrawChange(id);
      toast.success('Request withdrawn');
      loadStaff();
    } catch (err) {
      toast.error(err.message || 'Could not withdraw the request');
    }
  };
  // Waiting requests by field, for the "Change pending" line under each value.
  const pendingByField = Object.fromEntries((selfData?.requests || [])
    .filter((r) => r.status === 'pending').map((r) => [r.field, r]));
  const chooseTab = (id) => {
    setActiveTab(id);
    if (self) setParams({ tab: id }, { replace: true });
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
      navigate(backPath);
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

  if (self && noFile) {
    return (
      <div>
        <PageHeader title="My profile" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          You don&apos;t have a staff file yet, so there is nothing to show here. Ask HR to set one up.
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl font-bold text-red-600">Staff member not found</p>
        <p className="text-gray-600 mt-2">Employee ID: {employeeId}</p>
        <Button onClick={() => navigate(backPath)} className="mt-4">← {backLabel}</Button>
      </div>
    );
  }

  const tabs = [
    // My profile shows Credentials to everyone — somewhere to see and correct
    // what the clinic holds (CPD joins it in phase 5).
    { id: 'credentials', name: 'Credentials', Icon: Award,      show: self || CREDENTIALLED_ROLES.includes(staff.role) },
    { id: 'documents',   name: 'Documents',   Icon: FolderOpen, show: true },
    { id: 'leave',       name: 'Leave',       Icon: Calendar,   show: true },
    { id: 'access',      name: 'Permissions', Icon: Lock,       show: !self && canView },
    { id: 'activity',    name: 'Activity',    Icon: Activity,   show: self || canView },
  ].filter((t) => t.show);

  // Credentials is hidden for front desk, so the default tab has to fall back
  // to one that exists or the page opens on nothing.
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0].id;

  const subline = [ROLE_LABEL[staff.role] || staff.role, staff.department, staff.employmentType]
    .filter(Boolean).join(' · ');

  const canEdit = !self && canManage && !staff.isArchived;

  return (
    <div>
      {self ? (
        <PageHeader title="My profile" subtitle="Your record at the clinic. Contact details you can change yourself; the rest goes to HR." />
      ) : (
        <PageHeader
          title="Staff File"
          actions={
            <Button variant="outline" onClick={() => navigate(backPath)} className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" /> <span>{backLabel}</span>
            </Button>
          }
        />
      )}

      {!self && staff.isArchived && (
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
          <StaffAvatar self={self} employeeId={staff.employeeId} hasPhoto={staff.hasPhoto} name={staff.name} />
          <h2 className={`text-base font-bold truncate min-w-[4.5rem] ${overviewOpen ? 'text-white' : 'text-gray-800'}`}>
            {staff.name}
          </h2>
          {/* The employee number gives way on a phone so the name keeps its room. */}
          <span className={`hidden sm:inline text-xs flex-shrink-0 ${overviewOpen ? 'text-blue-100' : 'text-gray-400'}`}>
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
            {(self || canEdit) && (
              <PhotoControl self={self} employeeId={staff.employeeId} name={staff.name} hasPhoto={staff.hasPhoto}
                onChanged={(hasPhoto) => setStaff((s) => ({ ...s, hasPhoto }))} />
            )}
            {self ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <SelfTodo items={selfData?.todo} onGo={(link) => chooseTab(new URLSearchParams(link.slice(1)).get('tab') || 'credentials')} />
                  {/* HR Tier 3 Phase 4: my published shifts (hidden when there are none). */}
                  <MyShiftsCard />
                  {/* HR Tier 3 Phase 5: my appraisal, and any waiting on my review. */}
                  <MyAppraisalCard />
                  <EditableSection title="Contact" description="You can change these yourself." fields={CONTACT_FIELDS} values={staff} onSave={saveSection} canEdit />
                  <EditableSection title="Emergency contact" fields={EMERGENCY_FIELDS} values={staff} onSave={saveSection} canEdit />
                  <EditableSection title="Personal" description="Changed by HR on request." fields={IDENTITY_FIELDS} values={staff}
                    requestMode onRequest={requestChanges} pending={pendingByField} canEdit
                    attachEmployeeId={staff.employeeId} attachCategory="National ID" />
                  <EditableSection title="Employment" description="Set by HR." fields={employmentFields(null, staff)} values={staff} canEdit={false} />
                  <ChangeRequestList requests={selfData?.requests} onWithdraw={withdrawChange} />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <EditableSection title="Personal"          fields={PERSONAL_FIELDS}   values={staff} onSave={saveSection} canEdit={canEdit} />
                <EditableSection title="Employment"        fields={employmentFields(lists, staff, colleagues, currentUser)} values={staff} onSave={saveSection} canEdit={canEdit}
                  description={canEdit ? 'Reports to: leave pre-adds them as an approver; new appraisals default to them as reviewer.' : undefined} />
                <EditableSection title="Emergency contact" fields={EMERGENCY_FIELDS}  values={staff} onSave={saveSection} canEdit={canEdit} />
              </div>
            )}
            {/* HR Tier 3 Phase 3: the onboarding checklist (hr.onboarding, in scope). */}
            {!self && !staff.isArchived && canRunOnboarding(currentUser) && (
              <OnboardingCard employeeId={staff.employeeId} name={staff.name?.split(' ')[0]} />
            )}

            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{staff.phone || '—'}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{staff.email || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <ProfileTabBar tabs={tabs} activeTab={currentTab} onChange={chooseTab} />

      <div>
        {currentTab === 'credentials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {self ? (
              <>
                <EditableSection title="Licence" fields={LICENCE_FIELDS} values={staff} canEdit
                  requestMode onRequest={requestChanges} pending={pendingByField}
                  attachEmployeeId={staff.employeeId} attachCategory="Practising Licence"
                  description="Changed by HR on request — attach a copy of the new licence." />
                <EditableSection title="Training" fields={TRAINING_FIELDS} values={staff} canEdit
                  requestMode onRequest={requestChanges} pending={pendingByField}
                  attachEmployeeId={staff.employeeId} attachCategory="Academic Certificate" />
                {/* CPD (phase 5): full-width below the two credential cards. */}
                <CpdSection employeeId={staff.employeeId} />
              </>
            ) : (
              <>
                <EditableSection
                  title="Licence" fields={LICENCE_FIELDS} values={staff}
                  onSave={saveSection} canEdit={canEdit}
                  description="An expiry date here drives the warning pill in the name bar."
                />
                <EditableSection title="Training" fields={TRAINING_FIELDS} values={staff} onSave={saveSection} canEdit={canEdit} />
                {/* CPD, read-only (2 Oct 2026) — the person logs it on My profile, HR verifies on Profile requests. */}
                <CpdSection employeeId={staff.employeeId} readOnly />
              </>
            )}
          </div>
        )}

        {currentTab === 'documents' && (
          // My profile: own uploads and what HR shares; never the confidential drawer.
          <DocumentsTab staff={staff} canManage={!self && canDocs} canSeeConfidential={!self && canSeeConfidential}
            ownFile={self || (!!currentUser && staff.userId === currentUser.id)}
            canUpload={self || canDocs || canSeeConfidential} />
        )}
        {currentTab === 'leave'     && (
          // B27 phase 3: the same overview as My leave; the tab decides what
          // this viewer can do from the permissions (see StaffLeaveTab).
          <StaffLeaveTab staff={staff} currentUser={currentUser} />
        )}

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

        {currentTab === 'activity' && (self
          ? <SelfActivity />
          : <ActivityTab employeeId={employeeId} staffName={staff.name} />)}
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
