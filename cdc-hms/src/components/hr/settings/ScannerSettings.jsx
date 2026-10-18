import { useState, useEffect, useCallback } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { useUserContext } from '../../../contexts/UserContext';
import { canManageTags, canChangeHrSettings } from '../../../utils/permissions';
import hrService from '../../../services/hrService';
import Spinner from '../../shared/Spinner';
import SelectMenu from '../../shared/SelectMenu';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { notify } from '../../../utils/notify';
import { Pill, hhmmOf, dayLabel, agoLabel } from '../hrFormat';
import { Field, Section, inputCls, buttonCls, primaryButtonCls } from '../hrUi';

/**
 * HR Settings → Attendance → Fingerprint scanner (17 Oct 2026).
 *
 * The scanner card: is the relay reporting, the device, the last punch, the
 * relay key (shown once — generate / replace), the go-live date, and stopping
 * punches. Needs "HR Suite settings" (hr.settings), like a tag's key.
 *
 * Scanner users: every number enrolled on the scanner and the staff member it
 * counts for. Staff are enrolled with their HMS staff number (EMP005 → 5), so
 * the HMS proposes the match and HR confirms them in one click. Needs
 * "Entrance tags" (hr.tags). Punches made before a link count once it is made.
 */
const CLINIC_TZ = 'Africa/Nairobi';
const localInput = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.toLocaleDateString('en-CA', { timeZone: CLINIC_TZ })}T${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CLINIC_TZ })}`;
};
// The datetime-local value is clinic wall-clock time (Nairobi, UTC+3, no DST).
const fromLocalInput = (v) => (v ? new Date(`${v}:00+03:00`).toISOString() : null);
const whenLabel = (iso) => (iso ? `${dayLabel(new Date(iso).toLocaleDateString('en-CA', { timeZone: CLINIC_TZ }), true)} ${hhmmOf(iso)}` : '—');

const STATUS_PILL = {
  linked: <Pill tone="ok">Linked</Pill>,
  ignored: <Pill>Ignored</Pill>,
};

/** Shows a relay key once, with a copy button. */
const KeyOnce = ({ value, onDone }) => {
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); notify('success', 'Key copied'); } catch { notify('error', 'Copy failed — select the key and copy it by hand'); }
  };
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
      <p className="font-semibold">Relay key — shown once</p>
      <p className="text-xs">Put it in the relay's settings file on the attendance PC as <code>SCANNER_KEY</code>. After you leave this page it can't be shown again; replace it if it's lost.</p>
      <div className="flex gap-2 items-center">
        <code className="flex-1 min-w-0 break-all rounded bg-white border border-amber-200 px-2 py-1 font-mono text-xs select-all">{value}</code>
        <button type="button" onClick={copy} className={buttonCls}><Copy className="w-3.5 h-3.5 inline -mt-0.5" /> Copy</button>
      </div>
      <button type="button" onClick={onDone} className="text-xs font-semibold underline">I've saved it</button>
    </div>
  );
};

const RegisterForm = ({ onCreated }) => {
  const [form, setForm] = useState({ serial: '', label: 'Front office scanner', location: '', goLiveAt: localInput() });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await hrService.createScanner({ serial: form.serial.trim(), label: form.label.trim(), location: form.location.trim() || null, goLiveAt: fromLocalInput(form.goLiveAt) });
      if (res?.success) onCreated(res.data);
    } catch (err) { notify('error', err?.message || 'Could not register the scanner'); } finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-gray-600">Register the scanner once. You'll get the key the relay on the attendance PC uses.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Serial number" hint="Scanner menu → System Info → Device Info."><input id="scanner-serial" value={form.serial} onChange={(e) => set('serial', e.target.value)} placeholder="A8N5203760092" className={`${inputCls} font-mono`} required pattern="[A-Za-z0-9\-]{4,32}" /></Field>
        <Field label="Name"><input id="scanner-label" value={form.label} onChange={(e) => set('label', e.target.value)} className={inputCls} required maxLength={120} /></Field>
        <Field label="Location (optional)"><input id="scanner-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Front office, by reception" className={inputCls} maxLength={120} /></Field>
        <Field label="Count punches from" hint="Earlier punches on the scanner are kept but never counted."><input id="scanner-golive" type="datetime-local" value={form.goLiveAt} onChange={(e) => set('goLiveAt', e.target.value)} className={inputCls} required /></Field>
      </div>
      <button type="submit" disabled={saving} className={primaryButtonCls}>{saving ? 'Registering…' : 'Register scanner'}</button>
    </form>
  );
};

const ScannerCard = ({ scanner, canConfig, onChanged }) => {
  const [key, setKey] = useState(null);
  const [confirm, setConfirm] = useState(null);       // 'key' | 'stop' | 'resume'
  const [edit, setEdit] = useState(null);

  const save = async (body) => {
    try {
      const res = await hrService.updateScanner(scanner.id, body);
      if (res?.success) { onChanged(res.data); notify('success', 'Scanner saved'); setEdit(null); }
    } catch (err) { notify('error', err?.message || 'Could not save the scanner'); }
  };
  const doConfirm = async () => {
    const what = confirm;
    setConfirm(null);
    if (what === 'key') {
      try {
        const res = await hrService.replaceScannerKey(scanner.id);
        if (res?.success) { setKey(res.data.key); onChanged(res.data); }
      } catch (err) { notify('error', err?.message || 'Could not replace the key'); }
    } else {
      await save({ status: what === 'stop' ? 'stopped' : 'active' });
    }
  };

  return (
    <Section
      title={scanner.label}
      actions={scanner.status === 'stopped'
        ? <Pill tone="warn">Not accepting punches</Pill>
        : <Pill tone={scanner.online ? 'ok' : 'bad'}>{scanner.online ? `Online · checked ${agoLabel(scanner.lastSeenAt)}` : `Offline · last seen ${agoLabel(scanner.lastSeenAt)}`}</Pill>}
    >
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm tabular-nums">
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Device</dt><dd className="text-gray-900">{scanner.serial}<small className="block text-gray-500">{scanner.location || '—'}</small></dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Last punch</dt><dd className="text-gray-900">{whenLabel(scanner.lastPunchAt)}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Records on scanner</dt><dd className="text-gray-900">{scanner.recordCount?.toLocaleString?.() ?? '—'}<small className="block text-gray-500">{scanner.userCount != null ? `${scanner.userCount} users` : ''}</small></dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Relay</dt><dd className="text-gray-900">{scanner.relayHost || 'Not connected yet'}<small className="block text-gray-500">{scanner.relayVersion ? `version ${scanner.relayVersion} · ` : ''}key set {scanner.keySetAt ? dayLabel(new Date(scanner.keySetAt).toLocaleDateString('en-CA', { timeZone: CLINIC_TZ }), true) : '—'}</small></dd></div>
      </dl>
      <p className="text-xs text-gray-500 mt-3">Counts punches from {whenLabel(scanner.goLiveAt)}.</p>
      {Math.abs(scanner.clockDriftSeconds || 0) >= 120 && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          The scanner's clock is {Math.round(Math.abs(scanner.clockDriftSeconds) / 60)} min {scanner.clockDriftSeconds > 0 ? 'fast' : 'slow'}. Punch times come from it, so set it right on the scanner (System → Date Time).
        </p>
      )}

      {key && <div className="mt-3"><KeyOnce value={key} onDone={() => setKey(null)} /></div>}

      {canConfig && edit && (
        <form onSubmit={(e) => { e.preventDefault(); save({ label: edit.label.trim(), location: edit.location.trim() || null, goLiveAt: fromLocalInput(edit.goLiveAt) }); }} className="mt-4 border-t border-gray-200 pt-3 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Name"><input id="scanner-edit-label" value={edit.label} onChange={(e) => setEdit((f) => ({ ...f, label: e.target.value }))} className={inputCls} required maxLength={120} /></Field>
            <Field label="Location"><input id="scanner-edit-location" value={edit.location} onChange={(e) => setEdit((f) => ({ ...f, location: e.target.value }))} className={inputCls} maxLength={120} /></Field>
            <Field label="Count punches from" hint="Moving this re-checks every punch already received. Punches from more than a day before the first go-live were never sent, so moving earlier can't bring those in."><input id="scanner-edit-golive" type="datetime-local" value={edit.goLiveAt} onChange={(e) => setEdit((f) => ({ ...f, goLiveAt: e.target.value }))} className={inputCls} required /></Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={primaryButtonCls}>Save</button>
            <button type="button" onClick={() => setEdit(null)} className={buttonCls}>Cancel</button>
          </div>
        </form>
      )}

      {canConfig && !edit && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" className={buttonCls} onClick={() => setEdit({ label: scanner.label, location: scanner.location || '', goLiveAt: localInput(scanner.goLiveAt) })}>Edit</button>
          <button type="button" className={buttonCls} onClick={() => setConfirm('key')}>Replace relay key</button>
          {scanner.status === 'active'
            ? <button type="button" className={buttonCls} onClick={() => setConfirm('stop')}>Stop accepting punches</button>
            : <button type="button" className={buttonCls} onClick={() => setConfirm('resume')}>Accept punches again</button>}
        </div>
      )}

      <ConfirmActionModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        title={{ key: 'Replace the relay key?', stop: 'Stop accepting punches?', resume: 'Accept punches again?' }[confirm] || ''}
        message={{
          key: 'The relay stops working until the new key is put in its settings file on the attendance PC. Punches wait on the scanner meanwhile — none are lost.',
          stop: 'The relay will be turned away. Punches stay on the scanner and arrive when you accept them again.',
          resume: 'The relay can send punches again, including any that waited on the scanner.',
        }[confirm] || ''}
        confirmLabel={{ key: 'Replace key', stop: 'Stop', resume: 'Accept punches' }[confirm] || 'Confirm'}
      />
    </Section>
  );
};

const ScannerUsers = ({ scanner }) => {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    hrService.scannerUsers(scanner.id).then((res) => setData(res?.data || { users: [], staff: [] })).catch((e) => notify('error', e?.message || 'Could not load the scanner users'));
  }, [scanner.id]);
  useEffect(() => { load(); }, [load]);

  const act = async (u, body, done) => {
    setBusy(true);
    try {
      const res = await hrService.setScannerLink(scanner.id, u.id, body);
      if (res?.success) { setData(res.data); if (done) notify('success', done); }
    } catch (err) { notify('error', err?.message || 'Could not save the link'); } finally { setBusy(false); }
  };
  const confirmAll = async () => {
    setBusy(true);
    try {
      const res = await hrService.confirmScannerMatches(scanner.id);
      if (res?.success) { setData(res.data); notify('success', `${res.data.linked} linked`); }
    } catch (err) { notify('error', err?.message || 'Could not confirm the matches'); } finally { setBusy(false); }
  };

  if (!data) return <Section title="Scanner users"><Spinner /></Section>;
  const proposals = data.users.filter((u) => u.proposal).length;
  const waiting = data.users.reduce((n, u) => n + (u.status === 'unlinked' ? u.waiting : 0), 0);
  const takenIds = new Set(data.users.filter((u) => u.person).map((u) => u.person.id));
  const staffLabel = (p) => `${p.employeeId ? `${p.employeeId} · ` : ''}${p.name}`;

  return (
    <Section
      title="Scanner users"
      actions={(
        <div className="flex gap-2">
          <button type="button" onClick={load} className={buttonCls} aria-label="Refresh"><RefreshCw className="w-3.5 h-3.5" /></button>
          {proposals > 0 && <button type="button" onClick={confirmAll} disabled={busy} className={primaryButtonCls}>Confirm {proposals} {proposals === 1 ? 'match' : 'matches'}</button>}
        </div>
      )}
    >
      {waiting > 0 && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <b>{waiting} {waiting === 1 ? 'punch is' : 'punches are'} waiting</b> for scanner users who aren't linked yet. They count as soon as you link them.
        </p>
      )}
      {data.users.length === 0 ? (
        <p className="text-sm text-gray-500">No users yet. The relay sends the scanner's user list (numbers and names only) when it first connects.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="ui-thead"><tr className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="text-left py-1.5 pr-2 font-semibold">Scanner ID</th>
              <th className="text-left py-1.5 px-2 font-semibold">Name on scanner</th>
              <th className="text-left py-1.5 px-2 font-semibold">Last punch</th>
              <th className="text-left py-1.5 px-2 font-semibold">Staff member</th>
              <th className="text-left py-1.5 px-2 font-semibold">Status</th>
              <th className="py-1.5" />
            </tr></thead>
            <tbody className="tabular-nums">
              {data.users.map((u) => {
                const current = u.person?.id || u.proposal?.id || '';
                return (
                  <tr key={u.id} className={`border-b border-gray-100 ${u.status === 'ignored' || !u.onScanner ? 'text-gray-400' : ''}`}>
                    <td className="py-1.5 pr-2 font-mono text-xs">{u.userNo}</td>
                    <td className="py-1.5 px-2">{u.name || <small className="text-gray-400">no name</small>}{!u.onScanner && <small className="block">no longer on the scanner</small>}</td>
                    <td className="py-1.5 px-2 whitespace-nowrap">{whenLabel(u.lastPunchAt)}</td>
                    <td className="py-1.5 px-2 min-w-[200px]">
                      <SelectMenu
                        id={`scanner-user-${u.id}`}
                        aria-label={`Staff member for scanner ID ${u.userNo}`}
                        value={String(current)}
                        disabled={busy || u.status === 'ignored'}
                        onChange={(e) => e.target.value && act(u, { action: 'link', staffId: Number(e.target.value) }, 'Linked')}
                        className={inputCls}
                      >
                        <option value="">Choose staff…</option>
                        {data.staff.filter((p) => p.id === current || !takenIds.has(p.id)).map((p) => <option key={p.id} value={p.id}>{staffLabel(p)}</option>)}
                      </SelectMenu>
                    </td>
                    <td className="py-1.5 px-2">
                      {STATUS_PILL[u.status]
                        || (u.proposal ? <Pill tone="info">Matches {u.proposal.employeeId} · confirm</Pill>
                          : u.noMatchingStaff ? <Pill tone="warn">No staff EMP{String(u.userNo).padStart(3, '0')}{u.waiting ? ` · ${u.waiting} waiting` : ''}</Pill>
                            : <Pill tone="warn">Not linked{u.waiting ? ` · ${u.waiting} waiting` : ''}</Pill>)}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {u.status === 'linked' && <button type="button" disabled={busy} onClick={() => act(u, { action: 'unlink' }, 'Unlinked')} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Unlink</button>}
                      {u.proposal && <button type="button" disabled={busy} onClick={() => act(u, { action: 'link', staffId: u.proposal.id }, 'Linked')} className="mr-1.5 text-xs font-semibold text-white bg-primary rounded-lg px-2 py-1">Confirm</button>}
                      {u.status === 'unlinked' && <button type="button" disabled={busy} onClick={() => act(u, { action: 'ignore' }, 'Ignored')} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Ignore</button>}
                      {u.status === 'ignored' && <button type="button" disabled={busy} onClick={() => act(u, { action: 'unlink' }, 'Restored')} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50">Restore</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-3">Enrol each person on the scanner with the number from their HMS staff ID (EMP005 → 5) and their first name. One staff member can hold one scanner ID. Enrolling and deleting fingerprints is done on the scanner itself.</p>
    </Section>
  );
};

const ScannerSettings = () => {
  const { currentUser } = useUserContext();
  const canTags = canManageTags(currentUser);
  const canConfig = canChangeHrSettings(currentUser);
  const [scanners, setScanners] = useState(null);
  const [newKey, setNewKey] = useState(null);

  useEffect(() => {
    hrService.scanners().then((res) => setScanners(res?.data || [])).catch((e) => { setScanners([]); notify('error', e?.message || 'Could not load the scanner'); });
  }, []);

  if (scanners === null) return <Spinner />;
  const replace = (s) => setScanners((list) => list.map((x) => (x.id === s.id ? { ...x, ...s } : x)));

  return (
    <div className="space-y-4">
      {newKey && <KeyOnce value={newKey} onDone={() => setNewKey(null)} />}
      {scanners.length === 0 && (
        <Section title="Fingerprint scanner">
          {canConfig
            ? <RegisterForm onCreated={(s) => { setNewKey(s.key); setScanners([s]); }} />
            : <p className="text-sm text-gray-500">No scanner registered yet. Registering one needs the "HR Suite settings" permission — an administrator can do this.</p>}
        </Section>
      )}
      {scanners.map((s) => (
        <div key={s.id} className="space-y-4">
          <ScannerCard scanner={s} canConfig={canConfig} onChanged={replace} />
          {canTags && <ScannerUsers scanner={s} />}
        </div>
      ))}
    </div>
  );
};

export default ScannerSettings;
