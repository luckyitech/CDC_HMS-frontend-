import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import PageHeader from "../../components/shared/PageHeader";
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
  const { getLatestExamination, getExaminationById } =
    usePhysicalExamContext();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [mode, setMode] = useState("entry");

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
          setMode(viewMode || "findings");
        }
      } else {
        // Otherwise load latest exam
        const latestExam = getLatestExamination(patientUHID);
        if (latestExam) {
          setMode("findings");
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  };

  return (
    <div>
      <PageHeader
        title="Physical Examination"
        actions={
          <>
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
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Selection (only show if NOT from consultation or profile) */}
        {!fromConsultation && !fromProfile && !embedded && !patientUHID && (
          <div className="lg:col-span-1">
            <Card title="Select Patient">
              <PatientSearchInput
                onSelect={handleSelectPatient}
                selectedPatient={selectedPatient}
                onClear={() => { setSelectedPatient(null); setMode("entry"); }}
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
