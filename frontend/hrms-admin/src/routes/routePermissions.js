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
  "/employee/permissions": HR_ADMIN_ROLES,
  "/employee/overtime": HR_ADMIN_ROLES,
  "/employee/payroll": PAYROLL_ROLES,
  "/employee/performance": HR_ADMIN_ROLES,
  "/employee/training": TRAINING_ROLES,
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
  "/master/company": ["admin"],
  "/master/branches": ["admin"],
  "/master/departments": ["admin"],
  "/master/designations": ["admin"],
  "/master/leave-types": ["admin"],
  "/master/holidays": ["admin"],
  "/users/hr/:roleSlug": ["admin", ...HR_SUB_ROLES],
  "/network": ["admin"],
  "/roles": ["admin"],
  "/roles/:id/permissions": ["admin"],
  "/crm/leads": ["admin"],
  "/crm/customers/:id": ["admin"],
  "/crm/customers": ["admin"],
  "/crm/follow-ups": ["admin"],
  "/crm/meetings": ["admin"],
  "/crm/quotations": ["admin"],
  "/crm/invoices": ["admin"],
  "/crm/payments": ["admin"],
  "/crm/support-tickets": ["admin"],
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
