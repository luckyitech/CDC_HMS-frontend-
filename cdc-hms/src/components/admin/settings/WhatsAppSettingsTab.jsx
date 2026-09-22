import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, PlugZap, Phone, KeyRound, Save, Facebook, Instagram } from 'lucide-react';
import settingsService from '../../../services/settingsService';
import commsService from '../../../services/commsService';

// System Settings → WhatsApp. Connection credentials (App Secret, System User
// token and our webhook verify token are stored ENCRYPTED and never returned to
// the browser — only has* booleans), the clinic numbers (pulled from Meta on
// Test connection), behaviour switches, message templates, and the cost rate
// card. Nothing ships pre-filled. Writing credentials is real-admin only.
const WhatsAppSettingsTab = () => {
  const [cfg, setCfg] = useState(null);
  const [form, setForm] = useState({ wabaId: '', appId: '', appSecret: '', accessToken: '', verifyToken: '' });
  // Messenger + Instagram share the same app, app secret and verify token as
  // WhatsApp above; all they add is the connected Facebook Page id, the linked
  // Instagram account id, and that Page's access token (used to send on both).
  const [meta, setMeta] = useState({ pageId: '', igId: '', pageAccessToken: '' });
  const [savingMeta, setSavingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [rate, setRate] = useState({ effectiveFrom: '', service: '', utility: '', marketing: '', authentication: '' });
  const [budget, setBudget] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await settingsService.getComms();
      setCfg(r.data);
      setForm((f) => ({ ...f, wabaId: r.data.wabaId || '', appId: r.data.appId || '' }));
      setMeta((m) => ({ ...m, pageId: r.data.pageId || '', igId: r.data.igId || '' }));
      setBudget(String(r.data.monthlyBudgetKes || ''));
    } catch { /* interceptor */ }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { commsService.listTemplates().then((r) => setTemplates(r.data.templates || [])).catch(() => {}); }, []);

  const saveConnection = async () => {
    setSaving(true);
    try {
      const changes = { wabaId: form.wabaId, appId: form.appId };
      if (form.appSecret) changes.appSecret = form.appSecret;
      if (form.accessToken) changes.accessToken = form.accessToken;
      if (form.verifyToken) changes.verifyToken = form.verifyToken;
      await settingsService.setComms(changes);
      toast.success('Saved.');
      setForm((f) => ({ ...f, appSecret: '', accessToken: '', verifyToken: '' }));
      load();
    } catch (e) { toast.error(e.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      const changes = { pageId: meta.pageId.trim(), igId: meta.igId.trim() };
      if (meta.pageAccessToken) changes.pageAccessToken = meta.pageAccessToken;
      await settingsService.setComms(changes);
      toast.success('Saved.');
      setMeta((m) => ({ ...m, pageAccessToken: '' }));
      load();
    } catch (e) { toast.error(e.message || 'Save failed.'); }
    finally { setSavingMeta(false); }
  };

  const saveBehaviour = async (patch) => {
    try { const r = await settingsService.setComms(patch); setCfg(r.data); }
    catch (e) { toast.error(e.message || 'Save failed.'); }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await settingsService.testComms({ wabaId: form.wabaId });
      toast.success(`Connected — ${r.data.numbers.length} number(s) found.`);
      load();
    } catch (e) { toast.error(e.message || 'Connection failed.'); }
    finally { setTesting(false); }
  };

  const generateVerify = () => setForm((f) => ({ ...f, verifyToken: (crypto.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/-/g, '') }));

  const syncTemplates = async () => {
    try { const r = await commsService.syncTemplates(); toast.success(`Synced ${r.data.synced} templates.`); commsService.listTemplates().then((x) => setTemplates(x.data.templates || [])); }
    catch (e) { toast.error(e.message || 'Sync failed.'); }
  };

  const addRate = async () => {
    if (!rate.effectiveFrom) { toast.error('Set the effective-from date.'); return; }
    const rows = [...(cfg?.rateCard || []), { channel: 'whatsapp', effectiveFrom: rate.effectiveFrom, service: Number(rate.service) || 0, utility: Number(rate.utility) || 0, marketing: Number(rate.marketing) || 0, authentication: Number(rate.authentication) || 0 }];
    try { await settingsService.setCommsCosts({ rateCard: rows, monthlyBudgetKes: Number(budget) || 0 }); toast.success('Rate card updated.'); setRate({ effectiveFrom: '', service: '', utility: '', marketing: '', authentication: '' }); load(); }
    catch (e) { toast.error(e.message || 'Could not save the rate card.'); }
  };

  if (!cfg) return <div className="py-8 text-center text-sm text-gray-400">Loading…</div>;
  const Field = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div><label className="text-xs text-gray-500">{label}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full rounded border-gray-300" /></div>
  );

  return (
    <div className="space-y-6 text-sm">
      {/* Connection */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-800"><PlugZap size={16} /> Connection (Meta Cloud API)</h3>
        <p className="mb-3 text-xs text-gray-500">Enter the values from your Meta app. The secret, token and verify token are stored encrypted and never shown again. Status: {cfg.isConfigured ? <span className="text-emerald-600">connected</span> : <span className="text-amber-600">not connected</span>}. Webhook URL for Meta: <code>https://api.cdiabetescentre.com/api/comms/webhook</code></p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="WhatsApp Business Account ID" value={form.wabaId} onChange={(e) => setForm({ ...form, wabaId: e.target.value })} />
          <Field label="Meta App ID" value={form.appId} onChange={(e) => setForm({ ...form, appId: e.target.value })} />
          <Field label={`App Secret ${cfg.hasAppSecret ? '(set — leave blank to keep)' : ''}`} value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value })} placeholder={cfg.hasAppSecret ? '••••••' : ''} />
          <Field label={`Access token ${cfg.hasAccessToken ? '(set — leave blank to keep)' : ''}`} value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder={cfg.hasAccessToken ? '••••••' : ''} />
          <div className="sm:col-span-2 flex items-end gap-2">
            <div className="flex-1"><Field label={`Webhook verify token ${cfg.hasVerifyToken ? '(set)' : ''}`} value={form.verifyToken} onChange={(e) => setForm({ ...form, verifyToken: e.target.value })} /></div>
            <button type="button" onClick={generateVerify} className="rounded border px-3 py-2 text-xs"><KeyRound size={13} className="mr-1 inline" />Generate</button>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={saveConnection} disabled={saving} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40"><Save size={15} /> {saving ? 'Saving…' : 'Save'}</button>
          <button type="button" onClick={test} disabled={testing} className="inline-flex items-center gap-1 rounded border px-4 py-2 disabled:opacity-40"><RefreshCw size={15} className={testing ? 'animate-spin' : ''} /> Test connection</button>
        </div>
      </section>

      {/* Numbers */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-800"><Phone size={16} /> Numbers</h3>
        {(cfg.channels || []).length === 0 ? <p className="text-xs text-gray-500">No numbers yet — run Test connection after saving the credentials.</p> : (
          <ul className="divide-y">
            {cfg.channels.map((c) => <li key={c.id} className="flex items-center justify-between py-1.5"><span>{c.displayPhone || c.externalId} <span className="text-xs text-gray-400">{c.label}</span></span><span className={`text-xs ${c.qualityRating === 'GREEN' ? 'text-emerald-600' : 'text-gray-400'}`}>{c.qualityRating || '—'}</span></li>)}
          </ul>
        )}
      </section>

      {/* Messenger + Instagram */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-800"><Facebook size={16} /> Facebook Messenger &amp; <Instagram size={16} /> Instagram</h3>
        <p className="mb-3 text-xs text-gray-500">
          Messages from your Facebook Page and linked Instagram account land in the Inbox alongside WhatsApp. These use the same Meta app, app secret and webhook verify token you set above — add the Page below and its access token. Status: Messenger {cfg.isMessengerConfigured ? <span className="text-emerald-600">connected</span> : <span className="text-amber-600">not connected</span>}, Instagram {cfg.isInstagramConfigured ? <span className="text-emerald-600">connected</span> : <span className="text-amber-600">not connected</span>}.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Facebook Page ID" value={meta.pageId} onChange={(e) => setMeta({ ...meta, pageId: e.target.value })} placeholder="e.g. 1029384756" />
          <Field label="Instagram account ID (optional)" value={meta.igId} onChange={(e) => setMeta({ ...meta, igId: e.target.value })} placeholder="linked professional account" />
          <div className="sm:col-span-2"><Field label={`Page access token ${cfg.hasPageAccessToken ? '(set — leave blank to keep)' : ''}`} value={meta.pageAccessToken} onChange={(e) => setMeta({ ...meta, pageAccessToken: e.target.value })} placeholder={cfg.hasPageAccessToken ? '••••••' : 'long-lived Page token'} /></div>
        </div>
        <div className="mt-3">
          <button type="button" onClick={saveMeta} disabled={savingMeta} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-40"><Save size={15} /> {savingMeta ? 'Saving…' : 'Save'}</button>
        </div>
      </section>

      {/* Behaviour */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold text-gray-800">Behaviour</h3>
        <div className="space-y-2">
          {[['autoLink', 'Auto-link a thread to a patient on a unique phone match'], ['markReadOnOpen', 'Send read receipts when staff open a thread'], ['warnNoConsent', 'Warn (not block) when messaging a patient who has not opted in']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={!!cfg[k]} onChange={(e) => saveBehaviour({ [k]: e.target.checked })} /> {l}</label>
          ))}
          <div className="flex gap-4">
            <label className="text-xs text-gray-500">Media size cap (MB)<input type="number" defaultValue={cfg.mediaMaxMb} onBlur={(e) => saveBehaviour({ mediaMaxMb: Number(e.target.value) })} className="ml-2 w-20 rounded border-gray-300" /></label>
            <label className="text-xs text-gray-500">Archive unlinked after (days)<input type="number" defaultValue={cfg.archiveUnlinkedDays} onBlur={(e) => saveBehaviour({ archiveUnlinkedDays: Number(e.target.value) })} className="ml-2 w-20 rounded border-gray-300" /></label>
          </div>
        </div>
      </section>

      {/* Templates */}
      <section className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold text-gray-800">Templates</h3><button type="button" onClick={syncTemplates} className="rounded border px-3 py-1 text-xs"><RefreshCw size={12} className="mr-1 inline" />Sync from Meta</button></div>
        {templates.length === 0 ? <p className="text-xs text-gray-500">No templates cached yet.</p> : (
          <ul className="text-xs">{templates.map((t) => <li key={`${t.name}-${t.language}`} className="flex justify-between border-b py-1"><span>{t.name} <span className="text-gray-400">({t.language})</span></span><span className={t.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-500'}>{t.status || '—'}</span></li>)}</ul>
        )}
      </section>

      {/* Costs */}
      <section className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold text-gray-800">Costs (KES per clinic-sent message)</h3>
        <div className="mb-2 flex items-center gap-2 text-xs">
          <label>Monthly budget<input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="ml-2 w-28 rounded border-gray-300" /></label>
        </div>
        {(cfg.rateCard || []).length > 0 && (
          <table className="mb-2 w-full text-xs"><thead><tr className="text-left text-gray-400"><th>From</th><th>Service</th><th>Utility</th><th>Marketing</th><th>Auth</th></tr></thead>
            <tbody>{cfg.rateCard.map((r, i) => <tr key={i} className="border-t"><td>{r.effectiveFrom}</td><td>{r.service}</td><td>{r.utility}</td><td>{r.marketing}</td><td>{r.authentication}</td></tr>)}</tbody></table>
        )}
        <div className="grid grid-cols-5 gap-1 text-xs">
          <input type="date" value={rate.effectiveFrom} onChange={(e) => setRate({ ...rate, effectiveFrom: e.target.value })} className="rounded border-gray-300" />
          {['service', 'utility', 'marketing', 'authentication'].map((k) => <input key={k} type="number" step="0.01" placeholder={k} value={rate[k]} onChange={(e) => setRate({ ...rate, [k]: e.target.value })} className="rounded border-gray-300" />)}
        </div>
        <button type="button" onClick={addRate} className="mt-2 rounded bg-gray-800 px-3 py-1.5 text-xs text-white">Add rate row + save budget</button>
      </section>
    </div>
  );
};

export default WhatsAppSettingsTab;
