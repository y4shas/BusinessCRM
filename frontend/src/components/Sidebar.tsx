import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  LogOut,
  Building2,
  UserCog,
  ChevronRight,
} from "lucide-react";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function SidebarNavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const roleColors: Record<string, string> = {
    ADMIN: "badge-purple",
    SALES: "badge-blue",
    WAREHOUSE: "badge-amber",
    ACCOUNTS: "badge-green",
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Building2 size={18} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">BusinessCRM</div>
          <div className="sidebar-logo-sub">ERP Operations Portal</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Core — visible to all */}
        <span className="sidebar-section-label">Overview</span>
        <SidebarNavItem
          to="/dashboard"
          icon={<LayoutDashboard size={16} />}
          label="Dashboard"
        />

        <span className="sidebar-section-label">CRM</span>
        {hasRole("ADMIN", "SALES") && (
          <>
            <SidebarNavItem
              to="/customers"
              icon={<Users size={16} />}
              label="Customers"
            />
          </>
        )}

        <span className="sidebar-section-label">Inventory</span>
        {hasRole("ADMIN", "SALES", "WAREHOUSE") && (
          <>
            <span className="sidebar-section-label">Inventory</span>
            <SidebarNavItem
              to="/products"
              icon={<Package size={16} />}
              label="Products"
            />
          </>
        )}

        <span className="sidebar-section-label">Sales</span>
        {hasRole("ADMIN", "SALES", "ACCOUNTS", "WAREHOUSE") && (
          <SidebarNavItem
            to="/challans"
            icon={<FileText size={16} />}
            label="Challans"
          />
        )}

        {isAdmin && (
          <>
            <span className="sidebar-section-label">Admin</span>
            <SidebarNavItem
              to="/users"
              icon={<UserCog size={16} />}
              label="Users"
            />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{initials}</div>
          <div className="user-badge-info">
            <div className="user-badge-name">{user?.name}</div>
            <div className="user-badge-role">
              <span
                className={`badge ${roleColors[user?.role ?? ""] ?? "badge-gray"} text-xs`}
                style={{ padding: "1px 7px", fontSize: 10 }}
              >
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="btn-icon btn btn-secondary"
            title="Logout"
            style={{
              padding: "6px",
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
