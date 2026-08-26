import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import GenericListPage from "@/components/table/GenericListPage";
import PermissionRequestForm from "./PermissionRequestForm";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

import { employeeLifecycleApi } from "@/api/employee.api";

import {
  usePermissionRequests,
  useCreatePermissionRequest,
  useUpdatePermissionRequest,
  useDeactivatePermissionRequest,
  useReactivatePermissionRequest,
} from "./usePermissionRequests";

import { formatDate } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

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
   RECORD STATUS
============================================================ */

const RECORD_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ALL: "all",
};


/* ============================================================
   STATUS
============================================================ */

const STATUS_OPTIONS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};


/* ============================================================
   DATE HELPERS
============================================================ */

const padNumber = (value) =>
  String(value).padStart(2, "0");

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

const getQuarterRange = (year, quarter) => {
  const startMonth =
    (quarter - 1) * 3 + 1;

  const endMonth = startMonth + 2;

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

const getPeriodTitle = (
  periodType,
  selectedDate,
  selectedMonth,
  selectedQuarter,
  selectedYear
) => {
  if (periodType === PERIOD_TYPES.DAILY) {
    return selectedDate
      ? formatDate(selectedDate)
      : "Selected Date";
  }

  if (periodType === PERIOD_TYPES.MONTHLY) {
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

    return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
  }

  const quarterMonths = {
    1: "January - March",
    2: "April - June",
    3: "July - September",
    4: "October - December",
  };

  return `Q${selectedQuarter} ${selectedYear} · ${quarterMonths[selectedQuarter]}`;
};


/* ============================================================
   STATUS STYLE
============================================================ */

const getStatusStyles = (status) => {
  const normalized = String(
    status || "Pending"
  ).toLowerCase();

  const styles = {
    pending:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",

    approved:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",

    rejected:
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
    ? `${employee.first_name || ""} ${
        employee.last_name || ""
      }`.trim()
    : row?.employee_name || null;

  const employeeCode =
    employee?.employee_code ||
    row?.employee_code ||
    (row?.employee_id
      ? `ID: ${row.employee_id}`
      : "-");

  const initials =
    employeeName
      ?.split(" ")
      .filter(Boolean)
      .map((name) =>
        name.charAt(0)
      )
      .join("")
      .slice(0, 2)
      .toUpperCase() || "E";

  return (
    <div className="flex min-w-[220px] items-center gap-3">
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

const DateCell = ({ value }) => {
  return (
    <div className="min-w-[130px]">
      <p className="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">
        {value ? formatDate(value) : "-"}
      </p>

      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        Permission day
      </p>
    </div>
  );
};


/* ============================================================
   TIME CELL
============================================================ */

const TimeCell = ({ value }) => {
  if (!value) {
    return (
      <span className="text-sm text-slate-400 dark:text-slate-500">
        -
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap items-center rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
      {value}
    </span>
  );
};


/* ============================================================
   REASON CELL
============================================================ */

const ReasonCell = ({ value }) => {
  const reason = value || "-";

  return (
    <div className="w-[240px]">
      <p
        title={reason}
        className="truncate text-sm text-slate-600 dark:text-slate-300"
      >
        {reason}
      </p>
    </div>
  );
};


/* ============================================================
   STATUS CELL
============================================================ */

const StatusCell = ({ value }) => {
  const status = value || "Pending";

  return (
    <span
      className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyles(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {status}
    </span>
  );
};


/* ============================================================
   PAGE
============================================================ */

export default function PermissionRequestListPage() {
  const today = getToday();

  const user = getUser();

  const { showToast } = useToast();

  const queryClient = useQueryClient();

  const isAdmin =
    String(user?.role || "").toLowerCase() ===
    "admin";


  /* ==========================================================
     EDIT MODAL
  ========================================================== */

  const [editFormOpen, setEditFormOpen] =
    useState(false);

  const [editingRow, setEditingRow] =
    useState(null);

  const updateMutation =
    useUpdatePermissionRequest();

  const openEdit = (row) => {
    setEditingRow(row);
    setEditFormOpen(true);
  };

  const closeEdit = () => {
    setEditFormOpen(false);
    setEditingRow(null);
  };

  const handleEditSubmit = async (payload) => {
    if (!editingRow) return;

    try {
      await updateMutation.mutateAsync({
        id: editingRow.id,
        payload,
      });

      showToast(
        "Permission request updated",
        "success"
      );

      closeEdit();

      invalidatePermissionQueries();
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to update permission request",
        "error"
      );
    }
  };


  /* ==========================================================
     RECORD STATUS
  ========================================================== */

  const [recordStatus, setRecordStatus] =
    useState(RECORD_STATUS.ACTIVE);

  const reactivateMutation =
    useReactivatePermissionRequest();

  const deactivateMutation =
    useDeactivatePermissionRequest();

  const [mutatingId, setMutatingId] =
    useState(null);


  const invalidatePermissionQueries = () => {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] ===
        "employee-permissions",
    });
  };


  /* ==========================================================
     DEACTIVATE
  ========================================================== */

  const handleDeactivate = async (row) => {
    try {
      setMutatingId(row.id);

      await deactivateMutation.mutateAsync(
        row.id
      );

      invalidatePermissionQueries();

      showToast(
        "Permission request deactivated",
        "success"
      );
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to deactivate permission request",
        "error"
      );
    } finally {
      setMutatingId(null);
    }
  };


  /* ==========================================================
     REACTIVATE
  ========================================================== */

  const handleReactivate = async (row) => {
    try {
      setMutatingId(row.id);

      await reactivateMutation.mutateAsync(
        row.id
      );

      invalidatePermissionQueries();

      showToast(
        "Permission request reactivated",
        "success"
      );
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to reactivate permission request",
        "error"
      );
    } finally {
      setMutatingId(null);
    }
  };


  /* ==========================================================
     COUNTS
  ========================================================== */

  const {
    data: activeCountData,
  } = usePermissionRequests({
    is_active: true,
    per_page: 1,
  });

  const {
    data: inactiveCountData,
  } = usePermissionRequests({
    is_active: false,
    per_page: 1,
  });

  const activeCount =
    activeCountData?.total ?? 0;

  const inactiveCount =
    inactiveCountData?.total ?? 0;

  const totalCount =
    activeCount + inactiveCount;


  /* ==========================================================
     PERIOD STATE
  ========================================================== */

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


  const periodTitle = getPeriodTitle(
    periodType,
    selectedDate,
    selectedMonth,
    selectedQuarter,
    selectedYear
  );


  /* ==========================================================
     ORGANIZATION FILTERS
  ========================================================== */

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


  const {
    data: companyData,
    isLoading: companiesLoading,
  } = useCompanies({
    page: 1,
    per_page: 100,
    is_active: true,
  });


  const {
    data: branchData,
    isLoading: branchesLoading,
  } = useCompanyBranches(
    companyFilterId,
    {
      page: 1,
      per_page: 100,
      is_active: true,
    }
  );


  const {
    data: departmentData,
    isLoading: departmentsLoading,
  } = useQuery({
    queryKey: [
      "permission-departments-filter",
      branchFilterId,
    ],

    queryFn: async () => {
      const response =
        await masterApi.listDepartments({
          branch_id: branchFilterId,
          page: 1,
          per_page: 100,
          is_active: true,
        });

      return response.data.data;
    },

    enabled:
      isAdmin &&
      !!branchFilterId,
  });


  const {
    data: designationData,
    isLoading: designationsLoading,
  } = useQuery({
    queryKey: [
      "permission-designations-filter",
      departmentFilterId,
    ],

    queryFn: async () => {
      const response =
        await masterApi.listDesignations({
          department_id:
            departmentFilterId,
          page: 1,
          per_page: 100,
          is_active: true,
        });

      return response.data.data;
    },

    enabled:
      isAdmin &&
      !!departmentFilterId,
  });


  const companies =
    companyData?.items ||
    companyData?.data ||
    [];

  const branches =
    branchData?.items ||
    branchData?.data ||
    [];

  const departments =
    departmentData?.items ||
    departmentData?.data ||
    [];

  const designations =
    designationData?.items ||
    designationData?.data ||
    [];


  /* ==========================================================
     ORGANIZATION HANDLERS
  ========================================================== */

  const handleCompanyChange = (event) => {
    setCompanyFilterId(
      event.target.value
    );

    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };


  const handleBranchChange = (event) => {
    setBranchFilterId(
      event.target.value
    );

    setDepartmentFilterId("");
    setDesignationFilterId("");
  };


  const handleDepartmentChange = (event) => {
    setDepartmentFilterId(
      event.target.value
    );

    setDesignationFilterId("");
  };


  const handleDesignationChange = (event) => {
    setDesignationFilterId(
      event.target.value
    );
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
      from_date:
        periodRange.from_date,

      to_date:
        periodRange.to_date,
    };

    if (
      recordStatus !==
      RECORD_STATUS.ALL
    ) {
      params.is_active =
        recordStatus ===
        RECORD_STATUS.ACTIVE;
    }

    if (isAdmin) {
      if (companyFilterId) {
        params.company_id =
          companyFilterId;
      }

      if (branchFilterId) {
        params.branch_id =
          branchFilterId;
      }

      if (departmentFilterId) {
        params.department_id =
          departmentFilterId;
      }

      if (designationFilterId) {
        params.designation_id =
          designationFilterId;
      }
    } else if (user?.employee?.id) {
      params.employee_id =
        Number(user.employee.id);
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
     TABLE COLUMNS
  ========================================================== */

  const columns = useMemo(
    () => [
      {
        key: "employee_id",
        label: "Employee",
        sortable: true,
        render: (row) => (
          <EmployeeCell row={row} />
        ),
      },

      {
        key: "permission_date",
        label: "Permission Date",
        sortable: true,
        render: (row) => (
          <DateCell
            value={row.permission_date}
          />
        ),
      },

      {
        key: "from_time",
        label: "From",
        sortable: true,
        render: (row) => (
          <TimeCell
            value={row.from_time}
          />
        ),
      },

      {
        key: "to_time",
        label: "To",
        sortable: true,
        render: (row) => (
          <TimeCell
            value={row.to_time}
          />
        ),
      },

      {
        key: "reason",
        label: "Reason",
        sortable: false,
        render: (row) => (
          <ReasonCell
            value={row.reason}
          />
        ),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (row) => (
          <StatusCell
            value={row.status}
          />
        ),
      },

      {
        key: "record_status",
        label: "Record",
        sortable: false,

        render: (row) => {
          const isActive =
            row.is_active !== false;

          const isMutating =
            mutatingId === row.id;

          return (
            <div className="flex flex-wrap items-center gap-2">

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                />

                {isActive
                  ? "Active"
                  : "Inactive"}
              </span>

              <button
                type="button"
                onClick={() =>
                  openEdit(row)
                }
                className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
              >
                Edit
              </button>

              {isActive ? (
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() =>
                    handleDeactivate(row)
                  }
                  className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                >
                  {isMutating
                    ? "Deactivating..."
                    : "Deactivate"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isMutating}
                  onClick={() =>
                    handleReactivate(row)
                  }
                  className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-40 dark:text-emerald-400"
                >
                  {isMutating
                    ? "Reactivating..."
                    : "Reactivate"}
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [mutatingId]
  );


  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="min-h-full w-full space-y-6">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M7 3h10" />
                <path d="M7 3v4h10V3" />

                <rect
                  x="4"
                  y="7"
                  width="16"
                  height="14"
                  rx="2"
                />

                <path d="M8 11h8" />
                <path d="M8 15h5" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Short Leave / Gate Pass
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage employee permission requests,
                short leaves and gate passes
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* ======================================================
          COUNT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <CountCard
          label="Total Permission Records"
          value={totalCount}
          caption="Active + inactive"
          tone="neutral"
        />

        <CountCard
          label="Active Permission Records"
          value={activeCount}
          caption="Currently active"
          tone="active"
        />

        <CountCard
          label="Inactive Permission Records"
          value={inactiveCount}
          caption="Deactivated records"
          tone="inactive"
        />

      </div>


      {/* ======================================================
          PERIOD SELECTOR
      ====================================================== */}

      <PermissionPeriodSelector
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
          RECORD STATUS
      ====================================================== */}

      <div className="flex justify-end">

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">

          <StatusTab
            active={
              recordStatus ===
              RECORD_STATUS.ACTIVE
            }
            onClick={() =>
              setRecordStatus(
                RECORD_STATUS.ACTIVE
              )
            }
          >
            Active
          </StatusTab>

          <StatusTab
            active={
              recordStatus ===
              RECORD_STATUS.INACTIVE
            }
            onClick={() =>
              setRecordStatus(
                RECORD_STATUS.INACTIVE
              )
            }
          >
            Inactive
          </StatusTab>

          <StatusTab
            active={
              recordStatus ===
              RECORD_STATUS.ALL
            }
            onClick={() =>
              setRecordStatus(
                RECORD_STATUS.ALL
              )
            }
          >
            All
          </StatusTab>

        </div>

      </div>


      {/* ======================================================
          ORGANIZATION FILTERS
      ====================================================== */}

      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">

          <div className="mb-4">

            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Organization Filters
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              Filter Permission Requests
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Select Company → Branch → Department → Designation.
            </p>

          </div>


          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

            {/* COMPANY */}

            <select
              value={companyFilterId}
              onChange={handleCompanyChange}
              disabled={companiesLoading}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {companiesLoading
                  ? "Loading Companies..."
                  : "All Companies"}
              </option>

              {companies.map(
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
              onChange={handleBranchChange}
              disabled={
                !companyFilterId ||
                branchesLoading
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {!companyFilterId
                  ? "Select Company First"
                  : branchesLoading
                  ? "Loading Branches..."
                  : "All Branches"}
              </option>

              {branches.map(
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
              onChange={handleDepartmentChange}
              disabled={
                !branchFilterId ||
                departmentsLoading
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {!branchFilterId
                  ? "Select Branch First"
                  : departmentsLoading
                  ? "Loading Departments..."
                  : "All Departments"}
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {
                      department.department_name
                    }
                  </option>
                )
              )}
            </select>


            {/* DESIGNATION */}

            <select
              value={designationFilterId}
              onChange={
                handleDesignationChange
              }
              disabled={
                !departmentFilterId ||
                designationsLoading
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="">
                {!departmentFilterId
                  ? "Select Department First"
                  : designationsLoading
                  ? "Loading Designations..."
                  : "All Designations"}
              </option>

              {designations.map(
                (designation) => (
                  <option
                    key={designation.id}
                    value={designation.id}
                  >
                    {
                      designation.designation_name
                    }
                  </option>
                )
              )}
            </select>

          </div>


          {/* ACTIVE FILTERS */}

          {hasOrganizationFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">

              <span className="text-xs font-medium text-slate-400">
                Active filters:
              </span>

              {companyFilterId && (
                <FilterBadge>
                  Company
                </FilterBadge>
              )}

              {branchFilterId && (
                <FilterBadge>
                  Branch
                </FilterBadge>
              )}

              {departmentFilterId && (
                <FilterBadge>
                  Department
                </FilterBadge>
              )}

              {designationFilterId && (
                <FilterBadge>
                  Designation
                </FilterBadge>
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
      )}


      {/* ======================================================
          MAIN LIST
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

        <GenericListPage
          module="Employee Permissions"
          title="Permission Requests"
          subtitle={`Track employee permission requests and approval status · ${periodTitle}`}
          columns={columns}
          api={employeeLifecycleApi.permissions}
          useList={usePermissionRequests}
          useCreate={useCreatePermissionRequest}
          filename="employee-permissions"
          searchPlaceholder="Search employee, reason or status..."
          FormComponent={PermissionRequestForm}
          formTitle="Permission Request"
          addLabel="Add Request"
          actionsMode="none"
          entityLabel="Permission request"
          queryParams={queryParams}
        />

      </div>


      {/* ======================================================
          EDIT MODAL
      ====================================================== */}

      <Modal
        open={editFormOpen}
        onClose={closeEdit}
        title="Edit Permission Request"
        footer={
          <div className="flex items-center justify-end gap-2">

            <Button
              variant="secondary"
              onClick={closeEdit}
              disabled={
                updateMutation.isPending
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="permission-edit-form"
              loading={
                updateMutation.isPending
              }
              disabled={
                updateMutation.isPending
              }
            >
              {updateMutation.isPending
                ? "Saving..."
                : "Save"}
            </Button>

          </div>
        }
      >

        <PermissionRequestForm
          formId="permission-edit-form"
          initialData={editingRow || {}}
          onSubmit={handleEditSubmit}
          loading={
            updateMutation.isPending
          }
        />

      </Modal>

    </div>
  );
}


/* ============================================================
   COUNT CARD
============================================================ */

function CountCard({
  label,
  value,
  caption,
  tone,
}) {
  const tones = {
    neutral: {
      wrapper:
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
      dot: "bg-slate-400",
      value:
        "text-slate-900 dark:text-white",
    },

    active: {
      wrapper:
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
      dot: "bg-emerald-500",
      value:
        "text-emerald-600 dark:text-emerald-400",
    },

    inactive: {
      wrapper:
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
      dot: "bg-red-500",
      value:
        "text-red-600 dark:text-red-400",
    },
  };

  const t =
    tones[tone] ||
    tones.neutral;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${t.wrapper}`}
    >
      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 text-3xl font-bold tracking-tight ${t.value}`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {caption}
          </p>

        </div>

        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${t.dot}`}
        />

      </div>
    </div>
  );
}


/* ============================================================
   STATUS TAB
============================================================ */

function StatusTab({
  active,
  onClick,
  children,
}) {
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
   FILTER BADGE
============================================================ */

function FilterBadge({ children }) {
  return (
    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
      {children}
    </span>
  );
}


/* ============================================================
   PERIOD SELECTOR
============================================================ */

function PermissionPeriodSelector({
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">

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


      {/* DAILY */}

      {periodType ===
        PERIOD_TYPES.DAILY && (
        <div className="mt-5">

          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Permission Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value
              )
            }
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:w-64"
          />

          <p className="mt-2 text-xs text-slate-400">
            Shows permission requests for the selected date.
          </p>

        </div>
      )}


      {/* MONTHLY */}

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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
              onChange={(event) =>
                setSelectedYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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


      {/* QUARTERLY */}

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
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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
              onChange={(event) =>
                setSelectedYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
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


      {/* SELECTED PERIOD */}

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