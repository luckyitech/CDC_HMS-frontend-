import { ClipboardList, UserPlus, Activity, UserCheck, UserX, FileText, FileCheck, Cpu, RefreshCcw, Settings, Pill, FlaskConical, BookOpen, Stethoscope, UserCog, Pencil, Share2, LogIn, CalendarPlus, Lock, ScanLine, QrCode } from 'lucide-react';

// Shared by ActivityLog and its drilldown modal, so an event tagged "Triaged"
// looks identical whether it's a row in the main table or in the popup
// showing one staff member's triage events.

export const ACTION_STYLE = {
  registered:            { color: 'bg-blue-100 text-blue-700',     icon: UserPlus },
  added_to_queue:        { color: 'bg-yellow-100 text-yellow-800', icon: ClipboardList },
  triaged:               { color: 'bg-purple-100 text-purple-700', icon: Activity },
  discharged:            { color: 'bg-green-100 text-green-700',   icon: UserCheck },
  removed:               { color: 'bg-red-100 text-red-700',       icon: UserX },
  referred:              { color: 'bg-fuchsia-100 text-fuchsia-700', icon: Share2 },
  document_uploaded:     { color: 'bg-indigo-100 text-indigo-700', icon: FileText },
  document_reviewed:     { color: 'bg-green-100 text-green-700',   icon: FileCheck },
  equipment_added:       { color: 'bg-teal-100 text-teal-700',     icon: Cpu },
  equipment_updated:     { color: 'bg-orange-100 text-orange-700', icon: Settings },
  equipment_replaced:    { color: 'bg-slate-100 text-slate-700',   icon: RefreshCcw },
  prescription_created:  { color: 'bg-pink-100 text-pink-700',     icon: Pill },
  lab_test_ordered:      { color: 'bg-cyan-100 text-cyan-700',     icon: FlaskConical },
  lab_test_cancelled:    { color: 'bg-red-100 text-red-700',       icon: FlaskConical },
  treatment_plan_created:{ color: 'bg-emerald-100 text-emerald-700',icon: BookOpen },
  consultation_note:         { color: 'bg-violet-100 text-violet-700', icon: Stethoscope },
  consultation_note_edited:  { color: 'bg-orange-100 text-orange-700', icon: Pencil },
  consultation_started:      { color: 'bg-blue-100 text-blue-700',     icon: Activity },
  consultation_completed:{ color: 'bg-green-100 text-green-700',   icon: UserCheck },
  physical_exam:         { color: 'bg-rose-100 text-rose-700',     icon: Activity },
  initial_assessment:    { color: 'bg-amber-100 text-amber-700',   icon: ClipboardList },
  account_created:       { color: 'bg-purple-100 text-purple-700', icon: UserCog },
  user_login:            { color: 'bg-lime-100 text-lime-700',     icon: LogIn },
  appointment_booked:    { color: 'bg-sky-100 text-sky-700',       icon: CalendarPlus },
  appointment_cancelled: { color: 'bg-orange-100 text-orange-700', icon: UserX },
  slot_blocked:          { color: 'bg-red-100 text-red-700',       icon: Lock },
  barcode_scanned:       { color: 'bg-blue-100 text-blue-700',     icon: ScanLine },
  barcode_generated:     { color: 'bg-teal-100 text-teal-700',     icon: QrCode },
};

export const formatDateTime = (iso) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};
