import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, ShieldCheck, Briefcase, UserRound } from 'lucide-react';
import Card from '../../shared/Card';
import CardTitle from '../../shared/CardTitle';
import Button from '../../shared/Button';
import Input from '../../shared/Input';
import Toggle from '../../shared/Toggle';
import PersonalInfoSection from '../../shared/formSections/PersonalInfoSection';
import ContactInfoSection from '../../shared/formSections/ContactInfoSection';
import AccountSettingsSection from '../../shared/formSections/AccountSettingsSection';
import PermissionPicker from './PermissionPicker';
import PresetEditorModal from './PresetEditorModal';
import { CADRES, cadreFor, identityPayload, resolveFields } from './cadreFields';
import hrService from '../../../services/hrService';
import api from '../../../services/api';
import staffService from '../../../services/staffService';
import hrSelfService from '../../../services/hrSelfService';
import permissionPresetService from '../../../services/permissionPresetService';
import {
  PERMISSIONS, STAFF_TYPES, STAFF_TYPE_LABELS, canGrantPermissions, canGrantHrPermissions, canUseCapability, canRunAppraisals,
} from '../../../utils/permissions';

// =====================================================================
// Staff onboarding wizard — Identity → Role and position → Access.
//
// Design + decisions of record: claude/onboarding-wizard-build-spec.md.
//
// Steps 1–2 reuse the legacy forms' sections and field lists (cadreFields.js)
// and post to the same four endpoints those forms used. Step 3 is new: a
// permission PRESET pre-fills the staff type and the checklist; the person's
// stored lists are then sent with the create request, and the server decides
// whether this caller may set them (a preset applied unchanged needs only
// users.write; any edit needs permissions.grant). The controls here mirror
// that rule so nothing is offered that would be refused.
// =====================================================================

const STEPS = [
  { key: 'identity', label: 'Identity',          Icon: UserRound },
  { key: 'role',     label: 'Role and position', Icon: Briefcase },
  { key: 'access',   label: 'Access',            Icon: ShieldCheck },
];

const NO_PRESET = '';      // "start from role defaults"
const NEW_PRESET = '__new';

const EMPTY = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', gender: '', idNumber: '',
  address: '', city: '', emergencyContact: '', emergencyRelationship: '', emergencyPhone: '',
  temporaryPassword: '',
  role: '', position: '', department: '', positionId: '', departmentId: '', shift: '', employmentType: '', startDate: '',
  reportsToId: '',
};

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

const genPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let out = '';
  for (let i = 0; i < 12; i += 1) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
};

const inp = 'w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary';

const StaffWizard = ({ currentUser, backPath = '/admin/dashboard', onCreated }) => {
  const navigate = useNavigate();
  const canGrant = canGrantPermissions(currentUser);
  // HR Tier 3 Phase 3 (O-1): a "Grant HR permissions" holder may tick, while
  // onboarding, the HR Suite controls they hold themselves — nothing else
  // (the server applies the same rule as the Permissions tab).
  const hrMode = !canGrant && canGrantHrPermissions(currentUser);

  const [step, setStep] = useState(0);
  const [d, setD] = useState(EMPTY);
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  // Step 3 state
  const [catalog, setCatalog] = useState(null);
  const [presets, setPresets] = useState([]);
  const [presetId, setPresetId] = useState(NO_PRESET);
  const [staffType, setStaffType] = useState(STAFF_TYPES.CLINICAL);
  const [granted, setGranted] = useState([]);
  const [denied, setDenied] = useState([]);
  const [adminAccess, setAdminAccess] = useState(false);
  const [saveBack, setSaveBack] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cadre = cadreFor(d.role);
  // HR Tier 3 Phase 1: department / position come from the clinic's lists.
  const [lists, setLists] = useState(null);
  useEffect(() => {
    hrService.lists().then((res) => setLists(res?.data || null)).catch(() => setLists(null));
  }, []);
  // Reports to (5 Oct 2026): any active colleague, beside Department. Leave
  // pre-adds them as an approver; appraisals default the reviewer to them.
  const [colleagues, setColleagues] = useState([]);
  useEffect(() => {
    hrSelfService.approvers('', true).then((res) => setColleagues(res?.data?.people || [])).catch(() => setColleagues([]));
  }, []);
  const reportsToField = {
    key: 'reportsToId', label: 'Reports to', type: 'entry',
    // Not yourself unless you run appraisals (the server refuses it).
    options: colleagues.filter((c) => c.id !== currentUser?.id || canRunAppraisals(currentUser))
      .map((c) => ({ value: String(c.id), label: c.position ? `${c.name} — ${c.position}` : c.name })),
  };
  const baseFields = resolveFields(cadre, lists);
  const deptAt = baseFields.findIndex((f) => f.key === 'departmentId' || f.key === 'department');
  const roleFields = !cadre ? baseFields : deptAt >= 0
    ? [...baseFields.slice(0, deptAt + 1), reportsToField, ...baseFields.slice(deptAt + 1)]
    : [...baseFields, reportsToField];
  const departmentName = d.departmentId
    ? (lists?.departments || []).find((x) => String(x.id) === String(d.departmentId))?.name
    : d.department;
  const preset = presets.find((p) => String(p.id) === String(presetId)) || null;

  useEffect(() => {
    let cancelled = false;
    staffService.getPermissionCatalog()
      .then((res) => { if (!cancelled) setCatalog(res.data); })
      .catch(() => { if (!cancelled) toast.error('Failed to load the permission list'); });
    return () => { cancelled = true; };
  }, []);

  // Presets for the chosen cadre. Reloaded when the cadre changes; the
  // selection is reset because a nurse preset makes no sense on a doctor.
  useEffect(() => {
    if (!d.role) return undefined;
    let cancelled = false;
    permissionPresetService.list({ baseRole: d.role })
      .then((res) => { if (!cancelled) setPresets(res.data || []); })
      .catch(() => { if (!cancelled) toast.error('Failed to load permission presets'); });
    // A cadre change also clears anything a previous preset filled in.
    setPresetId(NO_PRESET);
    setStaffType(STAFF_TYPES.CLINICAL);
    setGranted([]);
    setDenied([]);
    setAdminAccess(false);
    setSaveBack(false);
    return () => { cancelled = true; };
  }, [d.role]);

  const applyPreset = (p) => {
    setStaffType(p ? p.staffType : STAFF_TYPES.CLINICAL);
    setGranted(p ? [...p.permissions] : []);
    setDenied(p ? [...p.deniedPermissions] : []);
    setAdminAccess(false);
    setSaveBack(false);
    if (p?.position && !d.position) set('position', p.position);
    if (p?.department && !d.department) set('department', p.department);
    // …and the matching list entries, when the clinic has them.
    const match = (list, name) => (lists?.[list] || []).find((x) => x.status === 'active' && x.name.toLowerCase() === String(name || '').trim().toLowerCase());
    if (p?.position && !d.positionId && match('positions', p.position)) set('positionId', String(match('positions', p.position).id));
    if (p?.department && !d.departmentId && match('departments', p.department)) set('departmentId', String(match('departments', p.department).id));
  };

  const choosePreset = (value) => {
    if (value === NEW_PRESET) { setEditorOpen(true); return; }
    setPresetId(value);
    applyPreset(presets.find((p) => String(p.id) === String(value)) || null);
  };

  const defaults = useMemo(
    () => catalog?.roleDefaults?.[d.role]?.[staffType] || [],
    [catalog, d.role, staffType],
  );

  // Where each stored entry came from, for the pills on the checklist.
  const origin = useMemo(() => {
    const o = {};
    const pg = preset?.permissions || [];
    const pd = preset?.deniedPermissions || [];
    granted.forEach((c) => { o[c] = pg.includes(c) ? 'preset' : 'person'; });
    denied.forEach((c) => { o[c] = pd.includes(c) ? 'preset' : 'person'; });
    return o;
  }, [preset, granted, denied]);

  // Has the person's access diverged from the preset? Mirrors the server's
  // "applied unchanged" test exactly (staff type + both lists as sets).
  const grantedNoAdmin = granted.filter((c) => c !== PERMISSIONS.ADMIN_ACCESS);
  const diverged = !preset
    ? (staffType !== STAFF_TYPES.CLINICAL || granted.length > 0 || denied.length > 0 || adminAccess)
    : (staffType !== preset.staffType
      || !sameSet(grantedNoAdmin, preset.permissions)
      || !sameSet(denied, preset.deniedPermissions)
      || adminAccess);

  const perPersonOnly = catalog?.presetExcluded || [];
  const hrGivable = (c) => (catalog?.hrDelegable || []).includes(c)
    && !(catalog?.hrNotDelegable || []).includes(c)
    && canUseCapability(currentUser, c);
  const lockedCaps = canGrant ? {} : hrMode
    ? Object.fromEntries((catalog?.permissions || []).filter((c) => !hrGivable(c))
      .map((c) => [c, 'Only HR Suite controls you hold yourself can be given here; a permissions administrator sets the rest']))
    : Object.fromEntries(perPersonOnly.map((c) => [c, 'A permissions administrator sets this per person']));

  // ---- validation per step ----
  const identityOk = d.firstName && d.lastName && d.email && d.phone;
  const roleOk = cadre && roleFields.every((f) => !f.required || d[f.key]);

  const next = () => {
    if (step === 0 && !identityOk) return toast.error('First name, last name, email and phone are required');
    if (step === 1 && !roleOk) return toast.error('Fill in every required field for this role');
    return setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const create = async () => {
    if (!identityOk || !roleOk) return toast.error('Something on an earlier step is incomplete');
    if (!canGrant && !hrMode && diverged) return toast.error('Only a permissions administrator can change access from the preset');
    setSubmitting(true);
    try {
      if (saveBack && preset && canGrant) {
        await permissionPresetService.update(preset.id, {
          staffType, permissions: grantedNoAdmin, deniedPermissions: denied,
        });
      }
      const body = {
        ...identityPayload(d),
        ...cadre.payload(d),
        ...(d.reportsToId ? { reportsToId: Number(d.reportsToId) } : {}),
        ...(presetId ? { presetId: Number(presetId) } : {}),
        staffType,
        permissions: adminAccess ? [...grantedNoAdmin, PERMISSIONS.ADMIN_ACCESS] : grantedNoAdmin,
        deniedPermissions: denied,
      };
      const res = await api.post(cadre.endpoint, body);
      if (res.success) {
        toast.success(
          `${d.firstName} ${d.lastName} — ${cadre.noun} account created (${res.data.user.employeeId || 'ID assigned'}). Login details sent to ${d.email}.${res.data.onboardingChecklist ? ' Their onboarding checklist has started.' : ''}`,
          { duration: 8000 },
        );
        onCreated?.(res.data.user);
        setD(EMPTY);
        setStep(0);
        applyPreset(null);
        setPresetId(NO_PRESET);
      }
    } catch (err) {
      const taken = err.message?.toLowerCase().includes('email already in use');
      toast.error(taken ? `"${d.email}" is already registered — use a different email.` : (err.message || 'Failed to create the account'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- render ----
  const stepper = (
    <div className="flex items-center gap-2 sm:gap-6 mb-6 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => { if (i < step) setStep(i); }}
            className={`flex items-center gap-2 text-sm whitespace-nowrap ${active ? 'text-gray-900 font-semibold' : done ? 'text-green-700' : 'text-gray-400'}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${active ? 'bg-gray-900 text-white border-gray-900' : done ? 'bg-green-100 text-green-800 border-green-200' : 'border-gray-300'}`}>
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </span>
            {s.label}
          </button>
        );
      })}
    </div>
  );

  const summary = d.firstName && (
    <span className="text-sm text-gray-500">
      <span className="font-semibold text-gray-800">{d.firstName} {d.lastName}</span>
      {cadre && ` · ${cadre.label.toLowerCase()}`}
      {departmentName && ` · ${departmentName}`}
      {d.startDate && ` · starts ${d.startDate}`}
    </span>
  );

  return (
    <div>
      {stepper}

      {step === 0 && (
        <>
          <PersonalInfoSection data={d} onChange={set} emailPlaceholder="name@cdiabetescentre.com" />
          <ContactInfoSection data={d} onChange={set} />
          <AccountSettingsSection data={d} onChange={set} onGeneratePassword={() => set('temporaryPassword', genPassword())} roleNoun="staff member" />
        </>
      )}

      {step === 1 && (
        <Card title={<CardTitle icon={Briefcase}>Role and position</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cadre *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CADRES.map((c) => (
                  <button
                    key={c.role}
                    type="button"
                    onClick={() => set('role', c.role)}
                    className={`px-3 py-2 rounded-lg border-2 text-sm text-left ${d.role === c.role ? 'border-primary bg-primary/5 font-semibold' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">The cadre decides which portal they land in. Job title and access are set separately.</p>
            </div>

            {cadre && roleFields.map((f) => (
              f.type === 'entry' ? (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor={`wiz-${f.key}`}>{f.label}{f.required ? ' *' : ''}</label>
                  <select id={`wiz-${f.key}`} className={inp} value={d[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                    <option value="">{f.required ? 'Select…' : 'Not set'}</option>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ) : f.type === 'select' ? (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{f.label}{f.required ? ' *' : ''}</label>
                  <select className={inp} value={d[f.key]} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                    <option value="">{f.required ? 'Select…' : 'Not applicable'}</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ) : (
                <Input
                  key={f.key}
                  label={`${f.label}${f.required ? ' *' : ''}`}
                  type={f.type}
                  value={d[f.key] || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              )
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title={<CardTitle icon={ShieldCheck}>Access</CardTitle>} className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Permission preset</label>
              <select className={inp} value={presetId} onChange={(e) => choosePreset(e.target.value)}>
                <option value={NO_PRESET}>— Start from role defaults —</option>
                {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                {canGrant && <option value={NEW_PRESET}>+ Create new preset…</option>}
              </select>
              {preset?.description && <p className="text-xs text-gray-500 mt-1">{preset.description}</p>}
              {!presets.length && (
                <p className="text-xs text-gray-500 mt-1">
                  No presets for this cadre yet{canGrant ? ' — create one and it will be offered for every future hire.' : '.'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Staff type</label>
              <select className={inp} value={staffType} onChange={(e) => setStaffType(e.target.value)} disabled={!canGrant}>
                {Object.values(STAFF_TYPES).map((t) => <option key={t} value={t}>{STAFF_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            {canGrant
              ? 'Nothing is ticked until you tick it — the person starts with only what their role does by itself. Pick a preset to pre-fill, or tick below; changes apply to this person only unless you save them back to the preset.'
              : hrMode
                ? 'Nothing is ticked until you tick it. Below are the HR Suite controls; you can give the ones you hold yourself. Anything else (clinical, admin, modules) is set by a permissions administrator on the staff file.'
                : 'Nothing is ticked: the person starts with only what their role does by itself. A preset is applied exactly as it is defined; only a permissions administrator can change access for an individual — later, from the staff file.'}
          </p>

          <div className="flex items-start justify-between gap-4 py-3 border-y border-gray-200 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Also an administrator</p>
              <p className="text-xs text-gray-500">
                Full administrator access to every screen. Does not include granting permissions to others or reading confidential staff documents.
              </p>
            </div>
            <Toggle checked={adminAccess} onChange={setAdminAccess} disabled={!canGrant} label="Also an administrator" />
          </div>

          {catalog ? (
            <PermissionPicker
              groups={hrMode ? catalog.groups.filter((g) => g.hr) : catalog.groups}
              defaults={defaults}
              adminAccessCovers={catalog.adminAccessCovers}
              granted={grantedNoAdmin}
              denied={denied}
              adminAccess={adminAccess}
              origin={origin}
              hideCaps={[PERMISSIONS.ADMIN_ACCESS]}
              lockedCaps={lockedCaps}
              lockedPill={hrMode ? 'not yours to give' : 'per person only'}
              locked={!canGrant && !hrMode}
              onChange={({ granted: g, denied: dn }) => { setGranted(g); setDenied(dn); }}
            />
          ) : (
            <p className="text-sm text-gray-500">Loading the permission list…</p>
          )}

          {canGrant && preset && (
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-4">
              <input type="checkbox" className="w-4 h-4" checked={saveBack} onChange={(e) => setSaveBack(e.target.checked)} disabled={!diverged || adminAccess} />
              Save these changes back to the "{preset.name}" preset for future hires
              {adminAccess && <span className="text-xs text-gray-400">(administrator access is never saved into a preset)</span>}
            </label>
          )}
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>{summary}</div>
        <div className="flex gap-2">
          {step === 0
            ? <Button variant="outline" onClick={() => navigate(backPath)}>Cancel</Button>
            : <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          {step < STEPS.length - 1
            ? <Button onClick={next}>Continue</Button>
            : <Button className="bg-green-600 hover:bg-green-700" onClick={create} disabled={submitting}>{submitting ? 'Creating…' : 'Create account'}</Button>}
        </div>
      </div>

      <PresetEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        catalog={catalog}
        defaultRole={d.role}
        onSaved={(p) => {
          setPresets((prev) => [...prev.filter((x) => x.id !== p.id), p].sort((a, b) => a.name.localeCompare(b.name)));
          setPresetId(String(p.id));
          applyPreset(p);
        }}
      />
    </div>
  );
};

export default StaffWizard;
