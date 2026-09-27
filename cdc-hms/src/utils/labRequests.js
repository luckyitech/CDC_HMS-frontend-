// Collapse a patient's flat lab-test rows into one record per requisition, so
// a multi-test request reads as a single "Lab request". Shared by the Visit
// History day view and its Lab requests tab (DRY). authorRole (from the row
// that raised it) routes it: doctor-raised → Actions tab, nurse-raised →
// Nursing Kardex.
export const groupLabRequests = (rows) => {
  const map = new Map();
  (rows || []).forEach((r) => {
    const key = r.requisitionNumber || `single-${r.id}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return [...map.entries()].map(([reqNo, list]) => {
    const first = list[0] || {};
    return {
      id: reqNo,
      requisitionNumber: first.requisitionNumber || null,
      orderedDate: first.orderedDate,
      orderedTime: first.orderedTime,
      createdAt: first.createdAt,
      time: first.orderedTime,
      priority: first.priority,
      notes: first.notes,
      orderedBy: first.orderedBy,
      orderedByRole: first.orderedByRole,
      authorRole: first.orderedByRole,
      onBehalfOfDoctor: first.onBehalfOfDoctor,
      supersedesRequisition: first.supersedesRequisition,
      tests: list.map((t) => ({
        testType: t.testType, sampleType: t.sampleType, status: t.status, packageName: t.packageName,
      })),
    };
  });
};

// The requisition as LabRequestPrint takes it (cancelled tests left off).
export const labRequestForPrint = (req) => ({
  requisitionNumber: req.requisitionNumber,
  orderedDate: req.orderedDate,
  orderedTime: req.orderedTime,
  priority: req.priority,
  notes: req.notes,
  requestedBy: req.orderedBy,
  onBehalfOfDoctor: req.onBehalfOfDoctor,
  tests: (req.tests || []).filter((t) => t.status !== 'Cancelled'),
});

// Every lab test for a patient, not just the API's default first page of 20
// (27 Sep: long-standing patients silently lost older lab requests).
export const LAB_HISTORY_LIMIT = 1000;
