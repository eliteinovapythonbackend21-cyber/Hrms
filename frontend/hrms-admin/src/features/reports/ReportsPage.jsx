import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ReportFilterBar from "@/features/attendance/components/ReportFilterBar";
import { useToast } from "@/components/feedback/Toast";
import {
  useAttendanceReportDownload,
  useLeaveReportDownload,
  usePayrollReportDownload,
  useEmployeeReportDownload,
  useCrmReportDownload,
  useFinanceReportDownload,
} from "./useReports";

const CARDS = [
  { key: "attendance", title: "Attendance Report", description: "Attendance records for a date range.", hook: useAttendanceReportDownload },
  { key: "leave", title: "Leave Report", description: "Leave requests for a date range.", hook: useLeaveReportDownload },
  { key: "payroll", title: "Payroll Report", description: "Payroll records for a month range.", hook: usePayrollReportDownload },
  { key: "employee", title: "Employee Report", description: "Employee master data export.", hook: useEmployeeReportDownload },
  { key: "crm", title: "CRM Report", description: "Invoices raised for a date range.", hook: useCrmReportDownload },
  { key: "finance", title: "Finance Report", description: "Expenses recorded for a date range.", hook: useFinanceReportDownload },
];

function ReportCard({ card }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const download = card.hook();

  const handleGenerate = async (params) => {
    try {
      await download.mutateAsync(params);
      showToast(`${card.title} downloaded`, "success");
      setOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate report", "error");
    }
  };

  return (
    <div className="card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.description}</p>
      </div>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Download
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Generate ${card.title}`} size="sm">
        <ReportFilterBar onGenerate={handleGenerate} loading={download.isPending} label="Download" />
      </Modal>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Download reports across attendance, leave, payroll, employee, CRM, and finance.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CARDS.map((card) => (
          <ReportCard key={card.key} card={card} />
        ))}
      </div>
    </div>
  );
}
