import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  UserSquare2,
  CheckCircle2,
  AlertCircle,
  UserCircle,
  Loader2,
} from "lucide-react";
import Card from "../../components/shared/Card";
import Button from "../../components/shared/Button";
import Input from "../../components/shared/Input";
import { getBpColor, getTemperatureColor, getO2Color, getRbsColor, getHba1cColor, getKetonesColor } from '../../utils/clinicalColors';
import { usePatientContext } from "../../contexts/PatientContext";
import { useQueueContext } from "../../contexts/QueueContext";
import { useAppointmentContext } from "../../contexts/AppointmentContext";
import api from "../../services/api";

const Triage = () => {
  const { fetchPatientByUHID, updatePatientVitals } = usePatientContext();
  const { getQueueByStatus, updateQueueStatus } = useQueueContext();
  const { getTodayAppointment, checkInAppointment } = useAppointmentContext();

  const [allDoctors, setAllDoctors] = useState([]);
  const [loadingPatient, setLoadingPatient] = useState(false);

  useEffect(() => {
    api.get('/users/doctors')
      .then(res => { if (res.success) setAllDoctors(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {});
  }, []);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState(null); // Track queue item for API calls
  const [todayAppointment, setTodayAppointment] = useState(null);
  const [assignedDoctor, setAssignedDoctor] = useState("");
  const [vitals, setVitals] = useState({
    bloodPressure: "",
    heartRate: "",
    temperature: "",
    weight: "",
    height: "",
    oxygenSaturation: "",
    rbs: "",
    hba1c: "",
    ketones: "",
    waistCircumference: "",
  });
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [allergies, setAllergies] = useState("");
  // Auto-save triage data to localStorage
  useEffect(() => {
    if (selectedPatient) {
      const triageKey = `triage_draft_${selectedPatient.uhid}`;
      const draftData = {
        vitals,
        chiefComplaint,
        allergies,
        assignedDoctor,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(triageKey, JSON.stringify(draftData));
    }
  }, [vitals, chiefComplaint, allergies, assignedDoctor, selectedPatient]);

  // Calculate BMI
  const calculateBMI = () => {
    if (vitals.weight && vitals.height) {
      const weightKg = parseFloat(vitals.weight);
      const heightM = parseFloat(vitals.height) / 100;
      const bmi = (weightKg / (heightM * heightM)).toFixed(1);
      return bmi;
    }
    return "";
  };

  const bmi = calculateBMI();

  // Calculate Waist-to-Height Ratio
  const calculateWaistHeightRatio = () => {
    if (vitals.waistCircumference && vitals.height) {
      const waist = parseFloat(vitals.waistCircumference);
      const height = parseFloat(vitals.height);
      const ratio = (waist / height).toFixed(2);
      return ratio;
    }
    return "";
  };

  const waistHeightRatio = calculateWaistHeightRatio();

  // Get waist-to-height ratio status
  const getWaistRatioStatus = (ratio) => {
    const r = parseFloat(ratio);
    if (r < 0.5)
      return { text: "Healthy", color: "text-green-700", bg: "bg-green-50" };
    if (r < 0.6)
      return {
        text: "Increased Risk",
        color: "text-yellow-700",
        bg: "bg-yellow-50",
      };
    return { text: "High Risk", color: "text-red-700", bg: "bg-red-50" };
  };

  // Get patients waiting or in triage
  const waitingPatients = getQueueByStatus("Waiting");
  const inTriagePatients = getQueueByStatus("In Triage");

  const handleSelectPatient = async (queueItem) => {
    setLoadingPatient(true);
    const patient = await fetchPatientByUHID(queueItem.uhid);
    // Fall back to queue item fields if patient fetch fails
    setSelectedPatient(patient || { uhid: queueItem.uhid, name: queueItem.name, age: queueItem.age, gender: queueItem.gender });
    setLoadingPatient(false);
    setSelectedQueueItem(queueItem); // Store queue item for API calls

    // Check if patient has appointment today
    const appointment = getTodayAppointment(queueItem.uhid);
    setTodayAppointment(appointment);

    // Update queue status to "In Triage" using queue item ID
    await updateQueueStatus(queueItem.id, "In Triage");

    // Check for saved draft data in localStorage
    const triageKey = `triage_draft_${queueItem.uhid}`;
    const savedDraft = localStorage.getItem(triageKey);

    if (savedDraft) {
      // Restore saved data
      const draftData = JSON.parse(savedDraft);
      setVitals(draftData.vitals);
      setChiefComplaint(draftData.chiefComplaint || queueItem.reason || "");
      setAllergies(draftData.allergies || "");
      setAssignedDoctor(draftData.assignedDoctor || "");

      // Show toast notification
      toast.info("📋 Draft data restored from previous session", {
        duration: 3000,
        style: {
          background: "#DBEAFE",
          color: "#1E40AF",
          fontWeight: "bold",
          padding: "16px",
        },
      });
    } else {
      // No saved data - start fresh
      // Pre-select doctor if appointment exists
      if (appointment) {
        setAssignedDoctor(appointment.doctorId.toString());
      } else {
        setAssignedDoctor("");
      }

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
        waistCircumference: "",
      });
      setChiefComplaint(queueItem.reason || "");
      setAllergies("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields with toast notifications
    if (!assignedDoctor) {
      toast.error(" Please select a doctor to assign the patient to", {
        duration: 4000,
        style: {
          background: "#FEE2E2",
          color: "#991B1B",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      // Scroll to doctor select
      document.querySelector("select")?.focus();
      return;
    }

    if (!chiefComplaint.trim()) {
      toast.error(" Please enter the reason for visit", {
        duration: 4000,
        style: {
          background: "#FEE2E2",
          color: "#991B1B",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      // Scroll to and focus textarea
      document.querySelector("textarea")?.focus();
      return;
    }

    if (!vitals.bloodPressure.trim()) {
      toast.error(" Please enter blood pressure", {
        duration: 4000,
        style: {
          background: "#FEE2E2",
          color: "#991B1B",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      // Focus first vital input
      document.querySelector('input[placeholder*="mmHg"]')?.focus();
      return;
    }

    if (!vitals.heartRate) {
      toast.error("Please enter heart rate", {
        duration: 4000,
        style: {
          background: "#FEE2E2",
          color: "#991B1B",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      // Focus heart rate input
      document.querySelector('input[placeholder*="bpm"]')?.focus();
      return;
    }

    if (!vitals.temperature) {
      toast.error("Please enter temperature", {
        duration: 4000,
        style: {
          background: "#FEE2E2",
          color: "#991B1B",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      // Focus temperature input
      document.querySelector('input[placeholder*="°C"]')?.focus();
      return;
    }

    // All validations passed - show success toast
    toast.success("Validation passed! Completing triage...", {
      duration: 2000,
      style: {
        background: "#D1FAE5",
        color: "#065F46",
        fontWeight: "bold",
        padding: "16px",
      },
    });

    // Prepare triage data — send raw numbers, NOT strings with units
    // Backend model columns are INTEGER/DECIMAL and validation requires isInt/isFloat
    // Units are added by the backend's formatVitals() in the API response
    const triageData = {
      bp: vitals.bloodPressure,
      heartRate: parseInt(vitals.heartRate),
      temperature: parseFloat(vitals.temperature),
      weight: parseFloat(vitals.weight),
      height: parseFloat(vitals.height),
      oxygenSaturation: vitals.oxygenSaturation ? parseInt(vitals.oxygenSaturation) : null,
      waistCircumference: vitals.waistCircumference ? parseFloat(vitals.waistCircumference) : null,
      rbs: vitals.rbs ? parseFloat(vitals.rbs) : null,
      hba1c: vitals.hba1c ? parseFloat(vitals.hba1c) : null,
      ketones: vitals.ketones ? parseFloat(vitals.ketones) : null,
      chiefComplaint: chiefComplaint,
    };

    // Save vitals to patient record
    const result = await updatePatientVitals(selectedPatient.uhid, triageData);

    // Save allergies to patient record if entered
    if (allergies.trim()) {
      await api.put(`/patients/${selectedPatient.uhid}`, { allergies: allergies.trim() });
    }

    // Update queue status to "With Doctor" and assign doctor using queue item ID
    await updateQueueStatus(selectedQueueItem.id, "With Doctor", parseInt(assignedDoctor));

    // Also update assignedDoctorName via separate call if needed (backend handles both)
    // assignDoctorToQueue is now handled by updateQueueStatus with assignedDoctorId param

    // Check-in appointment if exists
    if (todayAppointment) {
      await checkInAppointment(selectedPatient.uhid);
    }

    if (result.success) {
      const doctorName = allDoctors.find(
        (d) => d.id === parseInt(assignedDoctor)
      )?.name;

      toast.success(`Triage completed for ${selectedPatient.name}!`, {
        duration: 3000,
        style: {
          background: "#D1FAE5",
          color: "#065F46",
          fontWeight: "bold",
          padding: "16px",
        },
      });

      toast.success(` Patient assigned to ${doctorName}`, {
        duration: 3000,
        style: {
          background: "#DBEAFE",
          color: "#1E40AF",
          fontWeight: "bold",
          padding: "16px",
        },
      });

      // Clear the draft from localStorage
      const triageKey = `triage_draft_${selectedPatient.uhid}`;
      localStorage.removeItem(triageKey);
    }

    setSelectedPatient(null);
    setSelectedQueueItem(null);
    setTodayAppointment(null);
    setAssignedDoctor("");
  };

  const handleCancel = async () => {
    if (selectedPatient && selectedQueueItem) {
      const patientName = selectedPatient.name;

      // Clear the draft from localStorage
      const triageKey = `triage_draft_${selectedPatient.uhid}`;
      localStorage.removeItem(triageKey);

      // Move patient back to "Waiting" using queue item ID
      await updateQueueStatus(selectedQueueItem.id, "Waiting");
      setSelectedPatient(null);
      setSelectedQueueItem(null);
      setTodayAppointment(null);
      setAssignedDoctor("");

      // Show cancellation toast
      toast.info(` Triage cancelled - ${patientName} moved back to waiting`, {
        duration: 3000,
        style: {
          background: "#FEF3C7",
          color: "#92400E",
          fontWeight: "bold",
          padding: "16px",
        },
      });
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
                {waitingPatients.map((queueItem) => (
                  <button
                    key={queueItem.id}
                    onClick={() => handleSelectPatient(queueItem)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedPatient?.uhid === queueItem.uhid
                        ? "border-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-primary">{queueItem.uhid}</p>
                      {queueItem.priority === "Urgent" && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 mt-1">
                      {queueItem.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {queueItem.age} yrs {queueItem.gender}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Arrived: {queueItem.arrivalTime}
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
                {inTriagePatients.map((queueItem) => (
                  <button
                    key={queueItem.id}
                    onClick={() => handleSelectPatient(queueItem)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedPatient?.uhid === queueItem.uhid
                        ? "border-primary bg-blue-100"
                        : "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100"
                    }`}
                  >
                    <p className="font-semibold text-sm">{queueItem.name}</p>
                    <p className="text-xs text-gray-600">{queueItem.uhid}</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Click to continue triage
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Triage Form */}
        <div className="lg:col-span-2">
          {loadingPatient ? (
            <Card>
              <div className="flex items-center justify-center gap-3 py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading patient data...</span>
              </div>
            </Card>
          ) : !selectedPatient ? (
            <Card>
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <UserCircle className="w-20 h-20 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">
                  Select a patient to start triage
                </p>
              </div>
            </Card>
          ) : (
            <form
              onSubmit={handleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target.tagName !== "TEXTAREA")
                  e.preventDefault();
              }}
            >
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
                          {selectedPatient.age} yrs &middot; {selectedPatient.gender}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Diagnosis</p>
                        <p className="font-semibold">
                          {selectedPatient.diagnosis}
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

                  {/* Appointment Status */}
                  {todayAppointment ? (
                    <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <p className="font-bold text-green-800 mb-2">
                            Patient has appointment today
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">Doctor</p>
                              <p className="font-semibold text-gray-800">
                                {todayAppointment.doctorName}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Time</p>
                              <p className="font-semibold text-gray-800">
                                {todayAppointment.timeSlot}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Type</p>
                              <p className="font-semibold text-gray-800 capitalize">
                                {todayAppointment.appointmentType.replace(
                                  "-",
                                  " "
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Reason</p>
                              <p className="font-semibold text-gray-800">
                                {todayAppointment.reason || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-bold text-blue-800">
                            Walk-in Patient
                          </p>
                          <p className="text-sm text-blue-700">
                            No appointment scheduled for today
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assign to Doctor */}
                  <div className="p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <UserSquare2 className="w-4 h-4" />
                      Assign to Doctor *
                      {todayAppointment && (
                        <span className="text-xs text-green-600 font-normal">
                          (Pre-selected from appointment)
                        </span>
                      )}
                    </label>
                    <select
                      value={assignedDoctor}
                      onChange={(e) => setAssignedDoctor(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary font-semibold"
                    >
                      <option value="">Select a doctor...</option>
                      {allDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} -{" "}
                          {doctor.specialty || "General Physician"}
                        </option>
                      ))}
                    </select>
                    {assignedDoctor && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Patient will be assigned to{" "}
                        {
                          allDoctors.find(
                            (d) => d.id === parseInt(assignedDoctor)
                          )?.name
                        }
                      </p>
                    )}
                  </div>

                  {/* Chief Complaint */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reason for visit *
                    </label>
                    <textarea
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="Patient's main reason for visit..."
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                  </div>

                  {/*Allergies Section */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Known Allergies
                    </label>
                    <textarea
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Enter any known allergies (medications, food, etc.) or 'None'"
                      rows="2"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include medication allergies, food allergies, or
                      environmental allergies
                    </p>
                  </div>

                  {/* Vitals */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4">
                      Vital Signs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="Blood Pressure *"
                          type="text"
                          value={vitals.bloodPressure}
                          onChange={(e) =>
                            setVitals({ ...vitals, bloodPressure: e.target.value })
                          }
                          placeholder="120/80 mmHg"
                        />
                        {vitals.bloodPressure && getBpColor(vitals.bloodPressure) && (
                          <p className={`text-xs font-semibold -mt-4 mb-2 ${getBpColor(vitals.bloodPressure).text}`}>
                            {getBpColor(vitals.bloodPressure).label}
                          </p>
                        )}
                      </div>

                      <Input
                        label="Heart Rate *"
                        type="number"
                        min="0"
                        value={vitals.heartRate}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow positive numbers or empty string
                          if (value === "" || parseFloat(value) >= 0) {
                            setVitals({ ...vitals, heartRate: value });
                          }
                        }}
                        placeholder="bpm"
                      />

                      <div>
                        <Input
                          label="Temperature *"
                          type="number"
                          min="0"
                          step="0.1"
                          value={vitals.temperature}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || parseFloat(value) >= 0) {
                              setVitals({ ...vitals, temperature: value });
                            }
                          }}
                          placeholder="°C"
                        />
                        {vitals.temperature && getTemperatureColor(vitals.temperature) && (
                          <p className={`text-xs font-semibold -mt-4 mb-2 ${getTemperatureColor(vitals.temperature).text}`}>
                            {getTemperatureColor(vitals.temperature).label}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Oxygen Saturation"
                          type="number"
                          min="0"
                          value={vitals.oxygenSaturation}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || parseFloat(value) >= 0) {
                              setVitals({ ...vitals, oxygenSaturation: value });
                            }
                          }}
                          placeholder="%"
                        />
                        {vitals.oxygenSaturation && getO2Color(vitals.oxygenSaturation) && (
                          <p className={`text-xs font-semibold -mt-4 mb-2 ${getO2Color(vitals.oxygenSaturation).text}`}>
                            {getO2Color(vitals.oxygenSaturation).label}
                          </p>
                        )}
                      </div>

                      <Input
                        label="Weight"
                        type="number"
                        min="0"
                        step="0.1"
                        value={vitals.weight}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || parseFloat(value) >= 0) {
                            setVitals({ ...vitals, weight: value });
                          }
                        }}
                        placeholder="kg"
                      />

                      <Input
                        label="Height"
                        type="number"
                        min="0"
                        value={vitals.height}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || parseFloat(value) >= 0) {
                            setVitals({ ...vitals, height: value });
                          }
                        }}
                        placeholder="cm"
                      />

                      {/* BMI Display */}
                      {bmi && (() => {
                        const bmiVal = parseFloat(bmi);
                        const bmiColor = bmiVal < 18.5
                          ? { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: 'Underweight' }
                          : bmiVal < 25
                          ? { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-700',  label: 'Normal'      }
                          : bmiVal < 30
                          ? { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: 'Overweight'  }
                          : { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-700',    label: 'Obese'       };
                        return (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              BMI (Calculated)
                            </label>
                            <div className={`px-4 py-3 ${bmiColor.bg} border-2 ${bmiColor.border} rounded-lg`}>
                              <span className={`text-lg font-bold ${bmiColor.text}`}>{bmi} kg/m²</span>
                              <span className="text-xs text-gray-600 ml-2">({bmiColor.label})</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* NEW: Waist Circumference */}
                      <Input
                        label="Waist Circumference"
                        type="number"
                        min="0"
                        step="0.1"
                        value={vitals.waistCircumference}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || parseFloat(value) >= 0) {
                            setVitals({ ...vitals, waistCircumference: value });
                          }
                        }}
                        placeholder="cm"
                      />

                      {/* Waist-to-Height Ratio Display */}
                      {waistHeightRatio && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Waist-to-Height Ratio (Calculated)
                          </label>
                          <div
                            className={`px-4 py-3 border-2 rounded-lg ${
                              getWaistRatioStatus(waistHeightRatio).bg
                            } border-${getWaistRatioStatus(
                              waistHeightRatio
                            ).color.replace("text-", "")}-300`}
                          >
                            <span
                              className={`text-lg font-bold ${
                                getWaistRatioStatus(waistHeightRatio).color
                              }`}
                            >
                              {waistHeightRatio}
                            </span>
                            <span className="text-xs text-gray-600 ml-2">
                              ({getWaistRatioStatus(waistHeightRatio).text})
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Target: &lt; 0.5 (Healthy)
                          </p>
                        </div>
                      )}

                      <div>
                        <Input
                          label="RBS (Random Blood Sugar)"
                          type="number"
                          min="0"
                          step="0.1"
                          value={vitals.rbs}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || parseFloat(value) >= 0) {
                              setVitals({ ...vitals, rbs: value });
                            }
                          }}
                          placeholder="mmol/L"
                        />
                        {vitals.rbs && getRbsColor(vitals.rbs) && (
                          <p className={`text-xs font-semibold -mt-4 mb-2 ${getRbsColor(vitals.rbs).text}`}>
                            {getRbsColor(vitals.rbs).label}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="HbA1c"
                          type="number"
                          min="0"
                          step="0.1"
                          value={vitals.hba1c}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || parseFloat(value) >= 0) {
                              setVitals({ ...vitals, hba1c: value });
                            }
                          }}
                          placeholder="%"
                        />
                        {vitals.hba1c && getHba1cColor(vitals.hba1c) && (
                          <p className={`text-xs font-semibold -mt-4 mb-2 ${getHba1cColor(vitals.hba1c).text}`}>
                            {getHba1cColor(vitals.hba1c).label}
                          </p>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Ketones"
                          type="number"
                          min="0"
                          step="0.1"
                          value={vitals.ketones}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || parseFloat(value) >= 0) {
                              setVitals({ ...vitals, ketones: value });
                            }
                          }}
                          placeholder="mmol/L"
                        />
                        {vitals.ketones && getKetonesColor(vitals.ketones) && (
                          <p className={`text-xs font-semibold -mt-4 mb-2 ${getKetonesColor(vitals.ketones).text}`}>
                            {getKetonesColor(vitals.ketones).label}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button type="submit" className="w-full sm:flex-1">
                      Complete Triage
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="w-full sm:flex-1"
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
