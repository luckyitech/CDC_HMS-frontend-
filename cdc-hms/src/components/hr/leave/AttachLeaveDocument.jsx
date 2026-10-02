import { useRef, useState } from 'react';
import { Paperclip, FileCheck2, X } from 'lucide-react';
import staffService from '../../../services/staffService';
import { notify } from '../../../utils/notify';
import { buttonCls } from '../hrUi';
import { attachmentCategoryFor } from './leaveFormat';

/**
 * Attach a supporting document to a leave request (a sick note, a course
 * letter). The file goes through the staff file's OWN self-upload route
 * (POST /api/staff/:employeeId/documents) — it lands in private/ on the
 * person's own staff file with visibility Staff — and the request points at
 * the document's id. Nothing here stores a file of its own.
 *
 * props:
 *   employeeId   the applicant's EMP id (from GET /api/hr/me/leave)
 *   leaveType    decides the category (Sick → Sick Note, Study → Training Certificate)
 *   value        { id, fileName } | null
 *   onChange     (doc | null) => void
 *   label        button text
 *   category     optional — overrides the leave-type category (a profile change
 *                request attaches a 'National ID' or 'Practising Licence', 2 Oct 2026)
 *   notes        optional — the note saved on the document
 */
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx';

const AttachLeaveDocument = ({
  employeeId, leaveType, value, onChange, label = 'Attach document', category, notes = 'Attached to a leave request',
}) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!employeeId) {
    return <p className="text-[11px] text-gray-500">You don&apos;t have a staff file yet, so a document can&apos;t be attached here — give it to HR.</p>;
  }

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const res = await staffService.uploadDocument(employeeId, file, {
        category: category || attachmentCategoryFor(leaveType),
        visibility: 'Staff',
        notes,
      });
      onChange({ id: res.data.id, fileName: res.data.fileName });
      notify('success', 'Document attached');
    } catch (err) {
      notify('error', err.message || 'Could not upload the document');
    } finally {
      setBusy(false);
    }
  };

  if (value) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-800" data-testid="attached-document">
        <FileCheck2 className="w-4 h-4 flex-none" />
        <span className="truncate max-w-[14rem]">{value.fileName}</span>
        <button type="button" onClick={() => onChange(null)} className="text-green-700 hover:text-green-900" aria-label="Remove the attached document">
          <X className="w-4 h-4" />
        </button>
      </span>
    );
  }

  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={pick} data-testid="attach-input" />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className={`${buttonCls} inline-flex items-center gap-1.5`}>
        <Paperclip className="w-4 h-4" /> {busy ? 'Uploading…' : label}
      </button>
    </>
  );
};

export default AttachLeaveDocument;
