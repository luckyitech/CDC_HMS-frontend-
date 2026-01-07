import { createContext, useContext, useState } from "react";
import { mockPatients, mockBloodSugarReadings } from "../data/mockData";

// Create Context
const PatientContext = createContext();

// Custom Hook to use PatientContext
export const usePatientContext = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatientContext must be used within PatientProvider");
  }
  return context;
};

// Provider Component
export const PatientProvider = ({ children }) => {
  const [patients, setPatients] = useState(mockPatients);
  const [bloodSugarReadings, setBloodSugarReadings] = useState(
    mockBloodSugarReadings
  );

  // Get all patients
  const getAllPatients = () => patients;

  // Get patient by UHID
  const getPatientByUHID = (uhid) => {
    return patients.find((patient) => patient.uhid === uhid);
  };

  // Get patient by ID
  const getPatientById = (id) => {
    return patients.find((patient) => patient.id === id);
  };

  // Search patients (by name, UHID, phone)
  const searchPatients = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(term) ||
        patient.uhid.toLowerCase().includes(term) ||
        patient.phone.includes(term) ||
        patient.email.toLowerCase().includes(term)
    );
  };

  // Filter patients by doctor
  const getPatientsByDoctor = (doctorName) => {
    return patients.filter((patient) => patient.primaryDoctor === doctorName);
  };

  // Filter patients by risk level
  const getPatientsByRiskLevel = (riskLevel) => {
    return patients.filter((patient) => patient.riskLevel === riskLevel);
  };

  // Filter patients by status
  const getPatientsByStatus = (status) => {
    return patients.filter((patient) => patient.status === status);
  };

  // Add new patient
  const addPatient = (patientData) => {
    const newPatient = {
      id: patients.length + 1,
      ...patientData,
      status: "Active",
    };
    setPatients([...patients, newPatient]);
    return newPatient;
  };

  // Update patient
  const updatePatient = (uhid, updatedData) => {
    setPatients(
      patients.map((patient) =>
        patient.uhid === uhid ? { ...patient, ...updatedData } : patient
      )
    );
  };

  // Update patient vitals (from triage)
  const updatePatientVitals = (uhid, triageData) => {
    // Calculate BMI
    let bmi = "";
    if (triageData.weight && triageData.height) {
      const weightKg = parseFloat(triageData.weight);
      const heightM = parseFloat(triageData.height) / 100;
      bmi = (weightKg / (heightM * heightM)).toFixed(1) + " kg/m²";
    }

    setPatients((prevPatients) =>
      prevPatients.map((patient) =>
        patient.uhid === uhid
          ? {
              ...patient,
              currentVitals: {
                bp: triageData.bp,
                hr: triageData.heartRate.replace(" bpm", ""),
                rr: "18",
                temp: triageData.temperature.replace("°C", ""),
                spo2: triageData.oxygenSaturation.replace("%", ""),
                bmi: bmi.replace(" kg/m²", ""),
                rbs: triageData.rbs ? triageData.rbs.replace(" mg/dL", "") : "",
                hba1c: triageData.hba1c
                  ? triageData.hba1c.replace("%", "")
                  : "",
                ketones: triageData.ketones
                  ? triageData.ketones.replace(" mmol/L", "")
                  : "",
                recordedBy: triageData.triageBy,
                recordedAt: triageData.lastTriageDate,
                source: "triage",
              },
              vitals: {
                bp: triageData.bp,
                heartRate: triageData.heartRate,
                temperature: triageData.temperature,
                weight: triageData.weight,
                height: triageData.height,
                oxygenSaturation: triageData.oxygenSaturation,
                bmi: bmi,
              },
              chiefComplaint: triageData.chiefComplaint,
              lastTriageDate: triageData.lastTriageDate,
              triageBy: triageData.triageBy,
            }
          : patient
      )
    );
    return { success: true, message: "Vitals updated successfully" };
  };

  // Delete patient
  const deletePatient = (uhid) => {
    setPatients(patients.filter((patient) => patient.uhid !== uhid));
  };

  // Get blood sugar readings for patient
  const getBloodSugarReadings = (uhid) => {
    return bloodSugarReadings[uhid] || [];
  };

  // Add blood sugar reading
  const addBloodSugarReading = (uhid, reading) => {
    setBloodSugarReadings({
      ...bloodSugarReadings,
      [uhid]: [...(bloodSugarReadings[uhid] || []), reading],
    });
  };

  // Get patient statistics
  const getPatientStats = () => {
    return {
      total: patients.length,
      active: patients.filter((p) => p.status === "Active").length,
      inactive: patients.filter((p) => p.status === "Inactive").length,
      highRisk: patients.filter((p) => p.riskLevel === "High").length,
      mediumRisk: patients.filter((p) => p.riskLevel === "Medium").length,
      lowRisk: patients.filter((p) => p.riskLevel === "Low").length,
      type1: patients.filter((p) => p.diabetesType === "Type 1").length,
      type2: patients.filter((p) => p.diabetesType === "Type 2").length,
    };
  };

  const value = {
    // State
    patients,
    bloodSugarReadings,

    // Functions
    getAllPatients,
    getPatientByUHID,
    getPatientById,
    searchPatients,
    getPatientsByDoctor,
    getPatientsByRiskLevel,
    getPatientsByStatus,
    addPatient,
    updatePatient,
    updatePatientVitals, // NEW FUNCTION
    deletePatient,
    getBloodSugarReadings,
    addBloodSugarReading,
    getPatientStats,
  };

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
};
