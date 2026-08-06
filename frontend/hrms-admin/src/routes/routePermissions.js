import { EMPLOYEE_LIKE_ROLES } from "@/constants/roles";

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
  "/employees": ["admin"],
  "/employees/new": ["admin"],
  "/employees/:id/edit": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employees/:id/salary": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employees/:id/payslip": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/employees/:id": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/attendance": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/attendance/manual": ["admin"],
  "/attendance/reports": ["admin"],
  "/leaves": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/leaves/new": ["admin", ...EMPLOYEE_LIKE_ROLES],
  "/leaves/approvals": ["admin"],
  "/master/departments": ["admin"],
  "/master/designations": ["admin"],
  "/master/leave-types": ["admin"],
  "/network": ["admin"],
  // Roles CRUD is disabled for now — see navConfig.js for how to re-enable.
  // "/roles": ["admin"],
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
