import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import StatCard from "../shared/StatCard";
import Button from "../shared/Button";
import VoiceInput from "../shared/VoiceInput";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import { Save } from "lucide-react";

const ConsultationNotesList = ({
  patient,
  showStatistics = false,
  readOnly = false,
}) => {
  const { getNotesByPatient, searchNotes, addNote, updateNote } =
    useConsultationNotesContext();
  const [consultationNotes, setConsultationNotes] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  // Load recent notes for this patient. The old search/filter/pagination UI was
  // removed (past visits live in the summary panel's Visit History), so this
  // always fetches the default first page.
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const { notes, pagination } = await searchNotes(patient.uhid, "", { page: 1, limit: 10 });
        if (!isMounted) return;
        setFilteredNotes(notes);
        setTotalCount(pagination?.total ?? notes.length);
      } catch {
        if (isMounted) setFilteredNotes([]);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [patient.uhid, getNotesByPatient, searchNotes]);

  const handleSaveNote = async () => {
    if (!consultationNotes.trim()) {
      toast.error("Please enter consultation notes", {
        duration: 3000,
        position: "top-right",
        icon: "❌",
        style: {
          background: "#EF4444",
          color: "#FFFFFF",
          fontWeight: "bold",
          padding: "16px",
        },
      });
      return;
    }

    if (editingNote) {
      // Update existing note
      const result = await updateNote(editingNote.id, { notes: consultationNotes });
      if (result.success) {
        setFilteredNotes((prev) =>
          prev.map((n) => (n.id === editingNote.id ? result.consultationNote : n))
        );
        // Inline editor: keep the text on screen, stay in "update" mode
        setEditingNote(result.consultationNote);
        toast.success("Consultation Note Updated Successfully", {
          duration: 3000,
          position: "top-right",
          icon: "✅",
          style: {
            background: "#10B981",
            color: "#FFFFFF",
            fontWeight: "bold",
            padding: "16px",
          },
        });
      } else {
        toast.error("Failed to update consultation note. Please try again.", {
          duration: 3000,
          position: "top-right",
          icon: "❌",
          style: {
            background: "#EF4444",
            color: "#FFFFFF",
            fontWeight: "bold",
            padding: "16px",
          },
        });
      }
    } else {
      // Save new note
      const newNote = await addNote({
        uhid: patient.uhid,
        notes: consultationNotes,
      });

      if (newNote) {
        setFilteredNotes((prev) => [newNote, ...prev]);
        // Inline editor: keep the text on screen, switch to "update" mode
        setEditingNote(newNote);
        toast.success("Consultation Notes Saved Successfully", {
          duration: 3000,
          position: "top-right",
          icon: "✅",
          style: {
            background: "#10B981",
            color: "#FFFFFF",
            fontWeight: "bold",
            padding: "16px",
          },
        });
      } else {
        toast.error("Failed to save consultation note. Please try again.", {
          duration: 3000,
          position: "top-right",
          icon: "❌",
          style: {
            background: "#EF4444",
            color: "#FFFFFF",
            fontWeight: "bold",
            padding: "16px",
          },
        });
      }
    }
  };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Inline editor: prefill with today's note once loaded (if the doctor hasn't
  // started typing), so Save updates it instead of creating a duplicate.
  useEffect(() => {
    const todaysNote = filteredNotes.find((n) => n.date === today);
    if (todaysNote && !editingNote && !consultationNotes) {
      setEditingNote(todaysNote);
      setConsultationNotes(todaysNote.notes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredNotes]);

  return (
    <div className="space-y-6">
      {/* Statistics (optional) */}
      {showStatistics && totalCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          <StatCard title="Total Notes" value={totalCount} gradient="from-blue-500 to-blue-600" />
          <StatCard
            title="Most Recent"
            value={filteredNotes[0]
              ? new Date(filteredNotes[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "N/A"}
            gradient="from-green-500 to-green-600"
          />
          <StatCard title="Doctors" value={new Set(filteredNotes.map((n) => n.doctorName)).size} gradient="from-purple-500 to-purple-600" />
        </div>
      )}

      {/* Inline note editor — no modal, no history list (past visits live in
          the summary panel's Visit History). Prefilled with today's note when
          one exists; Save creates or updates accordingly. */}
      {!readOnly && (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
            <p className="text-xs text-amber-700">
              🔒 Private doctor's notes — not shared with patients.
            </p>
          </div>
          <VoiceInput
            value={consultationNotes}
            onChange={(e) => setConsultationNotes(e.target.value)}
            placeholder="Document your clinical impression, reasoning, differential diagnoses, concerns about compliance, or any other confidential observations..."
            rows={8}
          />
          <div className="flex items-center justify-between gap-3">
            {editingNote ? (
              <p className="text-xs text-gray-400">
                Saved {editingNote.time} · 👨‍⚕️ {editingNote.doctorName}
              </p>
            ) : (
              <span />
            )}
            <Button onClick={handleSaveNote} className="flex items-center gap-2">
              <Save size={16} />
              {editingNote ? "Update Note" : "Save Note"}
            </Button>
          </div>
        </div>
      )}

      {/* Read-only view (e.g. non-editing contexts): today's note as text */}
      {readOnly && filteredNotes.filter((n) => n.date === today).map((note) => (
        <div key={note.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">{note.time} · 👨‍⚕️ {note.doctorName}</p>
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{note.notes}</pre>
        </div>
      ))}
    </div>
  );
};

export default ConsultationNotesList;
