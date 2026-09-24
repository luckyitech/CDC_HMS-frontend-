import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Plus } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { useHrContext } from '../../contexts/HrContext';
import { canViewHr, canWriteHr } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import Spinner from '../../components/shared/Spinner';
import { notify } from '../../utils/notify';
import AmendDrawer from '../../components/hr/AmendDrawer';
import { dayLabel, hoursColon, todayIso, StarPair, VerificationPill, METHOD_LABEL, roleLabel } from '../../components/hr/hrFormat';

/**
 * TimeRegister — /hr/register (HR Suite, B21).
 *
 * Staff see their own rows (the server enforces it — /attendance/me);
 * hr.view sees everyone (/attendance) with person / role / status filters;
 * hr.write can amend a row or record a manual entry (reason required).
 * Presets follow the patient Attendance Register (B19) pattern; CSV is the
 * server's, downloaded through the same auth header.
 *
 * Deep links from the dashboard tiles: ?preset=today|week|month&status=…&focus=<id>
 */
const CLINIC_TZ = 'Africa/Nairobi';
const isoDate = (d) => d.toLocaleDateString('en-CA', { timeZone: CLINIC_TZ });
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const startOfWeek = () => { const d = new Date(); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return d; };
const startOfMonth = () => { const iso = isoDate(new Date()); return new Date(`${iso.slice(0, 7)}-01T12:00:00`); };

const PRESETS = [
  { key: 'today', label: 'Today',      range: () => [new Date(), new Date()] },
  { key: 'week',  label: 'This week',  range: () => [startOfWeek(), new Date()] },
  { key: 'month', label: 'This month', range: () => [startOfMonth(), new Date()] },
  { key: '30',    label: 'Last 30 days', range: () => [daysAgo(29), new Date()] },
];

const STATUS_OPTIONS = [
  ['', 'All statuses'], ['open', 'Checked in now'], ['late', 'Late check-in'], ['early_out', 'Early check-out'],
  ['flagged', 'Flagged'], ['missed', 'Missed check-out'], ['refused', 'Refused'], ['voided', 'Voided'],
];
const ROLE_OPTIONS = [['', 'All roles'], ['doctor', 'Doctors'], ['nurse', 'Nurses'], ['staff', 'Staff'], ['lab', 'Lab'], ['admin', 'Administrators']];

const inputCls = 'px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-primary';

const TimeRegister = () => {
  const { currentUser } = useUserContext();
  const { invalidate } = useHrContext();
  const [params, setParams] = useSearchParams();
  const isHr = canViewHr(currentUser);
  const canWrite = canWriteHr(currentUser);

  const presetParam = params.get('preset');
  const initial = (PRESETS.find((p) => p.key === presetParam) || PRESETS[1]).range();
  const [from, setFrom] = useState(isoDate(initial[0]));
  const [to, setTo] = useState(isoDate(initial[1]));
  const [preset, setPreset] = useState(PRESETS.find((p) => p.key === presetParam)?.key || 'week');
  const [status, setStatus] = useState(params.get('status') || '');
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState(params.get('userId') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);
  const [drawer, setDrawer] = useState(null);     // { session } | { manual: true } | null
  const focusId = params.get('focus');

  const rangeValid = from && to && from <= to;

  const load = useCallback(async () => {
    if (!rangeValid) return;
    setLoading(true);
    try {
      const q = { from, to };
      if (isHr) {
        if (status) q.status = status;
        if (role) q.role = role;
        if (userId) q.userId = userId;
      }
      const res = isHr ? await hrService.list(q) : await hrService.mine(q);
      setResult(res?.data || null);
    } catch (e) {
      notify('error', e?.message || 'Could not load the register');
    } finally {
      setLoading(false);
    }
  }, [from, to, status, role, userId, isHr, rangeValid]);

  useEffect(() => { load(); }, [load]);

  // People list for the Person filter and the manual-entry drawer (HR only).
  useEffect(() => {
    if (!isHr) return;
    hrService.workHoursAll().then((res) => setPeople((res?.data?.people || []).map((p) => p.person))).catch(() => {});
  }, [isHr]);

  const applyPreset = (p) => {
    const [a, b] = p.range();
    setFrom(isoDate(a)); setTo(isoDate(b)); setPreset(p.key);
  };

  // Staff filter client-side over their own rows; HR filters are server-side.
  const rows = useMemo(() => {
    const all = result?.rows || [];
    if (isHr || !status) return all;
    return all.filter((r) => ({
      open: r.status === 'open', late: r.checkInPunctuality === 'late', early_out: r.checkOutPunctuality === 'early',
      flagged: r.checkInVerification === 'flagged' || r.checkOutVerification === 'flagged',
      missed: r.status === 'missed_checkout', refused: r.status === 'refused', voided: r.status === 'voided',
    }[status]));
  }, [result, isHr, status]);

  const download = async () => {
    try {
      const q = { from, to };
      if (isHr) { if (status) q.status = status; if (role) q.role = role; if (userId) q.userId = userId; }
      await hrService.downloadCsv(q, `time-attendance-${from}-${to}.csv`, !isHr);
      notify('success', 'Register downloaded — open it with Excel or any spreadsheet app');
    } catch (e) { notify('error', e?.message || 'Download failed'); }
  };

  const onSaved = () => {
    setDrawer(null);
    invalidate();
    load();
    if (focusId) { params.delete('focus'); setParams(params, { replace: true }); }
  };

  const subtitle = result
    ? `${dayLabel(from, true)} – ${dayLabel(to, true)}${isHr ? ` · ${result.people ?? 0} staff` : ''} · ${rows.length} session${rows.length === 1 ? '' : 's'}`
    : 'Loading…';

  return (
    <div>
      <PageHeader
        title="Time & Attendance"
        subtitle={subtitle}
        actions={(
          <div className="flex gap-2">
            {canWrite && <Button variant="outline" onClick={() => setDrawer({ manual: true })} className="!px-4 !py-2 text-sm"><Plus className="w-4 h-4" /> Manual entry</Button>}
            <Button onClick={download} disabled={!rows.length} className="!px-4 !py-2 text-sm"><Download className="w-4 h-4" /> Download CSV</Button>
          </div>
        )}
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            {PRESETS.map((p) => (
              <button key={p.key} type="button" onClick={() => applyPreset(p)} className={`px-3 py-2 text-xs font-medium ${preset === p.key ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{p.label}</button>
            ))}
          </div>
          <label className="text-xs text-gray-600">From<br /><input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }} className={inputCls} /></label>
          <label className="text-xs text-gray-600">To<br /><input type="date" value={to} min={from} max={todayIso()} onChange={(e) => { setTo(e.target.value); setPreset('custom'); }} className={inputCls} /></label>
          {isHr && (
            <>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls} aria-label="Person">
                <option value="">Everyone</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.role === 'doctor' ? 'Dr ' : ''}{p.name}</option>)}
              </select>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls} aria-label="Role">
                {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </>
          )}
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls} aria-label="Status">
            {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {!rangeValid && <p className="text-sm text-red-600 mt-3">The From date must be on or before the To date.</p>}
      </div>

      <div className={`grid gap-4 ${drawer ? 'lg:grid-cols-[1fr_340px]' : ''} items-start`}>
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          {loading && !result ? <div className="p-8"><Spinner /></div> : rows.length === 0 ? (
            <p className="p-8 text-sm text-gray-500 text-center">No sessions match.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                  {isHr && <th className="text-left px-3 py-2 font-semibold">Person</th>}
                  <th className="text-left px-3 py-2 font-semibold">In</th>
                  <th className="text-left px-3 py-2 font-semibold">Out</th>
                  <th className="text-right px-3 py-2 font-semibold">Hours</th>
                  <th className="text-left px-3 py-2 font-semibold">Door · method</th>
                  <th className="text-left px-3 py-2 font-semibold">Verification</th>
                  <th className="text-left px-3 py-2 font-semibold">Stars</th>
                  {canWrite && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map((r) => {
                  const focused = focusId && String(r.id) === focusId;
                  const late = r.checkInPunctuality === 'late' ? `${r.lateMinutes} min late` : null;
                  const early = r.checkOutPunctuality === 'early' ? `${r.earlyOutMinutes} min early` : null;
                  return (
                    <tr key={r.id} className={`border-b border-gray-100 ${focused || drawer?.session?.id === r.id ? 'bg-blue-50' : ''} ${r.status === 'voided' ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-800">{dayLabel(r.clinicDate)}</td>
                      {isHr && <td className="px-3 py-2 text-gray-800">{r.person?.role === 'doctor' ? 'Dr ' : ''}{r.person?.name}<br /><small className="text-gray-500 font-normal">{r.person?.position || roleLabel(r.person?.role)}</small></td>}
                      <td className="px-3 py-2 whitespace-nowrap">{r.checkInHHMM}{late && <small className="block text-amber-700">{late}</small>}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.checkOutHHMM || '—'}{early && <small className="block text-red-700">{early}</small>}{r.amendedAt && <small className="block text-gray-400">amended</small>}</td>
                      <td className="px-3 py-2 text-right">{r.status === 'refused' ? '—' : hoursColon(r.minutesWorked)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{r.door || (r.checkInMethod === 'manual' ? 'HR' : '—')} · {METHOD_LABEL[r.checkInMethod] || r.checkInMethod}</td>
                      <td className="px-3 py-2"><VerificationPill session={r} /></td>
                      <td className="px-3 py-2"><StarPair session={r} /></td>
                      {canWrite && (
                        <td className="px-3 py-2 text-right">
                          {r.status === 'refused'
                            ? <button type="button" onClick={() => setDrawer({ session: r })} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Review</button>
                            : <button type="button" onClick={() => setDrawer({ session: r })} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Amend</button>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {drawer && canWrite && (
          drawer.session?.status === 'refused' ? (
            <aside className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-sm">
              <h4 className="font-bold text-gray-800">Refused tap</h4>
              <p className="text-xs text-gray-500 mb-3">{drawer.session.person?.name} · {dayLabel(drawer.session.clinicDate, true)} · {drawer.session.checkInHHMM}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-gray-500">Reason</dt><dd>{drawer.session.diagnostics?.reason || '—'}</dd>
                <dt className="text-gray-500">Tag</dt><dd>{drawer.session.door || 'unknown'}</dd>
                <dt className="text-gray-500">Counter seen</dt><dd className="font-mono">{drawer.session.diagnostics?.ctr || '—'}</dd>
                <dt className="text-gray-500">Phone</dt><dd>{drawer.session.device || '—'}</dd>
                <dt className="text-gray-500">IP</dt><dd className="font-mono">{drawer.session.checkInIp || '—'}</dd>
                <dt className="text-gray-500">Browser</dt><dd className="break-all">{drawer.session.diagnostics?.ua || '—'}</dd>
              </dl>
              <p className="text-[11px] text-gray-500 mt-3">A refused tap is kept as evidence and cannot be amended. If the person was present, record a manual entry.</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setDrawer({ manual: true, person: drawer.session.person })} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Manual entry</button>
                <button type="button" onClick={() => setDrawer(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700">Close</button>
              </div>
            </aside>
          ) : (
            <AmendDrawer session={drawer.session || null} person={drawer.person || null} people={people} onClose={() => setDrawer(null)} onSaved={onSaved} />
          )
        )}
      </div>
    </div>
  );
};

export default TimeRegister;
