import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronDown, FolderOpen, UserCog, Activity } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import ProfileTabBar from '../../components/shared/ProfileTabBar';
import staffFileService from '../../services/staffFileService';
import activityService from '../../services/activityService';
import StaffOverviewTab from '../../components/admin/staffFile/StaffOverviewTab';
import StaffDocumentsTab from '../../components/admin/staffFile/StaffDocumentsTab';
import StaffUserManagementTab from '../../components/admin/staffFile/StaffUserManagementTab';
import StaffActivityTab from '../../components/admin/staffFile/StaffActivityTab';

const STAFF_ROLES = ['doctor', 'staff', 'lab', 'nurse', 'admin'];

const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
const initial = (name = '') => (name.trim()[0] || '?').toUpperCase();

const StaffFile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastLogin, setLastLogin] = useState(undefined);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'documents');

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffFileService.getUser(id);
      setStaff(res?.data?.user || null);
    } catch {
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  // Last login — derived from the activity feed (login events), not a column.
  useEffect(() => {
    if (!staff?.name) return;
    let alive = true;
    activityService.getLog({ staff: staff.name, action: 'user_login' })
      .then((res) => {
        if (!alive) return;
        const mine = (res?.data?.events || []).filter((e) => (e.staff || '').includes(staff.name));
        setLastLogin(mine.length ? mine[0].timestamp : null);
      })
      .catch(() => alive && setLastLogin(null));
    return () => { alive = false; };
  }, [staff?.name]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading staff file…</div>;
  }

  if (!staff || !STAFF_ROLES.includes(staff.role)) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl font-bold text-red-600">Staff member not found</p>
        <p className="text-gray-600 mt-2">This file is only available for staff accounts.</p>
        <Button onClick={() => navigate('/admin/manage-users')} className="mt-4">← Back to Users</Button>
      </div>
    );
  }

  const tabs = [
    { id: 'documents', name: 'Staff Documents', Icon: FolderOpen },
    { id: 'user-management', name: 'User Management', Icon: UserCog },
    { id: 'activity', name: 'Activity', Icon: Activity },
  ];

  const subline = [cap(staff.role), staff.department].filter(Boolean).join(' · ');

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

      {/* Name bar — click to slide the overview open. Takes the active-tab
          treatment (primary, white text) while open. Mirrors the consultation
          patient bar so the two record "files" stay identical. */}
      <div
        onClick={() => setOverviewOpen((o) => !o)}
        className={`mb-1 px-4 py-2 rounded-lg shadow-sm border flex items-center justify-between gap-4 cursor-pointer transition-colors ${
          overviewOpen ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${overviewOpen ? 'rotate-180 text-white' : 'text-gray-400'}`} />
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initial(staff.name)}
          </div>
          <h2 className={`text-base font-bold truncate ${overviewOpen ? 'text-white' : 'text-gray-800'}`}>{staff.name}</h2>
          {subline && (
            <span className={`hidden sm:inline text-sm truncate ${overviewOpen ? 'text-blue-100' : 'text-gray-400'}`}>{subline}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {staff.hasAdminAccess && staff.role !== 'admin' && (
            <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-md text-xs font-semibold">Admin access</span>
          )}
          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
            staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {staff.status}
          </span>
        </div>
      </div>

      {/* Overview panel — expands in flow with a smooth slide. */}
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          overviewOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="py-4">
            <StaffOverviewTab staff={staff} lastLogin={lastLogin} />
          </div>
        </div>
      </div>

      <ProfileTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'documents' && <StaffDocumentsTab staff={staff} />}
        {activeTab === 'user-management' && <StaffUserManagementTab staff={staff} onSaved={loadStaff} />}
        {activeTab === 'activity' && <StaffActivityTab staff={staff} />}
      </div>
    </div>
  );
};

export default StaffFile;
