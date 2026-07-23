import { useState } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Glp1SwitchModal — moves a patient from one agent to another.
 *
 * The current course is stopped and a new one is started linked to it, so each
 * drug keeps its own dose ladder, reviews and injection history. The tool then
 * shows what the patient was switched from and when.
 *
 * The safety screen carries across rather than being re-answered: it was about
 * the patient, not the molecule, and asking again invites rubber-stamping.
 */
const Glp1SwitchModal = ({ currentTherapy, medications = [], onSwitch, onClose }) => {
  const options = medications.filter(
    m => m.isActive && m.id !== currentTherapy?.medication?.id
  );

  const [medicationId, setMedicationId] = useState(options[0]?.id ?? '');
  const [reason, setReason]             = useState('');
  const [startDate, setStartDate]       = useState(new Date().toISOString().slice(0, 10));
  const [startingDose, setStartingDose] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const target = options.find(m => m.id === Number(medicationId));

  const handleSubmit = async () => {
    if (!medicationId) {
      toast.error('Select the agent to switch to');
      return;
    }
    if (!reason.trim()) {
      toast.error('A reason is required to switch agents');
      return;
    }

    setSubmitting(true);
    const result = await onSwitch({
      medicationId: Number(medicationId),
      reason:       reason.trim(),
      startDate,
      startingDose: startingDose === '' ? null : Number(startingDose),
    });
    setSubmitting(false);

    if (!result.success) toast.error(result.message || 'Could not switch agent');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-gray-800">Switch agent</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {options.length === 0 ? (
            <p className="text-sm text-gray-500">
              There is no other active agent in the formulary to switch to.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Currently on <span className="font-medium">{currentTherapy?.medication?.genericName}</span>
                {currentTherapy?.currentStep && ` at ${currentTherapy.currentStep.dose} mg`}
                {currentTherapy?.startDate && `, since ${currentTherapy.startDate}`}.
              </p>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Switch to</label>
                <select
                  value={medicationId}
                  onChange={e => setMedicationId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {options.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.genericName}{m.brandName ? ` · ${m.brandName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Switch date</label>
                  <input
                    type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Starting dose <span className="text-gray-400">(mg)</span>
                  </label>
                  <input
                    type="number" step="0.25" value={startingDose}
                    onChange={e => setStartingDose(e.target.value)}
                    placeholder={target?.defaultSchedule?.[0]?.dose ?? ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Reason for switching <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Persistent nausea on tirzepatide despite slowed titration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p>The {currentTherapy?.medication?.genericName} course will be stopped, keeping its reviews and injection history.</p>
                <p>{target?.genericName} starts on {startDate} with its own dose ladder.</p>
                <p>The safety screen carries across — it was about the patient, not the drug.</p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          {options.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Switching…' : 'Switch agent'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Glp1SwitchModal;
