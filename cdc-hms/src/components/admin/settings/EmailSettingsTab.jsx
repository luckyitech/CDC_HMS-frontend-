import { useEffect, useState } from 'react';
import { Mail, Globe, ShieldBan, Users, Loader2, Plus, X, Unplug, Lock } from 'lucide-react';
import Card from '../../shared/Card';
import Toggle from '../../shared/Toggle';
import Button from '../../shared/Button';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import settingsService from '../../../services/settingsService';
import mailService from '../../../services/mailService';
import { notify } from '../../../utils/notify';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const Label = ({ children }) => <label className="block text-xs font-semibold text-gray-600 mb-1">{children}</label>;
const STATUS = {
  connected: ['Connected', 'bg-green-50 text-green-800'],
  needs_password: ['Needs password', 'bg-amber-50 text-amber-800'],
  error: ['Error', 'bg-red-50 text-red-800'],
  disconnected: ['Disconnected', 'bg-gray-100 text-gray-600'],
};
const EMPTY_DOMAIN = { domain: '', provider: 'onecom', imapHost: '', imapPort: 993, imapSecure: true, smtpHost: '', smtpPort: 465, smtpSecure: true };

/**
 * System Settings → Email (Staff Email, B26). Which email domains staff may
 * connect in My mail, and the mail servers for each (a provider preset, or
 * custom). NOTHING ships pre-filled — each clinic enters its own domain.
 * No mailbox password lives here: each person enters their own, and nobody
 * here can open anyone's mail. The connected-mailboxes list shows status only.
 */
const EmailSettingsTab = () => {
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DOMAIN);
  const [newBlocked, setNewBlocked] = useState('');
  const [mailboxes, setMailboxes] = useState(null);
  const [confirmUser, setConfirmUser] = useState(null);

  const loadMailboxes = () => mailService.adminAccounts().then((r) => setMailboxes(r.data.accounts || [])).catch(() => setMailboxes([]));
  useEffect(() => {
    settingsService.getEmail().then((r) => setCfg(r.data)).catch((err) => notify('error', err?.message || 'Could not load the Email settings.'));
    loadMailboxes();
  }, []);

  const save = async (changes, msg) => {
    setSaving(true);
    try {
      const res = await settingsService.setEmail(changes);
      setCfg(res.data);
      if (msg) notify('success', msg);
      return true;
    } catch (err) {
      notify('error', err?.message || 'Could not save.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addDomain = async () => {
    const d = { ...draft, domain: draft.domain.trim().toLowerCase().replace(/^@/, '') };
    if (!d.domain) { notify('error', 'Enter a domain, e.g. yourclinic.com.'); return; }
    const entry = d.provider === 'custom' ? d : { domain: d.domain, provider: d.provider };
    if (await save({ domains: [...cfg.domains, entry] }, `Staff can now connect @${d.domain} mailboxes.`)) setDraft(EMPTY_DOMAIN);
  };
  const removeDomain = (domain) => save({ domains: cfg.domains.filter((x) => x.domain !== domain) }, `Removed @${domain}.`);

  const addBlocked = async () => {
    const v = newBlocked.trim().toLowerCase();
    if (!v) return;
    if (await save({ blockedAddresses: [...cfg.blockedAddresses, v] }, `${v} can no longer be connected.`)) setNewBlocked('');
  };

  const disconnect = async () => {
    const u = confirmUser;
    setConfirmUser(null);
    try {
      await mailService.adminDisconnect(u.userId);
      notify('success', `${u.name || u.emailAddress}'s saved mailbox password was forgotten.`);
      loadMailboxes();
    } catch (err) {
      notify('error', err?.message || 'Could not disconnect.');
    }
  };

  if (!cfg) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const providerLabel = (key) => (cfg.providers.find((p) => p.key === key) || {}).label || key;

  return (
    <div className="space-y-5">
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm ${
        cfg.enabled && cfg.domains.length ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <Mail className="w-5 h-5 flex-shrink-0" />
        <span className="font-semibold">
          {!cfg.enabled ? 'Email in the HMS is off' : cfg.domains.length ? `Staff can connect ${cfg.domains.map((d) => `@${d.domain}`).join(', ')} mailboxes` : 'No email domain set up yet'}
        </span>
        <span className="text-xs opacity-80 sm:ml-auto flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Each person enters their own password. No one can open another person's mail here.</span>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-700" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">My mail in the Inbox</h3>
              <p className="text-sm text-gray-500">Lets staff read their own clinic email in the HMS.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-700">{cfg.enabled ? 'On' : 'Off'}</span>
            <Toggle checked={!!cfg.enabled} disabled={saving} label="Email in the HMS"
              onChange={() => save({ enabled: !cfg.enabled }, cfg.enabled ? 'Email in the HMS turned off.' : 'Email in the HMS turned on.')} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 pb-4 border-b">
          <Globe className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Allowed email domains</h3>
            <p className="text-sm text-gray-500">Only addresses on these domains can be connected. Pick the provider that hosts the mail, or enter the servers yourself.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {cfg.domains.length === 0 && <p className="text-sm text-amber-700">No domain yet — nobody can connect a mailbox until one is added.</p>}
          {cfg.domains.map((d) => (
            <div key={d.domain} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <span className="font-semibold text-gray-800">@{d.domain}</span>
              <span className="text-xs text-gray-500">
                {d.provider === 'custom' ? `Custom · IMAP ${d.imapHost}:${d.imapPort} · SMTP ${d.smtpHost}:${d.smtpPort}` : providerLabel(d.provider)}
              </span>
              <button type="button" onClick={() => removeDomain(d.domain)} disabled={saving} className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1 disabled:opacity-50">
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Domain</Label>
            <input value={draft.domain} onChange={(e) => setDraft({ ...draft, domain: e.target.value })} placeholder="yourclinic.com" className={inputCls} />
          </div>
          <div>
            <Label>Mail provider</Label>
            <select value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} className={inputCls}>
              {cfg.providers.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          {draft.provider === 'custom' && (
            <>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div className="col-span-2"><Label>IMAP host</Label><input value={draft.imapHost} onChange={(e) => setDraft({ ...draft, imapHost: e.target.value })} placeholder="imap.provider.com" className={inputCls} /></div>
                <div><Label>Port</Label><input type="number" value={draft.imapPort} onChange={(e) => setDraft({ ...draft, imapPort: Number(e.target.value) })} className={inputCls} /></div>
                <div className="col-span-2"><Label>SMTP host</Label><input value={draft.smtpHost} onChange={(e) => setDraft({ ...draft, smtpHost: e.target.value })} placeholder="smtp.provider.com" className={inputCls} /></div>
                <div><Label>Port</Label><input type="number" value={draft.smtpPort} onChange={(e) => setDraft({ ...draft, smtpPort: Number(e.target.value) })} className={inputCls} /></div>
              </div>
              <p className="text-xs text-gray-500 sm:col-span-2">Both use SSL/TLS. Providers that only allow Microsoft or Google sign-in (not a password) aren't supported yet.</p>
            </>
          )}
        </div>
        <div className="mt-3">
          <Button onClick={addDomain} disabled={saving || !draft.domain.trim()} className="!px-4 !py-2 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add domain
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 pb-4 border-b">
          <ShieldBan className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Shared mailboxes that can't be connected</h3>
            <p className="text-sm text-gray-500">System mailboxes the HMS uses itself. Reading them in My mail would, for example, mark lab reports read before the Lab Inbox imports them.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {cfg.systemAddresses.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700" title="Used by the HMS — always blocked">
              <Lock className="w-3 h-3" /> {a}
            </span>
          ))}
          {cfg.blockedAddresses.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              {a}
              <button type="button" aria-label={`Allow ${a}`} disabled={saving} onClick={() => save({ blockedAddresses: cfg.blockedAddresses.filter((x) => x !== a) })} className="text-gray-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={newBlocked} onChange={(e) => setNewBlocked(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBlocked(); } }}
            placeholder="info@yourclinic.com" className={inputCls} />
          <Button onClick={addBlocked} disabled={saving || !newBlocked.trim()} className="!px-4 !py-2 text-sm"><Plus className="w-4 h-4" /> Block</Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3 pb-4 border-b">
          <Users className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Connected mailboxes</h3>
            <p className="text-sm text-gray-500">Who has connected, and whether it's working. You can make the HMS forget someone's saved password; you can't open their mail.</p>
          </div>
        </div>
        {mailboxes === null ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : mailboxes.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No one has connected a mailbox yet.</p>
        ) : (
          <div className="mt-3 divide-y">
            {mailboxes.map((m) => {
              const [label, cls] = STATUS[m.status] || STATUS.error;
              return (
                <div key={m.userId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="font-medium text-gray-800">{m.name || '—'}</span>
                  <span className="text-gray-500">{m.emailAddress}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                  {m.status !== 'disconnected' && (
                    <button type="button" onClick={() => setConfirmUser(m)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
                      <Unplug className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ConfirmActionModal
        isOpen={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={disconnect}
        title="Disconnect this mailbox?"
        message={confirmUser ? `The HMS will forget ${confirmUser.name || confirmUser.emailAddress}'s saved mailbox password. Their mail is not touched; they can reconnect any time.` : ''}
        confirmLabel="Disconnect"
        confirmVariant="danger"
      />
    </div>
  );
};

export default EmailSettingsTab;
