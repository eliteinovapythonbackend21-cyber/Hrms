import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useCrudList } from "@/hooks/useCrudResource";
import { employeeLifecycleApi } from "@/api/employee.api";
import { employeesApi } from "@/api/employees.api";

import {
  useDepartmentOptions,
  useDesignationOptions,
} from "@/hooks/useLookupOptions";

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
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";


/* -------------------------------------------------------------------------- */
/* FILE HELPERS                                                                */
/* -------------------------------------------------------------------------- */

const getExtension = (url = "") =>
  url.split("?")[0].split(".").pop()?.toLowerCase() || "";

const isImage = (url = "") =>
  ["png", "jpg", "jpeg", "gif", "webp"].includes(
    getExtension(url)
  );

const isPdf = (url = "") =>
  getExtension(url) === "pdf";


/* -------------------------------------------------------------------------- */
/* DOCUMENT TYPE BADGE                                                         */
/* -------------------------------------------------------------------------- */

const DocTypeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-2.5 w-2.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

const DocTypeBadge = ({ type }) => (
  <span className="inline-flex max-w-[150px] items-center gap-1 truncate rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700 ring-1 ring-inset ring-primary-600/20 dark:bg-primary-500/10 dark:text-primary-400 dark:ring-primary-400/30">
    <DocTypeIcon />
    <span className="truncate">
      {type || "Document"}
    </span>
  </span>
);


/* -------------------------------------------------------------------------- */
/* FILE ICON                                                                    */
/* -------------------------------------------------------------------------- */

const FileTypeIcon = ({ size = "h-7 w-7" }) => (
  <div
    className={`flex ${size} shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300`}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 3v5a1 1 0 001 1h5"
      />
    </svg>
  </div>
);


/* -------------------------------------------------------------------------- */
/* DOWNLOAD FILENAME                                                           */
/* -------------------------------------------------------------------------- */

const buildFilename = (
  row,
  url,
  contentType
) => {
  const slug = (row.doc_type || "document")
    .toLowerCase()
    .replace(/\s+/g, "-");

  let ext = getExtension(url);

  if (!ext && contentType) {
    if (contentType.includes("pdf")) {
      ext = "pdf";
    } else if (contentType.includes("png")) {
      ext = "png";
    } else if (contentType.includes("gif")) {
      ext = "gif";
    } else if (
      contentType.includes("jpeg") ||
      contentType.includes("jpg")
    ) {
      ext = "jpg";
    } else if (contentType.includes("webp")) {
      ext = "webp";
    }
  }

  return `employee-${row.employee_id}-${slug}${
    ext ? `.${ext}` : ""
  }`;
};


/* -------------------------------------------------------------------------- */
/* STAT CARD                                                                   */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  value,
  label,
}) {
  return (
    <div className="h-[76px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex h-full items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
          {icon}
        </div>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* ORGANIZATION HIERARCHY                                                      */
/* -------------------------------------------------------------------------- */

const HierarchyTrail = ({
  company,
  branch,
  department,
  designation,
}) => {
  const steps = [
    company,
    branch,
    department,
    designation,
  ].filter(Boolean);

  if (steps.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        No organization assigned
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((step, i) => (
        <div
          key={`${step}-${i}`}
          className="flex items-center gap-1"
        >
          <span className="max-w-[150px] truncate rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
            {step}
          </span>

          {i < steps.length - 1 && (
            <span className="text-slate-300 dark:text-slate-600">
              ›
            </span>
          )}
        </div>
      ))}
    </div>
  );
};


/* -------------------------------------------------------------------------- */
/* DOCUMENTS OVERVIEW                                                          */
/* -------------------------------------------------------------------------- */

function DocumentsOverview({ docs }) {
  if (!docs || docs.length === 0) {
    return (
      <span className="text-xs text-slate-400">
        No documents
      </span>
    );
  }

  return (
    <div className="group/docs relative inline-block">
      <div className="flex cursor-default flex-wrap items-center gap-1">
        {docs.slice(0, 6).map((d) => (
          <span
            key={d.id}
            className={`h-1.5 w-1.5 rounded-full ${
              d.is_active !== false
                ? "bg-primary-500"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          />
        ))}

        {docs.length > 6 && (
          <span className="text-[10px] font-medium text-slate-400">
            +{docs.length - 6}
          </span>
        )}
      </div>

      <div className="pointer-events-none invisible absolute left-0 top-full z-20 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition-opacity duration-150 group-hover/docs:visible group-hover/docs:opacity-100 dark:border-white/10 dark:bg-white/[0.06]">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {docs.length} document
          {docs.length !== 1 ? "s" : ""}
        </p>

        <div className="max-h-44 space-y-0.5 overflow-y-auto">
          {docs.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                {d.doc_type}
              </span>

              <span className="flex shrink-0 items-center gap-1">
                <span className="text-[10px] uppercase text-slate-400">
                  {getExtension(d.file_url) ||
                    "file"}
                </span>

                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    d.is_active !== false
                      ? "bg-emerald-500"
                      : "bg-red-400"
                  }`}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* EMPLOYEE DETAILS MODAL                                                      */
/* -------------------------------------------------------------------------- */

function EmployeeDetailsModal({
  employee,
  onClose,
}) {
  return (
    <Modal
      open={!!employee}
      onClose={onClose}
      title="Employee Details"
    >
      {employee && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={`${employee.first_name || ""} ${
                employee.last_name || ""
              }`}
              size="md"
            />

            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800 dark:text-white">
                {employee.first_name}{" "}
                {employee.last_name}
              </p>

              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {employee.employee_code}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Organization
            </p>

            <HierarchyTrail
              company={
                employee.department?.company?.name
              }
              branch={
                employee.department?.branch?.name
              }
              department={
                employee.department?.department_name
              }
              designation={
                employee.designation
                  ?.designation_name
              }
            />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400">
                Phone
              </dt>

              <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
                {employee.phone || "-"}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-400">
                Email
              </dt>

              <dd className="mt-0.5 truncate text-slate-700 dark:text-slate-200">
                {employee.email || "-"}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Modal>
  );
}


/* -------------------------------------------------------------------------- */
/* CONSTANTS                                                                   */
/* -------------------------------------------------------------------------- */

const PAGE_SIZE = 9;
const TABLE_PAGE_SIZE = 10;

const EXPORT_COLUMNS = [
  {
    key: "employee_id",
    label: "Employee ID",
  },
  {
    key: "doc_type",
    label: "Document Type",
  },
  {
    key: "file_url",
    label: "File URL",
  },
  {
    key: "is_active",
    label: "Active",
  },
];


/* -------------------------------------------------------------------------- */
/* TABLE ACTION BUTTON                                                         */
/* -------------------------------------------------------------------------- */

const TableIconButton = ({
  onClick,
  title,
  disabled,
  tone = "primary",
  children,
}) => {
  const tones = {
    primary:
      "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",

    slate:
      "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",

    red:
      "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",

    emerald:
      "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};


/* -------------------------------------------------------------------------- */
/* PAGE                                                                        */
/* -------------------------------------------------------------------------- */

export default function DocumentListPage() {
  const { showToast } = useToast();


  /* ----------------------------- DOCUMENTS -------------------------------- */

  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useCrudList(
    "employee-documents-raw",
    employeeLifecycleApi.documents,
    {
      page: 1,
      per_page: 1000,
    }
  );

  const allDocuments = data?.items || [];


  /* ----------------------------- EMPLOYEES -------------------------------- */

  const { data: employeesData } =
    useQuery({
      queryKey: [
        "documents-page",
        "employees-full",
      ],

      queryFn: async () =>
        (
          await employeesApi.list({
            page: 1,
            per_page: 1000,
            is_active: true,
          })
        ).data.data,
    });

  const employees =
    employeesData?.items || [];


  /* ----------------------------- EMPLOYEE MAP ----------------------------- */

  const employeeMap = useMemo(
    () =>
      Object.fromEntries(
        employees.map((e) => [
          e.id,
          e,
        ])
      ),
    [employees]
  );


  /* ----------------------------- COMPANIES -------------------------------- */

  const { data: companyData } =
    useCompanies({
      page: 1,
      per_page: 100,
    });

  const companies =
    companyData?.items ||
    companyData?.data ||
    [];


  /* ----------------------------- LOOKUPS ---------------------------------- */

  const departmentOptions =
    useDepartmentOptions();

  const designationOptions =
    useDesignationOptions();


  /* ----------------------------- FILTERS ---------------------------------- */

  const [filterCompanyId, setFilterCompanyId] =
    useState("");

  const [filterBranchId, setFilterBranchId] =
    useState("");

  const [
    filterDepartmentId,
    setFilterDepartmentId,
  ] = useState("");

  const [
    filterDesignationId,
    setFilterDesignationId,
  ] = useState("");


  /* ----------------------------- BRANCHES --------------------------------- */

  const branches = useMemo(() => {
    const map = new Map();

    employees.forEach((e) => {
      const branch =
        e.department?.branch;

      if (!branch?.id) return;

      if (
        filterCompanyId &&
        String(
          e.department?.company?.id
        ) !==
          String(filterCompanyId)
      ) {
        return;
      }

      map.set(branch.id, branch);
    });

    return Array.from(
      map.values()
    );
  }, [
    employees,
    filterCompanyId,
  ]);


  /* ----------------------------- MUTATIONS -------------------------------- */

  const createMutation =
    useCreateDocument();

  const updateMutation =
    useUpdateDocument();

  const deactivateMutation =
    useDeactivateDocument();


  /* ----------------------------- VIEW STATE ------------------------------- */

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("active");

  const [viewMode, setViewMode] =
    useState("card");

  const [page, setPage] =
    useState(1);


  /* ----------------------------- EXPORT ----------------------------------- */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll:
      employeeLifecycleApi.documents.list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns:
      EXPORT_COLUMNS,

    filename:
      "employee-documents",

    title:
      "Employee Documents",
  });

  const [documentTypeOptions] =
    useState(
      getDocumentTypeOptions()
    );


  /* ----------------------------- MODALS ----------------------------------- */

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [presetEmployeeId, setPresetEmployeeId] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [viewingEmployee, setViewingEmployee] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState(null);

  const [downloadingId, setDownloadingId] =
    useState(null);


  /* ----------------------------- STATS ------------------------------------ */

  const activeDocs =
    allDocuments.filter(
      (d) => d.is_active !== false
    );

  const inactiveDocs =
    allDocuments.filter(
      (d) => d.is_active === false
    );


  /* ----------------------------- FILTERED DOCS ---------------------------- */

  const filteredDocs = useMemo(() => {
    return allDocuments.filter((d) => {
      if (
        statusFilter === "active" &&
        d.is_active === false
      ) {
        return false;
      }

      if (
        statusFilter === "inactive" &&
        d.is_active !== false
      ) {
        return false;
      }

      const emp =
        employeeMap[d.employee_id];

      if (
        filterCompanyId &&
        String(
          emp?.department?.company?.id
        ) !==
          String(filterCompanyId)
      ) {
        return false;
      }

      if (
        filterBranchId &&
        String(
          emp?.department?.branch?.id
        ) !==
          String(filterBranchId)
      ) {
        return false;
      }

      if (
        filterDepartmentId &&
        String(
          emp?.department?.id
        ) !==
          String(filterDepartmentId)
      ) {
        return false;
      }

      if (
        filterDesignationId &&
        String(
          emp?.designation?.id
        ) !==
          String(filterDesignationId)
      ) {
        return false;
      }

      if (search) {
        const name = emp
          ? `${emp.first_name || ""} ${
              emp.last_name || ""
            }`
          : "";

        const haystack =
          `${d.doc_type || ""} ${name}`.toLowerCase();

        if (
          !haystack.includes(
            search.toLowerCase()
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    allDocuments,
    statusFilter,
    search,
    employeeMap,
    filterCompanyId,
    filterBranchId,
    filterDepartmentId,
    filterDesignationId,
  ]);


  /* ----------------------------- GROUP DOCS ------------------------------- */

  const groupedDocs = useMemo(() => {
    const groups = new Map();

    filteredDocs.forEach((doc) => {
      if (
        !groups.has(
          doc.employee_id
        )
      ) {
        groups.set(
          doc.employee_id,
          {
            employeeId:
              doc.employee_id,
            employee:
              employeeMap[
                doc.employee_id
              ],
            docs: [],
          }
        );
      }

      groups
        .get(doc.employee_id)
        .docs.push(doc);
    });

    return Array.from(
      groups.values()
    ).sort((a, b) => {
      const nameA = a.employee
        ? `${a.employee.first_name || ""} ${
            a.employee.last_name || ""
          }`
        : "";

      const nameB = b.employee
        ? `${b.employee.first_name || ""} ${
            b.employee.last_name || ""
          }`
        : "";

      return nameA.localeCompare(
        nameB
      );
    });
  }, [
    filteredDocs,
    employeeMap,
  ]);


  /* ----------------------------- PAGINATION ------------------------------- */

  const pageSize =
    viewMode === "table"
      ? TABLE_PAGE_SIZE
      : PAGE_SIZE;

  const pageCount = Math.max(
    1,
    Math.ceil(
      groupedDocs.length /
        pageSize
    )
  );

  const pagedGroups =
    groupedDocs.slice(
      (page - 1) * pageSize,
      page * pageSize
    );


  /* ----------------------------- DOWNLOAD --------------------------------- */

  const downloadFile = async (
    row
  ) => {
    if (downloadingId) return;

    setDownloadingId(row.id);

    try {
      const res = await fetch(
        row.file_url
      );

      if (!res.ok) {
        throw new Error(
          "Download failed"
        );
      }

      const blob =
        await res.blob();

      const blobUrl =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = blobUrl;

      link.download =
        buildFilename(
          row,
          row.file_url,
          blob.type
        );

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        blobUrl
      );
    } catch {
      showToast(
        "Couldn't download directly — opening the file instead",
        "error"
      );

      window.open(
        row.file_url,
        "_blank",
        "noopener,noreferrer"
      );
    } finally {
      setDownloadingId(null);
    }
  };


  /* ----------------------------- ADD -------------------------------------- */

  const handleAdd = () => {
    setEditing(null);
    setPresetEmployeeId(null);
    setModalOpen(true);
  };


  /* ----------------------------- EDIT ------------------------------------- */

  const handleEdit = (doc) => {
    setEditing(doc);
    setPresetEmployeeId(null);
    setModalOpen(true);
  };


  /* ----------------------------- CLOSE MODAL ------------------------------ */

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPresetEmployeeId(null);
  };


  /* ----------------------------- SUBMIT ----------------------------------- */

  const handleSubmit = async (
    payload
  ) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync(
          {
            id: editing.id,
            payload,
          }
        );

        showToast(
          "Document updated",
          "success"
        );
      } else {
        await createMutation.mutateAsync(
          payload
        );

        showToast(
          "Document created",
          "success"
        );
      }

      closeModal();
      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };


  /* ----------------------------- DELETE ----------------------------------- */

  const confirmDelete =
    async () => {
      if (!deleteTarget) return;

      try {
        await deactivateMutation.mutateAsync(
          deleteTarget.id
        );

        showToast(
          "Document deactivated",
          "success"
        );

        setDeleteTarget(
          null
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


  /* ----------------------------- REACTIVATE ------------------------------- */

  const handleReactivate =
    async (doc) => {
      try {
        await updateMutation.mutateAsync(
          {
            id: doc.id,
            payload: {
              is_active: true,
            },
          }
        );

        showToast(
          "Document reactivated",
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


  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending;


  /* ------------------------------------------------------------------------ */
  /* ERROR                                                                     */
  /* ------------------------------------------------------------------------ */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load employee documents.
      </div>
    );
  }


  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-4">

      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <span className="text-base font-bold">
              D
            </span>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Employee Documents
            </h1>

            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Documents uploaded per employee
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={
              exportExcel
            }
            onExportPDF={
              exportPDF
            }
            exporting={
              exporting
            }
          />

          <Button
            type="button"
            onClick={handleAdd}
            className="h-9 w-full px-3.5 text-sm sm:w-auto"
          >
            <span className="mr-1.5 text-base">
              +
            </span>
            Add Document
          </Button>
        </div>
      </div>


      {/* ================================================================== */}
      {/* STAT CARDS                                                         */}
      {/* ================================================================== */}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
        <StatCard
          icon={
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
                d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-3a4 4 0 100-8 4 4 0 000 8zm7 3a4 4 0 10-8 0"
              />
            </svg>
          }
          value={employees.length}
          label="Total Employees"
        />

        <StatCard
          icon={
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
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
              />
            </svg>
          }
          value={activeDocs.length}
          label="Total Certificates"
        />

        <StatCard
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle
                cx="12"
                cy="8"
                r="5"
                strokeWidth="2"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.5 12.5L7 21l5-3 5 3-1.5-8.5"
              />
            </svg>
          }
          value={
            inactiveDocs.length
          }
          label="Deactivated Documents"
        />

        <StatCard
          icon={
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
          value={
            documentTypeOptions.length
          }
          label="Document Types"
        />
      </div>


      {/* ================================================================== */}
      {/* FILTERS                                                            */}
      {/* ================================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-2.5">

          <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">

            {/* SEARCH */}

            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                    d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z"
                  />
                </svg>
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(
                    e.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search by employee or document type..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>


            {/* COMPANY */}

            <select
              value={filterCompanyId}
              onChange={(e) => {
                setFilterCompanyId(
                  e.target.value
                );
                setFilterBranchId("");
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[170px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Companies
              </option>

              {companies.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </option>
              ))}
            </select>


            {/* BRANCH */}

            <select
              value={filterBranchId}
              onChange={(e) => {
                setFilterBranchId(
                  e.target.value
                );
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[170px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Branches
              </option>

              {branches.map((b) => (
                <option
                  key={b.id}
                  value={b.id}
                >
                  {b.name}
                </option>
              ))}
            </select>


            {/* DEPARTMENT */}

            <select
              value={filterDepartmentId}
              onChange={(e) => {
                setFilterDepartmentId(
                  e.target.value
                );
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[170px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Departments
              </option>

              {departmentOptions.map(
                (d) => (
                  <option
                    key={d.value}
                    value={d.value}
                  >
                    {d.label}
                  </option>
                )
              )}
            </select>


            {/* DESIGNATION */}

            <select
              value={filterDesignationId}
              onChange={(e) => {
                setFilterDesignationId(
                  e.target.value
                );
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[170px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Designations
              </option>

              {designationOptions.map(
                (d) => (
                  <option
                    key={d.value}
                    value={d.value}
                  >
                    {d.label}
                  </option>
                )
              )}
            </select>
          </div>


          {/* VIEW MODE + STATUS */}

          <div className="flex flex-wrap items-center justify-between gap-2">

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "table"
                  );
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Table
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "card"
                  );
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Card
              </button>
            </div>


            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.06]">
              {[
                "active",
                "inactive",
                "all",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(
                      s
                    );
                    setPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition ${
                    statusFilter ===
                    s
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* ================================================================== */}
      {/* LOADING                                                            */}
      {/* ================================================================== */}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, i) => (
            <div
              key={i}
              className="h-[190px] animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]"
            />
          ))}
        </div>
      )}


      {/* ================================================================== */}
      {/* TABLE VIEW                                                         */}
      {/* ================================================================== */}

      {!isLoading &&
        viewMode === "table" &&
        pagedGroups.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <table className="w-full min-w-[720px] text-left text-sm lg:min-w-0">
              <thead className="tbl-head border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">
                    Employee
                  </th>

                  <th className="px-3 py-2.5 font-semibold">
                    Organization
                  </th>

                  <th className="px-3 py-2.5 font-semibold">
                    Documents
                  </th>

                  <th className="px-3 py-2.5 font-semibold">
                    Document Type
                  </th>

                  <th className="px-3 py-2.5 font-semibold">
                    File
                  </th>

                  <th className="px-3 py-2.5 font-semibold">
                    Status
                  </th>

                  <th className="px-3 py-2.5 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedGroups.map(
                  (
                    group,
                    groupIdx
                  ) => {
                    const emp =
                      group.employee;

                    const empName =
                      emp
                        ? `${emp.first_name || ""} ${
                            emp.last_name || ""
                          }`.trim()
                        : `Employee #${group.employeeId}`;

                    const zebra =
                      groupIdx %
                        2 ===
                      1
                        ? "bg-slate-50/60 dark:bg-white/[0.03]"
                        : "";

                    return group.docs.map(
                      (
                        doc,
                        idx
                      ) => {
                        const isDownloading =
                          downloadingId ===
                          doc.id;

                        const isActive =
                          doc.is_active !==
                          false;

                        const isLastInGroup =
                          idx ===
                          group.docs
                            .length -
                            1;

                        return (
                          <tr
                            key={
                              doc.id
                            }
                            className={`hover:bg-slate-100 dark:hover:bg-slate-800/50 ${zebra} ${
                              isLastInGroup
                                ? "border-b-2 border-slate-300 dark:border-slate-600"
                                : ""
                            }`}
                          >
                            {idx ===
                              0 && (
                              <>
                                <td
                                  className="px-3 py-2 align-middle"
                                  rowSpan={
                                    group.docs
                                      .length
                                  }
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      emp &&
                                      setViewingEmployee(
                                        emp
                                      )
                                    }
                                    className="flex items-center gap-2 text-left"
                                  >
                                    <Avatar
                                      name={
                                        empName
                                      }
                                      size="sm"
                                    />

                                    <div className="min-w-0">
                                      <p className="truncate text-[13px] font-medium text-slate-800 hover:text-primary-600 dark:text-slate-100 dark:hover:text-primary-400">
                                        {
                                          empName
                                        }
                                      </p>

                                      <p className="text-[10px] text-slate-400">
                                        {emp?.employee_code ||
                                          `#${group.employeeId}`}
                                      </p>
                                    </div>
                                  </button>
                                </td>

                                <td
                                  className="px-3 py-2 align-middle"
                                  rowSpan={
                                    group.docs
                                      .length
                                  }
                                >
                                  <HierarchyTrail
                                    company={
                                      emp?.department
                                        ?.company
                                        ?.name
                                    }
                                    branch={
                                      emp?.department
                                        ?.branch
                                        ?.name
                                    }
                                    department={
                                      emp?.department
                                        ?.department_name
                                    }
                                    designation={
                                      emp?.designation
                                        ?.designation_name
                                    }
                                  />
                                </td>

                                <td
                                  className="overflow-visible px-3 py-2 align-middle"
                                  rowSpan={
                                    group.docs
                                      .length
                                  }
                                >
                                  <DocumentsOverview
                                    docs={
                                      group.docs
                                    }
                                  />
                                </td>
                              </>
                            )}

                            <td className="px-3 py-2 align-middle">
                              <DocTypeBadge
                                type={
                                  doc.doc_type
                                }
                              />
                            </td>

                            <td className="px-3 py-2 align-middle">
                              <div className="flex items-center gap-1.5">
                                <FileTypeIcon size="h-6 w-6" />

                                <span className="text-[11px] font-medium uppercase text-slate-400">
                                  {getExtension(
                                    doc.file_url
                                  ) ||
                                    "file"}
                                </span>
                              </div>
                            </td>

                            <td className="px-3 py-2 align-middle">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isActive
                                      ? "bg-emerald-500"
                                      : "bg-red-500"
                                  }`}
                                />

                                {isActive
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>

                            <td className="px-3 py-2 align-middle">
                              <div className="flex items-center justify-end gap-0.5">

                                {/* PREVIEW */}

                                <TableIconButton
                                  title="Preview"
                                  onClick={() =>
                                    setPreviewUrl(
                                      doc.file_url
                                    )
                                  }
                                  tone="primary"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7z"
                                    />

                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                  </svg>
                                </TableIconButton>

                                {/* DOWNLOAD */}

                                <TableIconButton
                                  title={
                                    isDownloading
                                      ? "Downloading..."
                                      : "Download"
                                  }
                                  onClick={() =>
                                    downloadFile(
                                      doc
                                    )
                                  }
                                  disabled={
                                    isDownloading
                                  }
                                  tone="slate"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                                    />
                                  </svg>
                                </TableIconButton>

                                <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />

                                {/* EDIT */}

                                <TableIconButton
                                  title="Edit"
                                  onClick={() =>
                                    handleEdit(
                                      doc
                                    )
                                  }
                                  tone="slate"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3.5 w-3.5"
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
                                </TableIconButton>

                                {/* DELETE / REACTIVATE */}

                                {isActive ? (
                                  <TableIconButton
                                    title="Delete"
                                    onClick={() =>
                                      setDeleteTarget(
                                        doc
                                      )
                                    }
                                    tone="red"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
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
                                  </TableIconButton>
                                ) : (
                                  <TableIconButton
                                    title="Reactivate"
                                    onClick={() =>
                                      handleReactivate(
                                        doc
                                      )
                                    }
                                    disabled={
                                      updateMutation.isPending
                                    }
                                    tone="emerald"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
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
                                  </TableIconButton>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}


      {/* ================================================================== */}
      {/* COMPACT CARD VIEW                                                  */}
      {/* ================================================================== */}

      {!isLoading &&
        viewMode === "card" &&
        pagedGroups.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pagedGroups.map(
              (group) => {
                const emp =
                  group.employee;

                const empName = emp
                  ? `${emp.first_name || ""} ${
                      emp.last_name || ""
                    }`.trim()
                  : `Employee #${group.employeeId}`;

                const activeCount =
                  group.docs.filter(
                    (d) =>
                      d.is_active !==
                      false
                  ).length;

                const allInactive =
                  activeCount ===
                  0;

                return (
                  <div
                    key={
                      group.employeeId
                    }
                    className={`group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-white/[0.04] ${
                      allInactive
                        ? "border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10"
                        : "border-slate-200 hover:border-primary-200 dark:border-white/10 dark:hover:border-primary-500/40"
                    }`}
                  >
                    {/* TOP ACCENT */}

                    <div
                      className={`absolute inset-x-0 top-0 h-0.5 ${
                        allInactive
                          ? "bg-red-500"
                          : "bg-primary-600"
                      }`}
                    />


                    {/* ==================================================
                        CARD HEADER
                    ================================================== */}

                    <div className="px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            emp &&
                            setViewingEmployee(
                              emp
                            )
                          }
                          disabled={!emp}
                          className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
                        >
                          <Avatar
                            name={
                              empName
                            }
                            size="sm"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                              {
                                empName
                              }
                            </p>

                            <p className="text-[10px] text-slate-400">
                              {emp?.employee_code ||
                                `#${group.employeeId}`}
                            </p>
                          </div>
                        </button>

                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                          {
                            group
                              .docs
                              .length
                          }{" "}
                          doc
                          {group.docs
                            .length !==
                          1
                            ? "s"
                            : ""}
                        </span>
                      </div>


                      {/* ORGANIZATION */}

                      <div className="mt-1.5">
                        <HierarchyTrail
                          company={
                            emp
                              ?.department
                              ?.company
                              ?.name
                          }
                          branch={
                            emp
                              ?.department
                              ?.branch
                              ?.name
                          }
                          department={
                            emp
                              ?.department
                              ?.department_name
                          }
                          designation={
                            emp
                              ?.designation
                              ?.designation_name
                          }
                        />
                      </div>


                      {/* DOCUMENT OVERVIEW */}

                      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 dark:bg-white/[0.03]">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                          Documents
                        </span>

                        <DocumentsOverview
                          docs={
                            group.docs
                          }
                        />
                      </div>
                    </div>


                    <div className="border-t border-slate-100 dark:border-white/10" />


                    {/* ==================================================
                        COMPACT DOCUMENT LIST
                    ================================================== */}

                    <div className="space-y-1.5 px-3 py-2.5">
                      {group.docs.map(
                        (doc) => {
                          const isActive =
                            doc.is_active !==
                            false;

                          const isDownloading =
                            downloadingId ===
                            doc.id;

                          return (
                            <div
                              key={
                                doc.id
                              }
                              className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
                            >
                              {/* DOCUMENT INFO */}

                              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                                <div className="flex min-w-0 items-center gap-2">
                                  <FileTypeIcon size="h-6 w-6" />

                                  <div className="min-w-0">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <DocTypeBadge
                                        type={
                                          doc.doc_type
                                        }
                                      />

                                      <span className="shrink-0 text-[9px] uppercase text-slate-400">
                                        {getExtension(
                                          doc.file_url
                                        ) ||
                                          "file"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                                    isActive
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                      : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                  }`}
                                >
                                  <span
                                    className={`h-1 w-1 rounded-full ${
                                      isActive
                                        ? "bg-emerald-500"
                                        : "bg-red-500"
                                    }`}
                                  />

                                  {isActive
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </div>


                              {/* COMPACT ACTIONS */}

                              <div className="flex items-center justify-end border-t border-slate-100 px-2 py-1 dark:border-white/10">
                                <div className="flex items-center gap-0.5">

                                  {/* PREVIEW */}

                                  <TableIconButton
                                    title="Preview"
                                    onClick={() =>
                                      setPreviewUrl(
                                        doc.file_url
                                      )
                                    }
                                    tone="primary"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7z"
                                      />

                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                      />
                                    </svg>
                                  </TableIconButton>


                                  {/* DOWNLOAD */}

                                  <TableIconButton
                                    title={
                                      isDownloading
                                        ? "Downloading..."
                                        : "Download"
                                    }
                                    onClick={() =>
                                      downloadFile(
                                        doc
                                      )
                                    }
                                    disabled={
                                      isDownloading
                                    }
                                    tone="slate"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                                      />
                                    </svg>
                                  </TableIconButton>


                                  <span className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />


                                  {/* EDIT */}

                                  <TableIconButton
                                    title="Edit"
                                    onClick={() =>
                                      handleEdit(
                                        doc
                                      )
                                    }
                                    tone="slate"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3.5 w-3.5"
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
                                  </TableIconButton>


                                  {/* DELETE / REACTIVATE */}

                                  {isActive ? (
                                    <TableIconButton
                                      title="Delete"
                                      onClick={() =>
                                        setDeleteTarget(
                                          doc
                                        )
                                      }
                                      tone="red"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3.5 w-3.5"
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
                                    </TableIconButton>
                                  ) : (
                                    <TableIconButton
                                      title="Reactivate"
                                      onClick={() =>
                                        handleReactivate(
                                          doc
                                        )
                                      }
                                      disabled={
                                        updateMutation.isPending
                                      }
                                      tone="emerald"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3.5 w-3.5"
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
                                    </TableIconButton>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}


      {/* ================================================================== */}
      {/* EMPTY STATE                                                        */}
      {/* ================================================================== */}

      {!isLoading &&
        pagedGroups.length ===
          0 && (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06]">
              <span className="text-lg font-bold text-slate-400">
                D
              </span>
            </div>

            <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">
              No documents found
            </h3>

            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No documents match your current search
              or filters.
            </p>

            <Button
              onClick={handleAdd}
              className="mt-3 h-8 px-3.5 text-xs"
            >
              + Add Document
            </Button>
          </div>
        )}


      {/* ================================================================== */}
      {/* PAGINATION                                                         */}
      {/* ================================================================== */}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
        <span>
          Page {page} of {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((p) =>
                Math.max(
                  1,
                  p - 1
                )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-slate-700"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              page >= pageCount
            }
            onClick={() =>
              setPage((p) =>
                Math.min(
                  pageCount,
                  p + 1
                )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>


      {/* ================================================================== */}
      {/* ADD / EDIT MODAL                                                   */}
      {/* ================================================================== */}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editing
            ? "Edit Document"
            : "Add Document"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeModal}
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="employee-documents-form"
              loading={isSaving}
              disabled={isSaving}
            >
              {editing
                ? "Save"
                : "Submit"}
            </Button>
          </>
        }
      >
        <DocumentForm
          formId="employee-documents-form"
          initialData={
            editing ||
            (presetEmployeeId
              ? {
                  employee_id:
                    presetEmployeeId,
                }
              : {})
          }
          onSubmit={handleSubmit}
          loading={isSaving}
          isEdit={!!editing}
          lockEmployee={
            !editing &&
            !!presetEmployeeId
          }
        />
      </Modal>


      {/* ================================================================== */}
      {/* PREVIEW MODAL                                                      */}
      {/* ================================================================== */}

      <Modal
        open={!!previewUrl}
        onClose={() =>
          setPreviewUrl(null)
        }
        title={
          <div className="flex items-center gap-2">
            <FileTypeIcon size="h-6 w-6" />
            <span>
              Document Preview
            </span>
          </div>
        }
        size="lg"
      >
        {previewUrl &&
          isImage(
            previewUrl
          ) && (
            <img
              src={
                previewUrl
              }
              alt="Document preview"
              className="max-h-[70vh] w-full rounded-lg object-contain"
            />
          )}

        {previewUrl &&
          isPdf(
            previewUrl
          ) && (
            <iframe
              src={
                previewUrl
              }
              title="Document preview"
              className="h-[70vh] w-full rounded-lg border border-slate-200 dark:border-white/10"
            />
          )}

        {previewUrl &&
          !isImage(
            previewUrl
          ) &&
          !isPdf(
            previewUrl
          ) && (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Preview isn't available for this file type.{" "}
              <button
                type="button"
                onClick={() =>
                  window.open(
                    previewUrl,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="text-primary-600 hover:underline"
              >
                Open it instead
              </button>
              .
            </div>
          )}
      </Modal>


      {/* ================================================================== */}
      {/* DELETE CONFIRM                                                     */}
      {/* ================================================================== */}

      <ConfirmDialog
        open={
          !!deleteTarget
        }
        onClose={() =>
          setDeleteTarget(
            null
          )
        }
        onConfirm={
          confirmDelete
        }
        title="Deactivate Document"
        message={
          deleteTarget
            ? `Are you sure you want to deactivate this "${deleteTarget.doc_type}" document?`
            : "Are you sure you want to deactivate this document?"
        }
        confirmText="Deactivate"
        loading={
          deactivateMutation.isPending
        }
      />


      {/* ================================================================== */}
      {/* EMPLOYEE DETAILS                                                   */}
      {/* ================================================================== */}

      <EmployeeDetailsModal
        employee={
          viewingEmployee
        }
        onClose={() =>
          setViewingEmployee(
            null
          )
        }
      />
    </div>
  );
}