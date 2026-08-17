import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCrudList } from "@/hooks/useCrudResource";
import { employeeLifecycleApi } from "@/api/employee.api";
import { employeesApi } from "@/api/employees.api";
import { useDepartmentOptions, useDesignationOptions } from "@/hooks/useLookupOptions";
import { useCompanies } from "@/features/master/company/useCompanies";

import {
  useCreateDocument,
  useUpdateDocument,
  useDeactivateDocument,
  getDocumentTypeOptions,
} from "./useDocuments";
import DocumentForm from "./DocumentForm";

import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import { useToast } from "@/components/feedback/Toast";

const getExtension = (url = "") => url.split("?")[0].split(".").pop()?.toLowerCase() || "";
const isImage = (url) => ["png", "jpg", "jpeg", "gif"].includes(getExtension(url));
const isPdf = (url) => getExtension(url) === "pdf";

const DOC_TYPE_STYLES = {
  Aadhaar: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/30",
  "Bank Details": "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
  "Experience Certificate": "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/30",
  "School/College Mark Sheet": "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30",
  Certificates: "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-400/30",
};
const DEFAULT_DOC_BADGE = "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20";

const DocTypeBadge = ({ type }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${DOC_TYPE_STYLES[type] || DEFAULT_DOC_BADGE}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {type}
  </span>
);

// Small "+" trigger placed right next to a Document Type badge — used in
// both card view and table view. Opens the shared "Add Document Type"
// modal rather than an inline popover, since it needs to work reliably
// anchored inside a <td> as well as a card.
const AddTypeTrigger = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="Add a new document"
    aria-label="Add a new document"
    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-600 dark:text-slate-500 dark:hover:border-primary-400 dark:hover:text-primary-400"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  </button>
);

const FileTypeIcon = ({ url, size = "h-8 w-8" }) => {
  if (isPdf(url)) {
    return (
      <div className={`flex ${size} shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-500/10`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }
  if (isImage(url)) {
    return (
      <div className={`flex ${size} shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-500/10`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  );
};

const buildFilename = (row, url, contentType) => {
  const slug = (row.doc_type || "document").toLowerCase().replace(/\s+/g, "-");
  let ext = getExtension(url);
  if (!ext && contentType) {
    if (contentType.includes("pdf")) ext = "pdf";
    else if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("gif")) ext = "gif";
    else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
  }
  return `employee-${row.employee_id}-${slug}${ext ? `.${ext}` : ""}`;
};

function StatCard({ icon, value, label }) {
  return (
    <div className="h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-full items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

const HierarchyTrail = ({ company, branch, department, designation }) => {
  const steps = [company, branch, department, designation].filter(Boolean);
  if (steps.length === 0) return <p className="text-xs text-slate-400">No organization assigned</p>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
            {step}
          </span>
          {i < steps.length - 1 && <span className="text-slate-300 dark:text-slate-600">›</span>}
        </div>
      ))}
    </div>
  );
};

function EmployeeDetailsModal({ employee, onClose }) {
  return (
    <Modal open={!!employee} onClose={onClose} title="Employee Details">
      {employee && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={`${employee.first_name || ""} ${employee.last_name || ""}`} size="md" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800 dark:text-white">
                {employee.first_name} {employee.last_name}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{employee.employee_code}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">Organization</p>
            <HierarchyTrail
              company={employee.department?.company?.name}
              branch={employee.department?.branch?.name}
              department={employee.department?.department_name}
              designation={employee.designation?.designation_name}
            />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Phone</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{employee.phone || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Email</dt>
              <dd className="mt-0.5 truncate text-slate-700 dark:text-slate-200">{employee.email || "-"}</dd>
            </div>
          </dl>
        </div>
      )}
    </Modal>
  );
}



const PAGE_SIZE = 9;
const TABLE_PAGE_SIZE = 10;

const TableIconButton = ({ onClick, title, disabled, tone = "primary", children }) => {
  const tones = {
    primary: "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",
    slate: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",
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
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

export default function DocumentListPage() {
  const { showToast } = useToast();

  const { data, isLoading, isError, refetch } = useCrudList(
    "employee-documents-raw",
    employeeLifecycleApi.documents,
    { page: 1, per_page: 1000 }
  );
  const allDocuments = data?.items || [];

  const { data: employeesData } = useQuery({
    queryKey: ["documents-page", "employees-full"],
    queryFn: async () => (await employeesApi.list({ page: 1, per_page: 1000, is_active: true })).data.data,
  });
  const employees = employeesData?.items || [];
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  // Filter dropdown source data
  const { data: companyData } = useCompanies({ page: 1, per_page: 100 });
  const companies = companyData?.items || companyData?.data || [];

  const departmentOptions = useDepartmentOptions();
  const designationOptions = useDesignationOptions();

  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [filterDesignationId, setFilterDesignationId] = useState("");

  // Branch options derived from the employee data we already fetch (each
  // employee's department.branch) instead of a separate branches hook —
  // avoids depending on an unverified import path, and needs no extra
  // network call. Narrows to the selected company, same as a normal
  // dependent dropdown would.
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

  const createMutation = useCreateDocument();
  const updateMutation = useUpdateDocument();
  const deactivateMutation = useDeactivateDocument();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [page, setPage] = useState(1);

  const [documentTypeOptions, setDocumentTypeOptions] = useState(getDocumentTypeOptions());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // Set only when the "+" next to a specific document's type is clicked —
  // pre-fills and locks the Employee field in Add Document so it's clear
  // which employee the new document is for. The top-right "+ Add Document"
  // button never sets this, so that flow stays fully open/editable.
  const [presetEmployeeId, setPresetEmployeeId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const activeDocs = allDocuments.filter((d) => d.is_active !== false);
  const inactiveDocs = allDocuments.filter((d) => d.is_active === false);

  const filteredDocs = useMemo(() => {
    return allDocuments.filter((d) => {
      if (statusFilter === "active" && d.is_active === false) return false;
      if (statusFilter === "inactive" && d.is_active !== false) return false;

      const emp = employeeMap[d.employee_id];

      if (filterCompanyId && String(emp?.department?.company?.id) !== String(filterCompanyId)) return false;
      if (filterBranchId && String(emp?.department?.branch?.id) !== String(filterBranchId)) return false;
      if (filterDepartmentId && String(emp?.department?.id) !== String(filterDepartmentId)) return false;
      if (filterDesignationId && String(emp?.designation?.id) !== String(filterDesignationId)) return false;

      if (search) {
        const name = emp ? `${emp.first_name || ""} ${emp.last_name || ""}` : "";
        const haystack = `${d.doc_type || ""} ${name}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [allDocuments, statusFilter, search, employeeMap, filterCompanyId, filterBranchId, filterDepartmentId, filterDesignationId]);

  // Group documents by employee — each employee appears once in the UI,
  // with all of their documents listed underneath. A new document created
  // via the "+" (quick-add for employee) is still its own record on the
  // backend, but this groups it back under that employee visually instead
  // of showing as a disconnected extra row.
  const groupedDocs = useMemo(() => {
    const groups = new Map();
    filteredDocs.forEach((doc) => {
      if (!groups.has(doc.employee_id)) {
        groups.set(doc.employee_id, {
          employeeId: doc.employee_id,
          employee: employeeMap[doc.employee_id],
          docs: [],
        });
      }
      groups.get(doc.employee_id).docs.push(doc);
    });
    return Array.from(groups.values()).sort((a, b) => {
      const nameA = a.employee ? `${a.employee.first_name || ""} ${a.employee.last_name || ""}` : "";
      const nameB = b.employee ? `${b.employee.first_name || ""} ${b.employee.last_name || ""}` : "";
      return nameA.localeCompare(nameB);
    });
  }, [filteredDocs, employeeMap]);

  const pageSize = viewMode === "table" ? TABLE_PAGE_SIZE : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(groupedDocs.length / pageSize));
  const pagedGroups = groupedDocs.slice((page - 1) * pageSize, page * pageSize);

  const downloadFile = async (row) => {
    if (downloadingId) return;
    setDownloadingId(row.id);
    try {
      const res = await fetch(row.file_url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = buildFilename(row, row.file_url, blob.type);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Couldn't download directly — opening the file instead", "error");
      window.open(row.file_url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setPresetEmployeeId(null);
    setModalOpen(true);
  };
  const handleEdit = (doc) => {
    setEditing(doc);
    setPresetEmployeeId(null);
    setModalOpen(true);
  };
  // Triggered by the "+" next to a document's type badge — opens Add
  // Document with that row's employee already selected and locked.
  const handleQuickAddForEmployee = (doc) => {
    setEditing(null);
    setPresetEmployeeId(doc.employee_id);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPresetEmployeeId(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        showToast("Document updated", "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast("Document created", "success");
      }
      setModalOpen(false);
      setEditing(null);
      setPresetEmployeeId(null);
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deactivateMutation.mutateAsync(deleteTarget.id);
      showToast("Document deactivated", "success");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleReactivate = async (doc) => {
    try {
      await updateMutation.mutateAsync({ id: doc.id, payload: { is_active: true } });
      showToast("Document reactivated", "success");
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load employee documents.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="text-lg font-bold">D</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Employee Documents</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Documents uploaded per employee</p>
          </div>
        </div>
        <Button type="button" onClick={handleAdd} className="h-10 w-full px-4 sm:w-auto">
          <span className="mr-1.5 text-lg">+</span>
          Add Document
        </Button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-3a4 4 0 100-8 4 4 0 000 8zm7 3a4 4 0 10-8 0" /></svg>}
          value={employees.length}
          label="Total Employees"
        />
        <StatCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>}
          value={activeDocs.length}
          label="Total Certificates"
        />
        <StatCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="5" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5" /></svg>}
          value={inactiveDocs.length}
          label="Deactivated Documents"
        />
        <StatCard
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          value={documentTypeOptions.length}
          label="Document Types"
        />
      </div>

      {/* SEARCH + COMPANY/BRANCH/DEPARTMENT/DESIGNATION FILTERS + VIEW TOGGLE + STATUS */}
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
                placeholder="Search by employee or document type..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={filterCompanyId}
              onChange={(e) => { setFilterCompanyId(e.target.value); setFilterBranchId(""); setPage(1); }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Companies</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select
              value={filterBranchId}
              onChange={(e) => { setFilterBranchId(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <select
              value={filterDepartmentId}
              onChange={(e) => { setFilterDepartmentId(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Departments</option>
              {departmentOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>

            <select
              value={filterDesignationId}
              onChange={(e) => { setFilterDesignationId(e.target.value); setPage(1); }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Designations</option>
              {designationOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* VIEW TOGGLE */}
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setViewMode("table"); setPage(1); }}
                title="Table view"
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "table" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
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
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "card" ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                Card
              </button>
            </div>

            {/* STATUS TOGGLE */}
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {["active", "inactive", "all"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                    statusFilter === s ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[280px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {!isLoading && viewMode === "table" && pagedGroups.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Document Type</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedGroups.map((group, groupIdx) => {
                const emp = group.employee;
                const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : `Employee #${group.employeeId}`;
                const zebra = groupIdx % 2 === 1 ? "bg-slate-50/60 dark:bg-slate-800/20" : "";

                return group.docs.map((doc, idx) => {
                  const isDownloading = downloadingId === doc.id;
                  const isActive = doc.is_active !== false;
                  const isLastInGroup = idx === group.docs.length - 1;

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-100 dark:hover:bg-slate-800/50 ${zebra} ${isLastInGroup ? "border-b-2 border-slate-300 dark:border-slate-600" : ""}`}
                    >
                      {idx === 0 && (
                        <>
                          <td className="px-4 py-3 align-middle" rowSpan={group.docs.length}>
                            <button type="button" onClick={() => emp && setViewingEmployee(emp)} className="flex items-center gap-2.5 text-left">
                              <Avatar name={empName} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800 hover:text-primary-600 dark:text-slate-100 dark:hover:text-primary-400">{empName}</p>
                                <p className="text-[10px] text-slate-400">{emp?.employee_code || `#${group.employeeId}`}</p>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3 align-middle" rowSpan={group.docs.length}>
                            <HierarchyTrail
                              company={emp?.department?.company?.name}
                              branch={emp?.department?.branch?.name}
                              department={emp?.department?.department_name}
                              designation={emp?.designation?.designation_name}
                            />
                          </td>
                        </>
                      )}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <DocTypeBadge type={doc.doc_type} />
                          <AddTypeTrigger onClick={() => handleQuickAddForEmployee(doc)} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileTypeIcon url={doc.file_url} size="h-7 w-7" />
                          <span className="text-xs uppercase text-slate-400">{getExtension(doc.file_url) || "file"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <TableIconButton title="Preview" onClick={() => setPreviewUrl(doc.file_url)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </TableIconButton>
                          <TableIconButton title={isDownloading ? "Downloading..." : "Download"} onClick={() => downloadFile(doc)} disabled={isDownloading} tone="slate">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                            </svg>
                          </TableIconButton>
                          <TableIconButton title="Edit" onClick={() => handleEdit(doc)} tone="slate">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                            </svg>
                          </TableIconButton>
                          {isActive ? (
                            <TableIconButton title="Delete" onClick={() => setDeleteTarget(doc)} tone="red">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                              </svg>
                            </TableIconButton>
                          ) : (
                            <TableIconButton title="Reactivate" onClick={() => handleReactivate(doc)} disabled={updateMutation.isPending} tone="emerald">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5" />
                              </svg>
                            </TableIconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CARD VIEW */}
      {!isLoading && viewMode === "card" && pagedGroups.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedGroups.map((group) => {
            const emp = group.employee;
            const empName = emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : `Employee #${group.employeeId}`;
            const activeCount = group.docs.filter((d) => d.is_active !== false).length;
            const allInactive = activeCount === 0;

            return (
              <div
                key={group.employeeId}
                className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                  allInactive ? "border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10" : "border-slate-200 hover:border-primary-200 dark:border-slate-700 dark:hover:border-primary-500/40"
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-0.5 ${allInactive ? "bg-red-500" : "bg-primary-600"}`} />
                <div className="p-4">
                  {/* EMPLOYEE HEADER */}
                  <div className="flex items-start justify-between gap-2.5">
                    <button type="button" onClick={() => emp && setViewingEmployee(emp)} disabled={!emp} className="flex min-w-0 items-center gap-2.5 text-left disabled:cursor-default">
                      <Avatar name={empName} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">{empName}</p>
                        <p className="text-[10px] text-slate-400">{emp?.employee_code || `#${group.employeeId}`}</p>
                      </div>
                    </button>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {group.docs.length} doc{group.docs.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <HierarchyTrail
                      company={emp?.department?.company?.name}
                      branch={emp?.department?.branch?.name}
                      department={emp?.department?.department_name}
                      designation={emp?.designation?.designation_name}
                    />
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  {/* ONE ROW PER DOCUMENT FOR THIS EMPLOYEE */}
                  <div className="space-y-2.5">
                    {group.docs.map((doc) => {
                      const isDownloading = downloadingId === doc.id;
                      const isActive = doc.is_active !== false;
                      return (
                        <div key={doc.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60">
                          <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <FileTypeIcon url={doc.file_url} size="h-7 w-7" />
                              <div className="flex min-w-0 items-center gap-1.5">
                                <DocTypeBadge type={doc.doc_type} />
                                <AddTypeTrigger onClick={() => handleQuickAddForEmployee(doc)} />
                              </div>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"}`}>
                              <span className={`h-1 w-1 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                            <div className="flex items-center justify-center py-1.5">
                              <TableIconButton title="Preview" onClick={() => setPreviewUrl(doc.file_url)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </TableIconButton>
                            </div>
                            <div className="flex items-center justify-center py-1.5">
                              <TableIconButton title={isDownloading ? "Downloading..." : "Download"} onClick={() => downloadFile(doc)} disabled={isDownloading} tone="slate">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                                </svg>
                              </TableIconButton>
                            </div>
                            <div className="flex items-center justify-center py-1.5">
                              <TableIconButton title="Edit" onClick={() => handleEdit(doc)} tone="slate">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                                </svg>
                              </TableIconButton>
                            </div>
                            <div className="flex items-center justify-center py-1.5">
                              {isActive ? (
                                <TableIconButton title="Delete" onClick={() => setDeleteTarget(doc)} tone="red">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                                  </svg>
                                </TableIconButton>
                              ) : (
                                <TableIconButton title="Reactivate" onClick={() => handleReactivate(doc)} disabled={updateMutation.isPending} tone="emerald">
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

      {/* EMPTY STATE */}
      {!isLoading && pagedGroups.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xl font-bold text-slate-400">D</span>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">No documents found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No documents match your current search or filters.
          </p>
          <Button onClick={handleAdd} className="mt-4 h-9 px-4 text-sm">+ Add Document</Button>
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>Page {page} of {pageCount}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            Previous
          </button>
          <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit Document" : "Add Document"}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button type="submit" form="employee-documents-form" loading={isSaving} disabled={isSaving}>
              {editing ? "Save" : "Submit"}
            </Button>
          </>
        }
      >
        <DocumentForm
          formId="employee-documents-form"
          initialData={editing || (presetEmployeeId ? { employee_id: presetEmployeeId } : {})}
          onSubmit={handleSubmit}
          loading={isSaving}
          isEdit={!!editing}
          lockEmployee={!editing && !!presetEmployeeId}
        />
      </Modal>

      {/* PREVIEW MODAL */}
      <Modal
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title={<div className="flex items-center gap-2">{previewUrl && <FileTypeIcon url={previewUrl} />}<span>Document Preview</span></div>}
        size="lg"
      >
        {previewUrl && isImage(previewUrl) && <img src={previewUrl} alt="Document preview" className="max-h-[70vh] w-full rounded-lg object-contain" />}
        {previewUrl && isPdf(previewUrl) && <iframe src={previewUrl} title="Document preview" className="h-[70vh] w-full rounded-lg border border-slate-200 dark:border-slate-700" />}
        {previewUrl && !isImage(previewUrl) && !isPdf(previewUrl) && (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Preview isn't available for this file type.{" "}
            <button type="button" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")} className="text-primary-600 hover:underline">
              Open it instead
            </button>.
          </div>
        )}
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Deactivate Document"
        message={deleteTarget ? `Are you sure you want to deactivate this "${deleteTarget.doc_type}" document?` : "Are you sure you want to deactivate this document?"}
        confirmText="Deactivate"
        loading={deactivateMutation.isPending}
      />

      {/* EMPLOYEE DETAILS */}
      <EmployeeDetailsModal employee={viewingEmployee} onClose={() => setViewingEmployee(null)} />
    </div>
  );
}