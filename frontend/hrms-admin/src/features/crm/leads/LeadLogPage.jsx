import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import TableToolbar from "@/components/table/TableToolbar";

import { crmApi } from "@/api/crm.api";

/* =========================================================
   PAGE
   Voice / Non-Voice CRM employees only get a COUNT of leads
   uploaded per employee here — no lead-level detail (name,
   source, contact, etc.) and no download, by design.
========================================================= */

const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
];

function initialsOf(name) {
  return (
    (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold ${accent || "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
    </div>
  );
}

export default function LeadLogPage() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["lead-upload-log-summary"],
    queryFn: async () => (await crmApi.leads.logSummary()).data.data,
  });

  const rows = data?.items || [];
  const totalLeads = data?.total_leads ?? rows.reduce((sum, r) => sum + (r.lead_count || 0), 0);
  const maxCount = useMemo(() => Math.max(1, ...rows.map((r) => r.lead_count || 0)), [rows]);

  const errorMessage = isError
    ? error?.response?.data?.message || error?.message || "Failed to load the lead log."
    : null;

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lead Log
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Lead count per employee — view only. No lead details, contact info, or download here.
          </p>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile label="Total Leads Uploaded" value={totalLeads} />
        <StatTile
          label="Employees With Uploads"
          value={rows.length}
          accent="text-primary-600 dark:text-primary-400"
        />
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Leaderboard
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.06]"
              />
            ))}
          </div>
        ) : rows.length === 0 && !errorMessage ? (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
            <span className="text-3xl">📭</span>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No lead upload activity found.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((row, index) => {
              const pct = Math.round(((row.lead_count || 0) / maxCount) * 100);
              const colorClass = AVATAR_COLORS[index % AVATAR_COLORS.length];

              return (
                <li
                  key={row.employee_id}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-300 dark:text-slate-600">
                    {index + 1}
                  </span>

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colorClass}`}
                  >
                    {initialsOf(row.employee_name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                      {row.employee_name || "-"}
                    </p>
                    <p className="text-[11px] text-slate-400">{row.employee_code || "-"}</p>

                    <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-primary-500 dark:bg-primary-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {row.lead_count}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Leads</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
