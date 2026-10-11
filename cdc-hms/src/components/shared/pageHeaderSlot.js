import { createContext } from 'react';

/**
 * PageHeaderSlotContext (11 Oct 2026) — lets MainLayout hand PageHeader an
 * element to show at the far right of the page's title row. Used to put the
 * profile menu in the top-right corner of each portal's home page without
 * spending a row on it. null (the default) renders nothing extra.
 */
export const PageHeaderSlotContext = createContext(null);
