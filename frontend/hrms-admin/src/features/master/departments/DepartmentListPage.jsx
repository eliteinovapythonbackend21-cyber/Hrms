import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeactivateDepartment,
} from "./useDepartments";

import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";

import DepartmentForm from "./DepartmentForm";

import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";

import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";

import { masterApi } from "@/api/master.api";
import { useModulePermissions } from "@/hooks/useModulePermissions";


const EXPORT_COLUMNS = [
  { header: "Code", accessor: (r) => r.department_code },
  { header: "Name", accessor: (r) => r.department_name },
  { header: "Company", accessor: (r) => r.company?.name },
  { header: "Branch", accessor: (r) => r.branch?.name },
  { header: "Description", accessor: (r) => r.description },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];


export default function DepartmentListPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const [companyFilterId, setCompanyFilterId] = useState("");
  const [branchFilterId, setBranchFilterId] = useState("");

  const { data: companyData } = useCompanies({ page: 1, per_page: 100 });
  const { data: branchData } = useCompanyBranches(companyFilterId, { page: 1, per_page: 100 });

  const companies = companyData?.items || companyData?.data || [];
  const filterBranches = branchData?.items || branchData?.data || [];

  const handleCompanyFilterChange = (e) => {
    setCompanyFilterId(e.target.value);
    setBranchFilterId("");
    setPage(1);
  };

  const handleBranchFilterChange = (e) => {
    setBranchFilterId(e.target.value);
    setPage(1);
  };

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
    company_id: companyFilterId || undefined,
    branch_id: branchFilterId || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useDepartments(queryParams);

  const { canAdd, canEdit, canDelete } = useModulePermissions("Departments");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: masterApi.listDepartments,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "departments",
    title: "Departments",
  });

  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deactivateDept = useDeactivateDepartment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [blockedInfo, setBlockedInfo] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"

  const departments = data?.items || [];
  const activeDepartments = departments.filter((department) => department.is_active);
  const inactiveDepartments = departments.filter((department) => !department.is_active);

  const filteredDepartments = departments.filter((department) => {
    if (statusFilter === "active") return department.is_active;
    if (statusFilter === "inactive") return !department.is_active;
    return true;
  });

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (department) => { setEditing(department); setModalOpen(true); };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateDept.mutateAsync({ id: editing.id, payload });
        showToast("Department updated successfully", "success");
      } else {
        await createDept.mutateAsync(payload);
        showToast("Department created successfully", "success");
      }
      setModalOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRow) return;
    try {
      await deactivateDept.mutateAsync(confirmRow.id);
      showToast("Department deactivated successfully", "success");
      setConfirmRow(null);
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      refetch();
    } catch (err) {
      if (err.response?.status === 409) {
        setConfirmRow(null);
        setBlockedInfo({ name: confirmRow?.department_name, message: err.response?.data?.message });
        return;
      }
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleReactivate = async (department) => {
    try {
      await updateDept.mutateAsync({ id: department.id, payload: { is_active: true } });
      showToast("Department reactivated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const statusBadge = (isActive) => (
    <Badge
      className={
        isActive
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300"
      }
    >
      <span className={isActive ? "h-1.5 w-1.5 rounded-full bg-emerald-500" : "h-1.5 w-1.5 rounded-full bg-red-500"} />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="text-lg font-bold">D</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Departments</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Manage departments across companies and branches</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          {canAdd && (
            <Button onClick={openAdd} className="h-10 w-full px-4 sm:w-auto">
              <span className="mr-1.5 text-lg">+</span>
              Add Department
            </Button>
          )}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Total Departments</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{departments.length}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Current page</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">D</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Active Departments</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{activeDepartments.length}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Currently active</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-red-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Inactive Departments</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">{inactiveDepartments.length}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Deactivated departments</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH + COMPANY/BRANCH FILTER + VIEW TOGGLE + STATUS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2.5 sm:flex-row lg:max-w-3xl">
            <div className="w-full sm:max-w-xs">
              <TableSearchBar value={value} onChange={setValue} placeholder="Search departments..." />
            </div>

            <select
              value={companyFilterId}
              onChange={handleCompanyFilterChange}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Companies</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>

            <select
              value={branchFilterId}
              onChange={handleBranchFilterChange}
              disabled={!companyFilterId}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{companyFilterId ? "All Branches" : "Select a company first"}</option>
              {filterBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button type="button" onClick={() => setViewMode("table")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "table" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M9 9v11" />
                </svg>
                Table
              </button>
              <button type="button" onClick={() => setViewMode("card")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "card" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Card
              </button>
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button type="button" onClick={() => setStatusFilter("active")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${statusFilter === "active" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>Active</button>
              <button type="button" onClick={() => setStatusFilter("inactive")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${statusFilter === "inactive" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>Inactive</button>
              <button type="button" onClick={() => setStatusFilter("all")} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${statusFilter === "all" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>All</button>
            </div>
          </div>
        </div>
      </div>

      {/* ERROR */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <h2 className="font-semibold">Failed to load departments</h2>
          <p className="mt-1 text-xs">Please refresh the page and try again.</p>
        </div>
      )}

      {/* LOADING */}
      {!isError && isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[245px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {!isError && !isLoading && viewMode === "table" && filteredDepartments.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="tbl-head border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDepartments.map((dept) => {
                const firstLetter = dept.department_name?.charAt(0)?.toUpperCase() || "D";
                return (
                  <tr key={dept.id} className="tbl-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${dept.is_active ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"}`}>
                          {firstLetter}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{dept.department_name || "Unnamed Department"}</p>
                          <p className="font-mono text-[10px] text-slate-400">{dept.department_code || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{dept.company?.name || "Not assigned"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{dept.branch?.name || "Not assigned"}</td>
                    <td className="px-4 py-3">{statusBadge(dept.is_active)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <button type="button" onClick={() => openEdit(dept)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                            </svg>
                          </button>
                        )}
                        {dept.is_active ? (
                          canDelete && (
                            <button type="button" onClick={() => setConfirmRow(dept)} className="rounded-full p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" title="Deactivate">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                              </svg>
                            </button>
                          )
                        ) : (
                          canEdit && (
                            <button type="button" onClick={() => handleReactivate(dept)} disabled={updateDept.isPending} className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10" title="Reactivate">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5" />
                              </svg>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DEPARTMENT CARD GRID */}
      {!isError && !isLoading && viewMode === "card" && filteredDepartments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDepartments.map((dept) => {
            const firstLetter = dept.department_name?.charAt(0)?.toUpperCase() || "D";
            const companyName = dept.company?.name || null;
            const companyCode = dept.company?.code || null;
            const branchName = dept.branch?.name || null;
            const branchCode = dept.branch?.code || null;

            return (
              <div key={dept.id} className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${dept.is_active ? "border-slate-200 hover:border-primary-200 dark:border-slate-700 dark:hover:border-primary-500/40" : "border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10"}`}>
                <div className={`absolute inset-x-0 top-0 h-0.5 ${dept.is_active ? "bg-primary-600" : "bg-red-500"}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold shadow-sm ${dept.is_active ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"}`}>
                        {firstLetter}
                        <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${dept.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 title={dept.department_name} className="truncate text-sm font-semibold text-slate-900 dark:text-white">{dept.department_name || "Unnamed Department"}</h3>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Code</span>
                          <span className="truncate font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">{dept.department_code || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">{statusBadge(dept.is_active)}</div>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M9 15h2M15 7h2M15 11h2M15 15h2" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Company</p>
                          <p title={companyName || "Not assigned"} className={`truncate text-[11px] font-semibold ${companyName ? "text-primary-600 dark:text-primary-400" : "text-amber-500"}`}>{companyName || "Not assigned"}</p>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 flex-col items-end">
                        <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400">Code</span>
                        <span className="max-w-[80px] truncate font-mono text-[9px] text-slate-500 dark:text-slate-400">{companyCode || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M9 15h2M15 7h2M15 11h2M15 15h2" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Branch</p>
                          <p title={branchName || "Not assigned"} className={`truncate text-[11px] font-semibold ${branchName ? "text-slate-700 dark:text-slate-200" : "text-amber-500"}`}>{branchName || "Not assigned"}</p>
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 flex-col items-end">
                        <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400">Code</span>
                        <span className="max-w-[80px] truncate font-mono text-[9px] text-slate-500 dark:text-slate-400">{branchCode || "-"}</span>
                      </div>
                    </div>
                  </div>

                  {dept.description && (
                    <div className="mt-2 rounded-lg border border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Description</p>
                      <p title={dept.description} className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-600 dark:text-slate-300">{dept.description}</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    {canEdit && (
                      <button type="button" onClick={() => openEdit(dept)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
                        </svg>
                        Edit
                      </button>
                    )}
                    {dept.is_active ? (
                      canDelete && (
                        <button type="button" onClick={() => setConfirmRow(dept)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                          </svg>
                          Deactivate
                        </button>
                      )
                    ) : (
                      canEdit && (
                        <button type="button" onClick={() => handleReactivate(dept)} disabled={updateDept.isPending} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-600 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/40 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 4v5h-5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20v-5h5" />
                          </svg>
                          Reactivate
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className={`border-t px-4 py-2 ${dept.is_active ? "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30" : "border-red-100 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/20"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Department Status</span>
                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold ${dept.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dept.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                      {dept.is_active ? "Operational" : "Deactivated"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && !isError && filteredDepartments.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xl font-bold text-slate-400">D</span>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">No departments found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">No departments match your current search, company, branch, or status filter.</p>
          {canAdd && <Button onClick={openAdd} className="mt-4 h-9 px-4 text-sm">+ Add Department</Button>}
        </div>
      )}

      {/* PAGINATION */}
      <div className="rounded-xl border border-slate-200 bg-white px-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <TablePagination page={page} pages={data?.pages || 1} total={data?.total || 0} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>

      {/* MODALS */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? "Edit Department" : "Add Department"}>
        <DepartmentForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createDept.isPending || updateDept.isPending}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          isEdit={!!editing}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Department"
        message={confirmRow ? `Are you sure you want to deactivate "${confirmRow.department_name}"?` : "Are you sure you want to deactivate this department?"}
        confirmText="Deactivate"
        loading={deactivateDept.isPending}
      />

      <ConfirmDialog
        open={!!blockedInfo}
        onClose={() => setBlockedInfo(null)}
        onConfirm={() => setBlockedInfo(null)}
        title="Can't Deactivate Department"
        message={blockedInfo?.message || (blockedInfo?.name ? `"${blockedInfo.name}" still has active designations or employees linked to it. Deactivate/reassign those first.` : "This department still has active designations or employees linked to it. Deactivate/reassign those first.")}
        confirmText="OK, Got It"
        confirmVariant="secondary"
      />
    </div>
  );
}