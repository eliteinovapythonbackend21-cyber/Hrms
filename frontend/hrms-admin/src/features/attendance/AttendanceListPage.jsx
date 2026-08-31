import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAttendance } from "./useAttendance";
import AttendanceTable from "./components/AttendanceTable";
import CheckInOutWidget from "./CheckInOutWidget";

import { usePagination } from "@/hooks/usePagination";
import { useTableExport } from "@/hooks/useTableExport";

import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import Button from "@/components/ui/Button";

import { getUser } from "@/utils/tokenHelpers";
import { useIsHrEmployee } from "@/hooks/useIsHrEmployee";
import { attendanceApi } from "@/api/attendance.api";
import { masterApi } from "@/api/master.api";
import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";
import { formatDate, formatTime } from "@/utils/formatDate";

/*
 * ============================================================
 * EXPORT COLUMNS
 * ============================================================
 */

const EXPORT_COLUMNS = [
  {
    header: "Employee",
    accessor: (row) =>
      row.employee
        ? `${row.employee.first_name || ""} ${
            row.employee.last_name || ""
          }`.trim()
        : row.employee_name || null,
  },

  {
    header: "Employee Code",
    accessor: (row) =>
      row.employee?.employee_code ||
      row.employee_code ||
      null,
  },

  {
    header: "Date",
    accessor: (row) =>
      formatDate(row.attendance_date),
  },

  {
    header: "Check In",
    accessor: (row) =>
      formatTime(row.check_in),
  },

  {
    header: "Check Out",
    accessor: (row) =>
      formatTime(row.check_out),
  },

  {
    header: "Working Hours",
    accessor: (row) =>
      row.working_hours != null
        ? `${row.working_hours}h`
        : null,
  },

  {
    header: "Status",
    accessor: (row) =>
      row.attendance_status,
  },
];

/*
 * ============================================================
 * PERIOD TYPES
 * ============================================================
 */

const PERIOD_TYPES = {
  DAILY: "daily",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
};

/*
 * ============================================================
 * STATUS HELPERS
 * ============================================================
 */

const getStatusValue = (row) => {
  return String(
    row?.attendance_status ||
      row?.status ||
      ""
  ).toLowerCase();
};

const isPresent = (row) => {
  const status = getStatusValue(row);

  return (
    status === "present" ||
    status === "checked in" ||
    status === "checked-in"
  );
};

const isAbsent = (row) => {
  return getStatusValue(row) === "absent";
};

const isLeave = (row) => {
  const status = getStatusValue(row);

  return (
    status === "leave" ||
    status === "on leave"
  );
};

const isLate = (row) => {
  const status = getStatusValue(row);

  return (
    status === "late" ||
    status === "late arrival"
  );
};

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

const padNumber = (value) =>
  String(value).padStart(2, "0");

const formatISODate = (
  year,
  month,
  day
) => {
  return `${year}-${padNumber(
    month
  )}-${padNumber(day)}`;
};

const getToday = () => {
  const today = new Date();

  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
};

const getMonthRange = (
  year,
  month
) => {
  const firstDay = new Date(
    year,
    month - 1,
    1
  );

  const lastDay = new Date(
    year,
    month,
    0
  );

  return {
    from_date: formatISODate(
      year,
      month,
      firstDay.getDate()
    ),

    to_date: formatISODate(
      year,
      month,
      lastDay.getDate()
    ),
  };
};

const getQuarterRange = (
  year,
  quarter
) => {
  const startMonth =
    (quarter - 1) * 3 + 1;

  const endMonth =
    startMonth + 2;

  const lastDay = new Date(
    year,
    endMonth,
    0
  );

  return {
    from_date: formatISODate(
      year,
      startMonth,
      1
    ),

    to_date: formatISODate(
      year,
      endMonth,
      lastDay.getDate()
    ),
  };
};

/*
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

export default function AttendanceListPage() {
  /*
   * ----------------------------------------------------------
   * PERIOD STATE
   * ----------------------------------------------------------
   */

  const today = getToday();

  const [periodType, setPeriodType] =
    useState(PERIOD_TYPES.DAILY);

  const [selectedDate, setSelectedDate] =
    useState(
      formatISODate(
        today.year,
        today.month,
        today.day
      )
    );

  const [selectedMonth, setSelectedMonth] =
    useState(today.month);

  const [selectedYear, setSelectedYear] =
    useState(today.year);

  const [selectedQuarter, setSelectedQuarter] =
    useState(
      Math.ceil(today.month / 3)
    );

  /*
   * ----------------------------------------------------------
   * PAGINATION
   * ----------------------------------------------------------
   */

  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
    sortBy,
    sortDir,
    toggleSort,
  } = usePagination();

  /*
   * ----------------------------------------------------------
   * USER / ROLE
   * ----------------------------------------------------------
   */

  const user = getUser();

  const isAdmin =
    user?.role === "admin";

  // HR-department employee logins get the same organization-wide,
  // read-only attendance view as admin (mirrors the HR sidebar's
  // Attendance entry) — but never the write-capable actions
  // (Manual Entry / Reports), which stay isAdmin-only below.
  const { isHrEmployee } = useIsHrEmployee();
  const canViewAll = isAdmin || isHrEmployee;

  /*
   * ----------------------------------------------------------
   * ORGANIZATION FILTERS
   * ----------------------------------------------------------
   *
   * Company
   *    ↓
   * Branch
   *    ↓
   * Department
   *    ↓
   * Designation
   */

  const [
    companyFilterId,
    setCompanyFilterId,
  ] = useState("");

  const [
    branchFilterId,
    setBranchFilterId,
  ] = useState("");

  const [
    departmentFilterId,
    setDepartmentFilterId,
  ] = useState("");

  const [
    designationFilterId,
    setDesignationFilterId,
  ] = useState("");

  /*
   * ----------------------------------------------------------
   * COMPANIES
   * ----------------------------------------------------------
   */

  const {
    data: companyData,
    isLoading: companiesLoading,
  } = useCompanies({
    page: 1,
    per_page: 1000,
    is_active: true,
  });

  const filterCompanies =
    companyData?.items ||
    companyData?.data ||
    [];

  /*
   * ----------------------------------------------------------
   * BRANCHES
   * ----------------------------------------------------------
   */

  const {
    data: branchData,
    isLoading: branchesLoading,
  } = useCompanyBranches(
    companyFilterId || undefined,
    {
      page: 1,
      per_page: 1000,
      is_active: true,
    }
  );

  const filterBranches =
    branchData?.items ||
    branchData?.data ||
    [];

  /*
   * ----------------------------------------------------------
   * DEPARTMENTS
   * ----------------------------------------------------------
   */

  const {
    data: departmentData,
    isLoading: departmentsLoading,
  } = useQuery({
    queryKey: [
      "attendance-filter-departments",
      companyFilterId,
      branchFilterId,
    ],

    queryFn: async () => {
      const response =
        await masterApi.listDepartments({
          company_id: companyFilterId
            ? Number(companyFilterId)
            : undefined,

          branch_id: branchFilterId
            ? Number(branchFilterId)
            : undefined,

          page: 1,
          per_page: 1000,
          is_active: true,
        });

      return (
        response?.data?.data ||
        response?.data ||
        {}
      );
    },

    enabled:
      canViewAll &&
      !!branchFilterId,
  });

  const filterDepartments =
    departmentData?.items ||
    departmentData?.data ||
    [];

  /*
   * ----------------------------------------------------------
   * DESIGNATIONS
   * ----------------------------------------------------------
   */

  const {
    data: designationData,
    isLoading: designationsLoading,
  } = useQuery({
    queryKey: [
      "attendance-filter-designations",
      companyFilterId,
      branchFilterId,
      departmentFilterId,
    ],

    queryFn: async () => {
      const response =
        await masterApi.listDesignations({
          department_id:
            departmentFilterId
              ? Number(departmentFilterId)
              : undefined,

          page: 1,
          per_page: 1000,
          is_active: true,
        });

      return (
        response?.data?.data ||
        response?.data ||
        {}
      );
    },

    enabled:
      canViewAll &&
      !!departmentFilterId,
  });

  const filterDesignations =
    designationData?.items ||
    designationData?.data ||
    [];

  /*
   * ----------------------------------------------------------
   * FILTER HANDLERS
   * ----------------------------------------------------------
   */

  const handleCompanyFilterChange = (
    event
  ) => {
    const value = event.target.value;

    setCompanyFilterId(value);

    // Reset dependent filters.
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");

    // Always go back to page 1.
    setPage(1);
  };

  const handleBranchFilterChange = (
    event
  ) => {
    const value = event.target.value;

    setBranchFilterId(value);

    // Reset dependent filters.
    setDepartmentFilterId("");
    setDesignationFilterId("");

    setPage(1);
  };

  const handleDepartmentFilterChange = (
    event
  ) => {
    const value = event.target.value;

    setDepartmentFilterId(value);

    // Reset designation.
    setDesignationFilterId("");

    setPage(1);
  };

  const handleDesignationFilterChange = (
    event
  ) => {
    const value = event.target.value;

    setDesignationFilterId(value);

    setPage(1);
  };

  const clearOrganizationFilters = () => {
    setCompanyFilterId("");
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");

    setPage(1);
  };

  /*
   * ----------------------------------------------------------
   * PERIOD RANGE
   * ----------------------------------------------------------
   */

  const periodRange = useMemo(() => {
    if (
      periodType ===
      PERIOD_TYPES.DAILY
    ) {
      return {
        from_date: selectedDate,
        to_date: selectedDate,
      };
    }

    if (
      periodType ===
      PERIOD_TYPES.MONTHLY
    ) {
      return getMonthRange(
        selectedYear,
        selectedMonth
      );
    }

    return getQuarterRange(
      selectedYear,
      selectedQuarter
    );
  }, [
    periodType,
    selectedDate,
    selectedMonth,
    selectedQuarter,
    selectedYear,
  ]);

  /*
   * ----------------------------------------------------------
   * ATTENDANCE QUERY
   * ----------------------------------------------------------
   *
   * THIS IS THE IMPORTANT FIX.
   *
   * Send the selected organization IDs directly to the
   * attendance endpoint.
   */

  const queryParams = useMemo(
    () => ({
      ...params,

      page,

      per_page: perPage,

      employee_id:
        !canViewAll &&
        user?.employee?.id
          ? user.employee.id
          : undefined,

      /*
       * Organization filters
       */

      company_id:
        canViewAll &&
        companyFilterId
          ? Number(companyFilterId)
          : undefined,

      branch_id:
        canViewAll &&
        branchFilterId
          ? Number(branchFilterId)
          : undefined,

      department_id:
        canViewAll &&
        departmentFilterId
          ? Number(departmentFilterId)
          : undefined,

      designation_id:
        canViewAll &&
        designationFilterId
          ? Number(designationFilterId)
          : undefined,

      /*
       * Daily attendance endpoint supports attendance_date.
       */

      attendance_date:
        periodType ===
        PERIOD_TYPES.DAILY
          ? selectedDate
          : undefined,

      /*
       * Keep these for report/export usage.
       */

      from_date:
        periodRange.from_date,

      to_date:
        periodRange.to_date,
    }),
    [
      params,
      page,
      perPage,
      canViewAll,
      user?.employee?.id,
      companyFilterId,
      branchFilterId,
      departmentFilterId,
      designationFilterId,
      periodType,
      selectedDate,
      periodRange.from_date,
      periodRange.to_date,
    ]
  );

  /*
   * ----------------------------------------------------------
   * ATTENDANCE
   * ----------------------------------------------------------
   */

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useAttendance(queryParams);

  /*
   * ----------------------------------------------------------
   * ATTENDANCE DATA
   * ----------------------------------------------------------
   */

  const attendanceItems =
    data?.items || [];

  /*
   * ----------------------------------------------------------
   * TOTAL RECORDS
   * ----------------------------------------------------------
   */

  const totalRecords =
    data?.total ??
    attendanceItems.length;

  /*
   * ----------------------------------------------------------
   * SUMMARY
   * ----------------------------------------------------------
   */

  const presentCount =
    attendanceItems.filter(
      isPresent
    ).length;

  const absentCount =
    attendanceItems.filter(
      isAbsent
    ).length;

  const leaveCount =
    attendanceItems.filter(
      isLeave
    ).length;

  const lateCount =
    attendanceItems.filter(
      isLate
    ).length;

  /*
   * ----------------------------------------------------------
   * WORKING HOURS
   * ----------------------------------------------------------
   */

  const totalWorkingHours =
    attendanceItems.reduce(
      (total, row) =>
        total +
        Number(
          row?.working_hours || 0
        ),
      0
    );

  /*
   * ----------------------------------------------------------
   * ATTENDANCE RATE
   * ----------------------------------------------------------
   */

  const attendanceRate =
    totalRecords > 0
      ? Math.round(
          (presentCount /
            totalRecords) *
            100
        )
      : 0;

  /*
   * ----------------------------------------------------------
   * PERIOD TITLE
   * ----------------------------------------------------------
   */

  const periodTitle =
    getPeriodTitle(
      periodType,
      selectedDate,
      selectedMonth,
      selectedQuarter,
      selectedYear
    );

  /*
   * ----------------------------------------------------------
   * EXPORT
   * ----------------------------------------------------------
   *
   * Export uses the EXACT same filter parameters.
   */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: attendanceApi.list,

    queryParams,

    exportColumns:
      EXPORT_COLUMNS,

    filename:
      `attendance-${periodType}`,

    title:
      `Attendance - ${periodTitle}`,
  });

  /*
   * ----------------------------------------------------------
   * FILTER LOADING
   * ----------------------------------------------------------
   */

  const filtersLoading =
    companiesLoading ||
    branchesLoading ||
    departmentsLoading ||
    designationsLoading;

  /*
   * ==========================================================
   * EMPLOYEE VIEW
   * ==========================================================
   */

  if (!canViewAll) {
    return (
      <div className="min-h-full space-y-6">

        <div className="card-elevated overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary-500/15 bg-primary-500/10 text-primary-600 dark:text-primary-300">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="17"
                      rx="2"
                    />

                    <path d="M8 2v4M16 2v4M3 9h18" />

                    <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
                  </svg>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    My Attendance
                  </h1>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Manage your daily check-in and check-out
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>

        <CheckInOutWidget />

        <AttendancePeriodSelector
          periodType={periodType}
          setPeriodType={setPeriodType}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedQuarter={selectedQuarter}
          setSelectedQuarter={setSelectedQuarter}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <AttendanceMetric
            label="Present"
            value={presentCount}
            description={periodTitle}
            icon="present"
          />

          <AttendanceMetric
            label="Absent"
            value={absentCount}
            description={periodTitle}
            icon="absent"
          />

          <AttendanceMetric
            label="Leave"
            value={leaveCount}
            description={periodTitle}
            icon="leave"
          />

          <AttendanceMetric
            label="Working Hours"
            value={`${totalWorkingHours.toFixed(2)}h`}
            description={periodTitle}
            icon="hours"
          />

        </div>

        <div className="card-elevated p-5">

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {periodType ===
                PERIOD_TYPES.DAILY
                  ? "Today's Attendance"
                  : periodType ===
                    PERIOD_TYPES.MONTHLY
                  ? "Monthly Attendance"
                  : "Quarterly Attendance"}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {periodTitle}
              </p>

            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
              {totalRecords} Records
            </span>

          </div>

          {isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              Failed to load attendance records.
            </div>
          ) : (
            <AttendanceTable
              data={attendanceItems}
              loading={isLoading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          )}

        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * ADMIN / HR VIEW
   * ==========================================================
   */

  return (
    <div className="min-h-full space-y-6">

      {/* PAGE HEADER */}

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-6 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                  />

                  <path d="M8 2v4M16 2v4M3 9h18" />

                  <path d="M8 13h.01M12 13h.01M16 13h.01" />

                  <path d="M8 17h8" />
                </svg>
              </div>

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Attendance
                  </h1>

                  {isFetching && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                      Updating
                    </span>
                  )}

                </div>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Monitor employee attendance day-to-day, monthly and quarterly
                </p>

              </div>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">

            <TableToolbar
              onRefresh={refetch}
              refreshing={isFetching}
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
              exporting={exporting}
            />

            {isAdmin && (
              <Link to="/attendance/manual">
                <Button variant="secondary">
                  Manual Entry
                </Button>
              </Link>
            )}

            {isAdmin && (
              <Link to="/attendance/reports">
                <Button>
                  Reports
                </Button>
              </Link>
            )}

          </div>

        </div>

      </div>

      {/* PERIOD SELECTOR */}

      <AttendancePeriodSelector
        periodType={periodType}
        setPeriodType={setPeriodType}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedQuarter={selectedQuarter}
        setSelectedQuarter={setSelectedQuarter}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
      />

      {/* ======================================================
          ORGANIZATION FILTERS
      ======================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

        <div className="mb-4">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Organization Filters
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            Filter Attendance
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Select Company → Branch → Department → Designation.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          {/* COMPANY */}

          <select
            value={companyFilterId}
            onChange={handleCompanyFilterChange}
            disabled={filtersLoading}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
          >

            <option value="">
              All Companies
            </option>

            {filterCompanies.map(
              (company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.name}
                </option>
              )
            )}

          </select>

          {/* BRANCH */}

          <select
            value={branchFilterId}
            onChange={handleBranchFilterChange}
            disabled={
              !companyFilterId ||
              branchesLoading
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
          >

            <option value="">
              {!companyFilterId
                ? "Select Company First"
                : branchesLoading
                ? "Loading Branches..."
                : "All Branches"}
            </option>

            {filterBranches.map(
              (branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              )
            )}

          </select>

          {/* DEPARTMENT */}

          <select
            value={departmentFilterId}
            onChange={handleDepartmentFilterChange}
            disabled={
              !branchFilterId ||
              departmentsLoading
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
          >

            <option value="">
              {!branchFilterId
                ? "Select Branch First"
                : departmentsLoading
                ? "Loading Departments..."
                : "All Departments"}
            </option>

            {filterDepartments.map(
              (department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.department_name}
                </option>
              )
            )}

          </select>

          {/* DESIGNATION */}

          <select
            value={designationFilterId}
            onChange={handleDesignationFilterChange}
            disabled={
              !departmentFilterId ||
              designationsLoading
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
          >

            <option value="">
              {!departmentFilterId
                ? "Select Department First"
                : designationsLoading
                ? "Loading Designations..."
                : "All Designations"}
            </option>

            {filterDesignations.map(
              (designation) => (
                <option
                  key={designation.id}
                  value={designation.id}
                >
                  {designation.designation_name}
                </option>
              )
            )}

          </select>

        </div>

        {/* ACTIVE FILTERS */}

        {(companyFilterId ||
          branchFilterId ||
          departmentFilterId ||
          designationFilterId) && (

          <div className="mt-4 flex flex-wrap items-center gap-2">

            <span className="text-xs font-medium text-slate-400">
              Active filters:
            </span>

            {companyFilterId && (
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                Company
              </span>
            )}

            {branchFilterId && (
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                Branch
              </span>
            )}

            {departmentFilterId && (
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                Department
              </span>
            )}

            {designationFilterId && (
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                Designation
              </span>
            )}

            <button
              type="button"
              onClick={
                clearOrganizationFilters
              }
              className="ml-1 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
            >
              Clear filters
            </button>

          </div>
        )}

      </div>

      {/* ======================================================
          PERIOD SUMMARY
      ======================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Attendance Overview
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {periodTitle}
            </h2>

          </div>

          <span className="w-fit rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
            {periodType ===
            PERIOD_TYPES.DAILY
              ? "Daily"
              : periodType ===
                PERIOD_TYPES.MONTHLY
              ? "Monthly"
              : "Quarterly"}
          </span>

        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <AttendanceMetric
            label="Total Records"
            value={totalRecords}
            description="Attendance records"
            icon="users"
          />

          <AttendanceMetric
            label="Present"
            value={presentCount}
            description="Employees present"
            icon="present"
          />

          <AttendanceMetric
            label="Absent"
            value={absentCount}
            description="Employees absent"
            icon="absent"
          />

          <AttendanceMetric
            label="On Leave"
            value={leaveCount}
            description="Leave records"
            icon="leave"
          />

          <AttendanceMetric
            label="Late"
            value={lateCount}
            description="Late arrivals"
            icon="late"
          />

          <AttendanceMetric
            label="Working Hours"
            value={`${totalWorkingHours.toFixed(2)}h`}
            description="Total hours"
            icon="hours"
          />

        </div>

      </div>

      {/* ======================================================
          ATTENDANCE HEALTH
      ======================================================= */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attendance Rate
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {attendanceRate}%
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {periodTitle}
              </p>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              %
            </div>

          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">

            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  attendanceRate,
                  100
                )}%`,
              }}
            />

          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">

            <span>
              {presentCount} present
            </span>

            <span>
              {totalRecords} records
            </span>

          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Status Breakdown
          </p>

          <div className="mt-4 space-y-3">

            <StatusRow
              label="Present"
              value={presentCount}
              percentage={
                totalRecords
                  ? Math.round(
                      (presentCount /
                        totalRecords) *
                        100
                    )
                  : 0
              }
              type="present"
            />

            <StatusRow
              label="Absent"
              value={absentCount}
              percentage={
                totalRecords
                  ? Math.round(
                      (absentCount /
                        totalRecords) *
                        100
                    )
                  : 0
              }
              type="absent"
            />

            <StatusRow
              label="Leave"
              value={leaveCount}
              percentage={
                totalRecords
                  ? Math.round(
                      (leaveCount /
                        totalRecords) *
                        100
                    )
                  : 0
              }
              type="leave"
            />

            <StatusRow
              label="Late"
              value={lateCount}
              percentage={
                totalRecords
                  ? Math.round(
                      (lateCount /
                        totalRecords) *
                        100
                    )
                  : 0
              }
              type="late"
            />

          </div>

        </div>

        {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Attendance Tools
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">

            <Link
              to="/attendance/manual"
              className="group rounded-xl border border-slate-200 p-3 transition hover:border-primary-300 hover:bg-primary-50 dark:border-white/10 dark:hover:border-primary-700 dark:hover:bg-primary-500/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-white/[0.06] dark:text-slate-300 dark:group-hover:bg-primary-500/10 dark:group-hover:text-primary-400">
                +
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">
                Manual Entry
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Add attendance
              </p>
            </Link>

            <Link
              to="/attendance/reports"
              className="group rounded-xl border border-slate-200 p-3 transition hover:border-primary-300 hover:bg-primary-50 dark:border-white/10 dark:hover:border-primary-700 dark:hover:bg-primary-500/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-white/[0.06] dark:text-slate-300 dark:group-hover:bg-primary-500/10 dark:group-hover:text-primary-400">
                ↗
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">
                Reports
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                View reports
              </p>
            </Link>

          </div>

        </div>
        )}

      </div>

      {/* ======================================================
          ATTENDANCE TABLE
      ======================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

        <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex items-center gap-2">

                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {periodType ===
                  PERIOD_TYPES.DAILY
                    ? "Daily Attendance Records"
                    : periodType ===
                      PERIOD_TYPES.MONTHLY
                    ? "Monthly Attendance Records"
                    : "Quarterly Attendance Records"}
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                  {totalRecords}
                </span>

              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {periodTitle} · Employee check-in, check-out and attendance status
              </p>

            </div>

          </div>

        </div>

        {isError && (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">

            <div className="flex items-center gap-2">

              <span className="font-semibold">
                Unable to load attendance.
              </span>

              <button
                type="button"
                onClick={() => refetch()}
                className="font-medium underline hover:no-underline"
              >
                Try again
              </button>

            </div>

          </div>
        )}

        <div className="overflow-x-auto">

          <AttendanceTable
            data={attendanceItems}
            loading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={toggleSort}
          />

        </div>

        <div className="border-t border-slate-200 dark:border-white/10">

          <TablePagination
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(value) => {
              setPerPage(value);
              setPage(1);
            }}
          />

        </div>

      </div>

    </div>
  );
}

/*
 * ============================================================
 * PERIOD SELECTOR
 * ============================================================
 */

function AttendancePeriodSelector({
  periodType,
  setPeriodType,
  selectedDate,
  setSelectedDate,
  selectedMonth,
  setSelectedMonth,
  selectedQuarter,
  setSelectedQuarter,
  selectedYear,
  setSelectedYear,
}) {
  const currentYear =
    new Date().getFullYear();

  const years = Array.from(
    { length: 6 },
    (_, index) =>
      currentYear - index
  );

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const quarters = [
    {
      value: 1,
      label: "Q1",
      description: "Jan - Mar",
    },
    {
      value: 2,
      label: "Q2",
      description: "Apr - Jun",
    },
    {
      value: 3,
      label: "Q3",
      description: "Jul - Sep",
    },
    {
      value: 4,
      label: "Q4",
      description: "Oct - Dec",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">

      <div className="flex flex-wrap gap-2">

        <PeriodTab
          active={
            periodType ===
            PERIOD_TYPES.DAILY
          }
          onClick={() =>
            setPeriodType(
              PERIOD_TYPES.DAILY
            )
          }
        >
          Day-to-Day
        </PeriodTab>

        <PeriodTab
          active={
            periodType ===
            PERIOD_TYPES.MONTHLY
          }
          onClick={() =>
            setPeriodType(
              PERIOD_TYPES.MONTHLY
            )
          }
        >
          Monthly
        </PeriodTab>

        <PeriodTab
          active={
            periodType ===
            PERIOD_TYPES.QUARTERLY
          }
          onClick={() =>
            setPeriodType(
              PERIOD_TYPES.QUARTERLY
            )
          }
        >
          Quarterly
        </PeriodTab>

      </div>

      {periodType ===
        PERIOD_TYPES.DAILY && (
        <div className="mt-5">

          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Attendance Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value
              )
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 sm:w-64"
          />

        </div>
      )}

      {periodType ===
        PERIOD_TYPES.MONTHLY && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Month
            </label>

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              {months.map(
                (month) => (
                  <option
                    key={month.value}
                    value={month.value}
                  >
                    {month.label}
                  </option>
                )
              )}
            </select>

          </div>

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Year
            </label>

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              {years.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>

          </div>

        </div>
      )}

      {periodType ===
        PERIOD_TYPES.QUARTERLY && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quarter
            </label>

            <select
              value={selectedQuarter}
              onChange={(event) =>
                setSelectedQuarter(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              {quarters.map(
                (quarter) => (
                  <option
                    key={quarter.value}
                    value={quarter.value}
                  >
                    {quarter.label} (
                    {
                      quarter.description
                    }
                    )
                  </option>
                )
              )}
            </select>

          </div>

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Year
            </label>

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              {years.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>

          </div>

        </div>
      )}

    </div>
  );
}

/*
 * ============================================================
 * PERIOD TAB
 * ============================================================
 */

function PeriodTab({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-primary-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

/*
 * ============================================================
 * PERIOD TITLE
 * ============================================================
 */

function getPeriodTitle(
  periodType,
  selectedDate,
  selectedMonth,
  selectedQuarter,
  selectedYear
) {
  if (
    periodType ===
    PERIOD_TYPES.DAILY
  ) {
    return selectedDate
      ? formatDate(selectedDate)
      : "Selected Date";
  }

  if (
    periodType ===
    PERIOD_TYPES.MONTHLY
  ) {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return `${
      monthNames[selectedMonth - 1]
    } ${selectedYear}`;
  }

  const quarterMonths = {
    1: "January - March",
    2: "April - June",
    3: "July - September",
    4: "October - December",
  };

  return `Q${selectedQuarter} ${selectedYear} · ${
    quarterMonths[selectedQuarter]
  }`;
}

/*
 * ============================================================
 * ATTENDANCE METRIC
 * ============================================================
 */

function AttendanceMetric({
  label,
  value,
  description,
  icon,
}) {
  const tileTints = {
    users: "stat-tile-primary",
    present: "stat-tile-success",
    absent: "stat-tile-danger",
    leave: "stat-tile-warn",
    late: "stat-tile-violet",
    hours: "stat-tile-accent",
  };

  const iconStyles = {
    users:
      "bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300",

    present:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",

    absent:
      "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300",

    leave:
      "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",

    late:
      "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",

    hours:
      "bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
  };

  const icons = {
    users: "●",
    present: "✓",
    absent: "×",
    leave: "◐",
    late: "◷",
    hours: "◴",
  };

  return (
    <div className={`stat-tile ${tileTints[icon] || "stat-tile-primary"} !p-5`}>

      <div className="flex items-start justify-between">

        <div className="min-w-0">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
            {description}
          </p>

        </div>

        <div
          className={`ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${iconStyles[icon]}`}
        >
          {icons[icon]}
        </div>

      </div>

    </div>
  );
}

/*
 * ============================================================
 * STATUS ROW
 * ============================================================
 */

function StatusRow({
  label,
  value,
  percentage,
  type,
}) {
  const barStyles = {
    present: "bg-emerald-500",
    absent: "bg-red-500",
    leave: "bg-amber-500",
    late: "bg-orange-500",
  };

  return (
    <div>

      <div className="mb-1.5 flex items-center justify-between">

        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {label}
        </span>

        <span className="text-xs font-semibold text-slate-800 dark:text-white">
          {value}

          <span className="ml-1 font-normal text-slate-400">
            ({percentage}%)
          </span>
        </span>

      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">

        <div
          className={`h-full rounded-full transition-all duration-500 ${barStyles[type]}`}
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`,
          }}
        />

      </div>

    </div>
  );
}