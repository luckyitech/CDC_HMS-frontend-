import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Loader2, X, AlertTriangle, Mail } from 'lucide-react';
import mailService from '../../services/mailService';
import MailSetupCard from './MailSetupCard';
import Composer from './Composer';
import { notify } from '../../utils/notify';
import { PANEL_Z } from '../../constants/layers';

export const PATIENT_MAIL_SENT_EVENT = 'patient-mail:sent';

const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
const typeOf = (name) => TYPES[String(name || '').split('.').pop().toLowerCase()] || 'application/octet-stream';

/**
 * "Email patient" (Staff Email phase 4) — the Composer in a side panel over
 * the patient file, so the sender never leaves the patient.
 *
 * - The patient's address is filled in as a Patient-tagged chip (the server
 *   confirms it against the file and notes the email on the patient's
 *   Communications trail — subject kept, body never).
 * - "From patient file" opens on this patient; `documents` (from a Medical
 *   Documents row) arrive already attached — as references, read from the HMS
 *   at send time, exactly as in My mail.
 * - Mailbox not connected yet → the same guided setup card My mail shows.
 * - "Open in My mail" saves the draft and continues it in the Inbox (not
 *   offered in portals without an Inbox, e.g. Radiology).
 *
 * - `reports` (debt pass): PDFs made from an HMS printout (prescription, lab
 * request, referral letter…) — attached as uploads, NOT filed on the patient
 * (27 Sep evening). With reports, a patient with no email address on file can
 * still be written about (to an insurer, a colleague): the To line simply
 * starts empty; `addressPatient={false}` (letters to another clinician) always
 * starts it empty. The email is linked to the patient ("Patient file" row), so
 * it is on their Communications tab whoever it goes to. Rendered in a portal
 * so it stacks above a print preview.
 *
 * Props: uhid, portal, documents? [{ id, fileName }], reports? [{ file, title }],
 * addressPatient? (default true), onClose.
 */
const PatientEmailPanel = ({ uhid, portal, documents = [], reports = [], addressPatient = true, onClose }) => {
  const navigate = useNavigate();
  const [state, setState] = useState(null);   // { account, setup, contact, problem }
  const [composeKey] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [acc, contact] = await Promise.allSettled([mailService.getAccount(), mailService.patientContact(uhid)]);
    setState({
      account: acc.status === 'fulfilled' ? acc.value.data.account : null,
      setup: acc.status === 'fulfilled' ? acc.value.data.setup : null,
      contact: contact.status === 'fulfilled' ? contact.value.data : null,
      problem: acc.status === 'rejected' ? (acc.reason?.message || 'Could not load your email settings.')
        : contact.status === 'rejected' ? (contact.reason?.message || 'Could not load this patient.') : null,
    });
  }, [uhid]);
  useEffect(() => { load(); }, [load]);

  // Escape closes only while nothing is being written (the Composer's own
  // close keeps a draft; here we simply don't intercept once it is open).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !(state?.account?.status === 'connected' && state?.contact?.address)) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  const contact = state?.contact;
  const account = state?.account;
  const hasReports = reports.length > 0;
  const ready = account && account.status === 'connected' && contact && (contact.address || hasReports);
  const title = contact ? `Email ${contact.name}` : 'Email patient';

  const init = ready ? {
    mode: 'new',
    key: composeKey,
    to: contact.address && addressPatient ? [{ name: contact.name, address: contact.address, patient: { uhid: contact.uhid } }] : [],
    linkPatients: hasReports ? [{ uhid: contact.uhid, name: contact.name }] : [],
    subject: hasReports && reports.length === 1 ? reports[0].title : '',
    reports: reports.map((r, i) => ({ id: i + 1, file: r.file, title: r.title, uhid: contact.uhid, patientName: contact.name })),
    patientDocuments: documents.map((d) => ({
      documentId: d.id, fileName: d.fileName, type: typeOf(d.fileName), size: d.size || 0,
      uhid: contact.uhid, patientName: contact.name,
    })),
  } : null;

  const popOut = portal === 'radiology' ? null : (draft) => {
    onClose();
    navigate(`/${portal}/inbox?tab=mail`, { state: draft ? { openDraft: draft } : null });
  };

  const header = (
    <div className="flex items-center gap-2 border-b bg-gray-50 px-3 py-2">
      <Mail className="h-4 w-4 text-gray-500" aria-hidden="true" />
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{title}</h2>
      <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="h-5 w-5" /></button>
    </div>
  );

  let body;
  if (!state) {
    body = <>{header}<div className="flex flex-1 justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div></>;
  } else if (state.problem) {
    body = <>{header}<Notice>{state.problem}</Notice></>;
  } else if (!account || account.status === 'disconnected') {
    body = <>{header}<div className="flex-1 overflow-y-auto p-3"><MailSetupCard setup={state.setup} onConnected={() => { notify('success', 'Your mailbox is connected.'); load(); }} /></div></>;
  } else if (account.status === 'needs_password') {
    body = <>{header}<div className="flex-1 overflow-y-auto p-3"><MailSetupCard setup={state.setup} account={account} reconnect onConnected={() => { notify('success', 'Reconnected.'); load(); }} /></div></>;
  } else if (!contact.address && !hasReports) {
    body = (
      <>{header}
        <Notice>
          There is no email address on {contact.name}’s file ({contact.uhid}). Add one with <span className="font-semibold">Edit profile</span> under the User Management tab, then try again.
        </Notice>
      </>
    );
  } else {
    body = (
      <Composer
        account={account}
        domains={state.setup?.domains || []}
        init={init}
        title={title}
        filePatient={{ uhid: contact.uhid, name: contact.name, yearOfBirth: contact.yearOfBirth }}
        onPopOut={popOut}
        onClose={() => onClose()}
        onSent={() => {
          window.dispatchEvent(new CustomEvent(PATIENT_MAIL_SENT_EVENT, { detail: { uhid: contact.uhid } }));
          onClose();
        }}
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: PANEL_Z }} role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/30" onClick={ready ? undefined : onClose} aria-hidden="true" />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
        {body}
      </div>
    </div>,
    document.body,
  );
};

const Notice = ({ children }) => (
  <div className="m-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> <p>{children}</p>
  </div>
);

export default PatientEmailPanel;
