import { useQueries } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";
import { toDateInputValue } from "@/utils/formatDate";

function lastNDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(toDateInputValue(d));
  }
  return dates;
}

// Backend only supports an exact `attendance_date` filter (no date range),
// so the trend is built from one lightweight request per day — `per_page: 1`
// keeps the payload tiny since only the `total` count is used.
export function useAttendanceTrend(days = 7, employeeId) {
  const dates = lastNDates(days);

  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: ["attendance-trend", date, employeeId || "all"],
      queryFn: async () => {
        const params = { attendance_date: date, per_page: 1 };
        if (employeeId) params.employee_id = employeeId;
        const res = await attendanceApi.list(params);
        return { date, count: res.data.data.total };
      },
    })),
  });

  return {
    data: results.map((r, i) => r.data || { date: dates[i], count: 0 }),
    isLoading: results.some((r) => r.isLoading),
  };
}
