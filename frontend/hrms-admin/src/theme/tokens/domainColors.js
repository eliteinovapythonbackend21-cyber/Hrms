// Single source of truth for status/role badge colors. Each value is a
// complete Tailwind class string (light classes + `dark:` variants together)
// so callers never need to branch on the current theme mode themselves —
// the browser's `dark` class toggle handles it via the `dark:` variants.
export const domainColors = {
  leaveStatus: {
    Pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    Approved: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
    Rejected: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  },
  attendanceStatus: {
    Present: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
    Absent: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    Leave: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  role: {
    admin: "bg-accent-100 text-accent-800 dark:bg-accent-500/20 dark:text-accent-300",
    employee: "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300",
  },
};
