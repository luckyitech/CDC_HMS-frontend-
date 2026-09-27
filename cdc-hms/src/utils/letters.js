// Visit History row → the `letter` LetterPrint renders (27 Sep evening). One
// mapping shared by the day view, the day-card pills and the Referral letters
// tab, so a letter reads the same wherever it is opened.
const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

/** A referral row from GET /queue/advised-referrals. */
export const referralLetter = (r) => ({
  note: r.note, date: r.savedAt, doctorName: r.doctorName,
  referralType: r.referralType, destination: r.destination, reason: r.reason,
});

/** An admission row from inpatientService.advisedAdmissions. */
export const admissionLetter = (a) => ({
  note: a.note, date: a.savedAt || a.requestedAt, doctorName: a.doctorName, admissionType: a.admissionType,
  status: [a.sent ? "Sent for admission" : "Documented only", a.cancelledAt ? `cancelled ${fmtDay(a.cancelledAt)}` : null]
    .filter(Boolean).join(" · "),
});
