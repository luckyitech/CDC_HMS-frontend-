import { useState, useEffect } from 'react';
import commsService from '../../services/commsService';
import { useUserContext } from '../../contexts/UserContext';
import { passesAdminGate, PERMISSIONS } from '../../utils/permissions';

const Tile = ({ label, value }) => (
  <div className="rounded-lg border bg-white p-3 text-center">
    <div className="text-2xl font-bold text-gray-800">{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

const secs = (s) => (s == null ? '—' : s < 90 ? `${Math.round(s)}s` : `${Math.round(s / 60)}m`);

const Operations = () => {
  const [data, setData] = useState(null);
  useEffect(() => { commsService.analyticsOperations({}).then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="py-6 text-center text-sm text-gray-400">Loading…</div>;
  const t = data.totals; const r = data.responsiveness;
  const maxHeat = Math.max(1, ...(data.heatmap || []).flat());
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Inbound" value={t.inbound} /><Tile label="Outbound" value={t.outbound} />
        <Tile label="Conversations" value={t.conversations} /><Tile label="Patients" value={t.patients} />
        <Tile label="Open queries" value={t.openQueries} /><Tile label="Completed queries" value={t.completedQueries} />
        <Tile label="Documents filed" value={t.documentsFiled} /><Tile label="Escalations" value={t.escalations} />
        <Tile label="Median first reply" value={secs(r.firstReplyMedianSec)} /><Tile label="p90 first reply" value={secs(r.firstReplyP90Sec)} />
        <Tile label="Unanswered" value={r.unanswered} /><Tile label="Templates sent" value={t.templatesSent} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-3">
          <div className="mb-2 text-sm font-semibold">Topics</div>
          {(data.byTopic || []).slice(0, 8).map((x) => <div key={x.topic} className="flex justify-between text-sm"><span className="text-gray-600">{x.topic}</span><span className="font-medium">{x.count}</span></div>)}
        </div>
        <div className="rounded-lg border bg-white p-3">
          <div className="mb-2 text-sm font-semibold">By staff</div>
          {(data.byStaff || []).slice(0, 8).map((x) => <div key={x.staffId} className="flex justify-between text-sm"><span className="text-gray-600">{x.name}</span><span className="font-medium">{x.sent} sent · {x.completed} done</span></div>)}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-3">
        <div className="mb-2 text-sm font-semibold">When patients message (inbound heat-map)</div>
        <div className="overflow-x-auto">
          <table className="text-[10px]">
            <tbody>
              {(data.heatmap || []).map((row, di) => (
                <tr key={di}><td className="pr-1 text-gray-400">{DAYS[di]}</td>
                  {row.map((v, hi) => <td key={hi}><div title={`${DAYS[di]} ${hi}:00 — ${v}`} className="h-3 w-3 rounded-sm" style={{ backgroundColor: v ? `rgba(16,185,129,${0.15 + 0.85 * (v / maxHeat)})` : '#f3f4f6' }} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Costs = () => {
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => { commsService.analyticsCosts({}).then((r) => setData(r.data)).catch((e) => { if (e.status === 403) setDenied(true); }); }, []);
  if (denied) return <div className="py-6 text-center text-sm text-gray-400">Cost analytics is available to administrators.</div>;
  if (!data) return <div className="py-6 text-center text-sm text-gray-400">Loading…</div>;
  const over = data.monthlyBudgetKes > 0 && data.total > data.monthlyBudgetKes;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Tile label="Total (KES)" value={data.total} /><Tile label="Billable messages" value={data.billableMessages} />
        <Tile label={`Budget${data.monthlyBudgetKes ? '' : ' (unset)'}`} value={data.monthlyBudgetKes || '—'} />
      </div>
      {over && <div className="rounded bg-red-50 p-2 text-sm text-red-600">Over the monthly budget of KES {data.monthlyBudgetKes}.</div>}
      <div className="rounded-lg border bg-white p-3">
        <div className="mb-2 text-sm font-semibold">By category</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-400"><th>Category</th><th>Count</th><th>Unit (KES)</th><th className="text-right">Cost</th></tr></thead>
          <tbody>{(data.byCategory || []).map((c) => <tr key={c.category} className="border-t"><td className="capitalize">{c.category}</td><td>{c.count}</td><td>{c.unitRate}</td><td className="text-right">{c.cost}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
};

// Staff Email phase 5 — every email sent/received by connected mailboxes,
// patient-thread reply times, documents emailed, patients contacted. Shows each
// person's mail volume, so it is gated like the Activity Log (admin /
// monitoring.view), not like the Inbox. Metadata only — no subjects or text.
const hrs = (h) => (h == null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h} h` : `${Math.round(h / 24)} d`);
const isoDay = (d) => d.toISOString().slice(0, 10);

const EmailAnalytics = () => {
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState(null);
  useEffect(() => {
    setData(null); setProblem(null);
    commsService.analyticsEmail({ from, to }).then((r) => setData(r.data))
      .catch((e) => setProblem(e.status === 403 ? 'Email analytics is available to administrators and anyone with the Activity Log permission.' : (e.message || 'Could not load email analytics.')));
  }, [from, to]);
  const maxStaff = Math.max(1, ...((data?.byStaff || []).map((x) => x.sent + x.received)));
  const maxDay = Math.max(1, ...((data?.byDay || []).map((x) => x.sent + x.received)));
  // Every day of the range, so a quiet day shows as a gap (not a missing column).
  const days = (() => {
    if (!data) return [];
    const by = new Map((data.byDay || []).map((d) => [d.day, d]));
    const out = [];
    for (let t = new Date(`${data.range.from}T00:00:00Z`); isoDay(t) <= data.range.to && out.length < 400; t = new Date(t.getTime() + 86400000)) {
      out.push(by.get(isoDay(t)) || { day: isoDay(t), sent: 0, received: 0 });
    }
    return out;
  })();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border-gray-300 text-xs" aria-label="From" />
        <span>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border-gray-300 text-xs" aria-label="To" />
        <span className="ml-auto">Connected mailboxes only · metadata, never subjects or text</span>
      </div>
      {problem && <div className="py-6 text-center text-sm text-gray-400">{problem}</div>}
      {!data && !problem && <div className="py-6 text-center text-sm text-gray-400">Loading…</div>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Emails sent" value={data.totals.sent} /><Tile label="Emails received" value={data.totals.received} />
            <Tile label="Sent outside the HMS" value={data.totals.sentElsewhere} /><Tile label="In patient threads" value={data.totals.patientTagged} />
            <Tile label="Patient reply time (median)" value={hrs(data.replyTimes.medianHours)} /><Tile label="p90 reply time" value={hrs(data.replyTimes.p90Hours)} />
            <Tile label="Patients waiting on a reply" value={data.waiting.length} /><Tile label="Documents emailed" value={data.documents.total} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">Volume by staff <span className="font-normal text-gray-400">(sent / received)</span></div>
              {data.byStaff.length === 0 && <div className="text-sm text-gray-400">No mail in this range.</div>}
              {data.byStaff.map((x) => (
                <div key={x.userId} className="mb-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">{x.name}</span><span className="font-medium">{x.sent} / {x.received}</span></div>
                  <div className="flex h-1.5 overflow-hidden rounded bg-gray-100">
                    <div className="bg-blue-600" style={{ width: `${(x.sent / maxStaff) * 100}%` }} title={`${x.sent} sent`} />
                    <div className="bg-sky-300" style={{ width: `${(x.received / maxStaff) * 100}%` }} title={`${x.received} received`} />
                  </div>
                </div>
              ))}
              {data.byStaff.length > 0 && <div className="mt-2 flex gap-3 text-[11px] text-gray-500"><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-600" />Sent</span><span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-300" />Received</span></div>}
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">Per day</div>
              <div className="flex h-28 items-end gap-0.5">
                {days.map((d) => (
                  <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.sent} sent, ${d.received} received`}>
                    <div className="bg-sky-300" style={{ height: `${(d.received / maxDay) * 100}%` }} />
                    <div className="bg-blue-600" style={{ height: `${(d.sent / maxDay) * 100}%` }} />
                  </div>
                ))}
              </div>
              {data.byDay.length === 0 && <div className="text-sm text-gray-400">No mail in this range.</div>}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">Patients waiting on a reply</div>
              {data.waiting.length === 0 && <div className="text-sm text-gray-400">None — every patient thread has been answered.</div>}
              {data.waiting.map((w, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-gray-600"><span className="rounded bg-violet-50 px-1 text-[11px] font-semibold text-violet-800">{w.patient.uhid}</span> {w.patient.name}</span>
                  <span className="whitespace-nowrap font-medium">{hrs(w.waitingHours)}{w.staff ? <span className="font-normal text-gray-400"> · {w.staff}</span> : null}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">Most contacted patients</div>
              {data.patients.length === 0 && <div className="text-sm text-gray-400">No patient threads in this range.</div>}
              {data.patients.map((p, i) => (
                <div key={i} className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-gray-600"><span className="rounded bg-violet-50 px-1 text-[11px] font-semibold text-violet-800">{p.patient.uhid}</span> {p.patient.name}</span>
                  <span className="whitespace-nowrap font-medium">{p.total} <span className="font-normal text-gray-400">({p.out} out · {p.in} in)</span></span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">Documents emailed <span className="font-normal text-gray-400">({data.documents.toPatients} to patients · {data.documents.toOthers} to others)</span></div>
              {data.documents.byCategory.length === 0 && <div className="text-sm text-gray-400">None in this range.</div>}
              {data.documents.byCategory.map((c) => <div key={c.category} className="flex justify-between text-sm"><span className="text-gray-600">{c.category}</span><span className="font-medium">{c.count}</span></div>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const InboxAnalytics = ({ isAdmin }) => {
  const { currentUser } = useUserContext();
  const canEmail = passesAdminGate(currentUser, PERMISSIONS.MONITORING_VIEW);
  const [view, setView] = useState('operations');
  const pill = (v) => `rounded-full px-3 py-1 text-xs ${view === v ? 'bg-gray-800 text-white' : 'bg-gray-100'}`;
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => setView('operations')} className={pill('operations')}>Operations</button>
        {canEmail && <button type="button" onClick={() => setView('email')} className={pill('email')}>Email</button>}
        {isAdmin && <button type="button" onClick={() => setView('costs')} className={pill('costs')}>Costs</button>}
      </div>
      {view === 'operations' ? <Operations /> : view === 'email' ? <EmailAnalytics /> : <Costs />}
    </div>
  );
};

export default InboxAnalytics;
