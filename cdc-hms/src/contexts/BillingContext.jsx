import { createContext, useContext, useState, useCallback } from 'react';
import billingService from '../services/billingService';
import { notify } from '../utils/notify';

const BillingContext = createContext();

export const useBillingContext = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBillingContext must be used within BillingProvider');
  }
  return context;
};

/**
 * Billing module state.
 *
 * Caches only what is clinic-wide and changes rarely — the configuration and
 * the price list. Invoices and payments are never cached: they are the thing
 * two receptionists can change from two screens at once, and a stale total is
 * worse than a fetch.
 *
 * NOTHING is fetched until a billing screen asks, so a user who never opens
 * Billing pays no cost. Same contract as StockContext.
 */
export const BillingProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  /**
   * The one place a billing API call is awaited.
   *
   * Unwraps the { success, data } envelope, turns a rejection into the same
   * shape, and shows the server's own message — which is written for the person
   * at the desk ("That M-Pesa code has already been recorded against a bill"),
   * not for a developer. Components say what they want; they never write
   * try/catch. This mirrors the `action()` wrapper the backend controllers use.
   *
   * Pass `{ silent: true }` when the caller renders the failure itself — the
   * checkout does this for an unissuable bill, where an inline warning next to
   * the offending line is more use than a toast.
   */
  const run = useCallback(async (call, { silent = false, fallback = 'Something went wrong' } = {}) => {
    try {
      const res = await call();
      if (res?.success) return { success: true, data: res.data };
      const message = res?.message || fallback;
      if (!silent) notify('error', message);
      return { success: false, message };
    } catch (err) {
      const message = err?.message || fallback;
      if (!silent) notify('error', message);
      // `status` and `data` come through for the few callers that branch on a
      // structured response — a 409 duplicate, for instance.
      return { success: false, message, status: err?.status, data: err?.data };
    }
  }, []);

  // ---------- Reference data ----------

  const loadConfig = useCallback(async () => {
    const res = await run(() => billingService.getConfig(), { fallback: 'Could not load billing settings' });
    if (res.success) setConfig(res.data);
    return res;
  }, [run]);

  const loadServices = useCallback(async (params = {}) => {
    const res = await run(() => billingService.getServices(params), { fallback: 'Could not load the price list' });
    if (res.success) setServices(res.data || []);
    return res;
  }, [run]);

  /** Both reference lists, loaded once when a billing page mounts. */
  const loadReferenceData = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      await Promise.all([loadConfig(), loadServices(params)]);
    } finally {
      setLoading(false);
    }
  }, [loadConfig, loadServices]);

  // ---------- Price list mutations ----------
  // Each refreshes the cache, because the price list is cached and a stale
  // price is the one thing on this screen that must never be shown.

  /** Create when `id` is null, update otherwise — one call site for both. */
  const saveService = useCallback(async (id, data) => {
    const res = await run(
      () => (id ? billingService.updateService(id, data) : billingService.createService(data)),
      { fallback: id ? 'Could not save the service' : 'Could not add the service' }
    );
    if (res.success) await loadServices({ includeRetired: 'true' });
    return res;
  }, [run, loadServices]);

  const retireService = useCallback(async (id) => {
    const res = await run(() => billingService.retireService(id), { fallback: 'Could not retire the service' });
    if (res.success) await loadServices({ includeRetired: 'true' });
    return res;
  }, [run, loadServices]);

  const saveConfig = useCallback(async (patch) => {
    const res = await run(() => billingService.updateConfig(patch), { fallback: 'Could not save billing settings' });
    if (res.success) setConfig(res.data);
    return res;
  }, [run]);

  // ---------- Derived helpers ----------

  /**
   * The option lists the UI renders from — payment methods, VAT classes,
   * service categories — as the SERVER defines them.
   *
   * Deliberately no hardcoded fallback list. If the config has not loaded,
   * these are empty and the form renders nothing rather than a stale set that
   * disagrees with what the server will accept. Adding a payment method on the
   * backend makes it appear here with no frontend change at all.
   */
  const options = config?.options || { paymentMethods: [], vatClasses: [], serviceCategories: [] };

  const value = {
    config,
    options,
    currency: config?.currency || 'KES',
    services,
    loading,
    run,
    loadConfig,
    loadServices,
    loadReferenceData,
    saveService,
    retireService,
    saveConfig,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};

export default BillingContext;
