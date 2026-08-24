import { useRef, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";

import {
  useLeadUploads,
  useUploadLeads,
} from "./useLeadUpload";

import { useCRMEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_BADGE_CLASS = {
  Processing: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "Completed with errors": "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export default function LeadUploadPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [assignedTo, setAssignedTo] = useState("");

  const {
    data: allData,
    isLoading,
    isFetching,
    refetch,
  } = useLeadUploads({ page: 1, per_page: 1000 });

  const batches = allData?.items || [];

  const uploadLeads = useUploadLeads();
  const employeeOptions = useCRMEmployeeOptions();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
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

      showToast(
        `Uploaded: ${result?.data?.data?.success_count ?? 0} leads created`,
        "success"
      );

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Upload failed",
        "error"
      );
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lead Upload
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Bulk import leads from an Excel file
          </p>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Excel File (.xlsx)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="sm:w-64">
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Default Assignee (optional)
            </label>
            <select
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
            disabled={uploadLeads.isPending}
            className="h-10 px-4"
          >
            {uploadLeads.isPending ? "Uploading..." : "Upload Leads"}
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          Expected columns (row 1 = header): lead_name, contact_number, email, source, status
        </p>
      </div>

      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
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
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No upload batches yet.
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {batch.file_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {batch.uploader?.username || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {batch.total_rows}
                  </td>
                  <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400">
                    {batch.success_count}
                  </td>
                  <td className="px-4 py-3 text-red-500 dark:text-red-400">
                    {batch.failed_count}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        STATUS_BADGE_CLASS[batch.status] || STATUS_BADGE_CLASS.Processing
                      }
                    >
                      {batch.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {formatDateTime(batch.created_at)}
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