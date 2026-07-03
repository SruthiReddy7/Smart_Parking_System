import { useState } from "react";
import { useData } from "../data/useData";
import { useAuth } from "../context/AuthContext";
import { Info } from "lucide-react";
import "./Dashboard.css";
import "./Slots.css";

function formatDateTime(dt) {
  if (!dt) return "�";
  return new Date(dt).toLocaleString();
}

export default function Sessions() {
  const { auth } = useAuth();
  const { sessions, zones, slots, users, vehicles, loading, error, refreshData } = useData(['sessions', 'zones', 'slots', 'users', 'vehicles']);
  const [formData, setFormData] = useState({ driver_name: "", vehicle_plate: "", zone_name: "", slot_type: "" });
  const [filterStatus, setFilterStatus] = useState("All");
  const [formError, setFormError] = useState("");

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error loading database: {error}</div>;
  if (!sessions || !zones || !slots) return <div>No data available.</div>;

  const selectedZone = zones.find(z => z.zone_name === formData.zone_name);
  const availableSlotsList = slots.filter(s =>
    s.status === "Available" &&
    (!selectedZone || s.zone_id === selectedZone.zone_id)
  );

  const availableSlotTypes = [...new Set(availableSlotsList.map(s => s.slot_type))];

  // Derive registered vehicles for the drafted driver name
  const driverVehicles = (vehicles || []).filter(v => {
    if (!v.user_id) return false;
    const dn = formData.driver_name.toLowerCase().trim();
    return (v.user_id.full_name || "").toLowerCase() === dn || (v.user_id.username || "").toLowerCase() === dn;
  });

  const handleInputChange = (e) => {
    setFormError("");
    const { name, value } = e.target;
    if (name === "zone_name") {
      setFormData({ ...formData, zone_name: value, slot_type: "" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddSession = async (e) => {
    e.preventDefault();
    setFormError("");

    const existingActiveSession = sessions.find(s => 
      s.vehicle_plate.toLowerCase() === formData.vehicle_plate.toLowerCase().trim() && 
      s.status === "Active"
    );

    if (existingActiveSession) {
      setFormError(`Warning: There is already an active session for the vehicle plate "${formData.vehicle_plate.toUpperCase()}". Please end it before starting a new one.`);
      return;
    }

    if (formData.slot_type === "EV Charging") {
      const selectedVehicle = (vehicles || []).find(v => v.vehicle_plate.toLowerCase() === formData.vehicle_plate.toLowerCase());
      
      if (selectedVehicle) {
        if (selectedVehicle.fuel_type !== "Electric" && selectedVehicle.fuel_type !== "Hybrid") {
          setFormError(`Cannot park a ${selectedVehicle.fuel_type} vehicle in an EV Charging slot!`);
          return;
        }
      } else {
         setFormError("Warning: Unregistered vehicle attempting to use an EV Charging slot.");
         return;
      }
    }

    const eligibleSlots = availableSlotsList.filter(s => s.slot_type === formData.slot_type);
    if (eligibleSlots.length === 0) {
      setFormError("No available slots found for this type in the selected zone.");
      return;
    }

    const assignedSlot = eligibleSlots.sort((a, b) => a.slot_number.localeCompare(b.slot_number))[0];

    const userDoc = users?.find(u => u.username.toLowerCase() === formData.driver_name.toLowerCase().trim());
    const finalDriverName = userDoc ? userDoc.full_name : formData.driver_name;

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        ...formData,
        driver_name: finalDriverName,
        slot_id: assignedSlot.slot_id,
        zone_id: selectedZone.zone_id,
        slot_number: assignedSlot.slot_number,
        entry_time: new Date().toISOString(),
        status: "Active"
      })
    });

    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || "Failed to start session.");
      return;
    }

    setFormData({ driver_name: "", vehicle_plate: "", zone_name: "", slot_type: "" });
    refreshData();
  };

  const handleEndSession = async (sessionId, entry_time, zone_id) => {
    const exitTime = new Date();
    const entryDate = new Date(entry_time);
    const durationObj = (exitTime - entryDate) / (1000 * 60 * 60);
    const durationHours = Math.max(0.5, parseFloat(durationObj.toFixed(1)));
    
    // Find the zone to get its hourly rate, default to 3.5 if not found
    const zone = zones.find(z => z.zone_id === zone_id);
    const hourlyRate = zone ? zone.hourly_rate : 3.5;
    const amountDue = parseFloat(Math.max(2, durationHours * hourlyRate).toFixed(2));

    await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        exit_time: exitTime.toISOString(),
        duration_hours: durationHours,
        amount_due: amountDue,
        status: "Completed"
      })
    });
    refreshData();
  };

  const filteredSessions = [...sessions]
    .sort((a, b) => String(b._id).localeCompare(String(a._id)))
    .filter(s => filterStatus === "All" || s.status === filterStatus);

  return (
    <div className="page">
      <h1 className="page-title">Parking Sessions</h1>
      <p className="page-subtitle">Record of all vehicle parking sessions</p>

      <div className="panel mb-20">
        <h2 className="panel-title">Add New Parking Session</h2>
        {formError && (
          <div style={{ background: "#3e1a1a", border: "1px solid #c62828", borderRadius: "8px", padding: "0.7rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.88rem", display: "flex", alignItems: "center" }}>
            <Info size={16} style={{marginRight: "6px", flexShrink: 0}}/> {formError}
          </div>
        )}
        <form onSubmit={handleAddSession} className="form-row flex-wrap">
          
          <input
            list="admin-driver-list"
            name="driver_name"
            placeholder="Username"
            value={formData.driver_name}
            onChange={handleInputChange}
            required
            className="form-input"
          />
          {users && users.length > 0 && (
            <datalist id="admin-driver-list">
              {users.filter((u) => u.role !== "admin").map((u) => (
                <option key={u._id} value={u.username} />
              ))}
            </datalist>
          )}

          <input
            name="vehicle_plate"
            list="admin-vehicle-list"
            placeholder="Vehicle Plate"
            value={formData.vehicle_plate}
            onChange={handleInputChange}
            required
            className="form-input"
          />
          {driverVehicles.length > 0 && (
            <datalist id="admin-vehicle-list">
              {driverVehicles.map(v => (
                <option key={v._id} value={v.vehicle_plate}>
                  {v.vehicle_model} ({v.fuel_type})
                </option>
              ))}
            </datalist>
          )}

          <select
            name="zone_name"
            value={formData.zone_name}
            onChange={handleInputChange}
            required
            className="form-input"
          >
            <option value="" disabled>Select Zone</option>
            {zones.map((z) => (
              <option key={z.zone_id} value={z.zone_name}>
                {z.zone_name}
              </option>
            ))}
          </select>

          <select
            name="slot_type"
            value={formData.slot_type}
            onChange={handleInputChange}
            required
            disabled={!formData.zone_name}
            className="form-input"
          >
            <option value="" disabled>Select Slot Type</option>
            {availableSlotTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <button type="submit" className="btn-success px-4">
            Start Session
          </button>
        </form>
      </div>

      <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
        <button className={filterStatus === "All" ? "badge badge-unknown" : "badge"} onClick={() => setFilterStatus("All")}>All</button>
        <button className={filterStatus === "Active" ? "badge badge-active" : "badge"} onClick={() => setFilterStatus("Active")}>Active</button>
        <button className={filterStatus === "Completed" ? "badge badge-done" : "badge"} onClick={() => setFilterStatus("Completed")}>Completed</button>
      </div>

      <div className="slots-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Vehicle</th>
              <th>Zone</th>
              <th>Slot</th>
              <th>Status</th>
              <th>Entry Time</th>
              <th>Duration (Hrs)</th>
              <th>Total ($)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map((s) => (
              <tr key={s._id}>
                <td className="text-muted">...{s._id.slice(-4)}</td>
                <td><strong>{s.driver_name}</strong></td>
                <td>{s.vehicle_plate}</td>
                <td>{s.zone_name}</td>
                <td>{s.slot_number}</td>
                <td>
                  <span className={`badge ${s.status === 'Active' ? 'badge-active' : 'badge-done'}`}>
                    {s.status}
                  </span>
                </td>
                <td>{formatDateTime(s.entry_time)}</td>
                <td className="text-right">{s.duration_hours !== null ? s.duration_hours : "�"}</td>
                <td className="text-right">{s.amount_due ? `$${s.amount_due.toFixed(2)}` : "�"}</td>
                <td style={{ textAlign: "center" }}>
                  {s.status === "Active" && (
                    <button
                      className="badge badge-done checkout-btn"
                      style={{ cursor: "pointer", border: "1px solid var(--border)", padding: "6px 12px" }}
                      onClick={() => handleEndSession(s._id, s.entry_time, s.zone_id)}
                    >
                      Checkout
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
