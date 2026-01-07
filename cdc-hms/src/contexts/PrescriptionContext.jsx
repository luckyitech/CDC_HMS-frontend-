import { createContext, useContext, useState } from "react";
import { mockPrescriptions } from "../data/mockData";

// Create Context
const PrescriptionContext = createContext();

// Custom Hook to use PrescriptionContext
export const usePrescriptionContext = () => {
  const context = useContext(PrescriptionContext);
  if (!context) {
    throw new Error(
      "usePrescriptionContext must be used within PrescriptionProvider"
    );
  }
  return context;
};

// Provider Component
export const PrescriptionProvider = ({ children }) => {
  const [prescriptions, setPrescriptions] = useState(mockPrescriptions);

  // Get all prescriptions
  const getAllPrescriptions = () => prescriptions;

  // Get prescription by ID
  const getPrescriptionById = (id) => {
    return prescriptions.find((prescription) => prescription.id === id);
  };

  // Get prescription by prescription number
  const getPrescriptionByNumber = (prescriptionNumber) => {
    return prescriptions.find(
      (prescription) => prescription.prescriptionNumber === prescriptionNumber
    );
  };

  // Get prescriptions by patient UHID
  const getPrescriptionsByPatient = (uhid) => {
    return prescriptions.filter((prescription) => prescription.uhid === uhid);
  };

  // Get prescriptions by doctor
  const getPrescriptionsByDoctor = (doctorName) => {
    return prescriptions.filter(
      (prescription) => prescription.doctorName === doctorName
    );
  };

  // Get prescriptions by status
  const getPrescriptionsByStatus = (status) => {
    return prescriptions.filter(
      (prescription) => prescription.status === status
    );
  };

  // Get active prescriptions for a patient
  const getActivePrescriptions = (uhid) => {
    return prescriptions.filter(
      (prescription) =>
        prescription.uhid === uhid && prescription.status === "Active"
    );
  };

  // Get past prescriptions for a patient
  const getPastPrescriptions = (uhid) => {
    return prescriptions.filter(
      (prescription) =>
        prescription.uhid === uhid && prescription.status !== "Active"
    );
  };

  // Add new prescription
  const addPrescription = (prescriptionData) => {
    const newPrescription = {
      id: prescriptions.length + 1,
      prescriptionNumber: `RX-2024-${String(prescriptions.length + 1).padStart(
        3,
        "0"
      )}`,
      date: new Date().toISOString().split("T")[0],
      status: "Active",
      ...prescriptionData,
    };
    setPrescriptions([newPrescription, ...prescriptions]); // NEW FIRST!
    return newPrescription;
  };

  // Update prescription
  const updatePrescription = (id, updatedData) => {
    setPrescriptions(
      prescriptions.map((prescription) =>
        prescription.id === id
          ? { ...prescription, ...updatedData }
          : prescription
      )
    );
  };

  // Update prescription status
  const updatePrescriptionStatus = (id, status) => {
    setPrescriptions(
      prescriptions.map((prescription) =>
        prescription.id === id ? { ...prescription, status } : prescription
      )
    );
  };

  // Delete prescription
  const deletePrescription = (id) => {
    setPrescriptions(
      prescriptions.filter((prescription) => prescription.id !== id)
    );
  };

  // Get prescription statistics
  const getPrescriptionStats = () => {
    return {
      total: prescriptions.length,
      active: prescriptions.filter((p) => p.status === "Active").length,
      completed: prescriptions.filter((p) => p.status === "Completed").length,
      expired: prescriptions.filter((p) => p.status === "Expired").length,
    };
  };

  // Get today's prescriptions
  const getTodaysPrescriptions = () => {
    const today = new Date().toISOString().split("T")[0];
    return prescriptions.filter((prescription) => prescription.date === today);
  };

  const value = {
    // State
    prescriptions,

    // Functions
    getAllPrescriptions,
    getPrescriptionById,
    getPrescriptionByNumber,
    getPrescriptionsByPatient,
    getPrescriptionsByDoctor,
    getPrescriptionsByStatus,
    getActivePrescriptions,
    getPastPrescriptions,
    addPrescription,
    updatePrescription,
    updatePrescriptionStatus,
    deletePrescription,
    getPrescriptionStats,
    getTodaysPrescriptions,
  };

  return (
    <PrescriptionContext.Provider value={value}>
      {children}
    </PrescriptionContext.Provider>
  );
};
