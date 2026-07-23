import ConfirmActionModal from './ConfirmActionModal';
import { DOCUMENT_ACTIONS } from '../../utils/documentHelpers';

// Confirmation popup for document actions (hide / archive / restore).
// pendingAction: { type: keyof DOCUMENT_ACTIONS, doc } | null
const DocumentActionModal = ({ pendingAction, onClose, onConfirm }) => {
  if (!pendingAction) return null;
  const action = DOCUMENT_ACTIONS[pendingAction.type];
  return (
    <ConfirmActionModal
      isOpen={true}
      onClose={onClose}
      onConfirm={onConfirm}
      title={action.title}
      message={action.message(pendingAction.doc)}
      confirmLabel={action.confirmLabel}
      confirmVariant={action.variant}
      withReason={action.withReason}
      reasonLabel={action.reasonLabel}
    />
  );
};

export default DocumentActionModal;
