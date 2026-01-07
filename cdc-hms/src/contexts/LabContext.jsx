import { createContext, useContext, useState } from "react";

const LabContext = createContext();

export const useLabContext = () => {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error("useLabContext must be used within LabProvider");
  }
  return context;
};

export const LabProvider = ({ children }) => {
  // Store all lab test results
  const [labTests, setLabTests] = useState([
    // Mock initial data - can be removed once real data is entered
    {
      id: 1,
      uhid: "CDC001",
      patientName: "John Doe",
      testType: "HbA1c",
      sampleType: "Blood",
      orderedBy: "Dr. Ahmed Hassan",
      orderedDate: "2024-11-15",
      orderedTime: "09:30 AM",
      completedDate: "2024-11-15",
      completedTime: "02:30 PM",
      completedBy: "Tech. Sarah Mwangi",
      status: "Completed",
      priority: "Routine",
      results: {
        hba1c: "7.2",
      },
      normalRange: "<7.0%",
      interpretation: "Abnormal",
      isCritical: false,
      technicianNotes: "Slightly elevated",
      reportGenerated: true,
    },
    {
      id: 2,
      uhid: "CDC005",
      patientName: "Mary Johnson",
      testType: "Fasting Glucose",
      sampleType: "Blood",
      orderedBy: "Dr. Ahmed Hassan",
      orderedDate: "2024-11-10",
      orderedTime: "08:15 AM",
      completedDate: "2024-11-10",
      completedTime: "10:45 AM",
      completedBy: "Tech. John Kamau",
      status: "Completed",
      priority: "Urgent",
      results: {
        fastingGlucose: "145",
      },
      normalRange: "70-100 mg/dL",
      interpretation: "Abnormal",
      isCritical: false,
      technicianNotes: "Patient was fasting for 12 hours",
      reportGenerated: true,
    },
    {
      id: 3,
      uhid: "CDC003",
      patientName: "Ali Hassan",
      testType: "Lipid Profile",
      sampleType: "Blood",
      orderedBy: "Dr. Sarah Kamau",
      orderedDate: "2024-11-08",
      orderedTime: "10:00 AM",
      completedDate: "2024-11-08",
      completedTime: "03:00 PM",
      completedBy: "Tech. Sarah Mwangi",
      status: "Completed",
      priority: "Routine",
      results: {
        totalCholesterol: "185",
        ldl: "110",
        hdl: "45",
        triglycerides: "140",
      },
      normalRange: "See individual ranges",
      interpretation: "Normal",
      isCritical: false,
      technicianNotes: "All parameters within normal limits",
      reportGenerated: true,
    },
    {
      id: 4,
      uhid: "CDC007",
      patientName: "Grace Wanjiru",
      testType: "Kidney Function",
      sampleType: "Blood",
      orderedBy: "Dr. Ahmed Hassan",
      orderedDate: "2024-11-05",
      orderedTime: "09:00 AM",
      completedDate: "2024-11-05",
      completedTime: "01:00 PM",
      completedBy: "Tech. John Kamau",
      status: "Completed",
      priority: "Urgent",
      results: {
        creatinine: "3.5",
        bun: "45",
        egfr: "35",
        uricAcid: "8.5",
      },
      normalRange: "See individual ranges",
      interpretation: "Critical",
      isCritical: true,
      technicianNotes: "Critical - Doctor notified immediately",
      reportGenerated: true,
    },
  ]);

  // Add new test result
  const addLabTest = (testData) => {
    const newTest = {
      id: labTests.length + 1,
      completedDate: new Date().toISOString().split("T")[0],
      completedTime: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Completed",
      reportGenerated: true,
      ...testData,
    };
    setLabTests([newTest, ...labTests]);
    return newTest;
  };

  // Get all tests for a patient
  const getTestsByPatient = (uhid) => {
    return labTests
      .filter((test) => test.uhid === uhid)
      .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
  };

  // Get latest test of a specific type for a patient
  const getLatestTestByType = (uhid, testType) => {
    const patientTests = labTests
      .filter((test) => test.uhid === uhid && test.testType === testType)
      .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
    return patientTests[0] || null;
  };

  // Get all critical results
  const getCriticalTests = () => {
    return labTests.filter((test) => test.isCritical);
  };

  // Get pending tests (for lab portal)
  const [pendingTests, setPendingTests] = useState([
    {
      id: 1,
      uhid: "CDC001",
      patientName: "John Doe",
      age: 45,
      gender: "Male",
      testType: "HbA1c",
      sampleType: "Blood",
      orderedBy: "Dr. Ahmed Hassan",
      orderedDate: "2024-12-09",
      orderedTime: "09:30 AM",
      priority: "Routine",
      status: "Sample Collected",
      notes: "Patient is fasting",
    },
    {
      id: 2,
      uhid: "CDC005",
      patientName: "Mary Johnson",
      age: 61,
      gender: "Female",
      testType: "Fasting Glucose",
      sampleType: "Blood",
      orderedBy: "Dr. Ahmed Hassan",
      orderedDate: "2024-12-09",
      orderedTime: "08:15 AM",
      priority: "Urgent",
      status: "Sample Collected",
      notes: "Repeat test - previous result was borderline",
    },
  ]);

  // Get pending tests
  const getPendingTests = () => pendingTests;

  // Remove test from pending after completion
  const removePendingTest = (testId) => {
    setPendingTests(pendingTests.filter((test) => test.id !== testId));
  };

  // Add pending test (when doctor orders a test)
  const addPendingTest = (testOrder) => {
    const newPendingTest = {
      id: pendingTests.length + 1,
      orderedDate: new Date().toISOString().split("T")[0],
      orderedTime: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Sample Collected", // Default status
      ...testOrder,
    };

    setPendingTests([newPendingTest, ...pendingTests]);
    return newPendingTest;
  };

  // Get statistics
  const getLabStats = () => {
    const completed = labTests.filter((t) => t.status === "Completed").length;
    const pending = pendingTests.length;
    const critical = labTests.filter((t) => t.isCritical).length;
    const normal = labTests.filter((t) => t.interpretation === "Normal").length;
    const abnormal = labTests.filter(
      (t) => t.interpretation === "Abnormal"
    ).length;

    return {
      totalTests: labTests.length,
      completed,
      pending,
      critical,
      normal,
      abnormal,
    };
  };

  const value = {
    labTests,
    pendingTests,
    addLabTest,
    addPendingTest,
    getTestsByPatient,
    getLatestTestByType,
    getCriticalTests,
    getPendingTests,
    removePendingTest,
    getLabStats,
  };

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
};
