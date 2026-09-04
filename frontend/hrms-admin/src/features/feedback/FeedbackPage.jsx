import { useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Avatar from "@/components/ui/Avatar";
import { useToast } from "@/components/feedback/Toast";

import {
  useFeedbackTickets,
  useCreateFeedbackTicket,
  useUpdateFeedbackTicket,
  useDeactivateFeedbackTicket,
} from "./useFeedback";

import { getUser } from "@/utils/tokenHelpers";
import { isAdmin as checkIsAdmin } from "@/constants/roles";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { formatDateTime } from "@/utils/formatDate";
import { useMyEmployee } from "@/hooks/useMyEmployee";

/* =========================================================
   TOP-LEVEL BUG CATEGORIES

   Sent to the API as `category`. Validated server-side against
   feedback_routes.py's CATEGORY_OPTIONS (must stay in sync).
========================================================= */

const MAIN_CATEGORY_OPTIONS = [
  "Feature Bug",
  "Internal Bug",
  "Other Bugs/Issues",
];

/* =========================================================
   DETAILED TICKET REASONS

   Sent to the API as `reason`. Validated server-side against
   feedback_routes.py's REASON_OPTIONS (must stay in sync).
========================================================= */

const REASON_OPTIONS = [
  "Login / Password Issue",
  "Account Locked / Access Issue",
  "Employee Profile Update",
  "Employee Master Data Correction",
  "New Employee Creation",
  "Employee Exit / Deactivation",
  "Attendance Issue",
  "Attendance Regularization",
  "Leave Balance Issue",
  "Leave Application Issue",
  "Leave Approval Issue",
  "Holiday / Calendar Issue",
  "Shift / Roster Issue",
  "Work From Home / Remote Work Issue",
  "Overtime Issue",
  "Payroll / Salary Issue",
  "Payslip Issue",
  "Tax / TDS Issue",
  "Reimbursement Issue",
  "Expense Claim Issue",
  "Loan / Advance Issue",
  "Bank Account / Payment Details Update",
  "Benefits / Insurance Issue",
  "Performance Management Issue",
  "Appraisal / Rating Issue",
  "Training / Learning Issue",
  "Recruitment / Hiring Issue",
  "Onboarding Issue",
  "Employee Documents Issue",
  "HR Letter / Certificate Request",
  "Organization / Department Change",
  "Manager / Reporting Structure Change",
  "Transfer / Location Change",
  "Notification / Email Issue",
  "Mobile App Issue",
  "HRMS System Error",
  "Data / Report Issue",
  "Integration Issue",
  "Approval Workflow Issue",
  "Permission / Role Access Request",
  "Feature / Configuration Request",
  "HR Policy / Process Clarification",
  "General HRMS Query",
  "Other / Miscellaneous",
];

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved"];

// Non-admin edits are only allowed while a ticket is still "Open" —
// must match feedback_routes.py's EDITABLE_STATUS.
const EDITABLE_STATUS = "Open";

const STATUS_BADGE_CLASS = {
  Open: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  "In Progress":
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Resolved:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

const STATUS_DOT_CLASS = {
  Open: "bg-slate-400",
  "In Progress": "bg-amber-500",
  Resolved: "bg-emerald-500",
};

/* =========================================================
   ICONS
========================================================= */

const TicketIcon = ({ className = "h-5 w-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 9h8M8 12h6M8 15h4"
    />
  </svg>
);

const PlusIcon = ({ className = "h-4 w-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  </svg>
);

const OpenStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 7v5l3 2" />
  </svg>
);

const ProgressStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 1.5" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 12a8 8 0 0113.66-5.66M20 12a8 8 0 01-13.66 5.66"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v4h4M20 20v-4h-4"
    />
  </svg>
);

const ResolvedStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" />
  </svg>
);

const GridIcon = ({ className = "h-4 w-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const TableViewIcon = ({ className = "h-4 w-4" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path strokeLinecap="round" d="M3 9.5h18M3 14.5h18M9 4v16" />
  </svg>
);

/* =========================================================
   STAT TILE
========================================================= */

function StatTile({ tone, label, value, icon }) {
  const styles = {
    primary: {
      border: "border-slate-200 dark:border-white/10",
      icon: "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
      value: "text-slate-900 dark:text-white",
    },
    slate: {
      border: "border-slate-200 dark:border-white/10",
      icon: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
      value: "text-slate-900 dark:text-white",
    },
    amber: {
      border: "border-amber-100 dark:border-amber-900/30",
      icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      value: "text-amber-600 dark:text-amber-400",
    },
    emerald: {
      border: "border-emerald-100 dark:border-emerald-900/30",
      icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      value: "text-emerald-600 dark:text-emerald-400",
    },
  }[tone];

  return (
    <div
      className={`relative h-[100px] overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md dark:bg-white/[0.04] ${styles.border}`}
    >
      <div className="flex h-full items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className={`mt-1 text-2xl font-bold tracking-tight ${styles.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

/* =========================================================
   ADD TICKET MODAL
========================================================= */

function AddTicketModal({ open, onClose, onCreated }) {
  const { showToast } = useToast();
  const createTicket = useCreateFeedbackTicket();
  const user = getUser();
  const { employee } = useMyEmployee();

  const employeeCode = employee?.employee_code || "";
  const employeeId = employee?.id || "";
  const employeeName =
    [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "";

  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resetForm = () => {
    setCategory("");
    setReason("");
    setPurpose("");
    setDescription("");
    setScreenshot(null);
    setPreview(null);
    setPreviewOpen(false);
  };

  const handleClose = () => {
    if (createTicket.isPending) return;
    resetForm();
    onClose();
  };

  const handleFileChange = (file) => {
    if (!file) {
      setScreenshot(null);
      setPreview(null);
      return;
    }

    if (!file.type?.startsWith("image/")) {
      showToast("Please select an image file", "error");
      return;
    }

    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!category) {
      showToast("Please select a category", "error");
      return;
    }

    if (!reason) {
      showToast("Please select a support ticket reason", "error");
      return;
    }

    if (!purpose.trim()) {
      showToast("Please enter the ticket purpose", "error");
      return;
    }

    if (!description.trim()) {
      showToast("Please enter the ticket description", "error");
      return;
    }

    try {
      const payload = {
        employee: employeeCode,
        employee_id: employeeId,
        name: employeeName,
        category,
        reason,
        purpose: purpose.trim(),
        description: description.trim(),
      };

      if (screenshot) {
        payload.screenshot = screenshot;
      }

      await createTicket.mutateAsync(payload);

      showToast("Support ticket created successfully", "success");
      resetForm();
      await onCreated?.();
      onClose();
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Failed to create support ticket",
        "error"
      );
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Support Ticket" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center gap-3">
            <Avatar
              name={employeeName || user?.username || "Employee"}
              src={resolveUploadUrl(user?.profile_picture?.url)}
              size="md"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Employee Details
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These details are taken from the logged-in account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <FieldLabel>Employee</FieldLabel>
              <input
                value={employeeCode || "Not Available"}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              />
            </div>

            <div>
              <FieldLabel>Employee ID</FieldLabel>
              <input
                value={employeeId || "Not Available"}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              />
            </div>

            <div>
              <FieldLabel>Name</FieldLabel>
              <input
                value={employeeName || "Not Available"}
                readOnly
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel required>Category</FieldLabel>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">Select a category</option>
              {MAIN_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel required>Support Ticket Reason</FieldLabel>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">Select a reason</option>
              {REASON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel required>Purpose</FieldLabel>
          <input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Enter the purpose of this support ticket"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>

        <div>
          <FieldLabel required>Description</FieldLabel>
          <textarea
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue or request in detail..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>

        <div>
          <FieldLabel>Upload Screenshot</FieldLabel>

          {preview ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="shrink-0"
                  title="Preview screenshot"
                >
                  <img
                    src={preview}
                    alt="Screenshot preview"
                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-white/10"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                    {screenshot?.name}
                  </p>

                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileChange(null)}
                      className="text-xs font-semibold text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-600 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-primary-400 dark:ring-white/10">
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
                    d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  />
                </svg>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-primary-600 dark:text-primary-400">
                  Upload a screenshot
                </span>{" "}
                of the issue (optional)
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
            </label>
          )}

          {previewOpen && (
            <Modal
              open={previewOpen}
              onClose={() => setPreviewOpen(false)}
              title="Screenshot Preview"
              size="lg"
            >
              <img
                src={preview}
                alt="Screenshot preview"
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            </Modal>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={createTicket.isPending}
          >
            Cancel
          </Button>

          <Button type="submit" isLoading={createTicket.isPending}>
            Add Ticket
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   EMPLOYEE — EDIT TICKET MODAL

   Only reachable by the ticket's owner, and only while the ticket
   is still EDITABLE_STATUS ("Open") — enforced both here (button is
   hidden/disabled) and server-side (feedback_routes.py rejects the
   PUT otherwise).
========================================================= */

function EditTicketModal({ ticket, open, onClose }) {
  const { showToast } = useToast();
  const updateTicket = useUpdateFeedbackTicket();

  const [category, setCategory] = useState(ticket?.category || "");
  const [reason, setReason] = useState(ticket?.subcategory || "");
  const [purpose, setPurpose] = useState(ticket?.purpose || "");
  const [description, setDescription] = useState(ticket?.description || "");

  const handleSave = async () => {
    if (!ticket) return;

    if (!category) {
      showToast("Please select a category", "error");
      return;
    }

    if (!reason) {
      showToast("Please select a support ticket reason", "error");
      return;
    }

    if (!purpose.trim()) {
      showToast("Please enter the ticket purpose", "error");
      return;
    }

    if (!description.trim()) {
      showToast("Please enter the ticket description", "error");
      return;
    }

    try {
      await updateTicket.mutateAsync({
        id: ticket.id,
        payload: {
          category,
          reason,
          purpose: purpose.trim(),
          description: description.trim(),
        },
      });

      showToast("Support ticket updated", "success");
      onClose();
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Failed to update support ticket",
        "error"
      );
    }
  };

  if (!ticket) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Ticket ${ticket.ticket_number || `#${ticket.id}`}`}
      size="lg"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel required>Category</FieldLabel>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">Select a category</option>
              {MAIN_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel required>Support Ticket Reason</FieldLabel>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">Select a reason</option>
              {REASON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel required>Purpose</FieldLabel>
          <input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Enter the purpose of this support ticket"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>

        <div>
          <FieldLabel required>Description</FieldLabel>
          <textarea
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue or request in detail..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>

        <p className="text-xs text-slate-400">
          The screenshot attached at creation can't be changed here — deactivate
          this ticket and raise a new one if you need to attach a different image.
        </p>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" isLoading={updateTicket.isPending} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   ADMIN — UPDATE TICKET MODAL
========================================================= */

function UpdateTicketModal({ ticket, open, onClose }) {
  const { showToast } = useToast();
  const updateTicket = useUpdateFeedbackTicket();

  const [status, setStatus] = useState(ticket?.status || "Open");
  const [response, setResponse] = useState(ticket?.admin_response || "");

  const handleSave = async () => {
    if (!ticket) return;

    try {
      await updateTicket.mutateAsync({
        id: ticket.id,
        payload: {
          status,
          admin_response: response.trim() || null,
        },
      });

      showToast("Support ticket updated", "success");
      onClose();
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Failed to update support ticket",
        "error"
      );
    }
  };

  if (!ticket) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Ticket ${ticket.ticket_number || `#${ticket.id}`}`}
      size="lg"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Employee Details
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] text-slate-400">Employee</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                {ticket.employee || "-"}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-slate-400">Employee ID</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                {ticket.employee_id || "-"}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-slate-400">Name</p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
                {ticket.name || ticket.raised_by_user?.username || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Category
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {ticket.category || "-"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Reason
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {ticket.subcategory || "-"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Created
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {ticket.created_at ? formatDateTime(ticket.created_at) : "-"}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Purpose
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {ticket.purpose || "-"}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">
              {ticket.description || "-"}
            </p>
          </div>

          {ticket.screenshot_url && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Screenshot
              </p>
              <a
                href={resolveUploadUrl(ticket.screenshot_url)}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={resolveUploadUrl(ticket.screenshot_url)}
                  alt="Ticket screenshot"
                  className="h-32 rounded-lg object-cover ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-white/10"
                />
              </a>
            </div>
          )}
        </div>

        <div>
          <FieldLabel>Status</FieldLabel>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  status === option
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400"
                    : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASS[option]}`} />
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Resolution / Update Note</FieldLabel>
          <textarea
            rows={4}
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            placeholder="Enter the action taken or resolution details..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" isLoading={updateTicket.isPending} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   HOVER TRIGGER (shared by card + table views)

   Same pattern as TransferListPage's DepartmentHoverTrigger: the
   hover/focus group is scoped to a NAMED group ("group/ticket") on
   a small trigger element, not the whole card/row. That's what
   keeps the panel from popping up when hovering unrelated things
   like the Edit/Manage/Deactivate buttons — only hovering (or
   focusing) the wrapped trigger reveals it. Positioned below the
   trigger (`top-full` + `mt-2`), not stacked on top of it, and
   toggled via invisible/visible (not just opacity) so it never
   intercepts clicks while hidden.
========================================================= */

function TicketHoverTrigger({ children, panel, align = "left" }) {
  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  };

  return (
    <div tabIndex={0} className="group/ticket relative inline-flex max-w-full outline-none">
      <div className="max-w-full">{children}</div>

      <div
        className={`pointer-events-none invisible absolute top-full z-[100] mt-2 opacity-0 transition-all duration-150 group-hover/ticket:pointer-events-auto group-hover/ticket:visible group-hover/ticket:opacity-100 group-focus/ticket:pointer-events-auto group-focus/ticket:visible group-focus/ticket:opacity-100 ${alignClasses[align]}`}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   HOVER DETAIL PANEL CONTENT

   The actual card shown by TicketHoverTrigger. Shows the full,
   un-clamped ticket details.
========================================================= */

function TicketDetailsPanel({ ticket }) {
  return (
    <div className="w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xl dark:border-white/10 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {ticket.ticket_number || `#${ticket.id}`}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {ticket.created_at ? formatDateTime(ticket.created_at) : "-"}
          </p>
        </div>
        <Badge className={STATUS_BADGE_CLASS[ticket.status] || STATUS_BADGE_CLASS.Open}>
          {ticket.status || "Open"}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
          {ticket.category || "-"}
        </Badge>
        <Badge className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
          {ticket.subcategory || "General HRMS Query"}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-400">Employee</p>
          <p className="mt-0.5 truncate text-slate-700 dark:text-slate-200">
            {ticket.employee || "-"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-400">ID</p>
          <p className="mt-0.5 truncate text-slate-700 dark:text-slate-200">
            {ticket.employee_id || "-"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-400">Name</p>
          <p className="mt-0.5 truncate text-slate-700 dark:text-slate-200">
            {ticket.name || ticket.raised_by_user?.username || "-"}
          </p>
        </div>
      </div>

      {ticket.purpose && ticket.purpose.trim() !== "-" && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Purpose
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-white">
            {ticket.purpose}
          </p>
        </div>
      )}

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Description
        </p>
        <p className="mt-0.5 max-h-[140px] overflow-y-auto whitespace-pre-wrap text-sm leading-5 text-slate-600 dark:text-slate-300">
          {ticket.description || "-"}
        </p>
      </div>

      {ticket.screenshot_url && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Screenshot
          </p>
          <img
            src={resolveUploadUrl(ticket.screenshot_url)}
            alt="Ticket screenshot"
            className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-white/10"
          />
        </div>
      )}

      {ticket.admin_response && (
        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-500/10">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Admin Update
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-emerald-800 dark:text-emerald-200">
            {ticket.admin_response}
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TICKET ACTIONS (role-gated)

   Admin  -> "Manage" (status / admin response)
   Owner  -> "Edit" (only while EDITABLE_STATUS) + "Deactivate"
========================================================= */

function TicketActions({ ticket, isAdmin, onManage, onEdit, onDeactivate, onReactivate }) {
  const isActive = ticket.is_active !== false;

  // Owner can edit/deactivate only while the ticket is Open AND the
  // admin hasn't left a response yet — a response is a sign the admin
  // is already working it, even before they've moved status off Open.
  const canEdit =
    isActive && ticket.status === EDITABLE_STATUS && !ticket.admin_response;

  // A deactivated (withdrawn/removed) ticket only ever offers one
  // action — bringing it back — for either an admin or its owner,
  // mirroring TransferListPage's Reactivate button for inactive rows.
  if (!isActive) {
    return (
      <button
        type="button"
        onClick={() => onReactivate(ticket)}
        title="Reactivate ticket"
        className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
      >
        Reactivate
      </button>
    );
  }

  if (isAdmin) {
    return (
      <button
        type="button"
        onClick={() => onManage(ticket)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
      >
        Manage
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => canEdit && onEdit(ticket)}
        disabled={!canEdit}
        title={
          canEdit
            ? "Edit ticket"
            : `Only "${EDITABLE_STATUS}" tickets an admin hasn't responded to yet can be edited`
        }
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          canEdit
            ? "border-slate-200 text-slate-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
            : "cursor-not-allowed border-slate-100 text-slate-300 dark:border-white/5 dark:text-slate-600"
        }`}
      >
        Edit
      </button>
      {/* Same rule as Edit: an employee can only withdraw their own
          ticket while it's still "Open" and an admin hasn't responded
          yet. Enforced server-side too, in deactivate_feedback. */}
      <button
        type="button"
        onClick={() => canEdit && onDeactivate(ticket)}
        disabled={!canEdit}
        title={
          canEdit
            ? "Deactivate ticket"
            : `Only "${EDITABLE_STATUS}" tickets an admin hasn't responded to yet can be deactivated`
        }
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          canEdit
            ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-500/10"
            : "cursor-not-allowed border-slate-100 text-slate-300 dark:border-white/5 dark:text-slate-600"
        }`}
      >
        Deactivate
      </button>
    </div>
  );
}

/* =========================================================
   TICKET CARD
========================================================= */

function TicketCard({ ticket, isAdmin, onManage, onEdit, onDeactivate, onReactivate }) {
  // Treat a blank/placeholder purpose as "no purpose", so we don't
  // waste a full row on a label + dash.
  const hasPurpose = ticket.purpose && ticket.purpose.trim() !== "-";
  const isActive = ticket.is_active !== false;

  return (
    <div
      className={`relative rounded-2xl border bg-white p-3.5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:bg-white/[0.04] ${
        isActive
          ? "border-slate-200 dark:border-white/10"
          : "border-slate-200 opacity-75 dark:border-white/10"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-0.5 rounded-t-2xl ${
          !isActive
            ? "bg-slate-300 dark:bg-slate-600"
            : ticket.status === "Resolved"
            ? "bg-emerald-500"
            : ticket.status === "In Progress"
            ? "bg-amber-500"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Hovering/focusing the ticket number + timestamp is what
            reveals the full-detail panel — scoped to just this
            trigger, so hovering Edit/Manage/Deactivate below never
            triggers it. */}
        <TicketHoverTrigger align="left" panel={<TicketDetailsPanel ticket={ticket} />}>
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <TicketIcon className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {ticket.ticket_number || `#${ticket.id}`}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {ticket.created_at ? formatDateTime(ticket.created_at) : "-"}
              </p>
            </div>
          </div>
        </TicketHoverTrigger>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge className={STATUS_BADGE_CLASS[ticket.status] || STATUS_BADGE_CLASS.Open}>
            {ticket.status || "Open"}
          </Badge>
          {!isActive && (
            <Badge className="bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">
              Inactive
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
          {ticket.category || "-"}
        </Badge>
        <Badge className="bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
          {ticket.subcategory || "General HRMS Query"}
        </Badge>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">
            Employee:{" "}
          </span>
          {ticket.employee || "-"}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">
            ID:{" "}
          </span>
          {ticket.employee_id || "-"}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">
            Name:{" "}
          </span>
          {ticket.name || ticket.raised_by_user?.username || "-"}
        </p>
      </div>

      {hasPurpose && (
        <div className="mt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Purpose
          </p>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            {ticket.purpose}
          </p>
        </div>
      )}

      <div className="mt-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Description
        </p>
        <p className="line-clamp-3 text-sm leading-5 text-slate-600 dark:text-slate-300">
          {ticket.description || "-"}
        </p>
      </div>

      {ticket.screenshot_url && (
        <a
          href={resolveUploadUrl(ticket.screenshot_url)}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-block"
        >
          <img
            src={resolveUploadUrl(ticket.screenshot_url)}
            alt="Ticket screenshot"
            className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-white/10"
          />
        </a>
      )}

      {ticket.admin_response && (
        <div className="mt-2.5 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-500/10">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Admin Update
          </p>
          <p className="whitespace-pre-wrap text-xs leading-5 text-emerald-800 dark:text-emerald-200">
            {ticket.admin_response}
          </p>
        </div>
      )}

      <div className="mt-2.5 flex justify-end border-t border-slate-100 pt-2 dark:border-white/10">
        <TicketActions
          ticket={ticket}
          isAdmin={isAdmin}
          onManage={onManage}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
        />
      </div>
    </div>
  );
}

/* =========================================================
   TICKET TABLE
========================================================= */

function TicketTable({ tickets, isAdmin, onManage, onEdit, onDeactivate, onReactivate }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
        <thead className="bg-slate-50 dark:bg-white/[0.03]">
          <tr>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Ticket
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Category
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Reason
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Employee
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Status
            </th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Created
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {tickets.map((ticket) => {
            const isActive = ticket.is_active !== false;

            return (
              <tr
                key={ticket.id}
                className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03] ${
                  isActive ? "" : "opacity-60"
                }`}
              >
                <td className="relative whitespace-nowrap px-4 py-3">
                  {/* Same scoped trigger as the card view — hovering
                      the ticket number reveals the panel; hovering
                      Edit/Manage/Deactivate in the Actions cell does
                      not, since it's a separate, unrelated group. */}
                  <TicketHoverTrigger align="left" panel={<TicketDetailsPanel ticket={ticket} />}>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {ticket.ticket_number || `#${ticket.id}`}
                    </p>
                  </TicketHoverTrigger>
                </td>
                <td className="px-4 py-3">
                  <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                    {ticket.category || "-"}
                  </Badge>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-600 dark:text-slate-300">
                  {ticket.subcategory || "General HRMS Query"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                  {ticket.employee || "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge className={STATUS_BADGE_CLASS[ticket.status] || STATUS_BADGE_CLASS.Open}>
                      {ticket.status || "Open"}
                    </Badge>
                    {!isActive && (
                      <Badge className="bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                  {ticket.created_at ? formatDateTime(ticket.created_at) : "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="inline-flex justify-end">
                    <TicketActions
                      ticket={ticket}
                      isAdmin={isAdmin}
                      onManage={onManage}
                      onEdit={onEdit}
                      onDeactivate={onDeactivate}
                      onReactivate={onReactivate}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function FeedbackPage() {
  const user = getUser();
  const isAdmin = checkIsAdmin(user);
  const { showToast } = useToast();
  const deactivateTicket = useDeactivateFeedbackTicket();
  // Reactivate reuses the same update mutation with { is_active: true },
  // same pattern as TransferListPage's handleReactivate.
  const reactivateTicket = useUpdateFeedbackTicket();

  const [statusFilter, setStatusFilter] = useState("");
  // "active" | "inactive" | "all" — mirrors TransferListPage's
  // statusFilter for is_active, kept separate from the workflow
  // statusFilter above (Open/In Progress/Resolved).
  const [activeFilter, setActiveFilter] = useState("active");
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [managingTicket, setManagingTicket] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);

  const { data, isLoading, refetch } = useFeedbackTickets({
    per_page: 200,
    status: statusFilter || undefined,
    // "all" omits the filter entirely so both show up.
    is_active:
      activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const tickets = data?.items || [];
  const totalCount = data?.total ?? tickets.length;
  const openCount = tickets.filter((ticket) => ticket.status === "Open").length;
  const progressCount = tickets.filter((ticket) => ticket.status === "In Progress").length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === "Resolved").length;

  const handleDeactivate = async (ticket) => {
    const confirmed = window.confirm(
      `Deactivate ticket ${ticket.ticket_number || `#${ticket.id}`}? This can't be undone from here.`
    );

    if (!confirmed) return;

    try {
      await deactivateTicket.mutateAsync(ticket.id);
      showToast("Support ticket deactivated", "success");
    } catch (error) {
      // If the server never actually received a request (error.response
      // is undefined), this failed before any network call — almost
      // always a missing/misnamed method on feedbackApi (e.g.
      // `feedbackApi.deactivate` doesn't exist yet). Surface the real
      // JS error message in that case instead of a generic one, so it's
      // obvious what to fix.
      const message = error?.response
        ? error.response.data?.message || "Failed to deactivate support ticket"
        : error?.message || "Failed to deactivate support ticket";

      showToast(message, "error");

      if (!error?.response) {
        // eslint-disable-next-line no-console
        console.error(
          "Deactivate ticket failed before any network request was sent:",
          error
        );
      }
    }
  };

  const handleReactivate = async (ticket) => {
    try {
      await reactivateTicket.mutateAsync({
        id: ticket.id,
        payload: { is_active: true },
      });
      showToast("Support ticket reactivated", "success");
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reactivate support ticket",
        "error"
      );
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <TicketIcon />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Support Ticket
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {isAdmin
                ? "Manage employee support tickets and track resolutions"
                : "Create and track your support tickets"}
            </p>
          </div>
        </div>

        {/* Admin logins never raise tickets themselves — only employees do. */}
        {!isAdmin && (
          <Button
            type="button"
            onClick={() => setShowAddTicket(true)}
            className="h-10 px-4"
          >
            <span className="mr-2">
              <PlusIcon />
            </span>
            Add Ticket
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          tone="primary"
          label="Total Tickets"
          value={totalCount}
          icon={<TicketIcon />}
        />
        <StatTile tone="slate" label="Open" value={openCount} icon={<OpenStatIcon />} />
        <StatTile
          tone="amber"
          label="In Progress"
          value={progressCount}
          icon={<ProgressStatIcon />}
        />
        <StatTile
          tone="emerald"
          label="Resolved"
          value={resolvedCount}
          icon={<ResolvedStatIcon />}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
            {isAdmin ? "All Support Tickets" : "My Support Tickets"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            View ticket details, attachments and current status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
            {["", ...STATUS_OPTIONS].map((option) => (
              <button
                key={option || "all"}
                type="button"
                onClick={() => setStatusFilter(option)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === option
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                {option || "All"}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
            {["active", "inactive", "all"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(option)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  activeFilter === option
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              title="Card view"
              className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                viewMode === "card"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <GridIcon />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table view"
              className={`flex h-7 w-7 items-center justify-center rounded-md transition ${
                viewMode === "table"
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <TableViewIcon />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          Loading support tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500">
            <TicketIcon />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No support tickets found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {isAdmin
              ? "No support tickets have been raised yet."
              : "Click Add Ticket to raise a new support request."}
          </p>
          {!isAdmin && (
            <Button type="button" onClick={() => setShowAddTicket(true)} className="mt-4">
              <span className="mr-2">
                <PlusIcon />
              </span>
              Add Ticket
            </Button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <TicketTable
          tickets={tickets}
          isAdmin={isAdmin}
          onManage={setManagingTicket}
          onEdit={setEditingTicket}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isAdmin={isAdmin}
              onManage={setManagingTicket}
              onEdit={setEditingTicket}
              onDeactivate={handleDeactivate}
              onReactivate={handleReactivate}
            />
          ))}
        </div>
      )}

      {!isAdmin && (
        <AddTicketModal
          open={showAddTicket}
          onClose={() => setShowAddTicket(false)}
          onCreated={refetch}
        />
      )}

      {!isAdmin && (
        <EditTicketModal
          key={editingTicket?.id ?? "none"}
          ticket={editingTicket}
          open={!!editingTicket}
          onClose={() => setEditingTicket(null)}
        />
      )}

      {isAdmin && (
        <UpdateTicketModal
          key={managingTicket?.id ?? "none"}
          ticket={managingTicket}
          open={!!managingTicket}
          onClose={() => setManagingTicket(null)}
        />
      )}
    </div>
  );
}