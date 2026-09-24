import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Loader, Users } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import StatusBadge from '../../components/shared/StatusBadge';
import staffService from '../../services/staffService';
import { ROLE_TONES } from '../../utils/statusStyles';

// The staff directory, surfaced inside the HR Suite.
//
// A thin list over GET /api/staff (staffService.getAll) whose rows open the
// existing admin StaffFile screen — no second copy of the file, no new backend.
// The sidebar entry and this page are gated on users.view (the same capability
// the API enforces), so anyone who can see the link can load the list.

const ROLE_LABEL = {
  doctor: 'Doctor', nurse: 'Nurse', lab: 'Lab Tech', staff: 'Staff', admin: 'Admin',
};

// Nurse and admin aren't in ROLE_TONES on the clinical side; give them a tone
// here so every row's role pill is coloured.
const roleTone = (role) => ROLE_TONES[role] || (role === 'nurse' ? 'purple' : role === 'admin' ? 'rose' : 'neutral');

// Same map StaffFile uses for the employment-status pill, kept identical so the
// two screens read the same.
const EMPLOYMENT_STATUS_TONES = {
  'Active': 'success', 'On Leave': 'warning', 'Suspended': 'danger',
  'Resigned': 'neutral', 'Terminated': 'neutral',
};

// The roles the directory offers as a filter — the staff roles the API returns.
const ROLE_FILTERS = ['doctor', 'nurse', 'lab', 'staff'];
const STATUS_FILTERS = ['Active', 'On Leave', 'Suspended', 'Resigned', 'Terminated'];

const StaffDirectory = () => {
  const navigate = useNavigate();

  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [role, setRole]       = useState('');
  const [status, setStatus]   = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Role, status and archived are server-side filters (the API supports them);
  // search is kept client-side so typing doesn't fire a request per keystroke,
  // and it also matches employee ID, which the API's search does not.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (role)   params.role = role;
      if (status) params.status = status;
      if (includeArchived) params.includeArchived = 'true';
      const res = await staffService.getAll(params);
      setStaff(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load staff');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [role, status, includeArchived]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      (s.name || '').toLowerCase().includes(q)
      || (s.email || '').toLowerCase().includes(q)
      || (s.employeeId || '').toLowerCase().includes(q));
  }, [staff, search]);

  const openFile = (employeeId) => navigate(`/hr/staff/${employeeId}`);

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Everyone on the clinic roster. Select a name to open their file."
        actions={
          <span className="text-sm text-gray-400 flex-shrink-0">
            {loading ? '' : `${filtered.length} ${filtered.length === 1 ? 'person' : 'people'}`}
          </span>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or ID"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All roles</option>
          {ROLE_FILTERS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">All statuses</option>
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 px-2 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          Archived
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">No staff match</p>
          <p className="text-sm mt-1">Try a different search or clear the filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1.3fr_0.9fr] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
              <span>Name</span><span>Role</span><span>Department</span><span>Status</span>
            </div>
            {filtered.map((s) => (
              <button
                key={s.employeeId}
                onClick={() => openFile(s.employeeId)}
                className={`w-full text-left grid grid-cols-[2fr_1fr_1.3fr_0.9fr] gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors ${s.isArchived ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(s.firstName || s.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.employeeId}</div>
                  </div>
                </div>
                <span className="min-w-0">
                  <StatusBadge shape="tag" size="xs" bordered={false} tone={roleTone(s.role)}>
                    {ROLE_LABEL[s.role] || s.role}
                  </StatusBadge>
                </span>
                <span className="text-sm text-gray-600 truncate">{s.department || '—'}</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  <StatusBadge shape="tag" size="xs" tone={EMPLOYMENT_STATUS_TONES[s.employmentStatus] || 'neutral'}>
                    {s.employmentStatus}
                  </StatusBadge>
                  {s.licenceExpiringSoon && (
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${s.licenceExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.licenceExpired ? 'Licence expired' : `Licence ${s.licenceExpiresInDays}d`}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((s) => (
              <button
                key={s.employeeId}
                onClick={() => openFile(s.employeeId)}
                className={`w-full text-left flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors ${s.isArchived ? 'opacity-60' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(s.firstName || s.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 truncate">{s.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {[ROLE_LABEL[s.role] || s.role, s.department].filter(Boolean).join(' · ')} · {s.employeeId}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge shape="tag" size="xs" tone={EMPLOYMENT_STATUS_TONES[s.employmentStatus] || 'neutral'}>
                    {s.employmentStatus}
                  </StatusBadge>
                  {s.licenceExpiringSoon && (
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${s.licenceExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {s.licenceExpired ? 'Expired' : `${s.licenceExpiresInDays}d`}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StaffDirectory;
