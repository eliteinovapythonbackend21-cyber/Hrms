import { useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/feedback/Toast";

import {
  useFeedbackTickets,
  useCreateFeedbackTicket,
  useUpdateFeedbackTicket,
} from "./useFeedback";

import Avatar from "@/components/ui/Avatar";

import { getUser } from "@/utils/tokenHelpers";
import { isAdmin as checkIsAdmin } from "@/constants/roles";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { formatDateTime } from "@/utils/formatDate";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import {
  use3DTilt,
  useMagnetic,
  Motion3DStyles,
  GridPattern,
} from "@/hooks/use3DMotion";

/* =========================================================
   CONSTANTS
========================================================= */

const CATEGORY_OPTIONS = ["Feature Bug", "Internal Bug", "Other Bugs/Issues"];
const STATUS_OPTIONS = ["Open", "In Progress", "Resolved"];

const CATEGORY_BADGE_CLASS = {
  "Feature Bug": "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  "Internal Bug": "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  "Other Bugs/Issues": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
};

const CATEGORY_ICON_TONE = {
  "Feature Bug": "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  "Internal Bug": "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  "Other Bugs/Issues": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
};

const STATUS_BADGE_CLASS = {
  Open: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  "In Progress": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

const STATUS_DOT_CLASS = {
  Open: "bg-slate-400",
  "In Progress": "bg-amber-500",
  Resolved: "bg-emerald-500",
};

/* =========================================================
   ICONS
========================================================= */

// Feature Bug — sparkle (a feature not behaving as designed)
const FeatureBugIcon = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6Z" />
  </svg>
);

// Internal Bug — literal bug glyph
const InternalBugIcon = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="8" y="8" width="8" height="10" rx="4" />
    <path strokeLinecap="round" d="M9 8V6a3 3 0 016 0v2M4 12h4M16 12h4M5 17l3-1.5M19 17l-3-1.5M5 8l3 2M19 8l-3 2M12 8V4" />
  </svg>
);

// Other Bugs/Issues — warning triangle
const OtherIssueIcon = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.5h3.4L21 17.2a1.5 1.5 0 01-1.3 2.3H4.3A1.5 1.5 0 013 17.2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01" />
  </svg>
);

const CATEGORY_ICON = {
  "Feature Bug": FeatureBugIcon,
  "Internal Bug": InternalBugIcon,
  "Other Bugs/Issues": OtherIssueIcon,
};

function CategoryIcon({ category, className }) {
  const Comp = CATEGORY_ICON[category] || OtherIssueIcon;
  return <Comp className={className} />;
}

const TicketStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const OpenStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 7v5l3 2" />
  </svg>
);

const ProgressStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0113.66-5.66M20 12a8 8 0 01-13.66 5.66" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v4h4M20 20v-4h-4" />
  </svg>
);

const ResolvedStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 6" />
  </svg>
);

/* =========================================================
   STAT TILE
========================================================= */

function StatTile({ tone, label, value, icon }) {
  const { ref, handlers } = use3DTilt({ max: 9, scale: 1.02 });
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
    <div className="u-tilt-perspective">
      <div
        ref={ref}
        {...handlers}
        className={`u-tilt u-glare relative h-[100px] overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-white/[0.04] ${styles.border}`}
      >
        <div className="u-tilt-content flex h-full items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tight ${styles.value}`}>{value}</p>
          </div>
          <div className={`u-float-layer flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   REPORTER (EMPLOYEE) CARD
   Shown above the form so it's clear whose account the ticket is
   being raised against — the backend stamps `raised_by` to this same
   logged-in user regardless of what's submitted.
========================================================= */

function ReporterCard() {
  const user = getUser();
  const { employee } = useMyEmployee();

  const name =
    [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "Employee";

  const dept = employee?.department?.department_name;
  const desig = employee?.designation?.designation_name;
  const code = employee?.employee_code;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <Avatar name={name} src={resolveUploadUrl(user?.profile_picture?.url)} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {[code, desig, dept].filter(Boolean).join(" · ") || user?.email || user?.role}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-white/[0.06] dark:text-slate-400 dark:ring-white/10">
        Reporting as you
      </span>
    </div>
  );
}

/* =========================================================
   RAISE TICKET FORM
========================================================= */

function RaiseTicketForm({ onCreated }) {
  const { showToast } = useToast();
  const createTicket = useCreateFeedbackTicket();

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);

  const submitMagnet = useMagnetic(0.2);

  const handleFileChange = (file) => {
    if (!file) {
      setScreenshot(null);
      setPreview(null);
      return;
    }
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category) {
      showToast("Please select a bug/issue category", "error");
      return;
    }
    if (!description.trim()) {
      showToast("Please describe the issue", "error");
      return;
    }

    try {
      const payload = { category, description: description.trim() };
      if (screenshot) payload.screenshot = screenshot;

      await createTicket.mutateAsync(payload);

      showToast("Feedback submitted — a ticket has been raised", "success");
      setCategory("");
      setDescription("");
      setScreenshot(null);
      setPreview(null);
      onCreated?.();
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Failed to submit feedback",
        "error"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ReporterCard />

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Bug / Issue Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {CATEGORY_OPTIONS.map((option) => {
            const active = category === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                  active
                    ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400"
                    : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    active ? "bg-white text-primary-600 dark:bg-slate-900/40 dark:text-primary-400" : CATEGORY_ICON_TONE[option]
                  }`}
                >
                  <CategoryIcon category={option} className="h-4 w-4" />
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Screenshot (optional)
        </label>

        {preview ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <img
              src={preview}
              alt="Screenshot preview"
              className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-white/10"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {screenshot?.name}
              </p>
              <button
                type="button"
                onClick={() => handleFileChange(null)}
                className="mt-1 text-xs font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40 dark:border-slate-600 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-600 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-primary-400 dark:ring-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-primary-600 dark:text-primary-400">
                Upload a screenshot
              </span>{" "}
              of the issue
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the bug or issue you encountered in detail..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
        />
      </div>

      <div className="flex justify-end">
        <div ref={submitMagnet.ref} {...submitMagnet.handlers} className="inline-block will-change-transform">
          <Button
            type="submit"
            isLoading={createTicket.isPending}
            className="h-10 px-5 shadow-sm transition-shadow duration-200 hover:shadow-lg"
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </form>
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
    try {
      await updateTicket.mutateAsync({
        id: ticket.id,
        payload: { status, admin_response: response },
      });
      showToast("Ticket updated", "success");
      onClose();
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Failed to update ticket",
        "error"
      );
    }
  };

  if (!ticket) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Ticket ${ticket.ticket_number || `#${ticket.id}`}`} size="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${CATEGORY_ICON_TONE[ticket.category]}`}>
              <CategoryIcon category={ticket.category} className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                {ticket.category}
              </p>
              <p className="text-[11px] text-slate-400">{formatDateTime(ticket.created_at)}</p>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Reported by
          </p>
          <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">
            {ticket.raised_by_user?.username || "-"}
          </p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Description
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
            {ticket.description}
          </p>

          {ticket.screenshot_url && (
            <a
              href={resolveUploadUrl(ticket.screenshot_url)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block"
            >
              <img
                src={resolveUploadUrl(ticket.screenshot_url)}
                alt="Screenshot"
                className="h-32 rounded-lg object-cover ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-white/10"
              />
            </a>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Status
          </label>
          <div className="grid grid-cols-3 gap-2">
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
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Resolution / Update Note
          </label>
          <textarea
            rows={3}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="What action was taken / how was this resolved..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" isLoading={updateTicket.isPending} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   TICKET CARD
========================================================= */

function TicketCard({ ticket, isAdmin, onManage, index }) {
  const { ref, handlers } = use3DTilt({ max: 8, scale: 1.015 });

  return (
    <div
      className="u-tilt-perspective u-rise"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div
        ref={ref}
        {...handlers}
        className="u-tilt u-glare relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
      >
        <div
          className={`absolute inset-x-0 top-0 h-0.5 ${
            ticket.status === "Resolved"
              ? "bg-emerald-500"
              : ticket.status === "In Progress"
              ? "bg-amber-500"
              : "bg-slate-300 dark:bg-slate-600"
          }`}
        />

        <div className="u-tilt-content">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="u-float-layer relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 dark:ring-white/10">
                <span className={`flex h-full w-full items-center justify-center rounded-xl ${CATEGORY_ICON_TONE[ticket.category] || CATEGORY_ICON_TONE["Other Bugs/Issues"]}`}>
                  <CategoryIcon category={ticket.category} className="h-4.5 w-4.5" />
                </span>
                <span
                  className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                    STATUS_DOT_CLASS[ticket.status] || STATUS_DOT_CLASS.Open
                  } ${ticket.status === "In Progress" ? "u-pulse" : ""}`}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {ticket.ticket_number || `#${ticket.id}`}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {formatDateTime(ticket.created_at)}
                  {isAdmin && ticket.raised_by_user?.username
                    ? ` · ${ticket.raised_by_user.username}`
                    : ""}
                </p>
              </div>
            </div>
            <Badge className={STATUS_BADGE_CLASS[ticket.status] || STATUS_BADGE_CLASS.Open}>
              {ticket.status}
            </Badge>
          </div>

          <div className="mt-2.5">
            <Badge className={CATEGORY_BADGE_CLASS[ticket.category] || CATEGORY_BADGE_CLASS["Other Bugs/Issues"]}>
              {ticket.category}
            </Badge>
          </div>

          <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
            {ticket.description}
          </p>

          {ticket.screenshot_url && (
            <a
              href={resolveUploadUrl(ticket.screenshot_url)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block"
            >
              <img
                src={resolveUploadUrl(ticket.screenshot_url)}
                alt="Screenshot"
                className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200 transition hover:opacity-90 dark:ring-white/10"
              />
            </a>
          )}

          {ticket.admin_response && (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Admin update
              </p>
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-emerald-800 dark:text-emerald-200">
                {ticket.admin_response}
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onManage(ticket)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-white/10 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
              >
                Manage
              </button>
            </div>
          )}
        </div>
      </div>
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
  const [managingTicket, setManagingTicket] = useState(null);

  const { data, isLoading, refetch } = useFeedbackTickets({
    per_page: 200,
    status: statusFilter || undefined,
  });

  const tickets = data?.items || [];

  const totalCount = data?.total ?? tickets.length;
  const openCount = tickets.filter((t) => t.status === "Open").length;
  const progressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;

  return (
    <div className="min-w-0 space-y-6">
      <Motion3DStyles />

      <div className="u-rise relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-50/40 to-white p-4 shadow-sm dark:border-white/[0.08] dark:from-primary-500/[0.08] dark:via-white/[0.02] dark:to-transparent sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <GridPattern id="feedback-grid" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-500/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="u-hover-float">
            <div className="u-float-target flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-600/30 ring-1 ring-white/20">
              <TicketStatIcon />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Feedback
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {isAdmin
                ? "Every bug / feedback ticket raised by employees"
                : "Report a bug or issue — track its status right here"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile tone="primary" label="Total Tickets" value={totalCount} icon={<TicketStatIcon />} />
        <StatTile tone="slate" label="Open" value={openCount} icon={<OpenStatIcon />} />
        <StatTile tone="amber" label="In Progress" value={progressCount} icon={<ProgressStatIcon />} />
        <StatTile tone="emerald" label="Resolved" value={resolvedCount} icon={<ResolvedStatIcon />} />
      </div>

      {!isAdmin && (
        <div id="raise-ticket" className="u-rise scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <FeatureBugIcon className="h-4.5 w-4.5" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
              Raise a Ticket
            </h2>
          </div>
          <RaiseTicketForm onCreated={refetch} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
          {isAdmin ? "All Tickets" : "My Tickets"}
        </h2>

        <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
          {["", ...STATUS_OPTIONS].map((option) => (
            <button
              key={option || "all"}
              type="button"
              onClick={() => setStatusFilter(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
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
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-slate-500">
            <TicketStatIcon />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No tickets found
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {isAdmin
              ? "No feedback has been raised yet."
              : "Raise a ticket above if you run into a bug or issue."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tickets.map((ticket, i) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={i}
              isAdmin={isAdmin}
              onManage={setManagingTicket}
            />
          ))}
        </div>
      )}

      <UpdateTicketModal
        key={managingTicket?.id ?? "none"}
        ticket={managingTicket}
        open={!!managingTicket}
        onClose={() => setManagingTicket(null)}
      />
    </div>
  );
}
