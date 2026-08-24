import Badge from "@/components/ui/Badge";
import { domainColors } from "@/theme/tokens/domainColors";

function StatusIcon({ status }) {
  const normalized = status?.toLowerCase();

  if (normalized === "approved") {
    return (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (normalized === "rejected") {
    return (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path d="m7 7 10 10M17 7 7 17" />
      </svg>
    );
  }

  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function LeaveStatusBadge({ status }) {
  const normalized = status?.toLowerCase();

  const fallback =
    "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";

  const colorClass =
    domainColors.leaveStatus[status] ||
    domainColors.leaveStatus[
      normalized
        ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
        : ""
    ] ||
    fallback;

  return (
    <Badge
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}
    >
      <StatusIcon status={status} />
      {status || "Unknown"}
    </Badge>
  );
}