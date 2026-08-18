import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ChevronDown, ArrowLeft, Zap, Radio, Battery, Calendar,
  FileText, Pencil, ClipboardEdit, AlertTriangle,
  KeyRound, UserCheck, UserX, Trash2, UserCog, Stethoscope,
} from "lucide-react";
import { formatDOB } from "../../utils/dateUtils";
import { usePatientContext } from "../../contexts/PatientContext";
import { usePrescriptionContext } from "../../contexts/PrescriptionContext";
import { useQueueContext } from "../../contexts/QueueContext";
import { patientService } from "../../services/patientService";
import api from "../../services/api";

import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import PageHeader from "../../components/shared/PageHeader";
import ProfileTabBar from "../../components/shared/ProfileTabBar";
import SwitcherTabs from "../../components/shared/SwitcherTabs";
import useCollapsibleOverview from "../../hooks/useCollapsibleOverview";
import InactivePatientBanner from "../../components/shared/InactivePatientBanner";
import BarcodeActions from "../../components/shared/BarcodeActions";
import PatientSummaryCard from "../../components/shared/PatientSummaryCard";
import VisitHistoryPanel from "../../components/shared/VisitHistoryPanel";
import StockDispenseHistory from "../../components/shared/StockDispenseHistory";
import MedicalDocumentsTab from "../../components/shared/MedicalDocumentsTab";
import UltrasoundTab from "../../components/shared/UltrasoundTab";
import MedicalEquipmentTab from "../../components/doctor/MedicalEquipmentTab";
import NursingActionsTab from "../../components/nursing/NursingActionsTab";
import TodaysConsultationTab from "../../components/doctor/TodaysConsultationTab";
import PrescriptionManagement from "../../components/doctor/PrescriptionManagement";
import GlycemicChartPanel from "../../components/doctor/GlycemicChartPanel";
import EditVitalsModal from "../../components/doctor/EditVitalsModal";
import EditPatientModal from "../../components/staff/EditPatientModal";
import CompleteRegistrationModal from "../../components/staff/CompleteRegistrationModal";
import ScanActionModal from "../../components/staff/ScanActionModal";

const fmtDate = (d) => {
  if (!d) return "—";
  const parsed = new Date(d);
  return isNaN(parsed) ? d : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// Every portal shows the SAME patient file. The only difference is the first,
// role-specific "live visit" tab, and it's queue-gated — like the doctor's
// Today's Consultation, it only exists while the patient is in an active visit:
//   • doctor        → Today's Consultation
//   • staff / nurse → Nursing
//   • admin         → neither (review-only portal)
// Everything after it is identical everywhere. Visit History is the master
// record (doctor's notes, doctor's actions, nursing history AND prescriptions).
const REST_TABS = [
  { id: "visit-history", name: "Visit History", Icon: Calendar },
  // Diagnostics hosts three sub-tabs: Medical Documents, Ultrasound and Charts.
  { id: "medical-documents", name: "Diagnostics", Icon: FileText },
  { id: "equipment", name: "Medical Equipment", Icon: Battery },
];

// The role-specific live tabs, keyed by the portal's `liveTab`.
const LIVE_TABS = {
  consultation: { id: "consultation", name: "Today's Consultation", Icon: Stethoscope },
  nursing:      { id: "nursing",      name: "Nursing",              Icon: Stethoscope },
};

// Per-portal config. Portals differ only in navigation labels, management
// permissions, and which live tab (if any) they open.
const ROLE_CONFIG = {
  doctor: {
    patientsPath: "/doctor/patients",
    patientsLabel: "Back to Patients",
    canEditPatient: false,
    canEditVitals: true,
    showRegistrationBanner: false,
    liveTab: "consultation",
  },
  staff: {
    patientsPath: "/staff/patients",
    patientsLabel: "Back to Patient Search",
    canEditPatient: true,
    canEditVitals: false,
    showRegistrationBanner: true,
    liveTab: "nursing",
  },
  nurse: {
    patientsPath: "/nurse/queue",
    patientsLabel: "Back to Queue",
    canEditPatient: false,
    canEditVitals: false,
    showRegistrationBanner: false,
    liveTab: "nursing",
  },
  admin: {
    patientsPath: "/admin/manage-users",
    patientsLabel: "Back to Users",
    canEditPatient: true,
    canEditVitals: true,
    canManageAccount: true,
    showRegistrationBanner: true,
    liveTab: null,
  },
};

// Diagnostics tab body — a Medical Documents / Ultrasound / Charts sub-toggle,
// same pattern as Visit History's Visits/Prescriptions. Ultrasound sits 2nd so
// it's always available to every role that can see the patient file.
const DiagnosticsTab = ({ patient }) => {
  const [sub, setSub] = useState("documents");
  return (
    <div>
      <SwitcherTabs
        className="mb-4"
        active={sub}
        onChange={setSub}
        tabs={[
          { id: "documents", label: "Medical Documents" },
          { id: "ultrasound", label: "Radiology" },
          { id: "charts", label: "Charts" },
        ]}
      />
      {sub === "documents" && <MedicalDocumentsTab patient={patient} />}
      {sub === "ultrasound" && <UltrasoundTab patient={patient} />}
      {sub === "charts" && <GlycemicChartPanel patient={patient} />}
    </div>
  );
};

// Visit History tab body — the master record. A Visits/Prescriptions sub-toggle:
// "Visits" is the day-by-day timeline (doctor's notes, actions, nursing);
// "Prescriptions" hosts the prescriptions view, moved here unchanged.
const VisitHistoryTab = ({ patient, uhid, prescriptions }) => {
  const [sub, setSub] = useState("visits");
  return (
    <div>
      <SwitcherTabs
        className="mb-4"
        active={sub}
        onChange={setSub}
        tabs={[{ id: "visits", label: "Visits" }, { id: "prescriptions", label: "Prescriptions" }]}
      />
      {sub === "visits" ? (
        <>
          <VisitHistoryPanel patient={patient} />
          <StockDispenseHistory uhid={uhid} />
        </>
      ) : (
        <PrescriptionManagement patient={patient} patientPrescriptions={prescriptions} readOnly />
      )}
    </div>
  );
};

const InfoRow = ({ label, value, valueClass = "text-gray-800" }) => (
  <div>
    <p className="text-sm text-gray-600">{label}</p>
    <p className={`font-semibold ${valueClass}`}>{value || "—"}</p>
  </div>
);

const OverviewPanel = ({ patient }) => (
  <div className="space-y-6">
    <PatientSummaryCard patient={patient} shadow={false} />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Personal Information" shadow={false} className="border border-gray-100">
        <div className="space-y-3">
          <InfoRow label="Full Name" value={patient.name} />
          <InfoRow label="UHID" value={patient.uhid} valueClass="text-primary" />
          <InfoRow label="Age / Gender" value={`${patient.age ?? "—"} yrs · ${patient.gender ?? "—"}`} />
          {patient.dateOfBirth && <InfoRow label="Date of Birth" value={formatDOB(patient.dateOfBirth)} />}
          <InfoRow label="Phone" value={patient.phone} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Address" value={patient.address} />
        </div>
      </Card>

      <Card title="Medical Information" shadow={false} className="border border-gray-100">
        <div className="space-y-3">
          <InfoRow label="Diagnosis" value={patient.diagnosis} />
          <InfoRow label="Diagnosis Date" value={fmtDate(patient.diagnosisDate)} />
          <InfoRow label="Current HbA1c" value={patient.hba1c || patient.vitals?.hba1c} valueClass="text-red-600" />
          <InfoRow label="Risk Level" value={patient.riskLevel} />
          <InfoRow label="Primary Doctor" value={patient.primaryDoctor} />
          <InfoRow label="Status" value={patient.status} valueClass="text-green-600" />
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Emergency Contact" shadow={false} className="border border-gray-100">
        {patient.emergencyContact?.name ? (
          <div className="space-y-3">
            <InfoRow label="Name" value={patient.emergencyContact.name} />
            <InfoRow label="Relationship" value={patient.emergencyContact.relationship} />
            <InfoRow label="Phone" value={patient.emergencyContact.phone} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No emergency contact on file</p>
        )}
      </Card>

      <Card title="Insurance & Payment" shadow={false} className="border border-gray-100">
        {patient.insurance?.provider ? (
          <div className="space-y-3">
            <InfoRow label="Provider" value={patient.insurance.provider} />
            <InfoRow label="Policy Number" value={patient.insurance.policyNumber} />
            <InfoRow label="Payment Type" value={patient.insurance.type} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No insurance information on file</p>
        )}
      </Card>
    </div>

    <Card title="Allergies" shadow={false} className="border border-gray-100">
      <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
        <p className="text-sm font-semibold text-red-700">{patient.allergies || "None reported"}</p>
      </div>
    </Card>

    {patient.medicalEquipment?.insulinPump?.hasPump && (
      <Card title="Medical Equipment" shadow={false} className="border border-gray-100">
        <div className="space-y-4">
          {patient.medicalEquipment.insulinPump.current && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-gray-800 flex items-center gap-2"><Zap className="w-4 h-4 text-blue-600" /> Insulin Pump</p>
                <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded">Active</span>
              </div>
              <p className="text-sm text-gray-700"><span className="font-semibold">Model:</span> {patient.medicalEquipment.insulinPump.current.model || "Not specified"}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Serial:</span> {patient.medicalEquipment.insulinPump.current.serialNo}</p>
            </div>
          )}
          {patient.medicalEquipment.insulinPump.transmitter?.hasTransmitter && (
            <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-gray-800 flex items-center gap-2"><Radio className="w-4 h-4 text-purple-600" /> Transmitter</p>
                <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded">Active</span>
              </div>
              <p className="text-sm text-gray-700"><span className="font-semibold">Serial:</span> {patient.medicalEquipment.insulinPump.transmitter.serialNo}</p>
            </div>
          )}
        </div>
      </Card>
    )}
  </div>
);

const PatientFile = () => {
  const navigate = useNavigate();
  const { uhid } = useParams();
  const location = useLocation();

  // Behaviour follows the PORTAL you're in (the URL), not the account's role —
  // a doctor with admin access viewing /admin must get the admin file (Back to
  // Users), not be bounced to the doctor patient list.
  const portal = location.pathname.startsWith("/admin") ? "admin"
    : location.pathname.startsWith("/doctor") ? "doctor"
    : location.pathname.startsWith("/nurse") ? "nurse"
    : "staff";
  const cfg = ROLE_CONFIG[portal];
  const fromConsultation = location.state?.fromConsultation;

  // The role-specific live tab (Today's Consultation for doctors, Nursing for
  // staff/nurses, none for admin). Prepended to the shared REST_TABS.
  const liveTabDef = cfg.liveTab ? LIVE_TABS[cfg.liveTab] : null;
  const orderedTabs = liveTabDef ? [liveTabDef, ...REST_TABS] : REST_TABS;

  // A "User Management" tab, appended last, houses every account/management
  // action (edit profile, reset password, activate/deactivate, delete, and
  // whatever is added later). It only appears in portals that can manage the
  // patient — the nurse portal gets no such tab.
  const showUserMgmt = cfg.canEditPatient || cfg.canManageAccount || cfg.canEditVitals;
  const allTabs = showUserMgmt
    ? [...orderedTabs, { id: "user-management", name: "User Management", Icon: UserCog }]
    : orderedTabs;

  const { fetchPatientByUHID } = usePatientContext();
  const { getPrescriptionsByPatient } = usePrescriptionContext();
  const { isInQueue } = useQueueContext();

  // The live tab is the "today's visit" workspace — like the doctor's Today's
  // Consultation, it only exists while the patient is in the queue. When they're
  // not, it's hidden; the past record is always under Visit History.
  const inQueue = isInQueue(uhid);
  const tabs = (liveTabDef && !inQueue)
    ? allTabs.filter((t) => t.id !== liveTabDef.id)
    : allTabs;

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);
  // On the consultation route the doctor should land on Today's Consultation
  // even before the queue finishes loading; elsewhere, the first visible tab.
  const onConsultationRoute = location.pathname.includes("/consultation/");
  const initialTab = location.state?.activeTab || (onConsultationRoute ? "consultation" : tabs[0].id);
  const { activeTab, selectTab, overviewOpen, setOverviewOpen } = useCollapsibleOverview(initialTab);
  // Guard the active tab: if it isn't currently visible (e.g. Nursing after the
  // patient leaves the queue), fall back to the first visible tab.
  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : tabs[0]?.id;
  const [reactivating, setReactivating] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(!!location.state?.scanned);

  const loadPatient = () => fetchPatientByUHID(uhid).then((p) => { setPatient(p || null); setLoading(false); return p; });

  useEffect(() => {
    setLoading(true);
    fetchPatientByUHID(uhid).then((p) => { setPatient(p || null); setLoading(false); });
  }, [uhid, fetchPatientByUHID]);

  // Every portal now has the prescriptions tab, so this no longer skips the
  // doctor portal — without the fetch that tab would render an empty list.
  useEffect(() => {
    if (!patient) return;
    getPrescriptionsByPatient(uhid).then((d) => setPrescriptions(Array.isArray(d) ? d : []));
  }, [patient, uhid, getPrescriptionsByPatient]);

  const handleReactivate = async () => {
    if (!window.confirm(`Reactivate patient ${patient.uhid}? This will unlink them from the merged record.`)) return;
    setReactivating(true);
    try {
      await patientService.reactivatePatient(patient.uhid);
      toast.success("Patient reactivated successfully.");
      await loadPatient();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reactivate patient.");
    } finally {
      setReactivating(false);
    }
  };

  // Account actions (admin portal) — patient equivalents of the old Manage
  // Users row icons, now living inside the file.
  const resetPassword = async () => {
    if (!patient.email) return toast.error("No email on file — add one via Edit Profile first.");
    if (!window.confirm(`Send a password reset link to ${patient.email}?`)) return;
    try {
      await api.post("/auth/forgot-password", { email: patient.email });
      toast.success(`Reset link sent to ${patient.email}.`);
    } catch (err) {
      toast.error(err?.message || "Failed to send reset link.");
    }
  };
  const toggleStatus = async () => {
    const activate = patient.status !== "Active";
    if (!window.confirm(`${activate ? "Activate" : "Deactivate"} ${patient.name}?`)) return;
    try {
      await api.put(`/patients/${uhid}`, { status: activate ? "Active" : "Inactive" });
      toast.success(`${patient.name} ${activate ? "activated" : "deactivated"}.`);
      await loadPatient();
    } catch (err) {
      toast.error(err?.message || "Failed to update status.");
    }
  };
  const deletePatient = async () => {
    if (!window.confirm(`Delete ${patient.name}? This cannot be undone.`)) return;
    if (!window.confirm(`Are you absolutely sure you want to permanently delete ${patient.name}?`)) return;
    try {
      await api.delete(`/patients/${uhid}`);
      toast.success(`${patient.name} deleted.`);
      navigate("/admin/manage-users");
    } catch (err) {
      toast.error(err?.message || "Failed to delete patient.");
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading patient…</div>;

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl font-bold text-red-600">Patient not found!</p>
        <p className="text-gray-600 mt-2">UHID: {uhid}</p>
        <Button onClick={() => navigate(cfg.patientsPath)} className="mt-4">← {cfg.patientsLabel}</Button>
      </div>
    );
  }

  const subline = `${patient.uhid} · ${patient.age ?? "—"} yrs · ${patient.gender ?? "—"}`;

  return (
    <div>
      <PageHeader
        title="Patient Profile"
        actions={
          <div className="flex flex-wrap gap-2">
            {portal === "doctor" && fromConsultation && (
              <Button variant="primary" onClick={() => navigate(`/doctor/consultation/${uhid}`)} className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Back to Consultation
              </Button>
            )}
          </div>
        }
      />

      <InactivePatientBanner
        patient={patient}
        profileBase={cfg.patientsPath}
        onReactivate={handleReactivate}
        reactivating={reactivating}
      />

      {cfg.showRegistrationBanner && !patient.registrationComplete && (
        <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Profile Incomplete</p>
              <p className="text-xs text-amber-700">Registered via phone booking. Complete the full profile when the patient walks in.</p>
            </div>
          </div>
          <button onClick={() => setShowCompleteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors whitespace-nowrap">
            <ClipboardEdit className="w-4 h-4" /> Complete Registration
          </button>
        </div>
      )}

      {/* Collapsible name bar — overview lives in the name tag. */}
      <div
        onClick={() => setOverviewOpen((o) => !o)}
        className={`mb-1 px-4 py-2 rounded-lg shadow-sm border flex items-center justify-between gap-4 cursor-pointer transition-colors ${
          overviewOpen ? "bg-primary border-primary text-white" : "bg-white border-gray-200 hover:bg-blue-50"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${overviewOpen ? "rotate-180 text-white" : "text-gray-400"}`} />
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {patient.name?.charAt(0)}
          </div>
          <h2 className={`text-base font-bold truncate ${overviewOpen ? "text-white" : "text-gray-800"}`}>{patient.name}</h2>
          <span className={`hidden sm:inline text-sm truncate ${overviewOpen ? "text-blue-100" : "text-gray-400"}`}>{subline}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {patient.diagnosis && <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">{patient.diagnosis}</span>}
          <span className={`px-3 py-1 rounded-md text-xs font-semibold ${patient.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{patient.status}</span>
        </div>
      </div>

      <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${overviewOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden min-h-0">
          <div className="py-4">
            <OverviewPanel patient={patient} />
          </div>
        </div>
      </div>

      <ProfileTabBar tabs={tabs} activeTab={currentTab} onChange={selectTab} />

      <div>
        {currentTab === "equipment" && <MedicalEquipmentTab patient={patient} />}
        {currentTab === "consultation" && (
          <TodaysConsultationTab patient={patient} onRefresh={loadPatient} overviewOpen={overviewOpen} />
        )}
        {currentTab === "nursing" && (
          <NursingActionsTab
            patient={patient}
            onRefresh={loadPatient}
            // Staff/nurse return to their queue after a disposition; doctor/admin
            // have no queue, so just refresh the file in place.
            onDone={() => (portal === "staff" || portal === "nurse") ? navigate(`/${portal}/queue`) : loadPatient()}
          />
        )}
        {currentTab === "medical-documents" && <DiagnosticsTab patient={patient} />}
        {currentTab === "visit-history" && (
          <VisitHistoryTab patient={patient} uhid={uhid} prescriptions={prescriptions} />
        )}
        {currentTab === "user-management" && (
          <div className="space-y-6">
            <Card title="Barcode" shadow={false} className="border border-gray-100">
              <p className="text-sm text-gray-500 mb-3">Scan or print this patient's identification barcode.</p>
              <BarcodeActions patient={patient} />
            </Card>
            {(cfg.canEditPatient || cfg.canEditVitals) && (
              <Card title="Profile" shadow={false} className="border border-gray-100">
                <p className="text-sm text-gray-500 mb-3">Edit this patient's details and recorded vitals.</p>
                <div className="flex flex-wrap gap-2">
                  {cfg.canEditPatient && (
                    <Button variant="outline" onClick={() => setShowEditModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm">
                      <Pencil className="w-4 h-4" /> Edit profile
                    </Button>
                  )}
                  {cfg.canEditVitals && (
                    <Button variant="outline" onClick={() => setShowVitalsModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm">
                      <Pencil className="w-4 h-4" /> Edit vitals
                    </Button>
                  )}
                </div>
              </Card>
            )}
            {cfg.canManageAccount && (
              <Card title="Account" shadow={false} className="border border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={resetPassword} className="flex items-center gap-1.5 px-3 py-2 text-sm">
                    <KeyRound className="w-4 h-4" /> Reset password
                  </Button>
                  <Button variant="outline" onClick={toggleStatus} className="flex items-center gap-1.5 px-3 py-2 text-sm">
                    {patient.status === "Active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    {patient.status === "Active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="danger" onClick={deletePatient} className="flex items-center gap-1.5 px-3 py-2 text-sm">
                    <Trash2 className="w-4 h-4" /> Delete patient
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {showVitalsModal && (
        <EditVitalsModal vitals={patient.vitals} uhid={uhid} onClose={() => setShowVitalsModal(false)} onSaved={loadPatient} />
      )}
      {showEditModal && (
        <EditPatientModal patient={patient} onClose={() => setShowEditModal(false)} onUpdated={(updated) => setPatient(updated)} />
      )}
      {showCompleteModal && (
        <CompleteRegistrationModal patient={patient} onCompleted={(updated) => setPatient(updated)} onClose={() => setShowCompleteModal(false)} />
      )}
      {showScanModal && (
        <ScanActionModal patient={patient} onClose={() => setShowScanModal(false)} />
      )}
    </div>
  );
};

export default PatientFile;
