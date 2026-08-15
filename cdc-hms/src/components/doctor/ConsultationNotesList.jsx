import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import StatCard from "../shared/StatCard";
import Button from "../shared/Button";
import VoiceInput from "../shared/VoiceInput";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import { Save } from "lucide-react";

// Notes carry a plain YYYY-MM-DD string from the backend (clinicToday()).
// Parsed as UTC by the Date constructor, so render the parts directly rather
// than letting the local timezone shift the displayed day.
const fmtNoteDate = (d) => {
  if (!d) return "";
  const [y, m, day] = String(d).split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
};

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
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  // Load recent notes for this patient. The old search/filter/pagination UI was
  // removed (past visits live in the summary panel's Visit History), so this
  // always fetches the default first page.
  //
  // A failed load is tracked separately from an empty one. The context layer
  // turns a rejected request into `{ notes: [] }`, so without this flag a 403
  // and a patient with no notes render identically — which is how the missing
  // 'admin' role on GET /consultation-notes stayed invisible.
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const { notes, pagination } = await searchNotes(patient.uhid, "", { page: 1, limit: 10 });
        if (!isMounted) return;
        setFilteredNotes(notes);
        setTotalCount(pagination?.total ?? notes.length);
      } catch {
        if (!isMounted) return;
        setFilteredNotes([]);
        setLoadFailed(true);
      } finally {
        if (isMounted) setLoading(false);
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

  // Local calendar date, NOT toISOString() — that returns the UTC date, which
  // disagrees with the clinic's date (the backend stamps notes with
  // clinicToday()) for the first hours of every day in a UTC+ timezone. A note
  // written at 01:00 would not match, so the editor would open blank and Save
  // would create a second note for the same day.
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

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

      {/* Read-only view (staff / nurse / admin portals): the full history of
          notes the API returned, newest first. This used to filter to
          `n.date === today`, so unless a doctor had written a note that same
          day the tab rendered nothing at all — indistinguishable from a bug. */}
      {readOnly && (
        loading ? (
          <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">Loading notes…</p>
          </div>
        ) : loadFailed ? (
          <div className="p-6 text-center bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Could not load this patient's notes. Please refresh, or contact an
              administrator if this keeps happening.
            </p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-500">
              No doctor's notes have been recorded for this patient yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => (
              <div key={note.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">
                  {fmtNoteDate(note.date)}
                  {note.time ? ` · ${note.time}` : ""}
                  {note.doctorName ? ` · 👨‍⚕️ ${note.doctorName}` : ""}
                </p>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{note.notes}</pre>
                {note.assessment && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Assessment</p>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{note.assessment}</pre>
                  </div>
                )}
                {note.plan && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Plan</p>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{note.plan}</pre>
                  </div>
                )}
              </div>
            ))}
            {totalCount > filteredNotes.length && (
              <p className="text-xs text-gray-400 text-center">
                Showing the {filteredNotes.length} most recent of {totalCount} notes.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default ConsultationNotesList;
