import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

import { employeeLifecycleApi } from "@/api/employee.api";
import { employeesApi } from "@/api/employees.api";
import { masterApi } from "@/api/master.api";
import { useCompanies } from "@/features/master/company/useCompanies";
import { useDepartmentOptions, useDesignationOptions } from "@/hooks/useLookupOptions";

import PromotionForm from "./PromotionForm";
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeactivatePromotion,
} from "./usePromotions";
import { formatDate } from "@/utils/formatDate";

const SKY_BADGE = "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400";

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
const TrendUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7v6h-6" />
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" strokeWidth="2" />
    <path strokeLinecap="round" d="M3 9h18M8 3v3M16 3v3" />
  </svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-3a4 4 0 100-8 4 4 0 000 8zm7 3a4 4 0 10-8 0" />
  </svg>
);
const SmallCalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" strokeWidth="2" />
    <path strokeLinecap="round" d="M3 9h18M8 3v3M16 3v3" />
  </svg>
);

function StatCard({ icon, value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${SKY_BADGE}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function DesignationBadge({ label, tone, description }) {
  const dotTones = { from: "bg-slate-400 dark:bg-slate-500", to: "bg-sky-500" };
  const badgeTones = {
    from: "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/20",
    to: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30",
  };
  return (
    <span
      title={description || undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]} ${description ? "cursor-help" : ""}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]}`} />
      {label}
    </span>
  );
}

// Formats a duration between two dates as "1 yr 3 mos 12 days" (each unit
// omitted if zero, e.g. "5 mos 2 days" or just "18 days").
function formatDuration(startDate, endDate) {
  if (!startDate) return "—";
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (end < start) return "—";

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Days in the month just before `end`'s month, to borrow from.
    const daysInPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);

  return parts.length > 0 ? parts.join(" ") : "0 days";
}

const HierarchyTrail = ({ company, branch, department, designation }) => {
  const steps = [company, branch, department, designation].filter(Boolean);
  if (steps.length === 0) return <p className="text-xs text-slate-400">No organization assigned</p>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">{step}</span>
          {i < steps.length - 1 && <span className="text-slate-300 dark:text-slate-600">›</span>}
        </div>
      ))}
    </div>
  );
};

const TableIconButton = ({ onClick, title, disabled, tone = "primary", children }) => {
  const tones = {
    primary: "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",
    slate: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",
    red: "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",
    emerald: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-label={title} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}>
      {children}
    </button>
  );
};

const PAGE_SIZE = 10;

// Plain field labels for Excel/PDF export — separate from the table's
// visual columns since export should reflect raw underlying data (IDs,
// dates), not the badges/tenure calculations built for on-screen display.
const EXPORT_COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "from_designation_id", label: "From Designation" },
  { key: "to_designation_id", label: "To Designation" },
  { key: "effective_date", label: "Effective Date" },
  { key: "remarks", label: "Remarks" },
  { key: "is_active", label: "Active" },
];

export default function PromotionListPage() {
  const { showToast } = useToast();

  // Full (unpaginated) dataset — used for: the stat cards, filtering, and
  // building each employee's promotion timeline (needed to compute "time
  // in previous role" / "time in new role" per row).
  const { data: allData, isLoading, isFetching, isError, refetch } = usePromotions({ page: 1, per_page: 1000 });
  const allPromotions = allData?.items || [];

  const { data: employeesData } = useQuery({
    queryKey: ["promotions-page", "employees-full"],
    queryFn: async () => (await employeesApi.list({ page: 1, per_page: 1000, is_active: true })).data.data,
  });
  const employees = employeesData?.items || [];
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  // Full designation records (with description) — useDesignationOptions
  // only returns {value,label}, so this fetches the richer shape directly.
  const { data: designationsData } = useQuery({
    queryKey: ["promotions-page", "designations-full"],
    queryFn: async () => (await masterApi.listDesignations({ page: 1, per_page: 500 })).data.data,
  });
  const designationFullMap = useMemo(
    () => Object.fromEntries((designationsData?.items || []).map((d) => [d.id, d])),
    [designationsData]
  );

  const { data: companyData } = useCompanies({ page: 1, per_page: 100 });
  const companies = companyData?.items || companyData?.data || [];

  const departmentOptions = useDepartmentOptions();
  const designationOptions = useDesignationOptions();

  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterDesignationId, setFilterDesignationId] = useState("");

  const branches = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      const b = e.department?.branch;
      if (!b?.id) return;
      if (filterCompanyId && String(e.department?.company?.id) !== String(filterCompanyId)) return;
      map.set(b.id, b);
    });
    return Array.from(map.values());
  }, [employees, filterCompanyId]);

  // Per-employee promotion timeline, sorted chronologically — used to look
  // up each row's previous/next promotion for the tenure calculations.
  const employeeTimeline = useMemo(() => {
    const map = new Map();
    allPromotions.forEach((p) => {
      if (!map.has(p.employee_id)) map.set(p.employee_id, []);
      map.get(p.employee_id).push(p);
    });
    map.forEach((list) => list.sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date)));
    return map;
  }, [allPromotions]);

  const createMutation = useCreatePromotion();
  const updateMutation = useUpdatePromotion();
  const deactivateMutation = useDeactivatePromotion();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("table"); // "table" | "card"
  const [page, setPage] = useState(1);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: employeeLifecycleApi.promotions.list,
    queryParams: { search: search || undefined },
    exportColumns: EXPORT_COLUMNS,
    filename: "promotions",
    title: "Promotions",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activePromotions = allPromotions.filter((p) => p.is_active !== false);
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return activePromotions.filter((p) => {
      if (!p.effective_date) return false;
      const d = new Date(p.effective_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [activePromotions]);
  const uniqueEmployeeCount = useMemo(() => new Set(activePromotions.map((p) => p.employee_id)).size, [activePromotions]);

  const filtered = useMemo(() => {
    return allPromotions.filter((p) => {
      if (statusFilter === "active" && p.is_active === false) return false;
      if (statusFilter === "inactive" && p.is_active !== false) return false;

      const emp = employeeMap[p.employee_id];
      if (filterCompanyId && String(emp?.department?.company?.id) !== String(filterCompanyId)) return false;
      if (filterBranchId && String(emp?.department?.branch?.id) !== String(filterBranchId)) return false;
      if (filterDepartmentId && String(emp?.department?.id) !== String(filterDepartmentId)) return false;
      if (filterDesignationId && String(p.from_designation_id) !== String(filterDesignationId) && String(p.to_designation_id) !== String(filterDesignationId)) return false;

      if (search) {
        const name = emp ? `${emp.first_name || ""} ${emp.last_name || ""}` : "";
        const haystack = `${p.remarks || ""} ${name}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
  }, [allPromotions, statusFilter, search, employeeMap, filterCompanyId, filterBranchId, filterDepartmentId, filterDesignationId]);

  // Grouped by employee — used only by the card view, so each employee
  // appears once with their full promotion history listed underneath
  // (same pattern as the Documents card view).
  const groupedByEmployee = useMemo(() => {
    const groups = new Map();
    filtered.forEach((p) => {
      if (!groups.has(p.employee_id)) {
        groups.set(p.employee_id, { employeeId: p.employee_id, employee: employeeMap[p.employee_id], promotions: [] });
      }
      groups.get(p.employee_id).promotions.push(p);
    });
    return Array.from(groups.values()).sort((a, b) => {
      const nameA = a.employee ? `${a.employee.first_name || ""} ${a.employee.last_name || ""}` : "";
      const nameB = b.employee ? `${b.employee.first_name || ""} ${b.employee.last_name || ""}` : "";
      return nameA.localeCompare(nameB);
    });
  }, [filtered, employeeMap]);

  const CARD_PAGE_SIZE = 6;
  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : PAGE_SIZE;
  const totalForPaging = viewMode === "card" ? groupedByEmployee.length : filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalForPaging / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pagedGroups = groupedByEmployee.slice((page - 1) * pageSize, page * pageSize);

  // Shared bit of row content used by both views for a single promotion's
  // designation-change + remarks + tenure info, so they stay in sync.
  const getPromotionDetails = (p) => {
    const timeline = employeeTimeline.get(p.employee_id) || [];
    const idx = timeline.findIndex((t) => t.id === p.id);
    const prev = idx > 0 ? timeline[idx - 1] : null;
    const next = idx >= 0 && idx < timeline.length - 1 ? timeline[idx + 1] : null;
    const emp = employeeMap[p.employee_id];
    const prevRoleStart = prev ? prev.effective_date : emp?.joining_date;
    return {
      timeInPreviousRole: formatDuration(prevRoleStart, p.effective_date),
      timeInNewRole: next ? formatDuration(p.effective_date, next.effective_date) : `${formatDuration(p.effective_date, null)} (current)`,
      fromDesig: designationFullMap[p.from_designation_id],
      toDesig: designationFullMap[p.to_designation_id],
    };
  };

  const handleAdd = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (p) => { setEditing(p); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        showToast("Promotion updated", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Promotion created", "success");
      }
      closeModal();
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deactivateMutation.mutateAsync(deleteTarget.id);
      showToast("Promotion deactivated", "success");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleReactivate = async (p) => {
    try {
      await updateMutation.mutateAsync({ id: p.id, payload: { is_active: true } });
      showToast("Promotion reactivated", "success");
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load promotions.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Promotions</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Employee promotion history</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Button type="button" onClick={handleAdd} className="h-10 w-full px-4 sm:w-auto">
            <span className="mr-1.5 text-lg">+</span>
            Add Promotion
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<TrendUpIcon />} value={activePromotions.length} label="Total Promotions" />
        <StatCard icon={<CalendarIcon />} value={thisMonthCount} label="This Month" />
        <StatCard icon={<UsersIcon />} value={uniqueEmployeeCount} label="Employees Promoted" />
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by employee or remarks..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select value={filterCompanyId} onChange={(e) => { setFilterCompanyId(e.target.value); setFilterBranchId(""); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="">All Companies</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select value={filterBranchId} onChange={(e) => { setFilterBranchId(e.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <select value={filterDepartmentId} onChange={(e) => { setFilterDepartmentId(e.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="">All Departments</option>
              {departmentOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>

            <select value={filterDesignationId} onChange={(e) => { setFilterDesignationId(e.target.value); setPage(1); }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white">
              <option value="">All Designations</option>
              {designationOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setViewMode("table"); setPage(1); }}
                title="Table view"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "table" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M9 9v11" />
                </svg>
                Table
              </button>
              <button
                type="button"
                onClick={() => { setViewMode("card"); setPage(1); }}
                title="Card view"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "card" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Card
              </button>
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {["active", "inactive", "all"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${statusFilter === s ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TABLE / CARD */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : (viewMode === "table" ? paged.length === 0 : pagedGroups.length === 0) ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No promotions found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">No records match your current search or filters.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Designation Change</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
                <th className="px-4 py-3 font-medium">Time in Previous Role</th>
                <th className="px-4 py-3 font-medium">Time in New Role</th>
                <th className="px-4 py-3 font-medium">Effective Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((p) => {
                const emp = employeeMap[p.employee_id];
                const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : `Employee #${p.employee_id}`;
                const isActive = p.is_active !== false;

                const timeline = employeeTimeline.get(p.employee_id) || [];
                const idx = timeline.findIndex((t) => t.id === p.id);
                const prev = idx > 0 ? timeline[idx - 1] : null;
                const next = idx >= 0 && idx < timeline.length - 1 ? timeline[idx + 1] : null;
                const prevRoleStart = prev ? prev.effective_date : emp?.joining_date;
                const timeInPreviousRole = formatDuration(prevRoleStart, p.effective_date);
                const timeInNewRole = next ? formatDuration(p.effective_date, next.effective_date) : `${formatDuration(p.effective_date, null)} (current)`;

                const fromDesig = designationFullMap[p.from_designation_id];
                const toDesig = designationFullMap[p.to_designation_id];

                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={empName} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{empName}</p>
                          <p className="text-[10px] text-slate-400">{emp?.employee_code || `#${p.employee_id}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <DesignationBadge tone="from" label={fromDesig?.designation_name || `#${p.from_designation_id}`} description={fromDesig?.description} />
                        <ArrowIcon />
                        <DesignationBadge tone="to" label={toDesig?.designation_name || `#${p.to_designation_id}`} description={toDesig?.description} />
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-sm text-slate-600 dark:text-slate-300" title={p.remarks || ""}>{p.remarks || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{timeInPreviousRole}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{timeInNewRole}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <SmallCalendarIcon />
                        {formatDate(p.effective_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <TableIconButton title="Edit" onClick={() => handleEdit(p)} tone="slate">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                          </svg>
                        </TableIconButton>
                        {isActive ? (
                          <TableIconButton title="Delete" onClick={() => setDeleteTarget(p)} tone="red">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                            </svg>
                          </TableIconButton>
                        ) : (
                          <TableIconButton title="Reactivate" onClick={() => handleReactivate(p)} disabled={updateMutation.isPending} tone="emerald">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5" />
                            </svg>
                          </TableIconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedGroups.map((group) => {
            const emp = group.employee;
            const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : `Employee #${group.employeeId}`;
            const sortedPromotions = [...group.promotions].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));

            return (
              <div key={group.employeeId} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary-600" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={empName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{empName}</p>
                        <p className="text-[10px] text-slate-400">{emp?.employee_code || `#${group.employeeId}`}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {group.promotions.length} promo{group.promotions.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="space-y-2.5">
                    {sortedPromotions.map((p) => {
                      const isActive = p.is_active !== false;
                      const { timeInPreviousRole, timeInNewRole, fromDesig, toDesig } = getPromotionDetails(p);
                      return (
                        <div key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60">
                          <div className="px-2.5 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <DesignationBadge tone="from" label={fromDesig?.designation_name || `#${p.from_designation_id}`} description={fromDesig?.description} />
                                <ArrowIcon />
                                <DesignationBadge tone="to" label={toDesig?.designation_name || `#${p.to_designation_id}`} description={toDesig?.description} />
                              </div>
                              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
                                <span className={`h-1 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                              <SmallCalendarIcon />
                              {formatDate(p.effective_date)}
                            </div>
                            {p.remarks && (
                              <p className="mt-1.5 truncate text-xs text-slate-500 dark:text-slate-400" title={p.remarks}>{p.remarks}</p>
                            )}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                              <div><span className="text-slate-400">Previous role:</span> {timeInPreviousRole}</div>
                              <div><span className="text-slate-400">New role:</span> {timeInNewRole}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                            <div className="flex items-center justify-center py-1.5">
                              <TableIconButton title="Edit" onClick={() => handleEdit(p)} tone="slate">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                                </svg>
                              </TableIconButton>
                            </div>
                            <div className="flex items-center justify-center py-1.5">
                              {isActive ? (
                                <TableIconButton title="Delete" onClick={() => setDeleteTarget(p)} tone="red">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                                  </svg>
                                </TableIconButton>
                              ) : (
                                <TableIconButton title="Reactivate" onClick={() => handleReactivate(p)} disabled={updateMutation.isPending} tone="emerald">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5" />
                                  </svg>
                                </TableIconButton>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Previous</button>
          <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">Next</button>
        </div>
      </div>

      {/* ADD / EDIT MODAL — no custom footer here: GenericForm (used by
          PromotionForm) renders its own submit/cancel button internally,
          unlike DocumentForm which has none. Adding a second footer button
          bound to the same form id was redundant and could double-trigger
          submission. */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Promotion" : "Add Promotion"}>
        <PromotionForm formId="promotions-form" initialData={editing || {}} onSubmit={handleSubmit} loading={isSaving} />
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Deactivate Promotion"
        message={deleteTarget ? `Are you sure you want to deactivate this promotion record?` : ""}
        confirmText="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}