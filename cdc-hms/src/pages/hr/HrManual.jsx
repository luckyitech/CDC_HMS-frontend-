import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Search, X, Printer, ChevronLeft, ChevronRight, ListChecks, BookOpen } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import { isHrStaff } from '../../utils/permissions';
import hrChecklistService from '../../services/hrChecklistService';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import { notify } from '../../utils/notify';
import { buttonCls, inputCls } from '../../components/hr/hrUi';
import { Blocks, Inline, ManualPrintContext } from '../../components/hr/manual/ManualBlocks';
import ManualChecklist from '../../components/hr/manual/ManualChecklist';
import { buildSearchIndex, searchManual, snippetOf, highlightParts } from '../../components/hr/manual/manualFormat';
import { MANUAL_TABS, CHECKLIST_SECTIONS, MANUAL_BUILT_AT } from '../../components/hr/manual/manualContent';
import '../../components/hr/manual/manual.css';

/**
 * HrManual — /hr/manual. The HR Suite Manual (the 13-tab Claude Doc, built
 * into src/components/hr/manual/manualContent.js by
 * scripts/build-hr-manual.mjs) and the clinic's ONE shared HR checklist.
 *
 * HR staff only: isHrStaff (at least one HR Suite control beyond
 * Self-service) — the same rule the sidebar item and the API use.
 *
 * ?tab=<slug>|checklist picks the view; search covers every tab and jumps to
 * the block; pictures open full size; Print prints the current tab only.
 */

const CHECKLIST = 'checklist';
const tabBySlug = Object.fromEntries(MANUAL_TABS.map((t) => [t.slug, t]));
const SEARCH_INDEX = buildSearchIndex(MANUAL_TABS);

const Highlight = ({ text, query }) => highlightParts(text, query)
  .map((p, i) => (p.hit ? <mark key={i} className="rounded bg-yellow-200 px-0.5 text-gray-900">{p.text}</mark> : <span key={i}>{p.text}</span>));

const Lightbox = ({ image, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true"
      aria-label={image.alt} onClick={onClose}>
      <button type="button" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close" onClick={onClose}>
        <X className="h-5 w-5" />
      </button>
      <img src={image.src} alt={image.alt} className={`max-h-[88vh] max-w-[96vw] rounded shadow-2xl ${image.t === 'diagram' ? 'bg-white p-4' : ''}`}
        onClick={(e) => e.stopPropagation()} />
      <p className="mt-3 max-w-3xl text-center text-sm text-gray-200">{image.caption ? <Inline nodes={image.caption} /> : image.alt}</p>
    </div>,
    document.body,
  );
};

const HrManual = () => {
  const { currentUser } = useUserContext();
  const allowed = isHrStaff(currentUser);
  const [params, setParams] = useSearchParams();
  const view = params.get('tab') === CHECKLIST || tabBySlug[params.get('tab')] ? params.get('tab') : MANUAL_TABS[0].slug;
  const tab = tabBySlug[view];

  const [query, setQuery] = useState('');
  const [image, setImage] = useState(null);
  const [printing, setPrinting] = useState(false);
  const [data, setData] = useState(null);          // { byKey, items, events }
  const [busyKey, setBusyKey] = useState(null);
  const pendingScroll = useRef(null);              // element id to scroll to after a view change
  const contentRef = useRef(null);

  // ---- the shared checklist ----
  const load = useCallback(async () => {
    try {
      const res = await hrChecklistService.list();
      const items = res?.data?.items || [];
      setData({ items, events: res?.data?.events || [], byKey: Object.fromEntries(items.map((i) => [i.key, i])) });
    } catch (e) { notify('error', e?.message || 'Could not load the checklist'); setData({ items: [], events: [], byKey: {} }); }
  }, []);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const merge = (item) => setData((d) => {
    const items = d.items.some((i) => i.key === item.key) ? d.items.map((i) => (i.key === item.key ? item : i)) : [...d.items, item];
    return { ...d, items, byKey: { ...d.byKey, [item.key]: item } };
  });
  // After a change, the history is re-read so it shows who did what, with names.
  const refreshEvents = async () => {
    try { const res = await hrChecklistService.list(); if (res?.data) setData((d) => ({ ...d, events: res.data.events })); } catch { /* the tick itself is saved */ }
  };
  const act = async (key, call, failMsg) => {
    setBusyKey(key);
    try {
      const res = await call();
      if (!res?.success) { notify('error', res?.message || failMsg); return false; }
      merge(res.data);
      refreshEvents();
      return true;
    } catch (e) { notify('error', e?.message || failMsg); return false; } finally { setBusyKey(null); }
  };
  const onToggle = (key, done) => act(key, () => hrChecklistService.setDone(key, done), 'Could not save the tick');
  const onNote = (key, note) => act(key, () => hrChecklistService.setNote(key, note), 'Could not save the note');
  const onStatus = (key, status) => act(key, () => hrChecklistService.setStatus(key, status), 'Could not change the item');
  const onAdd = async (section, label) => {
    const ok = await act(`add-${section}`, () => hrChecklistService.addItem(section, label), 'Could not add the item');
    if (ok) notify('success', 'Added to the checklist.');
    return ok;
  };
  const checklistCtx = data ? { byKey: data.byKey, onToggle, busyKey } : null;

  // ---- navigation ----
  const go = useCallback((slug, targetId = null) => {
    pendingScroll.current = targetId;
    setParams((p) => { const n = new URLSearchParams(p); n.set('tab', slug); return n; });
    if (!targetId) contentRef.current?.scrollIntoView({ block: 'start' });
  }, [setParams]);
  const onLink = useCallback((slug) => { if (tabBySlug[slug]) go(slug); }, [go]);

  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.remove('hr-manual-flash');
      void el.offsetWidth;   // restart the animation
      el.classList.add('hr-manual-flash');
    });
  }, [view]);

  const results = useMemo(() => (query.trim().length >= 2 ? searchManual(SEARCH_INDEX, query) : []), [query]);
  const openResult = (r) => { setQuery(''); go(r.tab, `m-${r.tab}-${r.index}`); };

  // ---- print: only the current tab (or the checklist) ----
  const print = async () => {
    flushSync(() => setPrinting(true));
    const imgs = [...document.querySelectorAll('.hr-manual-print-root img')];
    await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = r; img.onerror = r; }))));
    window.print();
    setPrinting(false);
  };
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after); };
  }, []);

  if (!allowed) {
    return (
      <div className="p-4">
        <PageHeader title="HR Suite manual" />
        <p className="text-sm text-gray-500">The manual is for HR staff. Ask whoever runs the HR Suite if your job needs it.</p>
      </div>
    );
  }

  const index = tab ? MANUAL_TABS.indexOf(tab) : -1;
  const prev = index > 0 ? MANUAL_TABS[index - 1] : null;
  const next = index >= 0 && index < MANUAL_TABS.length - 1 ? MANUAL_TABS[index + 1] : null;
  const doneCount = data ? CHECKLIST_SECTIONS.flatMap((s) => s.items).filter((i) => data.byKey[i.key]?.done).length
    + data.items.filter((i) => i.isCustom && i.status === 'active' && i.done).length : 0;
  const totalCount = CHECKLIST_SECTIONS.reduce((n, s) => n + s.items.length, 0)
    + (data ? data.items.filter((i) => i.isCustom && i.status === 'active').length : 0);

  const tabContent = (t, withIds) => (
    <article className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Tab {t.n} of {MANUAL_TABS.length}</p>
      <h2 className="mt-0.5 text-xl font-bold text-gray-900">{t.heading}</h2>
      <Blocks blocks={t.blocks} onLink={onLink} onImage={setImage} checklist={checklistCtx} idPrefix={withIds ? `m-${t.slug}` : undefined} />
    </article>
  );
  const checklistView = data ? (
    <ManualChecklist sections={CHECKLIST_SECTIONS} data={data} busyKey={busyKey} onToggle={onToggle} onNote={onNote}
      onAdd={onAdd} onStatus={onStatus} onLink={onLink} onOpenSection={(s) => go(s.tab, s.anchor)} />
  ) : <div className="py-10"><Spinner /></div>;

  return (
    <div className="p-4 max-w-7xl">
      <PageHeader
        title="HR Suite manual"
        subtitle="How to run every part of the HR Suite, and the HR team's shared checklist"
        actions={(
          <button type="button" className={`${buttonCls} inline-flex items-center gap-1.5`} onClick={print}>
            <Printer className="h-3.5 w-3.5" /> Print {view === CHECKLIST ? 'checklist' : 'this tab'}
          </button>
        )}
      />

      {/* Search across every tab */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="search" aria-label="Search the manual" className={`${inputCls} pl-9`} value={query}
          onChange={(e) => setQuery(e.target.value)} placeholder="Search the manual — a button, a message, a word on screen"
          onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) openResult(results[0]); if (e.key === 'Escape') setQuery(''); }} />
        {query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="sticky top-0 border-b border-gray-100 bg-white px-3 py-1.5 text-[11px] text-gray-500">
              {results.length ? `${results.length}${results.length === 60 ? '+' : ''} match${results.length === 1 ? '' : 'es'}` : 'Nothing found'}
            </div>
            <ul>
              {results.map((r, i) => (
                <li key={`${r.tab}-${r.index}-${i}`}>
                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none" onClick={() => openResult(r)}>
                    <span className="block text-[11px] font-semibold text-primary">{r.tabTitle}{r.heading && r.heading !== r.text ? ` › ${r.heading}` : ''}</span>
                    <span className="block text-sm text-gray-700"><Highlight text={snippetOf(r.text, query)} query={query} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Tabs: a list on wide screens, a picker on narrow ones */}
        <nav aria-label="Manual tabs" className="lg:sticky lg:top-4 lg:w-60 lg:flex-none">
          <select aria-label="Manual tab" className={`${inputCls} lg:hidden`} value={view} onChange={(e) => go(e.target.value)}>
            <option value={CHECKLIST}>✓ HR checklist ({doneCount}/{totalCount})</option>
            {MANUAL_TABS.map((t) => <option key={t.slug} value={t.slug}>{t.n}. {t.title}</option>)}
          </select>
          <div className="hidden rounded-xl border border-gray-200 bg-white p-2 lg:block">
            <button type="button" onClick={() => go(CHECKLIST)} aria-current={view === CHECKLIST ? 'page' : undefined}
              className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold ${view === CHECKLIST ? 'bg-primary text-white' : 'text-gray-800 hover:bg-gray-50'}`}>
              <ListChecks className="h-4 w-4 flex-none" />
              <span className="flex-1">HR checklist</span>
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${view === CHECKLIST ? 'bg-white/20' : 'bg-green-50 text-green-700'}`}>{doneCount}/{totalCount}</span>
            </button>
            <div className="my-1 border-t border-gray-100" />
            <p className="flex items-center gap-1.5 px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><BookOpen className="h-3.5 w-3.5" /> Manual</p>
            <ol className="space-y-0.5">
              {MANUAL_TABS.map((t) => (
                <li key={t.slug}>
                  <button type="button" onClick={() => go(t.slug)} aria-current={view === t.slug ? 'page' : undefined}
                    className={`flex w-full gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${view === t.slug ? 'bg-blue-50 font-semibold text-primary' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span className="w-5 flex-none text-right tabular-nums text-gray-400">{t.n}.</span>
                    <span>{t.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="px-2.5 pt-2 text-[10px] text-gray-400">Built {MANUAL_BUILT_AT} from the HR Suite Manual doc.</p>
          </div>
        </nav>

        <main ref={contentRef} className="min-w-0 flex-1 scroll-mt-4">
          {view === CHECKLIST ? checklistView : (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-5 lg:px-8">
              {tabContent(tab, true)}
              <div className="mt-10 flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
                {prev ? <button type="button" className={`${buttonCls} inline-flex items-center gap-1`} onClick={() => go(prev.slug)}><ChevronLeft className="h-3.5 w-3.5" /> {prev.n}. {prev.title}</button> : <span />}
                {next ? <button type="button" className={`${buttonCls} inline-flex items-center gap-1`} onClick={() => go(next.slug)}>{next.n}. {next.title} <ChevronRight className="h-3.5 w-3.5" /></button> : <span />}
              </div>
            </div>
          )}
        </main>
      </div>

      {image && <Lightbox image={image} onClose={() => setImage(null)} />}

      {printing && createPortal(
        <div className="hr-manual-print-root">
          <ManualPrintContext.Provider value>
            <p className="text-[10px] text-gray-500">CDC HMS · HR Suite manual</p>
            {view === CHECKLIST ? checklistView : tabContent(tab, false)}
          </ManualPrintContext.Provider>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default HrManual;
