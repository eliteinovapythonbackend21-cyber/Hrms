export default function FileUpload({
  label,
  onChange,
  accept = "image/*",
  placeholder = "Upload file",
  className = "",
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {placeholder}
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange?.(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
