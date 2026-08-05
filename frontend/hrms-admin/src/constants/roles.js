// Mirrors backend ROLE_MAP {1: admin, 2: employee}
export const ROLE_MAP = {
  1: "admin",
  2: "employee",
};

export const ROLE_OPTIONS = [
  { id: 1, name: "admin", label: "Admin" },
  { id: 2, name: "employee", label: "Employee" },
];

export const ROLES = ["admin", "employee"];

export const isAdmin = (user) => user && user.role === "admin";

export const isEmployee = (user) => user && user.role === "employee";
