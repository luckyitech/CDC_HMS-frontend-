import { MapPin, Phone, Mail } from "lucide-react";
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
    <div className="flex justify-between items-center border-b-4 border-primary pb-6 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">COMPREHENSIVE DIABETES CENTRE</h1>
        <p className="text-gray-600">Center for Diabetes Care &amp; Management</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mt-1">
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> 3rd Floor, Doctors Park, Third Avenue, Nairobi</span>
          <span className="text-gray-400">|</span>
          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> 0711 781299</span>
          <span className="text-gray-400">|</span>
          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> info@comprehensivediabetescentre.com</span>
        </div>
      </div>
      <img src={cdcLogo} alt="CDC Logo" className="w-40 h-40 object-contain py-4" />
    </div>
  </div>
);

export default PrintLetterhead;
