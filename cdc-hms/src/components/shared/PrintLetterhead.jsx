import cdcLogo from "../../assets/cdc_web_logo1.svg";

/**
 * PrintLetterhead — the clinic letterhead for EVERY printed document.
 * (DRY §4e: never hand-roll a hospital header in a print root.)
 *
 * Default is print-only (hidden on screen). Pass `show` where the letterhead
 * should also appear in an on-screen preview (e.g. print modals).
 */
const PrintLetterhead = ({ show = false }) => (
  <div className={show ? "" : "hidden print:block"}>
    <div className="flex justify-between items-center border-b-4 border-primary pb-2 mb-2">
      <div>
        <h1 className="text-2xl font-bold text-primary mb-1">COMPREHENSIVE DIABETES CENTRE</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mt-1">
          <span>3rd Floor, Doctors Park, Third Avenue, Nairobi</span>
          <span className="text-gray-400">|</span>
          <span>0711 781299</span>
          <span className="text-gray-400">|</span>
          <span>info@comprehensivediabetescentre.com</span>
        </div>
      </div>
      {/* Sized to sit level with the address block rather than tower over it —
          at w-40 the logo alone took roughly a fifth of an A4 page. */}
      <img src={cdcLogo} alt="CDC Logo" className="w-24 h-24 object-contain shrink-0" />
    </div>
  </div>
);

export default PrintLetterhead;
