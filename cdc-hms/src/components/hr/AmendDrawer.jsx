import { useState, useEffect } from 'react';
import hrService from '../../services/hrService';
import { notify } from '../../utils/notify';
import { dayLabel, hhmmOf } from './hrFormat';

/**
 * AmendDrawer — HR corrects a session (HR Suite, B21; hr.write).
 *
 * Two modes:
 *   session  → amend: check-in / check-out time, status (closed / voided), reason
 *   person   → manual entry: date, check-in, check-out (optional), reason
 * Reason is mandatory in both; the server writes the change to the person's
 * UserEditLog (visible on the staff file's Activity tab).
 *
 * Times are entered as clinic-local HH:MM on the session's date; the ISO the
 * server receives is built with the +03:00 offset (Nairobi, no DST).
 */
const isoAt = (date, hhmm) => (date && hhmm ? `${date}T${hhmm}:00+03:00` : null);
const toHHMM = (iso) => (iso ? hhmmOf(iso) : '');

const Field = ({ label, required, children }) => (
  <label className="block mb-3">
    <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}{required && <span className="text-red-600"> *</span>}</span>
    {children}
  </label>
);
const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-primary';

const AmendDrawer = ({ session, person, people = [], onClose, onSaved }) => {
  const manual = !session;
  const [userId, setUserId] = useState(person?.id || '');
  const [date, setDate] = useState('');
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [status, setStatus] = useState('closed');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) {
      setDate(session.clinicDate);
      setInTime(toHHMM(session.checkInAt));
      setOutTime(session.checkOutAt ? toHHMM(session.checkOutAt) : '');
      setStatus(session.status === 'voided' ? 'voided' : 'closed');
    } else {
      setDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }));
      setInTime(''); setOutTime(''); setStatus('closed');
    }
    setReason('');
  }, [session]);

  const save = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { notify('error', 'A reason is required.'); return; }
    setBusy(true);
    try {
      let res;
      if (manual) {
        if (!userId) { notify('error', 'Choose a person.'); return; }
        if (!date || !inTime) { notify('error', 'Date and check-in time are required.'); return; }
        res = await hrService.manual({ userId: Number(userId), checkInAt: isoAt(date, inTime), checkOutAt: outTime ? isoAt(date, outTime) : null, reason: reason.trim() });
      } else {
        const body = { reason: reason.trim() };
        const newIn = isoAt(date, inTime);
        if (newIn && toHHMM(newIn) !== toHHMM(session.checkInAt)) body.checkInAt = newIn;
        const newOut = outTime ? isoAt(date, outTime) : null;
        if ((newOut ? toHHMM(newOut) : null) !== (session.checkOutAt ? toHHMM(session.checkOutAt) : null)) body.checkOutAt = newOut;
        // The server derives closed/open/missed from the times; status is only
        // sent to void, or to un-void a voided row.
        if (status === 'voided' && session.status !== 'voided') body.status = 'voided';
        if (status === 'closed' && session.status === 'voided') body.status = 'closed';
        res = await hrService.amend(session.id, body);
      }
      if (res?.success) {
        notify('success', manual ? 'Entry recorded.' : 'Session amended.');
        onSaved?.(res.data);
      } else notify('error', res?.message || 'Could not save.');
    } catch (err) {
      notify('error', err?.message || 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const who = manual ? (people.find((p) => String(p.id) === String(userId)) || person) : session.person;

  return (
    <aside className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h4 className="text-sm font-bold text-gray-800">{manual ? 'Manual entry' : 'Amend session'}</h4>
      <p className="text-xs text-gray-500 mb-3">
        {manual ? 'Records a session HR witnessed or agreed — marked "manual", never "verified".'
          : `${who?.name} · ${dayLabel(session.clinicDate, true)} · ${session.status === 'missed_checkout' ? 'missed check-out' : session.status}`}
      </p>
      {!manual && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs mb-3">
          <dt className="text-gray-500">Checked in</dt><dd className="tabular-nums">{session.checkInHHMM}{session.door ? ` · ${session.door}` : ''} · {session.checkInVerification}</dd>
          <dt className="text-gray-500">Checked out</dt><dd className="tabular-nums">{session.checkOutHHMM || (session.status === 'missed_checkout' ? '— (closed by the midnight sweep)' : '—')}</dd>
          {session.amendedAt && <><dt className="text-gray-500">Last amended</dt><dd>{session.amendedBy} — {session.amendReason}</dd></>}
        </dl>
      )}
      <form onSubmit={save}>
        {manual && (
          <Field label="Person" required>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
              <option value="">Choose…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.role === 'doctor' ? 'Dr ' : ''}{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Date" required>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })} className={inputCls} disabled={!manual && session.status === 'refused'} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in time" required><input type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} className={inputCls} /></Field>
          <Field label="Check-out time"><input type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} className={inputCls} /></Field>
        </div>
        {!manual && (
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="closed">Closed (counts)</option>
              <option value="voided">Voided (does not count)</option>
            </select>
          </Field>
        )}
        <Field label="Reason" required>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls} placeholder={manual ? 'e.g. Fingerprint scanner recorded 08:02; phone left at home.' : 'e.g. Left after the Saturday clinic without tapping out — confirmed with the person.'} />
        </Field>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : manual ? 'Record entry' : 'Save amendment'}</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
        </div>
        <p className="text-[11px] text-gray-500 mt-3">Recorded in the person's activity log with your name, the time and this reason. Hours count only once a check-out exists.</p>
      </form>
    </aside>
  );
};

export default AmendDrawer;
