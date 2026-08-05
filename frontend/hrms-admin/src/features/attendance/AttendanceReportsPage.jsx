import { useNavigate } from "react-router-dom";
import ReportFilterBar from "./components/ReportFilterBar";
import { useAttendanceReport, useSalaryReport } from "./useAttendanceReports";
import { useToast } from "@/components/feedback/Toast";
import Button from "@/components/ui/Button";

export default function AttendanceReportsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const attendanceReport = useAttendanceReport();
  const salaryReport = useSalaryReport();

  const handleAttendanceReport = async (params) => {
    try {
      await attendanceReport.mutateAsync(params);
      showToast("Attendance report downloaded", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate report", "error");
    }
  };

  const handleSalaryReport = async (params) => {
    try {
      await salaryReport.mutateAsync(params);
      showToast("Salary report downloaded", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate report", "error");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Attendance Reports
        </h1>
        <Button variant="secondary" onClick={() => navigate("/attendance")} className="w-full sm:w-auto">
          Back
        </Button>
      </div>

      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Attendance Report
        </h2>
        <ReportFilterBar
          onGenerate={handleAttendanceReport}
          loading={attendanceReport.isPending}
          label="Generate Attendance Report"
        />
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Salary Report
        </h2>
        <ReportFilterBar
          onGenerate={handleSalaryReport}
          loading={salaryReport.isPending}
          label="Generate Salary Report"
        />
      </div>
    </div>
  );
}
