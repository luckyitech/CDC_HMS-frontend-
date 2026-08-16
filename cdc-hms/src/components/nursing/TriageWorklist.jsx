import { useNavigate, useLocation } from "react-router-dom";
import { Stethoscope, CheckCircle } from "lucide-react";
import Card from "../shared/Card";
import Button from "../shared/Button";
import { NURSE_QUEUE_STATUSES, isInjectionReturn } from "../../utils/queueStatus";
import { useQueueContext } from "../../contexts/QueueContext";

// Triage worklist — the patients waiting for a nurse. Each row opens the patient's
// file on the Nursing tab, where triage is performed (TriagePanel). Rendered as the
// Triage tab inside Queue Management (and on the standalone Triage route).
const TriageWorklist = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getQueueByStatus } = useQueueContext();

  const base = location.pathname.startsWith("/nurse") ? "/nurse" : "/staff";

  const waitingPatients = NURSE_QUEUE_STATUSES.flatMap((s) => getQueueByStatus(s));
  const inTriagePatients = getQueueByStatus("In Triage");

  const openTriage = (queueItem) => {
    navigate(`${base}/patient-profile/${queueItem.uhid}`, {
      state: { activeTab: "nursing", queueItemId: queueItem.id },
    });
  };

  const Head = () => (
    <thead className="bg-gray-50 border-b-2 border-gray-200">
      <tr>
        <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">UHID</th>
        <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Patient Name</th>
        <th className="hidden md:table-cell px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Arrival Time</th>
        <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Priority</th>
        <th className="px-4 lg:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
      </tr>
    </thead>
  );

  const Row = ({ patient, cta }) => (
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
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          patient.priority === "Urgent" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        }`}>
          {patient.priority}
        </span>
      </td>
      <td className="px-4 lg:px-6 py-4">
        <Button variant="primary" className="text-xs py-1 px-3" onClick={() => openTriage(patient)}>
          {cta}
        </Button>
      </td>
    </tr>
  );

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
                  <Row key={patient.id} patient={patient} cta="Start Triage" />
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
                  <Row key={patient.id} patient={patient} cta="Continue" />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TriageWorklist;
