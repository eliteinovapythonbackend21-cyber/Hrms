import { useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";

import {
  useLeadWeeklySnapshots,
  useGenerateLeadWeeklySnapshots,
} from "./useLeadWeeklySnapshots";

/* =========================================================
   HELPERS
========================================================= */

const STATUS_BADGE_CLASS = {
  New: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  Contacted: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Qualified: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Converted: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  Lost: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.New;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function getEmployeeDisplayName(employee) {
  if (!employee) return "";
  return `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.employee_code || "";
}

// Monday of the current week, ISO date string.
function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

/* =========================================================
   PAGE
========================================================= */

export default function LeadWeeklySnapshotPage() {
  const { showToast } = useToast();

  const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekStart());
  const [filterWeek, setFilterWeek] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const generateSnapshots = useGenerateLeadWeeklySnapshots();

  const queryParams = useMemo(
    () => ({
      page: 1,
      per_page: 1000,
      ...(filterWeek ? { week_start_date: filterWeek } : {}),
    }),
    [filterWeek]
  );

  const {
    data: allData,
    isLoading,
    isFetching,
    refetch,
  } = useLeadWeeklySnapshots(queryParams);

  const snapshots = allData?.items || [];

  const filtered = useMemo(() => {
    if (!statusFilter) return snapshots;
    return snapshots.filter((snapshot) => snapshot.status === statusFilter);
  }, [snapshots, statusFilter]);

  const availableWeeks = useMemo(() => {
    const weeks = new Set(snapshots.map((s) => s.week_start_date));
    return Array.from(weeks).sort((a, b) => new Date(b) - new Date(a));
  }, [snapshots]);

  const handleGenerate = async () => {
    if (!weekStartDate) {
      showToast("Please choose a week start date", "error");
      return;
    }

    try {
      const result = await generateSnapshots.mutateAsync(weekStartDate);
      showToast(
        result?.data?.message || "Weekly lead snapshots generated",
        "success"
      );
      setFilterWeek(weekStartDate);
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to generate snapshots",
        "error"
      );
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Weekly Lead Report
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Snapshot of CRM lead status, assignment, and follow-up activity by week
          </p>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      {/* GENERATE */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Week Starting
            </label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:max-w-xs"
            />
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generateSnapshots.isPending}
            className="h-10 px-4"
          >
            {generateSnapshots.isPending ? "Generating..." : "Generate Snapshot for Week"}
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          Captures the current status, assignee, and follow-up count for every active CRM lead as of this week.
          Re-running for the same week refreshes the existing records instead of duplicating them.
        </p>
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[220px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Weeks</option>
            {availableWeeks.map((week) => (
              <option key={week} value={week}>
                Week of {formatDate(week)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Converted">Converted</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Week Starting</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Assigned To</th>
              <th className="px-4 py-3 font-medium">Follow-ups</th>
              <th className="px-4 py-3 font-medium">Recorded At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No snapshots found. Generate one for a week above.
                </td>
              </tr>
            ) : (
              filtered
                .slice()
                .sort((a, b) => new Date(b.week_start_date) - new Date(a.week_start_date))
                .map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                      {snapshot.lead?.lead_name || `Lead #${snapshot.lead_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(snapshot.week_start_date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadgeClass(snapshot.status)}>
                        {snapshot.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {getEmployeeDisplayName(snapshot.assignee) || "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {snapshot.follow_up_count}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(snapshot.created_at)}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}