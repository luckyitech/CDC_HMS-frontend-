import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Building2, Plus } from "lucide-react";
import inpatientService from "../../services/inpatientService";
import PageHeader from "../../components/shared/PageHeader";

const inp = "border border-gray-300 rounded px-2 py-1.5 text-sm";

export default function WardConfig() {
  const [wards, setWards] = useState([]);
  const [nw, setNw] = useState({ name: "", type: "General", ratePerDay: 0 });

  const load = useCallback(async () => {
    try { const r = await inpatientService.getWards(); setWards(r.data || []); }
    catch (e) { toast.error(e.message || "Failed to load wards"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addWard = async () => {
    if (!nw.name.trim()) return toast.error("Ward name required");
    try { await inpatientService.createWard({ ...nw, ratePerDay: Number(nw.ratePerDay) || 0 }); setNw({ name: "", type: "General", ratePerDay: 0 }); toast.success("Ward added"); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  const addRoom = async (wardId) => {
    const name = window.prompt("Room name / number:"); if (!name) return;
    try { await inpatientService.createRoom({ wardId, name }); toast.success("Room added"); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };
  const addBed = async (roomId) => {
    const label = window.prompt("Bed label (e.g. 3B):"); if (!label) return;
    try { await inpatientService.createBed({ roomId, label }); toast.success("Bed added"); load(); }
    catch (e) { toast.error(e.message || "Failed"); }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Ward Configuration</span>}
      />

      <div className="flex gap-2 mb-6">
        <input className={inp} placeholder="New ward name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} />
        <select className={inp} value={nw.type} onChange={(e) => setNw({ ...nw, type: e.target.value })}>
          {["General", "HDU", "Private", "Isolation", "Maternity"].map((x) => <option key={x}>{x}</option>)}
        </select>
        <input className={inp} type="number" placeholder="Bed-day rate" value={nw.ratePerDay} onChange={(e) => setNw({ ...nw, ratePerDay: e.target.value })} />
        <button onClick={addWard} className="px-3 py-1.5 rounded text-sm bg-primary text-white flex items-center gap-1"><Plus size={14} /> Ward</button>
      </div>

      <div className="space-y-5">
        {wards.map((w) => (
          <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-700">{w.name} <span className="text-xs text-gray-400">({w.type})</span></h2>
              <button onClick={() => addRoom(w.id)} className="text-sm text-primary hover:underline">+ Room</button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(w.Rooms || []).map((room) => (
                <div key={room.id} className="border border-gray-100 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{room.name}</span>
                    <button onClick={() => addBed(room.id)} className="text-xs text-primary hover:underline">+ Bed</button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(room.Beds || []).map((b) => (
                      <span key={b.id} className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{b.label} · {b.status}</span>
                    ))}
                    {(room.Beds || []).length === 0 && <span className="text-xs text-gray-400">no beds</span>}
                  </div>
                </div>
              ))}
              {(w.Rooms || []).length === 0 && <p className="text-sm text-gray-400">No rooms yet.</p>}
            </div>
          </div>
        ))}
        {wards.length === 0 && <p className="text-gray-500">No wards yet. Add one above.</p>}
      </div>
    </div>
  );
}
