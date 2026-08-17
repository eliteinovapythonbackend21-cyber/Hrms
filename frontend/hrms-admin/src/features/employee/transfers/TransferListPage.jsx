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
import { useDepartmentOptions } from "@/hooks/useLookupOptions";

import TransferForm from "./TransferForm";
import {
  useTransfers,
  useCreateTransfer,
  useUpdateTransfer,
  useDeactivateTransfer,
} from "./useTransfers";
import { formatDate } from "@/utils/formatDate";

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

function StatCard({ icon, value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

const TrendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" strokeWidth="2" /><path strokeLinecap="round" d="M3 9h18M8 3v3M16 3v3" />
  </svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-3a4 4 0 100-8 4 4 0 000 8zm7 3a4 4 0 10-8 0" />
  </svg>
);
const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M9 15h2M15 7h2M15 11h2M15 15h2" />
  </svg>
);

// Formats a duration between two dates as "1 yr 3 mos 12 days" (each unit
// omitted if zero) — same logic used on the Promotions page.
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

const DepartmentDetail = ({ dept, tone }) => {
  const badgeTones = {
    from: "bg-slate-50 text-slate-700 ring-slate-500/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/20",
    to: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30",
  };
  if (!dept) return <span className="text-xs text-slate-400">Unknown department</span>;
  return (
    <div className={`inline-flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5 ring-1 ring-inset ${badgeTones[tone]}`}>
      <span className="text-xs font-semibold">{dept.department_name || "-"}</span>
      <span className="font-mono text-[10px] opacity-70">{dept.department_code || "-"}</span>
      {(dept.company?.name || dept.branch?.name) && (
        <span className="text-[10px] opacity-80">{[dept.company?.name, dept.branch?.name].filter(Boolean).join(" › ")}</span>
      )}
    </div>
  );
};

const TableIconButton = ({ onClick, title, disabled, tone = "primary", children }) => {
  const tones = {
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

const EXPORT_COLUMNS = [
  { header: "Employee ID", accessor: (r) => r.employee_id },
  { header: "From Department", accessor: (r) => r.from_department_id },
  { header: "To Department", accessor: (r) => r.to_department_id },
  { header: "Effective Date", accessor: (r) => r.effective_date },
  { header: "Remarks", accessor: (r) => r.remarks },
  { header: "Status", accessor: (r) => (r.is_active !== false ? "Active" : "Inactive") },
];

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

export default function TransferListPage() {
  const { showToast } = useToast();

  const { data: allData, isLoading, isFetching, isError, refetch } = useTransfers({ page: 1, per_page: 1000 });
  const allTransfers = allData?.items || [];

  const { data: employeesData } = useQuery({
    queryKey: ["transfers-page", "employees-full"],
    queryFn: async () => (await employeesApi.list({ page: 1, per_page: 1000, is_active: true })).data.data,
  });
  const employees = employeesData?.items || [];
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const { data: departmentsData } = useQuery({
    queryKey: ["transfers-page", "departments-full"],
    queryFn: async () => (await masterApi.listDepartments({ page: 1, per_page: 1000, is_active: true })).data.data,
  });
  const departmentFullMap = useMemo(
    () => Object.fromEntries((departmentsData?.items || []).map((d) => [d.id, d])),
    [departmentsData]
  );

  const { data: companyData } = useCompanies({ page: 1, per_page: 100 });
  const companies = companyData?.items || companyData?.data || [];
  const departmentOptions = useDepartmentOptions();

  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");

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

  // Per-employee transfer timeline, sorted chronologically — used to look
  // up each row's previous/next transfer for the duration columns.
  const employeeTimeline = useMemo(() => {
    const map = new Map();
    allTransfers.forEach((t) => {
      if (!map.has(t.employee_id)) map.set(t.employee_id, []);
      map.get(t.employee_id).push(t);
    });
    map.forEach((list) => list.sort((a, b) => new Date(a.effective_date) - new Date(b.effective_date)));
    return map;
  }, [allTransfers]);

  // Shared duration lookup used by both table and card views, so the two
  // stay in sync.
  const getTransferDetails = (t) => {
    const timeline = employeeTimeline.get(t.employee_id) || [];
    const idx = timeline.findIndex((x) => x.id === t.id);
    const prev = idx > 0 ? timeline[idx - 1] : null;
    const next = idx >= 0 && idx < timeline.length - 1 ? timeline[idx + 1] : null;
    const emp = employeeMap[t.employee_id];
    const prevDeptStart = prev ? prev.effective_date : emp?.joining_date;
    return {
      timeInExistingDept: formatDuration(prevDeptStart, t.effective_date),
      timeInCurrentDept: next ? formatDuration(t.effective_date, next.effective_date) : `${formatDuration(t.effective_date, null)} (current)`,
    };
  };

  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const deactivateMutation = useDeactivateTransfer();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("table"); // "table" | "card"
  const [page, setPage] = useState(1);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: employeeLifecycleApi.transfers.list,
    queryParams: { search: search || undefined },
    exportColumns: EXPORT_COLUMNS,
    filename: "transfers",
    title: "Transfers",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const activeTransfers = allTransfers.filter((t) => t.is_active !== false);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return activeTransfers.filter((t) => {
      if (!t.effective_date) return false;
      const d = new Date(t.effective_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [activeTransfers]);

  const uniqueEmployeeCount = useMemo(() => new Set(activeTransfers.map((t) => t.employee_id)).size, [activeTransfers]);

  const departmentsInvolvedCount = useMemo(() => {
    const ids = new Set();
    activeTransfers.forEach((t) => {
      if (t.from_department_id) ids.add(t.from_department_id);
      if (t.to_department_id) ids.add(t.to_department_id);
    });
    return ids.size;
  }, [activeTransfers]);

  const filtered = useMemo(() => {
    return allTransfers
      .filter((t) => {
        if (statusFilter === "active" && t.is_active === false) return false;
        if (statusFilter === "inactive" && t.is_active !== false) return false;

        const emp = employeeMap[t.employee_id];
        if (filterCompanyId && String(emp?.department?.company?.id) !== String(filterCompanyId)) return false;
        if (filterBranchId && String(emp?.department?.branch?.id) !== String(filterBranchId)) return false;
        if (filterDepartmentId && String(t.from_department_id) !== String(filterDepartmentId) && String(t.to_department_id) !== String(filterDepartmentId)) return false;

        if (search) {
          const name = emp ? `${emp.first_name || ""} ${emp.last_name || ""}` : "";
          const fromDept = departmentFullMap[t.from_department_id]?.department_name || "";
          const toDept = departmentFullMap[t.to_department_id]?.department_name || "";
          const haystack = `${t.remarks || ""} ${name} ${fromDept} ${toDept}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));
  }, [allTransfers, statusFilter, search, employeeMap, departmentFullMap, filterCompanyId, filterBranchId, filterDepartmentId]);

  // Grouped by employee — used only by the card view.
  const groupedByEmployee = useMemo(() => {
    const groups = new Map();
    filtered.forEach((t) => {
      if (!groups.has(t.employee_id)) {
        groups.set(t.employee_id, { employeeId: t.employee_id, employee: employeeMap[t.employee_id], transfers: [] });
      }
      groups.get(t.employee_id).transfers.push(t);
    });
    return Array.from(groups.values()).sort((a, b) => {
      const nameA = a.employee ? `${a.employee.first_name || ""} ${a.employee.last_name || ""}` : "";
      const nameB = b.employee ? `${b.employee.first_name || ""} ${b.employee.last_name || ""}` : "";
      return nameA.localeCompare(nameB);
    });
  }, [filtered, employeeMap]);

  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : PAGE_SIZE;
  const totalForPaging = viewMode === "card" ? groupedByEmployee.length : filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalForPaging / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pagedGroups = groupedByEmployee.slice((page - 1) * pageSize, page * pageSize);

  const handleAdd = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (t) => { setEditing(t); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        showToast("Transfer updated", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Transfer created", "success");
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
      showToast("Transfer deactivated", "success");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleReactivate = async (t) => {
    try {
      await updateMutation.mutateAsync({ id: t.id, payload: { is_active: true } });
      showToast("Transfer reactivated", "success");
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load transfers.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Transfers</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Employee transfer history</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Button type="button" onClick={handleAdd} className="h-10 w-full px-4 sm:w-auto">
            <span className="mr-1.5 text-lg">+</span>
            Add Transfer
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard icon={<TrendIcon />} value={activeTransfers.length} label="Total Transfers" />
        <StatCard icon={<CalendarIcon />} value={thisMonthCount} label="This Month" />
        <StatCard icon={<UsersIcon />} value={uniqueEmployeeCount} label="Employees Transferred" />
        <StatCard icon={<BuildingIcon />} value={departmentsInvolvedCount} label="Departments Involved" />
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
                placeholder="Search by employee, department, or remarks..."
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button type="button" onClick={() => { setViewMode("table"); setPage(1); }} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "table" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M9 9v11" />
                </svg>
                Table
              </button>
              <button type="button" onClick={() => { setViewMode("card"); setPage(1); }} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === "card" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Card
              </button>
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {["active", "inactive", "all"].map((s) => (
                <button key={s} type="button" onClick={() => { setStatusFilter(s); setPage(1); }} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${statusFilter === s ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : (viewMode === "table" ? paged.length === 0 : pagedGroups.length === 0) ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No transfers found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">No records match your current search or filters.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Existing Department</th>
                <th className="px-4 py-3 font-medium"></th>
                <th className="px-4 py-3 font-medium">Current Department</th>
                <th className="px-4 py-3 font-medium">Time in Existing Dept.</th>
                <th className="px-4 py-3 font-medium">Time in Current Dept.</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
                <th className="px-4 py-3 font-medium">Effective Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((t) => {
                const emp = employeeMap[t.employee_id];
                const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : `Employee #${t.employee_id}`;
                const isActive = t.is_active !== false;
                const fromDept = departmentFullMap[t.from_department_id];
                const toDept = departmentFullMap[t.to_department_id];
                const { timeInExistingDept, timeInCurrentDept } = getTransferDetails(t);

                return (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={empName} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{empName}</p>
                          <p className="text-[10px] text-slate-400">ID: {t.employee_id}{emp?.employee_code ? ` · ${emp.employee_code}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><DepartmentDetail dept={fromDept} tone="from" /></td>
                    <td className="px-4 py-3"><ArrowIcon /></td>
                    <td className="px-4 py-3"><DepartmentDetail dept={toDept} tone="to" /></td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{timeInExistingDept}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{timeInCurrentDept}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="truncate text-sm text-slate-600 dark:text-slate-300" title={t.remarks || ""}>{t.remarks || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(t.effective_date)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <TableIconButton title="Edit" onClick={() => handleEdit(t)} tone="slate">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                          </svg>
                        </TableIconButton>
                        {isActive ? (
                          <TableIconButton title="Delete" onClick={() => setDeleteTarget(t)} tone="red">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                            </svg>
                          </TableIconButton>
                        ) : (
                          <TableIconButton title="Reactivate" onClick={() => handleReactivate(t)} disabled={updateMutation.isPending} tone="emerald">
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
        /* CARD VIEW — grouped by employee */
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedGroups.map((group) => {
            const emp = group.employee;
            const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : `Employee #${group.employeeId}`;
            const sorted = [...group.transfers].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date));

            return (
              <div key={group.employeeId} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary-600" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={empName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{empName}</p>
                        <p className="text-[10px] text-slate-400">ID: {group.employeeId}{emp?.employee_code ? ` · ${emp.employee_code}` : ""}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {group.transfers.length} transfer{group.transfers.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="space-y-2.5">
                    {sorted.map((t) => {
                      const isActive = t.is_active !== false;
                      const fromDept = departmentFullMap[t.from_department_id];
                      const toDept = departmentFullMap[t.to_department_id];
                      const { timeInExistingDept, timeInCurrentDept } = getTransferDetails(t);
                      return (
                        <div key={t.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60">
                          <div className="px-2.5 py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <DepartmentDetail dept={fromDept} tone="from" />
                              <ArrowIcon />
                              <DepartmentDetail dept={toDept} tone="to" />
                              <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
                                <span className={`h-1 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                              <CalendarIcon />
                              {formatDate(t.effective_date)}
                            </div>
                            {t.remarks && <p className="mt-1.5 truncate text-xs text-slate-500 dark:text-slate-400" title={t.remarks}>{t.remarks}</p>}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                              <div><span className="text-slate-400">Existing dept:</span> {timeInExistingDept}</div>
                              <div><span className="text-slate-400">Current dept:</span> {timeInCurrentDept}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                            <div className="flex items-center justify-center py-1.5">
                              <TableIconButton title="Edit" onClick={() => handleEdit(t)} tone="slate">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                                </svg>
                              </TableIconButton>
                            </div>
                            <div className="flex items-center justify-center py-1.5">
                              {isActive ? (
                                <TableIconButton title="Delete" onClick={() => setDeleteTarget(t)} tone="red">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                                  </svg>
                                </TableIconButton>
                              ) : (
                                <TableIconButton title="Reactivate" onClick={() => handleReactivate(t)} disabled={updateMutation.isPending} tone="emerald">
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

      {/* ADD / EDIT MODAL — TransferForm no longer uses GenericForm (it
          needed cascading Branch->Department selects GenericForm's
          field-config approach doesn't obviously support), so it has no
          built-in submit button — this footer provides one, same pattern
          as DocumentForm. */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Transfer" : "Add Transfer"}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button type="submit" form="transfers-form" loading={isSaving} disabled={isSaving}>
              {editing ? "Save" : "Submit"}
            </Button>
          </>
        }
      >
        <TransferForm formId="transfers-form" initialData={editing || {}} onSubmit={handleSubmit} loading={isSaving} />
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Deactivate Transfer"
        message={deleteTarget ? "Are you sure you want to deactivate this transfer record?" : ""}
        confirmText="Deactivate"
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}