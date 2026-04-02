import { createContext, useContext, useState, useEffect, useCallback } from "react";
import patientService from "../services/patientService";
import documentService from "../services/documentService";

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
  "Patient File",
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
  // State
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH PATIENTS FROM API
  // ============================================

  // Load all patients from API
  const fetchPatients = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientService.getAll(params);
      if (response.success) {
        setPatients(response.data.patients || response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Load patients on mount for context use (dashboard, queue, etc.)
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ============================================
  // PATIENT CRUD (API)
  // ============================================

  // Get all patients (from state - already loaded)
  const getAllPatients = () => patients;

  // Get patient by UHID (SYNC - from local state)
  // Use this for render-time lookups
  const getPatientByUHID = (uhid) => {
    return patients.find((patient) => patient.uhid === uhid);
  };

  // Fetch patient by UHID (ASYNC - from API for fresh data)
  // Use this when you need guaranteed fresh data
  const fetchPatientByUHID = useCallback(async (uhid) => {
    try {
      const response = await patientService.getByUHID(uhid);
      if (response.success) {
        return response.data.patient || response.data;
      }
      return null;
    } catch (err) {
      console.error('Fetch patient error:', err.message);
      return null;
    }
  }, []);

  // Get patient by ID (from local state)
  const getPatientById = (id) => {
    return patients.find((patient) => patient.id === id);
  };

  // Search patients (via API)
  const searchPatients = async (searchTerm) => {
    try {
      const response = await patientService.getAll({ search: searchTerm });
      if (response.success) {
        return response.data.patients || response.data;
      }
      return [];
    } catch (err) {
      console.error('Search error:', err.message);
      return [];
    }
  };

  // Filter patients by doctor (local filter)
  const getPatientsByDoctor = (doctorName) => {
    return patients.filter((patient) => patient.primaryDoctor === doctorName);
  };

  // Filter patients by risk level (local filter)
  const getPatientsByRiskLevel = (riskLevel) => {
    return patients.filter((patient) => patient.riskLevel === riskLevel);
  };

  // Filter patients by status (via API)
  const getPatientsByStatus = async (status) => {
    try {
      const response = await patientService.getAll({ status });
      if (response.success) {
        return response.data.patients || response.data;
      }
      return [];
    } catch (err) {
      console.error('Filter error:', err.message);
      return [];
    }
  };

  // Add new patient (via API)
  const addPatient = async (patientData) => {
    setLoading(true);
    try {
      const response = await patientService.create(patientData);
      if (response.success) {
        // Refresh patient list
        await fetchPatients();
        return { success: true, patient: response.data.patient || response.data };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update patient (via API)
  const updatePatient = async (uhid, updatedData) => {
    setLoading(true);
    try {
      const response = await patientService.update(uhid, updatedData);
      if (response.success) {
        // Update local state
        setPatients(prev =>
          prev.map(p => p.uhid === uhid ? { ...p, ...response.data.patient || response.data } : p)
        );
        return { success: true, patient: response.data.patient || response.data };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update patient vitals (via API) — staff
  const updatePatientVitals = async (uhid, vitalsData) => {
    setLoading(true);
    try {
      const response = await patientService.recordVitals(uhid, vitalsData);
      if (response.success) {
        await fetchPatients();
        return { success: true, message: "Vitals updated successfully" };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Doctor records/completes vitals (all fields optional)
  const recordVitalsDoctor = async (uhid, vitalsData) => {
    setLoading(true);
    try {
      const response = await patientService.recordVitalsDoctor(uhid, vitalsData);
      if (response.success) {
        await fetchPatients();
        return { success: true, message: "Vitals updated successfully" };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete patient (via API)
  const deletePatient = async (uhid) => {
    setLoading(true);
    try {
      const response = await patientService.delete(uhid);
      if (response.success) {
        setPatients(prev => prev.filter(p => p.uhid !== uhid));
        return { success: true, message: "Patient deleted successfully" };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // BLOOD SUGAR (API)
  // ============================================

  // Get blood sugar readings for patient
  const getBloodSugarReadings = async (uhid, params = {}) => {
    try {
      const response = await patientService.getBloodSugar(uhid, params);
      if (response.success) {
        return response.data.readings || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get blood sugar error:', err.message);
      return [];
    }
  };

  // Add blood sugar reading
  const addBloodSugarReading = async (uhid, reading) => {
    try {
      const response = await patientService.addBloodSugar(uhid, reading);
      return response;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Get patient statistics (via API)
  const getPatientStats = async () => {
    try {
      const response = await patientService.getStats();
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Get stats error:', err.message);
      return null;
    }
  };

  // ========================================
  // MEDICAL EQUIPMENT FUNCTIONS (API)
  // ========================================

  // Get equipment for patient
  const getEquipment = async (uhid) => {
    try {
      const response = await patientService.getEquipment(uhid);
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('Get equipment error:', err.message);
      return null;
    }
  };

  // Add insulin pump or transmitter
  const addMedicalEquipment = async (uhid, equipmentData) => {
    try {
      const response = await patientService.addEquipment(uhid, equipmentData);
      return response;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Update insulin pump or transmitter
  const updateMedicalEquipment = async (uhid, equipmentId, equipmentData) => {
    try {
      const response = await patientService.updateEquipment(uhid, equipmentId, equipmentData);
      return response;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Replace insulin pump or transmitter (archives old one)
  const replaceMedicalEquipment = async (uhid, equipmentId, equipmentData) => {
    try {
      const response = await patientService.replaceEquipment(uhid, equipmentId, equipmentData);
      return response;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Get equipment history
  const getMedicalEquipmentHistory = async (uhid) => {
    try {
      const response = await patientService.getEquipmentHistory(uhid);
      if (response.success) {
        return response.data.history || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get equipment history error:', err.message);
      return [];
    }
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
  // MEDICAL DOCUMENTS FUNCTIONS (API)
  // ========================================

  // Upload Medical Document (via API)
  const uploadMedicalDocument = async (uhid, documentData, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uhid', uhid);
      formData.append('documentCategory', documentData.documentCategory);

      // Optional fields
      if (documentData.testType) formData.append('testType', documentData.testType);
      if (documentData.labName) formData.append('labName', documentData.labName);
      if (documentData.testDate) formData.append('testDate', documentData.testDate);
      if (documentData.notes) formData.append('notes', documentData.notes);

      const response = await documentService.upload(formData);
      return response;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Get Medical Documents (via API)
  const getMedicalDocuments = async (uhid, params = {}) => {
    try {
      const response = await documentService.getByPatient(uhid, params);
      if (response.success) {
        return response.data.documents || response.data;
      }
      return [];
    } catch (err) {
      console.error('Get documents error:', err.message);
      return [];
    }
  };

  // Update Document Status (via API)
  const updateDocumentStatus = async (documentId, status) => {
    try {
      const response = await documentService.updateStatus(documentId, { status });
      return response;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Delete Medical Document (via API)
  const deleteMedicalDocument = async (documentId) => {
    try {
      const response = await documentService.delete(documentId);
      return response;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Get document file URL
  const getDocumentFileUrl = (filename) => {
    return documentService.getFileUrl(filename);
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
    loading,
    error,

    // Patient Functions
    fetchPatients,
    getAllPatients,
    getPatientByUHID,
    fetchPatientByUHID,
    getPatientById,
    searchPatients,
    getPatientsByDoctor,
    getPatientsByRiskLevel,
    getPatientsByStatus,
    addPatient,
    updatePatient,
    updatePatientVitals,
    recordVitalsDoctor,
    deletePatient,
    getBloodSugarReadings,
    addBloodSugarReading,
    getPatientStats,

    // Medical Equipment Functions
    getEquipment,
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
    getDocumentFileUrl,
    sortDocumentsByDate,
    filterDocumentsByCategory,
  };

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
};
