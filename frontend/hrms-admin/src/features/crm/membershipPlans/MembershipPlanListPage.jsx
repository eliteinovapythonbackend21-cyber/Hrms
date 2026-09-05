import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";

import MembershipPlanForm from "./MembershipPlanForm";

import {
  useMembershipPlans,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
  useDeactivateMembershipPlan,
  useReactivateMembershipPlan,
} from "./useMembershipPlans";

import { useTableExport } from "@/hooks/useTableExport";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { crmApi } from "@/api/crm.api";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;
const CARD_HEIGHT = "h-[220px]";

/* =========================================================
   EXPORT COLUMNS
========================================================= */

const EXPORT_COLUMNS = [
  { header: "Plan Name", accessor: (r) => r.name || "-" },
  { header: "Rate", accessor: (r) => r.rate },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

/* =========================================================
   HELPERS
========================================================= */

function formatRate(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function getPlanStatus(plan) {
  if (plan?.is_active === false) {
    return "Inactive";
  }

  return "Active";
}

/* =========================================================
   STATUS BADGES
========================================================= */

const STATUS_BADGE_CLASS = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Inactive: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.Active;
}

/* =========================================================
   ICONS
========================================================= */

const RateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 3v14M13 6.5c-.5-1-1.5-1.5-3-1.5-1.7 0-3 .8-3 2s1.2 1.8 3 2.2 3 .9 3 2.3-1.3 2.3-3 2.3c-1.5 0-2.6-.5-3.2-1.6" />
  </svg>
);

const StatusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <circle cx="10" cy="10" r="6.5" />
    <path strokeLinecap="round" d="M7 10h6" />
  </svg>
);

const PlanStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h14v16H5z" />
    <path strokeLinecap="round" d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);

const ActiveStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m8 12 2.5 2.5L16 9" />
  </svg>
);

const InactiveStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364L18.364 5.636" />
  </svg>
);

const HighestRateStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M17 7c-.7-1.4-2.1-2-5-2-3.4 0-5 1.2-5 3.2s1.9 2.7 5 3.3 5 1.3 5 3.5-1.6 3-5 3c-2.9 0-4.3-.6-5-2" />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, value, label, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:from-primary-500/[0.06] dark:to-white/[0.02]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HOVER TRIGGER
========================================================= */

function HoverDetailsTrigger({ children, panel, align = "left" }) {
  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  };

  return (
    <div tabIndex={0} className="group/plan-details relative inline-flex max-w-full outline-none">
      <div className="max-w-full">{children}</div>

      <div
        className={`pointer-events-none invisible absolute top-full z-[100] mt-2 opacity-0 transition-all duration-150 group-hover/plan-details:pointer-events-auto group-hover/plan-details:visible group-hover/plan-details:opacity-100 group-focus/plan-details:pointer-events-auto group-focus/plan-details:visible group-focus/plan-details:opacity-100 ${alignClasses[align]}`}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   PLAN DETAILS CARD
========================================================= */

function PlanDetailsCard({ plan }) {
  const status = getPlanStatus(plan);

  return (
    <div className="w-[320px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Plan Details
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            {plan?.name || `Plan #${plan?.id ?? "-"}`}
          </p>
        </div>

        <Badge className={getStatusBadgeClass(status)}>{status}</Badge>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Rate</span>
          <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatRate(plan?.rate)}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Status</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {status}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">Created At</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(plan?.created_at)}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400">Updated At</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(plan?.updated_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ICON BUTTON
========================================================= */

const IconButton = ({ onClick, title, disabled, tone = "slate", children }) => {
  const tones = {
    slate: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",
    primary: "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",
    red: "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
    emerald: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function MembershipPlanListPage() {
  const { showToast } = useToast();

  const { data: allData, isLoading, isFetching, isError, refetch } = useMembershipPlans({
    page: 1,
    per_page: 1000,
  });

  const allPlans = allData?.items || [];

  const createPlan = useCreateMembershipPlan();
  const updatePlan = useUpdateMembershipPlan();
  const deactivatePlan = useDeactivateMembershipPlan();
  const reactivatePlan = useReactivateMembershipPlan();

  const { canAdd, canEdit, canDelete } = useModulePermissions("Membership Plans");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");
  const [viewMode, setViewMode] = useState("card");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutatingPlanId, setMutatingPlanId] = useState(null);

  /* =======================================================
     EXPORT
  ======================================================= */

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: crmApi.membershipPlans.list,
    queryParams: { search: search || undefined },
    exportColumns: EXPORT_COLUMNS,
    filename: "membership-plans",
    title: "Membership Plans",
  });

  /* =======================================================
     STATISTICS
  ======================================================= */

  const activePlans = useMemo(() => allPlans.filter((item) => item.is_active !== false), [allPlans]);
  const inactivePlans = useMemo(() => allPlans.filter((item) => item.is_active === false), [allPlans]);
  const highestRate = useMemo(
    () => activePlans.reduce((max, item) => Math.max(max, Number(item.rate || 0)), 0),
    [activePlans]
  );

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allPlans.filter((plan) => {
      const isActive = plan.is_active !== false;

      if (activeFilter === "active" && !isActive) return false;
      if (activeFilter === "inactive" && isActive) return false;

      if (normalizedSearch) {
        const haystack = [plan.id, plan.name, plan.rate].join(" ").toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [allPlans, search, activeFilter]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleAdd = () => {
    setEditingPlan(null);
    setModalOpen(true);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPlan(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({ id: editingPlan.id, payload });
        showToast("Membership plan updated successfully", "success");
      } else {
        await createPlan.mutateAsync(payload);
        showToast("Membership plan created successfully", "success");
      }

      setModalOpen(false);
      setEditingPlan(null);
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to save membership plan",
        "error"
      );
    }
  };

  const confirmDeactivate = async () => {
    if (!deleteTarget?.id) return;

    try {
      setMutatingPlanId(deleteTarget.id);
      await deactivatePlan.mutateAsync(deleteTarget.id);
      showToast("Membership plan deactivated", "success");
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to deactivate membership plan",
        "error"
      );
    } finally {
      setMutatingPlanId(null);
    }
  };

  const handleReactivate = async (plan) => {
    if (!plan?.id) return;

    try {
      setMutatingPlanId(plan.id);
      await reactivatePlan.mutateAsync(plan.id);
      showToast("Membership plan reactivated", "success");
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to reactivate membership plan",
        "error"
      );
    } finally {
      setMutatingPlanId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("active");
    setPage(1);
  };

  /* =======================================================
     ERROR
  ======================================================= */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load membership plans.
      </div>
    );
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Membership Plans
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage the CRM membership plans and their prices
          </p>
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
            <Button type="button" onClick={handleAdd} className="h-10 w-full px-4 sm:w-auto">
              <span className="mr-1.5 text-lg">+</span>
              Add Plan
            </Button>
          )}
        </div>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<PlanStatIcon />} value={allPlans.length} label="Total Plans" tone="sky" />
        <StatCard icon={<ActiveStatIcon />} value={activePlans.length} label="Active Plans" tone="emerald" />
        <StatCard icon={<InactiveStatIcon />} value={inactivePlans.length} label="Inactive Plans" tone="slate" />
        <StatCard icon={<HighestRateStatIcon />} value={formatRate(highestRate)} label="Highest Rate" tone="amber" />
      </div>

      {/* FILTERS */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            {/* SEARCH */}

            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search plan name or rate..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>

            {(search || activeFilter !== "active") && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* ACTIVE FILTER + VIEW */}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              {["active", "inactive", "all"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setActiveFilter(status);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                    activeFilter === status
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setViewMode("card");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Card
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DATA */}

      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading membership plans...</div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No membership plans found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No plans match your current search or filters.
          </p>
        </div>
      ) : viewMode === "card" ? (
        /* ===================================================
           CARD VIEW
        =================================================== */

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((plan) => {
            const isActive = plan.is_active !== false;
            const status = getPlanStatus(plan);

            return (
              <div
                key={plan.id}
                className={`relative ${CARD_HEIGHT} min-w-0 overflow-visible rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg dark:bg-white/[0.04] ${
                  isActive ? "border-slate-200 dark:border-white/10" : "border-red-100 dark:border-red-900/30"
                }`}
              >
                <div className={`h-full p-4 pb-12 ${!isActive ? "opacity-75" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <HoverDetailsTrigger align="left" panel={<PlanDetailsCard plan={plan} />}>
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            {plan.name?.charAt(0)?.toUpperCase() || "M"}
                          </div>
                          <p className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {plan.name || `Plan #${plan.id}`}
                          </p>
                        </div>
                      </HoverDetailsTrigger>

                      <p className="mt-0.5 text-[10px] text-slate-400">Plan #{plan.id}</p>
                    </div>

                    <Badge className={getStatusBadgeClass(status)}>{status}</Badge>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <RateIcon />
                      <span className="truncate font-semibold">{formatRate(plan.rate)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <StatusIcon />
                      <span className="truncate">Status: {status}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-30 grid h-11 grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleEdit(plan)}
                      className="bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:bg-white/[0.04] dark:text-slate-300"
                    >
                      Edit
                    </button>
                  )}

                  {isActive
                    ? canDelete && (
                        <button
                          type="button"
                          disabled={mutatingPlanId === plan.id}
                          onClick={() => setDeleteTarget(plan)}
                          className="bg-white text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-red-400"
                        >
                          Deactivate
                        </button>
                      )
                    : canEdit && (
                        <button
                          type="button"
                          disabled={mutatingPlanId === plan.id}
                          onClick={() => handleReactivate(plan)}
                          className="bg-white text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-emerald-400"
                        >
                          Reactivate
                        </button>
                      )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===================================================
           TABLE VIEW
        =================================================== */

        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-left text-sm">
            <thead className="tbl-head border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Plan Name</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((plan) => {
                const isActive = plan.is_active !== false;
                const status = getPlanStatus(plan);

                return (
                  <tr key={plan.id} className="tbl-row">
                    <td className="px-4 py-3">
                      <HoverDetailsTrigger align="left" panel={<PlanDetailsCard plan={plan} />}>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            {plan.name?.charAt(0)?.toUpperCase() || "M"}
                          </div>
                          <span className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
                            {plan.name || `Plan #${plan.id}`}
                          </span>
                        </div>
                      </HoverDetailsTrigger>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      {formatRate(plan.rate)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {status}
                      </span>
                    </td>

                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {canEdit && (
                          <IconButton title="Edit Plan" onClick={() => handleEdit(plan)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                            </svg>
                          </IconButton>
                        )}

                        {isActive
                          ? canDelete && (
                              <IconButton
                                title="Deactivate Plan"
                                tone="red"
                                disabled={mutatingPlanId === plan.id}
                                onClick={() => setDeleteTarget(plan)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                                </svg>
                              </IconButton>
                            )
                          : canEdit && (
                              <IconButton
                                title="Reactivate Plan"
                                tone="emerald"
                                disabled={mutatingPlanId === plan.id}
                                onClick={() => handleReactivate(plan)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 017-4M4 20v-5h5" />
                                </svg>
                              </IconButton>
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

      {/* PAGINATION */}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
        <span>
          Page {page} of {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06]"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06]"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT */}

      <Modal open={modalOpen} onClose={closeModal} title={editingPlan ? "Edit Membership Plan" : "Add Membership Plan"}>
        <MembershipPlanForm
          key={editingPlan?.id ?? "new-plan"}
          initialData={editingPlan || {}}
          onSubmit={handleSubmit}
          loading={createPlan.isPending || updatePlan.isPending}
          onCancel={closeModal}
          isEdit={!!editingPlan}
        />
      </Modal>

      {/* DEACTIVATE */}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate Membership Plan"
        message={
          deleteTarget
            ? `Are you sure you want to deactivate "${deleteTarget.name}"?`
            : ""
        }
        confirmText="Deactivate"
        loading={mutatingPlanId !== null}
      />
    </div>
  );
}
