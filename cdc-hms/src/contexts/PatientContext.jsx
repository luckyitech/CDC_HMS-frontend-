import { createContext, useContext, useState } from "react";
import { mockPatients, mockBloodSugarReadings } from "../data/mockData";

// ========================================
// DOCUMENT CATEGORIES
// ========================================
const DOCUMENT_CATEGORIES = [
  "Lab Report - External",
  "Imaging Report",
  "Endocrinology Report",
  "Cardiology Report",
  "Nephrology Report",
  "Ophthalmology Report",
  "Neuropathy Screening Test",
  "Specialist Consultation Report",
  "Other Medical Document",
];

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
      // Initialize medical equipment structure
      medicalEquipment: {
        insulinPump: {
          hasPump: false,
          current: null,
          transmitter: null,
          history: [],
        },
      },
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
                waistCircumference: triageData.waistCircumference
                  ? triageData.waistCircumference.replace(" cm", "")
                  : "",
                waistHeightRatio: triageData.waistHeightRatio || "",
                rbs: triageData.rbs
                  ? triageData.rbs.replace(" mmol/L", "")
                  : "",
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
                waistCircumference: triageData.waistCircumference || "",
                waistHeightRatio: triageData.waistHeightRatio || "",
                rbs: triageData.rbs || "",
                hba1c: triageData.hba1c || "",
                ketones: triageData.ketones || "",
              },
              chiefComplaint: triageData.chiefComplaint,
              allergies: triageData.allergies || patient.allergies,
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

  // ========================================
  // MEDICAL EQUIPMENT FUNCTIONS
  // ========================================

  // Add insulin pump or transmitter
  const addMedicalEquipment = (uhid, equipmentData, userName) => {
    setPatients((prevPatients) =>
      prevPatients.map((patient) => {
        if (patient.uhid !== uhid) return patient;

        const now = new Date().toISOString();
        const equipment = patient.medicalEquipment?.insulinPump || {
          hasPump: false,
          current: null,
          transmitter: null,
          history: [],
        };

        // Add insulin pump
        if (equipmentData.deviceType === "pump") {
          return {
            ...patient,
            medicalEquipment: {
              ...patient.medicalEquipment,
              insulinPump: {
                ...equipment,
                hasPump: true,
                current: {
                  ...equipmentData,
                  addedBy: userName,
                  addedDate: now,
                  lastUpdatedBy: userName,
                  lastUpdatedDate: now,
                },
              },
            },
          };
        }

        // Add transmitter
        if (equipmentData.deviceType === "transmitter") {
          return {
            ...patient,
            medicalEquipment: {
              ...patient.medicalEquipment,
              insulinPump: {
                ...equipment,
                transmitter: {
                  ...equipmentData,
                  hasTransmitter: true,
                  addedBy: userName,
                  addedDate: now,
                  lastUpdatedBy: userName,
                  lastUpdatedDate: now,
                },
              },
            },
          };
        }

        return patient;
      })
    );

    return { success: true, message: "Medical equipment added successfully" };
  };

  // Update insulin pump or transmitter
  const updateMedicalEquipment = (uhid, equipmentData, userName) => {
    setPatients((prevPatients) =>
      prevPatients.map((patient) => {
        if (patient.uhid !== uhid) return patient;

        const now = new Date().toISOString();
        const equipment = patient.medicalEquipment?.insulinPump;

        if (!equipment) return patient;

        // Update pump
        if (equipmentData.deviceType === "pump" && equipment.current) {
          return {
            ...patient,
            medicalEquipment: {
              ...patient.medicalEquipment,
              insulinPump: {
                ...equipment,
                current: {
                  ...equipment.current,
                  ...equipmentData,
                  lastUpdatedBy: userName,
                  lastUpdatedDate: now,
                },
              },
            },
          };
        }

        // Update transmitter
        if (
          equipmentData.deviceType === "transmitter" &&
          equipment.transmitter
        ) {
          return {
            ...patient,
            medicalEquipment: {
              ...patient.medicalEquipment,
              insulinPump: {
                ...equipment,
                transmitter: {
                  ...equipment.transmitter,
                  ...equipmentData,
                  lastUpdatedBy: userName,
                  lastUpdatedDate: now,
                },
              },
            },
          };
        }

        return patient;
      })
    );

    return { success: true, message: "Medical equipment updated successfully" };
  };

  // Replace insulin pump or transmitter (archives old one)
  const replaceMedicalEquipment = (uhid, equipmentData, reason, userName) => {
    setPatients((prevPatients) =>
      prevPatients.map((patient) => {
        if (patient.uhid !== uhid) return patient;

        const now = new Date().toISOString();
        const equipment = patient.medicalEquipment?.insulinPump;

        if (!equipment) return patient;

        // Replace pump
        if (equipmentData.deviceType === "pump" && equipment.current) {
          const archivedPump = {
            ...equipment.current,
            deviceType: "pump",
            endDate: now,
            reason: reason,
            archivedBy: userName,
            archivedDate: now,
          };

          return {
            ...patient,
            medicalEquipment: {
              ...patient.medicalEquipment,
              insulinPump: {
                ...equipment,
                current: {
                  ...equipmentData,
                  addedBy: userName,
                  addedDate: now,
                  lastUpdatedBy: userName,
                  lastUpdatedDate: now,
                },
                history: [...equipment.history, archivedPump],
              },
            },
          };
        }

        // Replace transmitter
        if (
          equipmentData.deviceType === "transmitter" &&
          equipment.transmitter
        ) {
          const archivedTransmitter = {
            ...equipment.transmitter,
            deviceType: "transmitter",
            endDate: now,
            reason: reason,
            archivedBy: userName,
            archivedDate: now,
          };

          return {
            ...patient,
            medicalEquipment: {
              ...patient.medicalEquipment,
              insulinPump: {
                ...equipment,
                transmitter: {
                  ...equipmentData,
                  hasTransmitter: true,
                  addedBy: userName,
                  addedDate: now,
                  lastUpdatedBy: userName,
                  lastUpdatedDate: now,
                },
                history: [...equipment.history, archivedTransmitter],
              },
            },
          };
        }

        return patient;
      })
    );

    return {
      success: true,
      message: "Medical equipment replaced successfully",
    };
  };

  // Get equipment history
  const getMedicalEquipmentHistory = (uhid) => {
    const patient = getPatientByUHID(uhid);
    return patient?.medicalEquipment?.insulinPump?.history || [];
  };

  // Get warranty status for equipment
  const getEquipmentWarrantyStatus = (warrantyEndDate) => {
    if (!warrantyEndDate) return null;

    const today = new Date();
    const endDate = new Date(warrantyEndDate);
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return {
        status: "expired",
        daysRemaining: Math.abs(daysRemaining),
        message: `Expired ${Math.abs(daysRemaining)} days ago`,
        color: "red",
      };
    } else if (daysRemaining <= 30) {
      return {
        status: "expiring-soon",
        daysRemaining: daysRemaining,
        message: `Expires in ${daysRemaining} days`,
        color: "yellow",
      };
    } else {
      return {
        status: "active",
        daysRemaining: daysRemaining,
        message: `${daysRemaining} days remaining`,
        color: "green",
      };
    }
  };

  // ========================================
  // MEDICAL DOCUMENTS FUNCTIONS
  // ========================================

  // Upload Medical Document
  const uploadMedicalDocument = (uhid, documentData, currentUser) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.uhid === uhid) {
          const newDocument = {
            id: `DOC-${Date.now()}`,
            fileName: documentData.fileName,
            documentCategory: documentData.documentCategory,
            testType: documentData.testType,
            labName: documentData.labName || "Not specified",
            testDate: documentData.testDate,
            uploadDate: new Date().toISOString(),
            uploadedBy: currentUser?.name || "Unknown User",
            uploadedByRole: currentUser?.role || "Unknown",
            fileSize: documentData.fileSize,
            fileUrl: documentData.fileUrl, // In real app, this would be from file upload
            status:
              currentUser?.role === "Patient" ? "Pending Review" : "Reviewed",
            reviewedBy:
              currentUser?.role === "Patient" ? null : currentUser?.name,
            reviewDate:
              currentUser?.role === "Patient" ? null : new Date().toISOString(),
            notes: documentData.notes || null,
          };

          return {
            ...p,
            medicalDocuments: [...(p.medicalDocuments || []), newDocument],
          };
        }
        return p;
      })
    );
    return { success: true, message: "Document uploaded successfully" };
  };

  // Get Medical Documents
  const getMedicalDocuments = (uhid) => {
    const patient = patients.find((p) => p.uhid === uhid);
    return patient?.medicalDocuments || [];
  };

  // Update Document Status
  const updateDocumentStatus = (uhid, documentId, status, reviewedBy) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.uhid === uhid) {
          return {
            ...p,
            medicalDocuments: (p.medicalDocuments || []).map((doc) =>
              doc.id === documentId
                ? {
                    ...doc,
                    status,
                    reviewedBy,
                    reviewDate: new Date().toISOString(),
                  }
                : doc
            ),
          };
        }
        return p;
      })
    );
    return { success: true, message: "Document status updated" };
  };

  // Delete Medical Document
  const deleteMedicalDocument = (uhid, documentId) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => {
        if (p.uhid === uhid) {
          return {
            ...p,
            medicalDocuments: (p.medicalDocuments || []).filter(
              (doc) => doc.id !== documentId
            ),
          };
        }
        return p;
      })
    );
    return { success: true, message: "Document deleted successfully" };
  };

  // Sort Documents by Date
  const sortDocumentsByDate = (documents, order = "desc") => {
    return [...documents].sort((a, b) => {
      const dateA = new Date(a.testDate);
      const dateB = new Date(b.testDate);
      return order === "desc" ? dateB - dateA : dateA - dateB;
    });
  };

  // Filter Documents by Category
  const filterDocumentsByCategory = (documents, category) => {
    if (!category || category === "all") return documents;
    return documents.filter((doc) => doc.documentCategory === category);
  };

  const value = {
    // State
    patients,
    bloodSugarReadings,

    // Patient Functions
    getAllPatients,
    getPatientByUHID,
    getPatientById,
    searchPatients,
    getPatientsByDoctor,
    getPatientsByRiskLevel,
    getPatientsByStatus,
    addPatient,
    updatePatient,
    updatePatientVitals,
    deletePatient,
    getBloodSugarReadings,
    addBloodSugarReading,
    getPatientStats,

    // NEW: Medical Equipment Functions
    addMedicalEquipment,
    updateMedicalEquipment,
    replaceMedicalEquipment,
    getMedicalEquipmentHistory,
    getEquipmentWarrantyStatus,

    // Medical Documents Functions
    DOCUMENT_CATEGORIES,
    uploadMedicalDocument,
    getMedicalDocuments,
    updateDocumentStatus,
    deleteMedicalDocument,
    sortDocumentsByDate,
    filterDocumentsByCategory,
  };

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
};
