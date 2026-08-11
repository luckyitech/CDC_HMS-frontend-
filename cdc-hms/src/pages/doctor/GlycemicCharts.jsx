import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import PageHeader from "../../components/shared/PageHeader";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import GlycemicChartPanel from "../../components/doctor/GlycemicChartPanel";
import PatientSearchInput from "../../components/shared/PatientSearchInput";

const GlycemicCharts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uhid: urlUHID } = useParams();
  const { fetchPatientByUHID } = usePatientContext();

  const patientUHID = urlUHID || location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation;

  const [selectedPatient, setSelectedPatient] = useState(null);

  // Load patient from URL/navigation state
  useEffect(() => {
    if (patientUHID) {
      fetchPatientByUHID(patientUHID).then(patient => {
        if (patient) setSelectedPatient(patient);
      });
    }
  }, [patientUHID, fetchPatientByUHID]);

  return (
    <div>
      <PageHeader
        title="Glycemic Charts"
        actions={fromConsultation && (
          <Button
            variant="outline"
            onClick={() => navigate(`/doctor/consultation/${patientUHID}`)}
          >
            ← Back to Consultation
          </Button>
        )}
      />

      {!selectedPatient && !fromConsultation ? (
        <Card title="Select Patient to View Charts">
          <PatientSearchInput
            onSelect={setSelectedPatient}
            placeholder="Search by name or UHID..."
          />
        </Card>
      ) : (
        <GlycemicChartPanel patient={selectedPatient} />
      )}
    </div>
  );
};

export default GlycemicCharts;
