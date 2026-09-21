import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageCircle, ExternalLink, Paperclip } from 'lucide-react';
import commsService from '../../services/commsService';
import { fmtDay, fmtTime } from '../inbox/inboxHelpers';

// Patient file → Communications: this patient's full messaging trail
// (merge-aware on the server), with date / channel / query filters, resolution
// notes shown inline, and a way to open the thread in the Inbox or start a new
// WhatsApp message.
const PatientCommunicationsTab = ({ patient, uhid, portal = 'doctor' }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({ messages: [], conversations: [] });
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await commsService.patientTrail(uhid, { show: show === 'all' ? undefined : show, from: from || undefined, to: to || undefined });
      setData(r.data);
    } catch { /* interceptor */ } finally { setLoading(false); }
  }, [uhid, show, from, to]);
  useEffect(() => { load(); }, [load]);

  const startMessage = async () => {
    try {
      await commsService.startForPatient(uhid);
      navigate(`/${portal}/inbox?tab=whatsapp`);
    } catch (e) { toast.error(e.message || 'Could not start a conversation.'); }
  };

  const messages = data.messages || [];
  let lastDay = '';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {[['all', 'All'], ['queries', 'Queries'], ['internal', 'Internal notes']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setShow(k)} className={`rounded-full px-3 py-1 text-xs ${show === k ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{l}</button>
          ))}
        </div>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border-gray-300 text-xs" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border-gray-300 text-xs" />
        <button type="button" onClick={startMessage} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"><MessageCircle size={15} /> Message on WhatsApp</button>
      </div>

      {loading && <div className="py-6 text-center text-sm text-gray-400">Loading…</div>}
      {!loading && messages.length === 0 && <div className="py-8 text-center text-sm text-gray-400">No WhatsApp messages for this patient yet.</div>}

      <div className="space-y-1">
        {messages.slice().reverse().map((m) => {
          const day = fmtDay(m.createdAt);
          const showDay = day !== lastDay; lastDay = day;
          const dir = m.direction;
          return (
            <div key={m.id}>
              {showDay && <div className="my-2 text-center text-[11px] text-gray-400">{day}</div>}
              <div className={`rounded-lg border p-2 text-sm ${dir === 'internal' ? 'border-amber-200 bg-amber-50' : dir === 'out' ? 'border-emerald-100 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="font-medium text-gray-600">{dir === 'in' ? 'Patient' : dir === 'internal' ? '🔒 Internal note' : (m.sentBy?.name || 'Clinic')}</span>
                  <span>{fmtTime(m.createdAt)}</span>
                  {m.media && <Paperclip size={11} />}
                  {m.medicalDocumentId && <span className="text-emerald-600">filed</span>}
                </div>
                {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
                {m.caption && <div className="text-gray-600">{m.caption}</div>}
                {m.query && m.query.status === 'completed' && m.query.resolutionNote && (
                  <div className="mt-1 border-t border-black/5 pt-1 text-[11px] text-gray-500">✓ {m.query.resolutionKind} — “{m.query.resolutionNote}”{m.query.resolvedBy ? ` (${m.query.resolvedBy.name})` : ''}</div>
                )}
                {m.query && m.query.status === 'open' && <div className="mt-1 text-[11px] text-blue-600">Query open</div>}
              </div>
            </div>
          );
        })}
      </div>

      {data.conversations?.length > 0 && (
        <button type="button" onClick={() => navigate(`/${portal}/inbox?tab=whatsapp`)} className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"><ExternalLink size={14} /> Open in Inbox</button>
      )}
    </div>
  );
};

export default PatientCommunicationsTab;
