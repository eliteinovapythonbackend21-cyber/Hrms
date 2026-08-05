import Badge from "@/components/ui/Badge";
import { domainColors } from "@/theme/tokens/domainColors";

export default function LeaveStatusBadge({ status }) {
  return (
    <Badge className={domainColors.leaveStatus[status] || "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"}>
      {status}
    </Badge>
  );
}
