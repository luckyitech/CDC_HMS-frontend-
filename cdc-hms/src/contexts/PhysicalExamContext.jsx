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

  // Update existing examination (overwrites)
  const updateExamination = (examId, updatedData) => {
    setExaminations(exams =>
      exams.map(exam =>
        exam.id === examId
          ? {
              ...exam,
              ...updatedData,
              lastModified: new Date().toISOString(),
            }
          : exam
      )
    );
    
    // Return updated exam
    return examinations.find(exam => exam.id === examId);
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

  // Search examinations by patient UHID and search term
  const searchExaminations = (uhid, searchTerm) => {
    const patientExams = getExaminationsByPatient(uhid);
    
    if (!searchTerm || !searchTerm.trim()) {
      return patientExams;
    }

    const term = searchTerm.toLowerCase();
    
    return patientExams.filter(exam => {
      // Search in date
      const dateMatch = exam.date.toLowerCase().includes(term);
      
      // Search in doctor name
      const doctorMatch = exam.doctorName?.toLowerCase().includes(term);
      
      // Search in exam findings
      const findingsMatch = exam.examFindings?.toLowerCase().includes(term);
      
      // Search in all body system fields
      const generalMatch = exam.data?.generalAppearance?.toLowerCase().includes(term);
      const cardiovascularMatch = exam.data?.cardiovascular?.toLowerCase().includes(term);
      const respiratoryMatch = exam.data?.respiratory?.toLowerCase().includes(term);
      const gastrointestinalMatch = exam.data?.gastrointestinal?.toLowerCase().includes(term);
      const neurologicalMatch = exam.data?.neurological?.toLowerCase().includes(term);
      const musculoskeletalMatch = exam.data?.musculoskeletal?.toLowerCase().includes(term);
      const skinMatch = exam.data?.skin?.toLowerCase().includes(term);
      
      return (
        dateMatch ||
        doctorMatch ||
        findingsMatch ||
        generalMatch ||
        cardiovascularMatch ||
        respiratoryMatch ||
        gastrointestinalMatch ||
        neurologicalMatch ||
        musculoskeletalMatch ||
        skinMatch
      );
    });
  };

  const value = {
    examinations,
    saveExamination,
    updateExamination,
    getExaminationsByPatient,
    getLatestExamination,
    getExaminationById,
    searchExaminations,
  };

  return (
    <PhysicalExamContext.Provider value={value}>
      {children}
    </PhysicalExamContext.Provider>
  );
};