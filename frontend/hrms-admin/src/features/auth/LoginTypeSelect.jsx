import Dropdown from "@/components/ui/Dropdown";

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export const LOGIN_TYPES = [
  { value: "admin", label: "Admin Login" },
  { value: "employee", label: "Employee Login" },
];

// Right-side "Staff Access" style dropdown on the Login screen — lets the
// visitor pick which login experience they want (Admin gets Register /
// Forgot password, Employee is a stripped-down sign-in only).
export default function LoginTypeSelect({ value, onChange }) {
  const current = LOGIN_TYPES.find((t) => t.value === value) || LOGIN_TYPES[0];

  return (
    <Dropdown
      align="right"
      trigger={
        <span className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
          <ShieldIcon />
          {current.label}
          <ChevronIcon />
        </span>
      }
    >
      {({ close }) => (
        <div>
          <p className="px-3 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Staff Access
          </p>
          {LOGIN_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                onChange(type.value);
                close();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                type.value === value
                  ? "text-primary-600 dark:text-primary-400 bg-primary-500/10"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <ShieldIcon />
              {type.label}
            </button>
          ))}
        </div>
      )}
    </Dropdown>
  );
}
