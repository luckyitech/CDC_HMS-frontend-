import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import staffService from '../../../services/staffService';
import { notify } from '../../../utils/notify';
import Modal from '../../shared/Modal';
import { Field, inputCls, buttonCls, primaryButtonCls } from '../hrUi';
import DayCalculator from './DayCalculator';
import { START_PARTS, END_PARTS, returnLabel } from './leaveFormat';

/**
 * Record leave on someone's behalf (B27 phase 3; leave.manage). Approved on
 * the spot — a phone call from home, a type staff can't see (D10), leave
 * taken before the HMS knew. The same calculator as the applicant's wizard
 * (POST /api/staff/:employeeId/leaves/preview) in HR mode: a short balance
 * warns instead of blocking. The person is told.
 *
 * props:
 *   isOpen, onClose
 *   staff       { employeeId, name }
 *   types       [{ key, name, halfDaysAllowed }]  (overview.recordTypes)
 *   policyPublished
 *   onRecorded  () => void
 */
const RecordLeaveModal = ({ isOpen, onClose, staff, types = [], policyPublished, onRecorded }) => {
  const [form, setForm] = useState({ leaveType: types[0]?.key || '', startDate: '', endDate: '', startPart: 'full', endPart: 'full', excludeWeekends: false, reason: '' });
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const type = types.find((t) => t.key === form.leaveType);
  const halfDays = policyPublished && !!type?.halfDaysAllowed;

  const seq = useRef(0);
  useEffect(() => {
    if (!isOpen || !form.leaveType || !form.startDate || !form.endDate) { setPreview(null); return undefined; }
    const mine = ++seq.current;
    const id = setTimeout(() => {
      staffService.previewLeave(staff.employeeId, {
        leaveType: form.leaveType, startDate: form.startDate, endDate: form.endDate,
        startPart: halfDays ? form.startPart : 'full', endPart: halfDays ? form.endPart : 'full', excludeWeekends: form.excludeWeekends,
      }).then((res) => { if (mine === seq.current) setPreview(res.data); })
        .catch((err) => { if (mine === seq.current) setPreview({ ok: false, errors: [{ code: 'x', message: err.message }], warnings: [] }); });
    }, 300);
    return () => clearTimeout(id);
  }, [isOpen, staff.employeeId, form.leaveType, form.startDate, form.endDate, form.startPart, form.endPart, form.excludeWeekends, halfDays]);

  const save = async () => {
    setSaving(true);
    try {
      await staffService.createLeave(staff.employeeId, {
        leaveType: form.leaveType, startDate: form.startDate, endDate: form.endDate,
        startPart: halfDays ? form.startPart : 'full', endPart: halfDays ? form.endPart : 'full',
        excludeWeekends: form.excludeWeekends, reason: form.reason || null,
      });
      notify('success', 'Leave recorded');
      setForm((f) => ({ ...f, startDate: '', endDate: '', reason: '' }));
      setPreview(null);
      onRecorded();
    } catch (err) {
      notify('error', err.message || 'Could not record the leave');
    } finally {
      setSaving(false);
    }
  };

  const typeName = type?.name || form.leaveType;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record leave for ${staff.name}`} size="lg">
      <div className="space-y-3" data-testid="record-leave">
        <p className="text-xs text-gray-500">Approved on the spot and charged to the balance you choose. {staff.name.split(' ')[0]} is told.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type">
            <select className={inputCls} value={form.leaveType} onChange={(e) => set({ leaveType: e.target.value })} aria-label="Leave type">
              {types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="From">
            <input type="date" className={inputCls} value={form.startDate} aria-label="First day"
              onChange={(e) => set({ startDate: e.target.value, endDate: form.endDate && form.endDate >= e.target.value ? form.endDate : e.target.value })} />
            {halfDays && (
              <select className={`${inputCls} mt-1.5`} value={form.startPart} onChange={(e) => set({ startPart: e.target.value })} aria-label="First day part">
                {START_PARTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            )}
          </Field>
          <Field label="To">
            <input type="date" className={inputCls} value={form.endDate} min={form.startDate || undefined} aria-label="Last day" onChange={(e) => set({ endDate: e.target.value })} />
            {halfDays && (
              <select className={`${inputCls} mt-1.5`} value={form.endPart} onChange={(e) => set({ endPart: e.target.value })} aria-label="Last day part">
                {END_PARTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            )}
          </Field>
        </div>
        {preview && preview.usedPolicy === false && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.excludeWeekends} onChange={(e) => set({ excludeWeekends: e.target.checked })} /> Don&apos;t count weekends
          </label>
        )}
        {preview?.errors?.map((e) => (
          <div key={e.code} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert"><AlertTriangle className="w-4 h-4 mt-0.5" />{e.message}</div>
        ))}
        {preview?.warnings?.filter((w) => w.code !== 'DOCUMENT_NEEDED').map((w) => (
          <div key={w.code} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"><Info className="w-4 h-4 mt-0.5" />{w.message}</div>
        ))}
        {preview?.total > 0 && (
          <>
            <DayCalculator breakdown={preview.breakdown} total={preview.total} typeName={typeName} balance={preview.balance} usedPolicy={preview.usedPolicy} compact />
            {preview.returnDate && <p className="text-xs text-gray-600">Back at work: {returnLabel(preview.returnDate, preview.returnPart)}</p>}
          </>
        )}
        <Field label="Reason (optional)">
          <textarea rows={2} className={inputCls} value={form.reason} onChange={(e) => set({ reason: e.target.value })} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={buttonCls} onClick={onClose}>Close</button>
          <button type="button" className={primaryButtonCls} disabled={saving || !preview?.ok} onClick={save}>{saving ? 'Recording…' : 'Record leave'}</button>
        </div>
      </div>
    </Modal>
  );
};

export default RecordLeaveModal;
