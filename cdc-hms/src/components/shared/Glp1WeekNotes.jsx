import { useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import VoiceInput from './VoiceInput';
import { useUserContext } from '../../contexts/UserContext';
import { formatDateTime } from '../../utils/dateUtils';

/**
 * Glp1WeekNotes — the note thread for ONE week of a course.
 *
 * Two streams share it: the nurse's injection note and the doctor's clinical
 * note, told apart by the authorRole the server stamped at write time. Both
 * roles read and write through this one component, so a note the nurse leaves in
 * triage is the same row the doctor reads in their tracker — there is no second
 * place for it to live and nothing to reconcile.
 *
 * Two placements, one component:
 * - inside a week row of the dose ladder, collapsed until asked for (default)
 * - as the triage card's "today's note", composer already open (alwaysOpen)
 *
 * Notes cannot be edited, by design: a correction is a new note plus a removal
 * of the old one, so the thread keeps the whole trail instead of overwriting it.
 *
 * Removal mirrors the server's rule rather than guessing at it — a doctor may
 * remove any note, anyone else only their own. Offering a button the API would
 * refuse is worse than not offering one.
 */

const roleLabel = (authorRole) => (authorRole === 'doctor' ? 'Doctor' : 'Nurse');

const roleStyle = (authorRole) =>
  authorRole === 'doctor'
    ? 'bg-blue-100 text-blue-700 border-blue-300'
    : 'bg-teal-100 text-teal-700 border-teal-300';

const Glp1WeekNotes = ({
  weekNumber,
  notes = [],
  readOnly = false,
  onAdd,
  onRemove,
  alwaysOpen = false,     // triage card: the composer is the point, not a link
  className = 'pl-3 border-l-2 border-gray-200',
}) => {
  const { currentUser } = useUserContext();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft]   = useState('');
  const [saving, setSaving] = useState(false);

  const composerOpen = alwaysOpen || adding;

  // The server's ownership rule, mirrored so the UI never offers a refused action
  const canRemove = (note) =>
    currentUser?.role === 'doctor' || note.authorId === currentUser?.id;

  const submit = async () => {
    const body = draft.trim();
    if (!body) return toast.error('A note cannot be empty');

    setSaving(true);
    const result = await onAdd(weekNumber, body);
    setSaving(false);

    if (!result.success) {
      toast.error(result.message || 'Could not add the note');
      return;
    }

    toast.success(`Note added to week ${weekNumber}`);
    setDraft('');
    if (!alwaysOpen) setAdding(false);
  };

  const handleRemove = async (note) => {
    const result = await onRemove(note);
    if (result.success) toast.success('Note removed');
    else toast.error(result.message || 'Could not remove the note');
  };

  // Nothing written and no way to write — render nothing rather than an empty
  // shell on every week of the ladder.
  if (notes.length === 0 && readOnly) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {notes.map((note) => (
        <div key={note.id} className="group">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${roleStyle(note.authorRole)}`}>
              {roleLabel(note.authorRole)}
            </span>
            <span className="text-xs font-semibold text-gray-700">{note.authorName}</span>
            <span className="text-xs text-gray-400">{formatDateTime(note.createdAt)}</span>
            {!readOnly && canRemove(note) && (
              <button
                type="button"
                onClick={() => handleRemove(note)}
                className="ml-auto p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                title="Remove this note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600 whitespace-pre-wrap mt-0.5">{note.body}</p>
        </div>
      ))}

      {!readOnly && (composerOpen ? (
        <div className="space-y-2">
          <VoiceInput
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`What happened at week ${weekNumber}?`}
            rows={alwaysOpen ? 3 : 2}
            disabled={saving}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={saving || !draft.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save note'}
            </button>
            {!alwaysOpen && (
              <button
                type="button"
                onClick={() => { setAdding(false); setDraft(''); }}
                className="text-xs text-gray-400 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary"
        >
          {notes.length === 0
            ? <><MessageSquare className="w-3 h-3" /> Add a note</>
            : <><Plus className="w-3 h-3" /> Add another note</>}
        </button>
      ))}
    </div>
  );
};

export default Glp1WeekNotes;
