import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { canUseSelfService } from '../../utils/permissions';
import hrSelfService from '../../services/hrSelfService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import { notify } from '../../utils/notify';
import LeaveOverview from '../../components/hr/leave/LeaveOverview';
import LeaveRequestView from '../../components/hr/leave/LeaveRequestView';

/**
 * My leave — /hr/me/leave (B27 phase 2). Everyone reaches it from the HR
 * Suite sidebar ("My leave"); phase 4 moves the same LeaveOverview into My
 * profile's Leave tab.
 *
 * `?open=<id>` opens one request (the bell and the emails link here).
 * Everything is the signed-in person's own: GET /api/hr/me/leave.
 */
const MyLeave = () => {
  const { currentUser } = useUserContext();
  const allowed = canUseSelfService(currentUser);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(null);         // the application being viewed

  const load = useCallback(async () => {
    try {
      const res = await hrSelfService.leave(year);
      setData(res.data);
      setFailed(false);
    } catch (err) {
      setFailed(true);
      notify('error', err.message || 'Could not load your leave');
    }
  }, [year]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  // ?open=<id> — from the bell, an email, or right after applying.
  const openId = Number(params.get('open')) || null;
  useEffect(() => {
    if (!allowed || !openId) { setOpen(null); return; }
    let live = true;
    hrSelfService.getLeave(openId)
      .then((res) => { if (live) setOpen(res.data); })
      .catch(() => { if (live) { notify('error', 'That request could not be found'); setParams({}, { replace: true }); } });
    return () => { live = false; };
  }, [allowed, openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => setParams({}, { replace: true });

  if (!allowed) {
    return (
      <div>
        <PageHeader title="My leave" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          Applying for leave here has been switched off for your account. Ask HR to record your leave.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="My leave" subtitle="Apply for leave and follow your requests." />
      {data === null && !failed && <Spinner />}
      {failed && data === null && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          Your leave could not be loaded. <button type="button" className="text-primary font-semibold hover:underline" onClick={load}>Try again</button>
        </div>
      )}
      {data && (
        <LeaveOverview
          data={data}
          year={year}
          years={[thisYear - 1, thisYear, thisYear + 1]}
          onYear={setYear}
          onApply={() => navigate('/hr/me/apply')}
          onOpen={(id) => setParams({ open: String(id) })}
        />
      )}

      <Modal isOpen={!!open} onClose={close} title="Leave request" size="lg">
        {open && (
          <LeaveRequestView
            application={open}
            employeeId={data?.employeeId}
            onChanged={(app) => { setOpen(app); load(); }}
          />
        )}
      </Modal>
    </div>
  );
};

export default MyLeave;
