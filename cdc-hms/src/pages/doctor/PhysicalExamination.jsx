import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import { usePatientContext } from '../../contexts/PatientContext';
import { usePhysicalExamContext } from '../../contexts/PhysicalExamContext';
import PhysicalExamEntry from './PhysicalExamEntry';
import PhysicalExamFindings from './PhysicalExamFindings';

const PhysicalExamination = ({ uhid: propUHID = null, embedded = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { uhid: urlUHID } = useParams();
  const { getPatientByUHID, patients } = usePatientContext();
  const { saveExamination, getLatestExamination, getExaminationById } = usePhysicalExamContext();
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [mode, setMode] = useState('entry');
  const [currentExamination, setCurrentExamination] = useState(null);

  // Get patient from URL params OR navigation state (flexible!)
  const patientUHID = propUHID || urlUHID || location.state?.patientUHID;
  const fromConsultation = location.state?.fromConsultation || embedded;
  const viewExamId = location.state?.examId;
  const viewMode = location.state?.viewMode;
  const fromProfile = location.state?.fromProfile;

  const allPatients = patients;

  useEffect(() => {
    if (patientUHID) {
      const patient = getPatientByUHID(patientUHID);
      if (patient) {
        setSelectedPatient(patient);
        
        // If specific exam ID is provided, load that exam
        if (viewExamId) {
          const specificExam = getExaminationById(viewExamId);
          if (specificExam) {
            setCurrentExamination(specificExam);
            setMode(viewMode || 'findings');
          }
        } else {
          // Otherwise load latest exam
          const latestExam = getLatestExamination(patientUHID);
          if (latestExam) {
            setCurrentExamination(latestExam);
            setMode('findings');
          }
        }
      }
    }
  }, [patientUHID, viewExamId, getPatientByUHID, getLatestExamination, getExaminationById]);

  const handleSelectPatient = (uhid) => {
    const patient = getPatientByUHID(uhid);
    setSelectedPatient(patient);
    setMode('entry');
    setCurrentExamination(null);
  };

  const handleSaveExamination = (examData, generateFindings) => {
    const savedExam = saveExamination(examData);
    setCurrentExamination(savedExam);
    
    if (generateFindings) {
      setMode('findings');
    } else {
      alert('Examination draft saved successfully!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    setMode('entry');
  };

  const handleCancel = () => {
    if (fromConsultation) {
      navigate('/doctor/consultations');
    } else {
      setSelectedPatient(null);
      setCurrentExamination(null);
      setMode('entry');
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
              onClick={() => navigate('/doctor/consultations')}
            >
               Back to Consultation
            </Button>
          )}
          {selectedPatient && mode === 'findings' && (
            <Button 
              variant="outline"
              onClick={() => setMode('entry')}
            >
              New Examination
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Patient Selection (only show if NOT from consultation) */}
        {!fromConsultation && (
          <div className="lg:col-span-1">
            <Card title="Select Patient">
              <div className="space-y-2">
                {allPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient.uhid)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedPatient?.uhid === patient.uhid
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-sm text-primary">{patient.uhid}</p>
                    <p className="font-semibold text-sm">{patient.name}</p>
                    <p className="text-xs text-gray-600">{patient.age} yrs {patient.gender}</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Main Content Area */}
        <div className={fromConsultation ? 'lg:col-span-4' : 'lg:col-span-3'}>
          {!selectedPatient ? (
            <Card>
              <div className="text-center py-12">
                {/* <div className="text-6xl mb-4">ðŸ©º</div> */}
                <p className="text-gray-500 text-lg">
                  Select a patient to begin physical examination
                </p>
              </div>
            </Card>
          ) : mode === 'entry' ? (
            <PhysicalExamEntry
              patientData={selectedPatient}
              initialData={currentExamination?.data || {}}
              onSave={handleSaveExamination}
              onCancel={handleCancel}
            />
          ) : mode === 'findings' && currentExamination ? (
            <div className="print-content">
              <PhysicalExamFindings
                examinationData={currentExamination}
                onEdit={handleEdit}
                onPrint={handlePrint}
                onClose={fromConsultation ? () => navigate('/doctor/consultations') : null}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PhysicalExamination;