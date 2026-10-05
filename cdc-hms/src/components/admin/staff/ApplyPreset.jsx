import { useState } from 'react';
import toast from 'react-hot-toast';
import { Layers, Loader } from 'lucide-react';
import staffService from '../../../services/staffService';
import permissionPresetService from '../../../services/permissionPresetService';
import Modal from '../../shared/Modal';
import { scopeLabel } from './staffFormat';
import { STAFF_TYPES, passesAdminGate } from '../../../utils/permissions';

/**
 * "Apply preset…" on the Permissions tab (5 Oct 2026).
 *
 * Applying REPLACES the person's grants, withdrawals, staff type and
 * department limits with the preset's — the same meaning as in the onboarding
 * wizard. A before/after list is shown and must be confirmed. The server
 * (PATCH …/permissions { presetId }) applies every rule an ordinary save does;
 * an HR grantor may only apply a preset whose every control is an HR control
 * they may give, which this screen checks first so it never offers a refusal.
 */
const TYPE_LABEL = { [STAFF_TYPES.CLINICAL]: 'Clinical', [STAFF_TYPES.NON_CLINICAL]: 'Non-clinical' };

const ApplyPreset = ({ staff, groups, catalog, currentUser, hrMode, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState(null);
  const [chosen, setChosen] = useState('');
  const [saving, setSaving] = useState(false);

  const areas = groups.flatMap((g) => g.areas);
  const labelOf = (cap) => {
    const a = areas.find((x) => x.access === cap || x.write === cap);
    if (!a) return cap;
    return a.write === cap && a.access !== cap ? `${a.name} — ${a.writeLabel || 'editing'}` : a.name;
  };
  const departments = catalog.departments || [];
  const scopable = catalog.scopable || [];

  const start = async () => {
    setOpen(true);
    setChosen('');
    if (presets) return;
    try {
      const res = await permissionPresetService.list({ baseRole: staff.role });
      setPresets(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load presets');
      setPresets([]);
    }
  };

  const preset = (presets || []).find((p) => String(p.id) === String(chosen)) || null;

  // ---- before / after -------------------------------------------------------
  const before = {
    granted: staff.permissions || [],
    denied: staff.deniedPermissions || [],
    staffType: staff.staffType || STAFF_TYPES.CLINICAL,
    scopes: staff.permissionScopes || {},
  };
  const after = preset ? {
    granted: preset.permissions || [],
    denied: preset.deniedPermissions || [],
    staffType: preset.staffType,
    scopes: preset.scopes || {},
  } : null;
  const minus = (a, b) => a.filter((x) => !b.includes(x));
  const diff = after ? {
    gains: minus(after.granted, before.granted),
    loses: minus(before.granted, after.granted),
    withdrawn: minus(after.denied, before.denied),
    unwithdrawn: minus(before.denied, after.denied),
    type: after.staffType !== before.staffType,
    limits: after.granted.filter((c) => scopable.includes(c)).map((c) => {
      const was = before.granted.includes(c) ? scopeLabel(before.scopes[c], departments) : null;
      const will = scopeLabel({ kind: after.scopes[c]?.kind === 'own' ? 'own' : 'all' }, departments);
      return was === will ? null : { cap: c, was, will };
    }).filter(Boolean),
  } : null;
  const nothing = diff && !diff.gains.length && !diff.loses.length && !diff.withdrawn.length
    && !diff.unwithdrawn.length && !diff.type && !diff.limits.length;

  // An HR grantor: every control in the preset must be an HR control, and what
  // it gives one they hold (mirrors utils/hrGrant.presetApplyRefusal).
  const hrBlocked = (() => {
    if (!after || !hrMode) return null;
    const isHr = (c) => (catalog.hrDelegable || []).includes(c) && !(catalog.hrNotDelegable || []).includes(c);
    const notHr = [...after.granted, ...after.denied].filter((c) => !isHr(c));
    if (notHr.length) return `This preset includes controls outside the HR Suite (${notHr.map(labelOf).join(', ')}) — only a permissions administrator can apply it.`;
    const notHeld = after.granted.filter((c) => !passesAdminGate(currentUser, c));
    if (notHeld.length) return `This preset gives controls you don't hold yourself (${notHeld.map(labelOf).join(', ')}).`;
    if (diff.type) return 'This preset changes whether they are clinical — only a permissions administrator can do that.';
    return null;
  })();

  const apply = async () => {
    setSaving(true);
    try {
      const res = await staffService.applyPreset(staff.employeeId, preset.id);
      onChanged(res.data);
      toast.success(`“${preset.name}” applied to ${staff.firstName}`);
      setOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to apply the preset');
    } finally {
      setSaving(false);
    }
  };

  const List = ({ title, caps, tone }) => (caps.length ? (
    <div>
      <p className={`text-xs font-semibold ${tone}`}>{title}</p>
      <ul className="mt-0.5 list-disc pl-5 text-xs text-gray-700">{caps.map((c) => <li key={c}>{labelOf(c)}</li>)}</ul>
    </div>
  ) : null);

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
      >
        <Layers className="w-3.5 h-3.5" /> Apply preset…
      </button>

      <Modal isOpen={open} onClose={() => !saving && setOpen(false)} title={`Apply a preset to ${staff.firstName}`}>
        <div className="space-y-3 text-sm">
          <p className="text-xs text-gray-500">
            A preset <b>replaces</b> what {staff.firstName} can do — their ticks, withdrawals, kind of staff and
            department limits — with the preset&apos;s. Check the changes below before you confirm.
          </p>
          {presets === null ? <Loader className="w-5 h-5 animate-spin text-gray-400" /> : !presets.length ? (
            <p className="text-xs text-gray-500">No presets for a {staff.role} account yet.</p>
          ) : (
            <select aria-label="Preset" value={chosen} onChange={(e) => setChosen(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Choose a preset…</option>
              {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          {preset?.description && <p className="text-xs text-gray-500">{preset.description}</p>}

          {diff && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2" data-testid="preset-diff">
              {nothing ? <p className="text-xs text-gray-600">Nothing changes — {staff.firstName} already matches this preset.</p> : (
                <>
                  {diff.type && (
                    <p className="text-xs"><span className="font-semibold text-gray-800">Kind of staff:</span> {TYPE_LABEL[before.staffType]} → {TYPE_LABEL[after.staffType]}</p>
                  )}
                  <List title="Will be given" caps={diff.gains} tone="text-green-700" />
                  <List title="Will no longer be given (ticked by hand today)" caps={diff.loses} tone="text-red-700" />
                  <List title="Will be withdrawn" caps={diff.withdrawn} tone="text-red-700" />
                  <List title="No longer withdrawn" caps={diff.unwithdrawn} tone="text-green-700" />
                  {diff.limits.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-800">For whom</p>
                      <ul className="mt-0.5 list-disc pl-5 text-xs text-gray-700">
                        {diff.limits.map((l) => <li key={l.cap}>{labelOf(l.cap)}: {l.was ? `${l.was} → ` : ''}{l.will}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {hrBlocked && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{hrBlocked}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} disabled={saving}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700">Cancel</button>
            <button type="button" onClick={apply} disabled={!preset || nothing || !!hrBlocked || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {saving && <Loader className="w-3.5 h-3.5 animate-spin" />} Replace with “{preset?.name || 'preset'}”
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ApplyPreset;
