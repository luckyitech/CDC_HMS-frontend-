import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import useDraft from '../../../hooks/useDraft';
import { DraftStatus, DraftRestoreBanner } from '../../shared/DraftStatus';
import ReasonModal from '../../shared/ReasonModal';
import { dermService } from '../../../services/dermService';
import { notify } from '../../../utils/notify';
import { EXAM_SECTIONS, NAILS, nailLabel, asList, hasValue, phrase, specOf, sectionSummary } from './dermExam';
import DermChoiceField from './DermChoiceField';
import useDermVocabulary, { forgetDermVocabulary } from './useDermVocabulary';

/**
 * General examination (named "Today's whole-skin exam" until 9 Oct 2026, Emu; decision S1) — the parts of the
 * skin examination that belong to the patient that day, not to one finding:
 * Hair, Nails, Lymph nodes, Mucosa. One per patient per clinic day. Each part
 * is "Not examined" until switched on, and only examined parts print.
 * Photography is not typed here: it is written from the day's photos.
 *
 * Same rules as a look: the author edits it the same day; anyone else (or
 * later) amends it with a reason, kept in the trail. Autosaves a draft
 * (formKey 'derm-skin-exam').
 *
 * Props: uhid, canWrite, onSaved(), embedded (inside the General examination
 *        pop-up: always open, no header of its own)
 */
const inputCls = 'rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-50';
const MANY = new Set(EXAM_SECTIONS.flatMap((s) => s.fields).filter((f) => f.kind === 'many').map((f) => f.key));

const blankExam = () => {
  const out = { notes: '' };
  for (const s of EXAM_SECTIONS) {
    out[s.switch] = false;
    for (const f of s.fields) out[f.key] = MANY.has(f.key) ? [] : '';
  }
  return out;
};
const examFrom = (e) => {
  const out = blankExam();
  if (!e) return out;
  for (const k of Object.keys(out)) {
    if (MANY.has(k)) out[k] = asList(e[k]);
    else if (typeof out[k] === 'boolean') out[k] = !!e[k];
    else out[k] = e[k] === null || e[k] === undefined ? '' : e[k];
  }
  return out;
};
const examPayload = (f) => {
  const out = {};
  for (const [k, v] of Object.entries(f)) {
    if (MANY.has(k)) out[k] = asList(v);
    else if (typeof v === 'boolean') out[k] = v;
    else if (k === 'pullTestCount') out[k] = v === '' || v === null ? null : Number(v);
    else out[k] = typeof v === 'string' ? (v.trim() || null) : v;
  }
  return out;
};
const anyExamined = (f) => EXAM_SECTIONS.some((s) => f[s.switch]) || !!String(f.notes || '').trim();
const same = (a, b) => JSON.stringify(examPayload(a)) === JSON.stringify(examPayload(b));

/** Which nails: a small chart — left / right hand and foot, digits 1–5 — plus All, plus Other. */
const NailChart = ({ value, onChange, learned, disabled, idPrefix }) => {
  const list = asList(value);
  const toggle = (t) => onChange(list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);
  const row = (side, limb) => (
    <div className="flex items-center gap-1">
      <span className="w-20 text-[11px] text-gray-500">{side === 'l' ? 'Left' : 'Right'} {limb === 'f' ? 'hand' : 'foot'}</span>
      {[1, 2, 3, 4, 5].map((n) => {
        const t = `${side}${limb}${n}`;
        const on = list.includes(t) || list.includes('all');
        return (
          <button key={t} type="button" disabled={disabled || list.includes('all')} aria-pressed={on} title={nailLabel(t)} aria-label={nailLabel(t)}
            onClick={() => toggle(t)}
            className={`h-6 w-6 rounded-md border text-[11px] font-semibold ${on ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
            {n}
          </button>
        );
      })}
    </div>
  );
  const typed = list.filter((x) => !NAILS.includes(x));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-500">Nails affected <span className="font-normal text-gray-400">· 1 = thumb / great toe</span></span>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <div className="flex flex-col gap-1">{row('l', 'f')}{row('r', 'f')}</div>
        <div className="flex flex-col gap-1">{row('l', 't')}{row('r', 't')}</div>
      </div>
      <div>
        <button type="button" disabled={disabled} aria-pressed={list.includes('all')} onClick={() => onChange(list.includes('all') ? typed : ['all', ...typed])}
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${list.includes('all') ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
          All nails
        </button>
      </div>
      <DermChoiceField compact field={{ ...specOf('nailsAffected'), options: [] }} value={typed}
        onChange={(t) => onChange([...list.filter((x) => NAILS.includes(x)), ...t])} learned={learned} disabled={disabled} idPrefix={idPrefix} />
    </div>
  );
};

const DermSkinExamCard = ({ uhid, canWrite, onSaved, embedded = false }) => {
  const { terms } = useDermVocabulary();
  const [state, setState] = useState({ loading: true });
  const [form, setForm] = useState(blankExam());
  const [open, setOpen] = useState(embedded);
  const [saving, setSaving] = useState(false);
  const [askReason, setAskReason] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await dermService.getSkinExam(uhid);
      const d = res?.data || {};
      setState({ loading: false, ...d });
      setForm(examFrom(d.exam));
    } catch {
      setState({ loading: false, failed: true });
    }
  }, [uhid]);
  useEffect(() => { if (uhid) load(); }, [uhid, load]);

  const saved = examFrom(state.exam);
  const amendMode = state.mode === 'amend';
  const draft = useDraft({
    uhid, formKey: 'derm-skin-exam', contextKey: state.today || '',
    value: form, baseline: saved,
    isEmpty: (v) => !v || (!anyExamined(v) && same(v, blankExam())),
    enabled: !state.loading && !state.failed && canWrite && !amendMode,
    onRestore: (p) => { setForm(examFrom(p)); setOpen(true); },
    onDiscard: () => setForm(examFrom(state.exam)),
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const changed = !same(form, saved);

  const save = async (reason) => {
    if (!anyExamined(form)) { notify('error', 'Switch on at least one part you examined'); return; }
    setSaving(true);
    try {
      const payload = examPayload(form);
      const res = amendMode
        ? await dermService.amendSkinExam(state.exam.id, { ...payload, reason })
        : await dermService.saveSkinExam(uhid, payload);
      const d = res?.data || {};
      setState({ loading: false, ...d });
      setForm(examFrom(d.exam));
      draft.markSaved();
      forgetDermVocabulary();
      notify('success', amendMode ? 'General examination amended' : 'General examination saved');
      onSaved?.();
    } catch { /* the API shows the reason */ } finally { setSaving(false); }
  };

  if (state.loading) return <div className="h-12 animate-pulse rounded-xl bg-gray-100" aria-label="Loading the general examination" />;
  if (state.failed) return null;

  const exam = state.exam;
  const sections = exam?.sections || [];
  const headline = sections.length ? sections.map((s) => s.heading).join(' · ') : 'Hair, nails, lymph nodes, mucosa — nothing recorded today';

  return (
    <section className={embedded ? '' : 'rounded-xl border border-gray-200 bg-white'}>
      {!embedded && <h4 className="m-0">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="derm-skin-exam-body"
          className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left">
          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
            {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}General examination
          </span>
          <span className="min-w-0 truncate text-xs text-gray-500">{headline}{exam?.doctorName ? ` · ${exam.doctorName}` : ''}</span>
        </button>
      </h4>}

      {open && (
        <div id="derm-skin-exam-body" className={`flex flex-col gap-3 ${embedded ? '' : 'border-t border-dashed border-gray-200 px-3 pb-3 pt-3'}`}>
          {!canWrite ? (
            sections.length ? (
              <dl className="m-0 flex flex-col gap-1 text-sm">
                {sections.map((s) => <div key={s.heading}><dt className="inline font-semibold">{s.heading}: </dt><dd className="inline">{s.text}</dd></div>)}
              </dl>
            ) : <p className="m-0 text-sm text-gray-500">Nothing recorded today.</p>
          ) : (<>
            <div className="flex flex-wrap items-center gap-2">
              <p className="m-0 text-[11px] text-gray-500">One per patient per day. Switch on each part you examined; parts left off are not printed. Photography is written from the day's photos.</p>
              <DraftStatus draft={draft} className="ml-auto" />
            </div>
            <DraftRestoreBanner draft={draft} />
            {amendMode && (
              <p className="m-0 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Recorded by {exam?.doctorName || 'another doctor'}{exam?.visitDate && exam.visitDate !== state.today ? ` on ${exam.visitDate}` : ' today'}. Changes are kept as an amendment with your reason.
              </p>
            )}
            {EXAM_SECTIONS.map((s) => (
              <div key={s.id} className="rounded-lg border border-gray-200">
                <label htmlFor={`derm-exam-${s.switch}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <input id={`derm-exam-${s.switch}`} type="checkbox" className="h-4 w-4" checked={!!form[s.switch]} onChange={(e) => set({ [s.switch]: e.target.checked })} />
                    {s.title}
                  </span>
                  <span className="min-w-0 truncate text-xs text-gray-500">{sectionSummary(s, form)}</span>
                </label>
                {form[s.switch] && (
                  <div className="flex flex-col gap-3 border-t border-dashed border-gray-200 px-3 pb-3 pt-3">
                    {s.fields.map((f) => {
                      // Follow-on fields appear only when they apply (the server applies the same rule).
                      if (f.key === 'hairDensityPattern' && form.hairDensity !== 'decreased') return null;
                      if ((f.key === 'pullTestSite' || f.key === 'pullTestCount') && form.pullTest !== 'positive') return null;
                      if (f.key === 'oralNote' && form.oral !== 'findings') return null;
                      if (f.key === 'genitalNote' && form.genital !== 'findings') return null;
                      if (f.key === 'nodesNote' && form.lymphadenopathy !== 'present') return null;
                      if (f.key === 'nailsAffected') return <NailChart key={f.key} value={form.nailsAffected} onChange={(v) => set({ nailsAffected: v })} learned={terms.nailsAffected || []} idPrefix="derm-exam" />;
                      if (f.kind === 'one' || f.kind === 'many') {
                        return <DermChoiceField key={f.key} field={f} value={form[f.key]} onChange={(v) => set({ [f.key]: v })} learned={terms[f.key] || []} idPrefix="derm-exam" />;
                      }
                      return (
                        <label key={f.key} htmlFor={`derm-exam-${f.key}`} className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-gray-500">{f.label}</span>
                          <input id={`derm-exam-${f.key}`} value={form[f.key] ?? ''} inputMode={f.kind === 'int' ? 'numeric' : undefined}
                            maxLength={f.max || 500}
                            onChange={(e) => set({ [f.key]: f.kind === 'int' ? e.target.value.replace(/[^\d]/g, '') : e.target.value })}
                            className={`${inputCls} ${f.kind === 'int' ? 'w-24 text-right tabular-nums' : 'max-w-md'}`} />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            <label htmlFor="derm-exam-notes" className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500">Notes</span>
              <textarea id="derm-exam-notes" rows={2} value={form.notes} maxLength={1000} onChange={(e) => set({ notes: e.target.value })} className={inputCls} />
            </label>
            {state.amendments?.length > 0 && (
              <ul className="m-0 list-none rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                {state.amendments.map((a, i) => (
                  <li key={i}>Amended by {a.by || '—'}: {a.reason} — {Object.entries(a.changes || {}).map(([k, [b, c]]) => `${specOf(k)?.label || k}: ${hasValue(b) ? (specOf(k) ? phrase(k, b) : String(b)) : '—'} → ${hasValue(c) ? (specOf(k) ? phrase(k, c) : String(c)) : '—'}`).join('; ')}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving || !changed} onClick={() => (amendMode ? setAskReason(true) : save())}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving…' : amendMode ? 'Amend…' : exam ? 'Save changes' : 'Save general examination'}
              </button>
              {changed && <button type="button" onClick={() => setForm(saved)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Undo changes</button>}
            </div>
          </>)}
        </div>
      )}
      <ReasonModal
        isOpen={askReason}
        onClose={() => setAskReason(false)}
        title="Amend today's general examination"
        message="The entry keeps its author. Your change, with this reason, is kept in the amendment trail."
        confirmLabel="Amend"
        onConfirm={async (reason) => { setAskReason(false); await save(reason); }}
      />
    </section>
  );
};

export default DermSkinExamCard;
