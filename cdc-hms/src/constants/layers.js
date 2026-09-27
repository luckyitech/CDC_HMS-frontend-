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
