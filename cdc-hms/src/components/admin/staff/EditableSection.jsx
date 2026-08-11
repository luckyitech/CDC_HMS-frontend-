import { useState } from 'react';
import { Pencil, Check, X, Loader } from 'lucide-react';
import { formatDate, toDateInput, readPath } from './staffFormat';

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
 * `key` may be a dotted path ('emergencyContact.name'), which lets a nested
 * JSON column be edited by the same config as a flat one. The patch is
 * assembled back into nested shape on save.
 */
const EditableSection = ({ title, fields, values, onSave, canEdit = true, description }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({});
  const [saving, setSaving]   = useState(false);

  const startEditing = () => {
    const initial = {};
    fields.forEach((f) => {
      const raw = readPath(values, f.key);
      initial[f.key] = f.type === 'date' ? toDateInput(raw) : (raw ?? '');
    });
    setDraft(initial);
    setEditing(true);
  };

  const cancel = () => { setEditing(false); setDraft({}); };

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

    setSaving(true);
    try {
      await onSave(patch);
      setEditing(false);
      setDraft({});
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
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}

        {editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
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
            const display = field.type === 'date'
              ? formatDate(raw)
              : (raw === 0 ? '0' : raw) || '—';
            return (
              <div key={field.key} className="flex items-start justify-between gap-4 text-sm">
                <dt className="text-gray-500 flex-shrink-0">{field.label}</dt>
                <dd className="text-gray-800 text-right break-words">
                  {display}{raw && field.suffix ? ` ${field.suffix}` : ''}
                </dd>
              </div>
            );
          }

          return (
            <div key={field.key} className="text-sm">
              <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
              {field.type === 'select' ? (
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
    </div>
  );
};

export default EditableSection;
