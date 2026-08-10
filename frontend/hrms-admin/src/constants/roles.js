// Mirrors backend seeded roles (see
// backend/migrations/versions/cf5ef8d585e8_seed_permissions_admin_designations_and_*.py).
// Role ids are assigned by the DB at seed time, not fixed — the backend
// JWT/user payload identifies a role by its `name` string, so everything
// here keys off name, not a numeric id.
export const HR_SUB_ROLES = [
  "HR",
  "HR Director",
  "HR Manager",
  "HR Executive",
  "Recruiter",
  "Payroll Executive",
  "Training Coordinator",
  "HR Assistant",
];

export const ROLES = ["admin", "employee", "finance", ...HR_SUB_ROLES];

// The 4 master categories a Role belongs to (backend `roles.category` column).
export const ROLE_CATEGORIES = ["Admin", "HR", "Employee", "Finance"];
export const ROLE_CATEGORY_OPTIONS = ROLE_CATEGORIES.map((c) => ({ value: c, label: c }));

export const ROLE_OPTIONS = ROLES.map((name) => ({ id: name, name, label: name }));

// Legacy alias — some older code imported ROLE_MAP as a plain role-name
// list; kept for compatibility, no longer an id->name object since roles
// are no longer fixed-id.
export const ROLE_MAP = ROLES;

// Historical coarse bucket: every non-admin role defaulted to
// Employee-self-service-level access. New nav/route entries should prefer
// an explicit `roles` array (see HR_ADMIN_ROLES / RECRUITMENT_ROLES /
// PAYROLL_ROLES / TRAINING_ROLES / ANY_HR_ROLE below) instead of spreading
// this, so each of the 8 HR sub-roles gets scoped access rather than
// blanket employee-level access.
export const EMPLOYEE_LIKE_ROLES = ["employee", "finance", ...HR_SUB_ROLES];

// Roles that manage the Employee master + full lifecycle admin screens.
export const HR_ADMIN_ROLES = ["admin", "HR", "HR Director", "HR Manager", "HR Executive"];

// Recruiter only needs to add/view Employee records.
export const RECRUITMENT_ROLES = ["admin", "HR Director", "HR Manager", "Recruiter"];

// Payroll Executive + the HR tiers that also carry payroll permissions.
export const PAYROLL_ROLES = ["admin", "HR Director", "HR Manager", "Payroll Executive"];

// Training Coordinator + the HR tiers that also carry training permissions.
export const TRAINING_ROLES = ["admin", "HR Director", "HR Manager", "Training Coordinator"];

// Any HR sub-role (read-heavy lists that every HR tier should at least see).
export const ANY_HR_ROLE = ["admin", ...HR_SUB_ROLES];

export const isAdmin = (user) => user && user.role === "admin";

export const isHrRole = (user) => user && HR_SUB_ROLES.includes(user.role);

export const isEmployee = (user) => user && EMPLOYEE_LIKE_ROLES.includes(user.role);
