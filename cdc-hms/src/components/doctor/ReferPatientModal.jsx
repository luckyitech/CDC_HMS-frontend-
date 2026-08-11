import { useState } from 'react';
import { X, UserCheck, ExternalLink, AlertCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserContext } from '../../contexts/UserContext';
import queueService from '../../services/queueService';
import usePrint from '../../hooks/usePrint';
import PrintRoot from '../shared/PrintRoot';

/**
 * ReferPatientModal — doctor REFERS a patient during the consultation.
 *
 * Mirrors the admission flow (single screen, no inline billing):
 *   • Referral details — Internal (receiving doctor) or External (facility) + reason
 *   • An editable REFERRAL NOTE, pre-filled from the consultation (`defaultNote`),
 *     printable on the shared clinic letterhead (PrintRoot).
 *   • Save & Print documents the note to the Visit History (no billing move).
 *   • "Send referral" hands off to the shared Complete-Consultation billing modal
 *     (`onSendToBilling`) — the doctor enters billing there, and submitting it
 *     finalises the referral and completes the visit. Referral never skips billing.
 *
 * Props:
 *   patient        — { name, uhid }
 *   queueItem      — the active queue entry { id }
 *   defaultNote    — pre-filled referral note body (clinical summary)
 *   onClose        — dismiss without saving
 *   onSendToBilling(payload) — parent opens the billing modal in referral mode
 */
const ReferPatientModal = ({ patient, queueItem, defaultNote = '', onClose, onSendToBilling }) => {
  const { getDoctors } = useUserContext();

  const [referralType, setReferralType]         = useState('Internal');
  const [referralReason, setReferralReason]     = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [externalTarget, setExternalTarget]     = useState('');
  const [referralNote, setReferralNote]         = useState(defaultNote);
  const [saving, setSaving]                     = useState(false);

  const { printRef, handlePrint } = usePrint();

  const isInternal = referralType === 'Internal';
  const doctors    = getDoctors();
  const selectedDoctor = isInternal
    ? doctors.find(d => d.id === parseInt(selectedDoctorId))
    : null;
  const destination = isInternal
    ? (selectedDoctor ? `Dr. ${selectedDoctor.name}` : '')
    : externalTarget.trim();

  // Shared validation for both Save & Print and Send.
  const validate = () => {
    if (!referralReason.trim()) { toast.error('Please provide a reason for the referral.'); return false; }
    if (isInternal && !selectedDoctorId) { toast.error('Please select the doctor you are referring to.'); return false; }
    if (!isInternal && !externalTarget.trim()) { toast.error('Please enter the hospital, clinic, or specialist.'); return false; }
    if (!referralNote.trim()) { toast.error('The referral note is empty.'); return false; }
    return true;
  };

  // Save & Print — documents the referral note to the visit history (no billing).
  const saveAndPrint = async () => {
    if (!validate()) return;
    if (!queueItem?.id) return toast.error('No active queue visit for this patient.');
    setSaving(true);
    try {
      await queueService.saveReferralNote(queueItem.id, { referralNote, referralType });
      toast.success('Referral note saved to visit history.');
      handlePrint();
    } catch (err) {
      toast.error(err.message || 'Failed to save referral note');
    } finally {
      setSaving(false);
    }
  };

  // Send referral — hand off to the shared billing modal. The referral is
  // finalised there once the doctor enters billing (never skipped).
  const handleSend = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = isInternal
      ? {
          referralType:         'Internal',
          referralReason:       referralReason.trim(),
          referredToDoctorId:   parseInt(selectedDoctorId),
          referredToDoctorName: selectedDoctor ? selectedDoctor.name : '',
        }
      : {
          referralType:           'External',
          referralReason:         referralReason.trim(),
          externalReferralTarget: externalTarget.trim(),
        };

    onSendToBilling?.({ ...payload, referralNote, destination });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Refer Patient</h2>
            <p className="text-sm text-gray-500 mt-0.5">{patient.name} &mdash; {patient.uhid}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Referral type toggle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Referral Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReferralType('Internal')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition ${
                    isInternal ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Internal
                </button>
                <button
                  type="button"
                  onClick={() => setReferralType('External')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-semibold transition ${
                    !isInternal ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" /> External
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
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>Dr. {doctor.name}</option>
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
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Reason for Referral <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={referralReason}
                onChange={e => setReferralReason(e.target.value)}
                placeholder="e.g. Nephrology opinion for declining eGFR"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Referral note — editable, pre-filled from the consultation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Referral Note <span className="text-red-500">*</span>
              </label>
              <textarea
                value={referralNote}
                onChange={e => setReferralNote(e.target.value)}
                rows={8}
                placeholder="Pre-filled from this visit — edit as needed."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Pre-filled from this visit's vitals, notes and diagnosis. Save &amp; Print files it in the visit history.
              </p>
            </div>

            {!isInternal && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-700">
                  Sending an external referral ends this consultation and moves the patient to billing.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap justify-between items-center gap-2 px-6 py-4 border-t flex-shrink-0">
            <button
              type="button"
              onClick={saveAndPrint}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-blue-50 transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> {saving ? 'Saving…' : 'Save & Print'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-blue-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2.5 rounded-lg text-sm font-bold text-white transition ${
                  isInternal ? 'bg-primary hover:bg-primary/90' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                Send referral
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Print target — shared clinic letterhead */}
      <PrintRoot printRef={printRef}>
        <div className="border-b border-gray-300 pb-3 mb-4">
          <p className="text-sm text-gray-700"><b>{patient?.name}</b>{patient?.uhid ? ` · ${patient.uhid}` : ''}</p>
          <p className="text-xs text-gray-500">Referral Note · {new Date().toLocaleString()}</p>
        </div>
        {destination && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referred to</p>
            <p className="text-sm mb-3">{destination}{isInternal ? ' (Internal)' : ' (External)'}</p>
          </>
        )}
        {referralReason.trim() && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</p>
            <p className="text-sm mb-3">{referralReason}</p>
          </>
        )}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referral note</p>
        <p className="text-sm whitespace-pre-wrap">{referralNote}</p>
      </PrintRoot>
    </div>
  );
};

export default ReferPatientModal;
