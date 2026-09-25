import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Layers, Plus, Archive, RotateCcw, Pencil } from 'lucide-react';
import Card from '../../shared/Card';
import Button from '../../shared/Button';
import Spinner from '../../shared/Spinner';
import ConfirmActionModal from '../../shared/ConfirmActionModal';
import PresetEditorModal from '../onboarding/PresetEditorModal';
import permissionPresetService from '../../../services/permissionPresetService';
import staffService from '../../../services/staffService';
import { CADRES } from '../onboarding/cadreFields';
import { STAFF_TYPE_LABELS, canGrantPermissions } from '../../../utils/permissions';

// System settings → Permission presets.
//
// The list of job shapes the onboarding wizard offers. Anyone who can view
// users may read it; creating, editing, archiving and restoring go through the
// server's permissions-administrator gate, and the controls follow the same
// helper (canGrantPermissions) so nothing is offered that would be refused.
//
// Editing a preset changes FUTURE hires only — a template, not a link — and
// the screen says so, because "I changed the preset and nobody's access
// changed" is the one surprise this design has.

const cadreLabel = (role) => CADRES.find((c) => c.role === role)?.label || role;

const PermissionPresetsTab = ({ currentUser }) => {
  const canEdit = canGrantPermissions(currentUser);
  const [rows, setRows] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);       // null | {} (new) | preset
  const [confirmation, setConfirmation] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        permissionPresetService.list({ includeArchived: true }),
        staffService.getPermissionCatalog(),
      ]);
      setRows(p.data || []);
      setCatalog(c.data || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load permission presets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = (label, fn) => async (preset) => {
    try {
      await fn(preset.id);
      toast.success(`${preset.name} ${label}`);
      load();
    } catch (err) {
      toast.error(err.message || `Failed to ${label}`);
    }
  };
  const archive = act('archived', permissionPresetService.archive);
  const restore = act('restored', permissionPresetService.restore);

  const visible = rows.filter((r) => showArchived || r.status === 'active');
  const capCount = (r) => r.permissions.length + r.deniedPermissions.length;

  return (
    <Card>
      <div className="flex items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-gray-700 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Permission presets</h3>
            <p className="text-sm text-gray-500">
              Named bundles of access the onboarding wizard applies to new hires. Editing one changes future hires only.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setEditing({})} className="flex-shrink-0">
            <Plus className="w-4 h-4 inline mr-1" />New preset
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between py-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
        {!canEdit && <span className="text-xs text-gray-400">Only a permissions administrator can change presets</span>}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center"><Spinner /></div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">
          No presets yet. {canEdit ? 'Create one and the wizard will offer it for every hire of that cadre.' : ''}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {visible.map((r) => (
            <li key={r.id} className={`py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${r.status === 'archived' ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800">
                  {r.name}
                  {r.status === 'archived' && <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">archived</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {cadreLabel(r.baseRole)} · {STAFF_TYPE_LABELS[r.staffType] || r.staffType} · {capCount(r)} {capCount(r) === 1 ? 'setting' : 'settings'}
                  {r.position ? ` · ${r.position}` : ''}
                  {r.description ? ` — ${r.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                <span>{r.appliedCount === 0 ? 'never applied' : `applied ${r.appliedCount} ${r.appliedCount === 1 ? 'time' : 'times'}`}</span>
                {canEdit && r.status === 'active' && (
                  <>
                    <button type="button" className="text-primary hover:underline flex items-center gap-1" onClick={() => setEditing(r)}>
                      <Pencil className="w-3.5 h-3.5" />Edit
                    </button>
                    <button
                      type="button"
                      className="text-gray-600 hover:underline flex items-center gap-1"
                      onClick={() => setConfirmation({
                        title: `Archive "${r.name}"?`,
                        message: 'It will no longer be offered by the onboarding wizard. Nobody already created from it is affected, and it can be restored later.',
                        confirmLabel: 'Archive',
                        onConfirm: () => archive(r),
                      })}
                    >
                      <Archive className="w-3.5 h-3.5" />Archive
                    </button>
                  </>
                )}
                {canEdit && r.status === 'archived' && (
                  <button type="button" className="text-primary hover:underline flex items-center gap-1" onClick={() => restore(r)}>
                    <RotateCcw className="w-3.5 h-3.5" />Restore
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <PresetEditorModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        catalog={catalog}
        preset={editing?.id ? editing : null}
        onSaved={load}
      />
      <ConfirmActionModal
        isOpen={!!confirmation}
        onClose={() => setConfirmation(null)}
        onConfirm={() => { confirmation?.onConfirm(); setConfirmation(null); }}
        title={confirmation?.title}
        message={confirmation?.message}
        confirmLabel={confirmation?.confirmLabel}
      />
    </Card>
  );
};

export default PermissionPresetsTab;
