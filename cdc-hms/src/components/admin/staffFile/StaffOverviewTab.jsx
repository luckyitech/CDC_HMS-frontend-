import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import Card from '../../shared/Card';
import Button from '../../shared/Button';
import staffFileService from '../../../services/staffFileService';
import toast from 'react-hot-toast';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const InfoRow = ({ label, value, valueClass = 'text-gray-800' }) => (
  <div className="flex justify-between items-start gap-2 py-2 border-b border-gray-100 last:border-0">
    <p className="text-sm text-gray-500 flex-shrink-0 w-1/2">{label}</p>
    <p className={`text-sm font-semibold ${valueClass} text-right break-words w-1/2`}>{value || '—'}</p>
  </div>
);

const Field = ({ label, value, onChange, type = 'text', options }) => (
  <div className="flex justify-between items-center gap-2 py-2 border-b border-gray-100 last:border-0">
    <p className="text-sm text-gray-500 flex-shrink-0 w-1/2">{label}</p>
    {options ? (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-1/2 text-sm border border-gray-300 rounded-lg px-2 py-1.5"
      >
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-1/2 text-sm border border-gray-300 rounded-lg px-2 py-1.5"
      />
    )}
  </div>
);

/**
 * Overview tab of the Staff File. Personal (read-only account facts) + Employment
 * (editable StaffProfile fields). Editing reuses PUT /api/users/:id.
 */
const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const StaffOverviewTab = ({ staff, lastLogin, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    position: staff.position || '',
    department: staff.department || '',
    shift: staff.shift || '',
  });

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await staffFileService.updateUser(staff.id, form);
      toast.success('Staff details updated.');
      setEditing(false);
      onSaved?.();
    } catch (err) {
      toast.error(err?.message || 'Failed to update details.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm({ position: staff.position || '', department: staff.department || '', shift: staff.shift || '' });
    setEditing(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Personal Information" shadow={false} className="border border-gray-100">
        <div>
          <InfoRow label="Full Name" value={staff.name} />
          <InfoRow label="Role" value={staff.role} valueClass="text-primary capitalize" />
          <InfoRow label="Email" value={staff.email} />
          <InfoRow label="Phone" value={staff.phone} />
          <InfoRow label="Account status" value={staff.status} />
          <InfoRow label="Last login" value={fmtDateTime(lastLogin)} />
          <InfoRow label="Joined" value={fmtDate(staff.createdAt)} />
        </div>
      </Card>

      <Card title="Employment" shadow={false} className="border border-gray-100">
        {editing ? (
          <div>
            <Field label="Position" value={form.position} onChange={set('position')} />
            <Field label="Department" value={form.department} onChange={set('department')} />
            <Field
              label="Shift"
              value={form.shift}
              onChange={set('shift')}
              options={['Morning', 'Afternoon', 'Night', 'Rotating']}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={save} disabled={saving} className="flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={cancel} disabled={saving} className="flex items-center gap-1.5">
                <X className="w-4 h-4" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <InfoRow label="Position" value={staff.position} />
            <InfoRow label="Department" value={staff.department} />
            <InfoRow label="Shift" value={staff.shift} />
            <InfoRow label="Start Date" value={fmtDate(staff.startDate)} />
            <div className="mt-4">
              <Button variant="outline" onClick={() => setEditing(true)} className="flex items-center gap-1.5">
                <Pencil className="w-4 h-4" /> Edit details
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StaffOverviewTab;
