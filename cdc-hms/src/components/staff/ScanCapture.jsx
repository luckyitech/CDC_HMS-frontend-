import { useState, useEffect, useRef, useCallback } from "react";
import { ScanLine, Loader2, GitMerge } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Card from "../shared/Card";
import barcodeService from "../../services/barcodeService";

// Reception barcode scanner.
//
// A USB scanner behaves like a keyboard: it "types" the code and sends Enter.
// Two ways to use it, both handled here:
//   1. Click the box (it auto-focuses) and scan, or type a UHID — Enter submits.
//   2. Hands-free — when NO input is focused, a fast keystroke burst ending in
//      Enter anywhere on the page is captured as a scan. Manual typing in any
//      field is left untouched, so this never fights the search box.
//
// On success it navigates to the patient profile. A merged patient's old card
// resolves to their current record (backend follows mergedIntoId).

const SCAN_MAX_MS = 500; // a scanned burst completes far faster than human typing
const MIN_LEN = 3;

const ScanCapture = ({ basePath = "/staff" }) => {
  const [value, setValue] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const resolve = useCallback(async (rawCode) => {
    const code = String(rawCode || "").trim();
    if (!code || isResolving) return;

    setIsResolving(true);
    try {
      const res = await barcodeService.resolveScan(code);
      if (res.success && res.data?.uhid) {
        const { uhid, name, redirectedFrom } = res.data;
        if (redirectedFrom) {
          toast(`${redirectedFrom} was merged — opening ${name} (${uhid})`, {
            icon: <GitMerge className="w-5 h-5" />,
            duration: 4000,
            style: { background: "#FEF3C7", color: "#92400E", fontWeight: "bold", padding: "16px" },
          });
        } else {
          toast.success(`Opening ${name} (${uhid})`, { duration: 2000 });
        }
        setValue("");
        navigate(`${basePath}/patient-profile/${uhid}`);
      } else {
        toast.error("Barcode not recognised");
      }
    } catch (err) {
      toast.error(err?.message || "Scan failed. Please try again.");
    } finally {
      setIsResolving(false);
    }
  }, [isResolving, navigate, basePath]);

  // Hands-free wedge: capture a fast keystroke burst when nothing is focused.
  useEffect(() => {
    let buffer = "";
    let startedAt = 0;

    const isEditable = (el) =>
      !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

    const onKeyDown = (e) => {
      // Leave manual typing (including our own box) alone.
      if (isEditable(document.activeElement)) return;

      const now = Date.now();
      if (now - startedAt > SCAN_MAX_MS) {
        buffer = "";
        startedAt = now;
      }

      if (e.key === "Enter") {
        if (buffer.length >= MIN_LEN && now - startedAt <= SCAN_MAX_MS) resolve(buffer);
        buffer = "";
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolve]);

  const onInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      resolve(value);
    }
  };

  return (
    <Card title="Scan Patient" className="mb-6">
      <div className="flex items-center gap-3">
        <ScanLine className="w-6 h-6 text-primary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder="Scan a barcode or type a UHID (e.g. CDC042)"
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-primary text-base"
          autoFocus
        />
        {isResolving && <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        A USB scanner types the code and submits automatically. A merged patient&apos;s old card opens their current record.
      </p>
    </Card>
  );
};

export default ScanCapture;
