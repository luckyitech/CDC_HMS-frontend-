import { useEffect, useState } from 'react';
import { Mail, ShieldCheck, Clock, ListChecks, Loader2, CheckCircle2, XCircle, Plus, X, Inbox } from 'lucide-react';
import Card from '../../shared/Card';
import Toggle from '../../shared/Toggle';
import Button from '../../shared/Button';
import settingsService from '../../../services/settingsService';
import { notify } from '../../../utils/notify';
import { timeAgo } from '../../../utils/labInboxHelpers';

// IMAP presets — picking one fills host/port/SSL; everything stays editable.
const PRESETS = {
  'one.com':   { host: 'imap.one.com',           port: 993, secure: true },
  'gmail':     { host: 'imap.gmail.com',         port: 993, secure: true },
  'microsoft': { host: 'outlook.office365.com',  port: 993, secure: true },
  'custom':    null,
};
const PRESET_LABELS = { 'one.com': 'one.com', gmail: 'Gmail / Google Workspace', microsoft: 'Microsoft 365 / Outlook', custom: 'Custom' };
const presetFor = (host) => Object.keys(PRESETS).find((k) => PRESETS[k] && PRESETS[k].host === host) || 'custom';

const INTERVALS = [5, 10, 15, 30, 60];
const AFTER = [
  { value: 'markRead', label: 'Mark as read' },
  { value: 'move',     label: 'Move to a folder' },
  { value: 'none',     label: 'Leave as-is' },
];

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50';
const Label = ({ children }) => <label className="block text-xs font-semibold text-gray-600 mb-1">{children}</label>;

/**
 * System Settings → Lab Inbox. The clinic mailbox the labs email reports to,
 * the auto-import schedule, and the sender allowlist. NOTHING is pre-filled —
 * each clinic connects its own mailbox here. The password is sent once and
 * stored encrypted; the API only ever tells us whether one is saved.
 */
const LabInboxSettingsTab = () => {
  const [cfg, setCfg] = useState(null);          // server truth (redacted)
  const [form, setForm] = useState(null);        // connection form (editable)
  const [preset, setPreset] = useState('one.com');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newSender, setNewSender] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const res = await settingsService.getLabInbox();
      const c = res.data;
      setCfg(c);
      setForm({ host: c.host || '', port: c.port || 993, secure: c.secure !== false, user: c.user || '', password: '', mailbox: c.mailbox || 'INBOX' });
      setPreset(c.host ? presetFor(c.host) : 'one.com');
      if (!c.host) setForm((f) => ({ ...f, ...PRESETS['one.com'] }));
    } catch (err) {
      notify('error', err?.message || 'Could not load the Lab Inbox settings.');
    }
  };
  useEffect(() => { load(); }, []);

  const applyPreset = (key) => {
    setPreset(key);
    if (PRESETS[key]) setForm((f) => ({ ...f, ...PRESETS[key] }));
  };

  const save = async (changes, okMessage) => {
    setSaving(true);
    try {
      const res = await settingsService.setLabInbox(changes);
      setCfg(res.data);
      if (okMessage) notify('success', okMessage);
      return true;
    } catch (err) {
      notify('error', err?.message || 'Could not save.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveConnection = async () => {
    if (!form.host || !form.user) { notify('error', 'Email address and IMAP host are required.'); return; }
    if (!form.password && !cfg?.hasPassword) { notify('error', 'Enter the mailbox password.'); return; }
    const changes = { host: form.host, port: Number(form.port), secure: !!form.secure, user: form.user, mailbox: form.mailbox || 'INBOX' };
    if (form.password) changes.password = form.password;
    const ok = await save(changes, 'Mailbox connection saved.');
    if (ok) { setForm((f) => ({ ...f, password: '' })); setTestResult(null); }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const values = { host: form.host, port: Number(form.port), secure: !!form.secure, user: form.user, mailbox: form.mailbox || 'INBOX' };
      if (form.password) values.password = form.password;
      const res = await settingsService.testLabInbox(values);
      setTestResult({ ok: true, ...res.data });
    } catch (err) {
      setTestResult({ ok: false, message: err?.message || 'Connection failed.' });
    } finally {
      setTesting(false);
    }
  };

  const addSender = async () => {
    const v = newSender.trim().toLowerCase();
    if (!v) return;
    setAdding(true);
    const ok = await save({ allowlist: [...(cfg?.allowlist || []), v] }, `Added ${v}.`);
    if (ok) setNewSender('');
    setAdding(false);
  };
  const removeSender = (entry) => save({ allowlist: (cfg?.allowlist || []).filter((e) => e !== entry) }, `Removed ${entry}.`);

  if (!cfg || !form) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const lp = cfg.lastPoll;

  return (
    <div className="space-y-5">
      {/* status strip */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-3 text-sm ${
        cfg.isConfigured ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}>
        <ShieldCheck className="w-5 h-5 flex-shrink-0" />
        <span className="font-semibold">{cfg.isConfigured ? `Connected mailbox: ${cfg.user}` : 'No mailbox connected yet'}</span>
        <span className="text-xs opacity-80">
          {cfg.isConfigured
            ? (lp ? (lp.ok ? `Last check ${timeAgo(lp.at)} — ${lp.imported ?? 0} imported` : `Last check failed ${timeAgo(lp.at)}: ${lp.error}`) : 'Not checked yet')
            : 'The system ships with no email configured — set it up below so this clinic’s labs can be imported.'}
        </span>
        <span className="text-xs opacity-80 sm:ml-auto">Password is stored encrypted and never shown.</span>
      </div>

      {/* connection */}
      <Card>
        <div className="flex items-center gap-3 pb-4 border-b">
          <Mail className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Incoming mail connection</h3>
            <p className="text-sm text-gray-500">IMAP details from your email provider. Pick a preset or enter them by hand.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div>
            <Label>Provider preset</Label>
            <select value={preset} onChange={(e) => applyPreset(e.target.value)} className={inputCls}>
              {Object.keys(PRESET_LABELS).map((k) => <option key={k} value={k}>{PRESET_LABELS[k]}</option>)}
            </select>
          </div>
          <div>
            <Label>Email address (the mailbox labs send to)</Label>
            <input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="reports@yourclinic.com" className={inputCls} autoComplete="off" />
          </div>
          <div>
            <Label>IMAP host</Label>
            <input value={form.host} onChange={(e) => { setForm({ ...form, host: e.target.value }); setPreset(presetFor(e.target.value)); }} placeholder="imap.one.com" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Port</Label>
              <input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className={inputCls} />
            </div>
            <div>
              <Label>SSL / TLS</Label>
              <div className="flex items-center h-[38px] gap-2 text-sm text-gray-700">
                <Toggle checked={!!form.secure} onChange={() => setForm({ ...form, secure: !form.secure })} label="SSL" />
                {form.secure ? 'On' : 'Off'}
              </div>
            </div>
          </div>
          <div>
            <Label>Password {cfg.hasPassword && <span className="text-green-700 font-normal">— saved ✓ (enter again only to change)</span>}</Label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={cfg.hasPassword ? '••••••••••••' : 'Mailbox password'} className={inputCls} autoComplete="new-password" />
          </div>
          <div>
            <Label>Folder</Label>
            <input value={form.mailbox} onChange={(e) => setForm({ ...form, mailbox: e.target.value })} className={inputCls} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t">
          <Button variant="outline" onClick={test} disabled={testing || saving} className="!px-4 !py-2 text-sm">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />} Test connection
          </Button>
          <Button onClick={saveConnection} disabled={saving || testing} className="!px-4 !py-2 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save connection
          </Button>
          {testResult && (
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.ok
                ? `Connected — ${testResult.messages ?? 0} messages in ${testResult.mailbox}, ${testResult.unseen ?? 0} unread`
                : testResult.message}
            </span>
          )}
        </div>
      </Card>

      {/* auto-import */}
      <Card>
        <div className="flex items-center justify-between gap-4 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-700" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Auto-import</h3>
              <p className="text-sm text-gray-500">Check the mailbox on a schedule. Staff can always press “Pull now” on the Lab Inbox.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-gray-700">{cfg.enabled ? 'On' : 'Off'}</span>
            <Toggle
              checked={!!cfg.enabled}
              disabled={saving || !cfg.isConfigured}
              onChange={() => save({ enabled: !cfg.enabled }, cfg.enabled ? 'Auto-import turned off.' : 'Auto-import turned on.')}
              label="Auto-import"
            />
          </div>
        </div>
        {!cfg.isConfigured && <p className="mt-3 text-xs text-amber-700">Save a working connection first, then turn auto-import on.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div>
            <Label>Check every</Label>
            <select value={cfg.pollIntervalMin} disabled={saving} onChange={(e) => save({ pollIntervalMin: Number(e.target.value) })} className={inputCls}>
              {INTERVALS.map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} hour` : `${m} minutes`}</option>)}
            </select>
          </div>
          <div>
            <Label>After importing an email</Label>
            <select value={cfg.afterImport} disabled={saving} onChange={(e) => save({ afterImport: e.target.value })} className={inputCls}>
              {AFTER.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          {cfg.afterImport === 'move' && (
            <div>
              <Label>Move to folder</Label>
              <input defaultValue={cfg.moveFolder} onBlur={(e) => e.target.value !== cfg.moveFolder && save({ moveFolder: e.target.value })} className={inputCls} />
            </div>
          )}
        </div>
      </Card>

      {/* allowlist */}
      <Card>
        <div className="flex items-center gap-3 pb-4 border-b">
          <ListChecks className="w-5 h-5 text-gray-700" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Lab sender allowlist</h3>
            <p className="text-sm text-gray-500">Only email from these senders is ever imported — everything else in the mailbox is left untouched. Add an address, or a whole domain as <code className="text-xs bg-gray-100 px-1 rounded">@lab.co.ke</code>.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {(cfg.allowlist || []).length === 0 && (
            <p className="text-sm text-amber-700">No labs added yet — nothing will be imported until at least one is.</p>
          )}
          {(cfg.allowlist || []).map((entry) => (
            <div key={entry} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <span className="font-semibold text-gray-800">{entry}</span>
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary bg-blue-50 rounded px-1.5 py-0.5">{entry.startsWith('@') ? 'domain' : 'address'}</span>
              <button type="button" onClick={() => removeSender(entry)} disabled={saving} className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1 disabled:opacity-50">
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <input
              value={newSender}
              onChange={(e) => setNewSender(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSender(); } }}
              placeholder="results@lab.co.ke  or  @lab.co.ke"
              className={inputCls}
            />
            <Button onClick={addSender} disabled={adding || saving || !newSender.trim()} className="!px-4 !py-2 text-sm">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LabInboxSettingsTab;
