import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import Spinner from '../../shared/Spinner';
import { NetworkTag, OutcomeTag } from '../../shared/SigninTags';
import signinService from '../../../services/signinService';
import { formatDateTime } from '../../../utils/dateUtils';

/**
 * My profile → Activity → My sign-ins (16 Oct 2026): a person's own last 50
 * sign-ins and failed attempts — "was that me?" — with the place, network and
 * device the clinic recorded. Needs no grant; nobody else's are shown.
 */
const MySignins = () => {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    signinService.mine().then((r) => setRows(r.data.signins || [])).catch(() => setRows([]));
  }, []);

  if (rows === null) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!rows.length) return <div className="ui-surface p-6 text-sm text-gray-600">No sign-ins recorded yet.</div>;

  return (
    <div className="ui-surface overflow-x-auto">
      <p className="px-4 pt-3 text-xs text-gray-500">
        If a sign-in here was not you, change your password and tell the clinic administrator.
      </p>
      <table className="w-full text-sm mt-2">
        <thead className="ui-thead">
          <tr>
            <th className="px-4 py-2 text-left">Date & time</th>
            <th className="px-4 py-2 text-left">Result</th>
            <th className="px-4 py-2 text-left">Network</th>
            <th className="px-4 py-2 text-left">Approximate place</th>
            <th className="px-4 py-2 text-left">Device</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(r.loginAt)}</td>
              <td className="px-4 py-2"><OutcomeTag row={r} />{r.failText && <span className="block text-[11px] text-gray-500 mt-1">{r.failText}</span>}</td>
              <td className="px-4 py-2"><NetworkTag row={r} /></td>
              <td className="px-4 py-2 text-gray-700">
                {r.place || <span className="text-gray-400">—</span>}
                {r.hasGps && <MapPin className="inline w-3.5 h-3.5 ml-1 text-primary" aria-label="Device location recorded" />}
              </td>
              <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{r.deviceLabel || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MySignins;
