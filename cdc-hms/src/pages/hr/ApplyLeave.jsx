import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';
import { canUseSelfService } from '../../utils/permissions';
import hrSelfService from '../../services/hrSelfService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import { notify } from '../../utils/notify';
import LeaveWizard from '../../components/hr/leave/LeaveWizard';

/**
 * Apply for leave — /hr/me/apply (B27 phase 2; mockup 2). The wizard needs the
 * types I can apply for and my balances (GET /api/hr/me/leave); once the
 * request is sent it opens on My leave.
 */
const ApplyLeave = () => {
  const { currentUser } = useUserContext();
  const allowed = canUseSelfService(currentUser);
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!allowed) return;
    hrSelfService.leave()
      .then((res) => setData(res.data))
      .catch((err) => notify('error', err.message || 'Could not load your leave'));
  }, [allowed]);

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Apply for leave" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-600">
          Applying for leave here has been switched off for your account. Ask HR to record your leave.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Apply for leave" />
      {data === null ? <Spinner /> : (
        <LeaveWizard
          data={data}
          onCancel={() => navigate('/hr/me/leave')}
          onSubmitted={(app) => navigate(`/hr/me/leave?open=${app.id}`)}
        />
      )}
    </div>
  );
};

export default ApplyLeave;
