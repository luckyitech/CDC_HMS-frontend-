import { useState, useEffect } from 'react';
import commsService from '../../services/commsService';

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

const InboxAnalytics = ({ isAdmin }) => {
  const [view, setView] = useState('operations');
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button type="button" onClick={() => setView('operations')} className={`rounded-full px-3 py-1 text-xs ${view === 'operations' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>Operations</button>
        {isAdmin && <button type="button" onClick={() => setView('costs')} className={`rounded-full px-3 py-1 text-xs ${view === 'costs' ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>Costs</button>}
      </div>
      {view === 'operations' ? <Operations /> : <Costs />}
    </div>
  );
};

export default InboxAnalytics;
