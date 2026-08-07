import { useState } from "react";
import { Link } from "react-router-dom";
import { useEmployees, useDeactivateEmployee } from "./useEmployees";
import EmployeeTable from "./components/EmployeeTable";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";
import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import Button from "@/components/ui/Button";
import { employeesApi } from "@/api/employees.api";
import { formatCurrency } from "@/utils/formatCurrency";
import { useModulePermissions } from "@/hooks/useModulePermissions";

const EXPORT_COLUMNS = [
  { header: "Code", accessor: (r) => r.employee_code },
  { header: "Name", accessor: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim() },
  { header: "Department", accessor: (r) => r.department?.department_name },
  { header: "Designation", accessor: (r) => r.designation?.designation_name },
  { header: "Salary", accessor: (r) => (r.salary != null ? formatCurrency(r.salary) : null) },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

export default function EmployeeListPage() {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage, sortBy, sortDir, toggleSort } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useEmployees(queryParams);
  const { canAdd } = useModulePermissions("Employees");
  const deactivate = useDeactivateEmployee();
  const [confirmEmployee, setConfirmEmployee] = useState(null);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: employeesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "employees",
    title: "Employees",
  });

  const handleDeactivate = async () => {
    if (!confirmEmployee) return;
    try {
      await deactivate.mutateAsync(confirmEmployee.id);
      showToast("Employee deactivated", "success");
      setConfirmEmployee(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate employee", "error");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employees</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage employee records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          {canAdd && (
            <Link to="/employees/new">
              <Button className="w-full sm:w-auto">Add Employee</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder="Search employees..." />
        </div>

        {isError && (
          <div className="p-4 text-red-600 dark:text-red-400">
            Failed to load employees.
          </div>
        )}

        <EmployeeTable
          data={data?.items || []}
          loading={isLoading}
          onDeactivate={setConfirmEmployee}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
        />

        <TablePagination
          page={page}
          pages={data?.pages || 1}
          total={data?.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>

      <ConfirmDialog
        open={!!confirmEmployee}
        onClose={() => setConfirmEmployee(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Employee"
        message={`Are you sure you want to deactivate "${confirmEmployee?.first_name} ${confirmEmployee?.last_name}"?`}
        confirmText="Deactivate"
        loading={deactivate.isPending}
      />
    </div>
  );
}
