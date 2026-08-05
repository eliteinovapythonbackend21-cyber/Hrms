export default function Input({
  label,
  error,
  required,
  className = "",
  icon,
  ...props
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
            {icon}
          </span>
        )}
        <input
          className={`input ${icon ? "pl-10" : ""} ${error ? "border-red-500" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
