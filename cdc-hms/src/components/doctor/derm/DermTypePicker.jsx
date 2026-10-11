import { FINDING_TYPES } from './dermFormat';
import useDermVocabulary from './useDermVocabulary';

/**
 * DermTypePicker — the type of a finding. "Other" opens a box for its name;
 * names the clinic has typed before (most used first) are offered as their own
 * chips, so "Keloid" is typed once and picked from then on (8 Oct 2026, Emu).
 *
 * Props: type, typeOther, onChange({ type, typeOther })
 */
const chipCls = (on) => `rounded-full border px-3 py-1 text-xs font-medium ${on ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`;

const DermTypePicker = ({ type, typeOther = '', onChange, idPrefix = 'derm-type' }) => {
  const learned = useDermVocabulary().findingTypes;

  const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  const learnedOn = (name) => type === 'other' && same(typeOther, name);
  const otherOn = type === 'other' && !learned.some((l) => same(l.name, typeOther));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {FINDING_TYPES.filter((t) => t.id !== 'other').map((t) => (
          <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => onChange({ type: t.id, typeOther: '' })} className={chipCls(type === t.id)}>
            {t.label}
          </button>
        ))}
        {learned.map((l) => (
          <button key={l.name} type="button" aria-pressed={learnedOn(l.name)} onClick={() => onChange({ type: 'other', typeOther: l.name })}
            className={`${chipCls(learnedOn(l.name))} ${learnedOn(l.name) ? '' : 'border-dashed'}`} title="Used before in this clinic">
            {l.name}
          </button>
        ))}
        <button type="button" aria-pressed={otherOn} onClick={() => onChange({ type: 'other', typeOther: otherOn ? typeOther : '' })} className={chipCls(otherOn)}>
          Other…
        </button>
      </div>
      {otherOn && (
        <input
          id={`${idPrefix}-other`}
          autoFocus
          value={typeOther}
          onChange={(e) => onChange({ type: 'other', typeOther: e.target.value })}
          maxLength={60}
          placeholder="Name the type, e.g. Keloid — it will be offered next time"
          className="max-w-sm rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </div>
  );
};

export default DermTypePicker;
