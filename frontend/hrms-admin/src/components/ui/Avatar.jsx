const SIZES = {
  sm: "h-8 w-8 text-sm",
  md: "h-12 w-12 text-lg",
  lg: "h-16 w-16 text-2xl",
};

// Profile picture when available, falling back to an initial-letter circle
// on a brand-gradient background.
export default function Avatar({ name = "", src, size = "md", className = "" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const sizeClass = SIZES[size] || SIZES.md;

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Profile"}
        className={`${sizeClass} rounded-full object-cover shrink-0 ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-primary-600 to-primary-800 dark:text-slate-950 text-white flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}
