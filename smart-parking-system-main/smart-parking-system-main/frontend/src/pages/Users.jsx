import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css"; // Reuse dashboard/table styles

export default function Users() {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users", {
          headers: { "Authorization": `Bearer ${auth.token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load users");
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [auth.token]);

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="page dashboard">
      <h1 className="page-title">Users Directory</h1>
      <p className="page-subtitle">List of all registered drivers and admins</p>

      <div className="slots-table-wrap" style={{ marginTop: "20px" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              {/* <th>Revenue</th> */}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td className="text-muted">{u.user_id}</td>
                <td><strong>{u.username}</strong></td>
                <td>{u.full_name || "-"}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-occupied' : 'badge-available'}`} style={{ textTransform: 'capitalize' }}>
                    {u.role}
                  </span>
                </td>
                {/* <td><strong>${(u.revenue || 0).toFixed(2)}</strong></td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}