import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Fingerprint, ShieldAlert, Globe, XCircle, RefreshCw, MapPin } from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import SelectMenu from '../../components/shared/SelectMenu';
import Pagination from '../../components/shared/Pagination';
import Modal from '../../components/shared/Modal';
import Tag from '../../components/shared/Tag';
import { NetworkTag, OutcomeTag, networkLabel } from '../../components/shared/SigninTags';
import Spinner from '../../components/shared/Spinner';
import signinService from '../../services/signinService';
import { formatDateTime } from './activityLogShared';
import { useUserContext } from '../../contexts/UserContext';
import { canEditSigninSecurity } from '../../utils/permissions';
import { notify } from '../../utils/notify';

const ROLE_LABEL = { doctor: 'Doctor', staff: 'Front desk', nurse: 'Nurse', lab: 'Lab', admin: 'Admin' };
const GPS_TEXT = { declined: 'Asked — declined', unavailable: 'Asked — no answer from the device' };
const filterCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary';

const Who = ({ row }) => (
  <span>
    <span className="font-semibold text-gray-800">{row.name || row.emailTried || 'Unknown account'}</span>
    {row.role && <span className="block text-[11px] text-gray-400">{ROLE_LABEL[row.role] || row.role}</span>}
    {!row.name && row.emailTried && <span className="block text-[11px] text-gray-400">No account with this email</span>}
  </span>
);

const DetailRow = ({ label, children }) => (
  <div className="grid grid-cols-[140px_1fr] gap-3 py-2 text-sm border-b border-gray-100 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 break-words">{children || '—'}</span>
  </div>
);

const SigninDetail = ({ id, onClose }) => {
  const [row, setRow] = useState(null);
  useEffect(() => {
    if (!id) return;
    setRow(null);
    signinService.get(id).then((r) => setRow(r.data.signin)).catch((err) => {
      notify('error', err?.message || 'Could not open the sign-in.');
      onClose();
    });
  }, [id, onClose]);

  return (
    <Modal isOpen={!!id} onClose={onClose} title="Sign-in" size="lg">
      {!row ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <OutcomeTag row={row} /><NetworkTag row={row} />
            {row.flagged && <Tag className="bg-red-50 text-red-700" Icon={ShieldAlert}>Flagged</Tag>}
          </div>
          <DetailRow label="Who"><Who row={row} /></DetailRow>
          <DetailRow label="When">{formatDateTime(row.loginAt)}</DetailRow>
          {row.outcome === 'failed' && <DetailRow label="Why it failed">{row.failText}</DetailRow>}
          {row.flagged && <DetailRow label="Flagged for">{row.flagText.join('; ')}{row.alertedAt ? ' · alert sent' : ''}</DetailRow>}
          <DetailRow label="How">{row.method === 'device' ? 'Remembered phone (entrance tag)' : 'Email and password'}</DetailRow>
          <DetailRow label="Address"><span className="font-mono">{row.ipAddress}</span></DetailRow>
          <DetailRow label="Network">{row.network === 'clinic' ? `Clinic network${row.networkLabel ? ` — ${row.networkLabel}` : ''}` : networkLabel(row)}</DetailRow>
          <DetailRow label="Approximate place">
            {[row.city, row.region !== row.city ? row.region : null, row.country].filter(Boolean).join(', ') || (row.network === 'outside' ? 'Not looked up' : null)}
            {row.isp && <span className="block text-xs text-gray-500">{row.isp}</span>}
          </DetailRow>
          <DetailRow label="Device location">
            {row.hasGps ? (
              <a className="text-primary font-semibold hover:underline inline-flex items-center gap-1" target="_blank" rel="noreferrer"
                href={`https://www.openstreetmap.org/?mlat=${row.gpsLat}&mlon=${row.gpsLng}#map=17/${row.gpsLat}/${row.gpsLng}`}>
                <MapPin className="w-3.5 h-3.5" /> {row.gpsLat.toFixed(5)}, {row.gpsLng.toFixed(5)}
                {row.gpsAccuracy != null && <span className="text-gray-500 font-normal">(within about {row.gpsAccuracy} m)</span>}
              </a>
            ) : (GPS_TEXT[row.gpsStatus] || 'Not asked')}
          </DetailRow>
          <DetailRow label="Device">{row.deviceLabel}</DetailRow>
          <DetailRow label="Browser string"><span className="text-xs text-gray-500">{row.userAgent}</span></DetailRow>
        </div>
      )}
    </Modal>
  );
};

/**
 * Admin → Monitoring → Sign-ins (16 Oct 2026, Emu). Every sign-in and every
 * failed attempt by staff — kept forever. Open to holders of "See where and
 * how staff sign in" (IT and security) and the main admin account; never to
 * full administrator access alone. A bell alert links here with ?focus=<id>.
 */
const SignIns = () => {
  const { currentUser } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({ from: '', to: '', q: '', outcome: 'all', network: 'all', flagged: false });
  // The search box waits for a pause in typing before asking the server.
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setFilters((f) => (f.q === search ? f : { ...f, q: search })); }, 350);
    return () => clearTimeout(t);
  }, [search]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const focus = Number(searchParams.get('focus')) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.outcome !== 'all') params.outcome = filters.outcome;
      if (filters.network !== 'all') params.network = filters.network;
      if (filters.flagged) params.flagged = 'true';
      const res = await signinService.list(params);
      setData(res.data);
    } catch (err) {
      notify('error', err?.message || 'Could not load sign-ins.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })); };
  const closeDetail = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const open = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('focus', String(id));
    setSearchParams(next, { replace: true });
  };

  const totals = data?.totals || { all: 0, failed: 0, outside: 0, flagged: 0 };
  const rows = data?.signins || [];

  return (
    <div className="space-y-4">
      <PageHeader title="Sign-ins" subtitle="Where and how staff sign in — every attempt, kept"
        actions={(
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 ui-hover">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Sign-in attempts" value={totals.all} icon={Fingerprint} gradient="from-blue-500 to-blue-600" sub="in the current filter" />
        <StatCard title="Failed" value={totals.failed} icon={XCircle} gradient="from-rose-500 to-rose-600"
          onClick={() => set('outcome', filters.outcome === 'failed' ? 'all' : 'failed')} />
        <StatCard title="Outside the clinic" value={totals.outside} icon={Globe} gradient="from-amber-500 to-amber-600"
          onClick={() => set('network', filters.network === 'outside' ? 'all' : 'outside')} />
        <StatCard title="Flagged" value={totals.flagged} icon={ShieldAlert} gradient="from-red-600 to-red-700"
          onClick={() => set('flagged', !filters.flagged)} />
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" className={filterCls} value={filters.from} onChange={(e) => set('from', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" className={filterCls} value={filters.to} onChange={(e) => set('to', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <input type="text" className={filterCls} placeholder="Name, email, address, town" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Result</label>
            <SelectMenu className={filterCls} value={filters.outcome} aria-label="Result" onChange={(e) => set('outcome', e.target.value)}>
              <option value="all">All attempts</option>
              <option value="success">Signed in</option>
              <option value="failed">Failed</option>
            </SelectMenu>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Network</label>
            <SelectMenu className={filterCls} value={filters.network} aria-label="Network" onChange={(e) => set('network', e.target.value)}>
              <option value="all">Anywhere</option>
              <option value="clinic">In clinic</option>
              <option value="outside">Outside the clinic</option>
              <option value="unknown">Unknown</option>
            </SelectMenu>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-xs text-gray-600 cursor-pointer w-fit">
          <input type="checkbox" className="rounded border-gray-300" checked={filters.flagged} onChange={(e) => set('flagged', e.target.checked)} />
          Flagged only
        </label>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading && !data ? <div className="flex justify-center py-16"><Spinner /></div> : rows.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">No sign-ins match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="ui-thead">
                <tr>
                  <th className="px-4 py-3 text-left">Date & time</th>
                  <th className="px-4 py-3 text-left">Who</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">Network</th>
                  <th className="px-4 py-3 text-left">Approximate place</th>
                  <th className="px-4 py-3 text-left">Device</th>
                  <th className="px-4 py-3 text-left">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id} className="ui-hover transition cursor-pointer" onClick={() => open(r.id)}>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDateTime(r.loginAt)}
                      {r.flagged && (
                        <span className="block mt-1">
                          <Tag className="bg-red-50 text-red-700" Icon={ShieldAlert} title={r.flagText.join('; ')}>Flagged</Tag>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3"><Who row={r} /></td>
                    <td className="px-4 py-3">
                      <OutcomeTag row={r} />
                      {r.failText && <span className="block text-[11px] text-gray-500 mt-1">{r.failText}</span>}
                    </td>
                    <td className="px-4 py-3"><NetworkTag row={r} /></td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.place || <span className="text-gray-400">—</span>}
                      {r.hasGps && <MapPin className="inline w-3.5 h-3.5 ml-1 text-primary" aria-label="Device location recorded" />}
                      {r.isp && <span className="block text-[11px] text-gray-400">{r.isp}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.deviceLabel || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.ipAddress || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.pages > 1 && (
          <Pagination currentPage={page} totalPages={data.pages} onPageChange={setPage} disabled={loading}
            summary={`Page ${page} of ${data.pages} · ${data.total} attempt${data.total === 1 ? '' : 's'}`} />
        )}
      </Card>

      {canEditSigninSecurity(currentUser) && (
        <p className="text-xs text-gray-500">
          Clinic networks, location lookup, device location and alert rules are in{' '}
          <Link to="/admin/settings?tab=signin" className="text-primary font-semibold hover:underline">Settings → Sign-in security</Link>.
        </p>
      )}

      <SigninDetail id={focus} onClose={closeDetail} />
    </div>
  );
};

export default SignIns;
