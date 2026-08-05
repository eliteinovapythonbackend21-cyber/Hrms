// Single map: route pattern -> allowed roles.
// Use a function to check if a path matches a pattern (supports :param).
// NOTE: getRouteRoles does a linear scan and returns the first pattern that
// matches, so more specific (literal-segment) patterns must be listed before
// the generic ":id"-style pattern they'd otherwise be shadowed by
// (e.g. "/users/new" before "/users/:id", since "new" also satisfies [^/]+).
export const routePermissions = {
  "/dashboard": ["admin", "employee"],
  "/users": ["admin"],
  "/users/new": ["admin"],
  "/users/profile/:id": ["admin", "employee"],
  "/users/:id/edit": ["admin", "employee"],
  "/users/:id": ["admin", "employee"],
  "/employees": ["admin"],
  "/employees/new": ["admin"],
  "/employees/:id/edit": ["admin", "employee"],
  "/employees/:id/salary": ["admin", "employee"],
  "/employees/:id": ["admin", "employee"],
  "/attendance": ["admin", "employee"],
  "/attendance/manual": ["admin"],
  "/attendance/reports": ["admin"],
  "/leaves": ["admin", "employee"],
  "/leaves/new": ["admin", "employee"],
  "/leaves/approvals": ["admin"],
  "/master/departments": ["admin"],
  "/master/designations": ["admin"],
  "/master/leave-types": ["admin"],
  "/network": ["admin"],
  "/roles": ["admin"],
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
