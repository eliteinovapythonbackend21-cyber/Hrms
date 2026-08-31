import { useCallback, useMemo, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";

import { useLeadUploads, useUploadLeads } from "./useLeadUpload";

import { useCRMEmployeeOptions } from "@/hooks/useLookupOptions";

/* =========================================================
   CONSTANTS
========================================================= */

const CARD_PAGE_SIZE = 6;
const TABLE_PAGE_SIZE = 10;

const STATUS_BADGE_CLASS = {
  Processing: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Completed with errors": "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

/* =========================================================
   HELPERS
========================================================= */

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.Processing;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name) {
  if (!name) return "?";
  return name[0]?.toUpperCase() || "?";
}

/* =========================================================
   ICONS
========================================================= */

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
  </svg>
);

const BatchStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h6" />
  </svg>
);

const SuccessStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const FailedStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364L18.364 5.636" />
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h4m1-15H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V8z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 001 1h4" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, value, label, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
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
    <div tabIndex={0} className="group/batch-details relative inline-flex max-w-full outline-none">
      <div className="max-w-full">{children}</div>
      <div
        className={`
          pointer-events-none invisible absolute top-full z-[100] mt-2 opacity-0 transition-all duration-150
          group-hover/batch-details:pointer-events-auto group-hover/batch-details:visible group-hover/batch-details:opacity-100
          group-focus/batch-details:pointer-events-auto group-focus/batch-details:visible group-focus/batch-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

function BatchDetailsCard({ batch }) {
  return (
    <div className="w-[300px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Batch Details
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            {batch?.file_name}
          </p>
        </div>
        <Badge className={getStatusBadgeClass(batch?.status)}>{batch?.status}</Badge>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Uploaded By</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {batch?.uploader?.username || "—"}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Total Rows</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {batch?.total_rows}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Success</span>
          <span className="text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {batch?.success_count}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Failed</span>
          <span className="text-right text-xs font-semibold text-red-500 dark:text-red-400">
            {batch?.failed_count}
          </span>
        </div>
      </div>

      {batch?.error_summary && (
        <>
          <div className="my-3 border-t border-slate-100 dark:border-slate-700" />
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Error Summary
            </p>
            <p className="break-words text-xs leading-5 text-slate-700 dark:text-slate-200">
              {batch.error_summary}
            </p>
          </div>
        </>
      )}

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div>
        <p className="text-[10px] text-slate-400">Uploaded At</p>
        <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
          {formatDateTime(batch?.created_at)}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function LeadUploadPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [page, setPage] = useState(1);

  const {
    data: allData,
    isLoading,
    isFetching,
    refetch,
  } = useLeadUploads({ page: 1, per_page: 1000 });

  const batches = allData?.items || [];

  const uploadLeads = useUploadLeads();
  const employeeOptions = useCRMEmployeeOptions();

  /* -------------------------------------------------------
     DERIVED
  ------------------------------------------------------- */

  const totalSuccess = useMemo(
    () => batches.reduce((sum, b) => sum + (b.success_count || 0), 0),
    [batches]
  );
  const totalFailed = useMemo(
    () => batches.reduce((sum, b) => sum + (b.failed_count || 0), 0),
    [batches]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return batches.filter((batch) => {
      if (statusFilter && batch.status !== statusFilter) return false;

      if (normalizedSearch) {
        const haystack = [batch.file_name, batch.uploader?.username].join(" ").toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [batches, search, statusFilter]);

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [filtered]
  );

  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : TABLE_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* -------------------------------------------------------
     FILE HANDLING
  ------------------------------------------------------- */

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".xlsx")) {
      setSelectedFile(file);
    }
  }, []);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast("Please choose a file to upload", "error");
      return;
    }

    try {
      const result = await uploadLeads.mutateAsync({
        file: selectedFile,
        assignedTo: assignedTo || undefined,
      });

      showToast(`Uploaded: ${result?.data?.data?.success_count ?? 0} leads created`, "success");

      clearSelectedFile();
      setAssignedTo("");
    } catch (error) {
      showToast(error?.response?.data?.message || error?.message || "Upload failed", "error");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <UploadIcon />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Lead Upload
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Bulk import leads from an Excel file
            </p>
          </div>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<BatchStatIcon />} value={batches.length} label="Total Batches" tone="sky" />
        <StatCard icon={<SuccessStatIcon />} value={totalSuccess} label="Leads Created" tone="emerald" />
        <StatCard icon={<FailedStatIcon />} value={totalFailed} label="Rows Failed" tone="red" />
      </div>

      {/* UPLOAD PANEL */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
          {/* Dropzone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Excel File (.xlsx)
            </label>

            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-500/30 dark:bg-primary-500/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 dark:bg-slate-800 dark:text-primary-400">
                  <FileIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  title="Remove file"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition-colors ${
                  isDragging
                    ? "border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-500/10"
                    : "border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                }`}
              >
                <UploadIcon />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-primary-600 dark:text-primary-400">Choose a file</span> or drag it here
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Assignee + action */}
          <div className="flex flex-col justify-between gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Default Assignee (optional)
              </label>
              <select
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">No default assignee</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.value} value={employee.value}>
                    {employee.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploadLeads.isPending || !selectedFile}
              className="h-10 w-full px-4"
            >
              {uploadLeads.isPending ? "Uploading..." : "Upload Leads"}
            </Button>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          Expected columns (row 1 = header): lead_name, contact_number, email, source, status
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
                placeholder="Search by file name or uploader..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[200px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Completed with errors">Completed with errors</option>
            </select>

            {(search || statusFilter) && (
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
            </div>
          </div>
        </div>
      </div>

      {/* DATA */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No upload batches found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters. Upload a file above to get started.
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="tbl-head border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Uploaded By</th>
                <th className="px-4 py-3 font-medium">Total Rows</th>
                <th className="px-4 py-3 font-medium">Success</th>
                <th className="px-4 py-3 font-medium">Failed</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Uploaded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((batch) => (
                <tr key={batch.id} className="tbl-row">
                  <td className="px-4 py-3">
                    <HoverDetailsTrigger align="left" panel={<BatchDetailsCard batch={batch} />}>
                      <div className="flex cursor-pointer items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                          <FileIcon />
                        </div>
                        <span className="max-w-[220px] truncate font-medium text-slate-800 dark:text-slate-100">
                          {batch.file_name}
                        </span>
                      </div>
                    </HoverDetailsTrigger>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {batch.uploader?.username || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{batch.total_rows}</td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">{batch.success_count}</td>
                  <td className="px-4 py-3 text-red-500 dark:text-red-400">{batch.failed_count}</td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusBadgeClass(batch.status)}>{batch.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {formatDateTime(batch.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((batch) => (
            <div
              key={batch.id}
              className="flex min-w-0 flex-col overflow-visible rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    <FileIcon />
                  </div>
                  <div className="min-w-0">
                    <HoverDetailsTrigger align="left" panel={<BatchDetailsCard batch={batch} />}>
                      <p className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {batch.file_name}
                      </p>
                    </HoverDetailsTrigger>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                      <UserSmallIcon />
                      {batch.uploader?.username || "Unknown"}
                    </div>
                  </div>
                </div>

                <Badge className={getStatusBadgeClass(batch.status)}>{batch.status}</Badge>
              </div>

              <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{batch.total_rows}</p>
                  <p className="text-[9px] text-slate-400">Total</p>
                </div>
                <div className="rounded-lg bg-emerald-50 py-2 dark:bg-emerald-500/10">
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{batch.success_count}</p>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400">Success</p>
                </div>
                <div className="rounded-lg bg-red-50 py-2 dark:bg-red-500/10">
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">{batch.failed_count}</p>
                  <p className="text-[9px] text-red-500 dark:text-red-400">Failed</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                <CalendarIcon />
                {formatDateTime(batch.created_at)}
              </div>
            </div>
          ))}
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