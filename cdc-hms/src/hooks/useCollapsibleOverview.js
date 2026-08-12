import { useState } from 'react';

/**
 * Shared behaviour for the record "file" pages (PatientFile, StaffFile):
 * the overview starts expanded, and selecting any tab collapses it. The name
 * bar can still expand/collapse it manually via setOverviewOpen.
 *
 * One source of truth so every file behaves identically.
 *
 * @param {string} initialTab  id of the tab active on first render
 */
export default function useCollapsibleOverview(initialTab) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [overviewOpen, setOverviewOpen] = useState(true);

  // Selecting a tab always collapses the overview.
  const selectTab = (id) => {
    setActiveTab(id);
    setOverviewOpen(false);
  };

  return { activeTab, selectTab, overviewOpen, setOverviewOpen };
}
