import { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import commsService from '../../services/commsService';
import useDebounce from '../../hooks/useDebounce';
import ConversationList from './ConversationList';
import Thread from './Thread';

// The WhatsApp tab: a conversation list beside the open thread. On phones the
// list collapses to the thread once one is opened (a Back control returns).
const WhatsAppTab = ({ canWrite }) => {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, 300);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await commsService.listConversations({ filter, search: debouncedSearch || undefined });
      setConversations(r.data.conversations || []);
    } catch { /* handled by the interceptor */ }
    finally { setLoading(false); }
  }, [filter, debouncedSearch]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Refresh on the fan-out event MainLayout dispatches on SSE 'comms_new'.
  useEffect(() => {
    const h = () => fetchList();
    window.addEventListener('comms:changed', h);
    const timer = setInterval(fetchList, 60000);
    return () => { window.removeEventListener('comms:changed', h); clearInterval(timer); };
  }, [fetchList]);

  return (
    <div className="flex h-[calc(100vh-11rem)] overflow-hidden rounded-lg border bg-white">
      <div className={`w-full sm:w-80 sm:flex-shrink-0 ${active ? 'hidden sm:block' : 'block'}`}>
        <ConversationList
          conversations={conversations} activeId={active?.id} onSelect={setActive}
          filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} loading={loading}
        />
      </div>
      <div className={`min-w-0 flex-1 ${active ? 'flex' : 'hidden sm:flex'}`}>
        {active ? (
          <div className="flex w-full flex-col">
            <button type="button" onClick={() => setActive(null)} className="border-b px-3 py-1.5 text-left text-xs text-emerald-600 sm:hidden">← Conversations</button>
            <Thread key={active.id} conversationId={active.id} canWrite={canWrite} onChanged={fetchList} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-400">
            <MessageSquare size={40} className="mb-2 opacity-40" />
            <p className="text-sm">Select a conversation to view the thread.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppTab;
