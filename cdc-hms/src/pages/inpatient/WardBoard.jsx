import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BedDouble, RefreshCw, Building2 } from "lucide-react";
import inpatientService from "../../services/inpatientService";
import PageHeader from "../../components/shared/PageHeader";
import Button from "../../components/shared/Button";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const STATUS_STYLES = {
  Available: "bg-green-50 border-green-300 text-green-800",
  Occupied:  "bg-blue-50 border-blue-300 text-blue-900",
  Cleaning:  "bg-amber-50 border-amber-300 text-amber-800",
  Blocked:   "bg-gray-100 border-gray-300 text-gray-500",
  Reserved:  "bg-purple-50 border-purple-300 text-purple-800",
};

const WardBoard = () => {
  const navigate = useNavigate();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await inpatientService.getBoard();
      setWards(res.data || []);
    } catch (e) {
      toast.error(e.message || "Failed to load ward board");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Live updates: re-fetch on the inpatient board SSE event
    const es = new EventSource(`${API_URL}/sse`);
    es.addEventListener("board_updated", load);
    return () => es.close();
  }, [load]);

  const releaseBed = async (bedId) => {
    try {
      await inpatientService.releaseBed(bedId);
      toast.success("Bed released");
      load();
    } catch (e) {
      toast.error(e.message || "Failed to release bed");
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading ward board…</div>;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><BedDouble className="w-5 h-5 text-primary" /> Ward Board</span>}
        actions={<Button variant="secondary" onClick={load}><RefreshCw size={16} /> Refresh</Button>}
      />

      {wards.length === 0 && (
        <p className="text-gray-500">No wards configured yet. An admin can add them under Ward Config.</p>
      )}

      <div className="space-y-8">
        {wards.map((w) => (
          <div key={w.id}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 size={18} className="text-gray-400" /> {w.name}
              <span className="text-xs font-normal text-gray-400">({w.type})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {w.beds.map((b) => (
                <div
                  key={b.bedId}
                  className={`border rounded-xl p-3 ${STATUS_STYLES[b.status] || "bg-white border-gray-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{b.roomName} · {b.label}</span>
                    <span className="text-[10px] uppercase tracking-wide">{b.status}</span>
                  </div>
                  {b.patient ? (
                    <button
                      onClick={() => navigate(`/inpatient/admission/${b.admissionId}`)}
                      className="mt-2 text-left w-full"
                    >
                      <p className="text-sm font-medium truncate hover:underline">{b.patient.name}</p>
                      <p className="text-xs opacity-70">{b.patient.uhid}</p>
                      {b.attendingDoctor && <p className="text-xs opacity-70 truncate">{b.attendingDoctor}</p>}
                    </button>
                  ) : b.status === "Cleaning" ? (
                    <button onClick={() => releaseBed(b.bedId)} className="mt-2 text-xs underline">
                      Mark clean → Available
                    </button>
                  ) : (
                    <p className="mt-2 text-xs opacity-60">Empty</p>
                  )}
                </div>
              ))}
              {w.beds.length === 0 && <p className="text-sm text-gray-400">No beds in this ward.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WardBoard;
