import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../shared/Modal';
import Button from '../../shared/Button';
import Input from '../../shared/Input';
import PermissionPicker from './PermissionPicker';
import permissionPresetService from '../../../services/permissionPresetService';
import { STAFF_TYPES, STAFF_TYPE_LABELS } from '../../../utils/permissions';
import { CADRES } from './cadreFields';

/**
 * Create or edit one permission preset.
 *
 * Used from Settings → Permission presets and from the wizard's
 * "Create new preset…" option. `catalog` is the server catalog (groups,
 * roleDefaults, adminAccessCovers, presetExcluded); the three excluded
 * capabilities are hidden here outright — they are never part of a template.
 *
 * Saving is refused server-side for anyone who is not a permissions
 * administrator; the callers only open this for someone who is.
 */
const EMPTY = {
  name: '', description: '', baseRole: 'staff', staffType: STAFF_TYPES.CLINICAL,
  position: '', department: '', permissions: [], deniedPermissions: [],
};

const PresetEditorModal = ({ isOpen, onClose, catalog, preset, defaultRole, onSaved }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(preset
      ? { ...EMPTY, ...preset }
      : { ...EMPTY, baseRole: defaultRole || 'staff' });
  }, [isOpen, preset, defaultRole]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const defaults = useMemo(
    () => catalog?.roleDefaults?.[form.baseRole]?.[form.staffType] || [],
    [catalog, form.baseRole, form.staffType],
  );

  const save = async () => {
    if (!form.name.trim()) return toast.error('Give the preset a name');
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(), description: form.description || null,
        baseRole: form.baseRole, staffType: form.staffType,
        position: form.position || null, department: form.department || null,
        permissions: form.permissions, deniedPermissions: form.deniedPermissions,
      };
      const res = preset?.id
        ? await permissionPresetService.update(preset.id, body)
        : await permissionPresetService.create(body);
      toast.success(preset?.id ? 'Preset updated — future hires only' : 'Preset created');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save the preset');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={preset?.id ? `Edit preset — ${preset.name}` : 'New permission preset'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Preset name *" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nurse — clinic floor" />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">For which cadre *</label>
            <select className={inp} value={form.baseRole} onChange={(e) => set('baseRole', e.target.value)} disabled={!!preset?.id}>
              {CADRES.map((c) => <option key={c.role} value={c.role}>{c.label}</option>)}
            </select>
            {preset?.id && <p className="text-xs text-gray-500 mt-1">The cadre cannot change after creation — make a new preset instead.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Staff type</label>
            <select className={inp} value={form.staffType} onChange={(e) => set('staffType', e.target.value)}>
              {Object.values(STAFF_TYPES).map((t) => <option key={t} value={t}>{STAFF_TYPE_LABELS[t] || t}</option>)}
            </select>
          </div>
          <Input label="Default job title" value={form.position || ''} onChange={(e) => set('position', e.target.value)} placeholder="Pre-fills step 2" />
          <Input label="Default department" value={form.department || ''} onChange={(e) => set('department', e.target.value)} />
          <Input label="Description" value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="What this preset is for" />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Access</p>
          <p className="text-xs text-gray-500 mb-2">
            Ticked = allowed for anyone created from this preset. Administrator access, the right to grant
            permissions, and confidential staff documents are never part of a preset — they are set per person.
          </p>
          <PermissionPicker
            groups={catalog?.groups || []}
            defaults={defaults}
            adminAccessCovers={catalog?.adminAccessCovers || []}
            granted={form.permissions}
            denied={form.deniedPermissions}
            hideCaps={catalog?.presetExcluded || []}
            onChange={({ granted, denied }) => setForm((p) => ({ ...p, permissions: granted, deniedPermissions: denied }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : (preset?.id ? 'Save preset' : 'Create preset')}</Button>
        </div>
      </div>
    </Modal>
  );
};

export default PresetEditorModal;
