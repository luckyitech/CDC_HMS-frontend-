import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraftContext } from '../../contexts/DraftContext';
import DraftChecklistModal from './DraftChecklistModal';

/**
 * Leaving a patient file with drafts typed on this visit to the file → one
 * reminder (Emu, 6 Oct). Nothing is ever lost by leaving — the drafts are
 * already on the server — so this is a nudge, not a lock:
 *   - an in-app link (any <a>, or a sidebar entry) to somewhere outside this file shows
 *     the list with "Stay and review" / "Leave — keep the drafts";
 *   - refreshing or closing the tab gets the browser's own "Leave site?".
 * Only drafts saved since the file was opened count, so an old draft does not
 * nag on every visit (it lives on My drafts and the file's chip instead).
 */
const DraftLeaveGuard = ({ uhid, patientName, onOpen }) => {
  const ctx = useDraftContext();
  const navigate = useNavigate();
  // When this file was opened (the parent remounts the guard per patient).
  const [since] = useState(() => new Date());
  const [target, setTarget] = useState(null);

  const fresh = ctx ? ctx.draftsFor(uhid, { since }) : [];
  const freshRef = useRef(fresh);
  useEffect(() => { freshRef.current = fresh; });

  // In-app links: capture phase, before the router handles the click.
  useEffect(() => {
    const onClick = (e) => {
      if (!freshRef.current.length) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // A plain link, or a sidebar button (MainLayout marks them data-nav-path).
      const a = e.target.closest?.('a[href], [data-nav-path]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.getAttribute('data-nav-path') || a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Still inside this patient's file (another tab of it) — not leaving.
      if (uhid && url.pathname.includes(`/${uhid}`)) return;
      e.preventDefault();
      e.stopPropagation();
      setTarget(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [uhid]);

  // Refresh / close the tab.
  useEffect(() => {
    if (!fresh.length) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [fresh.length]);

  const where = target ? target.split('/').filter(Boolean).slice(1, 2)[0] : '';
  const whereLabel = where ? where.replace(/-/g, ' ') : 'another page';

  return (
    <DraftChecklistModal
      isOpen={!!target}
      drafts={fresh}
      title={`Leave ${patientName || 'this patient'}'s file?`}
      intro={`You're going to ${whereLabel}. ${fresh.length === 1 ? 'One draft here has' : `${fresh.length} drafts here have`} not been saved to the record. Nothing is lost if you leave — drafts stay on your My drafts list for 14 days.`}
      continueLabel="Leave — keep the drafts"
      onContinue={() => { const t = target; setTarget(null); navigate(t); }}
      onOpen={(entry) => { setTarget(null); onOpen?.(entry); }}
      onClose={() => setTarget(null)}
      backLabel="Stay and review"
    />
  );
};

export default DraftLeaveGuard;
