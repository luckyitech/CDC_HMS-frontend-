import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * AccordionPanel — reusable collapsible section used in Consultation and Visit History.
 * Props:
 *   icon     — Lucide component class (not an element)
 *   label    — string header text
 *   badge    — optional JSX shown after the label (status chips, record counts, etc.)
 *   isOpen   — boolean
 *   onToggle — () => void
 *   padding  — Tailwind padding class for the body (default "p-4")
 *   children — body content
 */
const AccordionPanel = ({ icon, label, badge, isOpen, onToggle, padding = 'p-4', children }) => {
  const Icon = icon;
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isOpen ? 'text-primary' : 'text-gray-400'}`} />
          <span className={`font-semibold ${isOpen ? 'text-primary' : 'text-gray-800'}`}>{label}</span>
          {badge}
        </div>
        {isOpen
          ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        }
      </button>
      <div className={isOpen ? 'block' : 'hidden'}>
        <div className={`border-t border-gray-100 ${padding}`}>{children}</div>
      </div>
    </div>
  );
};

export default AccordionPanel;
