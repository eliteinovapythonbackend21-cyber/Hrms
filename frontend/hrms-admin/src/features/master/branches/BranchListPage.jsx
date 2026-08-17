import { useState } from "react";

import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeactivateBranch,
} from "./useBranches";

import {
  useCompanies,
  useCompany,
} from "@/features/master/company/useCompanies";
import { masterApi } from "@/api/master.api";

import BranchForm from "./BranchForm";

import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

const EXPORT_COLUMNS = [
  { header: "Code", accessor: (r) => r.code },
  { header: "Name", accessor: (r) => r.name },
  { header: "Company", accessor: (r) => r.company?.name },
  { header: "City", accessor: (r) => r.city },
  { header: "Phone", accessor: (r) => r.phone },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

function CompanyDetailsModal({ companyId, onClose }) {
  const { data: company, isLoading } = useCompany(companyId);

  return (
    <Modal open={!!companyId} onClose={onClose} title="Company Details">
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {!isLoading && company && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-lg font-bold">{company.name?.charAt(0)?.toUpperCase() || "C"}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800 dark:text-white">{company.name}</p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{company.code}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><dt className="text-xs text-slate-400">Email</dt><dd className="mt-0.5 truncate text-slate-700 dark:text-slate-200">{company.email || "-"}</dd></div>
            <div><dt className="text-xs text-slate-400">Phone</dt><dd className="mt-0.5 truncate text-slate-700 dark:text-slate-200">{company.phone || "-"}</dd></div>
            <div><dt className="text-xs text-slate-400">Website</dt><dd className="mt-0.5 truncate text-slate-700 dark:text-slate-200">{company.website || "-"}</dd></div>
            <div><dt className="text-xs text-slate-400">City</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{company.city || "-"}</dd></div>
            <div><dt className="text-xs text-slate-400">State</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{company.state || "-"}</dd></div>
            <div><dt className="text-xs text-slate-400">Country</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{company.country || "-"}</dd></div>
            <div><dt className="text-xs text-slate-400">Pincode</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{company.pincode || "-"}</dd></div>
            <div><dt className="text-xs text-slate-400">Branches</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{Array.isArray(company.branches) ? company.branches.length : 0}</dd></div>
          </dl>

          {company.address && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Address</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{company.address}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function BranchListPage() {
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  const [blockedInfo, setBlockedInfo] = useState(null);

  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"

  const [viewingCompanyId, setViewingCompanyId] = useState(null);

  const { data: companyData } = useCompanies({ page: 1, per_page: 100 });

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useBranches({
    page,
    search,
    ...(companyId ? { company_id: companyId } : {}),
  });

  const queryParams = { page, search, ...(companyId ? { company_id: companyId } : {}) };

  // NOTE: assumes masterApi.listBranches exists, same pattern as
  // masterApi.listDepartments / listDesignations. Unverified.
  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: masterApi.listBranches,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "branches",
    title: "Branches",
  });

  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deactivateBranch = useDeactivateBranch();

  const companies = companyData?.items || companyData?.data || [];
  const branches = data?.items || data?.data || [];

  const activeBranches = branches.filter((branch) => branch.is_active);
  const inactiveBranches = branches.filter((branch) => !branch.is_active);

  const filteredBranches = branches.filter((branch) => {
    if (statusFilter === "active") return branch.is_active;
    if (statusFilter === "inactive") return !branch.is_active;
    return true;
  });

  const handleAdd = () => { setSelectedBranch(null); setModalOpen(true); };
  const handleEdit = (branch) => { setSelectedBranch(branch); setModalOpen(true); };
  const handleDelete = (branch) => { setBranchToDelete(branch); setDeleteOpen(true); };

  const handleSubmit = async (payload) => {
    const { company_id: selectedCompanyId, ...branchFields } = payload;

    if (!selectedCompanyId) {
      showToast("Please select a company", "error");
      return;
    }

    try {
      if (selectedBranch) {
        await updateBranch.mutateAsync({ id: selectedBranch.id, payload: { ...branchFields, company_id: selectedCompanyId } });
        showToast("Branch updated successfully", "success");
      } else {
        await createBranch.mutateAsync({ companyId: selectedCompanyId, payload: branchFields });
        showToast("Branch created successfully", "success");
      }
      setModalOpen(false);
      setSelectedBranch(null);
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const confirmDelete = async () => {
    if (!branchToDelete) return;

    try {
      await deactivateBranch.mutateAsync(branchToDelete.id);
      showToast("Branch deactivated successfully", "success");
      setDeleteOpen(false);
      setBranchToDelete(null);
      refetch();
    } catch (err) {
      if (err.response?.status === 409) {
        setDeleteOpen(false);
        setBlockedInfo({ name: branchToDelete?.name, message: err.response?.data?.message });
        return;
      }
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleReactivate = async (branch) => {
    try {
      await updateBranch.mutateAsync({ id: branch.id, payload: { is_active: true } });
      showToast("Branch reactivated successfully", "success");
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

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <h2 className="font-semibold">Failed to load branches</h2>
          <p className="mt-1 text-sm">{error?.response?.data?.message || error?.message || "Unable to load branches."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="text-lg font-bold">B</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Branches</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Manage company branches and their details</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Button type="button" onClick={handleAdd} className="h-10 w-full px-4 sm:w-auto">
            <span className="mr-1.5 text-lg">+</span>
            Add Branch
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Total Branches</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{branches.length}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Current page</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">B</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Active Branches</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{activeBranches.length}</p>
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
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Inactive Branches</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">{inactiveBranches.length}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">Deactivated branches</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH + COMPANY FILTER + VIEW TOGGLE + STATUS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2.5 sm:flex-row lg:max-w-2xl">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search branches..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={companyId}
              onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Companies</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
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

      {/* LOADING */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[245px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {!isLoading && viewMode === "table" && filteredBranches.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBranches.map((branch) => {
                const firstLetter = branch.name?.charAt(0)?.toUpperCase() || "B";
                return (
                  <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${branch.is_active ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"}`}>
                          {firstLetter}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{branch.name || "Unnamed Branch"}</p>
                          <p className="font-mono text-[10px] text-slate-400">{branch.code || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => branch.company?.id && setViewingCompanyId(branch.company.id)} disabled={!branch.company?.id} className="text-sm font-medium text-primary-600 hover:underline disabled:text-slate-400 disabled:no-underline dark:text-primary-400">
                        {branch.company?.name || "-"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{branch.city || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{branch.phone || "-"}</td>
                    <td className="px-4 py-3">{statusBadge(branch.is_active)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => handleEdit(branch)} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                          </svg>
                        </button>
                        {branch.is_active ? (
                          <button type="button" onClick={() => handleDelete(branch)} className="rounded-full p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" title="Deactivate">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                            </svg>
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleReactivate(branch)} disabled={updateBranch.isPending} className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10" title="Reactivate">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5" />
                            </svg>
                          </button>
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

      {/* BRANCH CARDS */}
      {!isLoading && viewMode === "card" && filteredBranches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBranches.map((branch) => {
            const firstLetter = branch.name?.charAt(0)?.toUpperCase() || "B";
            const companyName = branch.company?.name || "-";
            const companyCode = branch.company?.code || "-";

            return (
              <div key={branch.id} className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${branch.is_active ? "border-slate-200 hover:border-primary-200 dark:border-slate-700 dark:hover:border-primary-500/40" : "border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10"}`}>
                <div className={`absolute inset-x-0 top-0 h-0.5 ${branch.is_active ? "bg-primary-600" : "bg-red-500"}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold shadow-sm ${branch.is_active ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400" : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"}`}>
                        {firstLetter}
                        <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${branch.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 title={branch.name} className="truncate text-sm font-semibold text-slate-900 dark:text-white">{branch.name || "Unnamed Branch"}</h3>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Code</span>
                          <span className="truncate font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">{branch.code || "-"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">{statusBadge(branch.is_active)}</div>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <button type="button" onClick={() => branch.company?.id && setViewingCompanyId(branch.company.id)} disabled={!branch.company?.id} className="group/company flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-left transition hover:border-primary-200 hover:bg-primary-50/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-primary-500/30 dark:hover:bg-primary-500/10">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M9 15h2M15 7h2M15 11h2M15 15h2" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Company</p>
                        <p title={companyName} className="truncate text-[11px] font-semibold text-primary-600 dark:text-primary-400">{companyName}</p>
                      </div>
                    </div>
                    <div className="ml-2 flex shrink-0 flex-col items-end">
                      <span className="text-[8px] font-medium uppercase tracking-wide text-slate-400">Code</span>
                      <span className="max-w-[80px] truncate font-mono text-[9px] text-slate-500 dark:text-slate-400">{companyCode}</span>
                    </div>
                  </button>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-6.1 7-12a7 7 0 10-14 0c0 5.9 7 12 7 12z" />
                          <circle cx="12" cy="9" r="2.2" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">City</p>
                        <p title={branch.city || "-"} className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{branch.city || "-"}</p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a2 2 0 011.9 1.37l1.1 3.29a2 2 0 01-.45 2.05l-1.38 1.38a16 16 0 006.46 6.46l1.38-1.38a2 2 0 012.05-.45l3.29 1.1A2 2 0 0121 18.72V21a2 2 0 01-2 2h-1C9.72 23 1 14.28 1 4V3a2 2 0 012-2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Phone</p>
                        <p title={branch.phone || "-"} className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{branch.phone || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => handleEdit(branch)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
                      </svg>
                      Edit
                    </button>
                    {branch.is_active ? (
                      <button type="button" onClick={() => handleDelete(branch)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                        </svg>
                        Deactivate
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleReactivate(branch)} disabled={updateBranch.isPending} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-600 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/40 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 4v5h-5" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20v-5h5" />
                        </svg>
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>

                <div className={`border-t px-4 py-2 ${branch.is_active ? "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30" : "border-red-100 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/20"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Branch Status</span>
                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold ${branch.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${branch.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                      {branch.is_active ? "Operational" : "Deactivated"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && filteredBranches.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xl font-bold text-slate-400">B</span>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">No branches found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">No branches match your current search, company, or status filter.</p>
          <Button onClick={handleAdd} className="mt-4 h-9 px-4 text-sm">+ Add Branch</Button>
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>Page {page}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Previous</button>
          <button type="button" disabled={data?.pages ? page >= data.pages : false} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Next</button>
        </div>
      </div>

      {/* MODALS */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSelectedBranch(null); }} title={selectedBranch ? "Edit Branch" : "Add Branch"}>
        <BranchForm
          initialData={selectedBranch}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setSelectedBranch(null); }}
          isSubmitting={createBranch.isPending || updateBranch.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setBranchToDelete(null); }}
        onConfirm={confirmDelete}
        title="Deactivate Branch"
        message={branchToDelete ? `Are you sure you want to deactivate "${branchToDelete.name}"?` : "Are you sure you want to deactivate this branch?"}
        confirmText="Deactivate"
        loading={deactivateBranch.isPending}
      />

      <ConfirmDialog
        open={!!blockedInfo}
        onClose={() => setBlockedInfo(null)}
        onConfirm={() => setBlockedInfo(null)}
        title="Can't Deactivate Branch"
        message={blockedInfo?.message || (blockedInfo?.name ? `"${blockedInfo.name}" still has active departments linked to it. Deactivate those first.` : "This branch still has active departments linked to it. Deactivate those first.")}
        confirmText="OK, Got It"
        confirmVariant="secondary"
      />

      <CompanyDetailsModal companyId={viewingCompanyId} onClose={() => setViewingCompanyId(null)} />
    </div>
  );
}