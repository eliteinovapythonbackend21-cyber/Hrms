// Single source of truth for status/role badge colors. Each value is a
// complete Tailwind class string (light classes + `dark:` variants together)
// so callers never need to branch on the current theme mode themselves —
// the browser's `dark` class toggle handles it via the `dark:` variants.
//
// Every entry now carries a 1px inset ring so pills read as crisp, vivid
// tokens on the tinted-glass dark surfaces rather than washed-out fills.
export const domainColors = {
  leaveStatus: {
    Pending:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25",
    Approved:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25",
    Rejected:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25",
    Cancelled:
      "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10",
  },
  attendanceStatus: {
    Present:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25",
    Absent:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25",
    Leave:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25",
    "Half Day":
      "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/25",
    "Late":
      "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-500/20 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/25",
    Holiday:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/25",
    "Week Off":
      "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10",
  },
  role: {
    admin:
      "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-500/20 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-400/25",
    employee:
      "bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-500/20 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-400/25",
  },
};
