import { createContext, useContext, useState } from 'react';

const InitialAssessmentContext = createContext();

export const useInitialAssessmentContext = () => {
  const context = useContext(InitialAssessmentContext);
  if (!context) {
    throw new Error('useInitialAssessmentContext must be used within InitialAssessmentProvider');
  }
  return context;
};

export const InitialAssessmentProvider = ({ children }) => {
  const [assessments, setAssessments] = useState([]);

  // Save assessment
  const saveAssessment = (assessmentData) => {
    const newAssessment = {
      id: assessments.length + 1,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      ...assessmentData
    };
    setAssessments([newAssessment, ...assessments]);
    return newAssessment;
  };

  // Get assessments by patient UHID
  const getAssessmentsByPatient = (uhid) => {
    return assessments.filter(assessment => assessment.uhid === uhid);
  };

  // Get latest assessment for a patient
  const getLatestAssessment = (uhid) => {
    const patientAssessments = assessments.filter(assessment => assessment.uhid === uhid);
    return patientAssessments[0] || null;
  };

  // Get assessment by ID
  const getAssessmentById = (id) => {
    return assessments.find(assessment => assessment.id === id);
  };

  // Update assessment
  const updateAssessment = (id, updatedData) => {
    setAssessments(
      assessments.map((assessment) =>
        assessment.id === id ? { ...assessment, ...updatedData } : assessment
      )
    );
  };

  // Delete assessment
  const deleteAssessment = (id) => {
    setAssessments(assessments.filter((assessment) => assessment.id !== id));
  };

  const value = {
    assessments,
    saveAssessment,
    getAssessmentsByPatient,
    getLatestAssessment,
    getAssessmentById,
    updateAssessment,
    deleteAssessment
  };

  return (
    <InitialAssessmentContext.Provider value={value}>
      {children}
    </InitialAssessmentContext.Provider>
  );
};