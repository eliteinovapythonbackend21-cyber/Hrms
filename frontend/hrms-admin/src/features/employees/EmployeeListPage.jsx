import { useState } from "react";
import { Link } from "react-router-dom";
import { useEmployees } from "./useEmployees";
import EmployeeTable from "./components/EmployeeTable";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import Button from "@/components/ui/Button";
import { employeesApi } from "@/api/employees.api";
import { formatCurrency } from "@/utils/formatCurrency";
import { useModulePermissions } from "@/hooks/useModulePermissions";

const EXPORT_COLUMNS = [
  { header: "Code", accessor: (r) => r.employee_code },
  { header: "Name", accessor: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim() },
  { header: "Company", accessor: (r) => r.department?.company?.name },
  { header: "Branch", accessor: (r) => r.department?.branch?.name },
  { header: "Department", accessor: (r) => r.department?.department_name },
  { header: "Designation", accessor: (r) => r.designation?.designation_name },
  { header: "Salary", accessor: (r) => (r.salary != null ? formatCurrency(r.salary) : null) },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

// Module identity: sky. Distinct from Company (amber), Branch (teal),
// Department (violet), Designation (rose) — same "glance and you know
// which module" system used across the master-data pages.
const ACCENT = {
  icon: "bg-sky-600",
  badge: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
};

export default function EmployeeListPage() {
  const { params, page, perPage, setPage, setPerPage, sortBy, sortDir, toggleSort } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const [statusFilter, setStatusFilter] = useState("active");

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useEmployees(queryParams);
  const { canAdd } = useModulePermissions("Employees");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: employeesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "employees",
    title: "Employees",
  });

  const employees = data?.items || [];

  const activeEmployees = employees.filter((e) => e.is_active);
  const inactiveEmployees = employees.filter((e) => !e.is_active);

  const filteredEmployees = employees.filter((e) => {
    if (statusFilter === "active") return e.is_active;
    if (statusFilter === "inactive") return !e.is_active;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${ACCENT.icon}`}>
            <span className="font-bold">E</span>
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
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

          {canAdd && (
            <Link to="/employees/new" className="w-full sm:w-auto">
              <Button className="h-10 w-full px-4 sm:w-auto">
                <span className="mr-1.5 text-lg">+</span>
                Add Employee
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Employees
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {employees.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Current page
              </p>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENT.badge}`}>
              <span className="text-sm font-bold">E</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Employees
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeEmployees.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Currently active
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-red-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Inactive Employees
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveEmployees.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Deactivated employees
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* SEARCH + STATUS FILTER */}
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
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "active"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Active
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "inactive"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Inactive
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "all"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {isError && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
            <p className="font-medium">Failed to load employees.</p>
            <p className="mt-1 text-xs opacity-80">
              Please refresh the page and try again.
            </p>
          </div>
        )}

        {/* TABLE */}
        {!isError && (
          <EmployeeTable
            data={filteredEmployees}
            loading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={toggleSort}
          />
        )}

        {/* PAGINATION */}
        <div className="border-t border-slate-200 px-2 dark:border-slate-700">
          <TablePagination
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      </div>
    </div>
  );
}