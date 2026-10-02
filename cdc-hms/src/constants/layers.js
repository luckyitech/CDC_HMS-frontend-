// Stacking layers shared across the app (Emu, 27 Sep: "toasts always come in
// front of everything and never hide behind anything").
//
// Every pop-up message — react-hot-toast (toast / notify) and the My mail
// "New email" toast — sits on TOAST_Z, above every modal, side panel, print
// preview, image viewer and the session-timeout screen (z-[9999]). Toasts are
// also rendered at the end of <body> (the Toaster is its own fixed layer; the
// mail toast uses a portal) so no parent's stacking context can trap them.
// Nothing else in the app may use a z-index at or above this value.
export const TOAST_Z = 2147483000;

// Side panels that slide over a page (the patient email panel) sit on PANEL_Z.
// Every dialog (the shared Modal and the dialogs built on it) sits on MODAL_Z,
// ABOVE any panel — a dialog opened from inside a panel ("Attach from patient
// file", "Discard this draft?") must never open behind it (Emu, 29 Sep).
// Order, bottom to top: page chrome (z-50) → PANEL_Z → MODAL_Z → image viewer
// (z-[100]) → session timeout (z-[9999]) → TOAST_Z.
export const PANEL_Z = 60;
export const MODAL_Z = 70;
