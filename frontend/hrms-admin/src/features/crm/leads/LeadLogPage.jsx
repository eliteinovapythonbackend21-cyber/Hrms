import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import TableToolbar from "@/components/table/TableToolbar";
import TableSearchBar from "@/components/table/TableSearchBar";

import { crmApi } from "@/api/crm.api";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getEmployeeName(employee) {
  if (!employee) return "-";
  return (
    [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim() ||
    employee.employee_code ||
    "-"
  );
}

const STATUS_BADGE_CLASS = {
  New: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Contacted: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Converted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Lost: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
}

/* =========================================================
   PAGE
========================================================= */

export default function LeadLogPage() {
  const { value: search, setValue: setSearch } = useDebouncedSearch();
  const [page] = useState(1);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["lead-upload-log", { page, search }],
    queryFn: async () =>
      (await crmApi.leads.log({ page, per_page: 200, search: search || undefined })).data.data,
  });

  const leads = data?.items || [];

  const columns = [
    {
      key: "lead_name",
      label: "Lead Name",
      render: (row) => (
        <span className="font-semibold text-slate-800 dark:text-white">{row.lead_name || "-"}</span>
      ),
    },
    {
      key: "source",
      label: "Source",
      render: (row) => <span className="text-slate-600 dark:text-slate-300">{row.source || "-"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge className={getStatusBadgeClass(row.status)}>{row.status || "-"}</Badge>,
    },
    {
      key: "creator",
      label: "Uploaded By",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-white">{getEmployeeName(row.creator)}</p>
          <p className="text-[11px] text-slate-400">{row.creator?.employee_code || "-"}</p>
        </div>
      ),
    },
    {
      key: "assignee",
      label: "Assigned To",
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-300">{getEmployeeName(row.assignee)}</span>
      ),
    },
    {
      key: "upload_batch",
      label: "Upload File",
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-300">{row.upload_batch?.file_name || "-"}</span>
      ),
    },
    {
      key: "created_at",
      label: "Created At",
      render: (row) => (
        <span className="text-slate-600 dark:text-slate-300">{formatDateTime(row.created_at)}</span>
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
            Who uploaded which lead, and when — view only. Contact details aren't shown here,
            and this list can't be downloaded.
          </p>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <div className="w-full sm:max-w-sm">
            <TableSearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search lead name or source..."
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={leads}
          loading={isLoading}
          emptyText="No lead upload activity found."
        />
      </div>
    </div>
  );
}
