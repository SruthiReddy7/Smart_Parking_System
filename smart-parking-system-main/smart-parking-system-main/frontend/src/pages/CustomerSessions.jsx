import { useState } from "react";
import { useData } from "../data/useData";
import { useAuth } from "../context/AuthContext";
import { Car, Accessibility, Zap, Info } from "lucide-react";
import "./Dashboard.css";
import "./Slots.css";

const SLOT_TYPE_ICON = {
  "Standard": <Car size={16} />,
  "Handicapped": <Accessibility size={16} />,
  "EV Charging": <Zap size={16} />,
};

function formatDateTime(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString();
}

export default function CustomerSessions() {
  const { auth } = useAuth();
  const result = useData(['zones', 'slots', 'sessions/my', 'vehicles']);
  const zones = result.zones;
  const slots = result.slots;
  const mySessions = result['sessions/my'];
  const vehicles = result.vehicles;
  const { loading, error, refreshData } = result;

  const [driverName, setDriverName] = useState(auth?.full_name || "");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [formError, setFormError] = useState("");

  if (loading) return <div className="page"><p>Loading data...</p></div>;
  if (error) return <div className="page"><p>Error: {error}</p></div>;
  if (!zones || !slots || !mySessions) return <div className="page"><p>No data available.</p></div>;

  const selectedZone = zones.find(z => z.zone_name === zoneName);
  const zoneSlots = selectedZone
    ? [...slots.filter(s => s.zone_id === selectedZone.zone_id)]
          .sort((a, b) => {
            const typeCompare = (a.slot_type || "").localeCompare(b.slot_type || "");
            if (typeCompare !== 0) return typeCompare;
            return a.slot_number.localeCompare(b.slot_number, undefined, { numeric: true, sensitivity: 'base' });
          })
      : [];
  const activeSessions = mySessions.filter(s => s.status === "Active");
  const activePlates = activeSessions.map(s => s.vehicle_plate?.toLowerCase() || "");

  const handleZoneChange = (e) => {
    setZoneName(e.target.value);
    setSelectedSlot(null);
    setFormError("");
  };

  const handleSlotClick = (slot) => {
    if (slot.status !== "Available") return;
    setSelectedSlot(prev => prev?.slot_id === slot.slot_id ? null : slot);
    setFormError("");
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    setFormError("");
      // EV Charging Rules Validation
      if (selectedSlot?.slot_type === "EV Charging") {
        const matchingVehicle = vehicles?.find(v => v.vehicle_plate.toLowerCase() === vehiclePlate.toLowerCase());
        if (matchingVehicle && matchingVehicle.fuel_type !== "Electric" && matchingVehicle.fuel_type !== "Hybrid") {
          setFormError(`Cannot park a ${matchingVehicle.fuel_type} vehicle inside an EV Charging slot.`);
          return;
        }
      }
    if (activePlates.includes(vehiclePlate.toLowerCase())) {
      setFormError(`You already have an active session for the vehicle plate "${vehiclePlate}". You can start a new session for a different vehicle.`);
      return;
    }
    if (!selectedSlot) {
      setFormError("Please select a parking slot from the map below.");
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        driver_name: driverName,
        vehicle_plate: vehiclePlate,
        zone_name: zoneName,
        slot_type: selectedSlot.slot_type,
        slot_id: selectedSlot.slot_id,
        zone_id: selectedZone.zone_id,
        slot_number: selectedSlot.slot_number,
        entry_time: new Date().toISOString(),
        status: "Active"
      })
    });

    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || "Failed to start session.");
      return;
    }

    setDriverName(auth?.full_name || "");
    setVehiclePlate("");
    setZoneName("");
    setSelectedSlot(null);
    refreshData();
  };

  const handleEndSession = async (sessionId, entry_time, zone_id) => {
    const exitTime = new Date();
    const durationMs = (exitTime - new Date(entry_time)) / (1000 * 60 * 60);
    const durationHours = Math.max(0.5, parseFloat(durationMs.toFixed(1)));
    
    // Find the zone to get its hourly rate, default to 3.5 if not found
    const zone = result.zones.find(z => z.zone_id === zone_id);
    const hourlyRate = zone ? zone.hourly_rate : 3.5;
    const amountDue = parseFloat(Math.max(2, durationHours * hourlyRate).toFixed(2));

    const res = await fetch(`/api/sessions/${sessionId}`, {
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

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to end session.");
      return;
    }
    refreshData();
  };

  const filteredSessions = [...mySessions]
    .sort((a, b) => String(b._id).localeCompare(String(a._id)))
    .filter(s => filterStatus === "All" || s.status === filterStatus);

  return (
    <div className="page">
      <h1 className="page-title">My Parking Sessions</h1>
      <p className="page-subtitle">Pick a zone, select your slot on the map, then start your session.</p>

      <div className="panel mb-20">
        <h2 className="panel-title">Start a New Parking Session</h2>
        {/* {activeSessions.length > 0 && (
          <div style={{ background: "#3e2a00", border: "1px solid #f57f17", borderRadius: "8px", padding: "0.7rem 1rem", marginBottom: "1rem", color: "var(--warning)", fontSize: "0.88rem" }}>
            <Info size={16} style={{marginRight: "4px", verticalAlign: "middle"}}/> You currently have {activeSessions.length} active session{activeSessions.length > 1 ? "s" : ""}. You may start another session for a different vehicle.
          </div>
        )} */}
        {formError && (
          <div style={{ background: "#3e1a1a", border: "1px solid #c62828", borderRadius: "8px", padding: "0.7rem 1rem", marginBottom: "1rem", color: "var(--danger)", fontSize: "0.88rem" }}>
            {formError}
          </div>
        )}
        <form onSubmit={handleStartSession}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
            <input
              placeholder="Driver Name"
              value={driverName}
              onChange={e => { setDriverName(e.target.value); setFormError(""); }}
              required
              className="form-input"
            />
            <input
              list="registered-vehicles-list"
              placeholder="Vehicle Plate (Select or Type New)"
              value={vehiclePlate}
              onChange={e => { setVehiclePlate(e.target.value); setFormError(""); }}
              required
              className="form-input"
            />
            {vehicles && vehicles.length > 0 && (
              <datalist id="registered-vehicles-list">
                {vehicles.map(v => (
                  <option key={v._id} value={v.vehicle_plate}>
                    {v.vehicle_model}
                  </option>
                ))}
              </datalist>
            )}
            <select
              value={zoneName}
              onChange={handleZoneChange}
              required
              className="form-input"
            >
              <option value="" disabled>Select Zone</option>
              {zones.map((z) => (
                <option key={z.zone_id} value={z.zone_name}>
                  {z.zone_name} (Free: {z.available_slots} · ${z.hourly_rate.toFixed(2)}/hr)
                </option>
              ))}
            </select>
          </div>

          {/* Slot map */}
          {zoneName && (
            <div className="slot-map-wrap">
              <div className="slot-map-legend">
                <span className="slot-legend-item"><span className="slot-legend-dot slot-legend-available" />Available</span>
                <span className="slot-legend-item"><span className="slot-legend-dot slot-legend-occupied" />Occupied</span>
                <span className="slot-legend-item"><span className="slot-legend-dot slot-legend-selected" />Selected</span>
                <span className="slot-legend-item"><Car size={16} className="mr-4"/> Standard</span>
                <span className="slot-legend-item"><Accessibility size={16} className="mr-4"/> Handicapped</span>
                <span className="slot-legend-item"><Zap size={16} className="mr-4"/> EV Charging</span>
              </div>
              <div className="slot-grid" role="group" aria-label="Parking slot selection grid">
                {zoneSlots.map(slot => {
                  const isSelected = selectedSlot?.slot_id === slot.slot_id;
                  const isOccupied = slot.status !== "Available";
                  const disabledReason = isOccupied ? "This slot is occupied" : undefined;
                  return (
                    <button
                      type="button"
                      key={slot.slot_id}
                      title={`${slot.slot_number} - ${slot.slot_type} - ${slot.status}`}
                      aria-label={`${slot.slot_number}, ${slot.slot_type}, ${slot.status}${isSelected ? ", selected" : ""}${disabledReason ? ". " + disabledReason : ""}`}
                      aria-pressed={isSelected}
                      aria-disabled={!!isOccupied}
                      className={
                        "slot-tile" +
                        (isOccupied ? " slot-tile--occupied" : "") +
                        (isSelected ? " slot-tile--selected" : "") +
                        (!isOccupied && !isSelected ? " slot-tile--available" : "") +
                        ((!isOccupied && !isSelected) ? (
                          slot.slot_type === "EV Charging" ? " slot-tile--ev" :
                          slot.slot_type === "Handicapped" ? " slot-tile--handicapped" : ""
                        ) : "")
                      }
                      onClick={() => handleSlotClick(slot)}
                      disabled={isOccupied}
                    >
                      <span className="slot-tile-icon" aria-hidden="true">{SLOT_TYPE_ICON[slot.slot_type] || <Car size={16} />}</span>
                      <span className="slot-tile-number">{slot.slot_number}</span>
                    </button>
                  );
                })}
              </div>
              {selectedSlot && (
                <div className="slot-selection-info" aria-live="polite">
                  Selected: <strong>{selectedSlot.slot_number}</strong> &nbsp;·&nbsp; {selectedSlot.slot_type} <span aria-hidden="true">{SLOT_TYPE_ICON[selectedSlot.slot_type]}</span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedSlot}
            style={{ marginTop: "1rem", padding: "8px 20px", background: (!selectedSlot) ? "#444" : "var(--success)", color: (!selectedSlot) ? "#888" : "var(--surface)", border: "none", borderRadius: "4px", cursor: (!selectedSlot) ? "not-allowed" : "pointer", fontWeight: "bold" }}
          >
            Start Session
          </button>
        </form>
      </div>

      <div className="panel" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="panel-title" style={{ margin: 0 }}>My Sessions</h2>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-input"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="slots-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Plate</th>
              <th>Zone</th>
              <th>Slot</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Duration</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center-p-1-5">
                  No sessions found.
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => (
                <tr key={s._id}>
                  <td title={s._id}>{String(s._id).slice(-6)}</td>
                  <td>{s.vehicle_plate}</td>
                  <td>{s.zone_name}</td>
                  <td>{s.slot_number}</td>
                  <td>{formatDateTime(s.entry_time)}</td>
                  <td>{formatDateTime(s.exit_time)}</td>
                  <td>{s.duration_hours != null ? `${s.duration_hours}h` : "-"}</td>
                  <td>{s.amount_due != null ? `$${s.amount_due}` : "-"}</td>
                  <td>
                    <span className={`badge ${s.status === "Active" ? "badge-active" : "badge-done"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    {s.status === "Active" ? (
                      <button
                        onClick={() => handleEndSession(s._id, s.entry_time, s.zone_id)}
                        style={{ padding: "4px 8px", background: "var(--danger)", color: "var(--text-main)", border: "none", borderRadius: "4px", cursor: "pointer" }}
                      >
                        End
                      </button>
                    ) : (
                      <span style={{ color: "#aaa" }}>Done</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
