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
} from "./useFeedback";

import { getUser } from "@/utils/tokenHelpers";
import { isAdmin as checkIsAdmin } from "@/constants/roles";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { formatDateTime } from "@/utils/formatDate";
import { useMyEmployee } from "@/hooks/useMyEmployee";

/* =========================================================
   HRMS SUPPORT TICKET REASONS
========================================================= */

const CATEGORY_OPTIONS = [
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
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resetForm = () => {
    setCategory("");
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

        <div>
          <FieldLabel required>Support Ticket Reason</FieldLabel>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            <option value="">Select a reason</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Reason
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {ticket.category || "-"}
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
   TICKET CARD
========================================================= */

function TicketCard({ ticket, isAdmin, onManage }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <div
        className={`absolute inset-x-0 top-0 h-0.5 ${
          ticket.status === "Resolved"
            ? "bg-emerald-500"
            : ticket.status === "In Progress"
            ? "bg-amber-500"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
            <TicketIcon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {ticket.ticket_number || `#${ticket.id}`}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {ticket.created_at ? formatDateTime(ticket.created_at) : "-"}
            </p>
          </div>
        </div>

        <Badge className={STATUS_BADGE_CLASS[ticket.status] || STATUS_BADGE_CLASS.Open}>
          {ticket.status || "Open"}
        </Badge>
      </div>

      <div className="mt-4">
        <Badge className="bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
          {ticket.category || "General HRMS Query"}
        </Badge>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Employee
            </p>
            <p className="mt-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
              {ticket.employee || "-"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Employee ID
            </p>
            <p className="mt-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
              {ticket.employee_id || "-"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Name
            </p>
            <p className="mt-1 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
              {ticket.name || ticket.raised_by_user?.username || "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Purpose
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">
          {ticket.purpose || "-"}
        </p>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Description
        </p>
        <p className="mt-1 line-clamp-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {ticket.description || "-"}
        </p>
      </div>

      {ticket.screenshot_url && (
        <a
          href={resolveUploadUrl(ticket.screenshot_url)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block"
        >
          <img
            src={resolveUploadUrl(ticket.screenshot_url)}
            alt="Ticket screenshot"
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-white/10"
          />
        </a>
      )}

      {ticket.admin_response && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/30 dark:bg-emerald-500/10">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Admin Update
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-emerald-800 dark:text-emerald-200">
            {ticket.admin_response}
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => onManage(ticket)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
          >
            Manage
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function FeedbackPage() {
  const user = getUser();
  const isAdmin = checkIsAdmin(user);

  const [statusFilter, setStatusFilter] = useState("");
  const [showAddTicket, setShowAddTicket] = useState(false);
  const [managingTicket, setManagingTicket] = useState(null);

  const { data, isLoading, refetch } = useFeedbackTickets({
    per_page: 200,
    status: statusFilter || undefined,
  });

  const tickets = data?.items || [];
  const totalCount = data?.total ?? tickets.length;
  const openCount = tickets.filter((ticket) => ticket.status === "Open").length;
  const progressCount = tickets.filter((ticket) => ticket.status === "In Progress").length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === "Resolved").length;

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
          <Button type="button" onClick={() => setShowAddTicket(true)} className="mt-4">
            <span className="mr-2">
              <PlusIcon />
            </span>
            Add Ticket
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isAdmin={isAdmin}
              onManage={setManagingTicket}
            />
          ))}
        </div>
      )}

      <AddTicketModal
        open={showAddTicket}
        onClose={() => setShowAddTicket(false)}
        onCreated={refetch}
      />

      <UpdateTicketModal
        key={managingTicket?.id ?? "none"}
        ticket={managingTicket}
        open={!!managingTicket}
        onClose={() => setManagingTicket(null)}
      />
    </div>
  );
}
