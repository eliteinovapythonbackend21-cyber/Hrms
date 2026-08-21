import { useState } from "react";
import { useMonthlyAttendance } from "./useMonthlyAttendance";
import AttendanceMonthlySummaryTable from "./components/AttendanceMonthlySummaryTable";
import TableToolbar from "@/components/table/TableToolbar";

export default function FinanceAttendanceMonthlyPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const {
    data: monthlyData,
    isLoading: monthlyLoading,
    isFetching: monthlyFetching,
    refetch: refetchMonthly,
  } = useMonthlyAttendance(month, year);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance — Monthly</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monthly attendance and salary-impact summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TableToolbar onRefresh={refetchMonthly} refreshing={monthlyFetching} />
          <input
            type="month"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-");
              setYear(Number(y));
              setMonth(Number(m));
            }}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="card">
        <AttendanceMonthlySummaryTable
          data={monthlyData?.items || []}
          loading={monthlyLoading}
        />
      </div>
    </div>
  );
}