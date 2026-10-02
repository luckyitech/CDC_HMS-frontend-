import { useState } from 'react';
import { Pencil, Check, X, Loader } from 'lucide-react';
import { formatDate, toDateInput, readPath } from './staffFormat';
import AttachLeaveDocument from '../../hr/leave/AttachLeaveDocument';

/**
 * A profile card that switches between reading and editing in place.
 *
 * Replaces sending the admin to a modal that covered the whole record: editing
 * a phone number should not put thirty unrelated fields on screen, and a modal
 * that saves everything at once means one careless field wipes another.
 *
 * Only changed fields are sent, so a section the admin opened and closed
 * without touching produces no write and no audit-log entry.
 *
 * Field config:
 *   { key, label, type, options?, suffix? }
 *
 * type 'entry' (HR Tier 3 Phase 1): a pick from a managed list — `key` is the
 * id column (departmentId), `options` are [{ value: id, label: name }], and
 * `displayKey` names the text shown when reading (department). A file whose
 * text predates the lists shows it with "not on the list yet".
 *
 * `key` may be a dotted path ('emergencyContact.name'), which lets a nested
 * JSON column be edited by the same config as a flat one. The patch is
 * assembled back into nested shape on save.
 *
 * `requestMode` (B27 phase 4, My profile — decision D11): the person may not
 * change these fields themselves. Editing becomes "Request change": the
 * changed fields and a reason go to `onRequest(changes, reason)` as change
 * requests HR decides, and `pending` ({ field: request }) shows what is
 * already waiting. Flat fields only. With `attachEmployeeId` (2 Oct 2026) the
 * person may attach a supporting copy — uploaded to their own Documents as
 * `attachCategory` — and its id goes to onRequest as the third argument.
 */
const EditableSection = ({
  title, fields, values, onSave, canEdit = true, description,
  requestMode = false, onRequest, pending = {}, attachEmployeeId = null, attachCategory = 'Other',
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({});
  const [saving, setSaving]   = useState(false);
  const [reason, setReason]   = useState('');
  const [attached, setAttached] = useState(null);   // { id, fileName } — request mode

  const startEditing = () => {
    const initial = {};
    fields.forEach((f) => {
      const raw = readPath(values, f.key);
      initial[f.key] = f.type === 'date' ? toDateInput(raw) : (raw ?? '');
    });
    setDraft(initial);
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setDraft({}); setReason(''); setAttached(null); };

  const handleSave = async () => {
    const patch = {};
    const nested = {};

    fields.forEach((f) => {
      const original = readPath(values, f.key);
      const current  = draft[f.key];

      const before = f.type === 'date' ? toDateInput(original) : (original ?? '');
      // Compared as strings: a number field returns '30' where the record holds
      // 30, and a strict comparison would report every field as changed.
      if (String(before) === String(current ?? '')) return;

      // Empty means "cleared", which has to reach the API as null rather than
      // an empty string — MySQL rejects '' on a date column.
      const value = current === '' ? null : current;

      if (f.key.includes('.')) {
        const [parent, child] = f.key.split('.');
        nested[parent] = nested[parent] || { ...(values[parent] || {}) };
        nested[parent][child] = value;
      } else {
        patch[f.key] = value;
      }
    });

    Object.assign(patch, nested);

    if (!Object.keys(patch).length) { cancel(); return; }
    if (requestMode && !reason.trim()) return;

    setSaving(true);
    try {
      if (requestMode) {
        await onRequest(Object.entries(patch).map(([field, newValue]) => ({ field, newValue })), reason.trim(), attached?.id || null);
      } else {
        await onSave(patch);
      }
      setEditing(false);
      setDraft({});
      setReason('');
      setAttached(null);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>

        {canEdit && !editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-700"
            aria-label={`Edit ${title}`}
          >
            <Pencil className="w-3.5 h-3.5" /> {requestMode ? 'Request change' : 'Edit'}
          </button>
        )}

        {editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={saving || (requestMode && !reason.trim())}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {requestMode ? 'Send to HR' : 'Save'}
            </button>
            <button
              onClick={cancel}
              disabled={saving}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-60"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <dl className="space-y-2">
        {fields.map((field) => {
          const raw = readPath(values, field.key);

          if (!editing) {
            const shown = field.type === 'entry' ? readPath(values, field.displayKey) : raw;
            const display = field.type === 'date'
              ? formatDate(raw)
              : (shown === 0 ? '0' : shown) || '—';
            const unlinked = field.type === 'entry' && !raw && shown;
            const waiting = pending[field.key];
            return (
              <div key={field.key} className="flex items-start justify-between gap-4 text-sm">
                <dt className="text-gray-500 flex-shrink-0">{field.label}</dt>
                <dd className="text-gray-800 text-right break-words">
                  {display}{raw && field.suffix ? ` ${field.suffix}` : ''}
                  {unlinked && <span className="block text-[11px] text-amber-700">not on the list yet</span>}
                  {waiting && (
                    <span className="block mt-0.5 text-[11px] font-semibold text-amber-700" title={waiting.reason || undefined}>
                      Change pending: {field.type === 'date' ? formatDate(waiting.newValue) : (waiting.newValue ?? 'clear')}
                    </span>
                  )}
                </dd>
              </div>
            );
          }

          return (
            <div key={field.key} className="text-sm">
              <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
              {field.type === 'entry' ? (
                <select
                  aria-label={field.label}
                  value={draft[field.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">{readPath(values, field.displayKey) && !readPath(values, field.key) ? `“${readPath(values, field.displayKey)}” — choose from the list` : '— Select —'}</option>
                  {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : field.type === 'select' ? (
                <select
                  value={draft[field.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">— Select —</option>
                  {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={draft[field.key] ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  className={inputClass}
                />
              )}
            </div>
          );
        })}
      </dl>

      {editing && requestMode && (
        <div className="mt-3 text-sm">
          <label className="block text-xs text-gray-500 mb-1" htmlFor={`reason-${title}`}>Why does this need to change?</label>
          <textarea
            id={`reason-${title}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. new ID card after marriage"
            className={inputClass}
          />
          {attachEmployeeId ? (
            <div className="mt-2">
              <AttachLeaveDocument employeeId={attachEmployeeId} value={attached} onChange={setAttached}
                category={attachCategory} notes="Attached to a profile change request" label="Attach a copy (optional)" />
              <p className="text-[11px] text-gray-400 mt-1">HR checks this before your record changes. The copy is saved to your Documents.</p>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1">HR checks this before your record changes. You can attach a copy of the document on the Documents tab.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableSection;
