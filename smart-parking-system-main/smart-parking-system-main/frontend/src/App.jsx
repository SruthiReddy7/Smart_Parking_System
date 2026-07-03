import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Zones from "./pages/Zones";
import Slots from "./pages/Slots";
import Sessions from "./pages/Sessions";
import Payments from "./pages/Payments";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerSessions from "./pages/CustomerSessions";
import CustomerPayments from "./pages/CustomerPayments";
import Users from "./pages/Users";
import Vehicles from "./pages/Vehicles";
import "./App.css";

// Redirects to /login if not authenticated; renders Navbar + main layout when authenticated.
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { auth } = useAuth();
  if (!auth) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && auth.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
};

// Renders different elements depending on the user's role.
const RoleElement = ({ adminEl, customerEl }) => {
  const { auth } = useAuth();
  return auth?.role === "admin" ? adminEl : customerEl;
};

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Shared routes - content differs by role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleElement adminEl={<Dashboard />} customerEl={<CustomerDashboard />} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <RoleElement adminEl={<Sessions />} customerEl={<CustomerSessions />} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <RoleElement adminEl={<Payments />} customerEl={<CustomerPayments />} />
          </ProtectedRoute>
        }
      />

      {/* Admin-only routes */}
      <Route path="/zones" element={<ProtectedRoute adminOnly><Zones /></ProtectedRoute>} />
      <Route path="/slots" element={<ProtectedRoute adminOnly><Slots /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />

      <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

