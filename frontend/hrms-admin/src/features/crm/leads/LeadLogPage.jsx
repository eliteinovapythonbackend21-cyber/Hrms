import { useQuery } from "@tanstack/react-query";

import DataTable from "@/components/table/DataTable";
import TableToolbar from "@/components/table/TableToolbar";

import { crmApi } from "@/api/crm.api";

/* =========================================================
   PAGE
   Voice / Non-Voice CRM employees only get a COUNT of leads
   uploaded per employee here — no lead-level detail (name,
   source, contact, etc.) and no download, by design.
========================================================= */

export default function LeadLogPage() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["lead-upload-log-summary"],
    queryFn: async () => (await crmApi.leads.logSummary()).data.data,
  });

  const rows = data?.items || [];

  const errorMessage = isError
    ? error?.response?.data?.message || error?.message || "Failed to load the lead log."
    : null;

  const columns = [
    {
      key: "employee_name",
      label: "Employee",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-white">{row.employee_name || "-"}</p>
          <p className="text-[11px] text-slate-400">{row.employee_code || "-"}</p>
        </div>
      ),
    },
    {
      key: "lead_count",
      label: "Leads Uploaded",
      render: (row) => (
        <span className="font-semibold text-slate-800 dark:text-white">{row.lead_count}</span>
      ),
    },
  ];

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

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        {errorMessage && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyText={errorMessage ? " " : "No lead upload activity found."}
        />
      </div>
    </div>
  );
}
