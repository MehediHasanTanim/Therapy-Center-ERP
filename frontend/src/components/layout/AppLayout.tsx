import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../modules/auth/AuthContext";
import { Role } from "../../types";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

interface NavGroup {
  key: "therapy" | "school";
  label: string;
  items: NavItem[];
}

const dashboardItem: NavItem = { to: "/dashboard", label: "Dashboard", roles: ["super_admin", "admin", "staff"] };
const userManagementItem: NavItem = { to: "/users", label: "User Management", roles: ["super_admin", "admin"] };

const navGroups: NavGroup[] = [
  {
    key: "therapy",
    label: "Therapy",
    items: [
      { to: "/patients", label: "Patients", roles: ["super_admin", "admin", "staff"] },
      { to: "/therapists", label: "Therapists", roles: ["super_admin", "admin", "staff"] },
      { to: "/scheduling", label: "Scheduling", roles: ["super_admin", "admin", "staff"] },
      { to: "/sessions", label: "Sessions", roles: ["super_admin", "admin", "staff"] },
      { to: "/assessments", label: "Assessments", roles: ["super_admin", "admin", "staff"] }
    ]
  },
  {
    key: "school",
    label: "School",
    items: []
  }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<NavGroup["key"], boolean>>({
    therapy: true,
    school: false
  });

  if (!user) return null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Therapy Center ERP</h1>
        <p>{user.name}</p>
        <p className="chip">{user.role}</p>
        <nav>
          {dashboardItem.roles.includes(user.role) ? (
            <NavLink className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} to={dashboardItem.to}>
              {dashboardItem.label}
            </NavLink>
          ) : null}
          {userManagementItem.roles.includes(user.role) ? (
            <NavLink className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} to={userManagementItem.to}>
              {userManagementItem.label}
            </NavLink>
          ) : null}

          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(user.role));
            return (
              <div key={group.key} className="nav-group">
                <button
                  className="nav-group-trigger"
                  type="button"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
                >
                  <span>{group.label}</span>
                  <span className={`nav-group-chevron ${openGroups[group.key] ? "open" : ""}`}>›</span>
                </button>
                {openGroups[group.key] ? (
                  visibleItems.length > 0 ? (
                    <div className="nav-group-items">
                      {visibleItems.map((item) => (
                        <NavLink key={item.to} className={({ isActive }) => `nav-item sub ${isActive ? "active" : ""}`} to={item.to}>
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  ) : (
                    <p className="nav-empty">No modules yet</p>
                  )
                ) : null}
              </div>
            );
          })}
        </nav>
        <button className="btn btn-danger" onClick={logout}>
          Logout
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
