import Modal from './Modal';
import Button from './Button';
import { QueueBookingBadge } from './QueueBooking';

// Shown when a nurse/doctor calls in a patient who is NOT next in the
// booking-priority order (utils/queuePriority). It names who is actually next
// and lets them either see that patient instead, or continue with the one they
// picked (a deliberate manual bump). Purely a check — it never blocks.
const firstName = (p) => (p?.name || '').split(' ')[0] || 'this patient';

const PatientLine = ({ patient, label, tone }) => (
  <div className={`rounded-lg border px-3 py-2 ${tone}`}>
    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <div className="mt-0.5 flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-gray-800">{patient?.name}</span>
      {patient?.uhid && <span className="text-xs text-gray-500">{patient.uhid}</span>}
      <QueueBookingBadge patient={patient} />
      {patient?.arrivalTime && <span className="text-xs text-gray-500">arr. {patient.arrivalTime}</span>}
    </div>
  </div>
);

// verb: 'triage' | 'see' — wording only.
const CallOrderConfirmModal = ({ isOpen, onClose, selected, next, verb = 'see', onProceed, onSeeNext }) => {
  if (!isOpen || !selected || !next) return null;
  const action = verb === 'triage' ? 'triage' : 'see';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Someone is ahead in the queue">
      <div className="space-y-4">
        <p className="text-gray-700">
          By the queue order, <span className="font-semibold">{next.name}</span> should be {action === 'triage' ? 'triaged' : 'seen'} next.
          You selected <span className="font-semibold">{selected.name}</span>.
        </p>

        <div className="space-y-2">
          <PatientLine patient={next} label="Next in line" tone="border-blue-200 bg-blue-50" />
          <PatientLine patient={selected} label="You selected" tone="border-amber-200 bg-amber-50" />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <Button variant="primary" onClick={onSeeNext} className="w-full">
            {action === 'triage' ? 'Triage' : 'See'} {firstName(next)} (next in line)
          </Button>
          <Button variant="outline" onClick={onProceed} className="w-full">
            Continue with {firstName(selected)} anyway
          </Button>
          <button type="button" onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CallOrderConfirmModal;
