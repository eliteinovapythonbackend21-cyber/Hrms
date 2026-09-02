import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useLeaves } from "./useLeaves";
import LeaveTable from "./components/LeaveTable";

import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";

import TablePagination from "@/components/table/TablePagination";
import TableSearchBar from "@/components/table/TableSearchBar";
import TableToolbar from "@/components/table/TableToolbar";

import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

import { getUser } from "@/utils/tokenHelpers";
import { useIsHrEmployee } from "@/hooks/useIsHrEmployee";
import { masterApi } from "@/api/master.api";
import { leavesApi } from "@/api/leaves.api";
import { formatDate } from "@/utils/formatDate";

import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";

/* ============================================================
   PERIOD TYPES
============================================================ */

const PERIOD_TYPES = {
  DAILY: "daily",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
};

/* ============================================================
   EXPORT COLUMNS
============================================================ */

const EXPORT_COLUMNS = [
  {
    header: "Employee",
    accessor: (r) =>
      r.employee
        ? `${r.employee.first_name || ""} ${
            r.employee.last_name || ""
          }`.trim()
        : r.employee_name || "",
  },
  {
    header: "Leave Type",
    accessor: (r) => r.leave_type?.name || "",
  },
  {
    header: "From",
    accessor: (r) => formatDate(r.from_date),
  },
  {
    header: "To",
    accessor: (r) => formatDate(r.to_date),
  },
  {
    header: "Days",
    accessor: (r) => r.total_days,
  },
  {
    header: "Reason",
    accessor: (r) => r.reason,
  },
  {
    header: "Description",
    accessor: (r) => r.description,
  },
  {
    header: "Status",
    accessor: (r) => r.status,
  },
];

/* ============================================================
   DATE HELPERS
============================================================ */

const padNumber = (value) =>
  String(value).padStart(2, "0");

const formatISODate = (
  year,
  month,
  day
) =>
  `${year}-${padNumber(month)}-${padNumber(day)}`;

/* ============================================================
   TODAY
============================================================ */

const getToday = () => {
  const today = new Date();

  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
};

/* ============================================================
   MONTH RANGE
============================================================ */

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

/* ============================================================
   QUARTER RANGE
============================================================ */

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

/* ============================================================
   PERIOD TITLE
============================================================ */

function getPeriodTitle(
  periodType,
  selectedDate,
  selectedMonth,
  selectedQuarter,
  selectedYear
) {
  if (
    periodType === PERIOD_TYPES.DAILY
  ) {
    return selectedDate
      ? formatDate(selectedDate)
      : "Selected Date";
  }

  if (
    periodType === PERIOD_TYPES.MONTHLY
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

/* ============================================================
   MAIN PAGE
============================================================ */

export default function LeaveListPage() {
  const today = getToday();

  /* ----------------------------------------------------------
     PERIOD STATE
  ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     PAGINATION
  ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     SEARCH
  ---------------------------------------------------------- */

  const {
    value: search,
    setValue: setSearch,
    debouncedValue: debouncedSearch,
  } = useDebouncedSearch();

  /* ----------------------------------------------------------
     USER
  ---------------------------------------------------------- */

  const user = getUser();

  const isAdmin =
    String(user?.role || "").toLowerCase() ===
    "admin";

  // HR-department employee logins get the same organization-wide,
  // read-only leave view as admin (mirrors the HR sidebar's Leaves
  // entry) — Approvals and row-level approve/reject actions stay
  // isAdmin-only below.
  const { isHrEmployee } = useIsHrEmployee();
  const canViewAll = isAdmin || isHrEmployee;

  /* ----------------------------------------------------------
     FILTERS
  ---------------------------------------------------------- */

  const [leaveTypeFilter, setLeaveTypeFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  /* ----------------------------------------------------------
     ORGANIZATION FILTERS — Company → Branch → Department →
     Designation. Same cascading pattern as AttendanceListPage:
     each level's options are scoped to the level above, and
     each level resets everything below it when changed.
  ---------------------------------------------------------- */

  const [companyFilterId, setCompanyFilterId] = useState("");
  const [branchFilterId, setBranchFilterId] = useState("");
  const [departmentFilterId, setDepartmentFilterId] = useState("");
  const [designationFilterId, setDesignationFilterId] = useState("");

  const { data: companyData, isLoading: companiesLoading } = useCompanies({
    page: 1,
    per_page: 100,
    is_active: true,
  });

  const { data: branchData, isLoading: branchesLoading } = useCompanyBranches(
    companyFilterId,
    { page: 1, per_page: 100, is_active: true }
  );

  const { data: departmentData, isLoading: departmentsLoading } = useQuery({
    queryKey: ["leave-departments-filter", branchFilterId],
    queryFn: async () =>
      (
        await masterApi.listDepartments({
          branch_id: branchFilterId,
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
    enabled: canViewAll && !!branchFilterId,
  });

  const { data: designationData, isLoading: designationsLoading } = useQuery({
    queryKey: ["leave-designations-filter", departmentFilterId],
    queryFn: async () =>
      (
        await masterApi.listDesignations({
          department_id: departmentFilterId,
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
    enabled: canViewAll && !!departmentFilterId,
  });

  const filterBranches = branchData?.items || branchData?.data || [];
  const filterDepartments = departmentData?.items || [];
  const filterDesignations = designationData?.items || [];

  const handleCompanyFilterChange = (e) => {
    setCompanyFilterId(e.target.value);
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
    setPage(1);
  };

  const handleBranchFilterChange = (e) => {
    setBranchFilterId(e.target.value);
    setDepartmentFilterId("");
    setDesignationFilterId("");
    setPage(1);
  };

  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilterId(e.target.value);
    setDesignationFilterId("");
    setPage(1);
  };

  const handleDesignationFilterChange = (e) => {
    setDesignationFilterId(e.target.value);
    setPage(1);
  };

  const clearOrganizationFilters = () => {
    setCompanyFilterId("");
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
    setPage(1);
  };

  const hasOrganizationFilters =
    Boolean(companyFilterId) ||
    Boolean(branchFilterId) ||
    Boolean(departmentFilterId) ||
    Boolean(designationFilterId);

  /* ==========================================================
     LEAVE TYPES
  ========================================================== */

  const {
    data: leaveTypes,
    isLoading: loadingLeaveTypes,
  } = useQuery({
    queryKey: [
      "leave-types",
      {
        page: 1,
        per_page: 100,
        is_active: true,
      },
    ],

    queryFn: async () =>
      (
        await masterApi.listLeaveTypes({
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
  });

  /* ==========================================================
     PERIOD RANGE
  ========================================================== */

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

  /* ==========================================================
     LEAVE QUERY PARAMS
     company_id / branch_id / department_id / designation_id
     require the backend /leaves/ route to join
     Leave -> Employee -> Department -> Branch/Company, same as
     the fix applied to attendance_bp.py.
  ========================================================== */

  const queryParams = useMemo(() => {
    const result = {
      ...params,

      page,
      per_page: perPage,

      search:
        debouncedSearch ||
        undefined,

      leave_type:
        leaveTypeFilter ||
        undefined,

      status:
        statusFilter ||
        undefined,

      /*
       * Employee users should only receive
       * their own leave records if the backend
       * supports employee_id filtering.
       */

      employee_id:
        !canViewAll &&
        user?.employee?.id
          ? Number(user.employee.id)
          : undefined,

      /*
       * Period filtering.
       *
       * Daily:
       * from_date = selected date
       * to_date   = selected date
       *
       * Monthly:
       * first day -> last day
       *
       * Quarterly:
       * quarter start -> quarter end
       */

      from_date:
        periodRange.from_date,

      to_date:
        periodRange.to_date,

      /*
       * Organization filters - only relevant/sent for admin
       * users, same as AttendanceListPage.
       */

      company_id: canViewAll
        ? companyFilterId || undefined
        : undefined,

      branch_id: canViewAll
        ? branchFilterId || undefined
        : undefined,

      department_id: canViewAll
        ? departmentFilterId || undefined
        : undefined,

      designation_id: canViewAll
        ? designationFilterId || undefined
        : undefined,
    };

    /*
     * Remove empty / undefined values.
     */

    return Object.fromEntries(
      Object.entries(result).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
    );
  }, [
    params,
    page,
    perPage,
    debouncedSearch,
    leaveTypeFilter,
    statusFilter,
    canViewAll,
    user?.employee?.id,
    periodRange.from_date,
    periodRange.to_date,
    companyFilterId,
    branchFilterId,
    departmentFilterId,
    designationFilterId,
  ]);

  /* ==========================================================
     LEAVES
  ========================================================== */

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useLeaves(queryParams);

  /* ==========================================================
     LEAVE RECORDS
  ========================================================== */

  const leaves = useMemo(() => {
    const items =
      data?.items ||
      data?.data?.items ||
      data?.data ||
      [];

    return Array.isArray(items)
      ? items
      : [];
  }, [data]);

  /* ==========================================================
     PERIOD TITLE
  ========================================================== */

  const periodTitle =
    getPeriodTitle(
      periodType,
      selectedDate,
      selectedMonth,
      selectedQuarter,
      selectedYear
    );

  /* ==========================================================
     EXPORT
  ========================================================== */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: leavesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename:
      `leaves-${periodType}`,
    title:
      `Leaves - ${periodTitle}`,
  });

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const stats = useMemo(() => {
    return {
      total:
        data?.total ??
        leaves.length,

      pending:
        leaves.filter(
          (item) =>
            String(
              item.status || ""
            )
              .toLowerCase() ===
            "pending"
        ).length,

      approved:
        leaves.filter(
          (item) =>
            String(
              item.status || ""
            )
              .toLowerCase() ===
            "approved"
        ).length,

      rejected:
        leaves.filter(
          (item) =>
            String(
              item.status || ""
            )
              .toLowerCase() ===
            "rejected"
        ).length,

      totalDays:
        leaves.reduce(
          (total, item) =>
            total +
            Number(
              item.total_days || 0
            ),
          0
        ),
    };
  }, [data, leaves]);

  /* ==========================================================
     FILTER STATE
  ========================================================== */

  const hasFilters =
    Boolean(debouncedSearch) ||
    Boolean(leaveTypeFilter) ||
    Boolean(statusFilter);

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  const clearFilters = () => {
    setSearch("");
    setLeaveTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };

  /* ==========================================================
     FILTER HANDLERS
  ========================================================== */

  const handleLeaveTypeChange = (
    event
  ) => {
    setLeaveTypeFilter(
      event.target.value
    );
    setPage(1);
  };

  const handleStatusChange = (
    event
  ) => {
    setStatusFilter(
      event.target.value
    );
    setPage(1);
  };

  /* ==========================================================
     PERIOD HANDLERS
  ========================================================== */

  const handlePeriodTypeChange = (
    type
  ) => {
    setPeriodType(type);
    setPage(1);
  };

  const handleDateChange = (
    event
  ) => {
    setSelectedDate(
      event.target.value
    );
    setPage(1);
  };

  const handleMonthChange = (
    event
  ) => {
    setSelectedMonth(
      Number(event.target.value)
    );
    setPage(1);
  };

  const handleYearChange = (
    event
  ) => {
    setSelectedYear(
      Number(event.target.value)
    );
    setPage(1);
  };

  const handleQuarterChange = (
    event
  ) => {
    setSelectedQuarter(
      Number(event.target.value)
    );
    setPage(1);
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="space-y-6 pb-8">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
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

                <path d="M8 2v4M16 2v4M3 10h18" />

                <path d="M8 14h2M14 14h2M8 18h2" />
              </svg>
            </div>

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Leave Management
                </h1>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {stats.total} Records
                </span>

                {isFetching && (
                  <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                    Updating
                  </span>
                )}

              </div>

              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Manage employee leave requests, track approval status and maintain leave history.
              </p>

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

            <Link to="/leaves/monthly-record">
              <Button variant="secondary">
                <span className="flex items-center gap-2">

                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                  </svg>

                  Monthly Record
                </span>
              </Button>
            </Link>

            {isAdmin && (
              <Link to="/leaves/approvals">
                <Button variant="secondary">
                  <span className="flex items-center gap-2">

                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m9 11 3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>

                    Approvals
                  </span>
                </Button>
              </Link>
            )}

            <Link to="/leaves/new">
              <Button>
                <span className="flex items-center gap-2">

                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>

                  Request Leave
                </span>
              </Button>
            </Link>

          </div>
        </div>
      </div>

      {/* ======================================================
          PERIOD SELECTOR
      ====================================================== */}

      <LeavePeriodSelector
        periodType={periodType}
        setPeriodType={handlePeriodTypeChange}
        selectedDate={selectedDate}
        setSelectedDate={handleDateChange}
        selectedMonth={selectedMonth}
        setSelectedMonth={handleMonthChange}
        selectedQuarter={selectedQuarter}
        setSelectedQuarter={handleQuarterChange}
        selectedYear={selectedYear}
        setSelectedYear={handleYearChange}
      />

      {/* ======================================================
          ORGANIZATION FILTERS — Company → Branch → Department
          → Designation. Admin/HR only, mirrors
          AttendanceListPage.jsx exactly.
      ====================================================== */}

      {canViewAll && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Organization Filters
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              Filter Leave Requests
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select Company → Branch → Department → Designation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={companyFilterId}
              onChange={handleCompanyFilterChange}
              disabled={companiesLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              <option value="">
                {companiesLoading ? "Loading Companies..." : "All Companies"}
              </option>
              {(companyData?.items || companyData?.data || []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              value={branchFilterId}
              onChange={handleBranchFilterChange}
              disabled={!companyFilterId || branchesLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              <option value="">
                {!companyFilterId
                  ? "Select Company First"
                  : branchesLoading
                  ? "Loading Branches..."
                  : "All Branches"}
              </option>
              {filterBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            <select
              value={departmentFilterId}
              onChange={handleDepartmentFilterChange}
              disabled={!branchFilterId || departmentsLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              <option value="">
                {!branchFilterId
                  ? "Select Branch First"
                  : departmentsLoading
                  ? "Loading Departments..."
                  : "All Departments"}
              </option>
              {filterDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.department_name}
                </option>
              ))}
            </select>

            <select
              value={designationFilterId}
              onChange={handleDesignationFilterChange}
              disabled={!departmentFilterId || designationsLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              <option value="">
                {!departmentFilterId
                  ? "Select Department First"
                  : designationsLoading
                  ? "Loading Designations..."
                  : "All Designations"}
              </option>
              {filterDesignations.map((designation) => (
                <option key={designation.id} value={designation.id}>
                  {designation.designation_name}
                </option>
              ))}
            </select>
          </div>

          {hasOrganizationFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Active filters:</span>
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
                onClick={clearOrganizationFilters}
                className="ml-1 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <StatCard
          title="Total Requests"
          value={stats.total}
          description={periodTitle}
          type="total"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          description="Pending requests"
          type="pending"
        />

        <StatCard
          title="Approved"
          value={stats.approved}
          description="Approved requests"
          type="approved"
        />

        <StatCard
          title="Rejected"
          value={stats.rejected}
          description="Rejected requests"
          type="rejected"
        />

        <StatCard
          title="Leave Days"
          value={stats.totalDays}
          description={periodTitle}
          type="days"
        />

      </div>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.06]">

        {/* ====================================================
            FILTER HEADER
        ==================================================== */}

        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 dark:border-white/10 dark:bg-white/[0.06]/70 sm:px-6">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {periodType ===
                  PERIOD_TYPES.DAILY
                    ? "Day-to-Day Leave Requests"
                    : periodType ===
                      PERIOD_TYPES.MONTHLY
                    ? "Monthly Leave Requests"
                    : "Quarterly Leave Requests"}
                </h2>

                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                  {periodTitle}
                </span>

              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Search, filter and review employee leave requests.
              </p>

            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-center">

              <TableSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search employee, reason..."
                className="sm:w-64"
              />

              <Select
                value={leaveTypeFilter}
                onChange={handleLeaveTypeChange}
                placeholder="All leave types"
                options={(
                  leaveTypes?.items || []
                ).map((lt) => ({
                  value: lt.id,
                  label: lt.name,
                }))}
                disabled={loadingLeaveTypes}
                className="sm:w-52"
              />

              <Select
                value={statusFilter}
                onChange={handleStatusChange}
                placeholder="All statuses"
                options={[
                  {
                    value: "Pending",
                    label: "Pending",
                  },
                  {
                    value: "Approved",
                    label: "Approved",
                  },
                  {
                    value: "Rejected",
                    label: "Rejected",
                  },
                ]}
                className="sm:w-44"
              />

              {hasFilters && (
                <Button
                  variant="secondary"
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  Clear
                </Button>
              )}

            </div>
          </div>

          {/* ==================================================
              ACTIVE FILTERS
          ================================================== */}

          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">

              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Filters:
              </span>

              {debouncedSearch && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                  Search: {debouncedSearch}
                </span>
              )}

              {leaveTypeFilter && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">

                  Leave Type:{" "}

                  {leaveTypes?.items?.find(
                    (item) =>
                      String(item.id) ===
                      String(
                        leaveTypeFilter
                      )
                  )?.name ||
                    leaveTypeFilter}

                </span>
              )}

              {statusFilter && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                  Status: {statusFilter}
                </span>
              )}

            </div>
          )}

        </div>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {isError && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Unable to load leave requests
                </p>

                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/70">
                  Please try again.
                </p>

              </div>

              <Button
                variant="secondary"
                onClick={() => refetch()}
              >
                Retry
              </Button>

            </div>
          </div>
        )}

        {/* ====================================================
            FETCHING INDICATOR
        ==================================================== */}

        <div className="relative">

          {isFetching &&
            !isLoading && (
              <div className="absolute right-5 top-4 z-10">

                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />

                  Updating

                </div>
              </div>
            )}

          <LeaveTable
            data={leaves}
            loading={isLoading}
            isAdmin={isAdmin}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={toggleSort}
          />

        </div>

        {/* ====================================================
            PAGINATION
        ==================================================== */}

        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-white/10 dark:bg-white/[0.06]/50 sm:px-6">

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

/* ============================================================
   LEAVE PERIOD SELECTOR
============================================================ */

function LeavePeriodSelector({
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
    [1, "January"],
    [2, "February"],
    [3, "March"],
    [4, "April"],
    [5, "May"],
    [6, "June"],
    [7, "July"],
    [8, "August"],
    [9, "September"],
    [10, "October"],
    [11, "November"],
    [12, "December"],
  ];

  const quarters = [
    [1, "Q1", "Jan - Mar"],
    [2, "Q2", "Apr - Jun"],
    [3, "Q3", "Jul - Sep"],
    [4, "Q4", "Oct - Dec"],
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">

      {/* PERIOD TABS */}

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

      {/* ======================================================
          DAILY
      ====================================================== */}

      {periodType ===
        PERIOD_TYPES.DAILY && (
        <div className="mt-5">

          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Leave Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={setSelectedDate}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 sm:w-64"
          />

          <p className="mt-2 text-xs text-slate-400">
            Shows leave requests that overlap the selected date.
          </p>

        </div>
      )}

      {/* ======================================================
          MONTHLY
      ====================================================== */}

      {periodType ===
        PERIOD_TYPES.MONTHLY && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Month
            </label>

            <select
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >

              {months.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
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
              onChange={setSelectedYear}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >

              {years.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}

            </select>

          </div>

        </div>
      )}

      {/* ======================================================
          QUARTERLY
      ====================================================== */}

      {periodType ===
        PERIOD_TYPES.QUARTERLY && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quarter
            </label>

            <select
              value={selectedQuarter}
              onChange={setSelectedQuarter}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >

              {quarters.map(
                ([
                  value,
                  label,
                  description,
                ]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label} ({description})
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
              onChange={setSelectedYear}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >

              {years.map((year) => (
                <option
                  key={year}
                  value={year}
                >
                  {year}
                </option>
              ))}

            </select>

          </div>

        </div>
      )}

      {/* ======================================================
          PERIOD SUMMARY
      ====================================================== */}

      <div className="mt-5 flex flex-wrap items-center gap-2">

        <span className="text-xs font-medium text-slate-400">
          Selected period:
        </span>

        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
          {getPeriodTitle(
            periodType,
            selectedDate,
            selectedMonth,
            selectedQuarter,
            selectedYear
          )}
        </span>

      </div>

    </div>
  );
}

/* ============================================================
   PERIOD TAB
============================================================ */

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
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
   STAT ICON
============================================================ */

function StatIcon({ type }) {
  if (type === "total") {
    return (
      <svg
        className="h-5 w-5"
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

        <path d="M8 2v4M16 2v4M3 10h18" />

        <path d="M8 14h2M14 14h2M8 18h2" />
      </svg>
    );
  }

  if (type === "pending") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "approved") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }

  if (type === "rejected") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />

        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 3v18" />
      <path d="M5 7h14M5 17h14" />
      <path d="M7 3v4M17 17v4" />
    </svg>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  description,
  type,
}) {
  const styles = {
    total: {
      wrapper: "stat-tile stat-tile-info",
      icon: "icon-tile icon-tile-blue",
    },

    pending: {
      wrapper: "stat-tile stat-tile-warn",
      icon: "icon-tile icon-tile-primary",
    },

    approved: {
      wrapper: "stat-tile stat-tile-success",
      icon: "icon-tile icon-tile-emerald",
    },

    rejected: {
      wrapper: "stat-tile stat-tile-danger",
      icon: "icon-tile icon-tile-rose",
    },

    days: {
      wrapper: "stat-tile stat-tile-primary",
      icon: "icon-tile icon-tile-primary",
    },
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles[type].wrapper}`}
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>

        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[type].icon}`}
        >
          <StatIcon type={type} />
        </div>

      </div>
    </div>
  );
}