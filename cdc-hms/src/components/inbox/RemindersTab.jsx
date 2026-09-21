import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Bell, Check, Clock, X } from 'lucide-react';
import commsService from '../../services/commsService';
import { fmtRelative } from './inboxHelpers';

const FILTERS = [['due', 'Due now'], ['today', 'Today'], ['week', 'This week']];

const RemindersTab = ({ canWrite }) => {
  const [filter, setFilter] = useState('due');
  const [mine, setMine] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await commsService.listReminders({ filter, mine: mine ? 1 : undefined }); setReminders(r.data.reminders || []); }
    catch { /* interceptor */ } finally { setLoading(false); }
  }, [filter, mine]);
  useEffect(() => { load(); }, [load]);

  const action = async (id, act, body) => {
    try { await commsService.reminderAction(id, act, body); toast.success('Updated.'); load(); }
    catch (e) { toast.error(e.message || 'Failed.'); }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, l]) => <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 text-xs ${filter === k ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>)}
        <label className="ml-auto flex items-center gap-1 text-xs text-gray-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only mine</label>
      </div>
      {loading && <div className="py-6 text-center text-sm text-gray-400">Loading…</div>}
      {!loading && reminders.length === 0 && <div className="py-8 text-center text-sm text-gray-400"><Bell className="mx-auto mb-2 opacity-40" /> No reminders.</div>}
      <ul className="divide-y">
        {reminders.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
            <Clock size={15} className={new Date(r.remindAt) <= new Date() ? 'text-red-500' : 'text-gray-400'} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-gray-800">{r.note || '(no note)'}</div>
              <div className="text-xs text-gray-400">{r.profileName || 'Conversation'} · {fmtRelative(r.remindAt)}{r.forUser ? ` · for ${r.forUser.name}` : ''}</div>
            </div>
            {canWrite && (
              <div className="flex gap-1">
                <button type="button" onClick={() => action(r.id, 'done')} className="rounded p-1 text-emerald-600 hover:bg-emerald-50" title="Done"><Check size={15} /></button>
                <button type="button" onClick={() => action(r.id, 'snooze', { remindAt: new Date(Date.now() + 3600_000).toISOString() })} className="rounded p-1 text-blue-500 hover:bg-blue-50" title="Snooze 1h"><Clock size={15} /></button>
                <button type="button" onClick={() => action(r.id, 'cancel')} className="rounded p-1 text-gray-400 hover:bg-gray-100" title="Cancel"><X size={15} /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RemindersTab;
