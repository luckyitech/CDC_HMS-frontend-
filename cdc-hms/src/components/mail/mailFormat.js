// Small shared helpers for the mail components (Staff Email, B26).

/** "14:20" today, "Thu" this week, "24 Sep" this year, else "24 Sep 2025". */
export const shortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const days = (now - d) / 86400000;
  if (days >= 0 && days < 6) return d.toLocaleDateString([], { weekday: 'short' });
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

export const longDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString([], {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/** "Lancet Kenya" or the address when there is no name. */
export const personName = (a) => (a ? (a.name || a.address || '') : '');

export const formatBytes = (n) => {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

/** A thrown API error → the backend's `code`, when there is one. */
export const errorCode = (err) => err?.data?.code || null;

const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Signature as typed in settings (plain text) → the HTML stored and inserted. */
export const signatureTextToHtml = (text) => escapeHtml(String(text || '').trim()).replace(/\r?\n/g, '<br>');

/** Stored signature HTML → plain text for the settings box. */
export const signatureHtmlToText = (html) => {
  // DOMParser builds an inert document — nothing in it loads or runs.
  const doc = new DOMParser().parseFromString(String(html || '').replace(/<br\s*\/?>/gi, '\n'), 'text/html');
  return doc.body.textContent || '';
};

/** "Dr A <a@b.org>" for a chip title; the name alone for its label. */
export const recipientLabel = (r) => (r ? (r.name || r.address) : '');

/** Is this address outside every clinic domain? Drives the External tag in the composer. */
export const isExternalAddress = (address, domains) => {
  const d = String(address || '').toLowerCase().split('@')[1] || '';
  return !(domains || []).map((x) => String(x).toLowerCase()).includes(d);
};
