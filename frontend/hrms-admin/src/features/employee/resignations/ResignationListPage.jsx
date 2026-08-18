import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

import { employeeLifecycleApi } from "@/api/employee.api";
import { employeesApi } from "@/api/employees.api";
import { useCompanies } from "@/features/master/company/useCompanies";
import {
  useDepartmentOptions,
  useDesignationOptions,
} from "@/hooks/useLookupOptions";

import ResignationForm from "./ResignationForm";

import {
  useResignations,
  useCreateResignation,
  useUpdateResignation,
  useDeactivateResignation,
} from "./useResignations";

import { formatDate } from "@/utils/formatDate";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDuration(startDate, endDate) {
  if (!startDate) return "—";

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }

  if (end < start) return "—";

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;

    const daysInPrevMonth = new Date(
      end.getFullYear(),
      end.getMonth(),
      0
    ).getDate();

    days += daysInPrevMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];

  if (years > 0) {
    parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  }

  if (months > 0) {
    parts.push(`${months} mo${months > 1 ? "s" : ""}`);
  }

  if (days > 0) {
    parts.push(`${days} day${days > 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(" ") : "0 days";
}

function getEmployeeName(employee, employeeId) {
  if (!employee) {
    return `Employee #${employeeId}`;
  }

  const name = `${employee.first_name || ""} ${
    employee.last_name || ""
  }`.trim();

  return name || employee.employee_code || `Employee #${employeeId}`;
}

function getDepartmentName(department) {
  return (
    department?.department_name ||
    department?.name ||
    "—"
  );
}

function getDesignationName(designation) {
  return (
    designation?.designation_name ||
    designation?.name ||
    "—"
  );
}

/* -------------------------------------------------------------------------- */
/* Organization Hover Card                                                   */
/* -------------------------------------------------------------------------- */

function OrganizationHoverCard({ resignation, employee }) {
  const previous = resignation?.previous_organization;

  const company =
    previous?.company?.name ||
    employee?.department?.company?.name;

  const branch =
    previous?.branch?.name ||
    employee?.department?.branch?.name;

  const department =
    previous?.department?.department_name ||
    previous?.department?.name ||
    employee?.department?.department_name ||
    employee?.department?.name;

  const designation =
    previous?.designation?.designation_name ||
    previous?.designation?.name ||
    employee?.designation?.designation_name ||
    employee?.designation?.name;

  return (
    <div className="group relative inline-block max-w-full">
      <div className="flex max-w-full flex-wrap items-center gap-1">
        {company && (
          <span className="max-w-[120px] truncate rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
            {company}
          </span>
        )}

        {branch && (
          <>
            <span className="text-slate-300 dark:text-slate-600">›</span>

            <span className="max-w-[120px] truncate rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
              {branch}
            </span>
          </>
        )}

        {department && (
          <>
            <span className="text-slate-300 dark:text-slate-600">›</span>

            <span className="max-w-[120px] truncate rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
              {department}
            </span>
          </>
        )}

        {designation && (
          <>
            <span className="text-slate-300 dark:text-slate-600">›</span>

            <span className="max-w-[120px] truncate rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
              {designation}
            </span>
          </>
        )}

        {!company && !branch && !department && !designation && (
          <span className="text-xs text-slate-400">
            No organization assigned
          </span>
        )}
      </div>

      {/* Hover Details */}
      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-[300px] rounded-xl border border-slate-200 bg-white p-4 opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:block group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">
            Previous Organization
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            Organization at the time of resignation
          </p>
        </div>

        <div className="space-y-2.5">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
              Company
            </p>

            <p
              className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              title={company || ""}
            >
              {company || "—"}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
              Branch
            </p>

            <p
              className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              title={branch || ""}
            >
              {branch || "—"}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
              Department
            </p>

            <p
              className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              title={department || ""}
            >
              {department || "—"}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
              Designation
            </p>

            <p
              className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              title={designation || ""}
            >
              {designation || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

const STATUS_STYLES = {
  Approved:
    "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",

  Rejected:
    "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",

  Pending:
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
};

/* -------------------------------------------------------------------------- */
/* Stats                                                                      */
/* -------------------------------------------------------------------------- */

function StatCard({ icon, value, label, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",

    green:
      "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",

    red:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

const TrendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 8l4 4m0 0l-4 4m4-4H3"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="9" strokeWidth="2" />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 7v5l3 3"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
    />
  </svg>
);

const XIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const SmallCalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect
      x="3"
      y="4.5"
      width="18"
      height="16"
      rx="2"
      strokeWidth="2"
    />

    <path
      strokeLinecap="round"
      d="M3 9h18M8 3v3M16 3v3"
    />
  </svg>
);

const TableIconButton = ({
  onClick,
  title,
  disabled,
  tone = "slate",
  children,
}) => {
  const tones = {
    slate:
      "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",

    red:
      "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",

    emerald:
      "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

const EXPORT_COLUMNS = [
  {
    header: "Employee ID",
    accessor: (r) => r.employee_id,
  },

  {
    header: "Notice Date",
    accessor: (r) => r.notice_date,
  },

  {
    header: "Last Working Date",
    accessor: (r) => r.last_working_date,
  },

  {
    header: "Reason",
    accessor: (r) => r.reason,
  },

  {
    header: "Overall Records / Accomplishments",
    accessor: (r) => r.accomplishments || "",
  },

  {
    header: "Status",
    accessor: (r) => r.status || "Pending",
  },
];

const PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ResignationListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useResignations({
    page: 1,
    per_page: 1000,
  });

  const allResignations = allData?.items || [];

  /* ---------------------------------------------------------------------- */
  /* Employees                                                               */
  /* ---------------------------------------------------------------------- */

  const { data: employeesData } = useQuery({
    queryKey: ["resignations-page", "employees-full"],

    queryFn: async () =>
      (
        await employeesApi.list({
          page: 1,
          per_page: 1000,
          is_active: true,
        })
      ).data.data,

    staleTime: 5 * 60 * 1000,
  });

  const employees = employeesData?.items || [];

  const employeeMap = useMemo(
    () =>
      Object.fromEntries(
        employees.map((employee) => [
          employee.id,
          employee,
        ])
      ),
    [employees]
  );

  /* ---------------------------------------------------------------------- */
  /* Organization Options                                                    */
  /* ---------------------------------------------------------------------- */

  const { data: companyData } = useCompanies({
    page: 1,
    per_page: 100,
  });

  const companies =
    companyData?.items ||
    companyData?.data ||
    [];

  const departmentOptions = useDepartmentOptions();
  const designationOptions = useDesignationOptions();

  /* ---------------------------------------------------------------------- */
  /* Filters                                                                 */
  /* ---------------------------------------------------------------------- */

  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterDesignationId, setFilterDesignationId] =
    useState("");

  const branches = useMemo(() => {
    const map = new Map();

    employees.forEach((employee) => {
      const branch = employee.department?.branch;

      if (!branch?.id) return;

      if (
        filterCompanyId &&
        String(employee.department?.company?.id) !==
          String(filterCompanyId)
      ) {
        return;
      }

      map.set(branch.id, branch);
    });

    return Array.from(map.values());
  }, [employees, filterCompanyId]);

  /* ---------------------------------------------------------------------- */
  /* Mutations                                                               */
  /* ---------------------------------------------------------------------- */

  const createMutation = useCreateResignation();
  const updateMutation = useUpdateResignation();
  const deactivateMutation =
    useDeactivateResignation();

  /* ---------------------------------------------------------------------- */
  /* UI State                                                                */
  /* ---------------------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [activeFilter, setActiveFilter] =
    useState("active");

  const [viewMode, setViewMode] =
    useState("table");

  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  /* ---------------------------------------------------------------------- */
  /* Export                                                                  */
  /* ---------------------------------------------------------------------- */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: employeeLifecycleApi.resignations.list,

    queryParams: {
      search: search || undefined,
    },

    exportColumns: EXPORT_COLUMNS,

    filename: "resignations",

    title: "Resignations",
  });

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                              */
  /* ---------------------------------------------------------------------- */

  const activeResignations =
    allResignations.filter(
      (resignation) =>
        resignation.is_active !== false
    );

  const pendingCount =
    activeResignations.filter(
      (resignation) =>
        (resignation.status || "Pending") ===
        "Pending"
    ).length;

  const approvedCount =
    activeResignations.filter(
      (resignation) =>
        resignation.status === "Approved"
    ).length;

  const rejectedCount =
    activeResignations.filter(
      (resignation) =>
        resignation.status === "Rejected"
    ).length;

  /* ---------------------------------------------------------------------- */
  /* Filtered Records                                                        */
  /* ---------------------------------------------------------------------- */

  const filtered = useMemo(() => {
    return allResignations
      .filter((resignation) => {
        if (
          activeFilter === "active" &&
          resignation.is_active === false
        ) {
          return false;
        }

        if (
          activeFilter === "inactive" &&
          resignation.is_active !== false
        ) {
          return false;
        }

        if (
          statusFilter !== "all" &&
          (resignation.status || "Pending") !==
            statusFilter
        ) {
          return false;
        }

        const employee =
          employeeMap[resignation.employee_id];

        if (
          filterCompanyId &&
          String(
            resignation.previous_organization
              ?.company?.id ||
              employee?.department?.company?.id
          ) !== String(filterCompanyId)
        ) {
          return false;
        }

        if (
          filterBranchId &&
          String(
            resignation.previous_organization
              ?.branch?.id ||
              employee?.department?.branch?.id
          ) !== String(filterBranchId)
        ) {
          return false;
        }

        if (
          filterDepartmentId &&
          String(
            resignation.previous_organization
              ?.department?.id ||
              employee?.department?.id
          ) !== String(filterDepartmentId)
        ) {
          return false;
        }

        if (
          filterDesignationId &&
          String(
            resignation.previous_organization
              ?.designation?.id ||
              employee?.designation?.id
          ) !== String(filterDesignationId)
        ) {
          return false;
        }

        if (search) {
          const employeeName =
            employee
              ? `${employee.first_name || ""} ${
                  employee.last_name || ""
                }`
              : "";

          const haystack = `
            ${employeeName}
            ${resignation.reason || ""}
            ${resignation.accomplishments || ""}
            ${resignation.status || ""}
            ${
              resignation.previous_organization
                ?.company?.name || ""
            }
            ${
              resignation.previous_organization
                ?.branch?.name || ""
            }
            ${
              resignation.previous_organization
                ?.department?.name || ""
            }
            ${
              resignation.previous_organization
                ?.designation?.name || ""
            }
          `.toLowerCase();

          if (
            !haystack.includes(
              search.toLowerCase()
            )
          ) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.notice_date) -
          new Date(a.notice_date)
      );
  }, [
    allResignations,
    statusFilter,
    activeFilter,
    search,
    employeeMap,
    filterCompanyId,
    filterBranchId,
    filterDepartmentId,
    filterDesignationId,
  ]);

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const paged = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (resignation) => {
    setEditing(resignation);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload,
        });

        showToast(
          "Resignation updated",
          "success"
        );
      } else {
        await createMutation.mutateAsync(
          payload
        );

        showToast(
          "Resignation created",
          "success"
        );
      }

      closeModal();
      refetch();
    } catch (error) {
      showToast(
        error.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deactivateMutation.mutateAsync(
        deleteTarget.id
      );

      showToast(
        "Resignation deactivated",
        "success"
      );

      setDeleteTarget(null);
      refetch();
    } catch (error) {
      showToast(
        error.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  const handleReactivate = async (
    resignation
  ) => {
    try {
      await updateMutation.mutateAsync({
        id: resignation.id,

        payload: {
          is_active: true,
        },
      });

      showToast(
        "Resignation reactivated",
        "success"
      );

      refetch();
    } catch (error) {
      showToast(
        error.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending;

  /* ---------------------------------------------------------------------- */
  /* Error                                                                   */
  /* ---------------------------------------------------------------------- */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load resignations.
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resignations
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Employee resignation records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

          <Button
            type="button"
            onClick={handleAdd}
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">
              +
            </span>

            Add Resignation
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<TrendIcon />}
          value={activeResignations.length}
          label="Total Resignations"
        />

        <StatCard
          icon={<ClockIcon />}
          value={pendingCount}
          label="Pending"
        />

        <StatCard
          icon={<CheckIcon />}
          value={approvedCount}
          label="Approved"
          tone="green"
        />

        <StatCard
          icon={<XIcon />}
          value={rejectedCount}
          label="Rejected"
          tone="red"
        />
      </div>

      {/* FILTERS */}
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            {/* Search */}
            <div className="relative w-full lg:min-w-[240px] lg:flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z"
                  />
                </svg>
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search employee, reason, accomplishments..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Company */}
            <select
              value={filterCompanyId}
              onChange={(event) => {
                setFilterCompanyId(
                  event.target.value
                );

                setFilterBranchId("");
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[160px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Companies
              </option>

              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.name}
                </option>
              ))}
            </select>

            {/* Branch */}
            <select
              value={filterBranchId}
              onChange={(event) => {
                setFilterBranchId(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[160px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Branches
              </option>

              {branches.map((branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              ))}
            </select>

            {/* Department */}
            <select
              value={filterDepartmentId}
              onChange={(event) => {
                setFilterDepartmentId(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[160px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Departments
              </option>

              {departmentOptions.map(
                (department) => (
                  <option
                    key={department.value}
                    value={department.value}
                  >
                    {department.label}
                  </option>
                )
              )}
            </select>

            {/* Designation */}
            <select
              value={filterDesignationId}
              onChange={(event) => {
                setFilterDesignationId(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[160px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Designations
              </option>

              {designationOptions.map(
                (designation) => (
                  <option
                    key={designation.value}
                    value={designation.value}
                  >
                    {designation.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* View + Status */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Table
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("card");
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Card
              </button>
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                "all",
                "Pending",
                "Approved",
                "Rejected",
              ].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === status
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter */}
          <div className="flex justify-end">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                "active",
                "inactive",
                "all",
              ].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setActiveFilter(status);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                    activeFilter === status
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Loading...
        </div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No resignations found
          </h3>

          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current
            search or filters.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* ---------------------------------------------------------------- */
        /* TABLE                                                             */
        /* ---------------------------------------------------------------- */
        <div className="min-w-0 overflow-x-auto overflow-y-visible rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="w-[16%] px-3 py-3 font-medium">
                  Employee
                </th>

                <th className="w-[22%] px-3 py-3 font-medium">
                  Previous Organization
                </th>

                <th className="w-[11%] px-3 py-3 font-medium">
                  Experience
                </th>

                <th className="w-[16%] px-3 py-3 font-medium">
                  Notice Period
                </th>

                <th className="w-[13%] px-3 py-3 font-medium">
                  Reason
                </th>

                <th className="w-[12%] px-3 py-3 font-medium">
                  Overall Records
                </th>

                <th className="w-[10%] px-3 py-3 font-medium">
                  Status
                </th>

                <th className="w-[10%] px-3 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((resignation, rowIndex) => {
                const employee =
                  employeeMap[
                    resignation.employee_id
                  ];

                const employeeName =
                  getEmployeeName(
                    employee,
                    resignation.employee_id
                  );

                const status =
                  resignation.status ||
                  "Pending";

                const experience =
                  formatDuration(
                    employee?.joining_date,
                    resignation.notice_date
                  );

                const noticePeriod =
                  formatDuration(
                    resignation.notice_date,
                    resignation.last_working_date
                  );

                // Rows near the top of the visible page don't have enough
                // room to show the tooltip above the cell, so flip it to
                // open downwards for the first couple of rows instead.
                const openBelow = rowIndex < 2;

                return (
                  <tr
                    key={resignation.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    {/* Employee */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar
                          name={employeeName}
                          size="sm"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {employeeName}
                          </p>

                          <p className="truncate text-[10px] text-slate-400">
                            {employee?.employee_code ||
                              `#${resignation.employee_id}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Previous Organization */}
                    <td className="px-3 py-3 align-top">
                      <OrganizationHoverCard
                        resignation={resignation}
                        employee={employee}
                      />
                    </td>

                    {/* Experience */}
                    <td className="px-3 py-3 align-top">
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {experience}
                      </span>
                    </td>

                    {/* Notice */}
                    <td className="px-3 py-3 align-top">
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                          <SmallCalendarIcon />

                          <span>
                            {formatDate(
                              resignation.notice_date
                            )}
                          </span>

                          <span>→</span>

                          <span>
                            {formatDate(
                              resignation.last_working_date
                            )}
                          </span>
                        </span>

                        <span className="mt-0.5 block text-[10px] text-slate-400">
                          {noticePeriod}
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-3 py-3 align-top">
                      <div
                        className="max-w-full truncate text-xs text-slate-600 dark:text-slate-300"
                        title={
                          resignation.reason ||
                          ""
                        }
                      >
                        {resignation.reason ||
                          "—"}
                      </div>
                    </td>

                    {/* Accomplishments */}
                    <td className="px-3 py-3 align-top">
                      <div className="group relative">
                        <p
                          className="line-clamp-2 cursor-help text-xs leading-4 text-slate-600 dark:text-slate-300"
                          title={
                            resignation.accomplishments ||
                            ""
                          }
                        >
                          {resignation.accomplishments ||
                            "—"}
                        </p>

                        {resignation.accomplishments && (
                          <div
                            className={`pointer-events-none absolute right-0 z-50 hidden max-h-64 w-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 opacity-0 shadow-xl transition-all group-hover:pointer-events-auto group-hover:block group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${
                              openBelow
                                ? "top-full mt-2"
                                : "bottom-full mb-2"
                            }`}
                          >
                            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                              Overall Records /
                              Accomplishments
                            </p>

                            <p className="whitespace-pre-wrap leading-5">
                              {
                                resignation.accomplishments
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3 align-top">
                      <Badge
                        className={
                          STATUS_STYLES[status] ||
                          STATUS_STYLES.Pending
                        }
                      >
                        {status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {status ===
                          "Approved" && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/employee/exit-management?resignation_id=${resignation.id}`
                              )
                            }
                            className="mr-1 hidden text-xs font-medium text-primary-600 hover:underline xl:inline dark:text-primary-400"
                          >
                            Exit
                          </button>
                        )}

                        <TableIconButton
                          title="Edit"
                          onClick={() =>
                            handleEdit(
                              resignation
                            )
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z"
                            />
                          </svg>
                        </TableIconButton>

                        {resignation.is_active !==
                        false ? (
                          <TableIconButton
                            title="Deactivate"
                            onClick={() =>
                              setDeleteTarget(
                                resignation
                              )
                            }
                            tone="red"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"
                              />
                            </svg>
                          </TableIconButton>
                        ) : (
                          <TableIconButton
                            title="Reactivate"
                            onClick={() =>
                              handleReactivate(
                                resignation
                              )
                            }
                            disabled={
                              updateMutation.isPending
                            }
                            tone="emerald"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5"
                              />
                            </svg>
                          </TableIconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* CARD VIEW                                                         */
        /* ---------------------------------------------------------------- */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((resignation) => {
            const employee =
              employeeMap[
                resignation.employee_id
              ];

            const employeeName =
              getEmployeeName(
                employee,
                resignation.employee_id
              );

            const status =
              resignation.status ||
              "Pending";

            const experience =
              formatDuration(
                employee?.joining_date,
                resignation.notice_date
              );

            const noticePeriod =
              formatDuration(
                resignation.notice_date,
                resignation.last_working_date
              );

            return (
              <div
                key={resignation.id}
                className="relative min-w-0 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-primary-600" />

                <div className="p-4">
                  {/* Employee */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar
                        name={employeeName}
                        size="sm"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {employeeName}
                        </p>

                        <p className="text-[10px] text-slate-400">
                          {employee?.employee_code ||
                            `#${resignation.employee_id}`}
                        </p>
                      </div>
                    </div>

                    <Badge
                      className={
                        STATUS_STYLES[status] ||
                        STATUS_STYLES.Pending
                      }
                    >
                      {status}
                    </Badge>
                  </div>

                  {/* Previous Organization */}
                  <div className="mt-3">
                    <OrganizationHoverCard
                      resignation={resignation}
                      employee={employee}
                    />
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  {/* Experience / Notice */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                        Experience
                      </p>

                      <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">
                        {experience}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                        Notice Period
                      </p>

                      <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">
                        {noticePeriod}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <SmallCalendarIcon />

                    <span>
                      {formatDate(
                        resignation.notice_date
                      )}
                    </span>

                    <span>→</span>

                    <span>
                      {formatDate(
                        resignation.last_working_date
                      )}
                    </span>
                  </div>

                  {/* Reason */}
                  {resignation.reason && (
                    <div className="mt-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                        Resignation Reason
                      </p>

                      <p
                        title={
                          resignation.reason
                        }
                        className="mt-0.5 line-clamp-2 text-xs leading-4 text-slate-600 dark:text-slate-300"
                      >
                        {resignation.reason}
                      </p>
                    </div>
                  )}

                  {/* Overall Records */}
                  {resignation.accomplishments && (
                    <div className="mt-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                        Overall Records /
                        Accomplishments
                      </p>

                      <p
                        title={
                          resignation.accomplishments
                        }
                        className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs leading-4 text-slate-600 dark:text-slate-300"
                      >
                        {
                          resignation.accomplishments
                        }
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          resignation
                        )
                      }
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
                    >
                      Edit
                    </button>

                    {resignation.is_active !==
                    false ? (
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(
                            resignation
                          )
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleReactivate(
                            resignation
                          )
                        }
                        disabled={
                          updateMutation.isPending
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-600 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/40 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>

                  {/* Exit Clearance */}
                  {status === "Approved" && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/employee/exit-management?resignation_id=${resignation.id}`
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[11px] font-semibold text-primary-700 transition-all hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20"
                    >
                      Start Exit Clearance
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>
          Page {page} of {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((current) =>
                Math.max(1, current - 1)
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() =>
              setPage((current) =>
                Math.min(
                  pageCount,
                  current + 1
                )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editing
            ? "Edit Resignation"
            : "Add Resignation"
        }
      >
        <ResignationForm
          formId="resignations-form"
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={isSaving}
          isEdit={!!editing}
        />
      </Modal>

      {/* DELETE */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() =>
          setDeleteTarget(null)
        }
        onConfirm={confirmDelete}
        title="Deactivate Resignation"
        message={
          deleteTarget
            ? "Are you sure you want to deactivate this resignation record?"
            : ""
        }
        confirmText="Deactivate"
        loading={
          deactivateMutation.isPending
        }
      />
    </div>
  );
}