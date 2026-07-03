import { useData } from "../data/useData";
import { Map, CheckCircle2, Clock, Flag, Car } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function formatDateTime(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString();
}

export default function CustomerDashboard() {
  const { auth } = useAuth();
  const result = useData(['zones', 'sessions/my']);
  const zones = result.zones;
  const mySessions = result['sessions/my'];
  const { loading, error } = result;

  if (loading) return <div className="page"><p>Loading data...</p></div>;
  if (error) return <div className="page"><p>Error: {error}</p></div>;
  if (!zones || !mySessions) return <div className="page"><p>No data available.</p></div>;

  const activeSessions = mySessions.filter(s => s.status === "Active");
  const completedCount = mySessions.filter(s => s.status === "Completed").length;
  const recentSessions = [...mySessions].sort((a, b) => String(b._id).localeCompare(String(a._id))).slice(0, 4);

  const stats = [
    { label: "Parking Zones", value: zones.length, icon: <Map size={24} />, color: "var(--accent)" },
    { label: "Total Available", value: zones.reduce((s, z) => s + z.available_slots, 0), icon: <CheckCircle2 size={24} />, color: "var(--success)" },
    { label: "My Active Sessions", value: activeSessions.length, icon: <Clock size={24} />, color: "var(--warning)" },
    { label: "My Completed", value: completedCount, icon: <Flag size={24} />, color: "var(--accent)" },
  ];

  return (
    <div className="page dashboard">
      <h1 className="page-title">Welcome, {(auth.full_name || auth.username || "").toUpperCase()}!</h1>
      <p className="page-subtitle">Your parking overview - book a slot, track sessions, and view payments.</p>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card" style={{ /* borderTopColor removed */ }}>
            <span className="stat-icon">{s.icon}</span>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {activeSessions.length > 0 && (
        <div className="panel" style={{ marginBottom: "1.5rem", borderLeft: "4px solid var(--warning)" }}>
          <h2 className="panel-title" style={{ color: "var(--warning)", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
            <Car size={24} style={{ marginRight: "8px", verticalAlign: "middle" }}/>
            {activeSessions.length > 1 ? "Your Active Sessions" : "You Have an Active Session"}
          </h2>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {activeSessions.map((session, i) => (
              <div key={session._id} style={i > 0 ? { paddingTop: '1.5rem', borderTop: '1px solid var(--border)' } : {}}>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", fontSize: "0.95rem" }}>
                  <div><span className="text-gray-light">Zone: </span><strong>{session.zone_name}</strong></div>
                  <div><span className="text-gray-light">Slot: </span><strong>{session.slot_number}</strong></div>
                  <div><span className="text-gray-light">Vehicle: </span><strong>{session.vehicle_plate}</strong></div>
                  <div><span className="text-gray-light">Entry: </span><strong>{formatDateTime(session.entry_time)}</strong></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <p style={{ color: "#78909c", fontSize: "0.85rem", margin: 0 }}>
              Go to <strong>My Sessions</strong> to end your session when you leave.
            </p>
          </div>
        </div>
      )}

      <div className="dashboard-panels">
        <div className="panel">
          <h2 className="panel-title">Zone Availability</h2>
          {zones.map((z) => {
            const pct = z.total_slots > 0
              ? Math.round((z.available_slots / z.total_slots) * 100)
              : 0;
            return (
              <div key={z.zone_id} className="zone-bar-row">
                <div className="zone-bar-label">
                  <span>{z.zone_name}</span>
                  <span className="zone-bar-pct">{z.available_slots} free &middot; ${z.hourly_rate.toFixed(2)}/hr</span>
                </div>
                <div className="zone-bar-track">
                  <div
                    className="zone-bar-fill"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct > 50 ? "var(--success)" : pct > 20 ? "var(--warning)" : "var(--danger)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h2 className="panel-title">My Recent Sessions</h2>
          {recentSessions.length === 0 ? (
            <p style={{ color: "#546e7a", fontSize: "0.9rem" }}>No sessions yet. Start one from My Sessions!</p>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Slot</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => (
                  <tr key={s._id}>
                    <td>{s.zone_name}</td>
                    <td>{s.slot_number}</td>
                    <td>
                      <span className={`badge ${s.status === "Active" ? "badge-active" : "badge-done"}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
