import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import GenericListPage from "@/components/table/GenericListPage";
import TrainingProgramForm from "./TrainingProgramForm";

import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useTrainingPrograms,
  useCreateTrainingProgram,
  useUpdateTrainingProgram,
  useDeactivateTrainingProgram,
  useReactivateTrainingProgram,
} from "./useTrainingPrograms";

import { formatDate } from "@/utils/formatDate";

import { getUser } from "@/utils/tokenHelpers";

import { useQuery } from "@tanstack/react-query";

import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";

import { masterApi } from "@/api/master.api";

import { useToast } from "@/components/feedback/Toast";


/* ============================================================
   PERIOD TYPES
============================================================ */

const PERIOD_TYPES = {
  DAILY: "daily",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
};


/* ============================================================
   RECORD STATUS TABS — Active / Inactive / All
============================================================ */

const RECORD_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ALL: "all",
};


/* ============================================================
   DATE HELPERS
============================================================ */

const padNumber = (value) => String(value).padStart(2, "0");

const formatISODate = (year, month, day) =>
  `${year}-${padNumber(month)}-${padNumber(day)}`;

const getToday = () => {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
};

const getMonthRange = (year, month) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  return {
    from_date: formatISODate(year, month, firstDay.getDate()),
    to_date: formatISODate(year, month, lastDay.getDate()),
  };
};

const getQuarterRange = (year, quarter) => {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth, 0);
  return {
    from_date: formatISODate(year, startMonth, 1),
    to_date: formatISODate(year, endMonth, lastDay.getDate()),
  };
};

function getPeriodTitle(periodType, selectedDate, selectedMonth, selectedQuarter, selectedYear) {
  if (periodType === PERIOD_TYPES.DAILY) {
    return selectedDate ? formatDate(selectedDate) : "Selected Date";
  }

  if (periodType === PERIOD_TYPES.MONTHLY) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
  }

  const quarterMonths = {
    1: "January - March",
    2: "April - June",
    3: "July - September",
    4: "October - December",
  };

  return `Q${selectedQuarter} ${selectedYear} · ${quarterMonths[selectedQuarter]}`;
}


/* ============================================================
   STATUS HELPER
============================================================ */

const getStatusStyles = (status) => {
  const normalizedStatus = String(status || "Scheduled").toLowerCase();

  const styles = {
    scheduled:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300",
    ongoing:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
    completed:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  };

  return (
    styles[normalizedStatus] ||
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300"
  );
};


/* ============================================================
   PERFORMANCE HELPER
============================================================ */

const getPerformanceStyles = (performance) => {
  const normalized = String(performance || "Not Rated").toLowerCase();

  const styles = {
    excellent:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    good:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300",
    average:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
    poor:
      "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300",
  };

  return (
    styles[normalized] ||
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300"
  );
};


/* ============================================================
   EMPLOYEE CELL
============================================================ */

const EmployeeCell = ({ row }) => {
  const employee = row?.employee;

  const employeeName = employee
    ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
    : row?.employee_name || null;

  const employeeCode =
    employee?.employee_code ||
    row?.employee_code ||
    (row?.employee_id ? `ID: ${row.employee_id}` : "-");

  const initials =
    employeeName
      ?.split(" ")
      .filter(Boolean)
      .map((name) => name.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "E";

  return (
    <div className="flex min-w-[210px] items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
        {initials}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {employeeName || "-"}
        </p>

        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {employeeCode}
        </p>
      </div>
    </div>
  );
};


/* ============================================================
   DATE CELL
============================================================ */

const DateCell = ({ value, label }) => (
  <div className="min-w-[125px]">
    <p className="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">
      {value ? formatDate(value) : "-"}
    </p>

    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{label}</p>
  </div>
);


/* ============================================================
   PAGE
============================================================ */

export default function TrainingProgramListPage() {
  const today = getToday();

  const user = getUser();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";


  /* ==========================================================
     RECORD STATUS TAB — Active / Inactive / All.
  ========================================================== */

  const [recordStatus, setRecordStatus] = useState(RECORD_STATUS.ACTIVE);

  const reactivateMutation = useReactivateTrainingProgram();
  const deactivateMutation = useDeactivateTrainingProgram();
  const [mutatingId, setMutatingId] = useState(null);

  // Broad, defensive invalidation - matches ANY cached query whose
  // key starts with "training", regardless of the exact params
  // object shape (period range, org filters, is_active, etc).
  const invalidateAllTrainingQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "training",
    });
  };

  const handleDeactivate = async (row) => {
    try {
      setMutatingId(row.id);
      await deactivateMutation.mutateAsync(row.id);
      invalidateAllTrainingQueries();
      showToast("Training record deactivated", "success");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to deactivate training record",
        "error"
      );
    } finally {
      setMutatingId(null);
    }
  };

  const handleReactivate = async (row) => {
    try {
      setMutatingId(row.id);
      await reactivateMutation.mutateAsync(row.id);
      invalidateAllTrainingQueries();
      showToast("Training record reactivated", "success");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to reactivate training record",
        "error"
      );
    } finally {
      setMutatingId(null);
    }
  };


  /* ==========================================================
     COUNTS — dedicated lightweight fetches purely for live
     Total/Active/Inactive numbers in the stat cards.
  ========================================================== */

  const { data: activeCountData } = useTrainingPrograms({ is_active: true, per_page: 1 });
  const { data: inactiveCountData } = useTrainingPrograms({ is_active: false, per_page: 1 });

  const activeCount = activeCountData?.total ?? 0;
  const inactiveCount = inactiveCountData?.total ?? 0;
  const totalCount = activeCount + inactiveCount;


  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns = useMemo(
    () => [
      {
        key: "employee_id",
        label: "Employee",
        sortable: true,
        render: (row) => <EmployeeCell row={row} />,
      },
      {
        key: "program_name",
        label: "Training Program",
        sortable: true,
        render: (row) => (
          <div className="min-w-[200px]">
            <p className="font-semibold text-slate-900 dark:text-white">
              {row.program_name || "-"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Employee Development
            </p>
          </div>
        ),
      },
      {
        key: "start_date",
        label: "Start Date",
        sortable: true,
        render: (row) => <DateCell value={row.start_date} label="Training start" />,
      },
      {
        key: "end_date",
        label: "End Date",
        sortable: true,
        render: (row) => <DateCell value={row.end_date} label="Training end" />,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (row) => {
          const status = row.status || "Scheduled";
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyles(status)}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {status}
            </span>
          );
        },
      },
      {
        key: "performance",
        label: "Performance",
        sortable: true,
        render: (row) => {
          const performance = row.performance || "Not Rated";
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getPerformanceStyles(performance)}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {performance}
            </span>
          );
        },
      },
      {
        key: "record_status",
        label: "Record",
        sortable: false,
        render: (row) => {
          const isActive = row.is_active !== false;
          const isMutating = mutatingId === row.id;

          if (isActive) {
            return (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>

                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() => handleDeactivate(row)}
                  className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                >
                  {isMutating ? "Deactivating..." : "Deactivate"}
                </button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Inactive
              </span>

              <button
                type="button"
                disabled={isMutating}
                onClick={() => handleReactivate(row)}
                className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-40 dark:text-emerald-400"
              >
                {isMutating ? "Reactivating..." : "Reactivate"}
              </button>
            </div>
          );
        },
      },
    ],
    [mutatingId]
  );


  /* ==========================================================
     PERIOD STATE — Daily / Monthly / Quarterly
  ========================================================== */

  const [periodType, setPeriodType] = useState(PERIOD_TYPES.DAILY);

  const [selectedDate, setSelectedDate] = useState(
    formatISODate(today.year, today.month, today.day)
  );

  const [selectedMonth, setSelectedMonth] = useState(today.month);
  const [selectedYear, setSelectedYear] = useState(today.year);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil(today.month / 3));

  const periodRange = useMemo(() => {
    if (periodType === PERIOD_TYPES.DAILY) {
      return { from_date: selectedDate, to_date: selectedDate };
    }
    if (periodType === PERIOD_TYPES.MONTHLY) {
      return getMonthRange(selectedYear, selectedMonth);
    }
    return getQuarterRange(selectedYear, selectedQuarter);
  }, [periodType, selectedDate, selectedMonth, selectedQuarter, selectedYear]);

  const periodTitle = getPeriodTitle(
    periodType,
    selectedDate,
    selectedMonth,
    selectedQuarter,
    selectedYear
  );

  const handlePeriodTypeChange = (type) => setPeriodType(type);
  const handleDateChange = (event) => setSelectedDate(event.target.value);
  const handleMonthChange = (event) => setSelectedMonth(Number(event.target.value));
  const handleYearChange = (event) => setSelectedYear(Number(event.target.value));
  const handleQuarterChange = (event) => setSelectedQuarter(Number(event.target.value));


  /* ==========================================================
     ORGANIZATION FILTER STATE
  ========================================================== */

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
    queryKey: ["training-departments-filter", branchFilterId],
    queryFn: async () => {
      const response = await masterApi.listDepartments({
        branch_id: branchFilterId,
        page: 1,
        per_page: 100,
        is_active: true,
      });
      return response.data.data;
    },
    enabled: isAdmin && !!branchFilterId,
  });

  const { data: designationData, isLoading: designationsLoading } = useQuery({
    queryKey: ["training-designations-filter", departmentFilterId],
    queryFn: async () => {
      const response = await masterApi.listDesignations({
        department_id: departmentFilterId,
        page: 1,
        per_page: 100,
        is_active: true,
      });
      return response.data.data;
    },
    enabled: isAdmin && !!departmentFilterId,
  });

  const companies = companyData?.items || companyData?.data || [];
  const branches = branchData?.items || branchData?.data || [];
  const departments = departmentData?.items || departmentData?.data || [];
  const designations = designationData?.items || designationData?.data || [];

  const handleCompanyChange = (event) => {
    setCompanyFilterId(event.target.value);
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };

  const handleBranchChange = (event) => {
    setBranchFilterId(event.target.value);
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };

  const handleDepartmentChange = (event) => {
    setDepartmentFilterId(event.target.value);
    setDesignationFilterId("");
  };

  const handleDesignationChange = (event) => {
    setDesignationFilterId(event.target.value);
  };

  const clearOrganizationFilters = () => {
    setCompanyFilterId("");
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };

  const hasOrganizationFilters =
    Boolean(companyFilterId) ||
    Boolean(branchFilterId) ||
    Boolean(departmentFilterId) ||
    Boolean(designationFilterId);


  /* ==========================================================
     QUERY PARAMS
  ========================================================== */

  const queryParams = useMemo(() => {
    const params = {
      from_date: periodRange.from_date,
      to_date: periodRange.to_date,
    };

    if (recordStatus !== RECORD_STATUS.ALL) {
      params.is_active = recordStatus === RECORD_STATUS.ACTIVE;
    }

    if (isAdmin) {
      if (companyFilterId) params.company_id = companyFilterId;
      if (branchFilterId) params.branch_id = branchFilterId;
      if (departmentFilterId) params.department_id = departmentFilterId;
      if (designationFilterId) params.designation_id = designationFilterId;
    } else if (user?.employee?.id) {
      params.employee_id = Number(user.employee.id);
    }

    return params;
  }, [
    isAdmin,
    user?.employee?.id,
    companyFilterId,
    branchFilterId,
    departmentFilterId,
    designationFilterId,
    periodRange.from_date,
    periodRange.to_date,
    recordStatus,
  ]);


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-full w-full space-y-6">

      {/* PAGE HEADER */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                <path d="M8 6h8" />
                <path d="M8 10h8" />
                <path d="M8 14h5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Training Programs
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage employee training and development programs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE COUNT CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CountCard label="Total Training Records" value={totalCount} caption="Current page" tone="neutral" />
        <CountCard label="Active Training Records" value={activeCount} caption="Currently active" tone="active" />
        <CountCard label="Inactive Training Records" value={inactiveCount} caption="Deactivated records" tone="inactive" />
      </div>

      {/* PERIOD SELECTOR */}

      <TrainingPeriodSelector
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

      {/* TRAINING METRICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TrainingMetric label="Scheduled" description="Upcoming training programs" icon="scheduled" />
        <TrainingMetric label="Ongoing" description="Currently active training" icon="ongoing" />
        <TrainingMetric label="Completed" description="Successfully completed" icon="completed" />
      </div>

      {/* RECORD STATUS TOGGLE */}

      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <StatusTab active={recordStatus === RECORD_STATUS.ACTIVE} onClick={() => setRecordStatus(RECORD_STATUS.ACTIVE)}>
            Active
          </StatusTab>
          <StatusTab active={recordStatus === RECORD_STATUS.INACTIVE} onClick={() => setRecordStatus(RECORD_STATUS.INACTIVE)}>
            Inactive
          </StatusTab>
          <StatusTab active={recordStatus === RECORD_STATUS.ALL} onClick={() => setRecordStatus(RECORD_STATUS.ALL)}>
            All
          </StatusTab>
        </div>
      </div>

      {/* ORGANIZATION FILTERS */}

      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Organization Filters
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              Filter Training Programs
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select Company → Branch → Department → Designation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <select
              value={companyFilterId}
              onChange={handleCompanyChange}
              disabled={companiesLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">{companiesLoading ? "Loading Companies..." : "All Companies"}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>

            <select
              value={branchFilterId}
              onChange={handleBranchChange}
              disabled={!companyFilterId || branchesLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {!companyFilterId ? "Select Company First" : branchesLoading ? "Loading Branches..." : "All Branches"}
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>

            <select
              value={departmentFilterId}
              onChange={handleDepartmentChange}
              disabled={!branchFilterId || departmentsLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {!branchFilterId ? "Select Branch First" : departmentsLoading ? "Loading Departments..." : "All Departments"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.department_name}</option>
              ))}
            </select>

            <select
              value={designationFilterId}
              onChange={handleDesignationChange}
              disabled={!departmentFilterId || designationsLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {!departmentFilterId ? "Select Department First" : designationsLoading ? "Loading Designations..." : "All Designations"}
              </option>
              {designations.map((designation) => (
                <option key={designation.id} value={designation.id}>{designation.designation_name}</option>
              ))}
            </select>
          </div>

          {hasOrganizationFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Active filters:</span>
              {companyFilterId && (
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">Company</span>
              )}
              {branchFilterId && (
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">Branch</span>
              )}
              {departmentFilterId && (
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">Department</span>
              )}
              {designationFilterId && (
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">Designation</span>
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

      {/* MAIN LIST — actionsMode="none": Deactivate/Reactivate are
          handled entirely in the "Record" column above; Edit is not
          currently exposed here. If Edit should remain available,
          switch actionsMode to "master" and remove the Deactivate
          button rendered in the Record column to avoid duplication. */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <GenericListPage
          module="Training"
          title="Training Programs"
          subtitle={`Track employee training schedules, progress and completion · ${periodTitle}`}
          columns={columns}
          api={employeeLifecycleApi.training}
          useList={useTrainingPrograms}
          useCreate={useCreateTrainingProgram}
          useUpdate={useUpdateTrainingProgram}
          useRemove={useDeactivateTrainingProgram}
          filename="training"
          searchPlaceholder="Search employee, training program or status..."
          FormComponent={TrainingProgramForm}
          formTitle="Training Program"
          addLabel="Add Training"
          actionsMode="none"
          entityLabel="Training record"
          queryParams={queryParams}
        />
      </div>

    </div>
  );
}


/* ============================================================
   COUNT CARD
============================================================ */

function CountCard({ label, value, caption, tone }) {
  const tones = {
    neutral: {
      wrapper: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
      dot: "bg-slate-400",
      value: "text-slate-900 dark:text-white",
    },
    active: {
      wrapper: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
      dot: "bg-emerald-500",
      value: "text-emerald-600 dark:text-emerald-400",
    },
    inactive: {
      wrapper: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
      dot: "bg-red-500",
      value: "text-red-600 dark:text-red-400",
    },
  };

  const t = tones[tone] || tones.neutral;

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${t.wrapper}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${t.value}`}>{value}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{caption}</p>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`} />
      </div>
    </div>
  );
}


/* ============================================================
   STATUS TAB
============================================================ */

function StatusTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}


/* ============================================================
   TRAINING PERIOD SELECTOR
============================================================ */

function TrainingPeriodSelector({
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
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);

  const months = [
    [1, "January"], [2, "February"], [3, "March"], [4, "April"],
    [5, "May"], [6, "June"], [7, "July"], [8, "August"],
    [9, "September"], [10, "October"], [11, "November"], [12, "December"],
  ];

  const quarters = [
    [1, "Q1", "Jan - Mar"],
    [2, "Q2", "Apr - Jun"],
    [3, "Q3", "Jul - Sep"],
    [4, "Q4", "Oct - Dec"],
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap gap-2">
        <PeriodTab active={periodType === PERIOD_TYPES.DAILY} onClick={() => setPeriodType(PERIOD_TYPES.DAILY)}>
          Day-to-Day
        </PeriodTab>
        <PeriodTab active={periodType === PERIOD_TYPES.MONTHLY} onClick={() => setPeriodType(PERIOD_TYPES.MONTHLY)}>
          Monthly
        </PeriodTab>
        <PeriodTab active={periodType === PERIOD_TYPES.QUARTERLY} onClick={() => setPeriodType(PERIOD_TYPES.QUARTERLY)}>
          Quarterly
        </PeriodTab>
      </div>

      {periodType === PERIOD_TYPES.DAILY && (
        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Training Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={setSelectedDate}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-64"
          />
          <p className="mt-2 text-xs text-slate-400">
            Shows training programs active on the selected date.
          </p>
        </div>
      )}

      {periodType === PERIOD_TYPES.MONTHLY && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Month</label>
            <select
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {months.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Year</label>
            <select
              value={selectedYear}
              onChange={setSelectedYear}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {periodType === PERIOD_TYPES.QUARTERLY && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Quarter</label>
            <select
              value={selectedQuarter}
              onChange={setSelectedQuarter}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {quarters.map(([value, label, description]) => (
                <option key={value} value={value}>{label} ({description})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Year</label>
            <select
              value={selectedYear}
              onChange={setSelectedYear}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-400">Selected period:</span>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
          {getPeriodTitle(periodType, selectedDate, selectedMonth, selectedQuarter, selectedYear)}
        </span>
      </div>
    </div>
  );
}


/* ============================================================
   PERIOD TAB
============================================================ */

function PeriodTab({ active, onClick, children }) {
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
   TRAINING METRIC
============================================================ */

function TrainingMetric({ label, description, icon }) {
  const styles = {
    scheduled: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    ongoing: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    completed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };

  const icons = {
    scheduled: "◷",
    ongoing: "●",
    completed: "✓",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">{description}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${styles[icon]}`}>
          {icons[icon]}
        </div>
      </div>
    </div>
  );
}