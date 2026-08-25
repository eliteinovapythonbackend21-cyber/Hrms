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
   CONSTANTS
========================================================= */

const CARD_PAGE_SIZE = 6;
const TABLE_PAGE_SIZE = 10;

const STATUS_BADGE_CLASS = {
  New: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  Contacted: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Qualified: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Converted: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  Lost: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

/* =========================================================
   HELPERS
========================================================= */

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.New;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getEmployeeDisplayName(employee) {
  if (!employee) return "";
  return `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.employee_code || "";
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0]?.toUpperCase();
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
   ICONS
========================================================= */

const ReportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path strokeLinecap="round" d="M8 2v4M16 2v4M3 9h18" />
    <path strokeLinecap="round" d="M8 13h3M8 16h5" />
  </svg>
);

const ConvertedStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const LostStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364L18.364 5.636" />
  </svg>
);

const FollowUpStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M8 16h5" />
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path strokeLinecap="round" d="M8 2v4M16 2v4M3 9h18" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <rect x="3" y="4" width="14" height="13" rx="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2.5v3M13.5 2.5v3M3 8h14" />
  </svg>
);

const UserSmallIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <circle cx="10" cy="7" r="3" />
    <path strokeLinecap="round" d="M3.5 17c1-3.3 4-5 6.5-5s5.5 1.7 6.5 5" />
  </svg>
);

const NoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 3.5h12v13H4z" />
    <path strokeLinecap="round" d="M6.5 7h7M6.5 10h7M6.5 13h4" />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, value, label, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    green: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HOVER TRIGGER + DETAILS CARD
========================================================= */

function HoverDetailsTrigger({ children, panel, align = "left" }) {
  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  };

  return (
    <div tabIndex={0} className="group/snapshot-details relative inline-flex max-w-full outline-none">
      <div className="max-w-full">{children}</div>
      <div
        className={`
          pointer-events-none invisible absolute top-full z-[100] mt-2 opacity-0 transition-all duration-150
          group-hover/snapshot-details:pointer-events-auto group-hover/snapshot-details:visible group-hover/snapshot-details:opacity-100
          group-focus/snapshot-details:pointer-events-auto group-focus/snapshot-details:visible group-focus/snapshot-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

function SnapshotDetailsCard({ snapshot }) {
  const assigneeName = getEmployeeDisplayName(snapshot?.assignee);

  return (
    <div className="w-[320px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Snapshot Details
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            {snapshot?.lead?.lead_name || `Lead #${snapshot?.lead_id}`}
          </p>
        </div>
        <Badge className={getStatusBadgeClass(snapshot?.status)}>{snapshot?.status}</Badge>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Week Starting</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {formatDate(snapshot?.week_start_date)}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Assigned To</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {assigneeName || "Unassigned"}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Follow-ups</span>
          <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {snapshot?.follow_up_count ?? 0}
          </span>
        </div>
        {snapshot?.notes && (
          <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
            <span className="text-xs text-slate-400">Notes</span>
            <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
              {snapshot.notes}
            </span>
          </div>
        )}
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div>
        <p className="text-[10px] text-slate-400">Recorded At</p>
        <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
          {formatDateTime(snapshot?.created_at)}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function LeadWeeklySnapshotPage() {
  const { showToast } = useToast();

  const [weekStartDate, setWeekStartDate] = useState(getCurrentWeekStart());
  const [filterWeek, setFilterWeek] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [page, setPage] = useState(1);

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

  /* -------------------------------------------------------
     DERIVED
  ------------------------------------------------------- */

  const availableWeeks = useMemo(() => {
    const weeks = new Set(snapshots.map((s) => s.week_start_date));
    return Array.from(weeks).sort((a, b) => new Date(b) - new Date(a));
  }, [snapshots]);

  const convertedCount = useMemo(
    () => snapshots.filter((s) => s.status === "Converted").length,
    [snapshots]
  );
  const lostCount = useMemo(() => snapshots.filter((s) => s.status === "Lost").length, [snapshots]);
  const totalFollowUps = useMemo(
    () => snapshots.reduce((sum, s) => sum + (s.follow_up_count || 0), 0),
    [snapshots]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return snapshots.filter((snapshot) => {
      if (statusFilter && snapshot.status !== statusFilter) return false;

      if (normalizedSearch) {
        const haystack = [
          snapshot.lead?.lead_name,
          getEmployeeDisplayName(snapshot.assignee),
          snapshot.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [snapshots, statusFilter, search]);

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => new Date(b.week_start_date) - new Date(a.week_start_date)),
    [filtered]
  );

  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : TABLE_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* -------------------------------------------------------
     HANDLERS
  ------------------------------------------------------- */

  const handleGenerate = async () => {
    if (!weekStartDate) {
      showToast("Please choose a week start date", "error");
      return;
    }

    try {
      const result = await generateSnapshots.mutateAsync(weekStartDate);
      showToast(result?.data?.message || "Weekly lead snapshots generated", "success");
      setFilterWeek(weekStartDate);
      setPage(1);
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to generate snapshots",
        "error"
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setFilterWeek("");
    setPage(1);
  };

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <ReportIcon />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Weekly Lead Report
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Snapshot of CRM lead status, assignment, and follow-up activity by week
            </p>
          </div>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<ReportIcon />} value={snapshots.length} label="Total Snapshots" tone="sky" />
        <StatCard icon={<ConvertedStatIcon />} value={convertedCount} label="Converted" tone="green" />
        <StatCard icon={<LostStatIcon />} value={lostCount} label="Lost" tone="red" />
        <StatCard icon={<FollowUpStatIcon />} value={totalFollowUps} label="Total Follow-ups" tone="amber" />
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
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white sm:max-w-xs"
            />
          </div>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generateSnapshots.isPending}
            className="h-10 w-full px-4 sm:w-auto"
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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by lead or assignee..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={filterWeek}
              onChange={(e) => {
                setFilterWeek(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[200px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>

            {(search || statusFilter || filterWeek) && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode("card");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DATA */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No snapshots found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters. Generate a snapshot for a week above.
          </p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((snapshot) => {
            const leadName = snapshot.lead?.lead_name || `Lead #${snapshot.lead_id}`;
            const assigneeName = getEmployeeDisplayName(snapshot.assignee);

            return (
              <div
                key={snapshot.id}
                className="flex min-w-0 flex-col overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                        {getInitials(leadName)}
                      </div>
                      <div className="min-w-0">
                        <HoverDetailsTrigger align="left" panel={<SnapshotDetailsCard snapshot={snapshot} />}>
                          <p className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {leadName}
                          </p>
                        </HoverDetailsTrigger>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <CalendarIcon />
                          Week of {formatDate(snapshot.week_start_date)}
                        </div>
                      </div>
                    </div>

                    <Badge className={getStatusBadgeClass(snapshot.status)}>{snapshot.status}</Badge>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <UserSmallIcon />
                      <span className="truncate">{assigneeName || "Unassigned"}</span>
                    </div>
                    {snapshot.notes && (
                      <div className="flex items-start gap-1.5">
                        <NoteIcon />
                        <span className="line-clamp-2">{snapshot.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex flex-1 items-center justify-center rounded-lg bg-amber-50 px-3 py-3 dark:bg-amber-500/10">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                        {snapshot.follow_up_count ?? 0}
                      </p>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        Follow-ups Logged
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
                  Recorded {formatDateTime(snapshot.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
              {paged.map((snapshot) => {
                const leadName = snapshot.lead?.lead_name || `Lead #${snapshot.lead_id}`;

                return (
                  <tr key={snapshot.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <HoverDetailsTrigger align="left" panel={<SnapshotDetailsCard snapshot={snapshot} />}>
                        <span className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
                          {leadName}
                        </span>
                      </HoverDetailsTrigger>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon />
                        {formatDate(snapshot.week_start_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadgeClass(snapshot.status)}>{snapshot.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {getEmployeeDisplayName(snapshot.assignee) || "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        {snapshot.follow_up_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(snapshot.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}