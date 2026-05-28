import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import patientService from '../../services/patientService';

/**
 * Inline quick-registration panel for new patients calling to book.
 * Collects first name, last name, and phone — no portal account created.
 * Full profile is completed face-to-face when the patient walks in.
 *
 * Props:
 *   onRegistered(patient) — called with the created patient { id, uhid, name, phone }
 */
const QuickRegisterForm = ({ onRegistered }) => {
  const [open, setOpen]           = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) return toast.error('First name is required');
    if (!lastName.trim())  return toast.error('Last name is required');
    if (!phone.trim())     return toast.error('Phone number is required');

    setSubmitting(true);
    try {
      const res = await patientService.quickCreate({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        phone:     phone.trim(),
      });
      const patient = res.data;
      toast.success(`Registered ${patient.name} · ${patient.uhid}`);
      reset();
      onRegistered(patient);
    } catch (err) {
      toast.error(err.message || 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Register New Patient
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            New Patient — Quick Registration
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">First Name <span className="text-red-400">*</span></label>
              <input
                autoFocus
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Last Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Phone Number <span className="text-red-400">*</span></label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0700 000 000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <p className="text-xs text-gray-400">
            A UHID will be generated. Full profile is completed when the patient walks in.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Registering...</>
                : <><UserPlus className="w-3 h-3" /> Register & Select</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickRegisterForm;
