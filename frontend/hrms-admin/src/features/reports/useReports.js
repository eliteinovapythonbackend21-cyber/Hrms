import { useMutation } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { API } from "@/api/endpoints";
import { useFileDownload } from "@/hooks/useFileDownload";

// Shared report-download hook — mirrors the attendance feature's
// useAttendanceReport/useSalaryReport pattern (blob GET + useFileDownload),
// generalized so the other five report cards don't duplicate the
// blob-handling code.
function useReportDownload(url, filename, extraParams) {
  const { downloadBlob } = useFileDownload();
  return useMutation({
    mutationFn: async (params) => {
      const res = await axiosClient.get(url, { params: { ...params, ...extraParams }, responseType: "blob" });
      downloadBlob(res, filename);
      return res;
    },
  });
}

export const useAttendanceReportDownload = () => useReportDownload(API.REPORTS.ATTENDANCE, "attendance_report.xlsx");
export const useLeaveReportDownload = () => useReportDownload(API.REPORTS.LEAVE, "leave_report.xlsx");
export const usePayrollReportDownload = () => useReportDownload(API.REPORTS.PAYROLL, "payroll_report.xlsx");
export const useEmployeeReportDownload = () => useReportDownload(API.REPORTS.EMPLOYEE, "employee_report.xlsx");
export const useCrmReportDownload = () => useReportDownload(API.REPORTS.CRM, "crm_report.xlsx");
export const useFinanceReportDownload = () => useReportDownload(API.REPORTS.FINANCE, "finance_report.xlsx");
