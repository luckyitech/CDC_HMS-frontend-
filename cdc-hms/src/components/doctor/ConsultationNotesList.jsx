import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import Card from "../shared/Card";
import Button from "../shared/Button";
import Modal from "../shared/Modal";
import VoiceInput from "../shared/VoiceInput";
import { useConsultationNotesContext } from "../../contexts/ConsultationNotesContext";
import { useUserContext } from "../../contexts/UserContext";
import { MessageSquare, Plus, ChevronDown, ChevronUp, Pencil } from "lucide-react";

const ConsultationNotesList = ({
  patient,
  showStatistics = false,
}) => {
  const { getNotesByPatient, searchNotes, addNote, updateNote } =
    useConsultationNotesContext();
  const { getDoctors } = useUserContext();
  const doctors = getDoctors();
  const [searchInput, setSearchInput] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [consultationNotes, setConsultationNotes] = useState("");
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(new Set());
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const searchDebounceRef = useRef(null);

  // Debounce cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current);
  }, []);

  // Build params shared by all fetch calls
  const buildParams = useCallback((page) => {
    const params = { page, limit: 10 };
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo)   params.dateTo   = dateTo;
    if (selectedDoctor) params.doctorId = selectedDoctor;
    return params;
  }, [dateFrom, dateTo, selectedDoctor]);

  // Load first page whenever filters change
  // Always call searchNotes — it falls back to getNotesByPatient when search is empty
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const { notes, pagination } = await searchNotes(patient.uhid, debouncedSearch, buildParams(1));
        if (!isMounted) return;
        setFilteredNotes(notes);
        setTotalCount(pagination?.total ?? notes.length);
        setCurrentPage(1);
        setExpandedNotes(new Set());
        setHasMore(pagination ? 1 < pagination.totalPages : false);
      } catch {
        if (isMounted) setFilteredNotes([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [patient.uhid, debouncedSearch, buildParams, getNotesByPatient, searchNotes]);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(e.target.value), 300);
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const { notes, pagination } = await searchNotes(patient.uhid, debouncedSearch, buildParams(nextPage));
      setFilteredNotes(prev => [...prev, ...notes]);
      setHasMore(pagination ? nextPage < pagination.totalPages : false);
      setCurrentPage(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Toggle note expansion
  const toggleNoteExpansion = (id) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNotes(newExpanded);
  };

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
        setConsultationNotes("");
        setEditingNote(null);
        setShowWriteModal(false);
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
        setConsultationNotes("");
        setShowWriteModal(false);
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

  const handleEditNote = (note) => {
    setEditingNote(note);
    setConsultationNotes(note.notes);
    setShowWriteModal(true);
  };

  const handleCancelWrite = () => {
    const hasChanges = editingNote
      ? consultationNotes.trim() !== editingNote.notes.trim()
      : consultationNotes.trim().length > 0;

    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        setConsultationNotes("");
        setEditingNote(null);
        setShowWriteModal(false);
      }
    } else {
      setConsultationNotes("");
      setEditingNote(null);
      setShowWriteModal(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return (
    <div className="space-y-6">
      {/* Statistics (optional) */}
      {showStatistics && totalCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <p className="text-xs opacity-90">Total Notes</p>
            <p className="text-3xl font-bold mt-1">{totalCount}</p>
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

      {/* Search, Filters & Write Button */}
      <Card>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="🔍 Search notes..."
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

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">👨‍⚕️ All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
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
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">Loading consultation notes...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              {(() => {
                const hasFilters = searchInput.trim() || dateFrom || dateTo || selectedDoctor;
                return (
                  <>
                    <p className="text-gray-500 text-lg mb-2">
                      {hasFilters ? "No notes match the selected filters" : "No Consultation Notes Yet"}
                    </p>
                    <p className="text-gray-400 text-sm mb-4">
                      {hasFilters ? "Try adjusting or clearing the filters" : "Start documenting your clinical observations"}
                    </p>
                    {!hasFilters && (
                      <Button
                        onClick={() => setShowWriteModal(true)}
                        className="inline-flex items-center gap-2"
                      >
                        <Plus size={20} />
                        Write First Note
                      </Button>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const isExpanded = expandedNotes.has(note.id);
              const notePreview =
                note.notes.length > 100
                  ? note.notes.substring(0, 100) + "..."
                  : note.notes;

              return (
                <div
                  key={note.id}
                  className={`border-2 rounded-lg transition-all ${
                    index === 0
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {/* Clickable Header */}
                  <div
                    onClick={() => toggleNoteExpansion(note.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Left side - Date & Badge */}
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        {index === 0 && !dateFrom && !dateTo && !selectedDoctor && (
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
                          {" "}&middot;{" "}
                          {note.time}
                        </span>
                        <span className="text-sm text-gray-600">
                          👨‍⚕️ {note.doctorName}
                        </span>
                      </div>

                      {/* Right side - Expand/Collapse Icon */}
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                    </div>

                    {/* Preview when collapsed */}
                    {!isExpanded && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notePreview}
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          Click to expand
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed mt-4">
                        {note.notes}
                      </pre>
                      {note.date === today && (
                        <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                          <Button
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleEditNote(note); }}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Pencil size={14} />
                            Edit Note
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full"
            >
              {isLoadingMore ? "Loading..." : "Load More Notes"}
            </Button>
          </div>
        )}
      </Card>

      {showWriteModal && (
        <Modal
          isOpen={showWriteModal}
          title={editingNote ? "✏️ Edit Consultation Note" : "✍️ Write Consultation Note"}
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
                Document your clinical reasoning, concerns, observations, or
                any information that should remain confidential between
                healthcare providers.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCancelWrite}>
                Cancel
              </Button>
              <Button onClick={handleSaveNote}>{editingNote ? "Update Note" : "Save Consultation Notes"}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ConsultationNotesList;
