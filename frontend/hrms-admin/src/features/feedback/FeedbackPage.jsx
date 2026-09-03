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

import { getUser } from "@/utils/tokenHelpers";
import { isAdmin as checkIsAdmin } from "@/constants/roles";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { formatDateTime } from "@/utils/formatDate";
import { use3DTilt, useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

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

const STATUS_BADGE_CLASS = {
  Open: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  "In Progress": "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

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
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Bug / Issue Category <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={`h-10 rounded-lg border px-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 ${
                category === option
                  ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400"
                  : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
              }`}
            >
              {option}
            </button>
          ))}
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
          <label className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                  status === option
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400"
                    : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                }`}
              >
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
        <div className="u-tilt-content">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {ticket.ticket_number || `#${ticket.id}`}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {formatDateTime(ticket.created_at)}
                {isAdmin && ticket.raised_by_user?.username
                  ? ` · ${ticket.raised_by_user.username}`
                  : ""}
              </p>
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

  return (
    <div className="min-w-0 space-y-6">
      <Motion3DStyles />

      <div className="u-rise">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Feedback
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {isAdmin
            ? "Every bug / feedback ticket raised by employees"
            : "Report a bug or issue — track its status right here"}
        </p>
      </div>

      {!isAdmin && (
        <div className="u-rise rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-white">
            Raise a Ticket
          </h2>
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
