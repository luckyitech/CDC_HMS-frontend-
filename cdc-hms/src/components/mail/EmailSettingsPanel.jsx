import { useState } from 'react';
import { ArrowLeft, ShieldCheck, AlertTriangle, X, Unplug } from 'lucide-react';
import Toggle from '../shared/Toggle';
import ConfirmActionModal from '../shared/ConfirmActionModal';
import mailService from '../../services/mailService';
import { notify } from '../../utils/notify';
import MailSetupCard from './MailSetupCard';
import { longDate } from './mailFormat';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

/**
 * The user's own email settings (gear in the My mail toolbar). Connection
 * status, reconnect with a new password, the name people see, image privacy,
 * and Disconnect. Only ever the signed-in person's own mailbox.
 */
const EmailSettingsPanel = ({ account, setup, onChange, onClose }) => {
  const [displayName, setDisplayName] = useState(account.displayName || '');
  const [saving, setSaving] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [showReconnect, setShowReconnect] = useState(account.status !== 'connected');

  const save = async (prefs, msg) => {
    setSaving(true);
    try {
      const res = await mailService.updatePreferences(prefs);
      onChange(res.data.account);
      if (msg) notify('success', msg);
    } catch (err) {
      notify('error', err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    setConfirmOff(false);
    try {
      const res = await mailService.disconnect();
      notify('success', 'Mailbox disconnected. Your mail is untouched on the server.');
      onChange(res.data.account);
    } catch (err) {
      notify('error', err?.message || 'Could not disconnect.');
    }
  };

  const connected = account.status === 'connected';

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Back to mail">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold text-gray-800">Email settings</h3>
      </div>

      <div className="space-y-6 p-4 sm:p-5">
        <section className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm ${
          connected ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
          {connected ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="font-semibold">{account.emailAddress}</span>
          <span className="text-xs opacity-80">
            {connected ? `Connected${account.lastConnectedAt ? ` · last signed in ${longDate(account.lastConnectedAt)}` : ''}` : (account.lastError || 'Needs your password again')}
          </span>
          <span className="text-xs opacity-80 sm:ml-auto">No one else can open your mailbox in the HMS.</span>
        </section>

        {showReconnect ? (
          <MailSetupCard setup={setup} account={account} reconnect onConnected={(a) => { onChange(a); setShowReconnect(false); }} />
        ) : (
          <button type="button" onClick={() => setShowReconnect(true)} className="text-sm font-semibold text-primary hover:underline">
            Changed your mailbox password? Enter the new one
          </button>
        )}

        <section>
          <label htmlFor="mail-display-name" className="mb-1 block text-xs font-semibold text-gray-600">Your name as people see it</label>
          <div className="flex gap-2">
            <input id="mail-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} placeholder="Dr. Jane Doe" />
            <button
              type="button" disabled={saving || displayName === (account.displayName || '')}
              onClick={() => save({ displayName }, 'Name saved.')}
              className="rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Used on mail you send from the HMS.</p>
        </section>

        <section>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Load images automatically</p>
              <p className="text-xs text-gray-500">Off keeps senders from tracking when you open their mail. You can still load images one message at a time.</p>
            </div>
            <Toggle
              checked={!!account.remoteImagesDefault} disabled={saving} label="Load images automatically"
              onChange={(v) => save({ remoteImagesDefault: v }, v ? 'Images will load automatically.' : 'Images stay hidden until you load them.')}
            />
          </div>
          {(account.trustedImageSenders || []).length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold text-gray-600">Always load images from</p>
              <div className="flex flex-wrap gap-1.5">
                {account.trustedImageSenders.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                    {s}
                    <button
                      type="button" aria-label={`Stop loading images from ${s}`} disabled={saving}
                      onClick={() => save({ trustedImageSenders: account.trustedImageSenders.filter((x) => x !== s) })}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="border-t pt-4">
          <button type="button" onClick={() => setConfirmOff(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700">
            <Unplug className="h-4 w-4" /> Disconnect this mailbox
          </button>
          <p className="mt-1 text-[11px] text-gray-400">The HMS forgets your password. Your mail stays on the server and on your other devices.</p>
        </section>
      </div>

      <ConfirmActionModal
        isOpen={confirmOff}
        onClose={() => setConfirmOff(false)}
        onConfirm={disconnect}
        title="Disconnect your mailbox?"
        message="The HMS will forget your mailbox password and stop showing your mail. Nothing is deleted from your mailbox."
        confirmLabel="Disconnect"
        confirmVariant="danger"
      />
    </div>
  );
};

export default EmailSettingsPanel;
