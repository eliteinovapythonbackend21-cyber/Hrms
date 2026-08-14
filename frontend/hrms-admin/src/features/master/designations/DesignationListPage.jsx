import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  useDesignations,
  useCreateDesignation,
  useUpdateDesignation,
  useDeactivateDesignation,
} from "./useDesignations";

import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";
import { masterApi } from "@/api/master.api";

import DesignationForm from "./DesignationForm";

import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";

export default function DesignationListPage() {
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [designationToDelete, setDesignationToDelete] = useState(null);

  const [blockedInfo, setBlockedInfo] = useState(null);

  const [statusFilter, setStatusFilter] = useState("active");

  /* =========================================================
     COMPANY / BRANCH / DEPARTMENT FILTER (cascading, same
     select style as the Branches page's Company filter)
  ========================================================= */

  const [companyFilterId, setCompanyFilterId] = useState("");
  const [branchFilterId, setBranchFilterId] = useState("");
  const [departmentFilterId, setDepartmentFilterId] = useState("");

  const { data: companyData } = useCompanies({
    page: 1,
    per_page: 100,
    is_active: true,
  });

  const { data: branchData } = useCompanyBranches(
    companyFilterId,
    { page: 1, per_page: 100, is_active: true }
  );

  const { data: departmentData } = useQuery({
    queryKey: ["departments-filter", branchFilterId],
    queryFn: async () =>
      (
        await masterApi.listDepartments({
          branch_id: branchFilterId,
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
    enabled: !!branchFilterId,
  });

  const filterCompanies = companyData?.items || companyData?.data || [];
  const filterBranches = branchData?.items || branchData?.data || [];
  const filterDepartments = departmentData?.items || [];

  const handleCompanyFilterChange = (e) => {
    setCompanyFilterId(e.target.value);
    setBranchFilterId("");
    setDepartmentFilterId("");
    setPage(1);
  };

  const handleBranchFilterChange = (e) => {
    setBranchFilterId(e.target.value);
    setDepartmentFilterId("");
    setPage(1);
  };

  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilterId(e.target.value);
    setPage(1);
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useDesignations({
    page,
    search,
    department_id: departmentFilterId || undefined,
  });

  const createDesignation = useCreateDesignation();
  const updateDesignation = useUpdateDesignation();
  const deactivateDesignation = useDeactivateDesignation();

  const designations = data?.items || data?.data || [];

  const activeDesignations = designations.filter(
    (designation) => designation.is_active
  );

  const inactiveDesignations = designations.filter(
    (designation) => !designation.is_active
  );

  const filteredDesignations = designations.filter((designation) => {
    if (statusFilter === "active") {
      return designation.is_active;
    }

    if (statusFilter === "inactive") {
      return !designation.is_active;
    }

    return true;
  });

  /* =========================================================
     HELPERS
  ========================================================= */

  const getDepartment = (designation) => {
    return (
      designation?.department ||
      designation?.department_details ||
      null
    );
  };

  const getCompany = (designation) => {
    const department = getDepartment(designation);

    return (
      designation?.company ||
      designation?.company_details ||
      department?.company ||
      department?.company_details ||
      null
    );
  };

  const getBranch = (designation) => {
    const department = getDepartment(designation);
    const company = getCompany(designation);

    return (
      designation?.branch ||
      designation?.branch_details ||
      department?.branch ||
      department?.branch_details ||
      company?.branch ||
      company?.branch_details ||
      null
    );
  };

  const getCompanyName = (designation) => {
    const company = getCompany(designation);

    return (
      company?.name ||
      designation?.company_name ||
      designation?.company?.name ||
      "-"
    );
  };

  const getBranchName = (designation) => {
    const branch = getBranch(designation);

    return (
      branch?.name ||
      designation?.branch_name ||
      designation?.branch?.name ||
      "-"
    );
  };

  const getDepartmentName = (designation) => {
    const department = getDepartment(designation);

    return (
      department?.department_name ||
      department?.name ||
      designation?.department_name ||
      "-"
    );
  };

  const getDepartmentCode = (designation) => {
    const department = getDepartment(designation);

    return (
      department?.department_code ||
      designation?.department_code ||
      "-"
    );
  };

  const getEmployeeCount = (designation) => {
    if (Array.isArray(designation?.employees)) {
      return designation.employees.length;
    }

    if (typeof designation?.employee_count === "number") {
      return designation.employee_count;
    }

    return 0;
  };

  /* =========================================================
     ADD / EDIT
  ========================================================= */

  const handleAdd = () => {
    setSelectedDesignation(null);
    setModalOpen(true);
  };

  const handleEdit = (designation) => {
    setSelectedDesignation(designation);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedDesignation(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (selectedDesignation) {
        await updateDesignation.mutateAsync({
          id: selectedDesignation.id,
          payload,
        });

        showToast(
          "Designation updated successfully",
          "success"
        );
      } else {
        await createDesignation.mutateAsync(payload);

        showToast(
          "Designation created successfully",
          "success"
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

  /* =========================================================
     DELETE / DEACTIVATE
  ========================================================= */

  const handleDelete = (designation) => {
    setDesignationToDelete(designation);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!designationToDelete) return;

    try {
      await deactivateDesignation.mutateAsync(
        designationToDelete.id
      );

      showToast(
        "Designation deactivated successfully",
        "success"
      );

      setDeleteOpen(false);
      setDesignationToDelete(null);

      refetch();
    } catch (err) {
      if (err.response?.status === 409) {
        setDeleteOpen(false);

        setBlockedInfo({
          name: designationToDelete?.designation_name,
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

  /* =========================================================
     REACTIVATE
  ========================================================= */

  const handleReactivate = async (designation) => {
    try {
      await updateDesignation.mutateAsync({
        id: designation.id,
        payload: {
          is_active: true,
        },
      });

      showToast(
        "Designation reactivated successfully",
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

  /* =========================================================
     STATUS BADGE
  ========================================================= */

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

  /* =========================================================
     ERROR
  ========================================================= */

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <h2 className="font-semibold">
            Failed to load designations
          </h2>

          <p className="mt-1 text-sm">
            {error?.response?.data?.message ||
              error?.message ||
              "Unable to load designations."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="text-lg font-bold">
              D
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Designations
            </h1>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Manage designations across companies, branches and departments
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

          Add Designation
        </Button>
      </div>

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* TOTAL */}

        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Designations
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {designations.length}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Current page
              </p>

            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">
                D
              </span>
            </div>

          </div>
        </div>

        {/* ACTIVE */}

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">

            <div className="min-w-0">

              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Designations
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeDesignations.length}
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
                Inactive Designations
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveDesignations.length}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Deactivated designations
              </p>

            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>

          </div>
        </div>

      </div>

      {/* =====================================================
          SEARCH + COMPANY/BRANCH/DEPARTMENT FILTER + STATUS
      ===================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

          <div className="flex w-full flex-col gap-2.5 sm:flex-row xl:max-w-4xl">

            {/* SEARCH */}

            <div className="relative w-full sm:max-w-xs">

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
                placeholder="Search designations..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />

            </div>

            {/* COMPANY */}
            <select
              value={companyFilterId}
              onChange={handleCompanyFilterChange}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Companies</option>

              {filterCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            {/* BRANCH (scoped to company) */}
            <select
              value={branchFilterId}
              onChange={handleBranchFilterChange}
              disabled={!companyFilterId}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                {companyFilterId ? "All Branches" : "Select a company first"}
              </option>

              {filterBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>

            {/* DEPARTMENT (scoped to branch) */}
            <select
              value={departmentFilterId}
              onChange={handleDepartmentFilterChange}
              disabled={!branchFilterId}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                {branchFilterId ? "All Departments" : "Select a branch first"}
              </option>

              {filterDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.department_name}
                </option>
              ))}
            </select>

          </div>

          {/* STATUS FILTER */}

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

      {/* =====================================================
          LOADING
      ===================================================== */}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[330px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}

        </div>
      )}

      {/* =====================================================
          DESIGNATION CARDS
      ===================================================== */}

      {!isLoading &&
        filteredDesignations.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">

            {filteredDesignations.map((designation) => {

              const firstLetter =
                designation.designation_name
                  ?.charAt(0)
                  ?.toUpperCase() || "D";

              const companyName =
                getCompanyName(designation);

              const branchName =
                getBranchName(designation);

              const departmentName =
                getDepartmentName(designation);

              const departmentCode =
                getDepartmentCode(designation);

              const employeeCount =
                getEmployeeCount(designation);

              return (
                <div
                  key={designation.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                    designation.is_active
                      ? "border-slate-200 hover:border-primary-200 dark:border-slate-700 dark:hover:border-primary-500/40"
                      : "border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10"
                  }`}
                >

                  {/* TOP ACCENT */}

                  <div
                    className={`absolute inset-x-0 top-0 h-0.5 ${
                      designation.is_active
                        ? "bg-primary-600"
                        : "bg-red-500"
                    }`}
                  />

                  <div className="p-4">

                    {/* =================================================
                        DESIGNATION HEADER
                    ================================================= */}

                    <div className="flex items-start justify-between gap-2.5">

                      <div className="flex min-w-0 items-center gap-2.5">

                        {/* AVATAR */}

                        <div
                          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold shadow-sm ${
                            designation.is_active
                              ? "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                              : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {firstLetter}

                          <span
                            className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                              designation.is_active
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />

                        </div>

                        {/* NAME */}

                        <div className="min-w-0">

                          <h3
                            title={
                              designation.designation_name
                            }
                            className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                          >
                            {designation.designation_name ||
                              "Unnamed Designation"}
                          </h3>

                          <div className="mt-0.5 flex items-center gap-1">

                            <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Code
                            </span>

                            <span className="truncate font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              {designation.designation_code ||
                                "-"}
                            </span>

                          </div>

                        </div>

                      </div>

                      {/* STATUS */}

                      <div className="shrink-0">
                        {statusBadge(
                          designation.is_active
                        )}
                      </div>

                    </div>

                    {/* DIVIDER */}

                    <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                    {/* =================================================
                        COMPANY
                    ================================================= */}

                    <div className="space-y-2">

                      <div className="flex items-center gap-2.5">

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">

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

                        <div className="min-w-0 flex-1">

                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Company
                          </p>

                          <p
                            title={companyName}
                            className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                          >
                            {companyName}
                          </p>

                        </div>

                      </div>

                      {/* =================================================
                          BRANCH
                      ================================================= */}

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
                              d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"
                            />

                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 7h2M9 11h2M15 7h2M15 11h2"
                            />
                          </svg>

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Branch
                          </p>

                          <p
                            title={branchName}
                            className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200"
                          >
                            {branchName}
                          </p>

                        </div>

                      </div>

                      {/* =================================================
                          DEPARTMENT
                      ================================================= */}

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
                              d="M4 6h16M4 12h16M4 18h16"
                            />
                          </svg>

                        </div>

                        <div className="min-w-0 flex-1">

                          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                            Department
                          </p>

                          <div className="flex min-w-0 items-center gap-1.5">

                            <p
                              title={departmentName}
                              className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                            >
                              {departmentName}
                            </p>

                            {departmentCode !== "-" && (
                              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {departmentCode}
                              </span>
                            )}

                          </div>

                        </div>

                      </div>

                    </div>

                    {/* =================================================
                        EMPLOYEE SUMMARY
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
                                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                              />

                              <circle
                                cx="9"
                                cy="7"
                                r="4"
                              />

                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                              />
                            </svg>

                          </div>

                          <div>

                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Employees
                            </p>

                            <p className="text-xs font-semibold text-slate-800 dark:text-white">

                              {employeeCount}

                              <span className="font-normal text-slate-400">
                                {" "}
                                {employeeCount === 1
                                  ? "Employee"
                                  : "Employees"}
                              </span>

                            </p>

                          </div>

                        </div>

                        <div className="flex h-7 min-w-7 items-center justify-center rounded-md bg-white px-2 text-[11px] font-bold text-primary-600 shadow-sm dark:bg-slate-900 dark:text-primary-400">
                          {employeeCount}
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
                          handleEdit(designation)
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

                      {designation.is_active ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              designation
                            )
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
                              designation
                            )
                          }
                          disabled={
                            updateDesignation.isPending
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
                      designation.is_active
                        ? "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30"
                        : "border-red-100 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/20"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                        Designation Status
                      </span>

                      <span
                        className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                          designation.is_active
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >

                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            designation.is_active
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        />

                        {designation.is_active
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

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {!isLoading &&
        filteredDesignations.length === 0 && (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">

            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="text-xl font-bold text-slate-400">
                D
              </span>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
              No designations found
            </h3>

            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No designations match your current search, company, branch, department, or status filter.
            </p>

            <Button
              onClick={handleAdd}
              className="mt-4 h-9 px-4 text-sm"
            >
              + Add Designation
            </Button>

          </div>
        )}

      {/* =====================================================
          PAGINATION
      ===================================================== */}

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

      {/* =====================================================
          ADD / EDIT DESIGNATION MODAL
      ===================================================== */}

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={
          selectedDesignation
            ? "Edit Designation"
            : "Add Designation"
        }
      >

        <DesignationForm
          initialData={
            selectedDesignation || {}
          }
          isEdit={!!selectedDesignation}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={
            createDesignation.isPending ||
            updateDesignation.isPending
          }
        />

      </Modal>

      {/* =====================================================
          DEACTIVATE CONFIRMATION
      ===================================================== */}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDesignationToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Deactivate Designation"
        message={
          designationToDelete
            ? `Are you sure you want to deactivate "${designationToDelete.designation_name}"?`
            : "Are you sure you want to deactivate this designation?"
        }
        confirmText="Deactivate"
        loading={
          deactivateDesignation.isPending
        }
      />

      {/* =====================================================
          BLOCKED DEACTIVATION
      ===================================================== */}

      <ConfirmDialog
        open={!!blockedInfo}
        onClose={() => setBlockedInfo(null)}
        onConfirm={() => setBlockedInfo(null)}
        title="Can't Deactivate Designation"
        message={
          blockedInfo?.message ||
          (blockedInfo?.name
            ? `"${blockedInfo.name}" cannot be deactivated because it still has active employees or related records.`
            : "This designation cannot be deactivated because it still has active records linked to it.")
        }
        confirmText="OK, Got It"
        confirmVariant="secondary"
      />

    </div>
  );
}