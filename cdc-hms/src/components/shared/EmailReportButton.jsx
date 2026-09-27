import { useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import usePdfFromPrint from '../../hooks/usePdfFromPrint';
import PatientEmailPanel from '../mail/PatientEmailPanel';
import { useUserContext } from '../../contexts/UserContext';
import { canUseMail } from '../../utils/permissions';
import { notify } from '../../utils/notify';

const PORTALS = { doctor: 'doctor', nurse: 'doctor', staff: 'staff', admin: 'admin', lab: 'lab' };

/** "Lab result" + "CDC-001" → "Lab-result-CDC-001-2026-09-27.pdf" */
const reportFileName = (stem, uhid) => {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const safe = (s) => String(s || '').trim().replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${safe(stem) || 'Report'}-${safe(uhid)}-${day}.pdf`;
};

/**
 * "Email" beside Print / Send via WhatsApp on an HMS printout (Staff Email
 * debt pass, Emu 27 Sep). Turns exactly what the preview shows into a PDF in
 * the browser (the same usePdfFromPrint the WhatsApp send uses — no server PDF,
 * no new dependency) and opens the side-panel Composer on the patient with it
 * attached. Nothing is filed in the patient's Documents (Emu, 27 Sep evening):
 * the printout can be rebuilt from Visit History; the email is linked to the
 * patient so it shows on their Communications tab.
 *
 * Shown to anyone who can use mail (the server re-checks patient access).
 * Props: printRef, uhid, title (e.g. "Referral letter"), fileStem (e.g.
 * "Referral-letter"), addressPatient (default true — false for letters meant
 * for another clinician: the To line starts empty), className.
 */
const EmailReportButton = ({ printRef, uhid, title, fileStem, addressPatient = true, className = '' }) => {
  const { currentUser } = useUserContext();
  const getPdf = usePdfFromPrint(printRef);
  const [busy, setBusy] = useState(false);
  const [reports, setReports] = useState(null);

  if (!uhid || !canUseMail(currentUser)) return null;

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const file = await getPdf(reportFileName(fileStem || title, uhid));
      setReports([{ file, title }]);
    } catch (err) {
      notify('error', err?.message || 'Could not make the PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button" onClick={start} disabled={busy}
        className={className || 'px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold transition flex items-center gap-2 disabled:opacity-60'}
        title="Email this as a PDF"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} {busy ? 'Making PDF…' : 'Email'}
      </button>
      {reports && (
        <PatientEmailPanel
          uhid={uhid}
          portal={PORTALS[currentUser?.role] || 'doctor'}
          reports={reports}
          addressPatient={addressPatient}
          onClose={() => setReports(null)}
        />
      )}
    </>
  );
};

export default EmailReportButton;
