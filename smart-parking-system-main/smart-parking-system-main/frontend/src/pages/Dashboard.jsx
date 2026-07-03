import { useData } from "../data/useData";
import { Map, Grid3x3, CheckCircle2, Car, CreditCard, Activity, Clock } from "lucide-react";
import "./Dashboard.css";

export default function Dashboard() {
  const { zones, sessions, payments, loading, error } = useData(['zones', 'sessions', 'payments']);

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error loading database: {error}. Please ensure your MongoDB Atlas IP is whitelisted and your backend is connected.</div>;
  if (!zones || !sessions || !payments) return <div>No data available.</div>;

  const totalSlots = zones.reduce((sum, z) => sum + z.total_slots, 0);
  const availableSlots = zones.reduce((sum, z) => sum + z.available_slots, 0);
  const occupiedSlots = totalSlots - availableSlots;
  const totalRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const stats = [
    { label: "Parking Zones", value: zones.length, icon: <Map size={26} />, color: "var(--accent)" },
    { label: "Total Slots", value: totalSlots, icon: <Grid3x3 size={26} />, color: "var(--primary)" },
    { label: "Available", value: availableSlots, icon: <CheckCircle2 size={26} />, color: "var(--success)" },
    { label: "Occupied", value: occupiedSlots, icon: <Car size={26} />, color: "var(--danger)" },
    { label: "Revenue Total", value: `$${totalRevenue.toFixed(2)}`, icon: <CreditCard size={26} />, color: "var(--warning)" },
  ];

  return (
    <div className="page dashboard">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Real-time overview of ParKing</p>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-icon" style={{ color: s.color, backgroundColor: `color-mix(in srgb, ${s.color} 15%, transparent)` }}>
              {s.icon}
            </span>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <h2 className="panel-title">Zone Availability</h2>
          {zones.map((z) => {
            const zoneAvailable = z.available_slots;
            const pct = z.total_slots > 0
              ? Math.round((zoneAvailable / z.total_slots) * 100)
              : 0;
            return (
              <div key={z.zone_id} className="zone-bar-row">
                <div className="zone-bar-label">
                  <span>{z.zone_name}</span>
                  <span className="zone-bar-pct">{pct}% free</span>
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
          <h2 className="panel-title">Recent Sessions</h2>
          <table className="mini-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Plate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...sessions].sort((a, b) => String(b._id).localeCompare(String(a._id))).slice(0, 4).map((s) => (
                <tr key={s._id}>
                  <td>{s.driver_name}</td>
                  <td>{s.vehicle_plate}</td>
                  <td>
                    <span className={`badge ${s.status === "Active" ? "badge-active" : "badge-done"}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
