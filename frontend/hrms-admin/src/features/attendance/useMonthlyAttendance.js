import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";

export function useMonthlyAttendance(month, year, employeeId) {
  return useQuery({
    queryKey: ["attendance-monthly-summary", month, year, employeeId],
    queryFn: async () => {
      const res = await attendanceApi.monthlySummary({
        month,
        year,
        employee_id: employeeId,
      });
      return res.data.data;
    },
    enabled: !!month && !!year,
  });
}