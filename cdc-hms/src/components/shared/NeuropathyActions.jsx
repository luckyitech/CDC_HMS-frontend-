import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronDown, Pill, FlaskConical, Package, Share2, Receipt, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserContext } from '../../contexts/UserContext';
import { useQueueContext } from '../../contexts/QueueContext';
import { usePrescriptionContext } from '../../contexts/PrescriptionContext';
import patientService from '../../services/patientService';
import { CHARGE_OPTIONS, PROCEDURE_OPTIONS } from '../../constants/billingOptions';
import Modal from './Modal';
import BillingModal from './BillingModal';
import PrescriptionManagement from '../doctor/PrescriptionManagement';
import LabRequest from './LabRequest';
import ReferPatientModal from '../doctor/ReferPatientModal';
import RecordUseModal from '../stock/RecordUseModal';

// NeuropathyActions — the DRY clinical action set from Today's Consultation,
// surfaced on a completed neuropathy study so the examiner can act on the
// patient without leaving the report:
//   • Write prescription   (PrescriptionManagement — patient only)
//   • Lab request          (shared LabRequest — patient only)
//   • Record use           (RecordUseModal — point-of-care stock, patient only)
//   • Refer to clinician    ─┐ both need an OPEN Radiology → Neuropathy visit,
//   • Send to billing        ┘ so they only appear when the patient is in that
//                             queue flow (a study started ad-hoc has no visit
//                             to bill or hand off).
//
// Every launcher reuses the exact component the consultation uses — no forked
// logic. Refer and Send to billing route through the shared BillingModal, then
// the queue context's referPatient / sendToBilling, mirroring the consultation.
//
// Props:
//   study — the graded study ({ uhid, patientName, ... }); enough to load the
//           patient and find the open visit.

const OPEN_STATUSES_EXCLUDED = ['Completed', 'Removed'];

const NeuropathyActions = ({ study }) => {
  const uhid = study?.uhid || null;
  const { currentUser } = useUserContext();
  const { queue, referPatient, sendToBilling } = useQueueContext();
  const { getPrescriptionsByPatient, addPrescription } = usePrescriptionContext();

  // Full patient (for prescription/lab/refer). Falls back to the study's own
  // fields so the actions still work before the fetch resolves.
  const [patient, setPatient] = useState(
    uhid ? { uhid, name: study?.patientName || '' } : null,
  );
  const [prescriptions, setPrescriptions] = useState([]);

  // Which launcher is open, and the billing sub-flow.
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);            // 'rx' | 'lab' | 'use' | 'refer' | null
  const [billing, setBilling] = useState(null);        // { mode:'complete'|'referral', context } | null
  const [submitting, setSubmitting] = useState(false);

  const menuRef = useRef(null);

  // The patient's live Radiology → Neuropathy visit, if any. Refer + billing act
  // on this row; without it those actions are hidden (same rule PatientFile uses
  // to decide the PNS Studio tab).
  const openVisit = useMemo(
    () => (queue || []).find(
      (q) => q.uhid === uhid && q.destination === 'Radiology' && q.service === 'Neuropathy'
        && !OPEN_STATUSES_EXCLUDED.includes(q.status),
    ),
    [queue, uhid],
  );

  const refreshPrescriptions = useCallback(() => {
    if (!uhid) return;
    getPrescriptionsByPatient(uhid).then((list) =>
      setPrescriptions(Array.isArray(list) ? list : []),
    );
  }, [uhid, getPrescriptionsByPatient]);

  useEffect(() => {
    if (!uhid) return undefined;
    let live = true;
    patientService.getByUHID(uhid)
      .then((res) => { if (live) setPatient(res.data?.patient || res.data || { uhid, name: study?.patientName || '' }); })
      .catch(() => { if (live) setPatient({ uhid, name: study?.patientName || '' }); });
    refreshPrescriptions();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uhid]);

  // Close the dropdown on an outside click (mousedown, not an inset overlay —
  // the report modal scrolls, an overlay would swallow the wheel).
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  if (!uhid) return null;

  const pick = (m) => { setMenuOpen(false); setModal(m); };

  // Refer → hand the referral payload to the shared billing step (referral is
  // finalised there, exactly as the consultation does — it never skips billing).
  const onReferSend = (payload) => {
    setModal(null);
    setBilling({ mode: 'referral', context: payload });
  };

  const onBillingSubmit = async ({ charges, procedures }) => {
    if (!openVisit) { toast.error('This visit is no longer open.'); return; }
    setSubmitting(true);
    try {
      if (billing?.mode === 'referral') {
        const result = await referPatient(openVisit.id, {
          ...billing.context, selectedCharges: charges, selectedProcedures: procedures,
        });
        if (!result?.success) throw new Error(result?.message || 'Referral failed');
        toast.success('Referral sent to billing.');
      } else {
        const result = await sendToBilling(openVisit.id, charges, procedures, null);
        if (!result?.success) throw new Error(result?.message || 'Could not send to billing');
        toast.success('Sent to billing.');
      }
      setBilling(null);
    } catch (err) {
      toast.error(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const Item = ({ icon: Icon, label, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-blue-50 transition-colors text-left"
    >
      <Icon className="w-4 h-4 text-gray-400" /> {label}
    </button>
  );

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Stethoscope className="w-4 h-4" /> Actions
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full mt-2 z-20 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1">
            <Item icon={Pill}         label="Write prescription" onClick={() => pick('rx')} />
            <Item icon={FlaskConical} label="Lab request"        onClick={() => pick('lab')} />
            <Item icon={Package}      label="Record use"         onClick={() => pick('use')} />
            {openVisit && (
              <>
                <div className="my-1 border-t border-gray-100" />
                <Item icon={Share2}  label="Refer to clinician"  onClick={() => pick('refer')} />
                <Item icon={Receipt} label="Send to billing"     onClick={() => { setMenuOpen(false); setBilling({ mode: 'complete', context: null }); }} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Write prescription — the consultation's own PrescriptionManagement */}
      <Modal isOpen={modal === 'rx'} onClose={() => setModal(null)} title="Write prescription" size="xl">
        <PrescriptionManagement
          patient={patient}
          patientPrescriptions={prescriptions}
          addPrescription={addPrescription}
          currentUser={currentUser}
          onSuccess={refreshPrescriptions}
          hideCurrentStrip
        />
      </Modal>

      {/* Lab request — the shared requisition */}
      <Modal isOpen={modal === 'lab'} onClose={() => setModal(null)} title="Lab request" size="xl">
        <LabRequest patient={patient} />
      </Modal>

      {/* Record use — point-of-care stock */}
      {modal === 'use' && (
        <RecordUseModal
          patient={{ uhid: patient?.uhid, name: patient?.name }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Refer to clinician — needs the open visit */}
      {modal === 'refer' && openVisit && (
        <ReferPatientModal
          patient={patient}
          queueItem={openVisit}
          onClose={() => setModal(null)}
          onSendToBilling={onReferSend}
        />
      )}

      {/* Shared billing step — plain send-to-billing or the referral hand-off */}
      {billing && (
        <BillingModal
          patient={patient}
          title={billing.mode === 'referral' ? 'Referral billing' : 'Send to billing'}
          submitLabel={billing.mode === 'referral' ? 'Confirm referral' : 'Send to billing'}
          submitting={submitting}
          chargeOptions={CHARGE_OPTIONS}
          procedureOptions={PROCEDURE_OPTIONS}
          existingCharges={openVisit?.selectedCharges || []}
          existingProcedures={openVisit?.selectedProcedures || []}
          onSubmit={onBillingSubmit}
          onClose={() => setBilling(null)}
        />
      )}
    </>
  );
};

export default NeuropathyActions;
