// Role-based navigation items.
// roles: array of roles allowed to see this item (empty = all authenticated).
export const navConfig = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "dashboard",
    roles: ["admin", "employee"],
  },
  {
    label: "Users",
    path: "/users",
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
    roles: ["admin", "employee"],
  },
  {
    label: "Leaves",
    path: "/leaves",
    icon: "leaves",
    roles: ["admin", "employee"],
  },
  {
    label: "Master Data",
    path: "/master",
    icon: "master",
    roles: ["admin"],
    children: [
      { label: "Departments", path: "/master/departments", icon: "department" },
      { label: "Designations", path: "/master/designations", icon: "designation" },
      { label: "Leave Types", path: "/master/leave-types", icon: "leaveType" },
    ],
  },
  {
    label: "Network Logs",
    path: "/network",
    icon: "network",
    roles: ["admin"],
  },
  {
    label: "Roles",
    path: "/roles",
    icon: "roles",
    roles: ["admin"],
  },
];
