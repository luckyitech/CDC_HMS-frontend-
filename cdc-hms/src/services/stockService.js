import api from './api';

/**
 * Stock Management Service — quantities only, no money anywhere (decision).
 *
 * Backend routes (all under /api/stock, guarded by authorizeStock server-side
 * except /use which is open to all clinical roles):
 * - GET/POST/PUT /items | /locations | /suppliers   reference data (soft delete via status)
 * - POST /intake      create batch + STK- label + intake movement, one transaction
 * - POST /dispense    FEFO-gated; 409 + fefoSuggestion when a sooner-expiring batch exists
 * - POST /use         point-of-care consumption (all clinical roles)
 * - POST /transfer    FEFO-gated like dispense
 * - POST /adjustment  count corrections, reason required
 * - POST /writeoff    kind 'expiry'|'damage', reason required
 * - POST /movements/:id/reverse   the only correction path — ledger rows are immutable
 * - GET  /movements | /levels | /batches | /dashboard
 * - POST /levels/rebuild          admin only
 *
 * Batch barcode scans resolve through the shared scanner endpoint
 * (barcodeService.resolveScan) — an STK- payload returns { type: 'stock', … }.
 */
export const stockService = {
  // ---------- Reference data ----------
  getItems: (params = {}) => api.get('/stock/items', { params }),
  createItem: (data) => api.post('/stock/items', data),
  updateItem: (id, data) => api.put(`/stock/items/${id}`, data),

  getLocations: (params = {}) => api.get('/stock/locations', { params }),
  createLocation: (data) => api.post('/stock/locations', data),
  updateLocation: (id, data) => api.put(`/stock/locations/${id}`, data),

  getSuppliers: (params = {}) => api.get('/stock/suppliers', { params }),
  createSupplier: (data) => api.post('/stock/suppliers', data),
  updateSupplier: (id, data) => api.put(`/stock/suppliers/${id}`, data),

  // ---------- Ledger writes ----------
  intake: (data) => api.post('/stock/intake', data),
  dispense: (data) => api.post('/stock/dispense', data),
  recordUse: (data) => api.post('/stock/use', data),
  transfer: (data) => api.post('/stock/transfer', data),
  adjustment: (data) => api.post('/stock/adjustment', data),
  writeoff: (data) => api.post('/stock/writeoff', data),
  reverseMovement: (id, reason) => api.post(`/stock/movements/${id}/reverse`, { reason }),

  // ---------- Reads ----------
  getMovements: (params = {}) => api.get('/stock/movements', { params }),
  getLevels: (params = {}) => api.get('/stock/levels', { params }),
  getBatches: (params = {}) => api.get('/stock/batches', { params }),
  getDashboard: () => api.get('/stock/dashboard'),

  // ---------- Admin maintenance ----------
  rebuildLevels: () => api.post('/stock/levels/rebuild'),
};

export default stockService;
