import { useState } from 'react';
import { ArrowLeft, Loader2, ImageOff, Paperclip, Eye, Download, MailOpen, Mail as MailIcon } from 'lucide-react';
import mailService from '../../services/mailService';
import { notify } from '../../utils/notify';
import SafeHtmlFrame from './SafeHtmlFrame';
import { longDate, personName, formatBytes } from './mailFormat';

const PREVIEWABLE = /^(application\/pdf|image\/(png|jpe?g|gif|webp))$/i;

const Addr = ({ a }) => (
  <span title={a.address}>
    {a.name ? <>{a.name} <span className="text-gray-400">&lt;{a.address}&gt;</span></> : a.address}
  </span>
);

/**
 * One open message. The sender's real address is always visible (not just a
 * display name) and anything from outside the clinic's domains is tagged
 * External — both anti-phishing. Remote images stay blocked until the user
 * asks, per message or per sender.
 */
const ReadingPane = ({ message, loading, folder, account, onBack, onMarkUnread, onTrustSender }) => {
  const [allowImages, setAllowImages] = useState(false);
  const [busyPart, setBusyPart] = useState(null);

  if (loading) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }
  if (!message) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
        <MailIcon className="h-8 w-8" /> Pick a message to read it.
      </div>
    );
  }

  const senderTrusted = (account?.trustedImageSenders || []).includes(message.from?.address);
  const imagesOn = allowImages || account?.remoteImagesDefault || senderTrusted;

  const openAttachment = async (att, mode) => {
    setBusyPart(`${att.part}:${mode}`);
    try {
      const blob = await mailService.attachment(message.uid, att.part, folder);
      const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob], { type: att.type }));
      if (mode === 'preview') {
        window.open(url, '_blank', 'noopener');
      } else {
        const a = document.createElement('a');
        a.href = url; a.download = att.filename || 'attachment';
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notify('error', err?.message || 'Could not open the attachment.');
    } finally {
      setBusyPart(null);
    }
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-start gap-2">
          <button type="button" onClick={onBack} className="-ml-1 rounded p-1 text-gray-500 hover:bg-gray-100 md:hidden" aria-label="Back to list">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-base font-semibold text-gray-900">{message.subject || '(no subject)'}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-gray-700">
              {message.from ? <Addr a={message.from} /> : <span>(no sender)</span>}
              {message.external && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">External</span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              {message.to?.length > 0 && <>To: {message.to.map(personName).join(', ')}</>}
              {message.cc?.length > 0 && <> · Cc: {message.cc.map(personName).join(', ')}</>}
              {message.date && <> · {longDate(message.date)}</>}
            </div>
          </div>
          <button
            type="button" onClick={() => onMarkUnread(message)} title="Mark as unread"
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Mark as unread"
          >
            <MailOpen className="h-5 w-5" />
          </button>
        </div>

        {message.hasRemoteContent && !imagesOn && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><ImageOff className="h-4 w-4" /> Images hidden to protect your privacy</span>
            <span className="flex gap-3 font-semibold text-primary">
              <button type="button" onClick={() => setAllowImages(true)} className="hover:underline">Load images</button>
              {message.from?.address && (
                <button type="button" onClick={() => { setAllowImages(true); onTrustSender(message.from.address); }} className="hover:underline">
                  Always for this sender
                </button>
              )}
            </span>
          </div>
        )}

        {message.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <div key={att.part} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                <span className="max-w-[12rem] truncate font-medium text-gray-700" title={att.filename}>{att.filename}</span>
                <span className="text-gray-400">{formatBytes(att.size)}</span>
                {PREVIEWABLE.test(att.type) && (
                  <button type="button" onClick={() => openAttachment(att, 'preview')} disabled={!!busyPart} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline disabled:opacity-50">
                    {busyPart === `${att.part}:preview` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} Preview
                  </button>
                )}
                <button type="button" onClick={() => openAttachment(att, 'download')} disabled={!!busyPart} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline disabled:opacity-50">
                  {busyPart === `${att.part}:download` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <SafeHtmlFrame key={`${message.uid}:${imagesOn}`} html={message.html} allowRemote={imagesOn} title={message.subject || 'Email message'} />
      </div>
    </div>
  );
};

export default ReadingPane;
