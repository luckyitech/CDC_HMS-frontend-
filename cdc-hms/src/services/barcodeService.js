import api from './api';

/**
 * Barcode Service
 * Reader half of the barcode feature. Generation (Code128 → SVG/PNG) is a
 * pure client util and does not go through the API.
 */
export const barcodeService = {
  /**
   * Resolve a scanned barcode payload to the live patient.
   * Merge-aware on the backend: a merged-away UHID resolves to the surviving
   * record, with `redirectedFrom` set to the old code that was scanned.
   *
   * @param {string} payload - scanned code / UHID (e.g. "CDC042")
   * @param {'usb'|'camera'} [source='usb'] - recorded in the scan audit
   * @returns {Promise<{ success: boolean, data: { uhid: string, name: string, redirectedFrom: string|null } }>}
   */
  resolveScan: (payload, source = 'usb') =>
    api.get(`/patients/scan/${encodeURIComponent(payload)}`, { params: { source } }),

  /**
   * Email the patient their identity barcode card (Code128 PNG rendered
   * server-side, sent to the email on their record).
   * @param {string} uhid - Patient UHID
   */
  emailBarcode: (uhid) => api.post(`/patients/${uhid}/barcode-email`),

  /**
   * Report a client-side barcode generation (print) so it appears in the
   * admin Activity Log. Fire-and-forget from the caller.
   * @param {string} uhid - Patient UHID
   * @param {'print_card'|'print_label'} action
   */
  logGenerated: (uhid, action) => api.post(`/patients/${uhid}/barcode-event`, { action }),
};

export default barcodeService;
