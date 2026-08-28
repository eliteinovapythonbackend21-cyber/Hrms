import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  usePerformanceReviews,
  useCreatePerformanceReview,
  useUpdatePerformanceReview,
  useDeactivatePerformanceReview,
} from "./usePerformanceReviews";

import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";
import { masterApi } from "@/api/master.api";
import { employeeLifecycleApi } from "@/api/employee.api";

import PerformanceReviewForm from "./PerformanceReviewForm";

import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

const HIERARCHY_LEVELS = [
  { value: "Level 1", label: "Level 1" },
  { value: "Level 2", label: "Level 2" },
  { value: "Level 3", label: "Level 3" },
  { value: "Level 4", label: "Level 4" },
  { value: "Level 5", label: "Level 5" },
];

const EXPORT_COLUMNS = [
  {
    header: "Employee ID",
    accessor: (row) => row.employee?.employee_code || row.employee_id || "-",
  },
  {
    header: "Review Period",
    accessor: (row) => row.review_period || "-",
  },
  {
    header: "Company",
    accessor: (row) => row.company?.name || row.company_name || "-",
  },
  {
    header: "Branch",
    accessor: (row) => row.branch?.name || row.branch_name || "-",
  },
  {
    header: "Department",
    accessor: (row) =>
      row.department?.department_name ||
      row.department_name ||
      "-",
  },
  {
    header: "Designation",
    accessor: (row) =>
      row.designation?.designation_name ||
      row.designation_name ||
      "-",
  },
  {
    header: "Hierarchy Level",
    accessor: (row) => row.hierarchy_level || "-",
  },
  {
    header: "Day-to-Day Performance",
    accessor: (row) => row.day_to_day_performance ?? "-",
  },
  {
    header: "Work Performance",
    accessor: (row) => row.work_performance ?? "-",
  },
  {
    header: "Behavioral Performance",
    accessor: (row) => row.behavioral_performance ?? "-",
  },
  {
    header: "Overall Rating",
    accessor: (row) => row.rating ?? "-",
  },
  {
    header: "Status",
    accessor: (row) => (row.is_active ? "Active" : "Inactive"),
  },
];

export default function PerformanceReviewListPage() {
  const { showToast } = useToast();

  // ============================================================
  // PAGE / SEARCH
  // ============================================================

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // ============================================================
  // MODALS
  // ============================================================

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const [blockedInfo, setBlockedInfo] = useState(null);

  // ============================================================
  // STATUS / VIEW
  // ============================================================

  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("table");

  // ============================================================
  // ORGANIZATION FILTERS
  // ============================================================

  const [companyFilterId, setCompanyFilterId] = useState("");
  const [branchFilterId, setBranchFilterId] = useState("");
  const [departmentFilterId, setDepartmentFilterId] = useState("");
  const [designationFilterId, setDesignationFilterId] = useState("");
  const [hierarchyLevelFilter, setHierarchyLevelFilter] = useState("");

  // ============================================================
  // COMPANY
  // ============================================================

  const { data: companyData } = useCompanies({
    page: 1,
    per_page: 100,
    is_active: true,
  });

  // ============================================================
  // BRANCH
  // ============================================================

  const { data: branchData } = useCompanyBranches(
    companyFilterId,
    {
      page: 1,
      per_page: 100,
      is_active: true,
    }
  );

  // ============================================================
  // DEPARTMENT
  //
  // Matches EmployeeListPage's proven-working query exactly:
  // filters by branch_id only, single .data.data unwrap, and
  // only fires once a branch is actually selected.
  // ============================================================

  const { data: departmentData } = useQuery({
    queryKey: [
      "performance-page",
      "departments-filter",
      branchFilterId,
    ],

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

  // ============================================================
  // DESIGNATION
  //
  // Matches EmployeeListPage's proven-working query exactly:
  // filters by department_id only, single .data.data unwrap,
  // and only fires once a department is actually selected.
  // ============================================================

  const { data: designationData } = useQuery({
    queryKey: [
      "performance-page",
      "designations-filter",
      departmentFilterId,
    ],

    queryFn: async () =>
      (
        await masterApi.listDesignations({
          department_id: departmentFilterId,
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,

    enabled: !!departmentFilterId,
  });

  // ============================================================
  // NORMALIZE FILTER DATA
  // ============================================================

  const filterCompanies =
    companyData?.items ||
    companyData?.data ||
    [];

  const filterBranches =
    branchData?.items ||
    branchData?.data ||
    [];

  const filterDepartments =
    departmentData?.items || [];

  const filterDesignations =
    designationData?.items || [];

  // ============================================================
  // FILTER HANDLERS
  // ============================================================

  const handleCompanyFilterChange = (event) => {
    const value = event.target.value;

    setCompanyFilterId(value);
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
    setPage(1);
  };

  const handleBranchFilterChange = (event) => {
    const value = event.target.value;

    setBranchFilterId(value);
    setDepartmentFilterId("");
    setDesignationFilterId("");
    setPage(1);
  };

  const handleDepartmentFilterChange = (event) => {
    const value = event.target.value;

    setDepartmentFilterId(value);
    setDesignationFilterId("");
    setPage(1);
  };

  const handleDesignationFilterChange = (event) => {
    setDesignationFilterId(event.target.value);
    setPage(1);
  };

  const handleHierarchyLevelFilterChange = (event) => {
    setHierarchyLevelFilter(event.target.value);
    setPage(1);
  };

  // ============================================================
  // PERFORMANCE QUERY
  // ============================================================

  const queryParams = {
    page,
    search: search || undefined,
    company_id: companyFilterId || undefined,
    branch_id: branchFilterId || undefined,
    department_id: departmentFilterId || undefined,
    designation_id: designationFilterId || undefined,
    hierarchy_level: hierarchyLevelFilter || undefined,
  };

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePerformanceReviews(queryParams);

  // ============================================================
  // EXPORT
  // ============================================================

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: employeeLifecycleApi.performance.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "performance_reviews",
    title: "Performance Reviews",
  });

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createPerformanceReview =
    useCreatePerformanceReview();

  const updatePerformanceReview =
    useUpdatePerformanceReview();

  const deactivatePerformanceReview =
    useDeactivatePerformanceReview();

  // ============================================================
  // DATA
  // ============================================================

  const reviews =
    data?.items ||
    data?.data ||
    [];

  const activeReviews = reviews.filter(
    (review) => review.is_active
  );

  const inactiveReviews = reviews.filter(
    (review) => !review.is_active
  );

  const filteredReviews = reviews.filter((review) => {
    if (statusFilter === "active") {
      return review.is_active;
    }

    if (statusFilter === "inactive") {
      return !review.is_active;
    }

    return true;
  });

  // ============================================================
  // HELPERS
  // ============================================================

  const getEmployee = (review) =>
    review?.employee || null;

  const getEmployeeName = (review) => {
    const employee = getEmployee(review);

    if (!employee) {
      return review?.employee_name || "-";
    }

    const fullName = [
      employee.first_name,
      employee.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return fullName || employee.employee_code || "-";
  };

  const getEmployeeCode = (review) =>
    review?.employee?.employee_code ||
    review?.employee_code ||
    review?.employee_id ||
    "-";

  const getCompanyName = (review) =>
    review?.company?.name ||
    review?.company_name ||
    "-";

  const getBranchName = (review) =>
    review?.branch?.name ||
    review?.branch_name ||
    "-";

  const getDepartmentName = (review) =>
    review?.department?.department_name ||
    review?.department?.name ||
    review?.department_name ||
    "-";

  const getDesignationName = (review) =>
    review?.designation?.designation_name ||
    review?.designation?.name ||
    review?.designation_name ||
    "-";

  // ============================================================
  // ADD / EDIT
  // ============================================================

  const handleAdd = () => {
    setSelectedReview(null);
    setModalOpen(true);
  };

  const handleEdit = (review) => {
    setSelectedReview(review);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedReview(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (selectedReview) {
        await updatePerformanceReview.mutateAsync({
          id: selectedReview.id,
          payload,
        });

        showToast(
          "Performance review updated successfully",
          "success"
        );
      } else {
        await createPerformanceReview.mutateAsync(
          payload
        );

        showToast(
          "Performance review created successfully",
          "success"
        );
      }

      handleCloseModal();
      refetch();
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  // ============================================================
  // DEACTIVATE
  // ============================================================

  const handleDelete = (review) => {
    setReviewToDelete(review);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;

    try {
      await deactivatePerformanceReview.mutateAsync(
        reviewToDelete.id
      );

      showToast(
        "Performance review deactivated successfully",
        "success"
      );

      setDeleteOpen(false);
      setReviewToDelete(null);

      refetch();
    } catch (err) {
      if (err?.response?.status === 409) {
        setDeleteOpen(false);

        setBlockedInfo({
          name: getEmployeeName(reviewToDelete),
          message:
            err?.response?.data?.message ||
            "This performance review cannot be deactivated.",
        });

        return;
      }

      showToast(
        err?.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  // ============================================================
  // REACTIVATE
  // ============================================================

  const handleReactivate = async (review) => {
    try {
      await updatePerformanceReview.mutateAsync({
        id: review.id,
        payload: {
          is_active: true,
        },
      });

      showToast(
        "Performance review reactivated successfully",
        "success"
      );

      refetch();
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  // ============================================================
  // STATUS BADGE
  // ============================================================

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

  // ============================================================
  // ERROR
  // ============================================================

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <h2 className="font-semibold">
            Failed to load performance reviews
          </h2>

          <p className="mt-1 text-sm">
            {error?.response?.data?.message ||
              error?.message ||
              "Unable to load performance reviews."}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-5">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="text-lg font-bold">P</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Performance Reviews
            </h1>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Manage employee performance review records
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

          <Button
            type="button"
            onClick={handleAdd}
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">+</span>
            Add Review
          </Button>
        </div>
      </div>

      {/* ======================================================
          STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Reviews
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {reviews.length}
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Current page
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">P</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Reviews
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeReviews.length}
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Currently active
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm dark:border-red-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Inactive Reviews
              </p>

              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveReviews.length}
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Deactivated reviews
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          SEARCH + ORGANIZATION FILTERS
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">

          {/* SEARCH */}
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search review period..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />

          {/* COMPANY */}
          <select
            value={companyFilterId}
            onChange={handleCompanyFilterChange}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Companies</option>

            {filterCompanies.map((company) => (
              <option
                key={company.id}
                value={company.id}
              >
                {company.name}
              </option>
            ))}
          </select>

          {/* BRANCH */}
          <select
            value={branchFilterId}
            onChange={handleBranchFilterChange}
            disabled={!companyFilterId}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">
              {companyFilterId
                ? "All Branches"
                : "Select company first"}
            </option>

            {filterBranches.map((branch) => (
              <option
                key={branch.id}
                value={branch.id}
              >
                {branch.name}
              </option>
            ))}
          </select>

          {/* DEPARTMENT */}
          <select
            value={departmentFilterId}
            onChange={handleDepartmentFilterChange}
            disabled={!branchFilterId}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">
              {branchFilterId
                ? "All Departments"
                : "Select branch first"}
            </option>

            {filterDepartments.map((department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.department_name}
              </option>
            ))}
          </select>

          {/* DESIGNATION */}
          <select
            value={designationFilterId}
            onChange={handleDesignationFilterChange}
            disabled={!departmentFilterId}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">
              {departmentFilterId
                ? "All Designations"
                : "Select department first"}
            </option>

            {filterDesignations.map((designation) => (
              <option
                key={designation.id}
                value={designation.id}
              >
                {designation.designation_name}
              </option>
            ))}
          </select>

          {/* HIERARCHY LEVEL */}
          <select
            value={hierarchyLevelFilter}
            onChange={handleHierarchyLevelFilterChange}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Hierarchy Levels</option>

            {HIERARCHY_LEVELS.map((level) => (
              <option
                key={level.value}
                value={level.value}
              >
                {level.label}
              </option>
            ))}
          </select>
        </div>

        {/* STATUS + VIEW */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">

          <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                statusFilter === "active"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              Active
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                statusFilter === "inactive"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              Inactive
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                statusFilter === "all"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              All
            </button>
          </div>

          <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("table")}
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
              onClick={() => setViewMode("card")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                viewMode === "card"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              Card
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================
          LOADING
      ====================================================== */}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading performance reviews...
          </p>
        </div>
      )}

      {/* ======================================================
          TABLE

          Company / Branch / Department / Designation / Hierarchy
          Level columns intentionally removed here per request -
          they're still available in the filter bar above and in
          the Excel/PDF export, and still shown in the Card view.
      ====================================================== */}

      {!isLoading &&
        viewMode === "table" &&
        filteredReviews.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Review Period</th>
                  <th className="px-4 py-3">Day-to-Day</th>
                  <th className="px-4 py-3">Work</th>
                  <th className="px-4 py-3">Behavior</th>
                  <th className="px-4 py-3">Overall</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredReviews.map((review) => (
                  <tr
                    key={review.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          {getEmployeeName(review)}
                        </p>

                        <p className="font-mono text-[10px] text-slate-400">
                          {getEmployeeCode(review)}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {review.review_period || "-"}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {review.day_to_day_performance ?? "-"}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {review.work_performance ?? "-"}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {review.behavioral_performance ?? "-"}
                    </td>

                    <td className="px-4 py-3 font-semibold">
                      {review.rating ?? "-"}
                    </td>

                    <td className="px-4 py-3">
                      {statusBadge(review.is_active)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">

                        {/* EDIT */}
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(review)
                          }
                          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                          title="Edit"
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
                        </button>

                        {/* DEACTIVATE / REACTIVATE */}
                        {review.is_active ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(review)
                            }
                            className="rounded-full p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            title="Deactivate"
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
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleReactivate(review)
                            }
                            disabled={
                              updatePerformanceReview.isPending
                            }
                            className="rounded-full p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            title="Reactivate"
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
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* ======================================================
          CARD VIEW
      ====================================================== */}

      {!isLoading &&
        viewMode === "card" &&
        filteredReviews.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
                  review.is_active
                    ? "border-slate-200 dark:border-slate-700"
                    : "border-red-100 dark:border-red-900/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900 dark:text-white">
                      {getEmployeeName(review)}
                    </h3>

                    <p className="font-mono text-[10px] text-slate-400">
                      {getEmployeeCode(review)}
                    </p>
                  </div>

                  {statusBadge(review.is_active)}
                </div>

                <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">Review Period</p>
                    <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                      {review.review_period || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Hierarchy</p>
                    <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">
                      {review.hierarchy_level || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Company</p>
                    <p className="mt-0.5 truncate font-medium text-slate-700 dark:text-slate-200">
                      {getCompanyName(review)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Branch</p>
                    <p className="mt-0.5 truncate font-medium text-slate-700 dark:text-slate-200">
                      {getBranchName(review)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Department</p>
                    <p className="mt-0.5 truncate font-medium text-slate-700 dark:text-slate-200">
                      {getDepartmentName(review)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Designation</p>
                    <p className="mt-0.5 truncate font-medium text-slate-700 dark:text-slate-200">
                      {getDesignationName(review)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800">
                    <p className="text-[9px] text-slate-400">
                      Day-to-Day
                    </p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-white">
                      {review.day_to_day_performance ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800">
                    <p className="text-[9px] text-slate-400">
                      Work
                    </p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-white">
                      {review.work_performance ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800">
                    <p className="text-[9px] text-slate-400">
                      Behavior
                    </p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-white">
                      {review.behavioral_performance ?? "-"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-primary-50 p-2 text-center dark:bg-primary-500/10">
                    <p className="text-[9px] text-primary-500">
                      Overall
                    </p>
                    <p className="mt-1 font-bold text-primary-700 dark:text-primary-300">
                      {review.rating ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(review)}
                    className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>

                  {review.is_active ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(review)}
                      className="flex flex-1 items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReactivate(review)}
                      disabled={
                        updatePerformanceReview.isPending
                      }
                      className="flex flex-1 items-center justify-center rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!isLoading &&
        filteredReviews.length === 0 && (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <span className="text-xl font-bold text-slate-400">
                P
              </span>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
              No performance reviews found
            </h3>

            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No reviews match your current search or organization filters.
            </p>

            <Button
              onClick={handleAdd}
              className="mt-4 h-9 px-4 text-sm"
            >
              + Add Review
            </Button>
          </div>
        )}

      {/* ======================================================
          PAGINATION
      ====================================================== */}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>Page {page}</span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((current) =>
                Math.max(1, current - 1)
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
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
              setPage((current) => current + 1)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>

      {/* ======================================================
          EDIT / ADD MODAL
      ====================================================== */}

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={
          selectedReview
            ? "Edit Performance Review"
            : "Add Performance Review"
        }
      >
        <PerformanceReviewForm
          initialData={selectedReview || {}}
          isEdit={Boolean(selectedReview)}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          loading={
            createPerformanceReview.isPending ||
            updatePerformanceReview.isPending
          }
        />
      </Modal>

      {/* ======================================================
          DEACTIVATE CONFIRMATION
      ====================================================== */}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setReviewToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Deactivate Performance Review"
        message={
          reviewToDelete
            ? `Are you sure you want to deactivate the performance review for "${getEmployeeName(reviewToDelete)}" (${reviewToDelete.review_period || "this period"})?`
            : "Are you sure you want to deactivate this performance review?"
        }
        confirmText="Deactivate"
        loading={
          deactivatePerformanceReview.isPending
        }
      />

      {/* ======================================================
          BLOCKED INFO
      ====================================================== */}

      <ConfirmDialog
        open={Boolean(blockedInfo)}
        onClose={() => setBlockedInfo(null)}
        onConfirm={() => setBlockedInfo(null)}
        title="Can't Deactivate Performance Review"
        message={
          blockedInfo?.message ||
          "This performance review cannot be deactivated."
        }
        confirmText="OK, Got It"
        confirmVariant="secondary"
      />
    </div>
  );
}