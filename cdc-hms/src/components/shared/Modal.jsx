import { createPortal } from 'react-dom';
import { MODAL_Z } from '../../constants/layers';

// ModalOverlay — THE dialog backdrop (DRY-GUIDELINES §4c). Portaled to
// document.body so a dialog is never clipped by a transformed/overflow-hidden
// ancestor (floating sidebar, summary drawer) and sits on MODAL_Z, above side
// panels (constants/layers.js). Dialogs with their own header/footer render
// their panel inside it; plain dialogs use <Modal>, which is built on it.
// onClose (optional) closes on a click on the backdrop itself, never on a click
// that started inside the panel. align="top" for tall forms that scroll.
export const ModalOverlay = ({ children, onClose, align = 'center', className = '', ...rest }) => createPortal(
  <div
    {...rest}
    className={`fixed inset-0 bg-black/50 flex justify-center p-4 ${align === 'top' ? 'items-start overflow-y-auto' : 'items-center'} ${className}`}
    style={{ zIndex: MODAL_Z }}
    onClick={onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
  >
    {children}
  </div>,
  document.body,
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  // '2xl' — side-by-side layouts (a document preview beside a form), e.g. the Lab Inbox pairing modal.
  const sizeClass = size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : size === '2xl' ? 'max-w-6xl' : 'max-w-md';

  return (
    <ModalOverlay>
      <div className={`bg-white rounded-lg shadow-xl ${sizeClass} w-full max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-xl font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </ModalOverlay>
  );
};

export default Modal;
