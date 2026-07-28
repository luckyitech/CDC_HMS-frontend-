import { useState, useMemo } from "react";
import { QrCode, Printer, Tag, X, Mail, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Button from "./Button";
import { code128Svg } from "../../utils/code128";
import { formatDOB } from "../../utils/dateUtils";
import barcodeService from "../../services/barcodeService";

// Barcode generation for a patient: preview modal + two print paths.
//   Print card  — wallet-size identity card (CR80) the patient carries/presents.
//   Print label — file-folder sticker for the thermal printer.
// Used from both the staff and doctor patient profiles. Email arrives in the
// email slice and will add a third action here.
//
// Thermal label size — confirm against the clinic's printer and adjust in one
// place. Common desktop thermal labels are 50×30mm.
const LABEL_W_MM = 50;
const LABEL_H_MM = 30;
// CR80 wallet card
const CARD_W_MM = 85.6;
const CARD_H_MM = 54;

const printHtml = (title, pageW, pageH, bodyHtml) => {
  const win = window.open("", "_blank", "width=480,height=360");
  if (!win) {
    toast.error("Pop-up blocked — allow pop-ups to print");
    return;
  }
  win.document.write(`<!doctype html>
<html>
<head>
<title>${title}</title>
<style>
  @page { size: ${pageW}mm ${pageH}mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${pageW}mm; height: ${pageH}mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff;
         display: flex; align-items: center; justify-content: center; }
  svg { max-width: 100%; height: auto; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`);
  win.document.close();
  win.focus();
  // Give the window a beat to lay out before printing, then close.
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
};

const BarcodeActions = ({ patient }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  const handleEmail = async () => {
    if (!patient.email) {
      toast.error("No email on file — add one via Edit Profile first");
      return;
    }
    setIsEmailing(true);
    try {
      const res = await barcodeService.emailBarcode(patient.uhid);
      if (res.success) {
        toast.success(res.data?.message || `Barcode card sent to ${patient.email}`);
      } else {
        toast.error(res.message || "Failed to send barcode email");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to send barcode email");
    } finally {
      setIsEmailing(false);
    }
  };

  // Preview barcode — regenerated only when the UHID changes.
  const previewSvg = useMemo(() => {
    try {
      return code128Svg(patient.uhid, { height: 56, moduleWidth: 2, showText: true });
    } catch {
      return null;
    }
  }, [patient.uhid]);

  const dob = patient.dateOfBirth ? formatDOB(patient.dateOfBirth) : null;

  const handlePrintCard = () => {
    const svg = code128Svg(patient.uhid, { height: 44, moduleWidth: 2, showText: true });
    printHtml(`Card ${patient.uhid}`, CARD_W_MM, CARD_H_MM, `
      <div style="width:${CARD_W_MM}mm; height:${CARD_H_MM}mm; padding:3mm 4mm;
                  display:flex; flex-direction:column; justify-content:space-between;">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <div>
            <div style="font-size:9pt; font-weight:bold;">Comprehensive Diabetes Centre</div>
            <div style="font-size:6.5pt; color:#444;">Nairobi &middot; cdiabetescentre.com</div>
          </div>
        </div>
        <div>
          <div style="font-size:11pt; font-weight:bold;">${patient.name}</div>
          ${dob ? `<div style="font-size:7.5pt; color:#444;">DOB: ${dob}</div>` : ""}
        </div>
        <div style="text-align:center;">${svg}</div>
      </div>`);
  };

  const handlePrintLabel = () => {
    const svg = code128Svg(patient.uhid, { height: 32, moduleWidth: 2, showText: true });
    printHtml(`Label ${patient.uhid}`, LABEL_W_MM, LABEL_H_MM, `
      <div style="width:${LABEL_W_MM}mm; height:${LABEL_H_MM}mm; padding:1.5mm 2mm;
                  display:flex; flex-direction:column; justify-content:space-between;">
        <div style="font-size:8.5pt; font-weight:bold; white-space:nowrap; overflow:hidden;">
          ${patient.name}
        </div>
        ${dob ? `<div style="font-size:6.5pt; color:#333;">DOB: ${dob}</div>` : ""}
        <div style="text-align:center;">${svg}</div>
      </div>`);
  };

  if (!patient?.uhid) return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2"
      >
        <QrCode className="w-4 h-4" />
        Barcode
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                Patient Barcode
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="font-semibold text-gray-800">{patient.name}</p>
              <p className="text-sm text-gray-600">UHID: {patient.uhid}</p>
              {dob && <p className="text-sm text-gray-600">DOB: {dob}</p>}
            </div>

            <div className="mb-6 p-4 border-2 border-gray-200 rounded-lg bg-white flex justify-center">
              {previewSvg ? (
                <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
              ) : (
                <p className="text-sm text-red-600">Could not generate barcode for this UHID</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handlePrintLabel}>
                <Tag className="w-4 h-4 mr-2" /> Print Label
              </Button>
              <Button variant="primary" className="flex-1" onClick={handlePrintCard}>
                <Printer className="w-4 h-4 mr-2" /> Print Card
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={handleEmail}
              disabled={isEmailing || !patient.email}
            >
              {isEmailing
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Mail className="w-4 h-4 mr-2" />}
              {patient.email ? `Email Card to ${patient.email}` : "No email on file"}
            </Button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Label prints at {LABEL_W_MM}&times;{LABEL_H_MM}mm for the thermal printer.
              Card is wallet size.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default BarcodeActions;
