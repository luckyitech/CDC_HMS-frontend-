import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader } from 'lucide-react';
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
      </div>
    </div>
  );
};

export default ActivityTab;
