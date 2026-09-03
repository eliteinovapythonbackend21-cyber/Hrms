import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";
import { leavesApi } from "@/api/leaves.api";
import { holidayApi, masterApi } from "@/api/master.api";
import { getUser } from "@/utils/tokenHelpers";
import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toISODate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dateKey(value) {
  if (!value) return "";

  // A JS Date object must be formatted as local YYYY-MM-DD rather than
  // stringified (Date#toString() gives "Thu Aug 27 2026 ...", whose
  // first 10 characters are "Thu Aug 27" — not an ISO date, so it would
  // never match the "YYYY-MM-DD" keys used to build calendar cells).
  if (value instanceof Date) {
    return toISODate(value.getFullYear(), value.getMonth(), value.getDate());
  }

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

  /*
   * Organization filters — Company → Branch → Department →
   * Designation, same cascading pattern as AttendanceListPage.jsx.
   * The calendar always stays scoped to this login's own employee_id
   * (the grid renders one record per day, so it can't meaningfully show
   * more than one employee), and the backend join additionally narrows
   * that to only the selected company/branch/department/designation —
   * so these filters double as a quick "does my record match this
   * org slice" check, and matter more once the backend allows an HR
   * employee login to browse broader attendance data from other screens.
   */

  const [companyFilterId, setCompanyFilterId] = useState("");
  const [branchFilterId, setBranchFilterId] = useState("");
  const [departmentFilterId, setDepartmentFilterId] = useState("");
  const [designationFilterId, setDesignationFilterId] = useState("");

  const { data: companyData, isLoading: companiesLoading } = useCompanies({
    page: 1,
    per_page: 1000,
    is_active: true,
  });
  const filterCompanies = companyData?.items || companyData?.data || [];

  const { data: branchData, isLoading: branchesLoading } = useCompanyBranches(
    companyFilterId || undefined,
    { page: 1, per_page: 1000, is_active: true }
  );
  const filterBranches = branchData?.items || branchData?.data || [];

  const { data: departmentData, isLoading: departmentsLoading } = useQuery({
    queryKey: ["my-calendar-filter-departments", companyFilterId, branchFilterId],
    queryFn: async () => {
      const res = await masterApi.listDepartments({
        company_id: companyFilterId ? Number(companyFilterId) : undefined,
        branch_id: branchFilterId ? Number(branchFilterId) : undefined,
        page: 1,
        per_page: 1000,
        is_active: true,
      });
      return res?.data?.data || res?.data || {};
    },
    enabled: !!branchFilterId,
  });
  const filterDepartments = departmentData?.items || departmentData?.data || [];

  const { data: designationData, isLoading: designationsLoading } = useQuery({
    queryKey: ["my-calendar-filter-designations", departmentFilterId],
    queryFn: async () => {
      const res = await masterApi.listDesignations({
        department_id: departmentFilterId ? Number(departmentFilterId) : undefined,
        page: 1,
        per_page: 1000,
        is_active: true,
      });
      return res?.data?.data || res?.data || {};
    },
    enabled: !!departmentFilterId,
  });
  const filterDesignations = designationData?.items || designationData?.data || [];

  const handleCompanyFilterChange = (e) => {
    setCompanyFilterId(e.target.value);
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };

  const handleBranchFilterChange = (e) => {
    setBranchFilterId(e.target.value);
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };

  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilterId(e.target.value);
    setDesignationFilterId("");
  };

  const handleDesignationFilterChange = (e) => {
    setDesignationFilterId(e.target.value);
  };

  const orgFilterParams = {
    company_id: companyFilterId ? Number(companyFilterId) : undefined,
    branch_id: branchFilterId ? Number(branchFilterId) : undefined,
    department_id: departmentFilterId ? Number(departmentFilterId) : undefined,
    designation_id: designationFilterId ? Number(designationFilterId) : undefined,
  };

  const { data: attendanceData, isLoading: attendanceLoading, isError: attendanceError } = useQuery({
    queryKey: [
      "my-attendance-calendar",
      employeeId,
      monthStart,
      monthEnd,
      companyFilterId,
      branchFilterId,
      departmentFilterId,
      designationFilterId,
    ],
    queryFn: async () => {
      const res = await attendanceApi.list({
        employee_id: employeeId,
        from_date: monthStart,
        to_date: monthEnd,
        per_page: 100,
        ...orgFilterParams,
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

      {/* ORGANIZATION FILTERS */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 sm:grid-cols-4">
        <select
          value={companyFilterId}
          onChange={handleCompanyFilterChange}
          disabled={companiesLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">All Companies</option>
          {filterCompanies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>

        <select
          value={branchFilterId}
          onChange={handleBranchFilterChange}
          disabled={!companyFilterId || branchesLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">
            {!companyFilterId ? "Select Company First" : branchesLoading ? "Loading..." : "All Branches"}
          </option>
          {filterBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>

        <select
          value={departmentFilterId}
          onChange={handleDepartmentFilterChange}
          disabled={!branchFilterId || departmentsLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">
            {!branchFilterId ? "Select Branch First" : departmentsLoading ? "Loading..." : "All Departments"}
          </option>
          {filterDepartments.map((department) => (
            <option key={department.id} value={department.id}>{department.department_name}</option>
          ))}
        </select>

        <select
          value={designationFilterId}
          onChange={handleDesignationFilterChange}
          disabled={!departmentFilterId || designationsLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">
            {!departmentFilterId ? "Select Department First" : designationsLoading ? "Loading..." : "All Designations"}
          </option>
          {filterDesignations.map((designation) => (
            <option key={designation.id} value={designation.id}>{designation.designation_name || designation.name}</option>
          ))}
        </select>
      </div>

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
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-4 pb-3 pt-1 text-xs font-medium text-slate-600 dark:border-white/[0.06] dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-500/20" />
          Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-500/20" />
          Approved leave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500 ring-2 ring-violet-100 dark:ring-violet-500/20" />
          Holiday
        </span>
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
            return <div key={`empty-${index}`} className="min-h-[68px] bg-slate-50/60 dark:bg-white/[0.01]" />;
          }

          const isPresent = cell.attendance && (cell.attendance.attendance_status || "Present") === "Present";
          const checkIn = cell.attendance ? formatTime(cell.attendance.check_in) : null;
          const checkOut = cell.attendance ? formatTime(cell.attendance.check_out) : null;

          const titleParts = [];
          if (cell.holiday) titleParts.push(cell.holiday.name);
          if (cell.isLeave) titleParts.push("Approved leave");
          if (checkIn) titleParts.push(`In: ${checkIn}`);
          if (checkOut) titleParts.push(`Out: ${checkOut}`);

          // A day can only carry ONE background tint / accent — priority
          // Holiday > Approved leave > Present — so the cell's overall
          // colour always matches what its status dot(s) say, instead of
          // staying plain white regardless of status like before.
          const status = cell.holiday
            ? "holiday"
            : cell.isLeave
            ? "leave"
            : isPresent
            ? "present"
            : null;

          const STATUS_STYLES = {
            present: {
              bg: "bg-emerald-50/70 dark:bg-emerald-500/[0.07]",
              border: "border-l-emerald-500",
              dayText: "text-emerald-700 dark:text-emerald-400",
            },
            leave: {
              bg: "bg-amber-50/70 dark:bg-amber-500/[0.07]",
              border: "border-l-amber-500",
              dayText: "text-amber-700 dark:text-amber-400",
            },
            holiday: {
              bg: "bg-violet-50/70 dark:bg-violet-500/[0.07]",
              border: "border-l-violet-500",
              dayText: "text-violet-700 dark:text-violet-400",
            },
          };
          const style = STATUS_STYLES[status];

          return (
            <div
              key={cell.key}
              className={`min-h-[68px] border-l-4 p-1.5 transition-colors ${
                style ? `${style.bg} ${style.border}` : "border-l-transparent bg-white dark:bg-[#0f0f16]"
              } ${isToday(cell.day) ? "ring-2 ring-inset ring-primary-400 dark:ring-primary-500" : ""}`}
              title={titleParts.length ? titleParts.join(" · ") : undefined}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    style ? style.dayText : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {cell.day}
                </span>
                <div className="flex items-center gap-1">
                  {isPresent && (
                    <span
                      className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0f0f16]"
                      aria-label="Present"
                    />
                  )}
                  {cell.isLeave && (
                    <span
                      className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#0f0f16]"
                      aria-label="Approved leave"
                    />
                  )}
                  {cell.holiday && (
                    <span
                      className="h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white dark:ring-[#0f0f16]"
                      aria-label="Holiday"
                    />
                  )}
                </div>
              </div>
              {isPresent && cell.attendance.working_hours != null && (
                <p className="mt-1 truncate text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {cell.attendance.working_hours}h
                </p>
              )}
              {isPresent && (checkIn || checkOut) && (
                <p className="mt-0.5 truncate text-[9px] text-slate-500 dark:text-slate-400">
                  {checkIn || "--"} - {checkOut || "--"}
                </p>
              )}
              {cell.isLeave && (
                <p className="mt-1 truncate text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                  On leave
                </p>
              )}
              {cell.holiday && (
                <p className="mt-1 truncate text-[9px] font-semibold text-violet-700 dark:text-violet-400">
                  {cell.holiday.name}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
