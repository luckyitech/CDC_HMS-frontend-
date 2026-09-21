import { Search, Pin, FlaskConical, User } from 'lucide-react';
import { fmtRelative } from './inboxHelpers';

// "All" is the everyday default and stays a one-tap button; the narrower filters
// live in a dropdown beside it so the list header stays a single tidy row.
const MORE_FILTERS = [
  ['unread', 'Unread'], ['needsReply', 'Needs reply'], ['openQueries', 'Open queries'],
  ['unlinked', 'Unlinked'], ['mine', 'Mine'], ['escalatedToMe', 'Escalated'], ['labs', 'Labs'], ['closed', 'Closed'],
];

const initials = (c) => {
  const n = (c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : c.profileName || c.displayNumber || '?').trim();
  return n.split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
};

const ConversationList = ({ conversations, activeId, onSelect, filter, setFilter, search, setSearch, loading }) => (
  <div className="flex h-full flex-col border-r bg-white">
    <div className="border-b p-2">
      <div className="relative">
        <Search size={15} className="absolute left-2 top-2.5 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, number, topic…" className="w-full rounded-lg border-gray-300 pl-7 text-sm" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${filter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All
        </button>
        <select
          value={filter === 'all' ? '' : filter}
          onChange={(e) => setFilter(e.target.value || 'all')}
          className={`flex-1 rounded-full border px-2.5 py-1 text-xs ${filter !== 'all' ? 'border-emerald-600 text-emerald-700 font-medium' : 'border-gray-300 text-gray-600'}`}
        >
          <option value="">Filter…</option>
          {MORE_FILTERS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      {loading && <div className="p-4 text-center text-sm text-gray-400">Loading…</div>}
      {!loading && conversations.length === 0 && <div className="p-6 text-center text-sm text-gray-400">No conversations here.</div>}
      {conversations.map((c) => {
        const name = c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : c.profileName || c.displayNumber;
        const active = c.id === activeId;
        return (
          <button key={c.id} type="button" onClick={() => onSelect(c)} className={`flex w-full items-start gap-2 border-b px-3 py-2 text-left hover:bg-gray-50 ${active ? 'bg-emerald-50' : ''}`}>
            <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${c.contactType === 'patient' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
              {c.contactType === 'patient' ? initials(c) : <FlaskConical size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                {c.pinned && <Pin size={11} className="text-amber-500" />}
                <span className="truncate font-medium text-gray-800">{name}</span>
                {!c.patient && c.contactType === 'patient' && <User size={11} className="text-gray-400" title="Not linked to a patient" />}
                <span className="ml-auto text-[11px] text-gray-400">{fmtRelative(c.lastMessageAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="truncate text-xs text-gray-500">{c.lastMessagePreview || '…'}</span>
                {c.unreadCount > 0 && <span className="ml-auto rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">{c.unreadCount}</span>}
              </div>
              <div className="mt-0.5 flex gap-1">
                {c.topic && <span className="rounded bg-blue-50 px-1 text-[10px] text-blue-600">{c.topic}</span>}
                {c.openQueryCount > 0 && <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-700">{c.openQueryCount} query</span>}
                {c.contactType !== 'patient' && <span className="rounded bg-purple-50 px-1 text-[10px] text-purple-600">{c.organisation?.name || c.contactType}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default ConversationList;
