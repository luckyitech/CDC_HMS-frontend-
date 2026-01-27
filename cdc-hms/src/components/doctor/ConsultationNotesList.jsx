import { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import Card from "../shared/Card";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import VoiceInput from "../shared/VoiceInput";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import { useUserContext } from "../../contexts/UserContext";

const ConsultationNotesList = ({ 
  patient, 
  showStatistics = false,
  compact = false 
}) => {
  const { currentUser } = useUserContext();
  const { getNotesByPatient, searchNotes, addNote } = useConsultationNotesContext();
  const [notesSearchTerm, setNotesSearchTerm] = useState("");
  const [consultationNotes, setConsultationNotes] = useState("");
  const [showWriteModal, setShowWriteModal] = useState(false);

  const handleSaveNote = () => {
    if (!consultationNotes.trim()) {
      alert("Please enter consultation notes");
      return;
    }

    // Save note
    addNote({
      uhid: patient.uhid,
      patientName: patient.name,
      doctorName: currentUser?.name || "Doctor",
      notes: consultationNotes,
    });

    // Clear form and close modal
    setConsultationNotes("");
    setShowWriteModal(false);

    // Show success toast
    const toast = document.createElement("div");
    toast.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce";
    toast.innerHTML = "✅ Consultation Notes Saved";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const handleCancelWrite = () => {
    if (consultationNotes.trim()) {
      if (window.confirm("You have unsaved notes. Are you sure you want to close?")) {
        setConsultationNotes("");
        setShowWriteModal(false);
      }
    } else {
      setShowWriteModal(false);
    }
  };

  // Get filtered notes
  const filteredNotes = notesSearchTerm.trim()
    ? searchNotes(patient.uhid, notesSearchTerm)
    : getNotesByPatient(patient.uhid);

  return (
    <div className="space-y-6">
      {/* Statistics (optional) */}
      {showStatistics && filteredNotes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <p className="text-xs opacity-90">Total Notes</p>
            <p className="text-3xl font-bold mt-1">{filteredNotes.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
            <p className="text-xs opacity-90">Most Recent</p>
            <p className="text-lg font-bold mt-1">
              {filteredNotes[0]
                ? new Date(filteredNotes[0].date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "N/A"}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
            <p className="text-xs opacity-90">Doctors</p>
            <p className="text-lg font-bold mt-1">
              {new Set(filteredNotes.map((n) => n.doctorName)).size}
            </p>
          </div>
        </div>
      )}

      {/* Search Bar & Write Button */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={notesSearchTerm}
              onChange={(e) => setNotesSearchTerm(e.target.value)}
              placeholder="🔍 Search consultation notes..."
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button
            onClick={() => setShowWriteModal(true)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} />
            Write New Note
          </Button>
        </div>
      </Card>

      {/* Previous Consultation Notes */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Consultation Notes History
          </span>
        }
      >
        <div className="space-y-4">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg mb-2">
                {notesSearchTerm.trim()
                  ? "No notes found matching your search"
                  : "No Consultation Notes Yet"}
              </p>
              <p className="text-gray-400 text-sm mb-4">
                {notesSearchTerm.trim()
                  ? "Try a different search term"
                  : "Start documenting your clinical observations"}
              </p>
              {!notesSearchTerm.trim() && (
                <Button
                  onClick={() => setShowWriteModal(true)}
                  className="inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Write First Note
                </Button>
              )}
            </div>
          ) : (
            filteredNotes.map((note, index) => (
              <div
                key={note.id}
                className={`p-4 border-2 rounded-lg ${
                  index === 0
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b">
                  <div className="flex items-center gap-2 flex-wrap">
                    {index === 0 && (
                      <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                        LATEST
                      </span>
                    )}
                    <span className="text-sm font-bold text-gray-700">
                      📅{" "}
                      {new Date(note.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" • "}
                      {note.time}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    👨‍⚕️ {note.doctorName}
                  </span>
                </div>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {note.notes}
                </pre>
              </div>
            ))
          )}
        </div>
      </Card>

      {showWriteModal && (
        <Modal
          isOpen={showWriteModal}
          title="✍️ Write Consultation Note"
          onClose={handleCancelWrite}
        >
          <div className="space-y-6">
            {/* Privacy Notice */}
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
              <p className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
                🔒 Private Doctor's Notes
              </p>
              <p className="text-xs text-amber-700">
                These notes are for your clinical records only and will not be
                shared with patients.
              </p>
            </div>

            {/* Patient Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Patient:</span> {patient.name}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">UHID:</span> {patient.uhid}
              </p>
            </div>

            {/* Text Area */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Consultation Notes
              </label>
              <VoiceInput
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                placeholder="Document your clinical impression, reasoning, differential diagnoses, concerns about compliance, or any other confidential observations..."
                rows={15}
              />
              <p className="text-xs text-gray-500 mt-2">
                💬 Document your clinical reasoning, concerns, observations, or any
                information that should remain confidential between healthcare providers.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancelWrite}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveNote}>
                Save Consultation Notes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ConsultationNotesList;