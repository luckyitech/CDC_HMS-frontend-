import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Search, UserPlus, X, AlertTriangle, Info } from 'lucide-react';
import hrSelfService from '../../../services/hrSelfService';
import { notify } from '../../../utils/notify';
import { Pill, initials } from '../hrFormat';
import { Field, inputCls, buttonCls, primaryButtonCls } from '../hrUi';
import DayCalculator from './DayCalculator';
import AttachLeaveDocument from './AttachLeaveDocument';
import {
  fmtDays, START_PARTS, END_PARTS, longDate, returnLabel, rangeLabel,
} from './leaveFormat';

/**
 * LeaveWizard — apply for leave (B27 phase 2; mockup 2 + the final ruling).
 *
 *   1 Type and dates → 2 People → 3 Details → 4 Review
 *
 * Every change of type, dates or part days asks the server what the request
 * costs (POST /api/hr/me/leave/preview, debounced 300 ms). The server's answer
 * is the ONLY judgement: the same function refuses the submit, so the wizard
 * never lets through something the API will reject, and never blocks
 * something the API would accept (a backdated request, a missing document,
 * a clash with a colleague — all warnings, not errors).
 *
 * People: APPROVERS must ALL approve and at least one must be able to approve
 * leave; ACKNOWLEDGERS are only told. The line manager is suggested.
 *
 * props:
 *   data         GET /api/hr/me/leave (types, balances, employeeId, policyPublished)
 *   onSubmitted  (application) => void
 *   onCancel     () => void
 */
const STEPS = ['Type and dates', 'People', 'Details', 'Review'];

const Stepper = ({ step }) => (
  <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4" aria-label="Steps">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const state = n < step ? 'done' : n === step ? 'now' : 'next';
      return (
        <li key={label} className="flex items-center gap-2 text-sm">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
            state === 'next' ? 'bg-gray-100 text-gray-500' : 'bg-primary text-white'}`}>
            {state === 'done' ? <Check className="w-3.5 h-3.5" /> : n}
          </span>
          <span className={state === 'now' ? 'font-semibold text-gray-900' : 'text-gray-500'}>{label}</span>
          {n < STEPS.length && <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />}
        </li>
      );
    })}
  </ol>
);

const Messages = ({ errors = [], warnings = [] }) => (
  <div className="space-y-1.5">
    {errors.map((e) => (
      <div key={e.code} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-none" /> {e.message}
      </div>
    ))}
    {warnings.map((w) => (
      <div key={w.code} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <Info className="w-4 h-4 mt-0.5 flex-none" /> {w.message}
      </div>
    ))}
  </div>
);

const LeaveWizard = ({ data, onSubmitted, onCancel }) => {
  const types = data.types || [];
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    leaveType: types[0]?.key || '',
    startDate: '',
    endDate: '',
    startPart: 'full',
    endPart: 'full',
    excludeWeekends: false,
    reason: '',
    reachable: true,
    contactNote: '',
  });
  const [attachment, setAttachment] = useState(null);
  const [people, setPeople] = useState([]);       // [{ userId, name, kind, canApprove, suggested, position, role }]
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const type = types.find((t) => t.key === form.leaveType) || null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // --- step 1: the calculator ------------------------------------------------
  const seq = useRef(0);
  useEffect(() => {
    if (!form.leaveType || !form.startDate || !form.endDate) { setPreview(null); return undefined; }
    const mine = ++seq.current;
    setPreviewing(true);
    const id = setTimeout(async () => {
      try {
        const res = await hrSelfService.preview({
          leaveType: form.leaveType, startDate: form.startDate, endDate: form.endDate,
          startPart: form.startPart, endPart: form.endPart, excludeWeekends: form.excludeWeekends,
        });
        if (mine === seq.current) setPreview(res.data);
      } catch (err) {
        if (mine === seq.current) setPreview({ ok: false, errors: [{ code: 'NETWORK', message: err.message || 'Could not work out those dates' }], warnings: [] });
      } finally {
        if (mine === seq.current) setPreviewing(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [form.leaveType, form.startDate, form.endDate, form.startPart, form.endPart, form.excludeWeekends]);

  // Half days only where the type (and a published policy) allows them.
  const halfDays = !!type?.halfDaysAllowed && data.policyPublished && preview?.usedPolicy !== false;
  useEffect(() => {
    if (!halfDays && (form.startPart !== 'full' || form.endPart !== 'full')) set({ startPart: 'full', endPart: 'full' });
  }, [halfDays]); // eslint-disable-line react-hooks/exhaustive-deps
  const oldCounting = preview ? preview.usedPolicy === false && preview.total > 0 : !data.policyPublished;

  // --- step 2: the people ------------------------------------------------------
  const [colleagues, setColleagues] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    let live = true;
    hrSelfService.approvers()
      .then((res) => {
        if (!live) return;
        setColleagues(res.data.people);
        const suggested = res.data.people.find((p) => p.suggested);
        if (suggested) {
          setPeople((cur) => (cur.length ? cur : [{ ...suggested, userId: suggested.id, kind: 'approver' }]));
        }
      })
      .catch(() => { if (live) setColleagues([]); });
    return () => { live = false; };
  }, []);

  const chosen = new Set(people.map((p) => p.userId));
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !colleagues) return [];
    return colleagues.filter((c) => !chosen.has(c.id) && c.name.toLowerCase().includes(term)).slice(0, 8);
  }, [q, colleagues, people]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (c) => {
    // Someone who can approve leave is added as an approver, anyone else as an
    // acknowledger — the select beside each name changes it.
    setPeople((cur) => [...cur, { ...c, userId: c.id, kind: c.canApprove ? 'approver' : 'acknowledger' }]);
    setQ('');
  };
  const approvers = people.filter((p) => p.kind === 'approver');
  const peopleError = approvers.length === 0
    ? 'Add at least one approver.'
    : !approvers.some((p) => p.canApprove) ? 'At least one approver must be someone who can approve leave.' : null;

  // --- navigation ---------------------------------------------------------------
  const canNext = step === 1 ? !!preview?.ok && !previewing : step === 2 ? !peopleError : true;
  const next = () => { setSubmitError(null); setStep((s) => Math.min(4, s + 1)); };
  const back = () => { setSubmitError(null); setStep((s) => Math.max(1, s - 1)); };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await hrSelfService.submit({
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        startPart: form.startPart,
        endPart: form.endPart,
        excludeWeekends: form.excludeWeekends,
        participants: people.map((p) => ({ userId: p.userId, kind: p.kind })),
        reason: form.reason || null,
        reachable: form.reachable,
        contactNote: form.reachable ? (form.contactNote || null) : null,
        attachmentDocumentId: attachment?.id || null,
      });
      notify('success', 'Leave request sent');
      onSubmitted(res.data);
    } catch (err) {
      const code = err.data?.code;
      setSubmitError(err.message || 'Could not send the request');
      // Something about the dates changed since the preview (a colleague's
      // leave, a balance) — take them back to where it can be fixed.
      if (['OVERLAP', 'INSUFFICIENT_BALANCE', 'ZERO_DAYS', 'CROSSES_YEAR', 'TYPE_OFF', 'TYPE_NOT_OFFERED'].includes(code)) setStep(1);
      else if (['NO_APPROVER', 'NO_APPROVE_HOLDER', 'SELF', 'INACTIVE', 'DUPLICATE'].includes(code)) setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const typeName = type?.name || form.leaveType;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5" data-testid="leave-wizard">
      <Stepper step={step} />
      {submitError && <div className="mb-3"><Messages errors={[{ code: 'submit', message: submitError }]} /></div>}

      {step === 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-2">What and when</h3>
          {types.length === 0 ? (
            <p className="text-sm text-gray-600">There are no leave types you can apply for yet — ask HR.</p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4" role="radiogroup" aria-label="Leave type">
              {types.map((t) => {
                const on = t.key === form.leaveType;
                return (
                  <button key={t.key} type="button" role="radio" aria-checked={on} onClick={() => set({ leaveType: t.key })}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${on ? 'bg-primary text-white border-primary' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}>
                    {t.name}{!t.unlimited && t.remaining !== null ? ` · ${fmtDays(t.remaining)} left` : ''}
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  <input type="date" className={inputCls} value={form.startDate} aria-label="First day"
                    onChange={(e) => set({ startDate: e.target.value, endDate: form.endDate && form.endDate >= e.target.value ? form.endDate : e.target.value })} />
                  {halfDays && (
                    <select className={`${inputCls} mt-1.5`} value={form.startPart} onChange={(e) => set({ startPart: e.target.value })} aria-label="First day part">
                      {START_PARTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="To">
                  <input type="date" className={inputCls} value={form.endDate} min={form.startDate || undefined} aria-label="Last day"
                    onChange={(e) => set({ endDate: e.target.value })} />
                  {halfDays && (
                    <select className={`${inputCls} mt-1.5`} value={form.endPart} onChange={(e) => set({ endPart: e.target.value })} aria-label="Last day part">
                      {END_PARTS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  )}
                </Field>
              </div>
              {oldCounting && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.excludeWeekends} onChange={(e) => set({ excludeWeekends: e.target.checked })} />
                  Don&apos;t count weekends
                </label>
              )}
              {preview && <Messages errors={preview.errors} warnings={preview.warnings} />}
              {preview?.clashes?.people?.length > 0 && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="clash-list">
                  Also away: {preview.clashes.people.map((p) => `${p.name} ${rangeLabel(p.from, p.to)}`).join(' · ')}. Not blocking.
                </div>
              )}
              {preview?.ok && preview.returnDate && (
                <div className="text-sm text-gray-600">Back at work: <b className="text-gray-900">{returnLabel(preview.returnDate, preview.returnPart)}</b></div>
              )}
            </div>
            <div>
              {previewing && !preview && <div className="text-sm text-gray-500">Working it out…</div>}
              {preview && preview.total > 0 && (
                <DayCalculator breakdown={preview.breakdown} total={preview.total} typeName={typeName} balance={preview.balance} usedPolicy={preview.usedPolicy} />
              )}
              {!preview && !previewing && (
                <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">Choose the dates to see how many days this takes.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">People</h3>
          <p className="text-xs text-gray-500 mb-3">
            <b>Approvers</b> — all must approve; at least one must be able to approve leave. <b>Acknowledgers</b> — are told, don&apos;t approve.
          </p>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input className={`${inputCls} pl-9`} placeholder="Add a colleague by name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search colleagues" />
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => add(c)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                      <UserPlus className="w-4 h-4 text-gray-400" />
                      <span className="flex-1 min-w-0 truncate">{c.name} <span className="text-gray-400">· {c.position || c.role}</span></span>
                      {c.canApprove && <Pill tone="ok">can approve leave</Pill>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {colleagues === null && <p className="text-sm text-gray-500">Loading colleagues…</p>}
          <ul className="divide-y divide-gray-100" data-testid="people-list">
            {people.map((p) => (
              <li key={p.userId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">{initials(p.name)}</span>
                <span className="flex-1 min-w-[8rem]">
                  {p.name}
                  <span className="text-gray-400"> · {p.suggested ? 'line manager · suggested' : (p.position || p.role)}</span>
                </span>
                <select className="rounded-md border border-gray-300 px-2 py-1 text-xs" value={p.kind} aria-label={`${p.name} is`}
                  onChange={(e) => setPeople((cur) => cur.map((x) => (x.userId === p.userId ? { ...x, kind: e.target.value } : x)))}>
                  <option value="approver">Approver</option>
                  <option value="acknowledger">Acknowledger</option>
                </select>
                {p.canApprove && <Pill tone="ok">can approve leave</Pill>}
                <button type="button" onClick={() => setPeople((cur) => cur.filter((x) => x.userId !== p.userId))} className="p-1 text-gray-400 hover:text-gray-700" aria-label={`Remove ${p.name}`}>
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          {people.length === 0 && colleagues !== null && <p className="text-sm text-gray-500">Search for the person who approves your leave.</p>}
          {peopleError && people.length > 0 && <div className="mt-2"><Messages errors={[{ code: 'people', message: peopleError }]} /></div>}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-800">Details</h3>
          <Field label="Reason" hint={form.leaveType === 'Sick' ? 'Seen only by you, your approvers and HR.' : 'Optional.'}>
            <textarea rows={2} className={inputCls} value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="Reason" />
          </Field>
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Supporting document</span>
            <div className="flex flex-wrap items-center gap-3">
              <AttachLeaveDocument employeeId={data.employeeId} leaveType={form.leaveType} value={attachment} onChange={setAttachment} />
              <span className="text-[11px] text-gray-500">
                {preview?.documentNeeded
                  ? 'Needed for this leave. You can send the request now and add it later.'
                  : 'Optional.'}
              </span>
            </div>
          </div>
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Reachable while away?</span>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-1.5"><input type="radio" name="reachable" checked={form.reachable === true} onChange={() => set({ reachable: true })} /> Yes</label>
              <label className="inline-flex items-center gap-1.5"><input type="radio" name="reachable" checked={form.reachable === false} onChange={() => set({ reachable: false })} /> No</label>
            </div>
            {form.reachable && (
              <input className={`${inputCls} mt-2`} maxLength={255} value={form.contactNote} onChange={(e) => set({ contactNote: e.target.value })} placeholder="How to reach you (optional) — e.g. phone, mornings only" />
            )}
          </div>
        </div>
      )}

      {step === 4 && preview && (
        <div className="rounded-lg border-2 border-primary/40 p-4" data-testid="review">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Review and send</h3>
          <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-gray-500">Leave</dt>
            <dd className="text-gray-900">{typeName} · <b>{longDate(preview.startDate)}{preview.startDate !== preview.endDate ? ` – ${longDate(preview.endDate)}` : ''}</b></dd>
            <dt className="text-gray-500">Days</dt>
            <dd className="text-gray-900">{fmtDays(preview.total)}{preview.returnDate ? ` · back ${returnLabel(preview.returnDate, preview.returnPart)}` : ''}</dd>
            {preview.balance && !preview.balance.unlimited && (
              <>
                <dt className="text-gray-500">Balance after</dt>
                <dd className="text-gray-900">{fmtDays(preview.balance.after)}</dd>
              </>
            )}
            <dt className="text-gray-500">Approvers</dt>
            <dd className="text-gray-900">{approvers.map((p) => p.name).join(', ')}</dd>
            {people.some((p) => p.kind === 'acknowledger') && (
              <>
                <dt className="text-gray-500">Told</dt>
                <dd className="text-gray-900">{people.filter((p) => p.kind === 'acknowledger').map((p) => p.name).join(', ')}</dd>
              </>
            )}
            {form.reason && (<><dt className="text-gray-500">Reason</dt><dd className="text-gray-900 whitespace-pre-line">{form.reason}</dd></>)}
            <dt className="text-gray-500">Document</dt>
            <dd className="text-gray-900">{attachment ? attachment.fileName : (preview.documentNeeded ? 'Owed — add it later' : 'None')}</dd>
            <dt className="text-gray-500">Reachable</dt>
            <dd className="text-gray-900">{form.reachable ? `Yes${form.contactNote ? ` · ${form.contactNote}` : ''}` : 'No'}</dd>
          </dl>
          {preview.warnings?.length > 0 && <div className="mt-3"><Messages warnings={preview.warnings.filter((w) => w.code !== 'DOCUMENT_NEEDED' || !attachment)} /></div>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-gray-100">
        {step === 1
          ? <button type="button" onClick={onCancel} className={buttonCls}>Cancel</button>
          : <button type="button" onClick={back} className={`${buttonCls} inline-flex items-center gap-1`}><ChevronLeft className="w-4 h-4" /> Back</button>}
        {step < 4
          ? <button type="button" onClick={next} disabled={!canNext} className={`${primaryButtonCls} inline-flex items-center gap-1`}>Next <ChevronRight className="w-4 h-4" /></button>
          : <button type="button" onClick={submit} disabled={submitting} className={primaryButtonCls}>{submitting ? 'Sending…' : 'Submit request'}</button>}
      </div>
    </div>
  );
};

export default LeaveWizard;
