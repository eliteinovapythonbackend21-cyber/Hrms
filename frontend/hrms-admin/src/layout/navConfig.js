import { EMPLOYEE_LIKE_ROLES } from "@/constants/roles";

// Role-based navigation items.
// roles: array of roles allowed to see this item (empty = all authenticated).
// HR and Finance get the same access as Employee (see EMPLOYEE_LIKE_ROLES).
export const navConfig = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
    roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
  },
  {
    label: "Admin",
    path: "/users/admins",
    icon: "users",
    roles: ["admin"],
  },
  {
    label: "Employees",
    path: "/employees",
    icon: "employees",
    roles: ["admin"],
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: "attendance",
    roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
  },
  {
    label: "Leaves",
    path: "/leaves",
    icon: "leaves",
    roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
    children: [
      { label: "Leave Type", path: "/master/leave-types", icon: "leaveType", roles: ["admin"] },
      { label: "Leave", path: "/leaves", icon: "leaves" },
    ],
  },
  {
    label: "Master Data",
    path: "/master",
    icon: "master",
    roles: ["admin"],
    children: [
      { label: "Departments", path: "/master/departments", icon: "department" },
      { label: "Designations", path: "/master/designations", icon: "designation" },
    ],
  },
  {
    label: "Network Logs",
    path: "/network",
    icon: "network",
    roles: ["admin"],
  },
  // Roles CRUD is disabled for now — not needed in the admin panel currently.
  // Re-enable by uncommenting this entry, the route in AppRouter.jsx, and the
  // routePermissions.js entry.
  // {
  //   label: "Roles",
  //   path: "/roles",
  //   icon: "roles",
  //   roles: ["admin"],
  // },
];
