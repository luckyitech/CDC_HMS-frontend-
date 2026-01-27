import { createContext, useContext, useState } from 'react';

const ConsultationNotesContext = createContext();

export const useConsultationNotesContext = () => {
  const context = useContext(ConsultationNotesContext);
  if (!context) {
    throw new Error('useConsultationNotesContext must be used within ConsultationNotesProvider');
  }
  return context;
};

export const ConsultationNotesProvider = ({ children }) => {
  const [consultationNotes, setConsultationNotes] = useState([
    // John Doe (CDC001) - Multiple notes showing progression
    {
      id: 1,
      uhid: 'CDC001',
      patientName: 'John Doe',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2026-01-22',
      time: '10:30 AM',
      notes: `Patient reports significant improvement in symptoms. Polyuria and polydipsia have decreased. Patient is now monitoring blood glucose regularly and keeping a log as instructed.

Discussed importance of carbohydrate counting and portion control. Patient demonstrates good understanding of meal planning principles.

Patient expressed concern about cost of medications. Provided information about generic alternatives and patient assistance programs.

Assessment: Patient is more engaged in self-care. Blood glucose readings trending downward. Continue current management plan with close follow-up.`
    },
    {
      id: 2,
      uhid: 'CDC001',
      patientName: 'John Doe',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2026-01-05',
      time: '02:15 PM',
      notes: `Patient appears motivated but somewhat overwhelmed by diagnosis. Spent extra time on diabetes education. Patient has many questions about lifestyle modifications.

Key concerns: Will he be able to continue his job? Can he still eat his favorite foods? Worried about insulin injections.

Reassured patient that with proper management, most patients lead normal lives. Emphasized gradual lifestyle changes rather than drastic restrictions.

Medication adherence appears good. Patient brought medication bottles and knows dosing schedule. However, not checking blood sugar as frequently as recommended.

Plan: Schedule follow-up in 2 weeks to review SMBG log and assess insulin need. Referred to diabetes educator for additional support.`
    },
    {
      id: 3,
      uhid: 'CDC001',
      patientName: 'John Doe',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-12-01',
      time: '09:15 AM',
      notes: `Initial consultation for poorly controlled diabetes. Patient reports increased thirst, frequent urination, and fatigue for past 2-3 weeks. Has been non-compliant with previous medication regimen.

Patient works long hours as a taxi driver. Diet consists mainly of fast food and irregular meals. No regular exercise routine.

Patient expressed frustration with previous care - felt rushed during visits and didn't understand instructions. Taking time today to build rapport and ensure understanding.

Medication non-adherence appears to be due to: 1) Confusion about dosing schedule, 2) Side effects (GI upset from Metformin), 3) Cost concerns.

Simplified medication regimen and provided written instructions. Discussed taking Metformin with food to reduce GI symptoms. Provided samples to help with cost.

Patient seems receptive to lifestyle changes but needs practical strategies that fit his work schedule. Suggested keeping healthy snacks in taxi and taking short walking breaks.

Need close follow-up to ensure adherence and adjust medications as needed.`
    },

    // Mary Johnson (CDC005) - Stable patient with good control
    {
      id: 4,
      uhid: 'CDC005',
      patientName: 'Mary Johnson',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-12-20',
      time: '11:00 AM',
      notes: `Routine follow-up for well-controlled Type 2 DM. Patient is doing excellent with self-management. Blood sugar logs show consistent readings in target range.

Patient continues Mediterranean diet and regular exercise routine. No hypoglycemic episodes. No new symptoms or concerns.

Patient asked about reducing medication since blood sugar is well controlled. Explained that current medication is helping maintain control and premature reduction could lead to deterioration. Patient understood and agrees to continue current regimen.

Discussed annual preventive care: scheduled eye exam for January, foot exam completed today - no issues noted. Flu vaccine administered.

This is an ideal example of diabetes management - patient is engaged, adherent, and achieving treatment goals. Encouraged to maintain current excellent self-care practices.`
    },
    {
      id: 5,
      uhid: 'CDC005',
      patientName: 'Mary Johnson',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-06-15',
      time: '10:45 AM',
      notes: `Six-month follow-up. Patient maintaining good control. HbA1c 7.1% - slight improvement from last visit (7.3%).

Patient reports occasional hypoglycemia (BG in 60s) when she skips meals or exercises more than usual. Reviewed hypoglycemia management and importance of regular meal timing.

Patient very motivated and asks intelligent questions about her condition. Brings detailed blood sugar logs and food diary to each visit - this level of engagement is commendable.

Discussed long-term complications prevention. Patient already following preventive care guidelines. Continue current management.`
    },

    // Sarah Williams (CDC003) - Type 1 DM with challenges
    {
      id: 6,
      uhid: 'CDC003',
      patientName: 'Sarah Williams',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2026-01-03',
      time: '03:00 PM',
      notes: `Type 1 DM follow-up. CGM data shows significant variability in blood glucose. Multiple nocturnal hypoglycemic episodes concerning.

Patient reports dawn phenomenon - waking up with high blood sugar despite good control at bedtime. This is affecting her sleep and overall quality of life.

Discussed adjusting basal insulin timing. Will try taking Glargine in morning instead of bedtime to better match insulin action with dawn phenomenon.

Patient expresses frustration with unpredictability of blood sugars despite careful management. Validated her feelings - acknowledged that Type 1 DM management is challenging even with best efforts.

Patient is highly engaged but showing signs of diabetes burnout. Discussed importance of diabetes support group and mental health resources. Patient receptive to counseling referral.

Also discussed insulin pump option if current regimen adjustments don't improve control. Patient interested but wants to try basal insulin timing change first.`
    }
  ]);

  // Add new consultation note
  const addNote = (noteData) => {
    const newNote = {
      id: consultationNotes.length + 1,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      ...noteData
    };
    setConsultationNotes([newNote, ...consultationNotes]); // Newest first
    return newNote;
  };

  // Get all notes for a specific patient
  const getNotesByPatient = (uhid) => {
    return consultationNotes
      .filter(note => note.uhid === uhid)
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
  };

  // Search notes for a patient by keyword
  const searchNotes = (uhid, searchTerm) => {
    if (!searchTerm.trim()) {
      return getNotesByPatient(uhid);
    }
    
    const term = searchTerm.toLowerCase();
    return consultationNotes
      .filter(note => 
        note.uhid === uhid && (
          note.notes.toLowerCase().includes(term) ||
          note.doctorName.toLowerCase().includes(term) ||
          note.date.includes(term)
        )
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Get latest note for a patient
  const getLatestNote = (uhid) => {
    const patientNotes = getNotesByPatient(uhid);
    return patientNotes[0] || null;
  };

  const value = {
    consultationNotes,
    addNote,
    getNotesByPatient,
    searchNotes,
    getLatestNote
  };

  return (
    <ConsultationNotesContext.Provider value={value}>
      {children}
    </ConsultationNotesContext.Provider>
  );
};