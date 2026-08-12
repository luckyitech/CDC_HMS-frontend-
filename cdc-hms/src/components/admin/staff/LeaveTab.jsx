import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Loader, Plus, Info, Check, X } from 'lucide-react';
import staffService from '../../../services/staffService';
import StatusBadge from '../../shared/StatusBadge';
import { formatDate } from './staffFormat';

const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Study', 'Unpaid'];

const STATUS_TONES = {
  Approved:  'success',
  Pending:   'warning',
  Rejected:  'danger',
  Cancelled: 'neutral',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const LeaveTab = ({ staff, isAdmin }) => {
  const [year, setYear]       = useState(new Date().getFullYear());
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editingBalances, setEditingBalances] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState({});

  const [form, setForm] = useState({
    leaveType: 'Annual',
    startDate: todayISO(),
    endDate: todayISO(),
    reason: '',
    excludeWeekends: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffService.getLeaves(staff.employeeId, year);
      setData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load leave');
    } finally {
      setLoading(false);
    }
  }, [staff.employeeId, year]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await staffService.createLeave(staff.employeeId, form);
      toast.success(isAdmin ? 'Leave recorded' : 'Leave requested');
      setShowForm(false);
      setForm((f) => ({ ...f, reason: '' }));
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to record leave');
    } finally {
      setSaving(false);
    }
  };

  const decide = async (leave, status) => {
    // Named explicitly, because approving a doctor's leave has a side effect
    // beyond this page — it blocks their appointment slots.
    const extra = status === 'Approved' && staff.role === 'doctor'
      ? '\n\nTheir appointment slots will be blocked for these dates.'
      : status === 'Cancelled' && leave.blocksAppointments
        ? '\n\nThe appointment blocks created for this leave will be removed.'
        : '';

    if (!window.confirm(`${status.replace(/ed$/, '')} this leave?${extra}`)) return;

    let note = null;
    if (status === 'Rejected') {
      note = window.prompt('Reason for rejection (optional)') || null;
    }

    try {
      await staffService.decideLeave(staff.employeeId, leave.id, status, note);
      toast.success(`Leave ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update leave');
    }
  };

  const startEditingBalances = () => {
    const draft = {};
    (data?.summary || []).forEach((s) => { draft[s.leaveType] = s.entitled; });
    setBalanceDraft(draft);
    setEditingBalances(true);
  };

  const saveBalances = async () => {
    setSaving(true);
    try {
      const balances = Object.entries(balanceDraft).map(([leaveType, entitled]) => ({
        leaveType,
        entitled: Number(entitled) || 0,
      }));
      await staffService.setLeaveBalances(staff.employeeId, year, balances);
      toast.success('Entitlement saved');
      setEditingBalances(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save entitlement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const summary = data?.summary || [];
  const leaves  = data?.leaves || [];

  // Types with no entitlement and nothing taken are hidden — showing seven rows
  // of zeroes buries the two that matter.
  const visibleSummary = summary.filter((s) => s.entitled > 0 || s.taken > 0 || editingBalances);

  const inputClass = 'w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          {[0, 1, 2].map((back) => {
            const y = new Date().getFullYear() - back;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>

        <div className="flex items-center gap-2">
          {isAdmin && !editingBalances && (
            <button
              onClick={startEditingBalances}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Set entitlement
            </button>
          )}
          {editingBalances && (
            <>
              <button
                onClick={saveBalances}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
              </button>
              <button
                onClick={() => setEditingBalances(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowForm((v) => !v)}
            disabled={staff.isArchived}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> {isAdmin ? 'Record leave' : 'Request leave'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={form.leaveType}
                onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
                className={inputClass}
              >
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date" required value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date" required value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason (optional)</label>
            <input
              type="text" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox" checked={form.excludeWeekends}
              onChange={(e) => setForm({ ...form, excludeWeekends: e.target.checked })}
            />
            Don&apos;t count weekends towards the days used
          </label>

          <div className="flex gap-2">
            <button
              type="submit" disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isAdmin ? 'Record' : 'Submit request'}
            </button>
            <button
              type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {visibleSummary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleSummary.map((s) => (
            <div key={s.leaveType} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{s.leaveType}</p>
              {editingBalances ? (
                <div className="mt-1.5">
                  <label className="block text-[10px] text-gray-400 mb-1">Days entitled</label>
                  <input
                    type="number" min="0"
                    value={balanceDraft[s.leaveType] ?? 0}
                    onChange={(e) => setBalanceDraft((d) => ({ ...d, [s.leaveType]: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-800 mt-0.5">
                    {s.remaining}
                    <span className="text-xs font-normal text-gray-400"> left</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {s.taken} taken of {s.entitled + s.carriedOver}
                    {s.carriedOver > 0 && ` (incl. ${s.carriedOver} carried over)`}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">History — {year}</h3>

        {leaves.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No leave recorded for {year}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 text-left">
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Days</th>
                  <th className="pb-2 font-medium">Status</th>
                  {isAdmin && <th className="pb-2 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 text-gray-800 whitespace-nowrap">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      {l.reason && <p className="text-xs text-gray-400">{l.reason}</p>}
                    </td>
                    <td className="py-2.5 text-gray-600">{l.leaveType}</td>
                    <td className="py-2.5 text-gray-600">{l.days}</td>
                    <td className="py-2.5">
                      <StatusBadge shape="tag" size="xs" tone={STATUS_TONES[l.status] || 'neutral'}>
                        {l.status}
                      </StatusBadge>
                      {l.approvedBy && (
                        <p className="text-xs text-gray-400 mt-0.5">by {l.approvedBy}</p>
                      )}
                      {l.decisionNote && (
                        <p className="text-xs text-gray-400">{l.decisionNote}</p>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {l.status === 'Pending' && (
                          <>
                            <button onClick={() => decide(l, 'Approved')} className="text-xs text-green-700 hover:underline mr-2">Approve</button>
                            <button onClick={() => decide(l, 'Rejected')} className="text-xs text-red-600 hover:underline">Reject</button>
                          </>
                        )}
                        {l.status === 'Approved' && (
                          <button onClick={() => decide(l, 'Cancelled')} className="text-xs text-gray-500 hover:underline">Cancel</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {staff.role === 'doctor' && (
          <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            Approving leave for a doctor blocks their appointment slots for those dates, so
            reception cannot book them while they are away.
          </p>
        )}
      </div>
    </div>
  );
};

export default LeaveTab;
