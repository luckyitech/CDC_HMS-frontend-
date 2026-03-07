import { useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import { usePatientContext } from "../../contexts/PatientContext";
import GlycemicChartPanel from "../../components/doctor/GlycemicChartPanel";

const GlycemicCharts = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uhid: urlUHID } = useParams();
  const { getPatientByUHID, patients } = usePatientContext();

  // Get patient from URL params OR navigation state
  const patientUHID = urlUHID || location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation;

  const [manualPatient, setManualPatient] = useState(null);

  // Derive patient from URL/state or manual selection
  const selectedPatient = useMemo(() => {
    if (patientUHID) {
      return getPatientByUHID(patientUHID) || null;
    }
    return manualPatient;
  }, [patientUHID, getPatientByUHID, manualPatient]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-800">
          Glycemic Charts
        </h2>
        {fromConsultation && (
          <Button
            variant="outline"
            onClick={() => navigate(`/doctor/consultation/${patientUHID}`)}
          >
            ← Back to Consultation
          </Button>
        )}
      </div>

      {!selectedPatient && !fromConsultation ? (
        <Card title="Select Patient to View Charts">
          {patients.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading patients...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => setManualPatient(patient)}
                  className="text-left p-6 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 transition"
                >
                  <p className="font-bold text-primary text-lg">{patient.uhid}</p>
                  <p className="font-semibold text-gray-800 text-xl mt-2">{patient.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{patient.age} years</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <GlycemicChartPanel patient={selectedPatient} />
      )}
    </div>
  );
};

export default GlycemicCharts;
