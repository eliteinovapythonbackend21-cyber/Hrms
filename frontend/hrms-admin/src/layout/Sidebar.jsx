import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navConfig } from "./navConfig";
import { useUI } from "@/context/UIContext";
import { getUser } from "@/utils/tokenHelpers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { resolveUploadUrl } from "@/utils/fileUrl";
import Avatar from "@/components/ui/Avatar";
import ThemeToggle from "@/theme/ThemeToggle";
import logoMark from "@/assets/logo-mark.svg";

const Icon = ({ name }) => {
  const icons = {
    dashboard: "M3 12l9-9 9 9M5 10v10h14V10",
    users: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4m4 4a4 4 0 10-4-4",
    employees: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4m4 4a4 4 0 10-4-4",
    attendance: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    leaves: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    master: "M4 6h16M4 12h16M4 18h16",
    department: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4",
    designation: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
    leaveType: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    network: "M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.07a9 9 0 0114.14 0M4.93 9.73a13 13 0 0114.14 0",
    roles: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
    collapse: "M15 19l-7-7 7-7",
    expand: "M9 5l7 7-7 7",
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[name] || icons.dashboard} />
    </svg>
  );
};

const navItemClass = (collapsed) => ({ isActive }) =>
  `group flex items-center gap-3 rounded-md text-sm font-medium transition-colors border-l-2 ${
    collapsed ? "justify-center px-2 py-2.5 lg:mx-1" : "px-3 py-2"
  } ${
    isActive
      ? "bg-primary-500/10 text-primary-600 border-primary-500 dark:text-primary-300 dark:border-primary-400"
      : "text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-white/5"
  }`;

function SubNav({ item, closeSidebar, collapsed }) {
  const location = useLocation();
  const childActive = item.children.some((c) => location.pathname.startsWith(c.path));
  const [open, setOpen] = useState(childActive);

  if (collapsed) {
    // No room for an inline flyout in the icon rail — jump straight to the
    // first child (e.g. Master Data -> Departments) instead.
    return (
      <NavLink
        to={item.children[0].path}
        onClick={closeSidebar}
        title={item.label}
        className={navItemClass(true)({ isActive: childActive })}
      >
        <Icon name={item.icon} />
      </NavLink>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border-l-2 ${
          childActive
            ? "text-primary-600 dark:text-primary-300 border-primary-500 dark:border-primary-400"
            : "text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-white/5"
        }`}
      >
        <Icon name={item.icon} />
        <span className="flex-1 text-left">{item.label}</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="mt-1 ml-4 pl-4 border-l border-slate-200 dark:border-white/10 space-y-1">
          {item.children.map((child) => (
            <NavLink key={child.path} to={child.path} onClick={closeSidebar} className={navItemClass(false)}>
              <Icon name={child.icon} />
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { sidebarOpen, closeSidebar, sidebarCollapsed, toggleSidebarCollapsed } = useUI();
  const user = getUser();
  const currentUser = useCurrentUser();

  const filteredNav = navConfig.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 ${sidebarCollapsed ? "lg:w-[4.5rem]" : "lg:w-64"} bg-white dark:bg-white/[0.03] dark:backdrop-blur-xl border-r border-slate-200 dark:border-white/10 transform transition-all duration-200 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className={`h-16 flex items-center gap-2.5 border-b border-slate-200 dark:border-white/10 shrink-0 ${sidebarCollapsed ? "lg:justify-center px-4 lg:px-0" : "px-4"}`}>
          <img src={logoMark} alt="" className="h-9 w-9 shrink-0" />
          <div className={`leading-tight ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              HRMS
            </p>
            <p className="text-[11px] font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wider">
              Admin Panel
            </p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {filteredNav.map((item) =>
            item.children ? (
              <SubNav key={item.path} item={item} closeSidebar={closeSidebar} collapsed={sidebarCollapsed} />
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                title={sidebarCollapsed ? item.label : undefined}
                className={navItemClass(sidebarCollapsed)}
              >
                <Icon name={item.icon} />
                <span className={sidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <div className={`shrink-0 border-t border-slate-200 dark:border-white/10 flex items-center gap-2.5 ${sidebarCollapsed ? "justify-center px-2 py-3" : "px-4 py-3"}`}>
          <Avatar
            name={currentUser?.username}
            src={resolveUploadUrl(currentUser?.profile_picture?.url)}
            size="sm"
          />
          <div className={`min-w-0 leading-tight ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {currentUser?.username || "User"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
              {currentUser?.role}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden lg:flex items-center justify-center gap-2 h-11 border-t border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0"
        >
          <Icon name={sidebarCollapsed ? "expand" : "collapse"} />
          {!sidebarCollapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
        <div className="shrink-0 border-t border-slate-200 dark:border-white/10 px-3 py-2.5">
          <ThemeToggle collapsed={sidebarCollapsed} />
        </div>
      </aside>
    </>
  );
}
