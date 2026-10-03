import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Lock } from 'lucide-react';
import hrService from '../../services/hrService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import { notify } from '../../utils/notify';
import { Pill } from '../../components/hr/hrFormat';
import { Section, inputCls, buttonCls, primaryButtonCls } from '../../components/hr/hrUi';
import { STATUS_TONE, STEPS, RATING_HINT, APPRAISALS_CHANGED, shortDate } from '../../components/hr/appraisals/appraisalFormat';

/**
 * AppraisalForm — /hr/appraisals/:id (HR Tier 3 Phase 5, mockup E; T3-9 a,
 * T3-10 a). One page for the person, their reviewer and a reader; the server
 * decides the role and redacts what that role may not see yet (the reviewer
 * never sees a self-assessment draft, the person never sees a review draft).
 *
 *   person    rates themselves, writes a summary, submits; later reads the
 *             review, may comment, acknowledges.
 *   reviewer  rates, comments, sets objectives and a meeting date, sends.
 *   reader    (hr.appraisals) reads everything.
 * Attendance and CPD for the year sit beside the form for reference.
 */

const Rating = ({ value, onChange, disabled, label }) => (
  <span className="inline-flex gap-1" role="radiogroup" aria-label={label}>
    {[1, 2, 3, 4].map((n) => (
      <button key={n} type="button" role="radio" aria-checked={value === n} disabled={disabled}
        onClick={() => onChange(value === n ? null : n)}
        className={`h-8 w-8 rounded-md border text-sm font-semibold tabular-nums ${value === n ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-gray-600'} ${disabled ? 'cursor-default' : 'hover:border-primary'}`}>
        {n}
      </button>
    ))}
  </span>
);

const Stepper = ({ status }) => {
  const at = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex flex-wrap gap-1.5 text-xs">
      {STEPS.map((s, i) => (
        <li key={s.key} className={`rounded-full px-2.5 py-1 font-semibold ${i < at ? 'bg-blue-50 text-primary' : i === at ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
          {i + 1} {s.label}
        </li>
      ))}
    </ol>
  );
};

const Reference = ({ id }) => {
  const [ref, setRef] = useState(null);
  useEffect(() => {
    hrService.appraisalReference(id).then((r) => setRef(r?.data || null)).catch(() => setRef(null));
  }, [id]);
  if (!ref) return null;
  const a = ref.attendance;
  return (
    <Section title={`For reference · ${ref.year}`}>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt className="text-gray-500">Days worked</dt><dd className="text-right tabular-nums">{a.worked} of {a.workingDays}</dd>
        <dt className="text-gray-500">Late in</dt><dd className="text-right tabular-nums">{a.late}</dd>
        <dt className="text-gray-500">Left early</dt><dd className="text-right tabular-nums">{a.earlyOut}</dd>
        <dt className="text-gray-500">Missed check-outs</dt><dd className="text-right tabular-nums">{a.missedCheckouts}</dd>
        <dt className="text-gray-500">Stars</dt><dd className="text-right tabular-nums">{a.gold} gold · {a.green} green · {a.red} red</dd>
        <dt className="text-gray-500">CPD verified</dt><dd className="text-right tabular-nums">{ref.cpd.verified}{ref.cpd.target ? ` of ${ref.cpd.target}` : ''} pts</dd>
      </dl>
      <p className="mt-2 text-[11px] text-gray-400">From the attendance register and CPD log, {ref.months ? (ref.months === 1 ? 'January' : `January–${new Date(Date.UTC(2000, ref.months - 1, 15)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })}`) : 'no months yet'}. Leave is not shown.</p>
    </Section>
  );
};

const AppraisalForm = () => {
  const { id } = useParams();
  const [a, setA] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [missing, setMissing] = useState(false);

  const adopt = (data) => {
    setA(data);
    setDraft({
      ratings: Object.fromEntries(data.ratings.map((r) => [r.id, { ...r }])),
      selfSummary: data.selfSummary || '', reviewerSummary: data.reviewerSummary || '',
      meetingOn: data.meetingOn || '', personComment: data.personComment || '',
      objectives: data.objectives.map((o) => ({ ...o })), removed: [],
    });
  };
  const load = useCallback(async () => {
    try { adopt((await hrService.appraisal(id))?.data); }
    catch (err) { if (err?.status === 404) setMissing(true); else notify('error', err.message || 'Could not load the appraisal'); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (missing) return <div className="p-4"><PageHeader title="Appraisal" /><p className="text-sm text-gray-500">This appraisal isn&apos;t one you can open.</p></div>;
  if (!a || !draft) return <Spinner />;

  const setRating = (rid, patch) => setDraft((d) => ({ ...d, ratings: { ...d.ratings, [rid]: { ...d.ratings[rid], ...patch } } }));
  const changed = () => window.dispatchEvent(new Event(APPRAISALS_CHANGED));

  const saveSelf = async (submit) => {
    setBusy(true);
    try {
      const res = await hrService.saveSelfAppraisal(a.id, {
        ratings: Object.values(draft.ratings).map((r) => ({ id: r.id, selfRating: r.selfRating, selfComment: r.selfComment })),
        selfSummary: draft.selfSummary, submit,
      });
      adopt(res.data);
      notify('success', submit ? 'Submitted to your reviewer' : 'Saved');
      changed();
    } catch (err) { notify('error', err.message || 'Could not save'); }
    finally { setBusy(false); setConfirm(null); }
  };
  const saveReview = async (send) => {
    setBusy(true);
    try {
      const res = await hrService.saveReview(a.id, {
        ratings: Object.values(draft.ratings).map((r) => ({ id: r.id, reviewerRating: r.reviewerRating, reviewerComment: r.reviewerComment })),
        reviewerSummary: draft.reviewerSummary, meetingOn: draft.meetingOn || null,
        objectives: [
          ...draft.objectives.filter((o) => o.text.trim() || o.id).map((o) => ({ id: o.id || undefined, text: o.text, dueBy: o.dueBy || null })),
          ...draft.removed.map((rid) => ({ id: rid, remove: true })),
        ],
        send,
      });
      adopt(res.data);
      notify('success', send ? `Sent to ${a.person.name.split(' ')[0]}` : 'Saved');
      changed();
    } catch (err) { notify('error', err.message || 'Could not save'); }
    finally { setBusy(false); setConfirm(null); }
  };
  const acknowledge = async () => {
    setBusy(true);
    try {
      adopt((await hrService.acknowledgeAppraisal(a.id, { personComment: draft.personComment }))?.data);
      notify('success', 'Acknowledged');
      changed();
    } catch (err) { notify('error', err.message || 'Could not acknowledge'); }
    finally { setBusy(false); setConfirm(null); }
  };

  const showSelf = a.visible.self;
  const showReview = a.visible.review;
  const isPerson = a.role === 'person';
  const ratings = Object.values(draft.ratings).sort((x, y) => x.sortOrder - y.sortOrder);

  return (
    <div className="max-w-6xl space-y-4 p-4">
      <Link to="/hr/appraisals" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"><ArrowLeft className="h-3.5 w-3.5" />Appraisals</Link>
      <PageHeader title={`${a.cycle.name} · ${a.person.name}`}
        subtitle={`${[a.person.position, a.person.department].filter(Boolean).join(' · ') || 'Staff'} · reviewer ${a.reviewer?.name || 'not chosen yet'}`} />
      <div className="flex flex-wrap items-center gap-3">
        {a.status === 'cancelled' ? <Pill tone="n">Cancelled</Pill> : <Stepper status={a.status} />}
        {a.cycle.status === 'closed' && <Pill tone="n"><Lock className="h-3 w-3" />cycle closed</Pill>}
        {a.role === 'reader' && <Pill tone="info">reading as HR</Pill>}
        <span className="text-xs text-gray-500">
          {a.cycle.selfDueOn && `Self-assessment due ${shortDate(a.cycle.selfDueOn)}`}{a.cycle.selfDueOn && a.cycle.reviewDueOn && ' · '}{a.cycle.reviewDueOn && `review due ${shortDate(a.cycle.reviewDueOn)}`}
        </span>
      </div>
      {a.status === 'cancelled' && <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">Cancelled: {a.cancelledNote}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Competencies" actions={<span className="text-[11px] text-gray-400">{RATING_HINT}</span>}>
            <ul className="divide-y divide-gray-100">
              {ratings.map((r) => (
                <li key={r.id} className="space-y-2 py-3">
                  <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{isPerson ? 'You' : a.person.name.split(' ')[0]}</p>
                      {showSelf ? (
                        <>
                          <Rating label={`Self rating for ${r.name}`} value={r.selfRating} disabled={!a.can.editSelf} onChange={(v) => setRating(r.id, { selfRating: v })} />
                          {a.can.editSelf
                            ? <textarea aria-label={`Your comment on ${r.name}`} rows={2} className={inputCls} value={r.selfComment || ''} onChange={(e) => setRating(r.id, { selfComment: e.target.value })} placeholder="An example or two (optional)" />
                            : r.selfComment && <p className="whitespace-pre-line text-sm text-gray-600">{r.selfComment}</p>}
                        </>
                      ) : <p className="text-xs text-gray-400">Shown once the self-assessment is submitted.</p>}
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Reviewer</p>
                      {showReview ? (
                        <>
                          <Rating label={`Reviewer rating for ${r.name}`} value={r.reviewerRating} disabled={!a.can.editReview} onChange={(v) => setRating(r.id, { reviewerRating: v })} />
                          {a.can.editReview
                            ? <textarea aria-label={`Reviewer comment on ${r.name}`} rows={2} className={inputCls} value={r.reviewerComment || ''} onChange={(e) => setRating(r.id, { reviewerComment: e.target.value })} />
                            : r.reviewerComment && <p className="whitespace-pre-line text-sm text-gray-600">{r.reviewerComment}</p>}
                        </>
                      ) : <p className="text-xs text-gray-400">Shown once the reviewer sends it.</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          {showSelf && (
            <Section title={isPerson ? 'Your summary of the year' : `${a.person.name.split(' ')[0]}'s summary`}>
              {a.can.editSelf
                ? <textarea aria-label="Self-assessment summary" rows={4} className={inputCls} value={draft.selfSummary} onChange={(e) => setDraft({ ...draft, selfSummary: e.target.value })} placeholder="What went well, what was hard, what you would like to do next year" />
                : <p className="whitespace-pre-line text-sm text-gray-700">{a.selfSummary || '—'}</p>}
            </Section>
          )}

          {showReview && (
            <Section title="Objectives for next year">
              {a.can.editReview ? (
                <div className="space-y-2">
                  {draft.objectives.map((o, i) => (
                    <div key={o.id || `new-${i}`} className="flex flex-wrap gap-2">
                      <input aria-label={`Objective ${i + 1}`} className={`${inputCls} min-w-[12rem] flex-1`} value={o.text} onChange={(e) => setDraft({ ...draft, objectives: draft.objectives.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                      <input aria-label={`Objective ${i + 1} due by`} type="date" className="rounded-lg border border-gray-300 px-2 py-2 text-sm" value={o.dueBy || ''} onChange={(e) => setDraft({ ...draft, objectives: draft.objectives.map((x, j) => (j === i ? { ...x, dueBy: e.target.value } : x)) })} />
                      <button type="button" className={buttonCls} aria-label={`Remove objective ${i + 1}`} onClick={() => setDraft({ ...draft, objectives: draft.objectives.filter((_, j) => j !== i), removed: o.id ? [...draft.removed, o.id] : draft.removed })}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <button type="button" className={buttonCls} onClick={() => setDraft({ ...draft, objectives: [...draft.objectives, { text: '', dueBy: '' }] })}><Plus className="-mt-0.5 inline h-3.5 w-3.5" /> Add objective</button>
                </div>
              ) : a.objectives.length ? (
                <ul className="space-y-1 text-sm">{a.objectives.map((o) => <li key={o.id} className="flex justify-between gap-3"><span>{o.text}</span>{o.dueBy && <Pill tone="n">by {shortDate(o.dueBy)}</Pill>}</li>)}</ul>
              ) : <p className="text-sm text-gray-500">None set.</p>}
            </Section>
          )}

          {showReview && (
            <Section title="Reviewer's summary">
              {a.can.editReview ? (
                <div className="space-y-2">
                  <textarea aria-label="Reviewer's summary" rows={4} className={inputCls} value={draft.reviewerSummary} onChange={(e) => setDraft({ ...draft, reviewerSummary: e.target.value })} />
                  <label className="flex items-center gap-2 text-xs text-gray-600">Appraisal meeting
                    <input type="date" aria-label="Appraisal meeting date" className="rounded-lg border border-gray-300 px-2 py-1 text-sm" value={draft.meetingOn} onChange={(e) => setDraft({ ...draft, meetingOn: e.target.value })} />
                  </label>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-line text-sm text-gray-700">{a.reviewerSummary || '—'}</p>
                  {a.meetingOn && <p className="mt-2 text-xs text-gray-500">Meeting {shortDate(a.meetingOn)}</p>}
                </>
              )}
            </Section>
          )}

          {(a.can.acknowledge || a.personComment) && (
            <Section title={isPerson ? 'Your comment' : `${a.person.name.split(' ')[0]}'s comment`}>
              {a.can.acknowledge
                ? <textarea aria-label="Your comment" rows={3} className={inputCls} value={draft.personComment} onChange={(e) => setDraft({ ...draft, personComment: e.target.value })} placeholder="Optional — anything you would like on the record" />
                : <p className="whitespace-pre-line text-sm text-gray-700">{a.personComment}</p>}
              {a.acknowledgedAt && <p className="mt-2 text-xs text-gray-500">Acknowledged {shortDate(a.acknowledgedAt)}</p>}
            </Section>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {a.can.editSelf && <>
              <button type="button" className={buttonCls} disabled={busy} onClick={() => saveSelf(false)}>Save draft</button>
              <button type="button" className={primaryButtonCls} disabled={busy} onClick={() => setConfirm('submit')}>Submit to reviewer</button>
            </>}
            {a.can.editReview && <>
              <button type="button" className={buttonCls} disabled={busy} onClick={() => saveReview(false)}>Save draft</button>
              <button type="button" className={primaryButtonCls} disabled={busy} onClick={() => setConfirm('send')}>Send to {a.person.name.split(' ')[0]}</button>
            </>}
            {a.can.acknowledge && <button type="button" className={primaryButtonCls} disabled={busy} onClick={() => setConfirm('ack')}>Acknowledge</button>}
          </div>
        </div>

        <div className="space-y-4">
          <Section title="Where it is">
            <p className="text-sm"><Pill tone={STATUS_TONE[a.status]}>{a.statusLabel}</Pill></p>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              {a.selfSubmittedAt && <li>Self-assessment submitted {shortDate(a.selfSubmittedAt)}</li>}
              {a.sentAt && <li>Sent to {isPerson ? 'you' : a.person.name.split(' ')[0]} {shortDate(a.sentAt)}</li>}
              {a.acknowledgedAt && <li>Acknowledged {shortDate(a.acknowledgedAt)}</li>}
            </ul>
            <p className="mt-3 text-[11px] text-gray-400">Seen only by {isPerson ? 'you' : a.person.name.split(' ')[0]}, the reviewer, and HR staff given &quot;Read appraisals&quot;.</p>
          </Section>
          <Reference id={a.id} />
        </div>
      </div>

      <ConfirmActionModal isOpen={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => (confirm === 'submit' ? saveSelf(true) : confirm === 'send' ? saveReview(true) : acknowledge())}
        title={confirm === 'submit' ? 'Submit your self-assessment?' : confirm === 'send' ? 'Send the appraisal?' : 'Acknowledge your appraisal?'}
        message={confirm === 'submit' ? 'Your reviewer will see it, and you can no longer change it.'
          : confirm === 'send' ? `${a.person.name.split(' ')[0]} will be able to read your ratings, comments and objectives. You can no longer change them.`
            : 'This says you have read it. The appraisal is then locked, with your comment if you wrote one.'}
        confirmLabel={confirm === 'submit' ? 'Submit' : confirm === 'send' ? 'Send' : 'Acknowledge'} />
    </div>
  );
};

export default AppraisalForm;
