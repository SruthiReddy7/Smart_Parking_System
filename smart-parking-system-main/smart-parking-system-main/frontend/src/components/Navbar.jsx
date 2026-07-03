import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Crown, LayoutDashboard, Map, Grid3x3, Users, KeySquare, CreditCard, LogOut } from "lucide-react";
import "./Navbar.css";

export default function Navbar() {
  const { auth, logout } = useAuth();
  const isAdmin = auth?.role === "admin";

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-title">
          <span className="spoiler">P</span>
          <span className="wheel wheel1">a</span> 
            r
          <span className="rel-inline-block">
            <Crown size={30} color="var(--primary)" style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-70%) rotate(340deg)' }} />
            K
          </span>
          i
          <span className="wheel wheel2">n</span>
          <span className='hood'>g</span>          
        </span>
      </div>
      <ul className="navbar-links">
        <li>
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
        </li>
        {isAdmin ? (
          <>
            <li>
              <NavLink to="/zones" className={({ isActive }) => (isActive ? "active" : "")}>
                Zones
              </NavLink>
            </li>
            <li>
              <NavLink to="/slots" className={({ isActive }) => (isActive ? "active" : "")}>
                Slots
              </NavLink>
            </li>
            <li>
              <NavLink to="/users" className={({ isActive }) => (isActive ? "active" : "")}>
                Users
              </NavLink>
            </li>
          </>
        ) : null}
        <li>
          <NavLink to="/vehicles" className={({ isActive }) => (isActive ? "active" : "")}>
            {isAdmin ? "Vehicles" : "My Vehicles"}
          </NavLink>
        </li>
        <li>
          <NavLink to="/sessions" className={({ isActive }) => (isActive ? "active" : "")}>
            {isAdmin ? "Sessions" : "My Sessions"}
          </NavLink>
        </li>
        <li>
          <NavLink to="/payments" className={({ isActive }) => (isActive ? "active" : "")}>
            {isAdmin ? "Payments" : "My Payments"}
          </NavLink>
        </li>
      </ul>
      <div className="navbar-user">
        <span className="navbar-username">
          <span className={`role-badge ${isAdmin ? "role-admin" : "role-customer"}`}>
            {isAdmin ? "Admin" : "Customer"}
          </span>
          {(auth?.full_name || auth?.username || "").toUpperCase()}
        </span>
        <button className="logout-btn" onClick={logout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
