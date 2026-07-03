import { useState } from "react";
import { useData } from "../data/useData";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";
import "./Slots.css";

export default function Slots() {
  const { auth } = useAuth();
  const { slots, zones, loading, error, refreshData } = useData(['slots', 'zones']);
  const [filterZone, setFilterZone] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error loading database: {error}. Please ensure your MongoDB Atlas IP is whitelisted and your backend is connected.</div>;
  if (!slots || !zones) return <div>No data available.</div>;

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;
    try {
      const res = await fetch(`/api/slots/${slotId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${auth.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete slot");
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const filtered = slots.filter((s) => {
    const zone = zones.find((z) => z.zone_id === s.zone_id);
    const zoneName = zone ? zone.zone_name : "Unknown";
    return (
      (filterZone === "All" || zoneName === filterZone) &&
      (filterStatus === "All" || s.status === filterStatus)
    );
  });

  return (
    <div className="page">
      <h1 className="page-title">Parking Slots</h1>
      <p className="page-subtitle">Individual slot status across all zones</p>

      <div className="slots-filters">
        <label>
          Zone:
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
            <option>All</option>
            {zones.map((z) => (
              <option key={z.zone_id}>{z.zone_name}</option>
            ))}
          </select>
        </label>
        <label>
          Status:
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option>All</option>
            <option>Available</option>
            <option>Occupied</option>
          </select>
        </label>
      </div>

      <div className="slots-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Slot</th>
              <th>Zone</th>
              <th>Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const zone = zones.find((z) => z.zone_id === s.zone_id);
              return (
                <tr key={s.slot_id}>
                  <td>{s.slot_id}</td>
                  <td>
                    <strong>{s.slot_number}</strong>
                  </td>
                  <td>{zone ? zone.zone_name : "-"}</td>
                  <td>{s.slot_type}</td>
                  <td>
                    <span
                      className={`badge ${s.status === "Available" ? "badge-available" : "badge-occupied"}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDeleteSlot(s.slot_id)}
                      style={{ background: "transparent", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}
                      title="Delete Slot"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="no-data">
                  No slots match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
