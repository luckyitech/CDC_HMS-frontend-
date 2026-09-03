import { useState, useEffect } from "react";
import { UserPlus, X, AlertCircle, CheckCircle2, BedDouble } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../shared/Button";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";
import inpatientService from "../../services/inpatientService";
import { DESTINATIONS, DESTINATION_META, RADIOLOGY_SERVICES } from "../../constants/queueDestinations";

// THE add-patient modal — one component, used by Patient Search and the patient
// profile scan action. A `destination` selector routes the visit:
//   Outpatient — clinic visit (triage -> doctor). The original flow.
//   Radiology  — captures a `service` (Neuropathy / Ultrasound); triage -> line-up.
//   Inpatient  — a walk-in admission: picks a bed and calls admissions/direct,
//                feeding the existing inpatient machinery (never a queue row).
//   Pharmacy   — a pharmacy-queue visit (portal to come; surfaces in Queue Mgmt).
//
// DRY: destination labels/tones/icons live in constants/queueDestinations.js;
// the inpatient branch reuses inpatientService (bed board + directAdmit).
const AddToQueueModal = ({ patient, onClose, onAdded }) => {
  const { queue, addToQueue } = useQueueContext();
  const { getDoctors } = useUserContext();
  const doctors = getDoctors();

  const todayStr = new Date().toDateString();
  const canReview = queue.some(
    (q) =>
      q.uhid === patient.uhid &&
      q.status === "Completed" &&
      new Date(q.createdAt).toDateString() === todayStr
  );

  const [destination, setDestination] = useState("Outpatient");
  const [service, setService] = useState(RADIOLOGY_SERVICES[0].value);
  const [queuePriority, setQueuePriority] = useState("Normal");
  const [queueReason, setQueueReason] = useState("");
  const [visitType, setVisitType] = useState("new");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Inpatient (walk-in admission) state — loaded lazily when that destination is picked
  const [board, setBoard] = useState([]);
  const [bedId, setBedId] = useState("");
  const [admissionType, setAdmissionType] = useState("Elective");
  const [admittingDoctorId, setAdmittingDoctorId] = useState("");

  useEffect(() => {
    if (destination === "Inpatient" && board.length === 0) {
      inpatientService.getBoard().then((r) => setBoard(r.data || [])).catch(() => {});
    }
  }, [destination, board.length]);

  const availableBeds = board.flatMap((w) =>
    (w.beds || []).filter((b) => b.status === "Available").map((b) => ({ ...b, ward: w.name }))
  );

  // Review only applies to a normal outpatient visit
  const showReview = destination === "Outpatient" && canReview;
  const isReview = showReview && visitType === "review";

  const okToast = (msg) =>
    toast.success(msg, {
      duration: 3000,
      icon: <CheckCircle2 className="w-5 h-5" />,
      style: { background: "#D1FAE5", color: "#065F46", fontWeight: "bold", padding: "16px" },
    });
  const errToast = (msg) =>
    toast.error(msg, {
      duration: 3000,
      icon: <AlertCircle className="w-5 h-5" />,
      style: { background: "#FEE2E2", color: "#991B1B", fontWeight: "bold", padding: "16px" },
    });

  const handleConfirm = async () => {
    // ── Inpatient: walk-in admission straight to a bed (existing admission flow) ──
    if (destination === "Inpatient") {
      if (!bedId) return errToast("Select an available bed");
      setSubmitting(true);
      try {
        await inpatientService.directAdmit({
          uhid: patient.uhid,
          bedId: Number(bedId),
          admissionType,
          admissionSource: "Walk-in",
          admissionReason: queueReason || null,
          admittingDoctorId: admittingDoctorId ? Number(admittingDoctorId) : null,
        });
        okToast(`${patient.name} admitted to the ward`);
        onAdded?.();
        onClose();
      } catch (err) {
        errToast(err?.status === 409 ? "That bed was just taken — pick another" : (err?.message || "Admission failed"));
        inpatientService.getBoard().then((r) => setBoard(r.data || [])); // refresh beds
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // ── Queue destinations (Outpatient / Radiology / Pharmacy) ──
    if (isReview && !selectedDoctorId) {
      errToast("Please select a doctor for the review visit");
      return;
    }
    setSubmitting(true);
    const result = await addToQueue(
      patient,
      queuePriority,
      queueReason,
      isReview ? selectedDoctorId : null,
      isReview,
      { destination, service: destination === "Radiology" ? service : null }
    );
    setSubmitting(false);
    if (result.success) {
      okToast(`${patient.name} added to queue!`);
      onAdded?.();
      onClose();
    } else {
      errToast(result.message);
    }
  };

  const cta =
    destination === "Inpatient" ? "Admit patient"
    : destination === "Pharmacy" ? "Add to Pharmacy queue"
    : "Add to Queue";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md my-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add to Queue
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="font-semibold text-gray-800">{patient.name}</p>
          <p className="text-sm text-gray-600">UHID: {patient.uhid}</p>
          <p className="text-sm text-gray-600">{patient.age} yrs &middot; {patient.gender}</p>
        </div>

        {/* Destination — routes the visit */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Destination</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:border-primary bg-white"
          >
            {DESTINATIONS.map((d) => (
              <option key={d} value={d}>{DESTINATION_META[d].label}</option>
            ))}
          </select>
        </div>

        {/* Radiology — service sub-type */}
        {destination === "Radiology" && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service</label>
            <div className="grid grid-cols-2 gap-3">
              {RADIOLOGY_SERVICES.map((s) => (
                <label key={s.value} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                  service === s.value ? "border-primary bg-blue-50" : "border-gray-200 bg-white"
                }`}>
                  <input type="radio" name="radioService" value={s.value}
                    checked={service === s.value} onChange={() => setService(s.value)} className="accent-primary" />
                  <span className="text-sm font-medium text-gray-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Inpatient — walk-in admission (existing admission machinery) */}
        {destination === "Inpatient" && (
          <div className="mb-4">
            <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 mb-3 text-xs text-purple-800 flex items-start gap-2">
              <BedDouble className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Walk-in admission — creates an inpatient stay directly against a bed. No outpatient queue row.</span>
            </div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Bed <span className="text-red-500">*</span></label>
            <select value={bedId} onChange={(e) => setBedId(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:border-primary">
              <option value="">Select an available bed…</option>
              {availableBeds.map((b) => (
                <option key={b.bedId} value={b.bedId}>{b.ward} · {b.roomName} · {b.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Admission type</label>
                <select value={admissionType} onChange={(e) => setAdmissionType(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary">
                  <option value="Elective">Elective</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Observation">Observation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Admitting doctor</label>
                <select value={admittingDoctorId} onChange={(e) => setAdmittingDoctorId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary">
                  <option value="">Select…</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Review visit — outpatient only, and only if discharged today */}
        {showReview && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Visit Type</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                  visitType === "new" ? "border-primary bg-blue-50" : "border-gray-200 bg-white"
                }`}>
                  <input type="radio" name="scanVisitType" value="new"
                    checked={visitType === "new"} onChange={() => setVisitType("new")} className="accent-primary" />
                  <span className="text-sm font-medium text-gray-700">New Visit</span>
                </label>
                <label className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                  visitType === "review" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                }`}>
                  <input type="radio" name="scanVisitType" value="review"
                    checked={visitType === "review"} onChange={() => setVisitType("review")} className="accent-green-500" />
                  <span className="text-sm font-medium text-gray-700">Review Visit</span>
                </label>
              </div>
              {visitType === "review" && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">
                  Patient will skip triage and go directly to Awaiting Doctor.
                </p>
              )}
            </div>

            {visitType === "review" && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Assign Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:border-primary ${
                    selectedDoctorId ? "border-gray-300" : "border-red-300"
                  }`}
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
                {!selectedDoctorId && (
                  <p className="text-xs text-red-500 mt-1">Required for review visits</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Priority */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="scanPriority" value="Normal"
                checked={queuePriority === "Normal"} onChange={(e) => setQueuePriority(e.target.value)} className="mr-2" />
              <span className="text-sm">Normal</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" name="scanPriority" value="Urgent"
                checked={queuePriority === "Urgent"} onChange={(e) => setQueuePriority(e.target.value)} className="mr-2" />
              <span className="text-sm text-red-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Urgent
              </span>
            </label>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {destination === "Inpatient" ? "Admission reason" : destination === "Pharmacy" ? "Reason / note" : "Reason for Visit"}
          </label>
          <input
            type="text"
            value={queueReason}
            onChange={(e) => setQueueReason(e.target.value)}
            placeholder="e.g., Routine checkup, Follow-up, Emergency"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" onClick={handleConfirm} disabled={submitting}>
            <UserPlus className="w-4 h-4 mr-2" /> {submitting ? "Working…" : cta}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddToQueueModal;
