import { createContext, useContext, useState, useCallback } from 'react';
import stockService from '../services/stockService';

const StockContext = createContext();

export const useStockContext = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStockContext must be used within StockProvider');
  }
  return context;
};

// Stock module state. Reference data (items, locations, suppliers) is
// clinic-wide and changes rarely, so it is cached here; NOTHING is fetched
// until the stock pages ask — users who never open Stocks pay no cost.
export const StockProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (params = {}) => {
    try {
      const res = await stockService.getItems(params);
      if (res.success) {
        setItems(res.data || []);
        return res.data || [];
      }
      return [];
    } catch (err) {
      console.error('Fetch stock items error:', err.message);
      return [];
    }
  }, []);

  const fetchLocations = useCallback(async (params = {}) => {
    try {
      const res = await stockService.getLocations(params);
      if (res.success) {
        setLocations(res.data || []);
        return res.data || [];
      }
      return [];
    } catch (err) {
      console.error('Fetch stock locations error:', err.message);
      return [];
    }
  }, []);

  const fetchSuppliers = useCallback(async (params = {}) => {
    try {
      const res = await stockService.getSuppliers(params);
      if (res.success) {
        setSuppliers(res.data || []);
        return res.data || [];
      }
      return [];
    } catch (err) {
      console.error('Fetch stock suppliers error:', err.message);
      return [];
    }
  }, []);

  // Load all three reference lists once when a stock page mounts.
  const loadReferenceData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchItems(), fetchLocations(), fetchSuppliers()]);
    } finally {
      setLoading(false);
    }
  }, [fetchItems, fetchLocations, fetchSuppliers]);

  // Generic save helper for the three reference tables — create or update,
  // then refresh the cached list. keeps the tab components tiny and uniform.
  const saveReference = useCallback(async (kind, id, data) => {
    const svc = {
      item:     { create: stockService.createItem,     update: stockService.updateItem,     refresh: fetchItems },
      location: { create: stockService.createLocation, update: stockService.updateLocation, refresh: fetchLocations },
      supplier: { create: stockService.createSupplier, update: stockService.updateSupplier, refresh: fetchSuppliers },
    }[kind];
    try {
      const res = id ? await svc.update(id, data) : await svc.create(data);
      if (res.success) {
        await svc.refresh();
        return { success: true, data: res.data };
      }
      return { success: false, message: res.message };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }, [fetchItems, fetchLocations, fetchSuppliers]);

  const value = {
    items,
    locations,
    suppliers,
    loading,
    fetchItems,
    fetchLocations,
    fetchSuppliers,
    loadReferenceData,
    saveReference,
  };

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
};

export default StockContext;
