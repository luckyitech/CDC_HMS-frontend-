import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search, RefreshCw, Settings, AlertTriangle, PenSquare, Trash2 } from 'lucide-react';
import mailService, { announceMailChange, MAIL_STATE_EVENT } from '../../services/mailService';
import useDebounce from '../../hooks/useDebounce';
import { notify } from '../../utils/notify';
import MailSetupCard from './MailSetupCard';
import EmailSettingsPanel from './EmailSettingsPanel';
import FolderRail from './FolderRail';
import MessageList from './MessageList';
import ReadingPane from './ReadingPane';
import Composer from './Composer';
import EmptyTrashDialog from './EmptyTrashDialog';
import { errorCode } from './mailFormat';

/**
 * My mail — the signed-in user's OWN clinic mailbox (Staff Email, B26),
 * a tab of the Inbox. Read live from the provider; the HMS keeps no copy.
 *
 * Not connected → the guided setup card. Connected → folders · list · reading
 * pane (one pane at a time on phones). The gear opens the user's own email
 * settings. Phase 2 adds the Composer (new / reply / reply all / forward /
 * continue a draft), which opens in place of the reading pane.
 */
const MailTab = ({ openRequest = null, onOpenHandled = () => {} }) => {
  const [state, setState] = useState(null);           // { account, setup }
  const [showSettings, setShowSettings] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const res = await mailService.getAccount();
      setState(res.data);
    } catch (err) {
      setState({ account: null, setup: null, error: err?.message || 'Could not load your email settings.' });
    }
  }, []);
  useEffect(() => { loadAccount(); }, [loadAccount]);

  const setAccount = (account) => { setState((s) => ({ ...s, account })); announceMailChange(); };

  if (!state) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  if (state.error) return <p className="py-16 text-center text-sm text-red-600">{state.error}</p>;

  const { account, setup } = state;
  if (!account || account.status === 'disconnected') {
    return <MailSetupCard setup={setup} onConnected={(a) => { setAccount(a); notify('success', 'Your mailbox is connected.'); }} />;
  }
  // The provider refused the saved password twice (changed on webmail?) — the
  // HMS has stopped trying. Ask for it again before showing a broken inbox.
  if (account.status === 'needs_password' && !showSettings) {
    return <MailSetupCard setup={setup} account={account} reconnect onConnected={(a) => { setAccount(a); notify('success', 'Reconnected.'); }} />;
  }
  if (showSettings) {
    return <EmailSettingsPanel account={account} setup={setup} onChange={setAccount} onClose={() => setShowSettings(false)} />;
  }
  return (
    <MailApp
      account={account}
      onOpenSettings={() => setShowSettings(true)}
      onAccountChange={setAccount}
      onNeedsPassword={loadAccount}
      domains={setup?.domains || []}
      openRequest={openRequest}
      onOpenHandled={onOpenHandled}
    />
  );
};

const MailApp = ({ account, onOpenSettings, onAccountChange, onNeedsPassword, domains, openRequest, onOpenHandled }) => {
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState('INBOX');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 400);
  const [list, setList] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [open, setOpen] = useState(null);            // full message
  const [openUid, setOpenUid] = useState(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [problem, setProblem] = useState(null);
  const [compose, setCompose] = useState(null);      // the Composer's starting state, or null
  const [composeBusy, setComposeBusy] = useState(null);
  const [selected, setSelected] = useState(() => new Set());   // UIDs ticked on this page
  const [organiseBusy, setOrganiseBusy] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const listReq = useRef(0);

  const handleError = useCallback((err, fallback) => {
    const code = errorCode(err);
    if (code === 'NEEDS_PASSWORD' || code === 'NOT_CONNECTED') { onNeedsPassword(); return; }
    setProblem(err?.message || fallback);
  }, [onNeedsPassword]);

  const loadFolders = useCallback(async () => {
    try {
      const res = await mailService.folders();
      setFolders(res.data.folders || []);
    } catch (err) { handleError(err, 'Could not load your folders.'); }
  }, [handleError]);

  const loadList = useCallback(async () => {
    const mine = ++listReq.current;
    setListLoading(true);
    try {
      const res = await mailService.messages({ folder, page, q });
      if (mine === listReq.current) { setList(res.data); setProblem(null); }
    } catch (err) {
      if (mine === listReq.current) handleError(err, 'Could not load your messages.');
    } finally {
      if (mine === listReq.current) setListLoading(false);
    }
  }, [folder, page, q, handleError]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadList(); }, [loadList]);
  // A search or a folder switch starts from the first page.
  useEffect(() => { setPage(1); }, [q, folder]);
  // A different page / folder / search is a different set of rows — ticks don't carry over.
  useEffect(() => { setSelected(new Set()); }, [folder, page, q]);

  // Live (phase 3b): MainLayout re-broadcasts the server's INBOX watcher every
  // 30 s. When the unread count or the newest unread message changes, refresh
  // the folder counts, and the list if it is the first page of the Inbox (not
  // mid-search, not mid-selection — rows must not jump under a tick).
  const lastState = useRef(null);
  const liveView = useRef({});
  liveView.current = { folder, page, q, selecting: selected.size > 0 };
  useEffect(() => {
    const onState = (e) => {
      const s = e.detail || {};
      if (!s.connected) return;
      const sig = `${s.unread}|${s.latest ? `${s.latest.uidValidity}:${s.latest.uid}` : ''}`;
      if (lastState.current === null) { lastState.current = sig; return; }
      if (sig === lastState.current) return;
      lastState.current = sig;
      loadFolders();
      const v = liveView.current;
      if (v.folder === 'INBOX' && v.page === 1 && !v.q && !v.selecting) loadList();
    };
    window.addEventListener(MAIL_STATE_EVENT, onState);
    // Slow safety net for the other folders (Sent after sending elsewhere, etc.).
    const t = setInterval(() => { loadFolders(); }, 3 * 60 * 1000);
    return () => { window.removeEventListener(MAIL_STATE_EVENT, onState); clearInterval(t); };
  }, [loadFolders, loadList]);

  const current = folders.find((f) => f.path === folder);
  const bumpUnseen = (delta) => {
    setFolders((fs) => fs.map((f) => (f.path === folder ? { ...f, unseen: Math.max(0, (f.unseen || 0) + delta) } : f)));
    announceMailChange();
  };

  /** Open the Composer: new, or built from a message (reply / reply all / forward / a draft). */
  const startCompose = async (mode, uid = null) => {
    if (compose) { notify('info', 'Send or close the message you are writing first.'); return; }
    if (mode === 'new') { setCompose({ mode: 'new', key: Date.now() }); return; }
    setComposeBusy(mode);
    try {
      const res = await mailService.composeContext(uid, folder, mode);
      setCompose({ ...res.data, key: Date.now() });
    } catch (err) {
      handleError(err, 'Could not open that message to reply.');
    } finally {
      setComposeBusy(null);
    }
  };

  const closeCompose = (changed) => {
    setCompose(null);
    if (changed) { loadFolders(); loadList(); }
  };

  const openMessage = async (item) => {
    // One message at a time: the Composer is never swapped out from under
    // unsaved work — closing it (the X) keeps a draft.
    if (compose) { notify('info', 'Send or close the message you are writing first.'); return; }
    // A draft opens straight into the Composer to carry on writing.
    if (current?.special === 'drafts') {
      setOpen(null); setOpenUid(item.uid);
      await startCompose('draft', item.uid);
      return;
    }
    setOpenUid(item.uid);
    setMsgLoading(true);
    try {
      const res = await mailService.message(item.uid, folder);
      setOpen(res.data);
      if (!item.seen) {
        setList((l) => ({ ...l, messages: l.messages.map((m) => (m.uid === item.uid ? { ...m, seen: true } : m)) }));
        bumpUnseen(-1);
      }
    } catch (err) {
      setOpen(null);
      handleError(err, 'Could not open that message.');
    } finally {
      setMsgLoading(false);
    }
  };

  const markUnread = async (msg) => {
    try {
      await mailService.setSeen(folder, [msg.uid], false);
      setList((l) => ({ ...l, messages: l.messages.map((m) => (m.uid === msg.uid ? { ...m, seen: false } : m)) }));
      bumpUnseen(+1);
      setOpen(null); setOpenUid(null);
    } catch (err) { handleError(err, 'Could not mark it unread.'); }
  };

  const trustSender = async (address) => {
    try {
      const res = await mailService.updatePreferences({ trustedImageSenders: [...(account.trustedImageSenders || []), address] });
      onAccountChange(res.data.account);
    } catch (err) { notify('error', err?.message || 'Could not save that.'); }
  };

  // -------------------------------------------------------------------------
  // Phase 3b — organise. Optimistic: rows leave the list (or change) at once;
  // if the server refuses, the list is reloaded and the reason shown. Delete
  // is always "move to Trash"; nothing here is permanent (Empty Trash is).
  // -------------------------------------------------------------------------
  const LEAVES = { move: true, archive: true, trash: true, restore: true };
  const DONE = {
    archive: (n) => `${n === 1 ? 'Message' : `${n} messages`} archived`,
    trash: (n) => `${n === 1 ? 'Message' : `${n} messages`} moved to Trash`,
    restore: (n) => `${n === 1 ? 'Message' : `${n} messages`} restored to Inbox`,
  };
  const organise = async (action, uids, opts = {}) => {
    if (!uids.length || organiseBusy) return;
    const before = list;
    const unseenLeaving = (list?.messages || []).filter((m) => uids.includes(m.uid) && !m.seen).length;
    setOrganiseBusy(true);
    // Optimistic update.
    if (LEAVES[action]) {
      setList((l) => (l ? { ...l, total: Math.max(0, l.total - uids.length), messages: l.messages.filter((m) => !uids.includes(m.uid)) } : l));
      if (uids.includes(openUid)) { setOpen(null); setOpenUid(null); }
    } else if (action === 'flag') {
      setList((l) => (l ? { ...l, messages: l.messages.map((m) => (uids.includes(m.uid) ? { ...m, flagged: !!opts.flagged } : m)) } : l));
      setOpen((o) => (o && uids.includes(o.uid) ? { ...o, flagged: !!opts.flagged } : o));
    } else if (action === 'seen') {
      setList((l) => (l ? { ...l, messages: l.messages.map((m) => (uids.includes(m.uid) ? { ...m, seen: !!opts.seen } : m)) } : l));
    }
    setSelected(new Set());
    try {
      if (action === 'move') await mailService.move(folder, uids, opts.to);
      else if (action === 'archive') await mailService.archive(folder, uids);
      else if (action === 'trash') await mailService.trash(folder, uids);
      else if (action === 'restore') await mailService.restore(folder, uids);
      else if (action === 'flag') await mailService.flag(folder, uids, !!opts.flagged);
      else if (action === 'seen') await mailService.setSeen(folder, uids, !!opts.seen);
      if (action === 'move') notify('success', `${uids.length === 1 ? 'Message' : `${uids.length} messages`} moved to ${opts.name || opts.to}`);
      else if (DONE[action]) notify('success', DONE[action](uids.length));
      if (LEAVES[action] || action === 'seen') {
        if (LEAVES[action] && unseenLeaving) bumpUnseen(-unseenLeaving);
        loadFolders();
        announceMailChange();
      }
    } catch (err) {
      setList(before);
      handleError(err, 'That didn\'t work. Your mailbox is unchanged.');
      loadList();
    } finally {
      setOrganiseBusy(false);
    }
  };

  const toggle = (uid) => setSelected((s) => { const n = new Set(s); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  const toggleAll = () => setSelected((s) => (s.size ? new Set() : new Set((list?.messages || []).map((m) => m.uid))));

  // The toast's "Open" (Inbox page): show INBOX and open that message.
  // Phase 4: { draft: true } — a message begun on a patient file, saved as a
  // draft and handed over ("Open in My mail"): continue it in the Composer.
  useEffect(() => {
    if (!openRequest || compose) return;
    onOpenHandled();
    if (openRequest.draft) {
      const draftFolder = openRequest.folder || folder;
      if (openRequest.folder && folder !== openRequest.folder) { setFolder(openRequest.folder); setSearch(''); }
      setComposeBusy('draft');
      mailService.composeContext(openRequest.uid, draftFolder, 'draft')
        .then((res) => setCompose({ ...res.data, draftFolder, key: Date.now() }))
        .catch((err) => handleError(err, 'Could not open that draft. It is in your Drafts folder.'))
        .finally(() => setComposeBusy(null));
      return;
    }
    if (folder !== 'INBOX') { setFolder('INBOX'); setSearch(''); }
    setOpenUid(openRequest.uid);
    setMsgLoading(true);
    mailService.message(openRequest.uid, 'INBOX')
      .then((res) => { setOpen(res.data); announceMailChange(); loadList(); })
      .catch((err) => { setOpen(null); setOpenUid(null); handleError(err, 'Could not open that message.'); })
      .finally(() => setMsgLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  const selectFolder = (path) => { setFolder(path); setOpen(null); setOpenUid(null); };
  const paneOpen = !!(openUid || compose);

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[26rem] flex-col overflow-hidden rounded-lg border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <div className="relative min-w-[10rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${current?.name || 'mail'}`}
            className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          type="button" onClick={() => startCompose('new')} disabled={account.status !== 'connected'}
          aria-label="New message" title="New message"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <PenSquare className="h-4 w-4" /> <span className="hidden sm:inline">New message</span>
        </button>
        <span className="hidden truncate text-xs text-gray-500 sm:inline" title="Your mailbox">{account.emailAddress}</span>
        <button type="button" onClick={() => { loadFolders(); loadList(); }} className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Refresh" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
        </button>
        <button type="button" onClick={onOpenSettings} className="rounded p-2 text-gray-500 hover:bg-gray-100" aria-label="Email settings" title="Email settings">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {account.status !== 'connected' && (
        <div className="flex items-center justify-between gap-2 border-b bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Your mailbox needs its password again.</span>
          <button type="button" onClick={onOpenSettings} className="font-semibold hover:underline">Reconnect</button>
        </div>
      )}
      {problem && (
        <div className="flex items-center justify-between gap-2 border-b bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{problem}</span>
          <button type="button" onClick={() => { setProblem(null); loadFolders(); loadList(); }} className="font-semibold hover:underline">Try again</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <FolderRail folders={folders} active={folder} onSelect={selectFolder} />
        <div className="flex min-h-0 flex-1">
          <div className={`w-full flex-col border-r md:w-80 md:flex-shrink-0 ${paneOpen ? 'hidden md:flex' : 'flex'}`}>
            {current?.special === 'trash' && (list?.total || 0) > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Your mailbox keeps no backup — emptying Trash is permanent.
                </span>
                <button
                  type="button" onClick={() => setEmptying(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 font-semibold text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Empty Trash
                </button>
              </div>
            )}
            <MessageList
              data={list} loading={listLoading} activeUid={openUid} onOpen={openMessage}
              onPage={setPage} special={current?.special} query={q}
              selected={selected} onToggle={toggle} onToggleAll={toggleAll} onClearSelection={() => setSelected(new Set())}
              onBulk={(action, opts) => organise(action, [...selected], opts)}
              folders={folders} folder={folder} busy={organiseBusy}
            />
          </div>
          <div className={`min-w-0 flex-1 ${paneOpen ? 'flex' : 'hidden md:flex'}`}>
            {compose ? (
              <Composer
                key={compose.key}
                account={account} domains={domains} init={compose}
                onClose={(changed) => { if (current?.special === 'drafts') setOpenUid(null); closeCompose(changed); }}
                onSent={() => { if (current?.special === 'drafts') setOpenUid(null); closeCompose(true); }}
              />
            ) : (
              <ReadingPane
                key={openUid || 'none'}
                message={open} loading={msgLoading || (composeBusy === 'draft')} folder={folder} account={account}
                onBack={() => { setOpen(null); setOpenUid(null); }}
                onMarkUnread={markUnread} onTrustSender={trustSender}
                onCompose={(mode) => startCompose(mode, open?.uid)} composeBusy={composeBusy}
                special={current?.special} folders={folders}
                onOrganise={(action, opts) => organise(action, [open.uid], opts)} organiseBusy={organiseBusy}
              />
            )}
          </div>
        </div>
      </div>
      <EmptyTrashDialog
        isOpen={emptying}
        onClose={() => setEmptying(false)}
        onEmptied={(n) => {
          setEmptying(false);
          notify('success', `Trash emptied — ${n} message${n === 1 ? '' : 's'} deleted`);
          setOpen(null); setOpenUid(null);
          loadFolders(); loadList();
        }}
      />
    </div>
  );
};

export default MailTab;
