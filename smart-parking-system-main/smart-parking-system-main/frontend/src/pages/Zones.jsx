import { useState } from "react";
import { useData } from "../data/useData";
import { useAuth } from "../context/AuthContext";
import { MapPin } from "lucide-react";
import "./Dashboard.css";
import "./Zones.css";

export default function Zones() {
  const { auth } = useAuth();
  const { zones, loading, error, refreshData } = useData(['zones']);
  const [formData, setFormData] = useState({ zone_name: "", location: "", total_slots: "", hourly_rate: "" });
  
  // Add state for Edit Modal
  const [editingZone, setEditingZone] = useState(null);

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error loading database: {error}. Please ensure your MongoDB Atlas IP is whitelisted and your backend is connected.</div>;
  if (!zones) return <div>No data available.</div>;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddZone = async (e) => {
    e.preventDefault();
    await fetch("/api/zones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        zone_id: Math.floor(Math.random() * 10000),
        zone_name: formData.zone_name,
        location: formData.location,
        total_slots: parseInt(formData.total_slots),
        available_slots: parseInt(formData.total_slots), // starts fully available
        hourly_rate: parseFloat(formData.hourly_rate)
      })
    });
    setFormData({ zone_name: "", location: "", total_slots: "", hourly_rate: "" });
    refreshData();
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm("Are you sure you want to delete this zone? All slots in this zone will be permanently removed. This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/zones/${zoneId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${auth.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete zone");
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  const handleEditChange = (e) => {
    setEditingZone({ ...editingZone, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/zones/${editingZone.zone_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          zone_name: editingZone.zone_name,
          location: editingZone.location,
          total_slots: parseInt(editingZone.total_slots),
          hourly_rate: parseFloat(editingZone.hourly_rate)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update zone");
      setEditingZone(null);
      refreshData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Parking Zones</h1>
      <p className="page-subtitle">All registered parking zones and their current availability</p>

      <div className="panel mb-20">
        <h2 className="panel-title">Add New Parking Zone</h2>
        <form onSubmit={handleAddZone} className="form-row flex-wrap">
          <input name="zone_name" placeholder="Zone Name" value={formData.zone_name} onChange={handleInputChange} required className="form-input" />
          <input name="location" placeholder="Location" value={formData.location} onChange={handleInputChange} required className="form-input" />
          <input name="total_slots" placeholder="Total Slots" type="number" value={formData.total_slots} onChange={handleInputChange} required className="form-input" />
          <input name="hourly_rate" placeholder="Hourly Rate ($)" type="number" step="0.01" value={formData.hourly_rate} onChange={handleInputChange} required className="form-input" />
          <button type="submit" className="btn-success px-4">
            Create Zone
          </button>
        </form>
      </div>

      <div className="zones-grid">
        {zones.map((z) => {
          const pct = Math.round((z.available_slots / z.total_slots) * 100);
          const color = pct > 50 ? "var(--success)" : pct > 20 ? "var(--warning)" : "var(--danger)";
          return (
            <div key={z.zone_id} className="zone-card">
              <div className="zone-card-header flex-between-center">
                <div>
                  <h2 className="zone-name">{z.zone_name}</h2>
                  <span className="zone-location flex-center-gap-4"><MapPin size={16} /> {z.location}</span>       
                </div>
                <div className="flex-gap-8">
                  <button 
                    className="btn-zone-action btn-zone-edit"
                    onClick={() => setEditingZone(z)}
                    title="Edit Zone"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="zone-stats">
                <div className="zone-stat">
                  <span className="zone-stat-value">{z.total_slots}</span>
                  <span className="zone-stat-label">Total</span>
                </div>
                <div className="zone-stat">
                  <span className="zone-stat-value text-success">
                    {z.available_slots}
                  </span>
                  <span className="zone-stat-label">Available</span>
                </div>
                <div className="zone-stat">
                  <span className="zone-stat-value text-danger">
                    {z.total_slots - z.available_slots}
                  </span>
                  <span className="zone-stat-label">Occupied</span>
                </div>
                <div className="zone-stat">
                  <span className="zone-stat-value text-warning">
                    ${z.hourly_rate.toFixed(2)}
                  </span>
                  <span className="zone-stat-label">/ Hour</span>
                </div>
              </div>
              <div className="zone-bar-row">
                <div className="zone-bar-label">
                  <span>Availability</span>
                  <span className="zone-bar-pct">{pct}%</span>
                </div>
                <div className="zone-bar-track">
                  <div className="zone-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingZone && (
        <div className="modal-overlay">
          <div className="panel modal-content">
            <div className="heading-edit">
              <h2 className="panel-title">Edit Zone</h2>
              <button 
                  type="button" 
                  className="btn-zone-action btn-zone-delete"
                  onClick={() => {
                    handleDeleteZone(editingZone.zone_id);
                    setEditingZone(null); 
                  }}
                >
                  Delete Zone
              </button>
              
            </div>

            <form onSubmit={handleEditSubmit} className="modal-form-col">
              <label>
                Zone Name:
                <input name="zone_name" value={editingZone.zone_name} onChange={handleEditChange} required className="form-input w-100" />
              </label>
              <label>
                Location:
                <input name="location" value={editingZone.location} onChange={handleEditChange} required className="form-input w-100" />
              </label>
              <label>
                Total Slots:
                <input name="total_slots" type="number" value={editingZone.total_slots} onChange={handleEditChange} required className="form-input w-100" />
              </label>
              <label>
                Hourly Rate ($):
                <input name="hourly_rate" type="number" step="0.01" value={editingZone.hourly_rate} onChange={handleEditChange} required className="form-input w-100" />
              </label>
              
              <div className="modal-actions">
                
                <div className="flex-gap-10">
                  <button type="button" className="btn-zone-cancel btn-cancel" onClick={() => setEditingZone(null)}>Cancel</button>
                  <button type="submit" className="btn-primary px-4">Save Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
