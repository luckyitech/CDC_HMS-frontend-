import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Check, X } from 'lucide-react';
import leaveService from '../../../services/leaveService';
import Spinner from '../../shared/Spinner';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { notify } from '../../../utils/notify';
import { Pill } from '../hrFormat';
import { Field, inputCls, cellInputCls, primaryButtonCls, SwitchRow } from '../hrUi';
import { holidayDateLabel } from './leaveFormat';

/**
 * HolidayList — the public holidays for one year (B27, D4).
 *
 * Holidays are never counted as leave, and nobody is expected in on one
 * (attendance shows "H") unless HR set hours for that exact date. The fixed
 * dates are seeded; HR adds Idd-ul-Fitr and any presidential declaration when
 * gazetted. A holiday on a Sunday is also observed on the next day that isn't
 * a holiday — added automatically ('auto' rows) while the switch is on (HR
 * Tier 2); HR may retire one if a gazette says otherwise.
 * Retired, never deleted — re-adding a retired date brings it back.
 *
 * Props: year, canEdit
 */
const HolidayList = ({ year, canEdit }) => {
  const [rows, setRows] = useState(null);
  const [showRetired, setShowRetired] = useState(false);
  const [form, setForm] = useState({ date: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);     // { id, name }
  const [confirm, setConfirm] = useState(null);     // a holiday to retire / bring back
  const [observe, setObserve] = useState(null);     // the Sunday switch (HR Tier 2)

  const load = useCallback(async () => {
    setRows(null);
    try {
      const res = await leaveService.holidays(year, true);
      setRows(res?.data?.holidays || []);
      setObserve(res?.data?.observeSundayHolidays !== false);
    } catch (e) { notify('error', e?.message || 'Could not load public holidays'); setRows([]); }
  }, [year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setForm({ date: '', name: '' }); setEditing(null); }, [year]);

  const switchObserve = async (on) => {
    try {
      const res = await leaveService.setObserveSunday(on);
      notify('success', on
        ? (res.data.added ? `Switched on — ${res.data.added} observed day${res.data.added === 1 ? '' : 's'} added.` : 'Switched on.')
        : 'Switched off — observed days no longer count.');
      load();
    } catch (err) { notify('error', err?.message || 'Could not save the setting'); }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.date.startsWith(String(year))) { notify('error', `Choose a date in ${year}.`); return; }
    setSaving(true);
    try {
      const res = await leaveService.createHoliday({ date: form.date, name: form.name.trim() });
      if (res?.success) {
        notify('success', `${res.data.name} added.`);
        setForm({ date: '', name: '' });
        await load();
      }
    } catch (err) { notify('error', err?.message || 'Could not add the holiday'); }
    finally { setSaving(false); }
  };

  const rename = async () => {
    const { id, name } = editing;
    if (name.trim().length < 2) { notify('error', 'Give the holiday a name.'); return; }
    try {
      const res = await leaveService.updateHoliday(id, { name: name.trim() });
      if (res?.success) { setRows((prev) => prev.map((h) => (h.id === id ? res.data : h))); setEditing(null); }
    } catch (err) { notify('error', err?.message || 'Could not rename the holiday'); }
  };

  const toggle = async () => {
    const h = confirm; setConfirm(null);
    try {
      const res = await leaveService.updateHoliday(h.id, { status: h.status === 'active' ? 'retired' : 'active' });
      if (res?.success) {
        setRows((prev) => prev.map((x) => (x.id === h.id ? res.data : x)));
        notify('success', res.data.status === 'active' ? `${h.name} is a holiday again.` : `${h.name} retired.`);
      }
    } catch (err) { notify('error', err?.message || 'Could not update the holiday'); }
  };

  const shown = (rows || []).filter((h) => showRetired || h.status === 'active');
  const retiredCount = (rows || []).filter((h) => h.status === 'retired').length;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 items-start">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Public holidays {year}</h3>
          {retiredCount > 0 && (
            <label className="text-xs text-gray-500 flex items-center gap-1.5">
              <input type="checkbox" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} className="h-3.5 w-3.5 rounded border-gray-300" />
              Show retired ({retiredCount})
            </label>
          )}
        </div>
        {rows === null ? <Spinner /> : shown.length === 0 ? <p className="text-sm text-gray-500">No public holidays listed for {year}.</p> : (
          <ul className="divide-y divide-gray-100">
            {shown.map((h) => (
              <li key={h.id} className={`flex items-center gap-3 py-2 text-sm ${h.status === 'retired' ? 'text-gray-400' : ''}`}>
                <span className="w-28 flex-none tabular-nums text-gray-600">{holidayDateLabel(h.date)}</span>
                {editing?.id === h.id ? (
                  <span className="flex-1 flex items-center gap-1">
                    <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={cellInputCls} aria-label="Holiday name" autoFocus />
                    <button type="button" onClick={rename} className="p-1 text-green-700" title="Save"><Check className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setEditing(null)} className="p-1 text-gray-500" title="Cancel"><X className="w-4 h-4" /></button>
                  </span>
                ) : (
                  <span className="flex-1 min-w-0">
                    <span className={h.status === 'retired' ? 'line-through' : 'text-gray-800'}>{h.name}</span>
                    {h.source === 'hr' && <span className="ml-2"><Pill>Added by HR</Pill></span>}
                    {h.source === 'auto' && <span className="ml-2"><Pill tone="info">{observe === false ? 'Automatic · switched off' : 'Automatic'}</Pill></span>}
                    {h.status === 'retired' && <span className="ml-2"><Pill>Retired</Pill></span>}
                  </span>
                )}
                {canEdit && editing?.id !== h.id && (
                  <span className="flex items-center gap-1 flex-none">
                    {h.status === 'active' && (
                      <button type="button" onClick={() => setEditing({ id: h.id, name: h.name })} className="p-1 text-gray-400 hover:text-gray-700" title="Rename"><Pencil className="w-3.5 h-3.5" /></button>
                    )}
                    <button type="button" onClick={() => setConfirm(h)} className="text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg px-2 py-0.5 hover:bg-gray-50">
                      {h.status === 'active' ? 'Retire' : 'Bring back'}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        {observe !== null && (
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2" data-testid="observe-sunday">
            <SwitchRow
              label="When a holiday falls on a Sunday, also observe the next day"
              hint="Adds the day after (the next one that isn't already a holiday) for every year. Retire one here if a gazette says otherwise."
              checked={observe}
              disabled={!canEdit}
              onChange={switchObserve}
            />
          </div>
        )}
        {canEdit && (
          <form onSubmit={add} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Add a holiday</h3>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3">
              <Field label="Date"><input type="date" value={form.date} min={`${year}-01-01`} max={`${year}-12-31`} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} required /></Field>
              <Field label="Name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Idd-ul-Fitr" className={inputCls} required minLength={2} maxLength={120} /></Field>
            </div>
            <button type="submit" disabled={saving} className={`${primaryButtonCls} inline-flex items-center gap-1`}><Plus className="w-4 h-4" /> {saving ? 'Adding…' : 'Add holiday'}</button>
          </form>
        )}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 space-y-1.5">
          <p><b>Never counted as leave.</b> A holiday inside someone's leave costs them nothing, and nobody is expected in on one — the star calendar shows "H". Someone HR has rostered for that exact date (Working hours → a dated override) is still expected.</p>
          <p><b>Add when gazetted:</b> Idd-ul-Fitr (it follows the moon) and any day the President declares.</p>
          <p><b>Sunday rule:</b> a holiday that falls on a Sunday is also observed on the next day that isn't already a holiday (Christmas on a Sunday → Tuesday, because Boxing Day is the Monday). With the switch on, these days are added for you and marked "Automatic".</p>
          <p>Changing a holiday doesn't change leave already requested — each request keeps the count it was made with.</p>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={toggle}
        title={confirm?.status === 'active' ? `Retire ${confirm?.name}?` : `Bring back ${confirm?.name}?`}
        message={confirm?.status === 'active'
          ? `${holidayDateLabel(confirm?.date)} will count as a normal day again — for new leave requests, and staff will be expected in.`
          : `${holidayDateLabel(confirm?.date)} will be a public holiday again.`}
        confirmLabel={confirm?.status === 'active' ? 'Retire' : 'Bring back'}
        confirmVariant={confirm?.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default HolidayList;
