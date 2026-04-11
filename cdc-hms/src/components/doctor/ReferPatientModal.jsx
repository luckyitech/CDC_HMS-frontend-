import { useState } from 'react';
import { X, UserCheck, ExternalLink, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueueContext } from '../../contexts/QueueContext';
import { useUserContext } from '../../contexts/UserContext';
import { CHARGE_OPTIONS, PROCEDURE_OPTIONS } from '../../constants/billingOptions';

/**
 * ReferPatientModal — two-step modal for referring a patient during consultation.
 *
 * Step 1 — Referral details
 *   Internal: choose receiving doctor + reason
 *   External: enter hospital/specialist name + reason
 *
 * Step 2 — Billing checklist
 *   Doctor selects any charges and procedures performed during THIS consultation
 *   segment before handing over. These are merged (not replaced) with any charges
 *   already recorded on the queue item, so multi-doctor visits accumulate correctly.
 *
 * Props:
 *   patient   — { name, uhid }
 *   queueItem — the active queue entry { id, selectedCharges, selectedProcedures }
 *   onClose   — dismiss without saving
 *   onSuccess — called after a successful referral (parent navigates away)
 */
const ReferPatientModal = ({ patient, queueItem, onClose, onSuccess }) => {
  const { referPatient } = useQueueContext();
  const { getDoctors } = useUserContext();

  // ── Step tracking ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1 = referral details, 2 = billing

  // ── Step 1 state ─────────────────────────────────────────────────────────────
  const [referralType, setReferralType]         = useState('Internal');
  const [referralReason, setReferralReason]     = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [externalTarget, setExternalTarget]     = useState('');

  // ── Step 2 state ─────────────────────────────────────────────────────────────
  const [selectedCharges, setSelectedCharges]       = useState([]);
  const [selectedProcedures, setSelectedProcedures] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  const isInternal = referralType === 'Internal';
  const doctors    = getDoctors();

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const toggleCharge = (item) =>
    setSelectedCharges(prev =>
      prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]
    );

  const toggleProcedure = (item) =>
    setSelectedProcedures(prev =>
      prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
    );

  // ── Step 1 → Step 2 validation ───────────────────────────────────────────────
  const handleNextStep = (e) => {
    e.preventDefault();
    if (!referralReason.trim()) {
      toast.error('Please provide a reason for the referral.');
      return;
    }
    if (isInternal && !selectedDoctorId) {
      toast.error('Please select the doctor you are referring to.');
      return;
    }
    if (!isInternal && !externalTarget.trim()) {
      toast.error('Please enter the name of the hospital, clinic, or specialist.');
      return;
    }
    setStep(2);
  };

  // ── Final submission (Step 2) ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const selectedDoctor = isInternal
      ? doctors.find(d => d.id === parseInt(selectedDoctorId))
      : null;

    const payload = isInternal
      ? {
          referralType:         'Internal',
          referralReason:       referralReason.trim(),
          referredToDoctorId:   parseInt(selectedDoctorId),
          referredToDoctorName: selectedDoctor ? selectedDoctor.name : '',
          selectedCharges,
          selectedProcedures,
        }
      : {
          referralType:           'External',
          referralReason:         referralReason.trim(),
          externalReferralTarget: externalTarget.trim(),
          selectedCharges,
          selectedProcedures,
        };

    const result = await referPatient(queueItem.id, payload);
    setSubmitting(false);

    if (result.success) {
      const destination = isInternal
        ? `Dr. ${selectedDoctor?.name || 'the selected doctor'}`
        : externalTarget.trim();
      toast.success(`Patient referred to ${destination} successfully.`);
      onSuccess();
    } else {
      toast.error(result.message || 'Referral failed. Please try again.');
    }
  };

  // ── Checkbox style helper ─────────────────────────────────────────────────────
  // Uses static class names only — Tailwind's build step cannot detect dynamic
  // strings like `bg-${color}-50` and will strip them from the production bundle.
  const checkboxClass = (selected) =>
    `flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
      selected
        ? 'bg-green-50 border-green-400 text-gray-800'
        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Refer Patient</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {patient.name} &mdash; {patient.uhid}
              <span className="ml-3 text-xs font-medium text-gray-400">
                Step {step} of 2 — {step === 1 ? 'Referral Details' : 'Charges & Procedures'}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Step 1: Referral Details ────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Referral type toggle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Referral Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReferralType('Internal')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition ${
                      isInternal
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Internal
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferralType('External')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition ${
                      !isInternal
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    External
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {isInternal
                    ? 'Patient stays in the clinic and will be seen by another doctor.'
                    : 'Patient is sent to an outside facility — consultation ends and billing is triggered.'}
                </p>
              </div>

              {/* Internal: doctor dropdown */}
              {isInternal && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Refer To <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={e => setSelectedDoctorId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  >
                    <option value="">Select a doctor...</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* External: hospital / specialist name */}
              {!isInternal && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Hospital / Clinic / Specialist <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={externalTarget}
                    onChange={e => setExternalTarget(e.target.value)}
                    placeholder="e.g. Nairobi Hospital, Dr. Njoroge (Nephrologist)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                    required
                  />
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Reason for Referral <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={referralReason}
                  onChange={e => setReferralReason(e.target.value)}
                  rows={3}
                  placeholder="Describe the clinical reason for this referral..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  required
                />
              </div>

              {!isInternal && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700">
                    Submitting an external referral will end this consultation and send
                    the patient to billing for discharge.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition"
              >
                Next: Charges & Procedures
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Billing Checklist ───────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">

              <p className="text-sm text-gray-600">
                Select any charges and procedures performed during <strong>this part</strong> of
                the consultation. These will be added to the patient's billing record for the
                receptionist to confirm at discharge.
              </p>

              {/* Charges */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">
                  Charges
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {CHARGE_OPTIONS.map(item => (
                    <label key={item} className={checkboxClass(selectedCharges.includes(item))}>
                      <input
                        type="checkbox"
                        checked={selectedCharges.includes(item)}
                        onChange={() => toggleCharge(item)}
                        className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm font-medium leading-tight">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Procedures */}
              <div>
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 pb-1 border-b">
                  Procedures
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {PROCEDURE_OPTIONS.map(item => (
                    <label key={item} className={checkboxClass(selectedProcedures.includes(item))}>
                      <input
                        type="checkbox"
                        checked={selectedProcedures.includes(item)}
                        onChange={() => toggleProcedure(item)}
                        className="w-4 h-4 accent-green-600 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm font-medium leading-tight">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Warning for external */}
              {!isInternal && (
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-orange-700">
                    Referring externally to <strong>{externalTarget}</strong>.
                    The patient will be sent to billing after submission.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition disabled:opacity-60 ${
                  isInternal
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {submitting
                  ? 'Submitting…'
                  : isInternal
                    ? 'Confirm Internal Referral'
                    : 'Confirm & Send to Billing'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReferPatientModal;
