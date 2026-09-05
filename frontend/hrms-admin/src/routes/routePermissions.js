import { EMPLOYEE_LIKE_ROLES, HR_ADMIN_ROLES, ANY_HR_ROLE, PAYROLL_ROLES, TRAINING_ROLES, HR_SUB_ROLES } from "@/constants/roles";

// Single map: route pattern -> allowed roles.
// Use a function to check if a path matches a pattern (supports :param).
// NOTE: getRouteRoles does a linear scan and returns the first pattern that
// matches, so more specific (literal-segment) patterns must be listed before
// the generic ":id"-style pattern they'd otherwise be shadowed by
// (e.g. "/users/new" before "/users/:id", since "new" also satisfies [^/]+).
// HR and Finance get the same access as Employee (see EMPLOYEE_LIKE_ROLES).
export const routePermissions = {
  "/dashboard": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/users/admins": ["admin"],
  "/users/employees": ["admin"],
  "/users/new": ["admin"],
  "/users/profile/:id": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/users/:id/edit": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/users/:id": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employees": ANY_HR_ROLE,
  "/employees/new": ANY_HR_ROLE,
  "/employees/:id/edit": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employees/:id/salary": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employees/:id/payslip": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employees/:id": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employee/documents": HR_ADMIN_ROLES,
  // "employee" here covers HR-department employees reaching their
  // read-only Leave Permissions / Overtime / Training screens (mirrors
  // the CRM-employee entries below); the sidebar only surfaces these
  // for them, and each page hides every add/edit/deactivate control
  // for an HR employee.
  "/employee/permissions": [...HR_ADMIN_ROLES, "employee"],
  "/employee/overtime": [...HR_ADMIN_ROLES, "employee"],
  // "employee" here covers a Finance-department employee reaching the
  // Payroll screen from their Finance sidebar section; the sidebar only
  // surfaces it for them.
  "/employee/payroll": [...PAYROLL_ROLES, "employee"],
  "/employee/performance": HR_ADMIN_ROLES,
  "/employee/training": [...TRAINING_ROLES, "employee"],
  "/employee/promotions": HR_ADMIN_ROLES,
  "/employee/transfers": HR_ADMIN_ROLES,
  "/employee/resignations": HR_ADMIN_ROLES,
  "/employee/exit-management": HR_ADMIN_ROLES,
  "/attendance": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/attendance/manual": ["admin"],
  "/attendance/reports": ["admin"],
  "/leaves": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/leaves/new": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/leaves/approvals": ["admin"],
  "/leaves/monthly-record": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/master/company": ["admin"],
  "/master/branches": ["admin"],
  "/master/departments": ["admin"],
  "/master/designations": ["admin"],
  "/leave-types": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/holidays": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/holidays/calendar": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/my-calendar": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/users/hr/:roleSlug": ["admin", ...HR_SUB_ROLES],
  "/network": ["admin"],
  "/roles": ["admin"],
  "/roles/:id/permissions": ["admin"],
  "/crm/leads": ["admin"],
  // CRM Marketing-designation employees reach Lead Upload (spreadsheet +
  // photo/OCR); the backend endpoints re-check the designation themselves,
  // and the sidebar only ever shows the link to them — this just keeps a
  // direct URL from being blocked by role alone.
  "/crm/leads/upload": ["admin", "employee"],
  // Admin-only Lead Generation Excel report.
  "/crm/leads/report": ["admin"],
  "/crm/customers/:id": ["admin"],
  "/crm/customers": ["admin"],
  "/crm/follow-ups": ["admin"],
  // "employee" here covers CRM-department employees adding their own
  // Registrations (see meetings.py's on_create, which stamps
  // `registered_by` to their own Employee record regardless of what's
  // submitted) — full add/edit access, not read-only like the entries
  // below.
  "/crm/meetings": ["admin", "employee"],
  // "employee" here covers CRM-department employees reaching their
  // read-only Incentive / Incentive Invoice screens; the sidebar only
  // surfaces these for them, and the pages themselves hide every
  // add/edit/deactivate control for a CRM employee.
  "/crm/quotations": ["admin", "employee"],
  "/crm/invoices": ["admin", "employee"],
  // Tier-based incentive dashboard — admin (full) + CRM-dept employee (own, read-only)
  "/crm/incentives": ["admin", "employee"],
  // "employee" here covers CRM-department employees reaching their
  // read-only Payments screen, same pattern as invoices/quotations above.
  "/crm/payments": ["admin", "employee"],
  // "employee" here covers CRM-department employees raising/managing
  // their own support tickets, same full-access pattern as Registration
  // (meetings.py) — not read-only like invoices/quotations/payments above.
  "/crm/support-tickets": ["admin", "employee"],
  // Admin-only — manages membership plan names/prices (Silver/Gold/Diamond).
  "/crm/membership-plans": ["admin"],
  "/finance/accounts": ["admin", "finance"],
  "/finance/vendors": ["admin", "finance"],
  "/finance/expenses": ["admin", "finance"],
  "/finance/income": ["admin", "finance"],
  "/reports": ["admin", "finance", "HR Director", "HR Manager"],
};

// Convert a path with :params into a RegExp for matching.
export const pathToRegex = (path) =>
  new RegExp("^" + path.replace(/:[^/]+/g, "[^/]+") + "$");

export const getRouteRoles = (pathname) => {
  for (const pattern of Object.keys(routePermissions)) {
    if (pathToRegex(pattern).test(pathname)) {
      return routePermissions[pattern];
    }
  }
  return null; // no entry -> allow all authenticated
};
