/**
 * Queue status display helpers.
 *
 * 'Pending Injection' is a real Queue.status value: the patient has finished
 * with the doctor and is with the nurse for their injection, not yet billed.
 * Keeping it as a status rather than a derived label means injection visits
 * can be counted and reported on in SQL.
 */

export const PENDING_INJECTION = 'Pending Injection';
export const INJECTION_REASON  = 'For GLP-1 injection';

/** Statuses where the patient is waiting for a nurse. Drives the triage list. */
export const NURSE_QUEUE_STATUSES = ['Awaiting Triage', PENDING_INJECTION];

/** Consultation done, waiting on the nurse to give an injection. */
export const isPendingInjection = (item) => item?.status === PENDING_INJECTION;

export const queueStatusLabel = (item) => item?.status;

export const queueStatusColor = (item) => {
  switch (item?.status) {
    case 'Awaiting Triage':  return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'In Triage':        return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'Awaiting Doctor':  return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'With Doctor':      return 'bg-green-100 text-green-700 border-green-300';
    case PENDING_INJECTION:  return 'bg-teal-100 text-teal-700 border-teal-300';
    case 'Pending Billing':  return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'Completed':        return 'bg-gray-100 text-gray-700 border-gray-300';
    default:                 return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

/**
 * The doctor is finished with this patient — shows the consultation duration
 * instead of "In Progress", and hides the Continue button.
 */
export const isConsultationDone = (item) =>
  item?.status === 'Completed' ||
  item?.status === 'Pending Billing' ||
  isPendingInjection(item);
