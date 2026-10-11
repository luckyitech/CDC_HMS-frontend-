import { NumField, Warn, CopyButton, SectionLabel, todayLabel, dayLabel } from '../calcUi';
import { toNumber, eddFromLmp, ANTENATAL_DATES } from '../../../../utils/clinicalCalc';

const todayUtc = () => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); };

/** Pregnancy — EDD and gestational age from the LMP, with the key antenatal dates. */
export default function PregnancyTab({ state, set, derived, copy }) {
  const { female } = derived;
  const cycle = toNumber(state.cycle) || 28;
  const today = todayUtc();
  const r = eddFromLmp(state.lmp, cycle, today);
  const warnings = [];
  if (cycle < 21 || cycle > 35) warnings.push(`A cycle of ${cycle} days is outside 21–35 — LMP dating is unreliable; date by ultrasound.`);
  if (r && r.gaDays < 0) warnings.push('The LMP is after today — check the date.');
  else if (r && r.gaDays > 42 * 7) warnings.push('Beyond 42 weeks by this LMP — check the date.');
  const ok = r && r.gaDays >= 0;

  const wk = ok ? r.gaDays / 7 : 0;
  const ga = ok ? `${r.weeks}w ${r.days}d` : '';
  const left = ok ? (r.edd >= today ? `${Math.round((r.edd - today) / 86400000)} days to EDD` : `${Math.round((today - r.edd) / 86400000)} days past EDD`) : '';
  const dates = ok ? ANTENATAL_DATES.map((d) => ({
    ...d,
    when: d.by ? `by ${dayLabel(r.weekDate(d.to))}` : d.from === d.to ? dayLabel(r.weekDate(d.from)) : `${dayLabel(r.weekDate(d.from))} – ${dayLabel(r.weekDate(d.to))}`,
    now: wk >= d.from && wk < d.to + 1 / 7,
    past: wk >= d.to + 1 / 7,
  })) : [];
  const block = ok ? {
    head: `EDD (Naegele, LMP ${dayLabel(r.lmp)}, ${cycle}-day cycle): ${dayLabel(r.edd)} — ${ga} today (${r.trimester})`,
    lines: [`OGTT window 24–28 w: ${dayLabel(r.weekDate(24))} – ${dayLabel(r.weekDate(28))} · term from ${dayLabel(r.weekDate(37))} · ${todayLabel()}`,
      'Ref EDD = LMP + 280 d (+ cycle − 28). A first-trimester scan replaces LMP dating if they differ by >5 d before 9 w or >7 d at 9–13⁺⁶ w (ACOG 2017).'],
  } : null;

  if (!female && !state.pregnancyAnyway) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
        <p className="text-sm font-semibold text-gray-900">Not applicable — this patient is recorded as male.</p>
        <p className="text-xs leading-relaxed text-gray-600">If you want to date someone else's pregnancy (a partner's EDD, for example), you can use the calculator anyway. The result is not tied to this patient and nothing is saved.</p>
        <button type="button" onClick={() => set({ pregnancyAnyway: true })} className="h-9 rounded-lg border border-blue-200 bg-white px-3.5 text-[13px] font-semibold text-primary hover:bg-blue-50">Use anyway</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex w-full flex-col gap-3 md:w-[270px] md:shrink-0">
        {!female && <Warn>Patient recorded as male — dating someone else's pregnancy. Not tied to this patient.</Warn>}
        <NumField label="First day of last menstrual period" type="date" inputMode="text" value={state.lmp} onChange={(v) => set({ lmp: v })} />
        <NumField label="Usual cycle length (days)" inputMode="numeric" value={state.cycle} onChange={(v) => set({ cycle: v })} />
        <p className="text-xs text-gray-600">Today: <b>{todayLabel()}</b></p>
        {warnings.map((w) => <Warn key={w}>{w}</Warn>)}
        <p className="text-[11.5px] leading-relaxed text-gray-500">A first-trimester scan takes over from the LMP date when they disagree — see Notes.</p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SectionLabel>EXPECTED DATE OF DELIVERY · NAEGELE'S RULE</SectionLabel>
        {!ok
          ? <p className="text-sm text-gray-500">Enter the first day of the last period to calculate.</p>
          : (
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[28px] font-bold leading-none text-gray-900">{dayLabel(r.edd)}</span>
                <CopyButton primary onClick={() => copy([block])}>Copy for notes</CopyButton>
              </div>
              <div className="flex flex-wrap gap-2 text-[13px] font-bold">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-primary">{ga} today</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{r.trimester}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">{left}</span>
              </div>
              {cycle !== 28 && (
                <p className="text-[11.5px] leading-snug text-gray-600">By LMP alone, without the cycle adjustment: {Math.floor(r.rawGaDays / 7)}w {((r.rawGaDays % 7) + 7) % 7}d — use the adjusted age above; it agrees with the EDD.</p>
              )}
              <div className="border-t border-gray-100 pt-1.5">
                {dates.map((d) => (
                  <div key={d.label} className={`flex gap-2 border-b border-gray-50 py-1 text-[12.5px] ${d.now ? 'font-bold text-primary' : d.past ? 'text-gray-400' : 'text-gray-700'}`}>
                    <span>{d.label} · {d.note}</span>
                    <span className="ml-auto whitespace-nowrap tabular-nums">{d.when}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
