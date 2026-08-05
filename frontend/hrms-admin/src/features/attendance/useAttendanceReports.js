import { useMutation } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";
import { useFileDownload } from "@/hooks/useFileDownload";

export function useAttendanceReport() {
  const { downloadBlob } = useFileDownload();
  return useMutation({
    mutationFn: async (params) => {
      const res = await attendanceApi.report(params);
      downloadBlob(res, "attendance_report.xlsx");
      return res;
    },
  });
}

export function useSalaryReport() {
  const { downloadBlob } = useFileDownload();
  return useMutation({
    mutationFn: async (params) => {
      const res = await attendanceApi.salaryReport(params);
      downloadBlob(res, "salary_report.xlsx");
      return res;
    },
  });
}
