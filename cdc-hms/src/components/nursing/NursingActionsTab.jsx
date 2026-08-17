import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Stethoscope, ClipboardList, Syringe, ChevronDown, Receipt, ClipboardPlus, FileText } from "lucide-react";
import TriagePanel from "./TriagePanel";
import NursingKardex from "./NursingKardex";
import Glp1InjectionCard from "../shared/Glp1InjectionCard";
import SendToDoctorModal from "./SendToDoctorModal";
import BillingModal from "../shared/BillingModal";
import RecordUseModal from "../stock/RecordUseModal";
import { NURSE_QUEUE_STATUSES } from "../../utils/queueStatus";
import { NURSE_CHARGE_OPTIONS, NURSE_PROCEDURE_OPTIONS } from "../../constants/billingOptions";
import { useQueueContext } from "../../contexts/QueueContext";
import toast from "react-hot-toast";

// Was the patient triaged today? Nursing tools use this visit's vitals, so they
// stay locked until triage has recorded them.
const isToday = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  return !Number.isNaN(dt) && dt.toDateString() === new Date().toDateString();
};

// GLP-1 injection recording — the nurse's dose-ladder card. It renders nothing
// when the patient has no live course, so this wrapper shows a note instead of an
// empty pane in that case.
const Glp1InjectionAction = ({ patient }) => {
  const [hasCourse, setHasCourse] = useState(null);
  return (
    <div>
      <Glp1InjectionCard patient={patient} onTherapyChange={(therapy) => setHasCourse(!!therapy)} />
      {hasCourse === false && (
        <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
          {patient?.name || "This patient"} has no active GLP-1 course. A doctor starts a
          course from the consultation before injections can be recorded here.
        </div>
      )}
    </div>
  );
};

/**
 * Nursing actions available inside the patient file. Add a new action here and it
 * shows up in the searchable list and renders on the right automatically — the
 * vertical-slice extension point for nursing work (GLP-1 injection, IV
 * monitoring, …). Each action's render gets { patient, queueItem, onDone }.
 */
const NURSING_ACTIONS = [
  {
    id: "triage",
    name: "Triage",
    Icon: Stethoscope,
    // Needs an active queue entry so triage knows which visit it's recording.
    requiresQueue: true,
    render: ({ patient, queueItem, onRefresh }) => (
      <TriagePanel patient={patient} queueItem={queueItem} onSaved={onRefresh} />
    ),
  },
  {
    id: "glp1",
    name: "GLP-1 injection",
    Icon: Syringe,
    // Uses this visit's vitals (weight for dosing), so triage must be done first.
    requiresTriage: true,
    render: ({ patient }) => <Glp1InjectionAction patient={patient} />,
  },
  {
    id: "kardex",
    name: "Nursing notes",
    Icon: FileText,
    render: ({ patient }) => <NursingKardex patient={patient} />,
  },
];

/**
 * NursingActionsTab — the "Nursing" tab body inside the patient file. A searchable
 * rail of nursing actions on the left; the selected one opens on the right.
 *
 * Props:
 *   patient  resolved patient object
 *   onDone   called when an action finishes (e.g. triage sent to doctor/billing)
 */
const NursingActionsTab = ({ patient, onRefresh = () => {}, onDone = () => {} }) => {
  const { getQueueByStatus, sendToBilling, updateQueueStatus } = useQueueContext();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(NURSING_ACTIONS[0].id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null); // 'doctor' | 'record' | 'billing'
  // How the billing modal behaves when it fires:
  //   'bill'         — finalise: send the patient to billing (Pending Billing).
  //   'sendToDoctor' — the nurse has picked a doctor (pendingDoctor); submitting
  //                    merges the nurse's charges AND moves the row to Awaiting
  //                    Doctor in one update. Every hand-off carries its billing:
  //                    nurse bills their side here, the doctor adds theirs at
  //                    Complete Consultation, reception adds extras at checkout.
  const [billingMode, setBillingMode] = useState("bill");
  const [pendingDoctor, setPendingDoctor] = useState(null); // { doctorId, doctorName }
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // The patient's live queue entry, if they're currently in for triage. Scanned
  // across every nurse-facing status so it works whether they're just arrived,
  // mid-triage, or a doctor's injection return.
  const triageQueueItem = useMemo(() => {
    const statuses = [...NURSE_QUEUE_STATUSES, "In Triage"];
    for (const s of statuses) {
      const item = getQueueByStatus(s).find((q) => q.uhid === patient?.uhid);
      if (item) return item;
    }
    return null;
  }, [getQueueByStatus, patient?.uhid]);

  const triagedToday = isToday(patient?.vitals?.recordedAt);

  const filtered = NURSING_ACTIONS.filter((a) =>
    a.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const active = NURSING_ACTIONS.find((a) => a.id === activeId) || NURSING_ACTIONS[0];

  return (
    <div className="space-y-4">
      {/* Disposition actions — doctor-style dropdown, decoupled from the tools */}
      <div className="flex justify-end">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Actions <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20">
              <button
                type="button"
                disabled={!triageQueueItem}
                onClick={() => { setMenuOpen(false); setModal("doctor"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Stethoscope className="w-4 h-4 flex-shrink-0" /> Send to doctor
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setModal("record"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-blue-50 border-t border-gray-100"
              >
                <ClipboardPlus className="w-4 h-4 flex-shrink-0" /> Record use
              </button>
              <button
                type="button"
                disabled={!triageQueueItem}
                onClick={() => { setMenuOpen(false); setBillingMode("bill"); setModal("billing"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-blue-50 border-t border-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Receipt className="w-4 h-4 flex-shrink-0" /> Send to billing
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
      {/* Action list + search */}
      <div>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">No actions match &ldquo;{query}&rdquo;.</p>
          ) : (
            filtered.map((a) => {
              const Icon = a.Icon;
              const on = a.id === activeId;
              return (
                <button
                  key={a.id}
                  onClick={() => setActiveId(a.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                    on
                      ? "bg-blue-50 text-primary font-semibold border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{a.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active action */}
      <div className="min-w-0">
        {active.requiresQueue && !triageQueueItem ? (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
            <ClipboardList className="w-5 h-5 flex-shrink-0" />
            <span>
              {patient?.name || "This patient"} isn&rsquo;t in the triage queue right now. Add
              them to the queue from Queue Management to run triage.
            </span>
          </div>
        ) : active.requiresTriage && !triagedToday ? (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
            <Stethoscope className="w-5 h-5 flex-shrink-0" />
            <span>
              Complete triage first — this tool uses today&rsquo;s vitals.{" "}
              <button
                type="button"
                onClick={() => setActiveId("triage")}
                className="font-semibold underline hover:no-underline"
              >
                Go to triage
              </button>
            </span>
          </div>
        ) : (
          active.render({ patient, queueItem: triageQueueItem, onDone, onRefresh })
        )}
      </div>
      </div>

      {modal === "doctor" && triageQueueItem && (
        <SendToDoctorModal
          patient={patient}
          onClose={() => setModal(null)}
          // Step 1 picks the doctor; step 2 (below) bills the nurse's side and
          // sends in one update. The old order — send, then bill — never showed
          // billing: once the row was Awaiting Doctor it was no longer the
          // nurse's queue item, so the billing modal had nothing to render for.
          onSelect={(doctor) => { setPendingDoctor(doctor); setBillingMode("sendToDoctor"); setModal("billing"); }}
        />
      )}
      {modal === "billing" && triageQueueItem && (
        <BillingModal
          patient={patient}
          title={billingMode === "sendToDoctor" ? `Bill your side — sending to ${pendingDoctor?.doctorName}` : "Send to billing"}
          submitLabel={billingMode === "sendToDoctor" ? "Add to bill & send to doctor" : "Send to billing"}
          chargeOptions={NURSE_CHARGE_OPTIONS}
          procedureOptions={NURSE_PROCEDURE_OPTIONS}
          existingCharges={triageQueueItem.selectedCharges || []}
          existingProcedures={triageQueueItem.selectedProcedures || []}
          onSubmit={async ({ charges, procedures }) => {
            if (billingMode === "sendToDoctor") {
              // One atomic update: nurse's charges merged onto whatever is already
              // on the visit, doctor assigned, status → Awaiting Doctor. The
              // doctor's Complete Consultation and reception's checkout both merge
              // onto selectedCharges too, so the bill keeps building.
              const result = await updateQueueStatus(triageQueueItem.id, "Awaiting Doctor", pendingDoctor.doctorId, {
                selectedCharges: [...new Set([...(triageQueueItem.selectedCharges || []), ...charges])],
                selectedProcedures: [...new Set([...(triageQueueItem.selectedProcedures || []), ...procedures])],
              });
              if (result?.success === false) { toast.error(result.message || "Could not send to doctor"); return; }
              toast.success(`${patient?.name} sent to ${pendingDoctor.doctorName}`);
            } else {
              await sendToBilling(triageQueueItem.id, charges, procedures);
              toast.success(`${patient?.name} sent to billing`);
            }
            setModal(null);
            setPendingDoctor(null);
            onDone();
          }}
          // Cancelling here cancels the hand-off: nothing was sent, the patient
          // is still with nursing. Same rule as admit/refer — billing is not a
          // step you can skip past.
          onClose={() => { setModal(null); setPendingDoctor(null); }}
        />
      )}
      {modal === "record" && (
        <RecordUseModal patient={patient ? { uhid: patient.uhid, name: patient.name } : null} onClose={() => setModal(null)} />
      )}
    </div>
  );
};

export default NursingActionsTab;
