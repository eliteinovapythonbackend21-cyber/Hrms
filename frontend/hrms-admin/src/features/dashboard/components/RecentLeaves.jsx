import { Link } from "react-router-dom";
import { useLeaves } from "@/features/leaves/useLeaves";
import LeaveStatusBadge from "@/features/leaves/components/LeaveStatusBadge";
import { formatDate } from "@/utils/formatDate";

export default function RecentLeaves({ title = "Recent leave requests" }) {
  const { data, isLoading } = useLeaves({ page: 1, per_page: 5, sort_by: "created_at", sort_dir: "desc" });
  const rows = data?.items || [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <Link to="/leaves" className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">No leave requests yet</div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                <th className="font-medium px-5 py-2">Employee</th>
                <th className="font-medium px-5 py-2">Leave type</th>
                <th className="font-medium px-5 py-2">Dates</th>
                <th className="font-medium px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                  <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                    {r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : "-"}
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400">{r.leave_type?.name || "-"}</td>
                  <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(r.from_date)} – {formatDate(r.to_date)}
                  </td>
                  <td className="px-5 py-2.5">
                    <LeaveStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
