import { useNavigate, useLocation } from "react-router-dom";
import { Stethoscope, CheckCircle, FolderOpen } from "lucide-react";
import Card from "../shared/Card";
import Button from "../shared/Button";
import { NURSE_QUEUE_STATUSES, isInjectionReturn, queueStatusColor } from "../../utils/queueStatus";
import { useQueueContext } from "../../contexts/QueueContext";

// Triage worklist — the patients waiting for a nurse, plus everyone already
// triaged and still in the building. Each row opens the patient's file on the
// Nursing tab: triage is performed there (TriagePanel), and the tab stays live
// for the whole visit so the nurse can go back to a triaged patient — a second
// set of vitals, an injection, a Kardex entry, charges — until reception checks
// them out. Rendered as the Triage tab inside Queue Management (and on the
// standalone Triage route).

// Past nursing, not yet checked out: with the doctor (either side) or waiting
// for billing. 'Pending Injection' is deliberately NOT here — it is a nurse-
// facing status and already sits in the waiting list above.
const IN_CLINIC_STATUSES = ["Awaiting Doctor", "With Doctor", "Pending Billing"];

const Head = ({ statusColumn = false }) => (
  <thead className="bg-gray-50 border-b-2 border-gray-200">
    <tr>
      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
      <th className="hidden md:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Arrival Time</th>
      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">{statusColumn ? "Where" : "Priority"}</th>
      <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
    </tr>
  </thead>
);

// Module-level (not created during render). showStatus swaps the Priority column for the live queue status — the
// in-clinic list is about WHERE the patient is, not how urgent they were.
const Row = ({ patient, cta, onOpen, showStatus = false, variant = "primary" }) => (
  <tr className="hover:bg-blue-50">
    <td className="px-4 lg:px-6 py-4 font-medium text-primary text-sm">{patient.uhid}</td>
    <td className="px-4 lg:px-6 py-4 font-semibold text-sm">
      {patient.name}
      {isInjectionReturn(patient) && (
        <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold">
          for injection
        </span>
      )}
    </td>
    <td className="hidden md:table-cell px-4 lg:px-6 py-4 text-sm">{patient.arrivalTime}</td>
    <td className="px-4 lg:px-6 py-4">
      {showStatus ? (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${queueStatusColor(patient)}`}>
          {patient.status}
          {patient.assignedDoctorName ? ` · ${patient.assignedDoctorName}` : ""}
        </span>
      ) : (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          patient.priority === "Urgent" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        }`}>
          {patient.priority}
        </span>
      )}
    </td>
    <td className="px-4 lg:px-6 py-4">
      <Button variant={variant} className="text-xs py-1 px-3" onClick={() => onOpen(patient)}>
        {cta}
      </Button>
    </td>
  </tr>
);
const TriageWorklist = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getQueueByStatus } = useQueueContext();

  const base = location.pathname.startsWith("/nurse") ? "/nurse" : "/staff";

  const waitingPatients = NURSE_QUEUE_STATUSES.flatMap((s) => getQueueByStatus(s));
  const inTriagePatients = getQueueByStatus("In Triage");
  // Triaged today and still in clinic, in arrival order.
  const inClinicPatients = IN_CLINIC_STATUSES.flatMap((s) => getQueueByStatus(s))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

  const openTriage = (queueItem) => {
    navigate(`${base}/patient-profile/${queueItem.uhid}`, {
      state: { activeTab: "nursing", queueItemId: queueItem.id },
    });
  };

  return (
    <div className="space-y-6">
      <Card title={
        <span className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5" />
          Patients Waiting for Triage
        </span>
      }>
        {waitingPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <Head />
              <tbody className="divide-y divide-gray-200">
                {waitingPatients.map((patient) => (
                  <Row key={patient.id} patient={patient} cta="Start Triage" onOpen={openTriage} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="flex justify-center mb-3">
              <CheckCircle className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500">No patients waiting for triage</p>
          </div>
        )}
      </Card>

      {inTriagePatients.length > 0 && (
        <Card title="In Triage">
          <div className="overflow-x-auto">
            <table className="w-full">
              <Head />
              <tbody className="divide-y divide-gray-200">
                {inTriagePatients.map((patient) => (
                  <Row key={patient.id} patient={patient} cta="Continue" onOpen={openTriage} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Triaged and still in clinic — reopen the file for anything else the
          nurse needs to add before checkout (second triage, injection, notes,
          charges). Disappears from here at checkout, not at hand-off. */}
      <Card title={
        <span className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Triaged — still in clinic
          {inClinicPatients.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
              {inClinicPatients.length}
            </span>
          )}
        </span>
      }>
        {inClinicPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <Head statusColumn />
              <tbody className="divide-y divide-gray-200">
                {inClinicPatients.map((patient) => (
                  <Row key={patient.id} patient={patient} cta="Open file" onOpen={openTriage} showStatus variant="outline" />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            No triaged patients in the clinic right now.
          </p>
        )}
      </Card>
    </div>
  );
};

export default TriageWorklist;
