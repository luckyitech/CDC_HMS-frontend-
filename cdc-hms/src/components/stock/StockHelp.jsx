import { useState } from "react";
import { Info } from "lucide-react";
import Modal from "../shared/Modal";
import { STOCK_HELP } from "../../constants/stockHelp";

// The small round "i" in each Stocks tab's own section (13 Oct 2026, Emu): what
// that tab is for, what everything in it means, and how to put mistakes right.
// The icon's own circle is the only outline. Content: constants/stockHelp.js.
const StockHelp = ({ tab }) => {
  const [open, setOpen] = useState(false);
  const help = STOCK_HELP[tab];
  if (!help) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`About ${help.title}`}
        aria-label={`About the ${help.title} tab`}
        className="rounded-full text-primary shrink-0 ui-hover p-0.5 ml-auto"
      >
        <Info className="w-6 h-6" strokeWidth={2} />
      </button>
      {open && (
        <Modal isOpen onClose={() => setOpen(false)} title={help.title} size="lg">
          <p className="text-sm text-gray-700 mb-5">{help.about}</p>

          <h4 className="ui-box-title mb-2">What everything means</h4>
          <dl className="space-y-2 mb-6">
            {help.parts.map(([term, meaning]) => (
              <div key={term} className="text-sm">
                <dt className="font-semibold text-gray-800">{term}</dt>
                <dd className="text-gray-600">{meaning}</dd>
              </div>
            ))}
          </dl>

          <h4 className="ui-box-title mb-2">Putting mistakes right</h4>
          <dl className="space-y-2">
            {help.fixes.map(([problem, fix]) => (
              <div key={problem} className="text-sm border-l-2 border-primary pl-3">
                <dt className="font-semibold text-gray-800">{problem}</dt>
                <dd className="text-gray-600">{fix}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </>
  );
};

export default StockHelp;
