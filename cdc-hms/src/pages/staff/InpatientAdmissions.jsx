import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { BedDouble } from "lucide-react";
import { queueService } from "../../services/queueService";
import ConvertToInpatientModal from "../../components/staff/ConvertToInpatientModal";
import PageHeader from "../../components/shared/PageHeader";

/**
 * Front-desk screen (Outpatient workspace): patients a doctor advised for
 * admission are flagged in the queue at Pending Billing. Staff converts them.
 */
export default function InpatientAdmissions() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await queueService.getAll();
      const list = (res.data || []).filter((q) => q.admissionRequested && !q.admissionConvertedToId);
      setItems(list);
    } catch (e) { toast.error(e.message || "Failed to load queue"); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><BedDouble className="w-5 h-5 text-primary" /> Admissions awaiting bed</span>}
      />

      {items.length === 0 && <p className="text-gray-500">No patients advised for admission right now.</p>}

      <div className="space-y-2">
        {items.map((q) => (
          <div key={q.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
            <div>
              <p className="font-medium">{q.patientName} <span className="text-gray-400 text-sm">· {q.uhid}</span></p>
              <p className="text-xs text-gray-500">
                {q.admissionType || "—"} · advised by {q.admissionRequestedByDoctorName || "—"}
                {q.admissionWardPreference ? ` · pref: ${q.admissionWardPreference}` : ""}
              </p>
              {q.admissionReason && <p className="text-sm text-gray-600 mt-0.5">{q.admissionReason}</p>}
            </div>
            <button onClick={() => setSelected(q)} className="px-3 py-1.5 rounded text-sm bg-primary text-white hover:opacity-90">
              Convert to Inpatient
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <ConvertToInpatientModal
          queueItem={{ id: selected.id, patientName: selected.patientName, uhid: selected.uhid }}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
