import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Info } from 'lucide-react';

/**
 * My profile — the to-do list (mockup 4): an expiring licence or document, a
 * leave request waiting on me or on an approver, changes waiting for HR.
 * The items come from the server (GET /api/hr/me → todo, utils/profileChange
 * todoItems); this only draws them.
 */
const ICON = { bad: AlertTriangle, warn: Clock, info: Info };
const TONE = { bad: 'text-red-700', warn: 'text-amber-700', info: 'text-blue-700' };

const SelfTodo = ({ items = [], onGo }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5" data-testid="self-todo">
    <h3 className="text-sm font-semibold text-gray-800 mb-3">To do</h3>
    {items.length === 0 ? (
      <p className="text-sm text-gray-500">Nothing needs your attention.</p>
    ) : (
      <ul className="space-y-2">
        {items.map((it, i) => {
          const Icon = ICON[it.tone] || Info;
          const inner = (
            <span className="flex items-start gap-2">
              <Icon className={`w-4 h-4 mt-0.5 flex-none ${TONE[it.tone] || ''}`} />
              <span className="text-gray-800">{it.text}</span>
            </span>
          );
          return (
            <li key={`${it.kind}-${i}`} className="text-sm">
              {it.link?.startsWith('?')
                ? <button type="button" className="text-left hover:underline" onClick={() => onGo?.(it.link)}>{inner}</button>
                : it.link ? <Link to={it.link} className="hover:underline">{inner}</Link> : inner}
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export default SelfTodo;
