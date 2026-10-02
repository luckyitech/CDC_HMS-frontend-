import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import staffService from '../../../services/staffService';
import hrSelfService from '../../../services/hrSelfService';
import { notify } from '../../../utils/notify';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import { buttonCls } from '../hrUi';
import StaffAvatar from './StaffAvatar';
import { announcePhotoChange, photoKey } from './staffPhoto';

/**
 * Set or remove a staff photo (2 Oct 2026). My profile (self — decision D11:
 * saved directly, logged on the staff file's Activity) or the staff file for
 * someone holding users.write. .jpg / .png / .webp, up to 5 MB.
 *
 * props: self | employeeId, name, hasPhoto, onChanged(hasPhoto)
 */
const ACCEPT = '.jpg,.jpeg,.png,.webp';

const PhotoControl = ({ self = false, employeeId = null, name, hasPhoto, onChanged }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const key = photoKey({ self, employeeId });

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify('error', 'Photo is too large. Maximum size is 5MB.'); return; }
    setBusy(true);
    try {
      if (self) await hrSelfService.setPhoto(file);
      else await staffService.setPhoto(employeeId, file);
      announcePhotoChange(key);
      onChanged?.(true);
      notify('success', 'Photo saved');
    } catch (err) {
      notify('error', err.message || 'Could not save the photo');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setRemoving(false);
    setBusy(true);
    try {
      if (self) await hrSelfService.removePhoto();
      else await staffService.removePhoto(employeeId);
      announcePhotoChange(key);
      onChanged?.(false);
      notify('success', 'Photo removed');
    } catch (err) {
      notify('error', err.message || 'Could not remove the photo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3" data-testid="photo-control">
      <StaffAvatar self={self} employeeId={employeeId} hasPhoto={hasPhoto} name={name}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-lg font-bold" />
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={pick} data-testid="photo-input" />
        <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5`} disabled={busy} onClick={() => input.current?.click()}>
          <Camera className="w-4 h-4" /> {busy ? 'Saving…' : hasPhoto ? 'Change photo' : 'Add photo'}
        </button>
        {hasPhoto && (
          <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5 text-red-700`} disabled={busy} onClick={() => setRemoving(true)}>
            <Trash2 className="w-4 h-4" /> Remove
          </button>
        )}
      </div>
      <ConfirmActionModal
        isOpen={removing}
        onClose={() => setRemoving(false)}
        onConfirm={remove}
        title="Remove this photo?"
        message="The initials show instead. You can add a photo again at any time."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  );
};

export default PhotoControl;
