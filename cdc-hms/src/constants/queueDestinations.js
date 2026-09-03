/**
 * Queue destinations — SINGLE SOURCE OF TRUTH.
 *
 * A visit's `destination` says which portal/dashboard owns it. Defined once here
 * so the Add-to-Queue modal, Queue Management, every dashboard and Visit History
 * all label, colour and icon it identically. Tones are keys from utils/statusStyles
 * (TONES), so <StatusBadge tone={DESTINATION_META[d].tone}> just works.
 *
 * Backend mirror: models/Queue.js `destination` ENUM + 20260901000002 migration.
 * Keep the two lists in step.
 */
import { Stethoscope, Scan, BedDouble, Pill } from 'lucide-react';

// Order is display order (filter pills, dropdown).
export const DESTINATIONS = ['Outpatient', 'Radiology', 'Inpatient', 'Pharmacy'];

export const DESTINATION_META = {
  Outpatient: { label: 'Outpatient clinic visit', short: 'Outpatient', tone: 'blue',    Icon: Stethoscope },
  Radiology:  { label: 'Radiology',               short: 'Radiology',  tone: 'cyan',    Icon: Scan },
  Inpatient:  { label: 'Inpatient admission',     short: 'Inpatient',  tone: 'purple',  Icon: BedDouble },
  Pharmacy:   { label: 'Pharmacy',                short: 'Pharmacy',   tone: 'emerald', Icon: Pill },
};

// Radiology sub-services — drive the `service` field and the radiology line-up.
export const RADIOLOGY_SERVICES = [
  { value: 'Neuropathy', label: 'Neuropathy screen' },
  { value: 'Ultrasound', label: 'Ultrasound' },
];

// Service badge tones (radiology sub-type). Falls back to neutral.
export const SERVICE_META = {
  Neuropathy: { label: 'Neuropathy', tone: 'teal' },
  Ultrasound: { label: 'Ultrasound', tone: 'cyan' },
};

