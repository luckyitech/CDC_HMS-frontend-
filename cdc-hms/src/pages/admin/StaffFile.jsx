import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Phone, Mail, ClipboardList, FolderOpen, KeyRound, Activity,
} from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import ProfileTabBar from '../../components/shared/ProfileTabBar';
import staffFileService from '../../services/staffFileService';
import activityService from '../../services/activityService';
import StaffOverviewTab from '../../components/admin/staffFile/StaffOverviewTab';
import StaffDocumentsTab from '../../components/admin/staffFile/StaffDocumentsTab';
import StaffPermissionsTab from '../../components/admin/staffFile/StaffPermissionsTab';
import StaffActivityTab from '../../components/admin/staffFile/StaffActivityTab';

const STAFF_ROLES = ['doctor', 'staff', 'lab', 'nurse', 'admin'];
const PERMISSIBLE_ROLES = ['doctor', 'staff', 'lab', 'nurse'];

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const initial = (name = '') => (name.trim()[0] || '?').toUpperCase();

const StaffFile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastLogin, setLastLogin] = useState(undefined); // undefined = not loaded
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'overview');

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

  // Last login for the header stat — derived from the activity feed (login events)
  // rather than a column, so no schema change is needed.
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
    { id: 'overview', name: 'Overview', Icon: ClipboardList },
    { id: 'documents', name: 'Staff Documents', Icon: FolderOpen },
    ...(PERMISSIBLE_ROLES.includes(staff.role) ? [{ id: 'permissions', name: 'Permissions', Icon: KeyRound }] : []),
    { id: 'activity', name: 'Activity', Icon: Activity },
  ];

  const stats = [
    { k: 'Position', v: staff.position || '—', bg: 'bg-gray-50', val: 'text-gray-800' },
    { k: 'Department', v: staff.department || '—', bg: 'bg-gray-50', val: 'text-gray-800' },
    { k: 'Shift', v: staff.shift || '—', bg: 'bg-gray-50', val: 'text-gray-800' },
    {
      k: 'Last Login',
      v: lastLogin === undefined ? '…' : fmtDateTime(lastLogin),
      bg: 'bg-blue-50',
      val: 'text-blue-600',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff File"
        subtitle={`${staff.name} · ${staff.role?.charAt(0).toUpperCase()}${staff.role?.slice(1)}`}
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/admin/manage-users')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> <span>Back to Users</span>
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold flex-shrink-0">
              {initial(staff.name)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">{staff.name}</h3>
              <div className="mt-1 sm:mt-1.5 space-y-0.5">
                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" /><span className="truncate">{staff.phone || '—'}</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4" /><span className="truncate">{staff.email || '—'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold capitalize">
              {staff.role}
            </span>
            {staff.hasAdminAccess && staff.role !== 'admin' && (
              <span className="px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-semibold">
                Admin access
              </span>
            )}
            {staff.canManageStock && (
              <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold">
                Stock
              </span>
            )}
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              staff.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {staff.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t">
          {stats.map((s) => (
            <div key={s.k} className={`${s.bg} rounded-lg p-3`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{s.k}</p>
              <p className={`text-sm font-semibold ${s.val} mt-1`}>{s.v}</p>
            </div>
          ))}
        </div>
      </Card>

      <ProfileTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'overview' && <StaffOverviewTab staff={staff} onSaved={loadStaff} />}
        {activeTab === 'documents' && <StaffDocumentsTab staff={staff} />}
        {activeTab === 'permissions' && PERMISSIBLE_ROLES.includes(staff.role) && (
          <StaffPermissionsTab staff={staff} onSaved={loadStaff} />
        )}
        {activeTab === 'activity' && <StaffActivityTab staff={staff} />}
      </div>
    </div>
  );
};

export default StaffFile;
