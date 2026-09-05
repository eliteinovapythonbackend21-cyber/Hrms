import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import Button from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { useFileDownload } from "@/hooks/useFileDownload";
import { crmApi } from "@/api/crm.api";

export default function LeadGenerationReportPage() {
  const { showToast } = useToast();
  const { downloadBlob } = useFileDownload();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const downloadReport = useMutation({
    mutationFn: async () => {
      const params = {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };
      const res = await crmApi.leads.report(params);
      downloadBlob(res, "lead_generation_report.xlsx");
      return res;
    },
    onSuccess: () => showToast("Lead Generation Report downloaded", "success"),
    onError: (error) =>
      showToast(
        error?.response?.data?.message || "Failed to download the report",
        "error"
      ),
  });

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Lead Generation Report
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Download every lead (name, contact, source, status, assignment) as Excel
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-full sm:max-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            />
          </div>

          <div className="w-full sm:max-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            />
          </div>

          <Button
            type="button"
            onClick={() => downloadReport.mutate()}
            isLoading={downloadReport.isPending}
            className="h-10 px-4"
          >
            Download Excel
          </Button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Leave both dates empty to export every lead on record.
        </p>
      </div>
    </div>
  );
}
