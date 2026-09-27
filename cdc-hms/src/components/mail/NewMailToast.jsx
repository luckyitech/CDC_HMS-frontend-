import { useEffect } from 'react';
import { Mail, X } from 'lucide-react';
import { personName } from './mailFormat';

const SHOW_FOR_MS = 12_000;

/**
 * Staff Email phase 3b — "new email" toast. Shown only on the Inbox page
 * (Emu, 26 Sep: never over a consultation or the queue); the unread dot in the
 * sidebar is what the rest of the HMS sees. Sender name + subject come from
 * the person's own mailbox and are never stored.
 */
const NewMailToast = ({ message, onOpen, onDismiss }) => {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDismiss, SHOW_FOR_MS);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="status" aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-lg border bg-white px-3 py-2.5 shadow-lg"
    >
      <Mail className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">New email · {personName(message.from) || 'Unknown sender'}</p>
        <p className="truncate text-sm text-gray-600">{message.subject || '(no subject)'}</p>
      </div>
      <button type="button" onClick={onOpen} className="text-sm font-semibold text-primary hover:underline">Open</button>
      <button type="button" onClick={onDismiss} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default NewMailToast;
