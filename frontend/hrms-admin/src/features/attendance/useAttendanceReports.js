import { useMutation } from "@tanstack/react-query";

import { attendanceApi } from "@/api/attendance.api";

import { useFileDownload } from "@/hooks/useFileDownload";

/*
 * ============================================================
 * ATTENDANCE REPORT
 * ============================================================
 */

export function useAttendanceReport() {
  const { downloadBlob } = useFileDownload();

  return useMutation({
    mutationFn: async (params) => {
      const res = await attendanceApi.report(params);

      downloadBlob(
        res,
        "attendance_report.xlsx"
      );

      return res;
    },
  });
}

/*
 * ============================================================
 * MONTHLY PAYSLIP REPORT
 * ============================================================
 *
 * NOTE:
 * This currently uses the existing salary-report endpoint.
 *
 * Once the backend provides a dedicated monthly payslip
 * report endpoint, replace attendanceApi.salaryReport()
 * with attendanceApi.payslipReport().
 *
 * ============================================================
 */

export function useMonthlyPayslipReport() {
  const { downloadBlob } = useFileDownload();

  return useMutation({
    mutationFn: async (params) => {
      const res =
        await attendanceApi.salaryReport(params);

      downloadBlob(
        res,
        `monthly_payslip_report_${params.year}_${String(
          params.month
        ).padStart(2, "0")}.xlsx`
      );

      return res;
    },
  });
}