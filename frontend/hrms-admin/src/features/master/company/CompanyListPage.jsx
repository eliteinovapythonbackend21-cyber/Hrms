import { useState } from "react";

import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeactivateCompany,
} from "./useCompanies";

import { useCreateBranch } from "@/features/master/branches/useBranches";

import CompanyForm from "./CompanyForm";

import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";

export default function CompanyListPage() {
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  // Set when the backend refuses to deactivate because active
  // branches/departments still reference this company (HTTP 409).
  const [blockedInfo, setBlockedInfo] = useState(null);

  const [statusFilter, setStatusFilter] = useState("active");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useCompanies({
    page,
    search,
  });

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deactivateCompany = useDeactivateCompany();
  const createBranch = useCreateBranch();

  const companies = data?.items || data?.data || [];

  // Active/Inactive now reflect is_active (the actual soft-delete flag,
  // same field Deactivate/Reactivate touch) instead of `status` (a
  // separate, independent "Active" checkbox on the form).
  const activeCompanies = companies.filter((c) => c.is_active);
  const inactiveCompanies = companies.filter((c) => !c.is_active);

  const filteredCompanies = companies.filter((c) => {
    if (statusFilter === "active") return c.is_active;
    if (statusFilter === "inactive") return !c.is_active;
    return true;
  });

  const handleAdd = () => {
    setSelectedCompany(null);
    setModalOpen(true);
  };

  const handleEdit = (company) => {
    setSelectedCompany(company);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedCompany(null);
  };

  const createQueuedBranches = async (companyId, branchNames) => {
    if (!companyId || !Array.isArray(branchNames) || !branchNames.length) {
      return;
    }

    for (const name of branchNames) {
      try {
        await createBranch.mutateAsync({
          companyId,
          payload: { name },
        });
      } catch (branchErr) {
        showToast(
          branchErr.response?.data?.message ||
            `Failed to add branch "${name}"`,
          "error"
        );
      }
    }
  };

  const handleSubmit = async (payload) => {
    const { branch_names: branchNames, ...companyPayload } = payload;

    try {
      let companyId;

      if (selectedCompany) {
        await updateCompany.mutateAsync({
          id: selectedCompany.id,
          payload: companyPayload,
        });

        companyId = selectedCompany.id;

        showToast("Company updated successfully", "success");

        await createQueuedBranches(companyId, branchNames);
      } else {
        const created = await createCompany.mutateAsync(companyPayload);

        companyId = created?.data?.id ?? created?.id;

        showToast("Company created successfully", "success");

        await createQueuedBranches(companyId, branchNames);
      }

      handleCloseModal();
      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Operation failed",
        "error"
      );
    }
  };

  const handleDelete = (company) => {
    setCompanyToDelete(company);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;

    try {
      await deactivateCompany.mutateAsync(companyToDelete.id);

      showToast("Company deactivated successfully", "success");

      setDeleteOpen(false);
      setCompanyToDelete(null);

      refetch();
    } catch (err) {
      // Backend blocks with 409 when active branches/departments still
      // reference this company.
      if (err.response?.status === 409) {
        setDeleteOpen(false);
        setBlockedInfo({
          name: companyToDelete?.name,
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

  const handleReactivate = async (company) => {
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        payload: { is_active: true },
      });

      showToast("Company reactivated successfully", "success");

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
          <h2 className="font-semibold">Failed to load companies</h2>
          <p className="mt-1 text-sm">
            {error?.response?.data?.message ||
              error?.message ||
              "Unable to load companies."}
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
            <span className="font-bold">C</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Company
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Manage companies and their branches
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleAdd}
          className="h-10 w-full px-4 sm:w-auto"
        >
          <span className="mr-1.5 text-lg">+</span>
          Add Company
        </Button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Companies
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {companies.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Current page
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">C</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Companies
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeCompanies.length}
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
                Inactive Companies
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveCompanies.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Deactivated companies
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
          <div className="w-full lg:max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search companies..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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

      {!isLoading && filteredCompanies.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCompanies.map((company) => {
            const firstLetter = company.name?.charAt(0)?.toUpperCase() || "C";

            return (
              <div
                key={company.id}
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
                        {company.name}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                        {company.code}
                      </p>
                    </div>
                  </div>

                  {statusBadge(company.is_active)}
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {company.email || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Phone</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {company.phone || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Branches</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {Array.isArray(company.branches)
                        ? company.branches.length
                        : 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleEdit(company)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-primary-500/10"
                  >
                    Edit
                  </button>

                  {company.is_active ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(company)}
                      className="flex-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReactivate(company)}
                      disabled={updateCompany.isPending}
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
      {!isLoading && filteredCompanies.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xl font-bold text-slate-400">C</span>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
            No companies found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No companies match your current search or status filter.
          </p>
          <Button onClick={handleAdd} className="mt-4 h-9 px-4 text-sm">
            + Add Company
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

      {/* ADD / EDIT COMPANY MODAL */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={selectedCompany ? "Edit Company" : "Add Company"}
      >
        <CompanyForm
          initialData={selectedCompany || {}}
          isEdit={!!selectedCompany}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={
            createCompany.isPending ||
            updateCompany.isPending ||
            createBranch.isPending
          }
        />
      </Modal>

      {/* DEACTIVATE CONFIRMATION */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setCompanyToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Deactivate Company"
        message={
          companyToDelete
            ? `Are you sure you want to deactivate "${companyToDelete.name}"?`
            : "Are you sure you want to deactivate this company?"
        }
        confirmText="Deactivate"
        loading={deactivateCompany.isPending}
      />

      {/* BLOCKED — has active branches/departments */}
      <ConfirmDialog
        open={!!blockedInfo}
        onClose={() => setBlockedInfo(null)}
        onConfirm={() => setBlockedInfo(null)}
        title="Can't Deactivate Company"
        message={
          blockedInfo?.message ||
          (blockedInfo?.name
            ? `"${blockedInfo.name}" still has active branches or departments linked to it. Deactivate those first.`
            : "This company still has active branches or departments linked to it. Deactivate those first.")
        }
        confirmText="OK, Got It"
        confirmVariant="secondary"
      />
    </div>
  );
}