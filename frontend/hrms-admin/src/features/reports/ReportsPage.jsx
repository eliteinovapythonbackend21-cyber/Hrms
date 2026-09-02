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
import { use3DTilt, useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

const CARDS = [
  { key: "attendance", title: "Attendance Report", description: "Attendance records for a date range.", hook: useAttendanceReportDownload },
  { key: "leave", title: "Leave Report", description: "Leave requests for a date range.", hook: useLeaveReportDownload },
  { key: "payroll", title: "Payroll Report", description: "Payroll records for a month range.", hook: usePayrollReportDownload },
  { key: "employee", title: "Employee Report", description: "Employee master data export.", hook: useEmployeeReportDownload },
  { key: "crm", title: "CRM Report", description: "Invoices raised for a date range.", hook: useCrmReportDownload },
  { key: "finance", title: "Finance Report", description: "Expenses recorded for a date range.", hook: useFinanceReportDownload },
];

function ReportCard({ card, index }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const download = card.hook();
  const { ref, handlers } = use3DTilt({ max: 7, scale: 1.015 });
  const downloadMagnet = useMagnetic(0.2);

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
    <div
      className="u-tilt-perspective u-rise"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div
        ref={ref}
        {...handlers}
        className="u-tilt u-glare card relative flex flex-col gap-3 overflow-hidden p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="u-tilt-content">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{card.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{card.description}</p>
        </div>
        <div ref={downloadMagnet.ref} {...downloadMagnet.handlers} className="u-tilt-content inline-block w-full will-change-transform sm:w-auto">
          <Button
            onClick={() => setOpen(true)}
            className="w-full shadow-sm transition-shadow duration-200 hover:shadow-lg sm:w-auto"
          >
            Download
          </Button>
        </div>

        <Modal open={open} onClose={() => setOpen(false)} title={`Generate ${card.title}`} size="sm">
          <ReportFilterBar onGenerate={handleGenerate} loading={download.isPending} label="Download" />
        </Modal>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <Motion3DStyles />
      <div className="u-rise mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Download reports across attendance, leave, payroll, employee, CRM, and finance.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CARDS.map((card, i) => (
          <ReportCard key={card.key} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}
