import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';
import Pagination from '../../shared/Pagination';
import staffService from '../../../services/staffService';
import { formatDateTime } from './staffFormat';

/**
 * Login and edit history for one staff member.
 *
 * Note: logins are only recorded for roles listed in the backend's
 * activityLogService.TRACKED_ROLES, which currently omits nurse and admin — so
 * this list is expected to be empty for those two until that is fixed. The edit
 * history is complete for everyone.
 */
// The server sends a list of described changes, not a raw diff. Object.keys()
// used to be called on it — and on MariaDB the column comes back as a STRING, so
// that rendered "0, 1, 2, 3, 4, …" for every entry: character indices of the
// JSON text. It looked like data and was noise.
const FIELD_LABELS = {
  permissions: 'Permissions',
  deniedPermissions: 'Refusals',
  staffType: 'Kind of staff',
  role: 'Role',
  isActive: 'Login',
  employmentStatus: 'Employment status',
};

const ActivityTab = ({ employeeId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // One page number per list. They grow at very different rates — an account
  // with 1,020 logins has five edits — so sharing a page number would mean
  // paging through forty pages of logins to reach the second page of edits.
  const [loginPage, setLoginPage] = useState(1);
  const [editPage, setEditPage]   = useState(1);

  // Back to the first page when the admin opens a different staff member,
  // or page 3 of the last person's logins is requested for someone who has one.
  useEffect(() => { setLoginPage(1); setEditPage(1); }, [employeeId]);

  useEffect(() => {
    let cancelled = false;

    staffService.getActivity(employeeId, { loginPage, editPage })
      .then((res) => { if (!cancelled) setData(res.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load activity'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    // Guards against setting state after the admin has navigated away.
    return () => { cancelled = true; };
  }, [employeeId, loginPage, editPage]);

  if (loading && !data) {
    return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const logins = data?.logins || [];
  const edits  = data?.edits || [];
  const loginPages = data?.loginPagination?.totalPages || 0;
  const editPages  = data?.editPagination?.totalPages || 0;
  const loginTotal = data?.loginPagination?.total ?? logins.length;
  const editTotal  = data?.editPagination?.total ?? edits.length;

  // The count belongs in the heading, not only in the pager: "Recent logins"
  // over a list of 25 gives no hint that 995 more exist.
  const heading = (label, total) => (total ? `${label} (${total})` : label);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{heading('Logins', loginTotal)}</h3>
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
        {/* Renders nothing at one page, so a quiet account looks exactly as
            it did before. */}
        <Pagination currentPage={loginPage} totalPages={loginPages} onPageChange={setLoginPage} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{heading('Edit history', editTotal)}</h3>
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
                <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                  {(e.changes || []).length === 0 && <p>No fields recorded</p>}
                  {(e.changes || []).map((c, i) => (
                    <p key={i}>
                      <span className="text-gray-400">{FIELD_LABELS[c.field] || c.field}</span>
                      {' — '}
                      {c.added || c.removed ? (
                        <>
                          {c.added?.length > 0 && (
                            <span className="text-green-700">gained {c.added.join(', ')}</span>
                          )}
                          {c.added?.length > 0 && c.removed?.length > 0 && '; '}
                          {c.removed?.length > 0 && (
                            <span className="text-red-700">lost {c.removed.join(', ')}</span>
                          )}
                          {!c.added?.length && !c.removed?.length && 'no change'}
                        </>
                      ) : (
                        <span className="text-gray-700">
                          {String(c.from ?? '—')} → {String(c.to ?? '—')}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination currentPage={editPage} totalPages={editPages} onPageChange={setEditPage} />
      </div>
    </div>
  );
};

export default ActivityTab;
