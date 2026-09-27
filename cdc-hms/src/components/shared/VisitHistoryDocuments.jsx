// VisitHistoryDocuments.jsx — the "Lab requests" and "Referral letters" tabs of
// Visit History (Emu, 27 Sep evening), beside Visits and Prescriptions. Every
// lab request form and referral letter / admission note the clinic wrote for
// this patient, newest first; each opens its letterhead preview with
// Print · Email · Send via WhatsApp — so a lost copy can be reissued without
// filling the patient's Documents with regenerable printouts.
import { useEffect, useState } from "react";
import { FlaskConical, Share2, BedDouble, Loader2 } from "lucide-react";
import labService from "../../services/labService";
import queueService from "../../services/queueService";
import inpatientService from "../../services/inpatientService";
import { groupLabRequests, labRequestForPrint, LAB_HISTORY_LIMIT } from "../../utils/labRequests";
import LabRequestPrint from "./LabRequestPrint";
import LetterPrint from "./LetterPrint";
import Tag from "./Tag";
import { referralLetter, admissionLetter } from "../../utils/letters";

const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const whoOf = (patient) => ({ name: patient?.name, uhid: patient?.uhid, phone: patient?.phone, gender: patient?.gender });

const Shell = ({ loading, problem, empty, emptyText, children }) => {
  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  if (problem) return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{problem}</p>;
  if (empty) return <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">{emptyText}</p>;
  return <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">{children}</div>;
};

const Row = ({ Icon, iconCls, date, title, sub, tags, onOpen }) => (
  <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50">
    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${iconCls}`}><Icon className="h-4 w-4" /></span>
    <span className="w-24 flex-shrink-0 text-sm text-gray-500">{date}</span>
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold text-gray-800">{title}</span>
        {tags}
      </span>
      {sub && <span className="block truncate text-xs text-gray-500">{sub}</span>}
    </span>
    <span className="flex-shrink-0 text-sm font-semibold text-primary">Open</span>
  </button>
);

/** Visit History → Lab requests: every requisition, one row each. */
export const LabRequestsHistory = ({ patient }) => {
  const uhid = patient?.uhid;
  const [state, setState] = useState({ loading: true, rows: [], problem: null });
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let live = true;
    labService.getByPatient(uhid, { limit: LAB_HISTORY_LIMIT })
      .then((res) => {
        if (!live) return;
        const rows = groupLabRequests(res?.data?.labTests || [])
          .sort((a, b) => new Date(b.createdAt || b.orderedDate || 0) - new Date(a.createdAt || a.orderedDate || 0));
        setState({ loading: false, rows, problem: null });
      })
      .catch((e) => live && setState({ loading: false, rows: [], problem: e?.message || "Could not load lab requests." }));
    return () => { live = false; };
  }, [uhid]);

  return (
    <>
      <Shell loading={state.loading} problem={state.problem} empty={!state.rows.length} emptyText="No lab requests for this patient yet.">
        {state.rows.map((req) => {
          const live = req.tests.filter((t) => t.status !== "Cancelled");
          const allCancelled = live.length === 0;
          return (
            <Row
              key={req.id}
              Icon={FlaskConical} iconCls="bg-cyan-50 text-cyan-600"
              date={fmtDay(req.orderedDate)}
              title={req.requisitionNumber || "Lab request"}
              tags={<>
                {req.priority && req.priority !== "Routine" && <Tag className="border border-red-200 bg-red-50 text-red-700">{req.priority}</Tag>}
                {allCancelled && <Tag className="bg-gray-100 text-gray-600">Cancelled</Tag>}
              </>}
              sub={[
                (allCancelled ? req.tests : live).map((t) => t.testType).join(", "),
                req.orderedBy && `by ${req.orderedBy}${req.onBehalfOfDoctor ? ` for ${req.onBehalfOfDoctor}` : ""}`,
              ].filter(Boolean).join(" · ")}
              onOpen={() => setOpen(req)}
            />
          );
        })}
      </Shell>
      {open && <LabRequestPrint request={labRequestForPrint(open)} patient={whoOf(patient)} onClose={() => setOpen(null)} />}
    </>
  );
};

/** Visit History → Referral letters: referral letters, plus admission notes (labelled). */
export const ReferralLettersHistory = ({ patient }) => {
  const uhid = patient?.uhid;
  const [state, setState] = useState({ loading: true, rows: [], problem: null });
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      queueService.advisedReferrals(uhid),
      inpatientService.advisedAdmissions(uhid).catch(() => ({ data: { admissions: [] } })),
    ])
      .then(([refRes, admRes]) => {
        if (!live) return;
        const refs = (refRes?.data?.referrals || []).map((r) => ({ kind: "referral", at: r.savedAt, data: r }));
        const adms = (admRes?.data?.admissions || []).map((a) => ({ kind: "admission", at: a.savedAt || a.requestedAt, data: a }));
        const rows = [...refs, ...adms].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
        setState({ loading: false, rows, problem: null });
      })
      .catch((e) => live && setState({ loading: false, rows: [], problem: e?.message || "Could not load referral letters." }));
    return () => { live = false; };
  }, [uhid]);

  const letterOf = (row) => (row.kind === "referral" ? referralLetter(row.data) : admissionLetter(row.data));

  return (
    <>
      <Shell loading={state.loading} problem={state.problem} empty={!state.rows.length} emptyText="No referral letters or admission notes for this patient yet.">
        {state.rows.map((row) => (row.kind === "referral" ? (
          <Row
            key={`r${row.data.id}`}
            Icon={Share2} iconCls="bg-sky-50 text-sky-600"
            date={fmtDay(row.at)}
            title="Referral letter"
            tags={<>
              {row.data.referralType && <Tag className="border border-sky-200 bg-sky-50 text-sky-700">{row.data.referralType}</Tag>}
              <Tag className={row.data.sent ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}>{row.data.sent ? "Referred" : "Not sent"}</Tag>
            </>}
            sub={[row.data.destination && `to ${row.data.destination}`, row.data.reason, row.data.doctorName].filter(Boolean).join(" · ")}
            onOpen={() => setOpen(row)}
          />
        ) : (
          <Row
            key={`a${row.data.id}`}
            Icon={BedDouble} iconCls="bg-indigo-50 text-indigo-600"
            date={fmtDay(row.at)}
            title="Admission note"
            tags={<>
              {row.data.admissionType && <Tag className="border border-indigo-200 bg-indigo-50 text-indigo-700">{row.data.admissionType}</Tag>}
              {row.data.cancelledAt && <Tag className="bg-gray-100 text-gray-600">Cancelled</Tag>}
            </>}
            sub={[row.data.doctorName].filter(Boolean).join(" · ")}
            onOpen={() => setOpen(row)}
          />
        )))}
      </Shell>
      {open && <LetterPrint kind={open.kind} letter={letterOf(open)} patient={whoOf(patient)} onClose={() => setOpen(null)} />}
    </>
  );
};
