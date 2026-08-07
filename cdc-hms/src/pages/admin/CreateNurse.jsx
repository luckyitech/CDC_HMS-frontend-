import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import api from '../../services/api';

// HMIS V3 — create a nurse (role='nurse'). Nurses are the primary inpatient
// users and also do OPD triage/vitals/injections.
const departments = ['Inpatient Ward', 'HDU', 'Outpatient', 'Triage', 'Theatre', 'Maternity'];
const shifts = ['Morning', 'Afternoon', 'Night'];

const CreateNurse = () => {
  const navigate = useNavigate();
  const [d, setD] = useState({ firstName: '', lastName: '', email: '', phone: '', department: 'Inpatient Ward', shift: 'Morning', temporaryPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const genPassword = () => set('temporaryPassword', Math.random().toString(36).slice(-10) + 'A1');

  const submit = async (e) => {
    e.preventDefault();
    if (!d.firstName || !d.lastName || !d.email || !d.phone) return toast.error('Please fill in all required fields');
    setSubmitting(true);
    try {
      const res = await api.post('/users/nurses', {
        firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone,
        department: d.department, shift: d.shift, position: 'Nurse',
        password: d.temporaryPassword || undefined,
      });
      if (res.success) {
        toast.success(`Nurse account created for ${d.firstName} ${d.lastName}`);
        setD({ firstName: '', lastName: '', email: '', phone: '', department: 'Inpatient Ward', shift: 'Morning', temporaryPassword: '' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create nurse');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary';

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-sm text-gray-600">First name *</label><input className={inp} value={d.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
          <div><label className="text-sm text-gray-600">Last name *</label><input className={inp} value={d.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
          <div><label className="text-sm text-gray-600">Email *</label><input type="email" className={inp} value={d.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div><label className="text-sm text-gray-600">Phone *</label><input className={inp} value={d.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div>
            <label className="text-sm text-gray-600">Department</label>
            <select className={inp} value={d.department} onChange={(e) => set('department', e.target.value)}>{departments.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
          <div>
            <label className="text-sm text-gray-600">Shift</label>
            <select className={inp} value={d.shift} onChange={(e) => set('shift', e.target.value)}>{shifts.map((x) => <option key={x}>{x}</option>)}</select>
          </div>
        </div>
        <div>
          <label className="text-sm text-gray-600">Temporary password (optional — auto-generated if blank)</label>
          <div className="flex gap-2">
            <input className={inp} value={d.temporaryPassword} onChange={(e) => set('temporaryPassword', e.target.value)} placeholder="Leave blank to auto-generate" />
            <Button type="button" variant="outline" onClick={genPassword}>Generate</Button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/dashboard')}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Nurse'}</Button>
        </div>
      </form>
    </Card>
  );
};

export default CreateNurse;
