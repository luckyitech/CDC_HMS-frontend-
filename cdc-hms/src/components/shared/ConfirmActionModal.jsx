import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

// System-styled confirmation popup — replaces window.confirm / window.prompt.
// Optionally collects a reason, passed to onConfirm(reason).
const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  withReason = false,
  reasonLabel = 'Reason (optional)',
  reasonPlaceholder = '',
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const close = () => {
    setReason('');
    onClose();
  };

  const confirm = () => {
    const value = withReason ? reason.trim() : undefined;
    setReason('');
    onConfirm(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title}>
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>

        {withReason && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{reasonLabel}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={reasonPlaceholder}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant={confirmVariant} onClick={confirm} className="flex-1">{confirmLabel}</Button>
          <Button variant="outline" onClick={close} className="flex-1">Cancel</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmActionModal;
