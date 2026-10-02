// Shared bits for staff photos (2 Oct 2026). Kept out of the .jsx files so
// react-refresh stays happy (components-only exports there).

/** Fired after a photo is set or removed: detail { key } ('self' or 'emp:<id>'). */
export const STAFF_PHOTO_CHANGED = 'cdc:staff-photo-changed';

export const photoKey = ({ self, employeeId }) => (self ? 'self' : `emp:${employeeId}`);

export const announcePhotoChange = (key) => window.dispatchEvent(new CustomEvent(STAFF_PHOTO_CHANGED, { detail: { key } }));
