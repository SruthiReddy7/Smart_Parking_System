import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

export default function Vehicles() {
  const { auth } = useAuth();
  const isAdmin = auth?.role === "admin";

  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [newPlate, setNewPlate] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newFuel, setNewFuel] = useState("Petrol");
  const [newOwner, setNewOwner] = useState("");

  const fetchData = async () => {
    try {
      const vRes = await fetch("/api/vehicles", {
        headers: { "Authorization": "Bearer " + auth.token }
      });
      const vData = await vRes.json();
      if (!vRes.ok) throw new Error(vData.error || "Failed to load vehicles"); 
      setVehicles(vData);

      if (isAdmin) {
        const uRes = await fetch("/api/users", {
          headers: { "Authorization": "Bearer " + auth.token }
        });
        const uData = await uRes.json();
        if (uRes.ok) {
           setUsers(uData.filter(u => u.role !== 'admin'));
           if (uData.length > 0) {
             const firstCust = uData.find(u => u.role !== 'admin');
             if (firstCust) setNewOwner(firstCust._id);
           }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.token) {
      fetchData();
    }
  }, [auth?.token]);

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        vehicle_plate: newPlate,
        vehicle_model: newModel,
        fuel_type: newFuel
      };
      if (isAdmin && newOwner) {
        payload.user_id = newOwner;
      }

      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + auth.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add vehicle");   
      setNewPlate("");
      setNewModel("");
      setNewFuel("Petrol");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="page">Loading data...</div>;
  if (error) return <div className="page">Error: {error}</div>;

  return (
    <div className="page dashboard">
      <h1 className="page-title">{isAdmin ? "All System Vehicles" : "My Vehicles"}</h1>
      <p className="page-subtitle">{isAdmin ? "Manage all registered vehicles across the platform" : "Manage your registered vehicles"}</p>       

      <form onSubmit={handleAddVehicle} className="form-panel" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          placeholder="License Plate (e.g. ABC-1234)"
          value={newPlate}
          onChange={(e) => setNewPlate(e.target.value)}
          required
          className="form-input flex-1 min-w-150"
        />
        <input
          placeholder="Vehicle Model (e.g. Toyota Prius)"
          value={newModel}
          onChange={(e) => setNewModel(e.target.value)}
          required
          className="form-input flex-1 min-w-150"
        />
        <select value={newFuel} onChange={(e) => setNewFuel(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", flex: 1, minWidth: "120px" }}>
          <option>Petrol</option>
          <option>Diesel</option>
          <option>Electric</option>
          <option>Hybrid</option>
        </select>
        
        {isAdmin && (
          <select value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="form-input flex-1 min-w-150" required>
            <option value="" disabled>Select Owner...</option>
            {users.map(u => (
               <option key={u._id} value={u._id}>{u.username} ({u.full_name})</option>
            ))}
          </select>
        )}

        <button type="submit" style={{ padding: "8px 16px", background: "var(--success)", color: "var(--surface)", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", transition: "filter 0.2s" }} onMouseOver={e => e.currentTarget.style.filter = "brightness(1.1)"} onMouseOut={e => e.currentTarget.style.filter = "none"}>
          Create Vehicle
        </button>   
      </form>

      <div className="slots-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>License Plate</th>
              <th>Model</th>
              <th>Fuel Type</th>
              {isAdmin && <th>Owner</th>}
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v._id}>
                <td><strong>{v.vehicle_plate}</strong></td>
                <td>{v.vehicle_model || "-"}</td>
                <td>{v.fuel_type}</td>
                {isAdmin && <td>{v.user_id?.username || "-"}</td>}    
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr><td colSpan={isAdmin ? "4" : "3"}>No vehicles registered.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
