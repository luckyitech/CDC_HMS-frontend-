import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import PatientSearchInput from "../../components/shared/PatientSearchInput";
import { usePhysicalExamContext } from "../../contexts/PhysicalExamContext";
import PhysicalExamEntry from "./PhysicalExamEntry";
import PhysicalExamFindings from "./PhysicalExamFindings";
import PhysicalExamList from "../../components/doctor/PhysicalExamList";

const PhysicalExamination = ({ uhid: propUHID = null, embedded = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uhid: urlUHID } = useParams();
  const { fetchPatientByUHID } = usePatientContext();
  const { saveExamination, getLatestExamination, getExaminationById } =
    usePhysicalExamContext();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [mode, setMode] = useState("entry");
  const [currentExamination, setCurrentExamination] = useState(null);

  // Get patient from URL params OR navigation state (flexible!)
  const patientUHID = propUHID || urlUHID || location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation || embedded;
  const viewExamId = location.state?.examId;
  const viewMode = location.state?.viewMode;
  const fromProfile = location.state?.fromProfile;

  useEffect(() => {
    if (!patientUHID) return;
    fetchPatientByUHID(patientUHID).then(patient => {
      if (!patient) return;
      setSelectedPatient(patient);

      // If specific exam ID is provided, load that exam
      if (viewExamId) {
        const specificExam = getExaminationById(viewExamId);
        if (specificExam) {
          setCurrentExamination(specificExam);
          setMode(viewMode || "findings");
        }
      } else {
        // Otherwise load latest exam
        const latestExam = getLatestExamination(patientUHID);
        if (latestExam) {
          setCurrentExamination(latestExam);
          setMode("findings");
        }
      }
    });
  }, [
    patientUHID,
    viewExamId,
    fetchPatientByUHID,
    getLatestExamination,
    getExaminationById,
  ]);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setMode("entry");
    setCurrentExamination(null);
  };

  const handleSaveExamination = async (examData, generateFindings) => {
    const savedExam = await saveExamination(examData);

    if (!savedExam) {
      toast.error("Failed to save examination. Please try again.", {
        duration: 4000,
        position: "top-right",
        style: { background: "#EF4444", color: "#fff", fontWeight: "bold", padding: "16px" },
      });
      return;
    }

    setCurrentExamination(savedExam);

    if (generateFindings) {
      setMode("findings");
    } else {
      toast.success("Examination Draft Saved Successfully", {
        duration: 3000,
        position: "top-right",
        icon: "✅",
        style: { background: "#10B981", color: "#FFFFFF", fontWeight: "bold", padding: "16px" },
      });
    }
  };

  const handleEdit = () => {
    setMode("entry");
  };

  const handleCancel = () => {
    if (fromConsultation && embedded) {
      // Stay in embedded tab - do nothing
      return;
    } else if (fromConsultation) {
      // Navigate back to consultation page with tabs
      navigate(`/doctor/consultation/${selectedPatient.uhid}`);
    } else {
      setSelectedPatient(null);
      setCurrentExamination(null);
      setMode("entry");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Physical Examination
        </h2>
        <div className="flex gap-2">
          {fromConsultation && !embedded && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/doctor/consultation/${selectedPatient?.uhid}`)
              }
            >
              Back to Consultation
            </Button>
          )}
          {selectedPatient && mode === "findings" && (
            <Button variant="outline" onClick={() => setMode("entry")}>
              New Examination
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Selection (only show if NOT from consultation or profile) */}
        {!fromConsultation && !fromProfile && !embedded && !patientUHID && (
          <div className="lg:col-span-1">
            <Card title="Select Patient">
              <PatientSearchInput
                onSelect={handleSelectPatient}
                selectedPatient={selectedPatient}
                onClear={() => { setSelectedPatient(null); setCurrentExamination(null); setMode("entry"); }}
                placeholder="Search by name or UHID..."
              />
            </Card>
          </div>
        )}

        {/* Main Content Area */}
        <div
          className={
            fromConsultation || fromProfile ? "lg:col-span-4" : "lg:col-span-3"
          }
        >
          {!selectedPatient ? (
            <Card>
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  Select a patient to begin physical examination
                </p>
              </div>
            </Card>
          ) : (
            <PhysicalExamList patient={selectedPatient} embedded={false} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PhysicalExamination;
