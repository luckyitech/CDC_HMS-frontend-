import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarPlus, SlidersHorizontal } from 'lucide-react';
import staffService from '../../../services/staffService';
import hrSelfService from '../../../services/hrSelfService';
import { canManageLeave, canSetLeavePolicy } from '../../../utils/permissions';
import { notify } from '../../../utils/notify';
import Modal from '../../shared/Modal';
import Spinner from '../../shared/Spinner';
import { buttonCls } from '../hrUi';
import LeaveOverview from './LeaveOverview';
import ApprovalPanel from './ApprovalPanel';
import LeaveRequestView from './LeaveRequestView';
import RecordLeaveModal from './RecordLeaveModal';

/**
 * The staff file's Leave tab (B27 phase 3) — replaces the pre-B27 LeaveTab.
 * The same LeaveOverview as My leave, from GET /api/staff/:employeeId/leaves.
 *
 *   - Your own file (and My profile's Leave tab): Apply for leave; a request
 *     opens here in the same view My leave uses (withdraw, answer, add the
 *     document).
 *   - leave.manage: a request opens in the approval panel (see it, cancel
 *     it, decide a pre-B27 one); "Record leave" records on their behalf.
 *   - users.view only: the overview with sick leave shown as "Private" and
 *     no sick balance (the server trims it); requests don't open.
 *   - leave.policy: a link to their entitlement on Leave settings, which is
 *     the one place entitlements are changed.
 */
const StaffLeaveTab = ({ staff, currentUser }) => {
  const navigate = useNavigate();
  const own = staff.userId === currentUser?.id;
  const manage = canManageLeave(currentUser) && !own;
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [ownOpen, setOwnOpen] = useState(null);   // one of MY requests (LeaveRequestView)
  const [recording, setRecording] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await staffService.getLeaves(staff.employeeId, year);
      setData(res.data);
    } catch (err) {
      notify('error', err.message || 'Could not load leave');
    }
  }, [staff.employeeId, year]);

  useEffect(() => { load(); }, [load]);

  const openOwn = async (id) => {
    try {
      const res = await hrSelfService.getLeave(id);
      setOwnOpen(res.data);
    } catch (err) {
      notify('error', err.message || 'Could not open the request');
    }
  };

  if (!data) return <Spinner />;

  const actions = (
    <>
      {canSetLeavePolicy(currentUser) && (
        <Link to={`/hr/leave-settings?tab=entitlements&year=${year}`} className={`${buttonCls} inline-flex items-center gap-1.5`}>
          <SlidersHorizontal className="w-4 h-4" /> Entitlement
        </Link>
      )}
      {manage && data.recordTypes?.length > 0 && (
        <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5`} onClick={() => setRecording(true)}>
          <CalendarPlus className="w-4 h-4" /> Record leave
        </button>
      )}
    </>
  );

  return (
    <div className="space-y-3">
      <LeaveOverview
        data={data}
        year={year}
        years={[thisYear - 1, thisYear, thisYear + 1]}
        onYear={setYear}
        actions={actions}
        onApply={own ? () => navigate('/hr/me/apply') : undefined}
        onOpen={own ? openOwn : manage ? setOpenId : undefined}
      />
      {data.redacted && (
        <p className="text-[11px] text-gray-500">Sick leave shows as “Private”: its type and reason are seen only by the person, their approvers and whoever manages leave.</p>
      )}

      <Modal isOpen={!!openId} onClose={() => setOpenId(null)} title="Leave request" size="lg">
        {openId && <ApprovalPanel requestId={openId} onChanged={load} />}
      </Modal>
      <Modal isOpen={!!ownOpen} onClose={() => setOwnOpen(null)} title="Leave request" size="lg">
        {ownOpen && <LeaveRequestView application={ownOpen} employeeId={data.employeeId} onChanged={(app) => { setOwnOpen(app); load(); }} />}
      </Modal>

      {manage && data.recordTypes && (
        <RecordLeaveModal
          isOpen={recording}
          onClose={() => setRecording(false)}
          staff={{ employeeId: staff.employeeId, name: staff.name }}
          types={data.recordTypes}
          policyPublished={data.policyPublished}
          onRecorded={() => { setRecording(false); load(); }}
        />
      )}
    </div>
  );
};

export default StaffLeaveTab;
