import { useState } from "react";

import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeactivateBranch,
} from "./useBranches";

import { useCompanies, useCompany } from "@/features/master/company/useCompanies";

import BranchForm from "./BranchForm";

import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";

function CompanyDetailsModal({ companyId, onClose }) {
  const { data: company, isLoading } = useCompany(companyId);

  return (
    <Modal open={!!companyId} onClose={onClose} title="Company Details">
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      )}

      {!isLoading && company && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-lg font-bold">
                {company.name?.charAt(0)?.toUpperCase() || "C"}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">
                {company.name}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {company.code}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-400">Email</dt>
            <dd className="truncate text-slate-700 dark:text-slate-200">
              {company.email || "-"}
            </dd>
            <dt className="text-slate-400">Phone</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {company.phone || "-"}
            </dd>
            <dt className="text-slate-400">Website</dt>
            <dd className="truncate text-slate-700 dark:text-slate-200">
              {company.website || "-"}
            </dd>
            <dt className="text-slate-400">City</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {company.city || "-"}
            </dd>
            <dt className="text-slate-400">State</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {company.state || "-"}
            </dd>
            <dt className="text-slate-400">Country</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {company.country || "-"}
            </dd>
            <dt className="text-slate-400">Pincode</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {company.pincode || "-"}
            </dd>
            <dt className="text-slate-400">Branches</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {Array.isArray(company.branches) ? company.branches.length : 0}
            </dd>
          </dl>

          {company.address && (
            <div>
              <p className="text-xs text-slate-400">Address</p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                {company.address}
              </p>
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

  const [viewingCompanyId, setViewingCompanyId] = useState(null);

  // Feeds the "All Companies" filter dropdown — shows everything,
  // deliberately separate from BranchForm's own active-only fetch.
  const { data: companyData } = useCompanies({
    page: 1,
    per_page: 100,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useBranches({
    page,
    search,
    ...(companyId ? { company_id: companyId } : {}),
  });

  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deactivateBranch = useDeactivateBranch();

  const companies = companyData?.items || companyData?.data || [];

  const branches = data?.items || data?.data || [];

  const activeBranches = branches.filter((b) => b.is_active);
  const inactiveBranches = branches.filter((b) => !b.is_active);

  const filteredBranches = branches.filter((b) => {
    if (statusFilter === "active") return b.is_active;
    if (statusFilter === "inactive") return !b.is_active;
    return true;
  });

  const handleAdd = () => {
    setSelectedBranch(null);
    setModalOpen(true);
  };

  const handleEdit = (branch) => {
    setSelectedBranch(branch);
    setModalOpen(true);
  };

  const handleDelete = (branch) => {
    setBranchToDelete(branch);
    setDeleteOpen(true);
  };

  const handleSubmit = async (payload) => {
    const { company_id: selectedCompanyId, ...branchFields } = payload;

    if (!selectedCompanyId) {
      showToast("Please select a company", "error");
      return;
    }

    try {
      if (selectedBranch) {
        await updateBranch.mutateAsync({
          id: selectedBranch.id,
          payload: {
            ...branchFields,
            company_id: selectedCompanyId,
          },
        });

        showToast("Branch updated successfully", "success");
      } else {
        await createBranch.mutateAsync({
          companyId: selectedCompanyId,
          payload: branchFields,
        });

        showToast("Branch created successfully", "success");
      }

      setModalOpen(false);
      setSelectedBranch(null);

      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Operation failed",
        "error"
      );
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
        setBlockedInfo({
          name: branchToDelete?.name,
          message: err.response?.data?.message,
        });
        return;
      }

      showToast(
        err.response?.data?.message || "Operation failed",
        "error"
      );
    }
  };

  const handleReactivate = async (branch) => {
    try {
      await updateBranch.mutateAsync({
        id: branch.id,
        payload: { is_active: true },
      });

      showToast("Branch reactivated successfully", "success");

      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Operation failed",
        "error"
      );
    }
  };

  const statusBadge = (isActive) => (
    <Badge
      className={
        isActive
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
      }
    >
      <span
        className={
          isActive
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
            : "h-1.5 w-1.5 rounded-full bg-red-500"
        }
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
          <h2 className="font-semibold">Failed to load branches</h2>
          <p className="mt-1 text-sm">
            {error?.response?.data?.message ||
              error?.message ||
              "Unable to load branches."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="font-bold">B</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Branches
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Manage company branches — click a card to see its company
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          className="h-10 w-full px-4 sm:w-auto"
        >
          <span className="mr-1.5 text-lg">+</span>
          Add Branch
        </Button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Branches
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {branches.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Current page
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">B</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Branches
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeBranches.length}
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
                Inactive Branches
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveBranches.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Deactivated branches
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-2xl">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search branches..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs dark:border-slate-600 dark:bg-slate-800"
            />

            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
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

      {/* CARD GRID */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[170px] animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      )}

      {!isLoading && filteredBranches.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBranches.map((branch) => {
            const firstLetter = branch.name?.charAt(0)?.toUpperCase() || "B";

            return (
              <div
                key={branch.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                      <span className="text-sm font-bold">
                        {firstLetter}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800 dark:text-white">
                        {branch.name}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                        {branch.code}
                      </p>
                    </div>
                  </div>

                  {statusBadge(branch.is_active)}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    branch.company?.id &&
                    setViewingCompanyId(branch.company.id)
                  }
                  disabled={!branch.company?.id}
                  className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-left text-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <span className="text-slate-400">Company</span>
                  <span className="truncate font-medium text-primary-600 dark:text-primary-400">
                    {branch.company?.name || "-"}
                  </span>
                </button>

                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">City</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {branch.city || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {branch.phone || "-"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleEdit(branch)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-primary-500/10"
                  >
                    Edit
                  </button>

                  {branch.is_active ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(branch)}
                      className="flex-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReactivate(branch)}
                      disabled={updateBranch.isPending}
                      className="flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && filteredBranches.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xl font-bold text-slate-400">B</span>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
            No branches found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No branches match your current search, company, or status filter.
          </p>
          <Button onClick={handleAdd} className="mt-4 h-9 px-4 text-sm">
            + Add Branch
          </Button>
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>Page {page}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={data?.pages ? page >= data.pages : false}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBranch(null);
        }}
        title={selectedBranch ? "Edit Branch" : "Add Branch"}
      >
        <BranchForm
          initialData={selectedBranch}
          onSubmit={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            setSelectedBranch(null);
          }}
          isSubmitting={
            createBranch.isPending || updateBranch.isPending
          }
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setBranchToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Deactivate Branch"
        message={
          branchToDelete
            ? `Are you sure you want to deactivate "${branchToDelete.name}"?`
            : "Are you sure you want to deactivate this branch?"
        }
        confirmText="Deactivate"
        loading={deactivateBranch.isPending}
      />

      {/* BLOCKED — has active departments */}
      <ConfirmDialog
        open={!!blockedInfo}
        onClose={() => setBlockedInfo(null)}
        onConfirm={() => setBlockedInfo(null)}
        title="Can't Deactivate Branch"
        message={
          blockedInfo?.message ||
          (blockedInfo?.name
            ? `"${blockedInfo.name}" still has active departments linked to it. Deactivate those first.`
            : "This branch still has active departments linked to it. Deactivate those first.")
        }
        confirmText="OK, Got It"
        confirmVariant="secondary"
      />

      <CompanyDetailsModal
        companyId={viewingCompanyId}
        onClose={() => setViewingCompanyId(null)}
      />
    </div>
  );
}