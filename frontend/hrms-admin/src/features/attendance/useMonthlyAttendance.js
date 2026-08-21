import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";

export function useMonthlyAttendance(
  month,
  year,
  employeeId,
  options = {}
) {
  return useQuery({
    queryKey: [
      "attendance-monthly-summary",
      month,
      year,
      employeeId,
      options,
    ],

    queryFn: async () => {
      const res = await attendanceApi.monthlySummary({
        month,
        year,
        employee_id: employeeId,
        holiday_type: options.holidayType,
        department_id: options.departmentId,
        search: options.search,
      });

      return res.data.data;
    },

    enabled: Boolean(month && year),

    keepPreviousData: true,
  });
}