/**
 * Lab Inbox helpers — presentation logic shared by the inbox page, the pairing
 * form and the sidebar badge. Keep the "what does this suggestion mean" wording
 * in ONE place so the list row and the modal can never disagree.
 */

/** StatusBadge tone for a suggestion confidence tier. */
export const confidenceTone = (confidence) => ({
  high: 'success',
  medium: 'warning',
  low: 'warning',
  none: 'neutral',
}[confidence] || 'neutral');

export const confidenceLabel = (confidence) => ({
  high: 'Strong match',
  medium: 'Likely — confirm',
  low: 'Weak — confirm carefully',
  none: 'No match found',
}[confidence] || 'No match found');

/**
 * Human sentence for WHY the engine suggested (or didn't). `source` comes back
 * as "<pdf|nopdf>+email:<reason>" from the backend.
 */
export const suggestionWhy = (suggestion) => {
  if (!suggestion) return '';
  const src = suggestion.source || '';
  const noPdfText = src.startsWith('nopdf');
  const reason = src.includes(':') ? src.slice(src.indexOf(':') + 1) : 'none';
  const REASONS = {
    'uhid':            'Matched on the UHID printed in the report.',
    'idNumber':        'Matched on the national ID number in the report.',
    'phone+name':      'Matched on phone number and name.',
    'phone':           'Matched on phone number (name not confirmed).',
    'phone:shared':    'Phone is shared by more than one patient and the name did not match — check carefully.',
    'name+dob':        'Matched on name and date of birth.',
    'name':            'Name only — no phone or DOB in the report. Please confirm.',
    'name:ambiguous':  'Several patients share this name — confirm carefully.',
    'name:partial':    'Surname only — please confirm.',
    'none':            noPdfText
      ? 'Could not read any text from this PDF (scanned image or protected). Search for the patient.'
      : 'Could not find a name, phone, ID or DOB to match on. Search for the patient.',
  };
  return REASONS[reason] || 'Please confirm the patient.';
};

/** The short "hints found" line, e.g. "Jane Wanjiru · 0722… · DOB 14 Mar 1979". */
export const extractedSummary = (extracted) => {
  if (!extracted) return '';
  const bits = [];
  if (extracted.name) bits.push(extracted.name);
  if (extracted.phone) bits.push(extracted.phone);
  if (extracted.uhid) bits.push(extracted.uhid);
  if (extracted.idNumber) bits.push(`ID ${extracted.idNumber}`);
  if (extracted.dob) bits.push(`DOB ${extracted.dob}`);
  return bits.join(' · ');
};

export const patientDisplayName = (p) =>
  p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || p.uhid : '';

export const patientInitials = (p) => {
  if (!p) return '?';
  const a = (p.firstName || '').charAt(0), b = (p.lastName || '').charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
};

/** ISO datetime → YYYY-MM-DD in local time, for a <input type="date">. Falls back to today. */
export const toDateInput = (value) => {
  const d = value ? new Date(value) : new Date();
  const safe = isNaN(d.getTime()) ? new Date() : d;
  const y = safe.getFullYear(), m = String(safe.getMonth() + 1).padStart(2, '0'), day = String(safe.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * A sensible "test / report type" from the email subject: strip boilerplate
 * ("Lab results", "Ref 88213", the patient name) so the staff member usually
 * only has to accept it.
 */
export const testTypeFromSubject = (subject, stripNames = []) => {
  if (!subject) return '';
  let s = String(subject);
  // Remove the patient's name in any form we know it (extracted from the PDF,
  // or the suggested patient), both "First Last" and "Last First".
  for (const n of stripNames.filter(Boolean)) {
    const parts = String(n).replace(/,/g, ' ').split(/\s+/).filter((p) => p.length > 1);
    if (!parts.length) continue;
    const esc = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    s = s.replace(new RegExp(`\\b(?:${esc.join('|')})\\b[,\\s]*`, 'gi'), ' ');
  }
  s = s
    .replace(/\b(lab(oratory)?\s*(results?|report)|test\s*(results?|report)|results?|report)\b/gi, ' ')
    .replace(/\b(ref(erence)?|order|req(uest)?)\s*(no\.?|#|number)?\s*[:-]?\s*[A-Z0-9-]{3,}\b/gi, ' ')
    .replace(/\b[A-Z][A-Z'’-]+,\s*[A-Z][A-Z'’-]+\b/g, ' ')          // "WANJIRU, JANE"
    .replace(/\b(for|re|fw|fwd)\b\s*[:-]?/gi, ' ')
    .replace(/[—–\-:|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s/]+|[\s/]+$/g, '');
  return s.length >= 3 ? s : '';
};

/** "3 min ago" / "2 h ago" / "yesterday" from an ISO string. */
export const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};
