import api from './api';

/**
 * Billing Service — invoices, payments and the price list.
 *
 * The ONLY file in the frontend that knows a billing URL. Components go through
 * BillingContext, which goes through here; nothing else calls `api` for billing.
 *
 * Backend routes (all under /api/billing, guarded by 'billing.manage'
 * server-side except GET /services, which every clinical role may read with
 * price fields stripped for anyone lacking 'billing.viewPrices'):
 *
 * - GET/POST/PUT/DELETE /services        the price list (DELETE retires, never destroys)
 * - GET  /config                         clinic VAT/PIN + the option lists the UI renders from
 * - PUT  /config                         admin only
 * - POST /invoices/from-queue/:queueId   open the checkout for a visit (idempotent)
 * - PUT  /invoices/:id/selection         re-price a draft from what the screen shows
 * - POST /invoices/:id/issue             assign the number and freeze it
 * - POST /invoices/:id/void              the only correction (reason required)
 * - POST /payments                       record money already received
 * - POST /payments/:id/reverse           the only correction (reason required)
 * - GET  /reports/cash-up | /reports/outstanding
 *
 * AMOUNTS: everything read back is an integer number of cents in a `...Minor`
 * field. Everything written is the plain string reception typed — the server
 * parses it. Nothing on this side does money arithmetic; see utils/money.js.
 */
const billingService = {
  // ---------- Configuration ----------
  getConfig: () => api.get('/billing/config'),
  updateConfig: (data) => api.put('/billing/config', data),

  // ---------- Price list ----------
  getServices: (params = {}) => api.get('/billing/services', { params }),
  createService: (data) => api.post('/billing/services', data),
  updateService: (id, data) => api.put(`/billing/services/${id}`, data),
  retireService: (id) => api.delete(`/billing/services/${id}`),

  // ---------- Invoices ----------
  getInvoices: (params = {}) => api.get('/billing/invoices', { params }),
  getInvoice: (id) => api.get(`/billing/invoices/${id}`),
  // Returns null (not a 404) when the visit has no bill open yet.
  getInvoiceForQueue: (queueId) => api.get(`/billing/invoices/for-queue/${queueId}`),

  createInvoice: (data) => api.post('/billing/invoices', data),
  // Idempotent: a second call returns the bill already open for the visit, so a
  // double-click at the checkout desk cannot raise two.
  openForQueue: (queueId) => api.post(`/billing/invoices/from-queue/${queueId}`),
  // The checkout sends its SELECTION — ticked labels and scanned batches — and
  // gets priced lines back. It never resolves a label to a price itself.
  setSelection: (id, selection) => api.put(`/billing/invoices/${id}/selection`, selection),
  updateInvoice: (id, data) => api.put(`/billing/invoices/${id}`, data),

  issueInvoice: (id) => api.post(`/billing/invoices/${id}/issue`),
  voidInvoice: (id, reason) => api.post(`/billing/invoices/${id}/void`, { reason }),
  discardInvoice: (id) => api.delete(`/billing/invoices/${id}`),
  rebuildTotals: () => api.post('/billing/invoices/rebuild-totals'),

  // ---------- Payments (append-only) ----------
  getPayments: (params = {}) => api.get('/billing/payments', { params }),
  recordPayment: (data) => api.post('/billing/payments', data),
  reversePayment: (id, reason) => api.post(`/billing/payments/${id}/reverse`, { reason }),

  // ---------- Reports ----------
  getCashUp: (date) => api.get('/billing/reports/cash-up', { params: date ? { date } : {} }),
  getOutstanding: (params = {}) => api.get('/billing/reports/outstanding', { params }),

  // The audit three — each surfaces a way money could leave without a record.
  // Defaults to today when no range is given, so the report answers "did
  // anything slip through today" rather than opening on years of history.
  getUnbilled: (params = {}) => api.get('/billing/reports/unbilled', { params }),
  getRemovedItems: (params = {}) => api.get('/billing/reports/removed-items', { params }),
  getAdhocPriced: (params = {}) => api.get('/billing/reports/adhoc-priced', { params }),
};

export default billingService;
