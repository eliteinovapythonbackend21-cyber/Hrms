import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReportFilterBar from "./components/ReportFilterBar";
import { useAttendanceReport, useSalaryReport } from "./useAttendanceReports";
import { useToast } from "@/components/feedback/Toast";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

export default function AttendanceReportsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const attendanceReport = useAttendanceReport();
  const salaryReport = useSalaryReport();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);

  const handleAttendanceReport = async (params) => {
    try {
      await attendanceReport.mutateAsync(params);
      showToast("Attendance report downloaded", "success");
      setShowAttendanceModal(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to generate report", "error");
    }
  };

  const handleSalaryReport = async (params) => {
    try {
      await salaryReport.mutateAsync(params);
      showToast("Salary report downloaded", "success");
      setShowSalaryModal(false);
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

      <div className="card p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Attendance Report
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Download attendance records for a date range.
          </p>
        </div>
        <Button onClick={() => setShowAttendanceModal(true)} className="w-full sm:w-auto">
          Generate Attendance Report
        </Button>
      </div>

      <div className="card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Salary Report
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Download salary records for a date range.
          </p>
        </div>
        <Button onClick={() => setShowSalaryModal(true)} className="w-full sm:w-auto">
          Generate Salary Report
        </Button>
      </div>

      <Modal
        open={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        title="Generate Attendance Report"
        size="sm"
      >
        <ReportFilterBar
          onGenerate={handleAttendanceReport}
          loading={attendanceReport.isPending}
          label="Download Report"
        />
      </Modal>

      <Modal
        open={showSalaryModal}
        onClose={() => setShowSalaryModal(false)}
        title="Generate Salary Report"
        size="sm"
      >
        <ReportFilterBar
          onGenerate={handleSalaryReport}
          loading={salaryReport.isPending}
          label="Download Report"
        />
      </Modal>
    </div>
  );
}
