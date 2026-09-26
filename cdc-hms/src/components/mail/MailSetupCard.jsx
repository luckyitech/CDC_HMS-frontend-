import { useState } from 'react';
import { Mail, Loader2, CheckCircle2, XCircle, Lock } from 'lucide-react';
import mailService from '../../services/mailService';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

/**
 * Guided setup — shown in the My mail tab until the user connects their own
 * clinic mailbox. Three visible steps: address → password → test and connect.
 * Nothing is saved until the provider accepts the login.
 *
 * Also the reconnect form when the saved password stops working
 * (`reconnect` prop): the address is fixed and only the password is asked for.
 */
const MailSetupCard = ({ setup, account = null, reconnect = false, onConnected }) => {
  const [email, setEmail] = useState(account?.emailAddress || setup?.suggestedAddress || '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);   // { ok, text }

  const domains = setup?.domains || [];
  const domainText = domains.map((d) => `@${d}`).join(', ');

  if (setup && !setup.enabled) {
    return <Notice>Email in the HMS is switched off for this clinic.</Notice>;
  }
  if (setup && !setup.configured) {
    return <Notice>Your clinic hasn't set up email in the HMS yet. Ask the administrator.</Notice>;
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const step = result?.ok ? 3 : (emailOk && password ? 2 : (emailOk ? 1 : 0));

  const connect = async (e) => {
    e?.preventDefault();
    if (!emailOk) { setResult({ ok: false, text: 'Enter your clinic email address.' }); return; }
    if (!password) { setResult({ ok: false, text: 'Enter your mailbox password.' }); return; }
    setBusy(true);
    setResult(null);
    try {
      const res = await mailService.connect({ emailAddress: email.trim(), password, displayName: account?.displayName || setup?.suggestedName || undefined });
      setPassword('');
      setResult({ ok: true, text: 'Connected.' });
      onConnected?.(res.data.account);
    } catch (err) {
      setResult({ ok: false, text: err?.message || 'Could not connect.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-center rounded-lg bg-gray-50 px-3 py-6 sm:py-10">
      <form onSubmit={connect} className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <Mail className="mt-0.5 h-6 w-6 flex-shrink-0 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-gray-800">{reconnect ? 'Reconnect your email' : 'Connect your clinic email'}</h3>
            <p className="text-sm text-gray-500">
              {reconnect
                ? 'Your mailbox stopped accepting the saved password — it may have been changed. Enter it again.'
                : `Read your ${domainText || 'clinic'} mail here.`}
              {' '}No one else can open your mailbox in the HMS.
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-1.5 text-[11px] font-semibold">
          {['Address', 'Password', 'Test and connect'].map((label, i) => (
            <span key={label} className={`flex-1 border-t-2 pt-1 ${step > i ? 'border-primary text-primary' : 'border-gray-200 text-gray-400'}`}>
              {i + 1} {label}
            </span>
          ))}
        </div>

        <label htmlFor="mail-setup-email" className="mb-1 block text-xs font-semibold text-gray-600">Email address</label>
        <input
          id="mail-setup-email" type="email" value={email} disabled={reconnect}
          onChange={(e) => { setEmail(e.target.value); setResult(null); }}
          placeholder={domains[0] ? `name@${domains[0]}` : 'name@yourclinic.com'}
          className={`${inputCls} mb-3 disabled:bg-gray-50`} autoComplete="off"
        />
        <label htmlFor="mail-setup-password" className="mb-1 block text-xs font-semibold text-gray-600">Mailbox password</label>
        <input
          id="mail-setup-password" type="password" value={password}
          onChange={(e) => { setPassword(e.target.value); setResult(null); }}
          placeholder="The password you use for webmail or on your phone"
          className={inputCls} autoComplete="new-password"
        />
        <p className="mb-4 mt-1 flex items-center gap-1 text-[11px] text-gray-400">
          <Lock className="h-3 w-3" /> Stored encrypted and never shown again.
        </p>

        {result && (
          <p className={`mb-3 flex items-start gap-1.5 text-sm font-medium ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
            {result.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
            {result.text}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-gray-400">No clinic mailbox yet? Ask the administrator to create one.</span>
          <button
            type="submit" disabled={busy}
            className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {reconnect ? 'Reconnect' : 'Test and connect'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Notice = ({ children }) => (
  <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-12 text-sm text-gray-500">
    <Mail className="h-5 w-5 text-gray-400" /> {children}
  </div>
);

export default MailSetupCard;
