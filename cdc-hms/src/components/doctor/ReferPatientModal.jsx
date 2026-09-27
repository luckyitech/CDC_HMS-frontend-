import { useState } from 'react';
import { X, UserCheck, ExternalLink, AlertCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserContext } from '../../contexts/UserContext';
import queueService from '../../services/queueService';
import LetterPrint from '../shared/LetterPrint';

/**
 * ReferPatientModal — doctor REFERS a patient during the consultation.
 *
 * Mirrors the admission flow (single screen, no inline billing):
 *   • Referral details — Internal (receiving doctor) or External (facility) + reason
 *   • An editable REFERRAL NOTE, pre-filled from the consultation (`defaultNote`).
 *   • Save & preview (27 Sep evening) saves the letter — note, destination and
 *     reason — to the Visit History (no billing move), then opens it on the
 *     clinic letterhead like the prescription: Print · Email · Send via WhatsApp.
 *     Printing happens inside the preview, in its own tap (iPad-safe).
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
  const { getDoctors, currentUser } = useUserContext();

  const [referralType, setReferralType]         = useState('Internal');
  const [referralReason, setReferralReason]     = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [externalTarget, setExternalTarget]     = useState('');
  const [referralNote, setReferralNote]         = useState(defaultNote);
  const [saving, setSaving]                     = useState(false);
  const [preview, setPreview]                   = useState(null);   // the saved letter, shown in LetterPrint

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

  // Save & preview — documents the letter to the visit history (no billing),
  // then opens the letterhead preview. What is previewed is exactly what was
  // saved, so a reprint from Visit History later matches it.
  const saveAndPreview = async () => {
    if (!validate()) return;
    if (!queueItem?.id) return toast.error('No active queue visit for this patient.');
    setSaving(true);
    try {
      await queueService.saveReferralNote(queueItem.id, {
        referralNote, referralType,
        referralReason: referralReason.trim(),
        ...(isInternal
          ? { referredToDoctorName: selectedDoctor ? selectedDoctor.name : '' }
          : { externalReferralTarget: externalTarget.trim() }),
      });
      toast.success('Referral letter saved to visit history.');
      setPreview({
        note: referralNote, date: new Date().toISOString(), doctorName: currentUser?.name || '',
        referralType, destination, reason: referralReason.trim(),
      });
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
                Pre-filled from this visit's vitals, notes and diagnosis. Save &amp; preview files it in the visit history, ready to print, email or WhatsApp.
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
              onClick={saveAndPreview}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-blue-50 transition disabled:opacity-50"
            >
              <Eye className="w-4 h-4" /> {saving ? 'Saving…' : 'Save & preview'}
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

      {/* The saved letter — letterhead preview with Print · Email · WhatsApp */}
      {preview && (
        <LetterPrint
          kind="referral"
          letter={preview}
          patient={{ name: patient?.name, uhid: patient?.uhid, phone: patient?.phone, gender: patient?.gender }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default ReferPatientModal;
