import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";
import { leavesApi } from "@/api/leaves.api";
import { holidayApi } from "@/api/master.api";
import { getUser } from "@/utils/tokenHelpers";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISODate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

// Calendar rendering (calendar cell generation, legend, grid) intentionally
// mirrors the pattern in features/holidays/HolidayListPage.jsx, trimmed down
// to a single read-only month view for the employee dashboard.
export default function MyAttendanceCalendar() {
  const user = getUser();
  const employeeId = user?.employee?.id;

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthStart = toISODate(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = toISODate(year, month, daysInMonth);

  const { data: attendanceData, isLoading: attendanceLoading, isError: attendanceError } = useQuery({
    queryKey: ["my-attendance-calendar", employeeId, monthStart, monthEnd],
    queryFn: async () => {
      const res = await attendanceApi.list({
        employee_id: employeeId,
        from_date: monthStart,
        to_date: monthEnd,
        per_page: 100,
      });
      return res.data?.data?.items || [];
    },
    enabled: !!employeeId,
  });

  const { data: leavesData, isLoading: leavesLoading, isError: leavesError } = useQuery({
    queryKey: ["my-leaves-calendar", employeeId, monthStart, monthEnd],
    queryFn: async () => {
      const res = await leavesApi.list({
        employee_id: employeeId,
        status: "Approved",
        from_date: monthStart,
        to_date: monthEnd,
        per_page: 100,
      });
      return res.data?.data?.items || [];
    },
    enabled: !!employeeId,
  });

  const { data: holidaysData, isLoading: holidaysLoading, isError: holidaysError } = useQuery({
    queryKey: ["my-holidays-calendar", year],
    queryFn: async () => {
      const res = await holidayApi.list({ per_page: 1000, is_active: "true" });
      return res.data?.data?.items || [];
    },
  });

  const isLoading = attendanceLoading || leavesLoading || holidaysLoading;
  const isError = attendanceError || leavesError || holidaysError;

  const attendanceByDate = useMemo(() => {
    const map = new Map();
    (attendanceData || []).forEach((row) => {
      const key = dateKey(row.attendance_date);
      if (key) map.set(key, row);
    });
    return map;
  }, [attendanceData]);

  const leaveDates = useMemo(() => {
    const set = new Set();
    (leavesData || []).forEach((leave) => {
      const from = leave.from_date ? new Date(leave.from_date) : null;
      const to = leave.to_date ? new Date(leave.to_date) : from;
      if (!from) return;
      const cursor = new Date(from);
      while (cursor <= to) {
        set.add(dateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return set;
  }, [leavesData]);

  const holidaysByDate = useMemo(() => {
    const map = new Map();
    (holidaysData || []).forEach((holiday) => {
      const key = dateKey(holiday.holiday_date);
      if (key) map.set(key, holiday);
    });
    return map;
  }, [holidaysData]);

  const monthSummary = useMemo(() => {
    const presentDays = (attendanceData || []).filter(
      (row) => (row.attendance_status || "Present") === "Present"
    );
    const totalHours = presentDays.reduce((sum, row) => sum + (Number(row.working_hours) || 0), 0);
    return {
      daysWorked: presentDays.length,
      totalHours: Math.round(totalHours * 10) / 10,
      leaveDays: leaveDates.size,
    };
  }, [attendanceData, leaveDates]);

  const calendarCells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay();
    const cells = [];

    for (let i = 0; i < startWeekday; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const key = toISODate(year, month, day);
      cells.push({
        day,
        key,
        attendance: attendanceByDate.get(key) || null,
        isLeave: leaveDates.has(key),
        holiday: holidaysByDate.get(key) || null,
      });
    }

    return cells;
  }, [year, month, daysInMonth, attendanceByDate, leaveDates, holidaysByDate]);

  const goToPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const isToday = (day) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

  return (
    <div className="card-elevated overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.08]">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Your Calendar</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Attendance, holidays and approved leaves for the month
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="min-w-[110px] text-center text-xs font-bold text-slate-700 dark:text-slate-200">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {isError && (
        <div className="px-4 py-3 text-sm text-red-600 dark:text-red-400">
          Failed to load calendar data. Please refresh the page and try again.
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-3 px-4 py-3">
        <div className="stat-tile stat-tile-success !p-2.5 text-center">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {isLoading ? "-" : monthSummary.daysWorked}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Days worked</p>
        </div>
        <div className="stat-tile stat-tile-primary !p-2.5 text-center">
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {isLoading ? "-" : monthSummary.totalHours}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Hours logged</p>
        </div>
        <div className="stat-tile stat-tile-warn !p-2.5 text-center">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {isLoading ? "-" : monthSummary.leaveDays}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Approved leave days</p>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap items-center gap-3 px-4 pb-2 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Approved leave</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Holiday</span>
      </div>

      {/* WEEKDAYS */}
      <div className="grid grid-cols-7 bg-slate-100/80 dark:bg-white/[0.04]">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="border-r border-slate-200 px-1 py-1.5 text-center text-[9px] font-bold uppercase text-slate-500 last:border-r-0 dark:border-white/[0.06] dark:text-slate-400"
          >
            {label}
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-px bg-slate-200/70 pb-2 dark:bg-white/[0.06]">
        {calendarCells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="min-h-[64px] bg-slate-50/60 dark:bg-white/[0.01]" />;
          }

          const isPresent = cell.attendance && (cell.attendance.attendance_status || "Present") === "Present";

          return (
            <div
              key={cell.key}
              className={`min-h-[64px] bg-white p-1.5 dark:bg-[#0f0f16] ${isToday(cell.day) ? "ring-2 ring-inset ring-primary-400 dark:ring-primary-500" : ""}`}
              title={cell.holiday ? cell.holiday.name : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{cell.day}</span>
                <div className="flex items-center gap-0.5">
                  {isPresent && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                  {cell.isLeave && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  {cell.holiday && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                </div>
              </div>
              {isPresent && cell.attendance.working_hours != null && (
                <p className="mt-1 truncate text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                  {cell.attendance.working_hours}h
                </p>
              )}
              {cell.holiday && (
                <p className="mt-1 truncate text-[9px] text-violet-600 dark:text-violet-400">{cell.holiday.name}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
