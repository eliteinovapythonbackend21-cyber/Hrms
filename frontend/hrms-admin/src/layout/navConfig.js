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
    label: "Employee Attendance",
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
    // Non-employee roles (admin, HR sub-roles, finance) keep the original
    // "Holidays" section with its own Leave Types child, unchanged.
    label: "Holidays",
    path: "/holidays",
    icon: "holiday",
    roles: ["admin", "finance", ...HR_SUB_ROLES],
    children: [
      {
        label: "Calendar",
        path: "/holidays/calendar",
        icon: "holiday",
        roles: ["admin", "finance", ...HR_SUB_ROLES],
      },
      {
        label: "Holidays",
        path: "/holidays",
        icon: "holiday",
        roles: ["admin", "finance", ...HR_SUB_ROLES],
      },
      {
        label: "Leave Types",
        path: "/leave-types",
        icon: "leaveType",
        roles: ["admin", "finance", ...HR_SUB_ROLES],
      },
    ],
  },
  {
    // Plain "employee" logins (Normal, CRM and HR department employees
    // alike — the CRM/HR sections below are layered on top of this same
    // base nav) get their own attendance section straight under
    // Dashboard, split out from the holiday-related screens below.
    // Admin/HR-sub-role/Finance nav is untouched.
    label: "My Attendance",
    path: "/attendance",
    icon: "attendance",
    roles: ["employee"],
    children: [
      { label: "Attendance", path: "/attendance", icon: "attendance", roles: ["employee"] },
      { label: "Leave", path: "/leaves", icon: "leaves", roles: ["employee"] },
      { label: "Monthly Leave Record", path: "/leaves/monthly-record", icon: "leaves", roles: ["employee"] },
    ],
  },
  {
    // Everything holiday/leave-type related for a plain employee login,
    // plus a standalone "Calendar" screen (the same widget shown on the
    // Dashboard) for a dedicated month view.
    label: "My Holidays",
    path: "/my-calendar",
    icon: "holiday",
    roles: ["employee"],
    children: [
      { label: "Calendar", path: "/my-calendar", icon: "attendance", roles: ["employee"] },
      { label: "Holidays", path: "/holidays", icon: "holiday", roles: ["employee"] },
      { label: "Leave Type", path: "/leave-types", icon: "leaveType", roles: ["employee"] },
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
      { label: "Employees", path: "/crm/employees", icon: "employees" },
      { label: "Leads", path: "/crm/leads", icon: "crm" },
      // Admin manages leads directly and downloads the Excel report below —
      // the Lead Upload screen itself (spreadsheet + photo/OCR) is reserved
      // for CRM Marketing-designation employees (see CRM_EMPLOYEE_NAV).
      { label: "Lead Generation Report", path: "/crm/leads/report", icon: "crm" },
      { label: "Weekly Lead Report", path: "/crm/leads/weekly", icon: "crm" },
      { label: "Customers", path: "/crm/customers", icon: "crm" },
      { label: "Registeration", path: "/crm/meetings", icon: "crm" },
      { label: "Targets", path: "/crm/leads/employees/targets", icon: "employees" },
      // { label: "Headcount", path: "/crm/leads/employees/headcount", icon: "employees" },
      { label: "Incentives", path: "/crm/incentives", icon: "crm" },
      { label: "Incentive", path: "/crm/quotations", icon: "crm" },
      { label: "Incentive Slabs", path: "/crm/leads/incentive-slabs", icon: "crm" },
      { label: "Incentive Payouts", path: "/crm/leads/payouts", icon: "crm" },
      { label: "Membership Plans", path: "/crm/membership-plans", icon: "crm" },
      { label: "Invoices", path: "/crm/invoices", icon: "crm" },
      { label: "Payments", path: "/crm/payments", icon: "crm" },
      { label: "CRM Support Tickets", path: "/crm/support-tickets", icon: "crm" },

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
      { label: "Attendance", path: "/finance/attendance", icon: "attendance", roles: ["admin", ...EMPLOYEE_LIKE_ROLES] },
      { label: "Employees", path: "/master/employees", icon: "employees" },
      { label: "Payroll", path: "/employee/payroll", icon: "employeeLifecycle", roles: PAYROLL_ROLES },
      // Combined invoice + payment + payroll ledger, across every
      // department (not CRM-only) — same page the Finance-login sidebar
      // links to (see FINANCE_EMPLOYEE_NAV below), just also surfaced
      // here for admin.
      { label: "Financial History", path: "/finance/history", icon: "finance", roles: ["admin", "finance"] },
    ],
  },
  {
    // Plain "employee" logins never see this — they get the consolidated
    // "Attendance" section above instead (same Attendance/Leaves screens,
    // without the HR label or the HR-only children below).
    label: "HR",
    path: "/users/hr",
    icon: "employeeLifecycle",
    roles: ["admin", "finance", ...HR_SUB_ROLES],
    children: [
      { label: "Attendance", path: "/attendance", icon: "attendance", roles: ["admin", ...EMPLOYEE_LIKE_ROLES] },
      { label: "Leaves", path: "/leaves", icon: "leaves", roles: ["admin", ...EMPLOYEE_LIKE_ROLES] },
      { label: "Monthly Leave Record", path: "/leaves/monthly-record", icon: "leaves", roles: ["admin", ...EMPLOYEE_LIKE_ROLES] },
      { label: "Training", path: "/employee/training", icon: "employeeLifecycle", roles: TRAINING_ROLES },
      { label: "Leave Permissions", path: "/employee/permissions", icon: "employeeLifecycle", roles: HR_ADMIN_ROLES },
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

// Feedback/bug tickets — open to every login. Rendered separately, after
// every other section (including the CRM/HR/Finance department-employee
// ones below), so it always sits last in the sidebar regardless of role.
// Admin sees and resolves every ticket; everyone else only sees (and can
// raise) their own.
export const FEEDBACK_NAV = {
  label: "Support Tickets",
  path: "/feedback",
  icon: "feedback",
  roles: ["admin", ...EMPLOYEE_LIKE_ROLES],
};
// Department-scoped employee nav groups. A role="employee" login whose
// Employee record sits in the "CRM" / "HR" department gets these extra
// (read-only) sections in the sidebar — and the Dashboard surfaces the
// same links as quick-jump cards. Single source of truth for both.
export const CRM_EMPLOYEE_NAV = {
  label: "CRM",
  path: "/crm/incentives",
  icon: "crm",
  children: [
    { label: "Registeration", path: "/crm/meetings", icon: "crm" },
    // Only rendered for a CRM Marketing-designation employee — Sidebar.jsx
    // filters this entry out via useIsCrmMarketingEmployee() for every
    // other CRM employee.
    { label: "Lead Upload", path: "/crm/leads/upload", icon: "crm" },
    { label: "Targets", path: "/crm/leads/employees/targets", icon: "employees" },
    // Tier dashboard — tier badge + weekly / monthly / yearly payouts + invoices.
    { label: "Incentives", path: "/crm/incentives", icon: "crm" },
    { label: "Incentive Slabs", path: "/crm/leads/incentive-slabs", icon: "crm" },
    { label: "Invoices", path: "/crm/invoices", icon: "crm" },
    { label: "Payments", path: "/crm/payments", icon: "crm" },
    { label: "CRM Support Tickets", path: "/crm/support-tickets", icon: "crm" },
  ],
};

export const HR_EMPLOYEE_NAV = {
  label: "HR",
  path: "/attendance",
  icon: "employeeLifecycle",
  children: [
    { label: "Attendance", path: "/attendance", icon: "attendance" },
    { label: "Leaves", path: "/leaves", icon: "leaves" },
    { label: "Monthly Leave Record", path: "/leaves/monthly-record", icon: "leaves" },
    { label: "Training", path: "/employee/training", icon: "employeeLifecycle" },
    { label: "Leave Permissions", path: "/employee/permissions", icon: "employeeLifecycle" },
    { label: "Overtime", path: "/employee/overtime", icon: "employeeLifecycle" },
  ],
};

// A role="employee" login whose Employee record sits in the "Finance"
// department gets the same Finance section an admin sees.
export const FINANCE_EMPLOYEE_NAV = {
  label: "Finance",
  path: "/master/employees",
  icon: "finance",
  children: [
    { label: "Attendance", path: "/finance/attendance", icon: "attendance" },
    { label: "Employees", path: "/master/employees", icon: "employees" },
    { label: "Payroll", path: "/employee/payroll", icon: "employeeLifecycle" },
    // Combined invoice + payment ledger — a dedicated section since this
    // is the Finance login and needs somewhere to check payment/invoice
    // history, distinct from the CRM-only Invoices/Payments screens.
    { label: "Financial History", path: "/finance/history", icon: "finance" },
  ],
};