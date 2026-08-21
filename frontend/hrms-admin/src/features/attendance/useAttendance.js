import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";

/**
 * Fetch attendance records.
 *
 * Supports:
 * - employee_id
 * - attendance_date
 * - page
 * - per_page
 * - search
 */
export function useAttendance(params = {}, options = {}) {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: async () => {
      const response = await attendanceApi.list(params);

      return response?.data?.data ?? response?.data ?? {};
    },
    ...options,
  });
}

/**
 * Fetch monthly attendance summary.
 *
 * Returns:
 * {
 *   items: [],
 *   month: number,
 *   year: number
 * }
 */
export function useAttendanceMonthlySummary(
  params = {},
  options = {}
) {
  return useQuery({
    queryKey: ["attendance-monthly-summary", params],
    queryFn: async () => {
      const response =
        await attendanceApi.monthlySummary(params);

      return (
        response?.data?.data ?? {
          items: [],
          month: params.month,
          year: params.year,
        }
      );
    },
    ...options,
  });
}

/**
 * Alias for components that use the shorter
 * monthly summary hook name.
 */
export const useMonthlyAttendanceSummary =
  useAttendanceMonthlySummary;