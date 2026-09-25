import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';

/**
 * A controlled permission checklist for a person who does not exist yet —
 * the onboarding wizard's step 3 and the preset editor.
 *
 * Renders the same server-served catalog the Staff File's Access tab draws
 * (so a capability added on the backend appears here with no frontend
 * change), and stores ticks by the same four-case rule that tab uses:
 *
 *   ticked   + would have it by default -> store nothing
 *   ticked   + would NOT have it        -> store a grant
 *   unticked + would have it by default -> store a withdrawal
 *   unticked + would NOT have it        -> store nothing
 *
 * `defaults` is what this role + staff type holds with nothing ticked (the
 * catalog's roleDefaults); `adminAccessCovers` is what full administrator
 * access carries. A write cannot outlive the access it acts within, mirroring
 * the server's sanitizers, so the screen never shows a state the server would
 * quietly rewrite.
 *
 * Deliberately not a refactor of AccessTab.jsx — that component is bound to a
 * saved record (the server resolves effective/default for it) and is live in
 * production. Folding the two together is a separate, deliberate change.
 *
 * Props
 *   groups, defaults, adminAccessCovers     — from GET /staff/permissions/catalog
 *   granted, denied                         — the stored lists being edited
 *   adminAccess                             — is the "also an administrator" toggle on
 *   origin                                  — { [cap]: 'preset' | 'person' } for the pills
 *   hideCaps                                — capabilities not to render (e.g. the admin toggle lives elsewhere)
 *   lockedCaps                              — { [cap]: 'reason' } rendered but not changeable
 *   locked                                  — whole picker read-only
 *   onChange({ granted, denied })
 */
const PermissionPicker = ({
  groups = [], defaults = [], adminAccessCovers = [],
  granted = [], denied = [], adminAccess = false,
  origin = {}, hideCaps = [], lockedCaps = {}, locked = false,
  onChange,
}) => {
  const [closed, setClosed] = useState({});
  const toggleGroup = (key) => setClosed((p) => ({ ...p, [key]: !p[key] }));

  const effective = useMemo(() => {
    const on = new Set([...defaults, ...granted]);
    if (adminAccess) adminAccessCovers.forEach((c) => on.add(c));
    denied.forEach((c) => on.delete(c));
    return on;
  }, [defaults, granted, denied, adminAccess, adminAccessCovers]);

  const viaAdmin = (cap) => adminAccess && adminAccessCovers.includes(cap) && !denied.includes(cap)
    && !granted.includes(cap) && !defaults.includes(cap);

  const change = (area, cap, ticked) => {
    const nextGranted = new Set(granted);
    const nextDenied  = new Set(denied);
    const set = (c, on) => {
      const normallyHas = defaults.includes(c);
      nextGranted.delete(c);
      nextDenied.delete(c);
      if (on && !normallyHas) nextGranted.add(c);
      if (!on && normallyHas) nextDenied.add(c);
    };
    set(cap, ticked);
    if (area.write && area.access) {
      if (cap === area.access && !ticked) set(area.write, false);
      if (cap === area.write && ticked) set(area.access, true);
    }
    onChange({ granted: [...nextGranted], denied: [...nextDenied] });
  };

  const pill = (cap) => {
    if (viaAdmin(cap)) return { text: 'via administrator access', cls: 'bg-purple-50 text-purple-800' };
    if (lockedCaps[cap]) return { text: 'per person only', cls: 'bg-amber-50 text-amber-800' };
    if (origin[cap] === 'preset') return { text: 'from preset', cls: 'bg-green-50 text-green-800' };
    if (origin[cap] === 'person') {
      return denied.includes(cap)
        ? { text: 'withdrawn for this person', cls: 'bg-blue-50 text-blue-800' }
        : { text: 'added for this person', cls: 'bg-blue-50 text-blue-800' };
    }
    return null;
  };

  const toggles = (area) => [
    area.access && { cap: area.access, label: area.accessLabel || 'Can open' },
    area.write  && { cap: area.write,  label: area.writeLabel  || 'Can edit' },
  ].filter(Boolean).filter((t) => !hideCaps.includes(t.cap));

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const areas = group.areas.filter((a) => toggles(a).length > 0);
        if (!areas.length) return null;
        const onCount = areas.flatMap(toggles).filter((t) => effective.has(t.cap)).length;
        const total = areas.flatMap(toggles).length;
        const isClosed = !!closed[group.key];
        return (
          <div key={group.key} className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left"
            >
              <span className="flex items-center gap-2">
                {isClosed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                <span className="font-semibold text-gray-800 text-sm">{group.name}</span>
              </span>
              <span className="text-xs text-gray-500">{onCount} of {total} allowed</span>
            </button>
            {!isClosed && (
              <div className="border-t border-gray-100 px-4 pb-2">
                {areas.map((area) => (
                  <div key={area.key} className="py-2 border-b border-gray-100 last:border-b-0">
                    <p className="text-sm font-medium text-gray-800">{area.name}</p>
                    {area.description && <p className="text-xs text-gray-500 mt-0.5">{area.description}</p>}
                    <div className="mt-1.5 space-y-1">
                      {toggles(area).map(({ cap, label }) => {
                        const p = pill(cap);
                        const disabled = locked || !!lockedCaps[cap] || viaAdmin(cap);
                        return (
                          <label key={cap} className={`flex items-center justify-between gap-3 text-sm ${disabled ? 'opacity-70' : ''}`}>
                            <span className="flex items-center gap-2 text-gray-700">
                              {lockedCaps[cap] ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : null}
                              {label}
                            </span>
                            <span className="flex items-center gap-2 flex-shrink-0">
                              {p && <span className={`text-[11px] px-2 py-0.5 rounded-full ${p.cls}`}>{p.text}</span>}
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-primary"
                                checked={effective.has(cap)}
                                disabled={disabled}
                                onChange={(e) => change(area, cap, e.target.checked)}
                                aria-label={`${area.name}: ${label}`}
                              />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {area.warning && effective.has(area.access || area.write) && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1.5">{area.warning}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PermissionPicker;
