import { EMPLOYEE_LIKE_ROLES, ANY_HR_ROLE, HR_ADMIN_ROLES, PAYROLL_ROLES, TRAINING_ROLES, HR_SUB_ROLES } from "@/constants/roles";

const slugify = (role) => role.toLowerCase().replace(/\s+/g, "-");

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
    // All full-CRUD master-control screens (Edit + Delete) live here,
    // admin-only. Every other module's lists are add-only for non-admins,
    // with row-level Edit/Delete additionally gated by the RolePermission
    // matrix (see useModulePermissions / MasterListActions).
    label: "Admin",
    path: "/master/departments",
    icon: "users",
    roles: ["admin"],
    children: [
      { label: "Admins", path: "/users/admins", icon: "users" },
      { label: "Company", path: "/master/company", icon: "department" },
      { label: "Branches", path: "/master/branches", icon: "department" },
      { label: "Departments", path: "/master/departments", icon: "department" },
      { label: "Designations", path: "/master/designations", icon: "designation" },
      { label: "Employees", path: "/master/employees", icon: "employees" },
      { label: "Documents", path: "/employee/documents", icon: "employeeLifecycle" },
      { label: "Promotions", path: "/employee/promotions", icon: "employeeLifecycle" },
      { label: "Transfers", path: "/employee/transfers", icon: "employeeLifecycle" },
      { label: "Resignations", path: "/employee/resignations", icon: "employeeLifecycle" },
      { label: "Performance", path: "/employee/performance", icon: "employeeLifecycle" },
      { label: "Reports", path: "/reports", icon: "reports" },
      { label: "Roles & Permissions", path: "/roles", icon: "roles" },
    ],
  },

  {
    label: "Employees",
    path: "/employees",
    icon: "employees",
    // Every seeded HR sub-role carries at least Employee:view permission
    // (see backend seed migration cf5ef8d585e8); Recruiter additionally has
    // Employee:add. Route-level access here is view-or-better; the Add
    // button on the list itself is still visually present for everyone who
    // can reach the screen (no separate add-permission gate at this layer).
    roles: ANY_HR_ROLE,
  },
  // {
  //   label: "Employee Lifecycle",
  //   path: "/employee",
  //   icon: "employeeLifecycle",
  //   roles: ANY_HR_ROLE,
  //   children: [
  //     // { label: "Documents", path: "/employee/documents", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //     // { label: "Permissions", path: "/employee/permissions", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //     // { label: "Overtime", path: "/employee/overtime", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //     // { label: "Payroll", path: "/employee/payroll", icon: "employeeLifecycle", roles: PAYROLL_ROLES },
  //     // { label: "Performance", path: "/employee/performance", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //     // { label: "Training", path: "/employee/training", icon: "employeeLifecycle", roles: TRAINING_ROLES },
  //     // { label: "Promotions", path: "/employee/promotions", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //     // { label: "Transfers", path: "/employee/transfers", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //     // { label: "Resignations", path: "/employee/resignations", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //     // { label: "Exit Management", path: "/employee/exit-management", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
  //   ],
  // },
  // {
  //   label: "Attendance",
  //   path: "/attendance",
  //   icon: "attendance",
  //   roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
  // },
  // {
  //   label: "Leave Types",
  //   path: "/leave-types",
  //   icon: "leaveType",
  //   roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
  // },
  // {
  //   label: "Leaves",
  //   path: "/leaves",
  //   icon: "leaves",
  //   roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
  // },

  {
    label: "Holidays",
    path: "/holidays",
    icon: "holiday",
    roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
    children: [
      {
        label: "Holidays",
        path: "/holidays",
        icon: "holiday",
        roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
      },
      {
        label: "Leave Types", 
        path: "/leave-types",
        icon: "leaveType",
        roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
      },
    ],
  },

  {
    label: "Network Logs",
    path: "/network",
    icon: "network",
    roles: ["admin"],
  },
  {
    label: "CRM",
    path: "/crm",
    icon: "crm",
    roles: ["admin"],
    children: [
      // Dedicated CRM-only employees route (was "/master/employees"):
      // renders EmployeeListPage with hideSalary + hideActions so this
      // section only ever shows org info + status, no compensation or
      // row-level actions. Admin's and Finance's "Employees" children
      // below are untouched and still point at "/master/employees".
      { label: "Employees", path: "/crm/employees", icon: "employees" },
      { label: "Leads", path: "/crm/leads", icon: "crm" },
      { label: "Customers", path: "/crm/customers", icon: "crm" },
      { label: "Follow-ups", path: "/crm/follow-ups", icon: "crm" },
      { label: "Registertion", path: "/crm/meetings", icon: "crm" },
      { label: "Incentive", path: "/crm/quotations", icon: "crm" },
      { label: "Invoices", path: "/crm/invoices", icon: "crm" },
      { label: "Payments", path: "/crm/payments", icon: "crm" },
      { label: "Support Tickets", path: "/crm/support-tickets", icon: "crm" },
    ],
  },
  {
    label: "Finance",
    path: "/finance",
    icon: "finance",
    roles: ["admin", "finance"],
    children: [
      // { label: "Accounts", path: "/finance/accounts", icon: "finance" },
      // { label: "Vendors", path: "/finance/vendors", icon: "finance" },
      // { label: "Expenses", path: "/finance/expenses", icon: "finance" },
      // { label: "Income", path: "/finance/income", icon: "finance" },
      { label: "Employees", path: "/master/employees", icon: "employees" },
      { label: "Payroll", path: "/employee/payroll", icon: "employeeLifecycle", roles: PAYROLL_ROLES },
      { label: "Attendance", path: "/finance/attendance", icon: "attendance", roles: ["admin", ...EMPLOYEE_LIKE_ROLES] },
    ],
  },
  {
    label: "HR",
    path: "/users/hr",
    icon: "employeeLifecycle",
    // roles: ["admin", ...HR_SUB_ROLES],
    children: [
      { label: "Attendance", path: "/attendance", icon: "attendance", roles: ["admin", ...EMPLOYEE_LIKE_ROLES] },
      { label: "Leaves", path: "/leaves", icon: "leaves", roles: ["admin", ...EMPLOYEE_LIKE_ROLES] },
      { label: "Training", path: "/employee/training", icon: "employeeLifecycle", roles: TRAINING_ROLES },
      { label: "Permissions", path: "/employee/permissions", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
      { label: "Overtime", path: "/employee/overtime", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
      // ...HR_SUB_ROLES.filter((role) => role !== "HR").map((role) => ({
      //   label: role,
      //   path: `/users/hr/${slugify(role)}`,
      //   icon: "employeeLifecycle",
      // })),
    ],
  },
  // {
  //   label: "Reports",
  //   path: "/reports",
  //   icon: "reports",
  //   roles: ["admin", "finance", "HR Director", "HR Manager"],
  // },
];