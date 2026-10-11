import { useCallback, useEffect, useState } from 'react';
import { FileText, RefreshCw, X } from 'lucide-react';
import { dermService } from '../../../services/dermService';
import { insertIntoConsultationNote } from '../../../utils/consultationNoteInsert';
import { notify } from '../../../utils/notify';

/**
 * Today's skin note (Dermatology Phase 4, 7 Oct 2026; decisions D12, V1).
 *
 * Written by the server from today's structured entries (utils/dermVisits —
 * plain templating, never AI). The doctor reads it, may edit the text here,
 * and presses Insert: it is added to the end of today's consultation note,
 * unsaved — their usual Save keeps it. Nothing is stored from this panel;
 * the structured entries stay the record.
 *
 * Props: uhid, today ('YYYY-MM-DD'), onClose
 */
const DermTodayNote = ({ uhid, today, onClose }) => {
  const [text, setText] = useState('');
  const [state, setState] = useState('loading');   // loading | ready | empty | error
  const [edited, setEdited] = useState(false);

  const build = useCallback(async () => {
    setState('loading');
    try {
      const res = await dermService.getVisits(uhid, { date: today });
      const note = res?.data?.day?.note || '';
      setText(note);
      setEdited(false);
      setState(note ? 'ready' : 'empty');
    } catch {
      setState('error');
    }
  }, [uhid, today]);

  useEffect(() => { build(); }, [build]);

  const insert = () => {
    if (!text.trim()) return;
    if (insertIntoConsultationNote(uhid, text)) onClose();
    else notify('error', "The consultation note isn't open. Open the patient's Today's Consultation and try again.");
  };

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-3" aria-label="Today's skin note">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
        <b className="text-sm text-gray-800">Today's skin note</b>
        <span className="text-xs text-gray-500">Written from today's entries · read it before inserting</span>
        <button type="button" onClick={onClose} className="ml-auto rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600" aria-label="Close the skin note">
          <X className="h-4 w-4" />
        </button>
      </div>

      {state === 'loading' && <p className="py-4 text-center text-sm text-gray-500">Writing the note…</p>}
      {state === 'error' && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not write the note. <button type="button" onClick={build} className="font-semibold underline">Try again</button>
        </p>
      )}
      {state === 'empty' && (
        <p className="rounded-lg bg-white px-3 py-3 text-sm text-gray-600">
          Nothing is recorded on the skin today yet. Open a finding and save today's look first.
        </p>
      )}
      {state === 'ready' && (
        <>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setEdited(true); }}
            rows={Math.min(16, Math.max(6, text.split('\n').length + 2))}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Skin note text"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={insert} disabled={!text.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              Insert into consultation note
            </button>
            <button type="button" onClick={build}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              <RefreshCw className="h-3.5 w-3.5" /> {edited ? 'Start again from the entries' : 'Rewrite from the entries'}
            </button>
            <span className="text-xs text-gray-500">Inserted at the end of the note, not saved — press Save there.</span>
          </div>
        </>
      )}
    </section>
  );
};

export default DermTodayNote;
