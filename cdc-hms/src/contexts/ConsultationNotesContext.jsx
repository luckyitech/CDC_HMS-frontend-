import { createContext, useContext, useState, useCallback } from 'react';
import consultationNotesService from '../services/consultationNotesService';

const ConsultationNotesContext = createContext();

export const useConsultationNotesContext = () => {
  const context = useContext(ConsultationNotesContext);
  if (!context) {
    throw new Error('useConsultationNotesContext must be used within ConsultationNotesProvider');
  }
  return context;
};

export const ConsultationNotesProvider = ({ children }) => {
  const [consultationNotes, setConsultationNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============================================
  // FETCH CONSULTATION NOTES FROM API
  // ============================================

  // Load all consultation notes from API
  const fetchConsultationNotes = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await consultationNotesService.getAll(params);
      if (response.success) {
        setConsultationNotes(response.data.consultationNotes || response.data);
      }
      return response;
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);


  // ============================================
  // CONSULTATION NOTES OPERATIONS (API)
  // ============================================

  // Add new consultation note (via API)
  const addNote = async (noteData) => {
    setLoading(true);
    try {
      const response = await consultationNotesService.create(noteData);
      if (response.success) {
        const newNote = response.data.consultationNote || response.data;
        setConsultationNotes(prev => [newNote, ...prev]);
        return newNote;
      }
      return null;
    } catch (err) {
      console.error('Add note error:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get all notes for a specific patient (via API)
  const getNotesByPatient = async (uhid, params = {}) => {
    try {
      const response = await consultationNotesService.getByPatient(uhid, params);
      if (response.success) {
        const notes = response.data.consultationNotes || response.data;
        const pagination = response.data.pagination || null;
        return { notes: Array.isArray(notes) ? notes : [], pagination };
      }
      return { notes: [], pagination: null };
    } catch (err) {
      console.error('Get notes by patient error:', err.message);
      return { notes: [], pagination: null };
    }
  };

  // Search notes for a patient by keyword (via API)
  const searchNotes = async (uhid, searchTerm, params = {}) => {
    if (!searchTerm || !searchTerm.trim()) {
      return getNotesByPatient(uhid, params);
    }

    try {
      const response = await consultationNotesService.search(uhid, searchTerm, params);
      if (response.success) {
        const notes = response.data.consultationNotes || response.data;
        const pagination = response.data.pagination || null;
        return { notes: Array.isArray(notes) ? notes : [], pagination };
      }
      return { notes: [], pagination: null };
    } catch (err) {
      console.error('Search notes error:', err.message);
      return { notes: [], pagination: null };
    }
  };

  // Get latest note for a patient (fetches list and returns first)
  const getLatestNote = async (uhid) => {
    try {
      const response = await consultationNotesService.getByPatient(uhid, { limit: 1 });
      if (response.success) {
        const notes = response.data.consultationNotes || response.data;
        return notes[0] || null;
      }
      return null;
    } catch (err) {
      console.error('Get latest note error:', err.message);
      return null;
    }
  };

  // Get note by ID (via API)
  const getNoteById = async (id) => {
    try {
      const response = await consultationNotesService.getById(id);
      if (response.success) {
        return response.data.consultationNote || response.data;
      }
      return null;
    } catch (err) {
      console.error('Get note by ID error:', err.message);
      return null;
    }
  };

  // Update consultation note (via API)
  const updateNote = async (id, updatedData) => {
    setLoading(true);
    try {
      const response = await consultationNotesService.update(id, updatedData);
      if (response.success) {
        const updatedNote = response.data.consultationNote || response.data;
        setConsultationNotes(prev =>
          prev.map(note =>
            note.id === id ? updatedNote : note
          )
        );
        return { success: true, consultationNote: updatedNote };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Delete consultation note (via API)
  const deleteNote = async (id) => {
    setLoading(true);
    try {
      const response = await consultationNotesService.delete(id);
      if (response.success) {
        setConsultationNotes(prev => prev.filter(note => note.id !== id));
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    // State
    consultationNotes,
    loading,
    error,

    // Functions
    fetchConsultationNotes,
    addNote,
    getNotesByPatient,
    searchNotes,
    getLatestNote,
    getNoteById,
    updateNote,
    deleteNote,
  };

  return (
    <ConsultationNotesContext.Provider value={value}>
      {children}
    </ConsultationNotesContext.Provider>
  );
};
