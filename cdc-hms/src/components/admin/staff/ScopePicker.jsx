import { useState } from 'react';

/**
 * Department scope on one HR control (HR Tier 3 Phase 1, mockup B of
 * hr-tier3-phase0-permissions-mockup). "For whom?" — All staff, their own
 * department (follows them if they move), or named departments.
 *
 * `limit` is how far the VIEWER's own scope reaches (a department-limited HR
 * grantor, decision L-8): null = no limit; otherwise { all, departmentIds }.
 * Nothing wider than that is offered. The API checks the same rule.
 */


// Module scope (a component defined inside render remounts every render).
const Radio = ({ value, kind, setKind, disabled, children, sub }) => (
  <label className={`flex items-start gap-2 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <input type="radio" name="scope-kind" className="mt-1" checked={kind === value} disabled={disabled} onChange={() => setKind(value)} />
    <span>{children}{sub && <span className="block text-[11px] text-gray-400">{sub}</span>}</span>
  </label>
);

const ScopePicker = ({ capabilityLabel, personName, spec, departments, ownDepartmentId, limit, onSave, onCancel, saving }) => {
  const [kind, setKind] = useState(spec?.kind || 'all');
  const [ids, setIds] = useState(spec?.kind === 'departments' ? spec.departmentIds : []);

  const limited = !!limit && !limit.all;
  const allowedIds = limited ? new Set(limit.departmentIds) : null;
  const canAll = !limited;
  const canOwn = !limited || (ownDepartmentId && allowedIds.has(ownDepartmentId));
  const choosable = departments.filter((d) => (d.status === 'active' || ids.includes(d.id)) && (!limited || allowedIds.has(d.id)));

  const toggle = (id) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const valid = kind !== 'departments' || ids.length > 0;
  const save = () => onSave(kind === 'departments' ? { kind, departmentIds: [...ids].sort((a, b) => a - b) } : { kind });

  return (
    <div className="mt-2 rounded-lg border border-blue-300 bg-white p-3 shadow-sm space-y-2" role="group" aria-label={`${capabilityLabel}: for whom?`}>
      <p className="text-sm font-semibold text-gray-800">{capabilityLabel}: for whom?</p>
      <Radio value="all" kind={kind} setKind={setKind} disabled={!canAll} sub={!canAll ? 'Wider than you hold it yourself' : null}>All staff</Radio>
      <Radio value="own" kind={kind} setKind={setKind} disabled={!canOwn}
        sub={ownDepartmentId ? `Follows ${personName} if they move department.` : `${personName} has no department yet — this reaches nobody until one is set.`}>
        Their own department
      </Radio>
      <Radio value="departments" kind={kind} setKind={setKind} disabled={!choosable.length}>These departments</Radio>
      {kind === 'departments' && (
        <div className="flex flex-wrap gap-1.5 pl-6">
          {choosable.map((d) => (
            <button key={d.id} type="button" aria-pressed={ids.includes(d.id)} onClick={() => toggle(d.id)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${ids.includes(d.id) ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-300 text-gray-600'}`}>
              {d.name}
            </button>
          ))}
          {!choosable.length && <span className="text-xs text-gray-400">No departments on the list yet.</span>}
        </div>
      )}
      <p className="text-[11px] text-gray-400">
        Lists and actions follow this. People outside it are simply not shown; anyone with no department is seen only with “All staff”.
      </p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700">Cancel</button>
        <button type="button" onClick={save} disabled={!valid || saving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 disabled:opacity-60">Save</button>
      </div>
    </div>
  );
};

export default ScopePicker;
