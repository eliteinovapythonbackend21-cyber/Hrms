import { useState } from "react";
import GenericListPage from "@/components/table/GenericListPage";
import Modal from "@/components/ui/Modal";
import DocumentForm from "./DocumentForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useDocuments, useCreateDocument, useDeactivateDocument } from "./useDocuments";
import { useToast } from "@/components/feedback/Toast";

const getExtension = (url = "") => url.split("?")[0].split(".").pop()?.toLowerCase() || "";
const isImage = (url) => ["png", "jpg", "jpeg", "gif"].includes(getExtension(url));
const isPdf = (url) => getExtension(url) === "pdf";

// Color-coded badges per document type so the table is scannable at a
// glance instead of a flat column of plain text. Falls back to slate for
// any type not in this map (e.g. if new types get added later).
const DOC_TYPE_STYLES = {
  Aadhaar: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-400/30",
  "Bank Details": "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
  "Experience Certificate": "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-400/30",
};
const DEFAULT_BADGE = "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-400/20";

const DocTypeBadge = ({ type }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${DOC_TYPE_STYLES[type] || DEFAULT_BADGE}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {type}
  </span>
);

// Small file-type icon shown next to the filename/URL — quick visual cue
// for whether it's a PDF or an image without needing to open it.
const FileTypeIcon = ({ url }) => {
  if (isPdf(url)) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-500/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }
  if (isImage(url)) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-500/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  );
};

// Round icon-button used for both View and Download actions — tooltip via
// title, hover ring, and a disabled state for the download-in-progress case.
const IconButton = ({ onClick, title, disabled, tone = "primary", children }) => {
  const tones = {
    primary: "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",
    slate: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",
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

// Builds a human-readable filename, e.g. "employee-1-aadhaar.pdf", instead
// of relying on whatever the storage URL happens to contain (often a
// random hash on S3/CDN-hosted files with no useful extension).
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

export default function DocumentListPage() {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const { showToast } = useToast();

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

  const COLUMNS = [
    { key: "employee_id", label: "Employee ID" },
    {
      key: "doc_type",
      label: "Document Type",
      render: (r) => <DocTypeBadge type={r.doc_type} />,
    },
    {
      key: "file",
      label: "File",
      render: (r) => (
        <div className="flex items-center gap-2">
          <FileTypeIcon url={r.file_url} />
          <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {getExtension(r.file_url) || "file"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => {
        const isDownloading = downloadingId === r.id;
        return (
          <div className="flex items-center gap-1">
            <IconButton title="Preview" onClick={() => setPreviewUrl(r.file_url)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </IconButton>
            <IconButton title={isDownloading ? "Downloading..." : "Download"} onClick={() => downloadFile(r)} disabled={isDownloading} tone="slate">
              {isDownloading ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
              )}
            </IconButton>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <GenericListPage
        module="Employee Documents"
        title="Employee Documents"
        subtitle="Documents uploaded per employee"
        columns={COLUMNS}
        api={employeeLifecycleApi.documents}
        useList={useDocuments}
        useCreate={useCreateDocument}
        useRemove={useDeactivateDocument}
        filename="employee-documents"
        searchPlaceholder="Search by document type..."
        FormComponent={DocumentForm}
        formTitle="Document"
        addLabel="Add Document"
        actionsMode="none"
        entityLabel="Document"
      />

      <Modal
        open={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        title={
          <div className="flex items-center gap-2">
            {previewUrl && <FileTypeIcon url={previewUrl} />}
            <span>Document Preview</span>
          </div>
        }
        size="lg"
      >
        {previewUrl && isImage(previewUrl) && (
          <img src={previewUrl} alt="Document preview" className="max-h-[70vh] w-full rounded-lg object-contain" />
        )}
        {previewUrl && isPdf(previewUrl) && (
          <iframe src={previewUrl} title="Document preview" className="h-[70vh] w-full rounded-lg border border-slate-200 dark:border-slate-700" />
        )}
        {previewUrl && !isImage(previewUrl) && !isPdf(previewUrl) && (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Preview isn't available for this file type.{" "}
            <button type="button" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")} className="text-primary-600 hover:underline">
              Open it instead
            </button>
            .
          </div>
        )}
      </Modal>
    </>
  );
}