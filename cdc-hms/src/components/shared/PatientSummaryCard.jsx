import { useState } from "react";
import toast from "react-hot-toast";
import { NotebookPen, Pencil, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import Card from "./Card";
import VoiceInput from "./VoiceInput";
import patientService from "../../services/patientService";

const fmtDateTime = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

const PatientSummaryCard = ({ patient }) => {
  const [summary, setSummary]     = useState(patient.patientSummary   || '');
  const [updatedBy, setUpdatedBy] = useState(patient.summaryUpdatedBy || null);
  const [updatedAt, setUpdatedAt] = useState(patient.summaryUpdatedAt || null);
  const [isOpen, setIsOpen]       = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft]         = useState('');
  const [saving, setSaving]       = useState(false);

  const toggleOpen = () => {
    if (isEditing) return;
    setIsOpen(prev => !prev);
  };

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(summary);
    setIsOpen(true);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await patientService.updateSummary(patient.uhid, draft.trim() || null);
      setSummary(res.data?.data?.patientSummary ?? draft.trim());
      setUpdatedBy(res.data?.data?.summaryUpdatedBy ?? null);
      setUpdatedAt(res.data?.data?.summaryUpdatedAt ?? null);
      setIsEditing(false);
      toast.success('Patient summary saved');
    } catch (err) {
      toast.error('Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header — always visible, clicking toggles the dropdown */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <NotebookPen className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-gray-800">Patient Summary</span>
          {summary && !isOpen && (
            <span className="text-xs text-primary bg-blue-50 px-2 py-0.5 rounded-full">
              {summary.length > 40 ? summary.slice(0, 40) + '…' : summary}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isEditing && (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1 text-xs text-primary hover:text-blue-800 font-medium"
            >
              <Pencil className="w-3 h-3" />
              {summary ? 'Edit' : 'Add Summary'}
            </button>
          )}
          {isOpen
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </div>
      </button>

      {/* Dropdown body */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {isEditing ? (
            <div className="space-y-2">
              <VoiceInput
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={4}
                placeholder="Write a quick recognition note about this patient (e.g. tall elderly man, comes with wife)..."
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-primary hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  <Check className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : summary ? (
            <div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
              {updatedBy && (
                <p className="text-xs text-gray-400 mt-3">
                  Last updated by <span className="font-medium text-gray-500">{updatedBy}</span>
                  {updatedAt && <> &middot; {fmtDateTime(updatedAt)}</>}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No summary yet. Click "Add Summary" to write a recognition note visible to all doctors.
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default PatientSummaryCard;
