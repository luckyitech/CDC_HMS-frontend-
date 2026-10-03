import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { canViewHrReports } from '../../utils/permissions';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import { notify } from '../../utils/notify';
import { Pill, monthLabel, thisMonth } from '../../components/hr/hrFormat';
import { Section, buttonCls } from '../../components/hr/hrUi';

/**
 * HrReports — /hr/reports (HR Tier 3 Phase 2, mockup B of hr-tier3-mockup;
 * decisions T3-3, R-1…R-8).
 *
 * Five tiles and six reports, each downloadable as a spreadsheet: headcount by
 * department, joiners and leavers, annual leave owed, licences and documents
 * expiring, CPD progress and punctuality. Gate: hr.reports (canViewHrReports).
 * Every figure is worked out on the server for the people inside the viewer's
 * hr.reports scope — a department-limited holder sees only their people.
 * Sick leave appears only as ONE total for that whole scope, and not at all
 * under five people (R-3). Every download is logged on the server.
 */

const fmt = (n) => (n === null || n === undefined ? '—' : String(Math.round(Number(n) * 100) / 100));
const ROLE_LABEL = { doctor: 'Doctor', nurse: 'Nurse', lab: 'Lab', staff: 'Front office', admin: 'Admin' };
const dayText = (iso) => (iso
  ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  : '—');
const CPD_PILL = { met: ['ok', 'Target met'], on_track: ['info', 'On track'], behind: ['warn', 'Behind'] };

const Tile = ({ label, value, note }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 min-w-0">
    <span className="block text-xs text-gray-500">{label}</span>
    <b className="block text-xl text-gray-800 tabular-nums">{value}</b>
    {note && <span className="block text-[11px] text-gray-500">{note}</span>}
  </div>
);

/** A plain table: columns [{ key, label, render?, num? }]. */
const Table = ({ columns, rows, empty, rowKey = (r, i) => r.id ?? i, footer }) => {
  if (!rows.length) return <p className="text-sm text-gray-500">{empty}</p>;
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            {columns.map((c) => <th key={c.key} className={`py-2 px-1 font-semibold whitespace-nowrap ${c.num ? 'text-right' : ''}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="border-b border-gray-100">
              {columns.map((c) => (
                <td key={c.key} className={`py-2 px-1 whitespace-nowrap ${c.num ? 'text-right tabular-nums' : ''}`}>
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
          {footer}
        </tbody>
      </table>
    </div>
  );
};

const PERSON = [
  { key: 'name', label: 'Name', render: (r) => <span className="text-gray-800">{r.name}</span> },
  { key: 'role', label: 'Role', render: (r) => ROLE_LABEL[r.role] || r.role },
  { key: 'department', label: 'Department', render: (r) => r.department || <span className="text-gray-400">None</span> },
];

const DownloadButton = ({ report, busy, onClick }) => (
  <button type="button" className={buttonCls} disabled={busy === report} onClick={() => onClick(report)} aria-label={`Download ${report} as .csv`}>
    <Download className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />{busy === report ? 'Preparing…' : '.csv'}
  </button>
);

const HrReports = () => {
  const { currentUser } = useUserContext();
  const allowed = canViewHrReports(currentUser);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(thisMonth());
  const [windowDays, setWindowDays] = useState(90);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);

  const params = { year, month, window: windowDays };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrService.reports({ year, month, window: windowDays });
      setData(res?.data || null);
    } catch (err) {
      notify('error', err.message || 'Could not load the reports');
    } finally { setLoading(false); }
  }, [year, month, windowDays]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const download = async (report) => {
    setBusy(report);
    const period = { headcount: data?.today, expiries: `${data?.today}-next-${windowDays}-days`, punctuality: month }[report] || year;
    try { await hrService.downloadReport(report, params, `hr-report-${report}-${period}.csv`); }
    catch (err) { notify('error', err.message || 'Could not download the report'); }
    finally { setBusy(null); }
  };

  if (!allowed) {
    return (
      <div className="p-4">
        <PageHeader title="HR reports" />
        <p className="text-sm text-gray-500">You don&apos;t have access to HR reports. Ask whoever runs the HR Suite.</p>
      </div>
    );
  }

  const years = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
  const t = data?.tiles;
  const dl = (report) => <DownloadButton report={report} busy={busy} onClick={download} />;

  return (
    <div className="p-4 space-y-4 max-w-6xl">
      <PageHeader
        title="HR reports"
        subtitle={data ? `${data.people} member${data.people === 1 ? '' : 's'} of staff in your reach` : 'Headcount, leave, expiries, CPD and punctuality'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <label className="text-xs text-gray-500 flex items-center gap-1">Year
              <select aria-label="Year" className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
        )}
      />

      {!data && loading && <Spinner />}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Tile label="Headcount" value={t.headcount.total}
              note={`+${t.headcount.joined} joined · ${t.headcount.left} left in ${data.year}${t.headcount.suspended ? ` · ${t.headcount.suspended} suspended` : ''}`} />
            <Tile label="Annual leave owed" value={`${fmt(t.leaveOwed.days)} d`} note={`across ${t.leaveOwed.people} ${t.leaveOwed.people === 1 ? 'person' : 'people'}`} />
            <Tile label={`Expiring in ${t.expiring.window} days`} value={t.expiring.total}
              note={`${t.expiring.licences} licence${t.expiring.licences === 1 ? '' : 's'} · ${t.expiring.documents} document${t.expiring.documents === 1 ? '' : 's'}${t.expiring.expired ? ` · ${t.expiring.expired} already expired` : ''}`} />
            <Tile label="CPD on track" value={`${t.cpd.onTrack} / ${t.cpd.of}`} note="clinical staff, verified points" />
            <Tile label={`On time · ${monthLabel(t.punctuality.month)}`} value={t.punctuality.rate === null ? '—' : `${t.punctuality.rate}%`} note="check-ins with a gold or green star" />
          </div>

          <Section title="Headcount by department" actions={dl('headcount')}>
            <Table
              empty="Nobody on the staff in your reach."
              rowKey={(r) => r.departmentId ?? 'none'}
              columns={[
                { key: 'name', label: 'Department', render: (r) => <span className="text-gray-800">{r.name}</span> },
                ...data.cadres.map((c) => ({ key: c.key, label: c.label, num: true, render: (r) => r.counts[c.key] })),
                { key: 'total', label: 'Total', num: true, render: (r) => <b>{r.total}</b> },
                { key: 'owed', label: 'Annual leave owed', num: true, render: (r) => `${fmt(r.leaveOwed)} d` },
              ]}
              rows={data.headcount.rows}
              footer={data.headcount.rows.length > 1 && (
                <tr className="font-semibold text-gray-800">
                  <td className="py-2 px-1">Total</td>
                  {data.cadres.map((c) => <td key={c.key} className="py-2 px-1 text-right tabular-nums">{data.headcount.totals.counts[c.key]}</td>)}
                  <td className="py-2 px-1 text-right tabular-nums">{data.headcount.totals.total}</td>
                  <td className="py-2 px-1 text-right tabular-nums">{fmt(data.headcount.totals.leaveOwed)} d</td>
                </tr>
              )}
            />
            <p className="text-[11px] text-gray-400 mt-2">Staff who are active, on leave or suspended; archived files and people whose end date has passed are not counted. Departments come from the Departments list.</p>
          </Section>

          <Section title={`Joiners and leavers · ${data.year}`} actions={dl('movement')}>
            <div className="grid sm:grid-cols-2 gap-4">
              {[['Joined', data.movement.joined], ['Left', data.movement.left]].map(([label, list]) => (
                <div key={label} className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 mb-1">{label} ({list.length})</p>
                  {list.length ? (
                    <ul className="divide-y divide-gray-100 text-sm">
                      {list.map((p) => (
                        <li key={`${label}-${p.id}`} className="py-1.5 flex flex-wrap gap-x-2">
                          <span className="text-gray-800">{p.name}</span>
                          <span className="text-gray-500">{ROLE_LABEL[p.role] || p.role}{p.department ? ` · ${p.department}` : ''}</span>
                          <span className="ml-auto text-gray-500 tabular-nums">{dayText(p.date)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-gray-400">Nobody.</p>}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">By the start and end dates on each staff file.</p>
          </Section>

          <Section title={`Annual leave owed · ${data.year}`} actions={dl('leave')}>
            {data.leave.policyStatus !== 'published' && (
              <p className="text-xs rounded-lg bg-amber-50 text-amber-700 px-3 py-2 mb-3">
                The {data.year} leave policy isn&apos;t published yet, so entitlements come only from what HR set per person.
              </p>
            )}
            <Table
              empty="Nobody in your reach."
              columns={[
                ...PERSON,
                { key: 'entitled', label: 'Entitled', num: true, render: (r) => (r.annual ? (r.annual.entitled === null ? 'Unlimited' : fmt(r.annual.entitled)) : '—') },
                { key: 'carried', label: 'Carried in', num: true, render: (r) => fmt(r.annual?.carriedIn) },
                { key: 'taken', label: 'Taken', num: true, render: (r) => fmt(r.annual?.taken) },
                { key: 'booked', label: 'Booked', num: true, render: (r) => fmt(r.annual?.booked) },
                { key: 'remaining', label: 'Owed', num: true, render: (r) => <b>{fmt(r.annual?.owed)}</b> },
              ]}
              rows={data.leave.people}
            />
            <p className="text-xs text-gray-600 mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
              {data.leave.sick.hidden
                ? `Sick leave isn't shown: your reach covers fewer than ${data.leave.sick.minimum} people, so a total could point at one person.`
                : `Sick leave taken in ${data.year}: ${fmt(data.leave.sick.days)} days in total across the ${data.leave.sick.people} people in your reach. It is never shown by person or department.`}
            </p>
          </Section>

          <Section
            title="Licences and documents expiring"
            actions={(
              <div className="flex gap-2 items-center">
                <select aria-label="Expiry window" className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))}>
                  {data.windows.map((w) => <option key={w} value={w}>Next {w} days</option>)}
                </select>
                {dl('expiries')}
              </div>
            )}
          >
            <Table
              empty={`Nothing expired and nothing expiring in the next ${data.window} days.`}
              rowKey={(r, i) => `${r.kind}-${r.id}-${i}`}
              columns={[
                ...PERSON,
                { key: 'item', label: 'Item' },
                { key: 'expiryDate', label: 'Expires', render: (r) => dayText(r.expiryDate) },
                { key: 'status', label: '', render: (r) => (r.status === 'expired'
                  ? <Pill tone="bad">Expired {-r.daysLeft} d ago</Pill>
                  : <Pill tone={r.daysLeft <= 30 ? 'warn' : 'n'}>{r.daysLeft === 0 ? 'Today' : `In ${r.daysLeft} d`}</Pill>) },
              ]}
              rows={data.expiries.rows}
            />
            <p className="text-[11px] text-gray-400 mt-2">Practising licences and staff documents with an expiry date. Confidential and health documents are never listed.</p>
          </Section>

          <Section title={`CPD · ${data.year}`} actions={dl('cpd')}>
            <Table
              empty="Nobody in your reach has a CPD target."
              columns={[
                ...PERSON,
                { key: 'progress', label: 'Verified / target', render: (r) => (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-24 h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                      <span className="block h-full bg-primary" style={{ width: `${Math.min(100, (r.verified / r.target) * 100)}%` }} />
                    </span>
                    <span className="tabular-nums">{fmt(r.verified)} / {fmt(r.target)}</span>
                  </span>
                ) },
                { key: 'pending', label: 'Pending', num: true, render: (r) => fmt(r.pending) },
                { key: 'expected', label: 'Expected by now', num: true, render: (r) => fmt(r.expectedByNow) },
                { key: 'status', label: '', render: (r) => <Pill tone={CPD_PILL[r.status]?.[0]}>{CPD_PILL[r.status]?.[1] || r.status}</Pill> },
              ]}
              rows={data.cpd.people}
            />
            <p className="text-[11px] text-gray-400 mt-2">Only verified points count. &quot;On track&quot; means at least the target × the share of the year gone.</p>
          </Section>

          <Section
            title={`Punctuality · ${monthLabel(data.month)}`}
            actions={(
              <div className="flex gap-2 items-center">
                <input type="month" aria-label="Month" className="rounded-lg border border-gray-300 px-2 py-1 text-xs" value={month}
                  max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
                {dl('punctuality')}
              </div>
            )}
          >
            <Table
              empty="Nobody in your reach."
              columns={[
                ...PERSON,
                { key: 'days', label: 'Days in', num: true, render: (r) => `${r.daysWorked} / ${r.workingDays}` },
                { key: 'onTime', label: 'On time', num: true },
                { key: 'late', label: 'Late', num: true },
                { key: 'rate', label: 'On time %', num: true, render: (r) => (r.onTimeRate === null ? '—' : `${r.onTimeRate}%`) },
                { key: 'avgLateMinutes', label: 'Avg late', num: true, render: (r) => (r.late ? `${r.avgLateMinutes} min` : '—') },
                { key: 'earlyOut', label: 'Left early', num: true },
                { key: 'missedCheckouts', label: 'Missed out', num: true },
                { key: 'noCheckIn', label: 'No check-in', num: true },
              ]}
              rows={data.punctuality.people}
            />
            <p className="text-[11px] text-gray-400 mt-2">Counted from the same stars staff see on their own dashboard; only days with expected hours are judged. &quot;No check-in&quot; is a working day with no tap (not on leave).</p>
          </Section>
          <p className="text-[11px] text-gray-400">Every download is logged with your name.</p>
        </>
      )}
    </div>
  );
};

export default HrReports;
