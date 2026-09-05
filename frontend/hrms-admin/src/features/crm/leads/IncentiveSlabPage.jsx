import { useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

import {
  useIncentiveSlabs,
  useCreateIncentiveSlab,
  useUpdateIncentiveSlab,
  useDeactivateIncentiveSlab,
  useReactivateIncentiveSlab,
} from "./useIncentiveSlabs";

import { formatCurrency } from "@/utils/formatCurrency";
import { useIsCrmEmployee } from "@/hooks/useIsCrmEmployee";

/* =========================================================
   CONSTANTS
========================================================= */

const CARD_PAGE_SIZE = 6;
const TABLE_PAGE_SIZE = 10;

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getRangeLabel(slab) {
  if (slab.max_customers === null || slab.max_customers === undefined) {
    return `${slab.min_customers}+`;
  }
  return `${slab.min_customers} – ${slab.max_customers}`;
}

const EXPORT_COLUMNS = [
  { header: "Range", accessor: getRangeLabel },
  { header: "Min Extra Customers", accessor: (r) => r.min_customers },
  { header: "Max Extra Customers", accessor: (r) => (r.max_customers ?? "No upper limit") },
  { header: "Incentive Amount", accessor: (r) => r.incentive_amount },
  { header: "Active", accessor: (r) => (r.is_active !== false ? "Yes" : "No") },
];

/* =========================================================
   ICONS
========================================================= */

const SlabIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M4 15h16M4 11h10M4 7h6" />
  </svg>
);

const ActiveStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const InactiveStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364L18.364 5.636" />
  </svg>
);

const AmountStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M9 10.5c0-1 1-1.5 3-1.5s3 .8 3 2-1.3 1.7-3 2-3 1-3 2 1 2 3 2 3-.5 3-1.5" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const RangeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h14M3 10l3-3M3 10l3 3M17 10l-3-3M17 10l-3 3" />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, value, label, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:from-primary-500/[0.06] dark:to-white/[0.02]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HOVER TRIGGER + DETAILS CARD
========================================================= */

function HoverDetailsTrigger({ children, panel, align = "left" }) {
  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  };

  return (
    <div tabIndex={0} className="group/slab-details relative inline-flex max-w-full outline-none">
      <div className="max-w-full">{children}</div>
      <div
        className={`
          pointer-events-none invisible absolute top-full z-[100] mt-2 opacity-0 transition-all duration-150
          group-hover/slab-details:pointer-events-auto group-hover/slab-details:visible group-hover/slab-details:opacity-100
          group-focus/slab-details:pointer-events-auto group-focus/slab-details:visible group-focus/slab-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

function SlabDetailsCard({ slab }) {
  const isActive = slab?.is_active !== false;

  return (
    <div className="w-[300px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Slab Details
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            {getRangeLabel(slab)} extra customers
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Min Extra</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {slab?.min_customers}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Max Extra</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {slab?.max_customers === null || slab?.max_customers === undefined
              ? "No upper limit"
              : slab.max_customers}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Incentive</span>
          <span className="break-words text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(slab?.incentive_amount)}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">Created</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(slab?.created_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Updated</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(slab?.updated_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function IncentiveSlabPage() {
  const { showToast } = useToast();

  // CRM-department employees: view-only screen.
  const { isCrmEmployee: readOnly } = useIsCrmEmployee();

  const { exporting, exportToExcel, exportToPDF } = useTableExport();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useIncentiveSlabs({ page: 1, per_page: 1000 });

  const allSlabs = allData?.items || [];

  const createSlab = useCreateIncentiveSlab();
  const updateSlab = useUpdateIncentiveSlab();
  const deactivateSlab = useDeactivateIncentiveSlab();
  const reactivateSlab = useReactivateIncentiveSlab();

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");
  const [viewMode, setViewMode] = useState("card");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);

  const [formState, setFormState] = useState({
    min_customers: "",
    max_customers: "",
    incentive_amount: "",
  });

  /* -------------------------------------------------------
     DERIVED
  ------------------------------------------------------- */

  const activeSlabs = useMemo(() => allSlabs.filter((s) => s.is_active !== false), [allSlabs]);
  const inactiveSlabs = useMemo(() => allSlabs.filter((s) => s.is_active === false), [allSlabs]);
  const highestAmount = useMemo(
    () => activeSlabs.reduce((max, s) => Math.max(max, Number(s.incentive_amount) || 0), 0),
    [activeSlabs]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allSlabs.filter((slab) => {
      const isActive = slab.is_active !== false;

      if (activeFilter === "active" && !isActive) return false;
      if (activeFilter === "inactive" && isActive) return false;

      if (normalizedSearch) {
        const haystack = [getRangeLabel(slab), slab.incentive_amount].join(" ").toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [allSlabs, search, activeFilter]);

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => a.min_customers - b.min_customers),
    [filtered]
  );

  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : TABLE_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* -------------------------------------------------------
     HANDLERS
  ------------------------------------------------------- */

  const openAddForm = () => {
    if (readOnly) return;
    setEditingSlab(null);
    setFormState({ min_customers: "", max_customers: "", incentive_amount: "" });
    setFormOpen(true);
  };

  const openEditForm = (slab) => {
    if (readOnly) return;
    setEditingSlab(slab);
    setFormState({
      min_customers: slab.min_customers ?? "",
      max_customers: slab.max_customers ?? "",
      incentive_amount: slab.incentive_amount ?? "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (readOnly) return;

    const payload = {
      min_customers: Number(formState.min_customers) || 0,
      max_customers: formState.max_customers === "" ? null : Number(formState.max_customers),
      incentive_amount: Number(formState.incentive_amount) || 0,
    };

    try {
      if (editingSlab) {
        await updateSlab.mutateAsync({ id: editingSlab.id, payload });
        showToast("Slab updated", "success");
      } else {
        await createSlab.mutateAsync(payload);
        showToast("Slab created", "success");
      }
      setFormOpen(false);
      setEditingSlab(null);
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || error?.message || "Failed to save slab", "error");
    }
  };

  const confirmDeactivate = async () => {
    if (readOnly) return;
    if (!deleteTarget?.id) return;
    try {
      setMutatingId(deleteTarget.id);
      await deactivateSlab.mutateAsync(deleteTarget.id);
      showToast("Slab deactivated", "success");
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to deactivate slab", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const handleReactivate = async (slab) => {
    if (readOnly) return;
    try {
      setMutatingId(slab.id);
      await reactivateSlab.mutateAsync(slab.id);
      showToast("Slab reactivated", "success");
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to reactivate slab", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("active");
    setPage(1);
  };

  const isSaving = createSlab.isPending || updateSlab.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load incentive slabs.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <SlabIcon />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Incentive Slabs
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Legacy monthly-extras incentive amount — used by Incentive Payouts, not CRM Incentives
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            exporting={exporting}
            onExportExcel={() => exportToExcel(filtered, EXPORT_COLUMNS, "incentive-slabs")}
            onExportPDF={() => exportToPDF(filtered, EXPORT_COLUMNS, "incentive-slabs", "Incentive Slabs")}
          />
          {readOnly ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/15 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              View only
            </span>
          ) : (
          <Button type="button" onClick={openAddForm} className="h-10 w-full px-4 sm:w-auto">
            <span className="mr-1.5 text-lg">+</span>
            Add Slab
          </Button>
          )}
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="rounded-xl border border-primary-100 bg-primary-50/60 px-4 py-3 text-xs text-primary-800 dark:border-primary-500/20 dark:bg-primary-500/[0.06] dark:text-primary-300">
        These slabs power the older{" "}
        <span className="font-semibold">Incentive Payouts</span> screen only —
        a flat amount paid once an employee's monthly registrations exceed
        their target by the slab's range. The main{" "}
        <span className="font-semibold">CRM Incentives</span> screen uses a
        different, newer rule instead: Weekly/Monthly/Quarterly targets of
        10/40/120, gated by a minimum of 10 registrations and each membership
        plan's eligibility share (Silver 50% · Gold 30% · Diamond 20% of
        target), paying 6% of that plan's price per registration past the
        period target — configured via Membership Plans, not here.
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<SlabIcon />} value={allSlabs.length} label="Total Slabs" tone="sky" />
        <StatCard icon={<ActiveStatIcon />} value={activeSlabs.length} label="Active Slabs" tone="emerald" />
        <StatCard icon={<InactiveStatIcon />} value={inactiveSlabs.length} label="Inactive Slabs" tone="red" />
        <StatCard icon={<AmountStatIcon />} value={formatCurrency(highestAmount)} label="Highest Incentive" tone="amber" />
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by range or amount..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
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
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No incentive slabs found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters. Add a slab to define incentive tiers.
          </p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((slab) => {
            const isActive = slab.is_active !== false;
            const tierNumber = sorted.findIndex((s) => s.id === slab.id) + 1;

            return (
              <div
                key={slab.id}
                className={`flex min-w-0 flex-col overflow-visible rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg dark:bg-white/[0.04] ${
                  isActive ? "border-slate-200 dark:border-white/10" : "border-red-100 dark:border-red-900/30"
                }`}
              >
                <div className={`flex flex-1 flex-col p-4 ${!isActive ? "opacity-75" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xs font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        T{tierNumber}
                      </div>
                      <div className="min-w-0">
                        <HoverDetailsTrigger align="left" panel={<SlabDetailsCard slab={slab} />}>
                          <p className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {getRangeLabel(slab)} customers
                          </p>
                        </HoverDetailsTrigger>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <RangeIcon />
                          Tier {tierNumber}
                        </div>
                      </div>
                    </div>

                    {!isActive && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                        <span className="h-1 w-1 rounded-full bg-red-500" />
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  {/* Range visual */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                      {slab.min_customers}
                    </span>
                    <span className="h-px min-w-[16px] flex-1 bg-slate-200 dark:bg-slate-700" />
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                      {slab.max_customers === null || slab.max_customers === undefined ? "∞" : slab.max_customers}
                    </span>
                  </div>

                  {/* Amount block — grows naturally, never clipped */}
                  <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-lg bg-emerald-50 px-3 py-4 text-center dark:bg-emerald-500/10">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Incentive Amount
                    </p>
                    <p className="mt-1 w-full break-words text-xl font-bold leading-tight text-emerald-700 dark:text-emerald-400 sm:text-2xl">
                      {formatCurrency(slab.incentive_amount)}
                    </p>
                  </div>
                </div>

                {!readOnly && (
                <div className="grid h-11 shrink-0 grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => openEditForm(slab)}
                    className="bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:bg-white/[0.04] dark:text-slate-300"
                  >
                    Edit
                  </button>

                  {isActive ? (
                    <button
                      type="button"
                      disabled={mutatingId === slab.id}
                      onClick={() => setDeleteTarget(slab)}
                      className="bg-white text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-red-400"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={mutatingId === slab.id}
                      onClick={() => handleReactivate(slab)}
                      className="bg-white text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-emerald-400"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-left text-sm">
            <thead className="tbl-head border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Extra Customers (Min)</th>
                <th className="px-4 py-3 font-medium">Extra Customers (Max)</th>
                <th className="px-4 py-3 font-medium">Incentive Amount</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((slab) => {
                const isActive = slab.is_active !== false;
                const tierNumber = sorted.findIndex((s) => s.id === slab.id) + 1;

                return (
                  <tr key={slab.id} className="tbl-row">
                    <td className="px-4 py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-[10px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        {tierNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <HoverDetailsTrigger align="left" panel={<SlabDetailsCard slab={slab} />}>
                        <span className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
                          {slab.min_customers}
                        </span>
                      </HoverDetailsTrigger>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {slab.max_customers === null || slab.max_customers === undefined
                        ? "No upper limit"
                        : slab.max_customers}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center whitespace-nowrap rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {formatCurrency(slab.incentive_amount)}
                      </span>
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
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {readOnly ? (
                        <span className="block text-right text-xs text-slate-400">—</span>
                      ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEditForm(slab)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                          </svg>
                        </button>

                        {isActive ? (
                          <button
                            type="button"
                            title="Deactivate"
                            disabled={mutatingId === slab.id}
                            onClick={() => setDeleteTarget(slab)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Reactivate"
                            disabled={mutatingId === slab.id}
                            onClick={() => handleReactivate(slab)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5" />
                            </svg>
                          </button>
                        )}
                      </div>
                      )}
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

      {/* ADD / EDIT FORM */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                <SlabIcon />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingSlab ? "Edit Incentive Slab" : "Add Incentive Slab"}
              </h2>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Min Extra Customers
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formState.min_customers}
                  onChange={(e) => setFormState((s) => ({ ...s, min_customers: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Max Extra Customers (leave blank for no upper limit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formState.max_customers}
                  onChange={(e) => setFormState((s) => ({ ...s, max_customers: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Incentive Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formState.incentive_amount}
                  onChange={(e) => setFormState((s) => ({ ...s, incentive_amount: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingSlab(null);
                  }}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={isSaving} className="h-10 px-4">
                  {isSaving ? "Saving..." : editingSlab ? "Save Changes" : "Add Slab"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate Incentive Slab"
        message={
          deleteTarget ? `Deactivate the slab for ${getRangeLabel(deleteTarget)} extra customers?` : ""
        }
        confirmText="Deactivate"
        loading={mutatingId !== null}
      />
    </div>
  );
}