import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { MoreVertical, CheckCircle2, Archive } from 'lucide-react';
import commsService from '../../services/commsService';
import MessageBubble from './MessageBubble';
import Composer from './Composer';
import PatientRail from './PatientRail';
import FileToRecordModal from './FileToRecordModal';
import BookFromChat from './BookFromChat';
import EscalateForm from './EscalateForm';
import ReminderForm from './ReminderForm';
import { fmtDay, contactName } from './inboxHelpers';

const Thread = ({ conversationId, canWrite, onChanged }) => {
  const [conversation, setConversation] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [modal, setModal] = useState(null);   // 'file' | 'book' | 'escalate' | 'reminder'
  const [fileMsg, setFileMsg] = useState(null);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, m] = await Promise.all([commsService.getConversation(conversationId), commsService.getMessages(conversationId)]);
      setConversation(d.data.conversation);
      setCandidates(d.data.candidates || []);
      setMessages(m.data.messages || []);
      if (canWrite) commsService.markRead(conversationId).then(() => onChanged?.()).catch(() => {});
    } catch (e) { toast.error(e.message || 'Could not load the conversation.'); }
    finally { setLoading(false); }
  }, [conversationId, canWrite, onChanged]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { commsService.listTemplates().then((r) => setTemplates(r.data.templates || [])).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const refresh = useCallback(async () => {
    const m = await commsService.getMessages(conversationId);
    setMessages(m.data.messages || []);
    const d = await commsService.getConversation(conversationId);
    setConversation(d.data.conversation);
    setCandidates(d.data.candidates || []);
    onChanged?.();
  }, [conversationId, onChanged]);

  const act = async (fn, okMsg) => {
    try { await fn(); if (okMsg) toast.success(okMsg); await refresh(); }
    catch (e) {
      if (e?.data?.code === 'windowClosed') toast.error('The 24-hour window has closed — send a template instead.');
      else toast.error(e.message || 'Action failed.');
    }
  };

  const sendText = async (text) => { setSending(true); try { await commsService.sendText(conversationId, text); await refresh(); } catch (e) { toast.error(e.message || 'Send failed.'); } finally { setSending(false); } };
  const sendTemplate = async (payload) => { setSending(true); try { await commsService.sendTemplate(conversationId, payload); await refresh(); } catch (e) { toast.error(e.message || 'Template send failed.'); } finally { setSending(false); } };
  const sendMedia = async (file) => {
    setSending(true);
    try { const fd = new FormData(); fd.append('file', file); await commsService.sendMedia(conversationId, fd); await refresh(); }
    catch (e) { toast.error(e.message || 'Attachment send failed.'); } finally { setSending(false); }
  };

  const openMedia = async (message) => {
    try { const blob = await commsService.getMedia(message.id); const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); }
    catch { toast.error('Could not open the file.'); }
  };

  if (loading || !conversation) return <div className="flex flex-1 items-center justify-center text-sm text-gray-400">Loading…</div>;
  const name = contactName(conversation);
  const lastInbound = [...messages].reverse().find((m) => m.direction === 'in');

  let lastDay = '';
  return (
    <div className="flex h-full flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-2">
          <div>
            <div className="font-semibold text-gray-800">{name}</div>
            <div className="text-xs text-gray-400">{[conversation.displayNumber, conversation.channel?.label || 'WhatsApp'].filter(Boolean).join(' · ')}</div>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2 text-gray-500">
              <button type="button" title={conversation.status === 'closed' ? 'Reopen' : 'Close'} onClick={() => act(() => conversation.status === 'closed' ? commsService.reopen(conversationId) : commsService.close(conversationId), conversation.status === 'closed' ? 'Reopened' : 'Closed')} className="rounded p-1.5 hover:bg-gray-100">{conversation.status === 'closed' ? <CheckCircle2 size={17} /> : <Archive size={17} />}</button>
              <MoreVertical size={17} />
            </div>
          )}
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto bg-gray-100 px-3 py-2">
          {messages.map((m) => {
            const day = fmtDay(m.createdAt);
            const showDay = day !== lastDay; lastDay = day;
            return (
              <div key={m.id}>
                {showDay && <div className="my-2 text-center"><span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-500 shadow-sm">{day}</span></div>}
                <MessageBubble
                  message={m} canWrite={canWrite} onOpenMedia={openMedia}
                  onComplete={(msg, data) => act(() => commsService.completeQuery(msg.id, data), 'Query completed')}
                  onReopen={(msg) => act(() => commsService.reopenQuery(msg.id), 'Query reopened')}
                  onFile={(msg) => { setFileMsg(msg); setModal('file'); }}
                />
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {canWrite && (
          <Composer conversation={conversation} templates={templates} sending={sending}
            onSendText={sendText} onSendTemplate={sendTemplate} onSendMedia={sendMedia}
            onInternalNote={(text) => act(() => commsService.internalNote(conversationId, text))} />
        )}
      </div>

      <div className="hidden w-72 flex-shrink-0 lg:block">
        <PatientRail
          conversation={conversation} candidates={candidates} lastInboundText={lastInbound?.body} canWrite={canWrite}
          onLink={(uhid, moveEarlier) => act(() => commsService.link(conversationId, { uhid, moveEarlier }), 'Linked')}
          onUnlink={() => act(() => commsService.unlink(conversationId, 'manual'), 'Unlinked')}
          onSetContactType={(data) => act(() => commsService.setContactType(conversationId, data))}
          onSetTopic={(topic) => act(() => commsService.setTopic(conversationId, topic))}
          onPin={() => act(() => commsService.pin(conversationId))}
          onUnpin={() => act(() => commsService.unpin(conversationId))}
          onBook={() => setModal('book')} onEscalate={() => setModal('escalate')} onReminder={() => setModal('reminder')}
        />
      </div>

      {modal === 'file' && <FileToRecordModal isOpen onClose={() => setModal(null)} message={fileMsg} defaultPatient={conversation.patient} onFiled={refresh} />}
      {modal === 'book' && <BookFromChat isOpen onClose={() => setModal(null)} conversation={conversation} onBooked={refresh} />}
      {modal === 'escalate' && <EscalateForm isOpen onClose={() => setModal(null)} conversation={conversation} onDone={refresh} />}
      {modal === 'reminder' && <ReminderForm isOpen onClose={() => setModal(null)} conversation={conversation} onDone={refresh} />}
    </div>
  );
};

export default Thread;
