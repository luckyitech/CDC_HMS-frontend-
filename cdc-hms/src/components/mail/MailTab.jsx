import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Search, RefreshCw, Settings, AlertTriangle, PenSquare } from 'lucide-react';
import mailService, { announceMailChange } from '../../services/mailService';
import useDebounce from '../../hooks/useDebounce';
import { notify } from '../../utils/notify';
import MailSetupCard from './MailSetupCard';
import EmailSettingsPanel from './EmailSettingsPanel';
import FolderRail from './FolderRail';
import MessageList from './MessageList';
import ReadingPane from './ReadingPane';
import Composer from './Composer';
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
const MailTab = () => {
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
    />
  );
};

const MailApp = ({ account, onOpenSettings, onAccountChange, onNeedsPassword, domains }) => {
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
  // Light refresh while the tab is open; the IDLE push arrives in phase 3.
  useEffect(() => {
    const t = setInterval(() => { loadFolders(); if (page === 1 && !q) loadList(); }, 90_000);
    return () => clearInterval(t);
  }, [loadFolders, loadList, page, q]);

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
          <div className={`w-full border-r md:w-80 md:flex-shrink-0 ${paneOpen ? 'hidden md:block' : 'block'}`}>
            <MessageList
              data={list} loading={listLoading} activeUid={openUid} onOpen={openMessage}
              onPage={setPage} special={current?.special} query={q}
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
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailTab;
