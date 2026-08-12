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

  const activeCompanies = companies.filter(
    (company) => company.is_active
  );

  const inactiveCompanies = companies.filter(
    (company) => !company.is_active
  );

  const filteredCompanies = companies.filter((company) => {
    if (statusFilter === "active") {
      return company.is_active;
    }

    if (statusFilter === "inactive") {
      return !company.is_active;
    }

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

  const createQueuedBranches = async (
    companyId,
    branchNames
  ) => {
    if (
      !companyId ||
      !Array.isArray(branchNames) ||
      !branchNames.length
    ) {
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
    const {
      branch_names: branchNames,
      ...companyPayload
    } = payload;

    try {
      let companyId;

      if (selectedCompany) {
        await updateCompany.mutateAsync({
          id: selectedCompany.id,
          payload: companyPayload,
        });

        companyId = selectedCompany.id;

        showToast(
          "Company updated successfully",
          "success"
        );

        await createQueuedBranches(
          companyId,
          branchNames
        );
      } else {
        const created =
          await createCompany.mutateAsync(
            companyPayload
          );

        companyId =
          created?.data?.id ??
          created?.id;

        showToast(
          "Company created successfully",
          "success"
        );

        await createQueuedBranches(
          companyId,
          branchNames
        );
      }

      handleCloseModal();
      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
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
      await deactivateCompany.mutateAsync(
        companyToDelete.id
      );

      showToast(
        "Company deactivated successfully",
        "success"
      );

      setDeleteOpen(false);
      setCompanyToDelete(null);

      refetch();
    } catch (err) {
      if (err.response?.status === 409) {
        setDeleteOpen(false);

        setBlockedInfo({
          name: companyToDelete?.name,
          message:
            err.response?.data?.message,
        });

        return;
      }

      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  const handleReactivate = async (company) => {
    try {
      await updateCompany.mutateAsync({
        id: company.id,
        payload: {
          is_active: true,
        },
      });

      showToast(
        "Company reactivated successfully",
        "success"
      );

      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <h2 className="font-semibold">
            Failed to load companies
          </h2>

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

      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="text-lg font-bold">
              C
            </span>
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
          <span className="mr-1.5 text-lg">
            +
          </span>
          Add Company
        </Button>
      </div>

      {/* =========================================================
          STAT CARDS
      ========================================================= */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* TOTAL */}
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
              <span className="text-sm font-bold">
                C
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE */}
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

        {/* INACTIVE */}
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

      {/* =========================================================
          SEARCH + FILTER
      ========================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          {/* SEARCH */}
          <div className="relative w-full lg:max-w-sm">
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search companies..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* FILTER */}
          <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">

            <button
              type="button"
              onClick={() =>
                setStatusFilter("active")
              }
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
              onClick={() =>
                setStatusFilter("inactive")
              }
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
              onClick={() =>
                setStatusFilter("all")
              }
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

      {/* =========================================================
          COMPANY CARD GRID
      ========================================================= */}

      {/* LOADING */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[245px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      )}

      {/* CARDS */}
      {!isLoading &&
        filteredCompanies.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCompanies.map((company) => {
              const firstLetter =
                company.name
                  ?.charAt(0)
                  ?.toUpperCase() || "C";

              const branchCount =
                Array.isArray(company.branches)
                  ? company.branches.length
                  : 0;

              return (
                <div
                  key={company.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                    company.is_active
                      ? "border-slate-200 hover:border-primary-200 dark:border-slate-700 dark:hover:border-primary-500/40"
                      : "border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10"
                  }`}
                >

                  {/* TOP ACCENT */}
                  <div
                    className={`absolute inset-x-0 top-0 h-0.5 ${
                      company.is_active
                        ? "bg-primary-600"
                        : "bg-red-500"
                    }`}
                  />

                  <div className="p-4">

                    {/* =================================================
                        COMPANY HEADER
                    ================================================= */}
                    <div className="flex items-start justify-between gap-2.5">

                      <div className="flex min-w-0 items-center gap-2.5">

                        {/* AVATAR */}
                        <div
                          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold shadow-sm ${
                            company.is_active
                              ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {firstLetter}

                          <span
                            className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              company.is_active
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />
                        </div>

                        {/* COMPANY NAME */}
                        <div className="min-w-0">
                          <h3
                            title={company.name}
                            className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                          >
                            {company.name ||
                              "Unnamed Company"}
                          </h3>

                          <div className="mt-0.5 flex items-center gap-1">
                            <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Code
                            </span>

                            <span className="truncate font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              {company.code || "-"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* STATUS */}
                      <div className="shrink-0">
                        {statusBadge(
                          company.is_active
                        )}
                      </div>
                    </div>

                    {/* DIVIDER */}
                    <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                    {/* =================================================
                        CONTACT DETAILS
                    ================================================= */}
                    <div className="space-y-2">

                      {/* EMAIL */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 8l9 6 9-6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Email
                          </p>

                          <p
                            title={
                              company.email || "-"
                            }
                            className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200"
                          >
                            {company.email || "-"}
                          </p>
                        </div>
                      </div>

                      {/* PHONE */}
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 5a2 2 0 012-2h2.28a2 2 0 011.9 1.37l1.1 3.29a2 2 0 01-.45 2.05l-1.38 1.38a16 16 0 006.46 6.46l1.38-1.38a2 2 0 012.05-.45l3.29 1.1A2 2 0 0121 18.72V21a2 2 0 01-2 2h-1C9.72 23 1 14.28 1 4V3a2 2 0 012-2z"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Phone
                          </p>

                          <p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                            {company.phone || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* =================================================
                        BRANCH SUMMARY
                    ================================================= */}
                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">

                        <div className="flex items-center gap-2">

                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M9 15h2M15 7h2M15 11h2M15 15h2"
                              />
                            </svg>
                          </div>

                          <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Branches
                            </p>

                            <p className="text-xs font-semibold text-slate-800 dark:text-white">
                              {branchCount}{" "}
                              <span className="font-normal text-slate-400">
                                {branchCount === 1
                                  ? "Branch"
                                  : "Branches"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex h-7 min-w-7 items-center justify-center rounded-md bg-white px-2 text-[11px] font-bold text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-400">
                          {branchCount}
                        </div>
                      </div>
                    </div>

                    {/* =================================================
                        ACTIONS
                    ================================================= */}
                    <div className="mt-3 flex items-center gap-2">

                      {/* EDIT */}
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(company)
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z"
                          />

                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6"
                          />
                        </svg>

                        Edit
                      </button>

                      {/* DEACTIVATE / REACTIVATE */}
                      {company.is_active ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(company)
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M18 6L6 18M6 6l12 12"
                            />
                          </svg>

                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleReactivate(
                              company
                            )
                          }
                          disabled={
                            updateCompany.isPending
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-600 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/40 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4"
                            />

                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 4v5h-5"
                            />

                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4"
                            />

                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 20v-5h5"
                            />
                          </svg>

                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      BOTTOM STATUS STRIP
                  ================================================= */}
                  <div
                    className={`border-t px-4 py-2 ${
                      company.is_active
                        ? "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30"
                        : "border-red-100 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">

                      <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                        Company Status
                      </span>

                      <span
                        className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                          company.is_active
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            company.is_active
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        />

                        {company.is_active
                          ? "Operational"
                          : "Deactivated"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* =========================================================
          EMPTY STATE
      ========================================================= */}
      {!isLoading &&
        filteredCompanies.length === 0 && (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="text-xl font-bold text-slate-400">
                C
              </span>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
              No companies found
            </h3>

            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No companies match your current search or
              status filter.
            </p>

            <Button
              onClick={handleAdd}
              className="mt-4 h-9 px-4 text-sm"
            >
              + Add Company
            </Button>
          </div>
        )}

      {/* =========================================================
          PAGINATION
      ========================================================= */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">

        <span>
          Page {page}
        </span>

        <div className="flex gap-2">

          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((p) =>
                Math.max(1, p - 1)
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              data?.pages
                ? page >= data.pages
                : false
            }
            onClick={() =>
              setPage((p) => p + 1)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Next
          </button>

        </div>
      </div>

      {/* =========================================================
          ADD / EDIT COMPANY MODAL
      ========================================================= */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={
          selectedCompany
            ? "Edit Company"
            : "Add Company"
        }
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

      {/* =========================================================
          DEACTIVATE CONFIRMATION
      ========================================================= */}
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
        loading={
          deactivateCompany.isPending
        }
      />

      {/* =========================================================
          BLOCKED DEACTIVATION
      ========================================================= */}
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