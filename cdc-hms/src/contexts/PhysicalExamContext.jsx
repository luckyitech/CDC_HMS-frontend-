import { createContext, useContext, useState } from 'react';

const PhysicalExamContext = createContext();

export const usePhysicalExamContext = () => {
  const context = useContext(PhysicalExamContext);
  if (!context) {
    throw new Error('usePhysicalExamContext must be used within PhysicalExamProvider');
  }
  return context;
};

export const PhysicalExamProvider = ({ children }) => {
  const [examinations, setExaminations] = useState([]);

  // Save examination
  const saveExamination = (examData) => {
    const newExam = {
      id: examinations.length + 1,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      ...examData
    };
    setExaminations([newExam, ...examinations]);
    return newExam;
  };

  // Get examinations by patient UHID
  const getExaminationsByPatient = (uhid) => {
    return examinations.filter(exam => exam.uhid === uhid);
  };

  // Get latest examination for a patient
  const getLatestExamination = (uhid) => {
    const patientExams = examinations.filter(exam => exam.uhid === uhid);
    return patientExams[0] || null;
  };

  // Get examination by ID
  const getExaminationById = (id) => {
    return examinations.find(exam => exam.id === id);
  };

  const value = {
    examinations,
    saveExamination,
    getExaminationsByPatient,
    getLatestExamination,
    getExaminationById
  };

  return (
    <PhysicalExamContext.Provider value={value}>
      {children}
    </PhysicalExamContext.Provider>
  );
};