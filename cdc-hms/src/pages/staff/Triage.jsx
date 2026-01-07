import { useState } from "react";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import Input from "../../components/shared/Input";
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import { useUserContext } from "../../contexts/UserContext";

const Triage = () => {
  const { currentUser } = useUserContext();
  const { getPatientByUHID, updatePatientVitals } = usePatientContext();
  const { getQueueByStatus, updateQueueStatus } = useQueueContext();

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    weight: "",
    height: "",
    oxygenSaturation: "",
    rbs: "", // Random Blood Sugar
    hba1c: "", // HbA1c
    ketones: "", // Ketones
  });
  const [chiefComplaint, setChiefComplaint] = useState("");

  // Calculate BMI
  const calculateBMI = () => {
    if (vitals.weight && vitals.height) {
      const weightKg = parseFloat(vitals.weight);
      const heightM = parseFloat(vitals.height) / 100; // cm to meters
      const bmi = (weightKg / (heightM * heightM)).toFixed(1);
      return bmi;
    }
    return "";
  };

  const bmi = calculateBMI();

  // Get patients waiting or in triage
  const waitingPatients = getQueueByStatus("Waiting");
  const inTriagePatients = getQueueByStatus("In Triage");

  const handleSelectPatient = (uhid) => {
    const patient = getPatientByUHID(uhid);
    setSelectedPatient(patient);

    // Update queue status to "In Triage"
    updateQueueStatus(uhid, "In Triage");

    // Reset form
    setVitals({
      bloodPressure: "",
      heartRate: "",
      temperature: "",
      weight: "",
      height: "",
      oxygenSaturation: "",
      rbs: "",
      hba1c: "",
      ketones: "",
    });
    setChiefComplaint("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Prepare triage data
    const triageData = {
      bp: vitals.bloodPressure,
      heartRate: vitals.heartRate + " bpm",
      temperature: vitals.temperature + "°C",
      weight: vitals.weight + " kg",
      height: vitals.height + " cm",
      bmi: bmi ? bmi + " kg/m²" : "",
      oxygenSaturation: vitals.oxygenSaturation + "%",
      rbs: vitals.rbs ? vitals.rbs + " mg/dL" : "",
      hba1c: vitals.hba1c ? vitals.hba1c + "%" : "",
      ketones: vitals.ketones ? vitals.ketones + " mmol/L" : "",
      chiefComplaint: chiefComplaint,
      lastTriageDate: new Date().toISOString(),
      triageBy: currentUser?.name || "Staff",
    };

    // Save vitals to patient record
    const result = updatePatientVitals(selectedPatient.uhid, triageData);

    // Update queue status to "With Doctor"
    updateQueueStatus(selectedPatient.uhid, "With Doctor");

    if (result.success) {
      alert(
        `Triage completed for ${selectedPatient.name}!\n\nVitals recorded successfully.\nPatient moved to doctor's queue.`
      );
    }

    setSelectedPatient(null);
  };

  const handleCancel = () => {
    if (selectedPatient) {
      // Move patient back to "Waiting"
      updateQueueStatus(selectedPatient.uhid, "Waiting");
      setSelectedPatient(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-6">
        Triage
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Patients List */}
        <div className="lg:col-span-1">
          <Card title="Waiting Patients">
            {waitingPatients.length > 0 ? (
              <div className="space-y-3">
                {waitingPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient.uhid)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedPatient?.uhid === patient.uhid
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-primary">{patient.uhid}</p>
                      {patient.priority === "Urgent" && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 mt-1">
                      {patient.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {patient.age} yrs • {patient.gender}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Arrived: {patient.arrivalTime}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No patients waiting</p>
              </div>
            )}
          </Card>

          {/* Currently in Triage */}
          {inTriagePatients.length > 0 && (
            <Card title="In Triage" className="mt-4">
              <div className="space-y-2">
                {inTriagePatients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <p className="font-semibold text-sm">{patient.name}</p>
                    <p className="text-xs text-gray-600">{patient.uhid}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Triage Form */}
        <div className="lg:col-span-2">
          {!selectedPatient ? (
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-gray-500 text-lg">
                  Select a patient to start triage
                </p>
              </div>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <Card title={`Triage - ${selectedPatient.name}`}>
                <div className="space-y-6">
                  {/* Patient Info */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">UHID</p>
                        <p className="font-semibold text-primary">
                          {selectedPatient.uhid}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Age / Gender</p>
                        <p className="font-semibold">
                          {selectedPatient.age} yrs • {selectedPatient.gender}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Diabetes Type</p>
                        <p className="font-semibold">
                          {selectedPatient.diabetesType}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last HbA1c</p>
                        <p className="font-semibold text-red-600">
                          {selectedPatient.hba1c}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chief Complaint */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Chief Complaint *
                    </label>
                    <textarea
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="Patient's main reason for visit..."
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                      required
                    />
                  </div>

                  {/* Vitals */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4">
                      Vital Signs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Blood Pressure *"
                        type="text"
                        value={vitals.bloodPressure}
                        onChange={(e) =>
                          setVitals({
                            ...vitals,
                            bloodPressure: e.target.value,
                          })
                        }
                        placeholder="120/80 mmHg"
                        required
                      />

                      <Input
                        label="Heart Rate *"
                        type="number"
                        value={vitals.heartRate}
                        onChange={(e) =>
                          setVitals({ ...vitals, heartRate: e.target.value })
                        }
                        placeholder="bpm"
                        required
                      />

                      <Input
                        label="Temperature *"
                        type="number"
                        step="0.1"
                        value={vitals.temperature}
                        onChange={(e) =>
                          setVitals({ ...vitals, temperature: e.target.value })
                        }
                        placeholder="°C"
                        required
                      />

                      <Input
                        label="Oxygen Saturation"
                        type="number"
                        value={vitals.oxygenSaturation}
                        onChange={(e) =>
                          setVitals({
                            ...vitals,
                            oxygenSaturation: e.target.value,
                          })
                        }
                        placeholder="%"
                      />

                      <Input
                        label="Weight"
                        type="number"
                        step="0.1"
                        value={vitals.weight}
                        onChange={(e) =>
                          setVitals({ ...vitals, weight: e.target.value })
                        }
                        placeholder="kg"
                      />

                      <Input
                        label="Height"
                        type="number"
                        value={vitals.height}
                        onChange={(e) =>
                          setVitals({ ...vitals, height: e.target.value })
                        }
                        placeholder="cm"
                      />

                      {/* BMI Display */}
                      {bmi && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            BMI (Calculated)
                          </label>
                          <div className="px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                            <span className="text-lg font-bold text-blue-700">
                              {bmi} kg/m²
                            </span>
                            <span className="text-xs text-gray-600 ml-2">
                              {parseFloat(bmi) < 18.5
                                ? "(Underweight)"
                                : parseFloat(bmi) < 25
                                ? "(Normal)"
                                : parseFloat(bmi) < 30
                                ? "(Overweight)"
                                : "(Obese)"}
                            </span>
                          </div>
                        </div>
                      )}

                      <Input
                        label="RBS (Random Blood Sugar)"
                        type="number"
                        step="0.1"
                        value={vitals.rbs}
                        onChange={(e) =>
                          setVitals({ ...vitals, rbs: e.target.value })
                        }
                        placeholder="mg/dL"
                      />

                      <Input
                        label="HbA1c"
                        type="number"
                        step="0.1"
                        value={vitals.hba1c}
                        onChange={(e) =>
                          setVitals({ ...vitals, hba1c: e.target.value })
                        }
                        placeholder="%"
                      />

                      <Input
                        label="Ketones"
                        type="number"
                        step="0.1"
                        value={vitals.ketones}
                        onChange={(e) =>
                          setVitals({ ...vitals, ketones: e.target.value })
                        }
                        placeholder="mmol/L"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4 border-t">
                    <Button type="submit" className="flex-1">
                      Complete Triage
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Triage;
