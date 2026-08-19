import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { useEmployees , useUpdateEmployee, } from "./useEmployees";
import EmployeeTable from "./components/EmployeeTable";

import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";

import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

import { employeesApi } from "@/api/employees.api";
import { masterApi } from "@/api/master.api";

import { formatCurrency } from "@/utils/formatCurrency";
import { useModulePermissions } from "@/hooks/useModulePermissions";

const EXPORT_COLUMNS = [
  {
    header: "Code",
    accessor: (r) => r.employee_code,
  },
  {
    header: "Name",
    accessor: (r) =>
      `${r.first_name || ""} ${
        r.last_name || ""
      }`.trim(),
  },
  {
    header: "Company",
    accessor: (r) =>
      r.department?.company?.name,
  },
  {
    header: "Branch",
    accessor: (r) =>
      r.department?.branch?.name,
  },
  {
    header: "Department",
    accessor: (r) =>
      r.department?.department_name,
  },
  {
    header: "Designation",
    accessor: (r) =>
      r.designation?.designation_name,
  },
  {
    header: "Salary",
    accessor: (r) =>
      r.salary != null
        ? formatCurrency(r.salary)
        : null,
  },
  {
    header: "Status",
    accessor: (r) =>
      r.is_active
        ? "Active"
        : "Inactive",
  },
];

const ACCENT = {
  icon: "bg-sky-600",
  badge:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
};

export default function EmployeeListPage({
  restricted = false,
  hideSalary = false,
  hideActions = false,
  crmOnly = false,
}) {
  if (crmOnly) {
    return <CrmEmployeeView />;
  }

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

  const {
    value,
    setValue,
    debouncedValue,
  } = useDebouncedSearch();

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("active");

  const queryParams = {
    ...params,
    search:
      debouncedValue || undefined,
  };

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useEmployees(queryParams);

  const { canAdd } =
    useModulePermissions(
      "Employees"
    );

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll:
      employeesApi.list,
    queryParams,
    exportColumns:
      EXPORT_COLUMNS,
    filename: "employees",
    title: "Employees",
  });

  const employees =
    data?.items || [];

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.is_active
    );

  const inactiveEmployees =
    employees.filter(
      (employee) =>
        !employee.is_active
    );

  const filteredEmployees =
    employees.filter(
      (employee) => {
        if (
          statusFilter ===
          "active"
        ) {
          return employee.is_active;
        }

        if (
          statusFilter ===
          "inactive"
        ) {
          return !employee.is_active;
        }

        return true;
      }
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${ACCENT.icon}`}
          >
            <span className="font-bold">
              E
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Employees
            </h1>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Manage employee records
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={
              exportExcel
            }
            onExportPDF={
              exportPDF
            }
            exporting={exporting}
          />

          {canAdd && (
            <Link
              to="/employees/new"
              className="w-full sm:w-auto"
            >
              <Button className="h-10 w-full px-4 sm:w-auto">
                <span className="mr-1.5 text-lg">
                  +
                </span>
                Add Employee
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">
            Total Employees
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {employees.length}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            Current page
          </p>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm dark:border-emerald-900/30 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">
            Active Employees
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {activeEmployees.length}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            Currently active
          </p>
        </div>

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm dark:border-red-900/30 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">
            Inactive Employees
          </p>

          <p className="mt-1 text-2xl font-bold text-red-600">
            {inactiveEmployees.length}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-400">
            Deactivated employees
          </p>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <TableSearchBar
                value={value}
                onChange={setValue}
                placeholder="Search employees..."
              />
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                "active",
                "inactive",
                "all",
              ].map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setStatusFilter(
                        status
                      )
                    }
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                      statusFilter ===
                      status
                        ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {isError && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            Failed to load employees.
          </div>
        )}

        {!isError && (
          <EmployeeTable
            data={
              filteredEmployees
            }
            loading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={toggleSort}
            restricted={restricted}
            hideSalary={hideSalary}
            hideActions={hideActions}
          />
        )}

        <div className="border-t border-slate-200 px-2 dark:border-slate-700">
          <TablePagination
            page={page}
            pages={
              data?.pages || 1
            }
            total={
              data?.total || 0
            }
            perPage={perPage}
            onPageChange={
              setPage
            }
            onPerPageChange={
              setPerPage
            }
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CRM
========================================================= */

const CRM_DEPARTMENT_NAME =
  "CRM";

const CRM_PAGE_SIZE = 10;
const CRM_CARD_PAGE_SIZE = 6;

const CRM_EXPORT_COLUMNS = [
  {
    header: "Code",
    accessor: (r) =>
      r.employee_code,
  },
  {
    header: "Name",
    accessor: (r) =>
      `${r.first_name || ""} ${
        r.last_name || ""
      }`.trim(),
  },
  {
    header: "Company",
    accessor: (r) =>
      r.department?.company?.name,
  },
  {
    header: "Branch",
    accessor: (r) =>
      r.department?.branch?.name,
  },
  {
    header: "Department",
    accessor: (r) =>
      r.department?.department_name,
  },
  {
    header: "Designation",
    accessor: (r) =>
      r.designation?.designation_name,
  },
  {
    header: "Status",
    accessor: (r) =>
      r.is_active
        ? "Active"
        : "Inactive",
  },
];

function getEmployeeFullName(
  employee
) {
  return `${employee?.first_name || ""} ${
    employee?.last_name || ""
  }`.trim();
}

function CrmEmployeeView() {
  const [page, setPage] =
    useState(1);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("active");

  const [
    viewMode,
    setViewMode,
  ] = useState("card");

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

  const [
    deactivateTarget,
    setDeactivateTarget,
  ] = useState(null);

  const updateEmployee =
    useUpdateEmployee();

  const {
    data: departmentsData,
    isLoading:
      departmentsLoading,
  } = useQuery({
    queryKey: [
      "crm-employees",
      "all-departments",
    ],

    queryFn: async () =>
      (
        await masterApi.listDepartments(
          {
            page: 1,
            per_page: 500,
            is_active: true,
          }
        )
      ).data.data,
  });

  const crmDepartments =
    useMemo(
      () =>
        (
          departmentsData?.items ||
          []
        ).filter(
          (department) =>
            (
              department.department_name ||
              ""
            )
              .trim()
              .toLowerCase() ===
            CRM_DEPARTMENT_NAME.toLowerCase()
        ),
      [departmentsData]
    );

  const crmDepartmentIds =
    useMemo(
      () =>
        new Set(
          crmDepartments.map(
            (department) =>
              department.id
          )
        ),
      [crmDepartments]
    );

  /*
   * IMPORTANT:
   * Employees are loaded BEFORE
   * companyOptions / branchOptions.
   */
  const {
    data: employeesData,
    isLoading:
      employeesLoading,
    isFetching,
    isError,
    refetch,
  } = useEmployees({
    page: 1,
    per_page: 1000,
  });

  const allEmployees =
    employeesData?.items ||
    [];

  const crmEmployees =
    useMemo(
      () =>
        allEmployees.filter(
          (employee) =>
            crmDepartmentIds.has(
              employee.department_id ??
                employee.department?.id
            )
        ),
      [
        allEmployees,
        crmDepartmentIds,
      ]
    );

  const activeCrmEmployees =
    crmEmployees.filter(
      (employee) =>
        employee.is_active
    );

  const inactiveCrmEmployees =
    crmEmployees.filter(
      (employee) =>
        !employee.is_active
    );

  /*
   * Build companies from BOTH
   * department data and employees.
   * This prevents one company from
   * disappearing when the department
   * response does not contain all
   * nested company records.
   */
  const companyOptions =
    useMemo(() => {
      const map = new Map();

      crmEmployees.forEach(
        (employee) => {
          const company =
            employee
              .department?.company ||
            employee.company;

          if (company?.id) {
            map.set(
              company.id,
              company
            );
          }
        }
      );

      crmDepartments.forEach(
        (department) => {
          const company =
            department.company;

          if (company?.id) {
            map.set(
              company.id,
              company
            );
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          (
            a.name ||
            a.company_name ||
            ""
          ).localeCompare(
            b.name ||
            b.company_name ||
            ""
          )
      );
    }, [
      crmEmployees,
      crmDepartments,
    ]);

  const branchOptions =
    useMemo(() => {
      const map = new Map();

      crmEmployees.forEach(
        (employee) => {
          const branch =
            employee
              .department?.branch ||
            employee.branch;

          const company =
            employee
              .department?.company ||
            employee.company;

          if (!branch?.id) {
            return;
          }

          if (
            companyFilterId &&
            String(
              company?.id
            ) !==
              String(
                companyFilterId
              )
          ) {
            return;
          }

          map.set(
            branch.id,
            branch
          );
        }
      );

      crmDepartments.forEach(
        (department) => {
          if (
            !department.branch?.id
          ) {
            return;
          }

          if (
            companyFilterId &&
            String(
              department.company?.id
            ) !==
              String(
                companyFilterId
              )
          ) {
            return;
          }

          map.set(
            department.branch.id,
            department.branch
          );
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          (
            a.name ||
            a.branch_name ||
            ""
          ).localeCompare(
            b.name ||
            b.branch_name ||
            ""
          )
      );
    }, [
      crmEmployees,
      crmDepartments,
      companyFilterId,
    ]);

  const departmentOptions =
    useMemo(
      () =>
        crmDepartments.filter(
          (department) => {
            if (
              companyFilterId &&
              String(
                department.company?.id
              ) !==
                String(
                  companyFilterId
                )
            ) {
              return false;
            }

            if (
              branchFilterId &&
              String(
                department.branch?.id
              ) !==
                String(
                  branchFilterId
                )
            ) {
              return false;
            }

            return true;
          }
        ),
      [
        crmDepartments,
        companyFilterId,
        branchFilterId,
      ]
    );

  const {
    data: designationsData,
  } = useQuery({
    queryKey: [
      "crm-employees",
      "designations",
      departmentFilterId,
    ],

    queryFn: async () =>
      (
        await masterApi.listDesignations(
          {
            department_id:
              departmentFilterId,
            page: 1,
            per_page: 100,
            is_active: true,
          }
        )
      ).data.data,

    enabled:
      !!departmentFilterId,
  });

  const designationOptions =
    designationsData?.items ||
    [];

  const handleCompanyFilterChange =
    (event) => {
      setCompanyFilterId(
        event.target.value
      );

      setBranchFilterId("");
      setDepartmentFilterId("");
      setDesignationFilterId("");
      setPage(1);
    };

  const handleBranchFilterChange =
    (event) => {
      setBranchFilterId(
        event.target.value
      );

      setDepartmentFilterId("");
      setDesignationFilterId("");
      setPage(1);
    };

  const handleDepartmentFilterChange =
    (event) => {
      setDepartmentFilterId(
        event.target.value
      );

      setDesignationFilterId("");
      setPage(1);
    };

  const handleDesignationFilterChange =
    (event) => {
      setDesignationFilterId(
        event.target.value
      );

      setPage(1);
    };

  const filteredEmployees =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return crmEmployees.filter(
        (employee) => {
          if (
            statusFilter ===
              "active" &&
            !employee.is_active
          ) {
            return false;
          }

          if (
            statusFilter ===
              "inactive" &&
            employee.is_active
          ) {
            return false;
          }

          const companyId =
            employee
              .department?.company?.id ??
            employee.company?.id;

          const branchId =
            employee
              .department?.branch?.id ??
            employee.branch?.id;

          const departmentId =
            employee.department_id ??
            employee.department?.id;

          const designationId =
            employee.designation_id ??
            employee.designation?.id;

          if (
            companyFilterId &&
            String(companyId) !==
              String(
                companyFilterId
              )
          ) {
            return false;
          }

          if (
            branchFilterId &&
            String(branchId) !==
              String(
                branchFilterId
              )
          ) {
            return false;
          }

          if (
            departmentFilterId &&
            String(
              departmentId
            ) !==
              String(
                departmentFilterId
              )
          ) {
            return false;
          }

          if (
            designationFilterId &&
            String(
              designationId
            ) !==
              String(
                designationFilterId
              )
          ) {
            return false;
          }

          if (normalizedSearch) {
            const haystack = [
              employee.employee_code,
              getEmployeeFullName(
                employee
              ),
              employee
                .department
                ?.company?.name,
              employee
                .department
                ?.branch?.name,
              employee
                .department
                ?.department_name,
              employee
                .designation
                ?.designation_name,
            ]
              .join(" ")
              .toLowerCase();

            if (
              !haystack.includes(
                normalizedSearch
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      crmEmployees,
      search,
      statusFilter,
      companyFilterId,
      branchFilterId,
      departmentFilterId,
      designationFilterId,
    ]);

  const pageSize =
    viewMode === "card"
      ? CRM_CARD_PAGE_SIZE
      : CRM_PAGE_SIZE;

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        filteredEmployees.length /
          pageSize
      )
    );

  const pagedEmployees =
    filteredEmployees.slice(
      (page - 1) *
        pageSize,
      page * pageSize
    );

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll:
      employeesApi.list,
    queryParams: {
      search:
        search || undefined,
    },
    exportColumns:
      CRM_EXPORT_COLUMNS,
    filename:
      "crm-employees",
    title:
      "CRM Employees",
  });

  const isLoading =
    employeesLoading ||
    departmentsLoading;

  /*
   * Use the same employee API update
   * function for CRM activate/deactivate.
   *
   * If your employeesApi uses a different
   * method name, use the existing update
   * method from employeesApi here.
   */
  const handleStatusChange =
    async (employee) => {
      if (!employee?.id) {
        return;
      }

      try {
        await updateEmployee.mutateAsync({
          id: employee.id,
          payload: {
            is_active:
              !employee.is_active,
          },
        });

        setDeactivateTarget(
          null
        );

        await refetch();
      } catch (error) {
        console.error(
          "Failed to update employee status",
          error
        );
      }
  };

  const statusBadge =
    (isActive) => (
      <Badge
        className={
          isActive
            ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
        }
      >
        <span
          className={
            isActive
              ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
              : "h-1.5 w-1.5 rounded-full bg-red-500"
          }
        />

        {isActive
          ? "Active"
          : "Inactive"}
      </Badge>
    );

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          <h2 className="font-semibold">
            Failed to load CRM employees
          </h2>

          <p className="mt-1 text-sm">
            Please refresh the page and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* CRM HEADER */}

      <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 via-white to-white p-5 shadow-sm dark:border-primary-500/20 dark:from-primary-500/10 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
              <span className="text-lg font-bold">
                CRM
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                CRM Employees
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                CRM team directory and employee management
              </p>
            </div>
          </div>

          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={
              exportExcel
            }
            onExportPDF={
              exportPDF
            }
            exporting={exporting}
          />
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary-100 bg-primary-50/50 p-4 dark:border-primary-500/20 dark:bg-primary-500/5">
          <p className="text-xs font-medium text-slate-500">
            Total CRM Employees
          </p>

          <p className="mt-1 text-2xl font-bold text-primary-700 dark:text-primary-400">
            {
              crmEmployees.length
            }
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <p className="text-xs font-medium text-slate-500">
            Active
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {
              activeCrmEmployees.length
            }
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/5">
          <p className="text-xs font-medium text-slate-500">
            Inactive
          </p>

          <p className="mt-1 text-2xl font-bold text-red-600">
            {
              inactiveCrmEmployees.length
            }
          </p>
        </div>
      </div>

      {/* FILTERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value
              );
              setPage(1);
            }}
            placeholder="Search CRM employees..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={
                companyFilterId
              }
              onChange={
                handleCompanyFilterChange
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Companies
              </option>

              {companyOptions.map(
                (company) => (
                  <option
                    key={company.id}
                    value={company.id}
                  >
                    {company.name ||
                      company.company_name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                branchFilterId
              }
              onChange={
                handleBranchFilterChange
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Branches
              </option>

              {branchOptions.map(
                (branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name ||
                      branch.branch_name}
                  </option>
                )
              )}
            </select>

            <select
              value={
                departmentFilterId
              }
              onChange={
                handleDepartmentFilterChange
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Departments
              </option>

              {departmentOptions.map(
                (department) => (
                  <option
                    key={department.id}
                    value={
                      department.id
                    }
                  >
                    {
                      department.department_name
                    }
                  </option>
                )
              )}
            </select>

            <select
              value={
                designationFilterId
              }
              onChange={
                handleDesignationFilterChange
              }
              disabled={
                !departmentFilterId
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Designations
              </option>

              {designationOptions.map(
                (designation) => (
                  <option
                    key={
                      designation.id
                    }
                    value={
                      designation.id
                    }
                  >
                    {
                      designation.designation_name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "table"
                  );
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500"
                }`}
              >
                Table
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "card"
                  );
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500"
                }`}
              >
                Card
              </button>
            </div>

            <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                "active",
                "inactive",
                "all",
              ].map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(
                        status
                      );
                      setPage(1);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                      statusFilter ===
                      status
                        ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500"
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LOADING */}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="h-[330px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : viewMode ===
        "table" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="w-[22%] px-4 py-3">
                  Employee
                </th>

                <th className="w-[16%] px-4 py-3">
                  Company
                </th>

                <th className="w-[14%] px-4 py-3">
                  Branch
                </th>

                <th className="w-[15%] px-4 py-3">
                  Department
                </th>

                <th className="w-[13%] px-4 py-3">
                  Designation
                </th>

                <th className="w-[10%] px-4 py-3">
                  Status
                </th>

                <th className="w-[10%] px-4 py-3 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedEmployees.map(
                (employee) => {
                  const name =
                    getEmployeeFullName(
                      employee
                    ) ||
                    `Employee #${employee.id}`;

                  return (
                    <tr
                      key={
                        employee.id
                      }
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            {name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800 dark:text-white">
                              {name}
                            </p>

                            <p className="font-mono text-[10px] text-slate-400">
                              {
                                employee.employee_code
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="truncate px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {employee.department?.company?.name ||
                          employee.company?.name ||
                          "-"}
                      </td>

                      <td className="truncate px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {employee.department?.branch?.name ||
                          employee.branch?.name ||
                          "-"}
                      </td>

                      <td className="truncate px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {employee.department?.department_name ||
                          "-"}
                      </td>

                      <td className="truncate px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {employee.designation?.designation_name ||
                          "-"}
                      </td>

                      <td className="px-4 py-3">
                        {statusBadge(
                          employee.is_active
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to={`/employees/${employee.id}?restricted=1&returnTo=/crm/employees`}
                            title="View"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                          >
                            View
                          </Link>

                          <Link
                            to={`/employees/${employee.id}/edit?returnTo=/crm/employees`}
                            title="Edit"
                            className="rounded-lg p-1.5 text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
                          >
                            Edit
                          </Link>

                          {employee.is_active ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDeactivateTarget(
                                  employee
                                )
                              }
                              disabled={
                                updateEmployee.isPending
                              }
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  employee
                                )
                              }
                              disabled={
                                updateEmployee.isPending
                              }
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedEmployees.map(
            (employee) => {
              const name =
                getEmployeeFullName(
                  employee
                ) ||
                `Employee #${employee.id}`;

              const companyName =
                employee.department?.company?.name ||
                employee.company?.name ||
                "Not assigned";

              const branchName =
                employee.department?.branch?.name ||
                employee.branch?.name ||
                "Not assigned";

              const departmentName =
                employee.department?.department_name ||
                "Not assigned";

              const designationName =
                employee.designation?.designation_name ||
                "Not assigned";

              return (
                <div
                  key={employee.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="h-1 bg-primary-600" />

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                          {name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                            {name}
                          </h3>

                          <p className="font-mono text-[10px] text-slate-400">
                            {
                              employee.employee_code
                            }
                          </p>
                        </div>
                      </div>

                      {statusBadge(
                        employee.is_active
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                        <p className="text-[9px] uppercase tracking-wide text-slate-400">
                          Company
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {
                            companyName
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                        <p className="text-[9px] uppercase tracking-wide text-slate-400">
                          Branch
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {
                            branchName
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                        <p className="text-[9px] uppercase tracking-wide text-slate-400">
                          Department
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {
                            departmentName
                          }
                        </p>
                      </div>

                      <div className="rounded-xl bg-primary-50 p-3 dark:bg-primary-500/10">
                        <p className="text-[9px] uppercase tracking-wide text-primary-500">
                          Designation
                        </p>

                        <p className="mt-1 truncate text-xs font-semibold text-primary-700 dark:text-primary-300">
                          {
                            designationName
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        to={`/employees/${employee.id}?restricted=1&returnTo=/crm/employees`}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        View
                      </Link>

                      <Link
                        to={`/employees/${employee.id}/edit?returnTo=/crm/employees`}
                        className="rounded-lg bg-primary-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-primary-700"
                      >
                        Edit
                      </Link>
                    </div>

                    <div className="mt-2">
                      {employee.is_active ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDeactivateTarget(
                              employee
                            )
                          }
                          disabled={
                            updateEmployee.isPending
                          }
                          className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          Deactivate Employee
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              employee
                            )
                          }
                          disabled={
                            updateEmployee.isPending
                          }
                          className="w-full rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                        >
                          Reactivate Employee
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {!isLoading &&
        pagedEmployees.length ===
          0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-800 dark:text-white">
              No CRM employees found
            </h3>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No employees match the selected filters.
            </p>
          </div>
        )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm text-slate-500">
          Page {page} of{" "}
          {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage(
                (current) =>
                  Math.max(
                    1,
                    current - 1
                  )
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              page >= pageCount
            }
            onClick={() =>
              setPage(
                (current) =>
                  Math.min(
                    pageCount,
                    current + 1
                  )
              )
            }
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={
          !!deactivateTarget
        }
        onClose={() => {
          if (
            !updateEmployee.isPending
          ) {
            setDeactivateTarget(
              null
            );
          }
        }}
        onConfirm={() =>
          handleStatusChange(
            deactivateTarget
          )
        }
        title="Deactivate Employee"
        message={
          deactivateTarget
            ? `Are you sure you want to deactivate ${getEmployeeFullName(
                deactivateTarget
              )}?`
            : ""
        }
        confirmText="Deactivate"
        loading={
          updateEmployee.isPending
        }
      />
    </div>
  );
}