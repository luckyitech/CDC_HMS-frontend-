// Small display helpers for the onboarding checklist screens (HR Tier 3 P3).
// Kept out of the .jsx files (react-refresh lint).

const CLINIC_TZ = 'Africa/Nairobi';

/** 'YYYY-MM-DD' → 'due 15 Oct' / 'overdue since 15 Oct'. */
export const dueText = (iso, overdue) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return overdue ? `overdue · ${d}` : `due ${d}`;
};

export const ROLE_LABEL = { doctor: 'Doctor', nurse: 'Nurse', lab: 'Lab', staff: 'Front office', admin: 'Admin' };

export const clinicToday = () => new Date().toLocaleDateString('en-CA', { timeZone: CLINIC_TZ });
