import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { navConfig, CRM_EMPLOYEE_NAV, HR_EMPLOYEE_NAV, FINANCE_EMPLOYEE_NAV, FEEDBACK_NAV } from "./navConfig";
import { useUI } from "@/context/UIContext";
import { getUser } from "@/utils/tokenHelpers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { useIsCrmEmployee } from "@/hooks/useIsCrmEmployee";
import { useIsCrmMarketingEmployee } from "@/hooks/useIsCrmMarketingEmployee";
import { useIsHrEmployee } from "@/hooks/useIsHrEmployee";
import { useIsFinanceEmployee } from "@/hooks/useIsFinanceEmployee";
import { resolveUploadUrl } from "@/utils/fileUrl";
import Avatar from "@/components/ui/Avatar";
import ThemeToggle from "@/theme/ThemeToggle";
import logoMark from "@/assets/logo-mark.svg";

const Icon = ({ name, className = "h-5 w-5" }) => {
  const icons = {
    dashboard: "M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5",
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
    holiday: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    employeeLifecycle: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    crm: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4m4 4a4 4 0 10-4-4",
    finance: "M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6c1.11 0 2.08.402 2.599 1M12 8V6m0 8v2m0-10a9 9 0 100 18 9 9 0 000-18z",
    reports: "M9 17v-6h2v6H9zm4 0v-9h2v9h-2zM5 17V11h2v6H5zM3 21h18M4 4h16v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
    feedback: "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5zM8 10h.01M12 10h.01M16 10h.01",
    collapse: "M15 19l-7-7 7-7",
    expand: "M9 5l7 7-7 7",
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={icons[name] || icons.dashboard}
      />
    </svg>
  );
};

const navItemClass = (collapsed) => ({ isActive }) =>
  [
    "group relative flex items-center gap-3 rounded-xl text-sm transition-all duration-200",
    "border border-transparent",
    collapsed
      ? "justify-center px-2 py-3 lg:mx-1"
      : "px-3.5 py-2.5",
    isActive
      ? [
          "bg-gradient-to-r from-primary-500/15 via-primary-500/8 to-transparent",
          "text-primary-700 dark:text-primary-300",
          "border-primary-500/20 dark:border-primary-400/10",
          "shadow-sm shadow-primary-500/5",
        ].join(" ")
      : [
          "text-slate-600 dark:text-slate-300",
          "hover:bg-slate-100/90 dark:hover:bg-white/[0.055]",
          "hover:text-slate-900 dark:hover:text-white",
        ].join(" "),
  ].join(" ");

function SubNav({ item, closeSidebar, collapsed, userRole }) {
  const location = useLocation();

  const children = item.children.filter(
    (child) => !child.roles || child.roles.includes(userRole)
  );

  const childActive = children.some((child) =>
    location.pathname.startsWith(child.path)
  );

  const [open, setOpen] = useState(childActive);

  if (!children.length) return null;

  if (collapsed) {
    return (
      <NavLink
        to={children[0].path}
        onClick={closeSidebar}
        title={item.label}
        className={navItemClass(true)({
          isActive: childActive,
        })}
      >
        {childActive && (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary-500" />
        )}

        <Icon name={item.icon} />
      </NavLink>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl",
          "text-sm transition-all duration-200 border border-transparent",
          childActive
            ? "text-primary-700 dark:text-primary-300 bg-primary-500/8"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/90 dark:hover:bg-white/[0.055]",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            childActive
              ? "bg-primary-500/15 text-primary-600 dark:text-primary-300"
              : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400",
          ].join(" ")}
        >
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
        </span>

        <span className="flex-1 text-left font-medium">
          {item.label}
        </span>

        <svg
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div
        className={[
          "grid transition-all duration-200",
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div className="mt-1.5 ml-5 pl-5 border-l border-slate-200 dark:border-white/10 space-y-1">
            {children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={closeSidebar}
                className={navItemClass(false)}
              >
                <Icon
                  name={child.icon}
                  className="h-[17px] w-[17px] shrink-0"
                />
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const {
    sidebarOpen,
    closeSidebar,
    sidebarCollapsed,
    toggleSidebarCollapsed,
  } = useUI();

  const user = getUser();
  const currentUser = useCurrentUser();
  const { employee: myEmployee } = useMyEmployee();

  const displayName =
    [myEmployee?.first_name, myEmployee?.last_name].filter(Boolean).join(" ") ||
    currentUser?.username ||
    "User";
  const roleLine =
    [myEmployee?.designation?.designation_name, myEmployee?.department?.department_name]
      .filter(Boolean)
      .join(" · ") ||
    currentUser?.role ||
    "Member";

  const { isCrmEmployee } = useIsCrmEmployee();
  const { isCrmMarketingEmployee } = useIsCrmMarketingEmployee();
  const { isHrEmployee } = useIsHrEmployee();
  const { isFinanceEmployee } = useIsFinanceEmployee();

  // "Lead Upload" only ever shows for a CRM Marketing-designation employee
  // — every other CRM employee gets the rest of CRM_EMPLOYEE_NAV unchanged.
  const crmEmployeeNav = isCrmEmployee
    ? {
        ...CRM_EMPLOYEE_NAV,
        children: CRM_EMPLOYEE_NAV.children.filter(
          (child) => child.path !== "/crm/leads/upload" || isCrmMarketingEmployee
        ),
      }
    : null;

  const filteredNav = [
    ...navConfig.filter(
      (item) => !item.roles || item.roles.includes(user?.role)
    ),
    ...(crmEmployeeNav ? [crmEmployeeNav] : []),
    ...(isHrEmployee ? [HR_EMPLOYEE_NAV] : []),
    ...(isFinanceEmployee ? [FINANCE_EMPLOYEE_NAV] : []),
    ...(!FEEDBACK_NAV.roles || FEEDBACK_NAV.roles.includes(user?.role) ? [FEEDBACK_NAV] : []),
  ];

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          "fixed lg:static inset-y-0 left-0 z-40",
          "w-64",
          sidebarCollapsed ? "lg:w-[4.75rem]" : "lg:w-64",
          "bg-white/95 dark:bg-[#080c17]/95",
          "backdrop-blur-2xl",
          "border-r border-slate-200/80 dark:border-white/[0.08]",
          "transform transition-all duration-300 ease-out",
          "flex flex-col",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* BRAND */}
        <div
          className={[
            "h-16 flex items-center gap-3",
            "border-b border-slate-200/80 dark:border-white/[0.08]",
            "shrink-0",
            sidebarCollapsed
              ? "lg:justify-center px-4 lg:px-0"
              : "px-4",
          ].join(" ")}
        >
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-primary-500/20 blur-md" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 shadow-sm">
              <img
                src={logoMark}
                alt="HRMS"
                className="h-7 w-7"
              />
            </div>
          </div>

          <div
            className={`leading-tight ${
              sidebarCollapsed ? "lg:hidden" : ""
            }`}
          >
            <p className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
              HRMS
            </p>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.16em]">
                Workspace
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {!sidebarCollapsed && (
            <div className="px-3 pb-2 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-600">
                Main Menu
              </p>
            </div>
          )}

          {filteredNav.map((item) =>
            item.children ? (
              <SubNav
                key={item.path}
                item={item}
                closeSidebar={closeSidebar}
                collapsed={sidebarCollapsed}
                userRole={user?.role}
              />
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                title={sidebarCollapsed ? item.label : undefined}
                className={navItemClass(sidebarCollapsed)}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary-500" />
                    )}

                    <span
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                        isActive
                          ? "bg-primary-500/15 text-primary-600 dark:text-primary-300"
                          : "text-slate-500 dark:text-slate-400 group-hover:bg-slate-200/70 dark:group-hover:bg-white/5",
                      ].join(" ")}
                    >
                      <Icon
                        name={item.icon}
                        className="h-[18px] w-[18px]"
                      />
                    </span>

                    <span
                      className={
                        sidebarCollapsed ? "lg:hidden font-medium" : "font-medium"
                      }
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        {/* USER AREA */}
        <div className="shrink-0 border-t border-slate-200/80 dark:border-white/[0.08] p-3">
          <div
            className={[
              "rounded-xl",
              "bg-slate-50 dark:bg-white/[0.035]",
              "border border-slate-200/70 dark:border-white/[0.06]",
              "p-2",
              "flex items-center gap-2.5",
              sidebarCollapsed ? "lg:justify-center" : "",
            ].join(" ")}
          >
            <div className="relative shrink-0">
              <Avatar
                name={currentUser?.username}
                src={resolveUploadUrl(
                  currentUser?.profile_picture?.url
                )}
                size="sm"
              />
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0b0c10]" />
            </div>

            <div
              className={`min-w-0 leading-tight ${
                sidebarCollapsed ? "lg:hidden" : ""
              }`}
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {displayName}
              </p>

              <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate mt-0.5">
                {roleLine}
              </p>
            </div>
          </div>
        </div>

        {/* COLLAPSE */}
        <button
          type="button"
          onClick={toggleSidebarCollapsed}
          title={
            sidebarCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
          className="hidden lg:flex items-center justify-center gap-2 h-11 border-t border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-300 hover:bg-slate-50 dark:hover:bg-white/[0.035] transition-colors shrink-0"
        >
          <Icon
            name={sidebarCollapsed ? "expand" : "collapse"}
            className="h-[18px] w-[18px]"
          />

          {!sidebarCollapsed && (
            <span className="text-[11px] font-medium">
              Collapse sidebar
            </span>
          )}
        </button>

        {/* THEME */}
        <div className="shrink-0 border-t border-slate-200/80 dark:border-white/[0.08] px-3 py-2.5">
          <ThemeToggle collapsed={sidebarCollapsed} />
        </div>

        {/* PROFILE DETAILS — below the theme selection, all logins */}
        {!sidebarCollapsed && (
          <div className="shrink-0 border-t border-slate-200/80 px-3 py-3 dark:border-white/[0.08]">
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-600">
              My profile
            </p>
            <dl className="space-y-1 text-[10.5px] leading-tight">
              {myEmployee ? (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400 dark:text-slate-500">Code</dt>
                    <dd className="truncate font-medium text-slate-600 dark:text-slate-300">
                      {myEmployee.employee_code || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400 dark:text-slate-500">Phone</dt>
                    <dd className="truncate font-medium text-slate-600 dark:text-slate-300">
                      {myEmployee.phone || currentUser?.mobile || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400 dark:text-slate-500">Emergency</dt>
                    <dd className="truncate font-medium text-slate-600 dark:text-slate-300">
                      {currentUser?.emergency_contact_number ||
                        myEmployee.emergency_contact_number ||
                        "—"}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400 dark:text-slate-500">Email</dt>
                    <dd className="truncate font-medium text-slate-600 dark:text-slate-300">
                      {currentUser?.email || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400 dark:text-slate-500">Mobile</dt>
                    <dd className="truncate font-medium text-slate-600 dark:text-slate-300">
                      {currentUser?.mobile || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-400 dark:text-slate-500">Role</dt>
                    <dd className="truncate font-medium capitalize text-slate-600 dark:text-slate-300">
                      {currentUser?.role || "—"}
                    </dd>
                  </div>
                </>
              )}
            </dl>
            <NavLink
              to={
                currentUser?.employee?.id
                  ? `/employees/${currentUser.employee.id}`
                  : currentUser?.id
                  ? `/users/${currentUser.id}`
                  : "/dashboard"
              }
              className="mt-2 block text-[10px] font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              View full profile →
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
}