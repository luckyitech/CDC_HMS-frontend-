import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { STATUS_TODAY, MEASURED_BY, sizeChange, fmtDay, sizeText } from './dermFormat';
import { LOOK_SECTIONS, hasValue, sectionSummary } from './dermExam';
import DermChoiceField from './DermChoiceField';
import useDermVocabulary from './useDermVocabulary';

/**
 * DermLookForm — one day's look at a finding (controlled; the parent saves).
 *
 * Laid out under Emu's headings (9 Oct 2026): Primary lesion(s) · Morphology ·
 * Secondary changes · Quantification · Dermoscopy (if performed). Each section folds and shows a one-line summary when closed.
 * Location is the finding's body areas (chosen on the map — never retyped).
 * Every choice offers "Other…"; words typed before are offered again.
 * Blank = not recorded; "None" is a recorded answer. Only Status today is
 * required. Diagnoses go in the consultation's diagnosis list and review is
 * the follow-up appointment (8 Oct 2026).
 *
 * Props:
 *   value, onChange(next)   the form state (dermFormat.blankLook shape)
 *   location                the finding's areas, as labels (read-only here)
 *   previous                the latest EARLIER look with a size, for the
 *                           change line (typed numbers only — never a photo)
 *   statuses                which statuses to offer
 *   onStable                optional — "Stable" also copies last visit's look
 *   disabled, idPrefix
 */
const Chip = ({ on, onClick, children, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    aria-pressed={on}
    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${on ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
  >
    {children}
  </button>
);

const Field = ({ label, children, hint, htmlFor }) => (
  <div className="flex min-w-0 flex-col gap-1">
    {htmlFor ? <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-500">{label}</label> : <span className="text-xs font-semibold text-gray-500">{label}</span>}
    {children}
    {hint && <span className="text-[11px] text-gray-500">{hint}</span>}
  </div>
);

const inputCls = 'rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-50';
const numCls = `${inputCls} w-20 text-right tabular-nums`;

const SECTION = Object.fromEntries(LOOK_SECTIONS.map((s) => [s.id, s]));
const F = Object.fromEntries(LOOK_SECTIONS.flatMap((s) => s.fields).map((f) => [f.key, f]));

const Section = ({ id, title, summary, open, onToggle, children, idPrefix }) => (
  <section className="ui-surface">
    <h5 className="m-0">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${idPrefix}-sec-${id}`}
        className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left">
        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}{title}
        </span>
        <span className="min-w-0 truncate text-right text-xs text-gray-500">{summary}</span>
      </button>
    </h5>
    {open && <div id={`${idPrefix}-sec-${id}`} className="flex flex-col gap-3 border-t border-dashed border-gray-200 px-3 pb-3 pt-3">{children}</div>}
  </section>
);

const sectionHasData = (section, v) => (section.switch ? !!v[section.switch] : section.fields.some((f) => hasValue(v[f.key])));

const DermLookForm = ({ value, onChange, location = [], previous, statuses = STATUS_TODAY, onStable, disabled = false, idPrefix = 'look' }) => {
  const { terms } = useDermVocabulary();
  const [open, setOpen] = useState(() => {
    const o = { primary: true, morphology: true };
    for (const s of LOOK_SECTIONS) if (sectionHasData(s, value)) o[s.id] = true;
    return o;
  });
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const set = (patch) => onChange({ ...value, ...patch });
  const change = sizeChange(previous, value);

  const choice = (key, extra = {}) => (
    <DermChoiceField key={key} field={F[key]} value={value[key]} onChange={(v) => set({ [key]: v })}
      learned={terms[key] || []} disabled={disabled} idPrefix={idPrefix} {...extra} />
  );

  const morphSummary = [sectionSummary(SECTION.morphology, value), sizeText(value)].filter((x) => x && x !== 'Nothing recorded').join(' · ') || 'Nothing recorded';
  const primarySummary = [location.join(', '), sectionSummary(SECTION.primary, value)].filter((x) => x && x !== 'Nothing recorded').join(' · ') || 'Nothing recorded';

  return (
    <div className="flex flex-col gap-3">
      <Field label="Status today">
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <Chip
              key={s.id}
              disabled={disabled}
              on={value.statusToday === s.id}
              onClick={() => (s.id === 'stable' && onStable ? onStable() : set({ statusToday: s.id }))}
            >
              {s.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Section id="primary" idPrefix={idPrefix} title="Primary lesion(s)" summary={primarySummary} open={!!open.primary} onToggle={() => toggle('primary')}>
        <Field label="Location">
          {location.length ? (
            <div className="flex flex-wrap gap-1.5">
              {location.map((l) => <span key={l} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-primary">{l}</span>)}
            </div>
          ) : <span className="text-xs text-gray-500">Choose the areas on the body map.</span>}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {choice('distribution')}
          {choice('symmetry')}
        </div>
        {choice('pattern')}
        {choice('configuration')}
      </Section>

      <Section id="morphology" idPrefix={idPrefix} title="Morphology" summary={morphSummary} open={!!open.morphology} onToggle={() => toggle('morphology')}>
        {choice('morphology')}
        <Field
          label="Size (largest lesion, measured)"
          hint={previous ? `Last measured ${fmtDay(previous.visitDate)}: ${sizeText(previous)}` : 'Length × width (× depth for an ulcer), in millimetres.'}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <input id={`${idPrefix}-l`} aria-label="Length in mm" inputMode="decimal" disabled={disabled} value={value.lengthMm} onChange={(e) => set({ lengthMm: e.target.value })} className={numCls} placeholder="L" />
            <span className="text-gray-400">×</span>
            <input id={`${idPrefix}-w`} aria-label="Width in mm" inputMode="decimal" disabled={disabled} value={value.widthMm} onChange={(e) => set({ widthMm: e.target.value })} className={numCls} placeholder="W" />
            <span className="text-gray-400">×</span>
            <input id={`${idPrefix}-d`} aria-label="Depth in mm" inputMode="decimal" disabled={disabled} value={value.depthMm} onChange={(e) => set({ depthMm: e.target.value })} className={numCls} placeholder="D" />
            <span className="text-sm text-gray-500">mm</span>
            <select id={`${idPrefix}-m`} aria-label="How the size was measured" disabled={disabled} value={value.measuredBy} onChange={(e) => set({ measuredBy: e.target.value })} className={inputCls}>
              {MEASURED_BY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          {change && (
            <div className={`mt-1 rounded-lg px-2.5 py-1.5 text-xs ${change.flag ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
              Longest diameter {change.longest[0]} → {change.longest[1]} mm ({change.deltaMm >= 0 ? '+' : ''}{change.deltaMm} mm) ·
              area by L×W {change.area[0]} → {change.area[1]} mm² ({change.pct >= 0 ? '+' : ''}{change.pct}%) — from typed sizes.
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
            <span>Range if several:</span>
            <input id={`${idPrefix}-rmin`} aria-label="Smallest lesion in mm" inputMode="decimal" disabled={disabled} value={value.sizeMinMm} onChange={(e) => set({ sizeMinMm: e.target.value })} className={numCls} placeholder="from" />
            <span>–</span>
            <input id={`${idPrefix}-rmax`} aria-label="Largest lesion in mm" inputMode="decimal" disabled={disabled} value={value.sizeMaxMm} onChange={(e) => set({ sizeMaxMm: e.target.value })} className={numCls} placeholder="to" />
            <span>mm</span>
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {choice('shape')}
          {choice('border')}
        </div>
        {choice('colours')}
        {choice('surface')}
        {choice('texture')}
      </Section>

      <Section id="secondary" idPrefix={idPrefix} title="Secondary changes" summary={sectionSummary(SECTION.secondary, value)} open={!!open.secondary} onToggle={() => toggle('secondary')}>
        <p className="m-0 text-[11px] text-gray-500">Blank = not recorded. Choose <b>None</b> to record that you looked and it was absent.</p>
        {choice('scale')}
        {choice('crust')}
        <div className="grid gap-3 sm:grid-cols-2">
          {choice('erosion')}
          {choice('excoriation')}
        </div>
        {choice('ulceration')}
        {value.ulceration && value.ulceration !== 'none' && choice('ulcerBase', { hint: 'Base of the ulcer' })}
        <div className="grid gap-3 sm:grid-cols-2">
          {choice('lichenification')}
          {choice('atrophy')}
        </div>
        {choice('scarring')}
      </Section>

      <Section id="quantification" idPrefix={idPrefix} title="Quantification" summary={sectionSummary(SECTION.quantification, value)} open={!!open.quantification} onToggle={() => toggle('quantification')}>
        <Field label="Number of lesions" htmlFor={`${idPrefix}-count`}>
          <div className="flex flex-wrap items-center gap-2">
            <input id={`${idPrefix}-count`} inputMode="numeric" disabled={disabled || !!value.lesionCountKind} value={value.lesionCount ?? ''}
              onChange={(e) => set({ lesionCount: e.target.value.replace(/[^\d]/g, '') })} className={numCls} placeholder="count" />
            <span className="text-xs text-gray-500">or</span>
            {choice('lesionCountKind', { compact: true })}
          </div>
        </Field>
        <Field label="Percent BSA involved" htmlFor={`${idPrefix}-bsa`} hint="The patient's palm with fingers ≈ 1 %">
          <div className="flex items-center gap-1.5">
            <input id={`${idPrefix}-bsa`} inputMode="decimal" disabled={disabled} value={value.bsaPercent ?? ''} onChange={(e) => set({ bsaPercent: e.target.value })} className={numCls} placeholder="%" />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </Field>
      </Section>

      <Section id="dermoscopy" idPrefix={idPrefix} title="Dermoscopy" summary={sectionSummary(SECTION.dermoscopy, value)} open={!!open.dermoscopy} onToggle={() => toggle('dermoscopy')}>
        <label htmlFor={`${idPrefix}-ds`} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input id={`${idPrefix}-ds`} type="checkbox" disabled={disabled} checked={!!value.dermoscopy} onChange={(e) => set({ dermoscopy: e.target.checked })} className="h-4 w-4" />
          Dermoscopy performed today
        </label>
        {value.dermoscopy ? (
          <>
            {choice('dsGlobal')}
            {choice('dsNetwork')}
            <div className="grid gap-3 sm:grid-cols-2">
              {choice('dsDots')}
              {choice('dsBlueWhite')}
            </div>
            {choice('dsStreaks')}
            {choice('dsVascular')}
            {choice('dsRegression')}
            {choice('dsOther')}
          </>
        ) : <p className="m-0 text-[11px] text-gray-500">Off: nothing from dermoscopy is recorded or printed.</p>}
      </Section>

      {/* Symptoms, plan and notes left the findings form (9 Oct 2026, Emu): they belong to the
          History and Treatment plan sections. Values already on a look stay in the form state
          and are sent back unchanged, so nothing recorded earlier is lost. */}
    </div>
  );
};

export default DermLookForm;
