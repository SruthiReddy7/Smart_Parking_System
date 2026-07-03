import { useState, useMemo } from "react";
import { useData } from "../data/useData";
import "./Dashboard.css";
import "./Slots.css";
import "./Payments.css";

function formatDateTime(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString();
}

export default function CustomerPayments() {
  const result = useData(['payments/my']);
  const myPayments = result['payments/my'];
  const { loading, error } = result;

  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedPayments = useMemo(() => {
    if (!myPayments) return [];

    let filtered = [...myPayments];

    if (filterStatus !== "All") {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const plate = p.session_ref?.vehicle_plate?.toLowerCase() || "";
        const id = String(p._id).toLowerCase();
        return plate.includes(q) || id.includes(q);
      });
    }

    // Sort by session entry time descending (newest entries on top)
    filtered.sort((a, b) => {
      const timeA = a.session_ref?.entry_time ? new Date(a.session_ref.entry_time).getTime() : 0;
      const timeB = b.session_ref?.entry_time ? new Date(b.session_ref.entry_time).getTime() : 0;
      return timeB - timeA;
    });

    return filtered;
  }, [myPayments, filterStatus, searchQuery]);

  if (loading) return <div className="page"><p>Loading data...</p></div>;
  if (error) return <div className="page"><p>Error: {error}</p></div>;
  if (!myPayments) return <div className="page"><p>No data available.</p></div>;

  const totalPaid = myPayments
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="page">
      <h1 className="page-title">My Payments</h1>
      <p className="page-subtitle">Payment history for your parking sessions.</p>

      <div className="payments-summary">
        <div className="pay-stat">
          <span className="pay-stat-label">Total Spent</span>
          <span className="pay-stat-value">${totalPaid.toFixed(2)}</span>
        </div>
        <div className="pay-stat">
          <span className="pay-stat-label">Paid</span>
          <span className="pay-stat-value text-success">
            {myPayments.filter((p) => p.status === "Paid").length}
          </span>
        </div>
        <div className="pay-stat">
          <span className="pay-stat-label">Pending</span>
          <span className="pay-stat-value text-warning">
            {myPayments.filter((p) => p.status === "Pending").length}
          </span>
        </div>
      </div>

      <div className="slots-filters mb-1-flex-gap-1">
        <input 
          type="text" 
          placeholder="Search by Plate or ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input form-input-alt flex-1"
        />
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-input-alt"
        >
          <option value="All">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      <div className="slots-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Session</th>
              <th>Plate</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Paid At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center-p-1-5">
                  No payments found.
                </td>
              </tr>
            ) : (
              filteredAndSortedPayments.map((p) => (
                <tr key={p._id}>
                  <td title={p._id}>{String(p._id).slice(-6)}</td>
                  <td>{p.session_ref ? `#${String(p.session_ref._id || p.session_ref).slice(-6)}` : "-"}</td>
                  <td>{p.session_ref?.vehicle_plate || "-"}</td>
                  <td>{p.amount != null ? `$${p.amount.toFixed(2)}` : "-"}</td>
                  <td>{p.method || "-"}</td>
                  <td>{formatDateTime(p.payment_time)}</td>
                  <td>
                    <span className={`badge ${p.status === "Paid" ? "badge-paid" : "badge-pending"}`}>
                      {p.status}
                    </span>
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
