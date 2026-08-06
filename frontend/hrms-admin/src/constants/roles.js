// Mirrors backend ROLE_MAP {1: admin, 2: employee, 3: hr, 4: finance}
export const ROLE_MAP = {
  1: "admin",
  2: "employee",
  3: "hr",
  4: "finance",
};

export const ROLE_OPTIONS = [
  { id: 1, name: "admin", label: "Admin" },
  { id: 2, name: "employee", label: "Employee" },
  { id: 3, name: "hr", label: "HR" },
  { id: 4, name: "finance", label: "Finance" },
];

export const ROLES = ["admin", "employee", "hr", "finance"];

// HR and Finance accounts get the same access level as Employee accounts
// (self-service only, no admin management screens).
export const EMPLOYEE_LIKE_ROLES = ["employee", "hr", "finance"];

export const isAdmin = (user) => user && user.role === "admin";

export const isEmployee = (user) => user && EMPLOYEE_LIKE_ROLES.includes(user.role);
