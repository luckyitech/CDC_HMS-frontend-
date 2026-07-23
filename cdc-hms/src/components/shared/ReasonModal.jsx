import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

/**
 * ReasonModal — asks for a written reason before an action that alters the
 * clinical record.
 *
 * Replaces window.prompt, which ignores the app's styling, cannot be tested,
 * and blocks the browser's event loop while open. Every place that needs a
 * reason before stopping a course, deleting a review or archiving a document
 * should use this rather than growing its own.
 *
 * Props:
 *   isOpen, onClose
 *   title        — heading, e.g. "Stop this course"
 *   message      — what the action does and what it does not undo
 *   confirmLabel — button text, defaults to "Confirm"
 *   destructive  — red confirm button for irreversible actions
 *   placeholder  — hint inside the textarea
 *   onConfirm(reason) — called with the trimmed reason; may be async
 */
const ReasonModal = ({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  placeholder = 'Reason…',
  onConfirm,
}) => {
  const [reason, setReason]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Clear between openings so a previous reason is never silently reused
  useEffect(() => { if (isOpen) { setReason(''); setSubmitting(false); } }, [isOpen]);

  const confirm = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(reason.trim());
    setSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}

      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
      />
      <p className="text-xs text-gray-400 mt-1">A reason is required.</p>

      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <button
          type="button"
          onClick={confirm}
          disabled={!reason.trim() || submitting}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed ${
            destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:opacity-90'
          }`}
        >
          {submitting ? 'Saving…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ReasonModal;
