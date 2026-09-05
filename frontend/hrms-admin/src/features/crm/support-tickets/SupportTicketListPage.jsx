import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";

import SupportTicketForm from "./SupportTicketForm";

import {
  useSupportTickets,
  useCreateSupportTicket,
  useDeactivateSupportTicket,
} from "./useSupportTickets";

import { useCustomerOptions } from "@/hooks/useLookupOptions";

import { useTableExport } from "@/hooks/useTableExport";

import { crmApi } from "@/api/crm.api";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

const CARD_HEIGHT = "h-[300px]";

/* =========================================================
   EXPORT COLUMNS
========================================================= */

const EXPORT_COLUMNS = [
  {
    header: "Ticket ID",
    accessor: (r) =>
      r.id || "-",
  },

  {
    header: "Customer ID",
    accessor: (r) =>
      r.customer_id || "-",
  },

  {
    header: "Customer",
    accessor: (r) =>
      getCustomerDisplayName(r),
  },

  {
    header: "Subject",
    accessor: (r) =>
      r.subject || "-",
  },

  {
    header: "Description",
    accessor: (r) =>
      r.description || "-",
  },

  {
    header: "Status",
    accessor: (r) =>
      r.status || "Open",
  },

  {
    header: "Active",
    accessor: (r) =>
      r.is_active !== false
        ? "Yes"
        : "No",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getCustomerDisplayName(
  ticket
) {
  if (!ticket) {
    return "";
  }

  const customer =
    ticket.customer ||
    ticket.customer_data;

  if (customer) {
    return (
      customer.customer_name ||
      customer.name ||
      `Customer #${
        customer.id ||
        ticket.customer_id
      }`
    );
  }

  return `Customer #${
    ticket.customer_id ??
    "-"
  }`;
}

function getInitials(name) {
  if (!name) {
    return "?";
  }

  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "?";
  }

  return (
    parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}

function getAssigneeName(ticket) {
  const assignee = ticket?.assignee;

  if (!assignee) {
    return null;
  }

  return (
    [assignee.first_name, assignee.last_name].filter(Boolean).join(" ") ||
    assignee.employee_code ||
    null
  );
}

function getTicketAgeLabel(ticket) {
  if (!ticket?.created_at) {
    return "-";
  }

  const created = new Date(ticket.created_at);

  if (Number.isNaN(created.getTime())) {
    return "-";
  }

  const days = Math.max(
    0,
    Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "1 day";
  }

  return `${days} days`;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleString();
}

/* =========================================================
   SUPPORT TICKET STATUS
========================================================= */

function getTicketStatus(ticket) {
  if (
    ticket?.is_active === false
  ) {
    return "Inactive";
  }

  return (
    ticket?.status ||
    "Open"
  );
}

/* =========================================================
   STATUS BADGES
========================================================= */

const STATUS_BADGE_CLASS = {
  Open:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",

  "In Progress":
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",

  Resolved:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",

  Closed:
    "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400",

  Inactive:
    "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400",
};

function getStatusBadgeClass(
  status
) {
  return (
    STATUS_BADGE_CLASS[
      status
    ] ||
    STATUS_BADGE_CLASS.Open
  );
}

const STATUS_ACCENT_CLASS = {
  Open: "bg-sky-400",
  "In Progress": "bg-amber-400",
  Resolved: "bg-emerald-500",
  Closed: "bg-slate-300 dark:bg-slate-600",
  Inactive: "bg-slate-300 dark:bg-slate-600",
};

function getStatusAccentClass(status) {
  return STATUS_ACCENT_CLASS[status] || STATUS_ACCENT_CLASS.Open;
}

/* =========================================================
   INITIALS AVATAR
========================================================= */

const AVATAR_TONES = [
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
];

function toneForName(name) {
  const source = String(name || "?");
  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash + source.charCodeAt(i)) % AVATAR_TONES.length;
  }

  return AVATAR_TONES[hash];
}

function InitialsAvatar({ name, size = "h-8 w-8 text-[11px]" }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full font-semibold ${toneForName(
        name
      )}`}
      title={name || "Unknown"}
    >
      {getInitials(name)}
    </div>
  );
}

/* =========================================================
   API HELPERS
========================================================= */

async function updateSupportTicketRecord(
  id,
  payload
) {
  if (
    typeof crmApi
      ?.supportTickets
      ?.update !==
    "function"
  ) {
    throw new Error(
      "Support ticket update API method is not configured."
    );
  }

  return crmApi.supportTickets.update(
    id,
    payload
  );
}

async function deactivateSupportTicketRecord(
  id
) {
  if (
    typeof crmApi
      ?.supportTickets
      ?.deactivate !==
    "function"
  ) {
    throw new Error(
      "Support ticket deactivate API method is not configured."
    );
  }

  return crmApi.supportTickets.deactivate(
    id
  );
}

async function reactivateSupportTicketRecord(
  id
) {
  return updateSupportTicketRecord(
    id,
    {
      is_active: true,
    }
  );
}

/* =========================================================
   ICONS
========================================================= */

const TicketIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 3.5h12v13H4z"
    />

    <path
      strokeLinecap="round"
      d="M7 7h6M7 10h6M7 13h4"
    />
  </svg>
);

const CustomerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <circle
      cx="10"
      cy="6.5"
      r="2.8"
    />

    <path
      strokeLinecap="round"
      d="M4 17c.9-3.1 3-4.7 6-4.7s5.1 1.6 6 4.7"
    />
  </svg>
);

const DescriptionIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 3.5h12v13H4z"
    />

    <path
      strokeLinecap="round"
      d="M6.5 7h7M6.5 10h7M6.5 13h5"
    />
  </svg>
);

const TicketStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 4h14v16H5z"
    />

    <path
      strokeLinecap="round"
      d="M8 8h8M8 12h8M8 16h5"
    />
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
    <circle
      cx="12"
      cy="12"
      r="9"
    />

    <path
      strokeLinecap="round"
      d="M12 8v5M12 16h.01"
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
    <circle
      cx="12"
      cy="12"
      r="9"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m8 12 2.5 2.5L16 9"
    />
  </svg>
);

const InactiveStatIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.364 18.364A9 9 0 005.636 5.636"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.636 18.364L18.364 5.636"
    />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  value,
  label,
  tone = "sky",
}) {
  const tones = {
    sky:
      "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",

    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",

    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",

    slate:
      "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:from-primary-500/[0.06] dark:to-white/[0.02]">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HOVER TRIGGER
========================================================= */

function HoverDetailsTrigger({
  children,
  panel,
  align = "left",
}) {
  const alignClasses = {
    left: "left-0",
    center:
      "left-1/2 -translate-x-1/2",
    right: "right-0",
  };

  return (
    <div
      tabIndex={0}
      className="group/support-ticket-details relative inline-flex max-w-full outline-none"
    >
      <div className="max-w-full">
        {children}
      </div>

      <div
        className={`
          pointer-events-none
          invisible
          absolute
          top-full
          z-[100]
          mt-2
          opacity-0
          transition-all
          duration-150
          group-hover/support-ticket-details:pointer-events-auto
          group-hover/support-ticket-details:visible
          group-hover/support-ticket-details:opacity-100
          group-focus/support-ticket-details:pointer-events-auto
          group-focus/support-ticket-details:visible
          group-focus/support-ticket-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   SUPPORT TICKET DETAILS CARD
========================================================= */

function SupportTicketDetailsCard({
  ticket,
}) {
  const customer =
    ticket?.customer ||
    ticket?.customer_data;

  const customerName =
    customer?.customer_name ||
    customer?.name ||
    `Customer #${
      ticket?.customer_id ??
      "-"
    }`;

  const customerPhone =
    customer?.contact_number ||
    customer?.phone ||
    "-";

  const customerEmail =
    customer?.email ||
    "-";

  const customerAddress =
    customer?.address ||
    "-";

  const status =
    getTicketStatus(ticket);

  return (
    <div className="w-[380px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <InitialsAvatar
            name={customerName}
            size="h-9 w-9 text-xs"
          />

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Support Ticket Details
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
              Ticket #
              {ticket?.id ?? "-"}
            </p>
          </div>
        </div>

        <Badge
          className={getStatusBadgeClass(
            status
          )}
        >
          {status}
        </Badge>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Customer
          </span>

          <span className="break-words text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {customerName}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Customer ID
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            #
            {ticket?.customer_id ??
              "—"}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Contact
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customerPhone}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Email
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customerEmail}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Subject
          </span>

          <span className="break-words text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {ticket?.subject ||
              "-"}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Assigned To
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {getAssigneeName(ticket) || "Unassigned"}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Raised By
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {ticket?.raised_by_user?.username || "-"}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Age
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {getTicketAgeLabel(ticket)}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Status
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {ticket?.status ||
              "Open"}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Address
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customerAddress}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Description
        </p>

        <p className="break-words text-xs leading-5 text-slate-700 dark:text-slate-200">
          {ticket?.description ||
            "No description added."}
        </p>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">
            Created At
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              ticket?.created_at
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400">
            Updated At
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              ticket?.updated_at
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          Active
        </span>

        <span
          className={`text-[10px] font-semibold ${
            ticket?.is_active !==
            false
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {ticket?.is_active !==
          false
            ? "Yes"
            : "No"}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   ICON BUTTON
========================================================= */

const IconButton = ({
  onClick,
  title,
  disabled,
  tone = "slate",
  children,
}) => {
  const tones = {
    slate:
      "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",

    primary:
      "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",

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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function SupportTicketListPage() {
  const {
    showToast,
  } = useToast();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useSupportTickets({
    page: 1,
    per_page: 1000,
  });

  const allTickets =
    allData?.items || [];

  const createSupportTicket =
    useCreateSupportTicket();

  const deactivateSupportTicket =
    useDeactivateSupportTicket();

  const customerOptions =
    useCustomerOptions();

  const [search, setSearch] =
    useState("");

  const [
    customerFilter,
    setCustomerFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("active");

  const [viewMode, setViewMode] =
    useState("card");

  const [page, setPage] =
    useState(1);

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingTicket,
    setEditingTicket,
  ] = useState(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const [
    mutatingTicketId,
    setMutatingTicketId,
  ] = useState(null);

  /* =======================================================
     EXPORT
  ======================================================= */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll:
      crmApi.supportTickets.list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns:
      EXPORT_COLUMNS,

    filename:
      "support-tickets",

    title:
      "Support Tickets",
  });

  /* =======================================================
     STATISTICS
  ======================================================= */

  const inactiveTickets =
    useMemo(
      () =>
        allTickets.filter(
          (item) =>
            item.is_active ===
            false
        ),
      [allTickets]
    );

  const openTickets =
    useMemo(
      () =>
        allTickets.filter(
          (item) =>
            item.is_active !==
              false &&
            getTicketStatus(
              item
            ) === "Open"
        ),
      [allTickets]
    );

  const inProgressTickets =
    useMemo(
      () =>
        allTickets.filter(
          (item) =>
            item.is_active !==
              false &&
            getTicketStatus(
              item
            ) ===
              "In Progress"
        ),
      [allTickets]
    );

  const resolvedTickets =
    useMemo(
      () =>
        allTickets.filter(
          (item) =>
            item.is_active !==
              false &&
            getTicketStatus(
              item
            ) === "Resolved"
        ),
      [allTickets]
    );

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return allTickets.filter(
        (ticket) => {
          const isActive =
            ticket.is_active !==
            false;

          if (
            activeFilter ===
              "active" &&
            !isActive
          ) {
            return false;
          }

          if (
            activeFilter ===
              "inactive" &&
            isActive
          ) {
            return false;
          }

          if (
            customerFilter &&
            String(
              ticket.customer_id
            ) !==
              String(
                customerFilter
              )
          ) {
            return false;
          }

          if (
            statusFilter &&
            getTicketStatus(
              ticket
            ) !== statusFilter
          ) {
            return false;
          }

          if (
            normalizedSearch
          ) {
            const haystack = [
              ticket.id,
              ticket.customer_id,
              getCustomerDisplayName(
                ticket
              ),
              ticket.subject,
              ticket.description,
              ticket.status,
            ]
              .join(" ")
              .toLowerCase();

            if (
              !haystack.includes(
                normalizedSearch
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      allTickets,
      search,
      customerFilter,
      statusFilter,
      activeFilter,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const pageSize =
    viewMode === "card"
      ? CARD_PAGE_SIZE
      : PAGE_SIZE;

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
          pageSize
      )
    );

  const paged =
    filtered.slice(
      (page - 1) *
        pageSize,
      page * pageSize
    );

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleAdd = () => {
    setEditingTicket(null);
    setModalOpen(true);
  };

  const handleEdit = (
    ticket
  ) => {
    setEditingTicket({
      ...ticket,

      customer_id:
        ticket.customer_id ??
        ticket.customer?.id ??
        "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingTicket(null);
  };

  const handleSubmit =
    async (payload) => {
      try {
        setSaving(true);

        const normalizedPayload = {
          ...payload,

          customer_id:
            payload?.customer_id
              ? Number(
                  payload.customer_id
                )
              : null,

          status:
            payload?.status ||
            "Open",

          subject:
            payload?.subject ||
            "",

          description:
            payload?.description ||
            "",
        };

        if (
          editingTicket
        ) {
          await updateSupportTicketRecord(
            editingTicket.id,
            normalizedPayload
          );

          showToast(
            "Support ticket updated",
            "success"
          );
        } else {
          await createSupportTicket.mutateAsync(
            normalizedPayload
          );

          showToast(
            "Support ticket created",
            "success"
          );
        }

        setModalOpen(false);
        setEditingTicket(null);

        await refetch();
      } catch (error) {
        console.error(
          "Support ticket save failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to save support ticket",
          "error"
        );
      } finally {
        setSaving(false);
      }
    };

  const confirmDeactivate =
    async () => {
      if (
        !deleteTarget?.id
      ) {
        return;
      }

      try {
        setMutatingTicketId(
          deleteTarget.id
        );

        await deactivateSupportTicketRecord(
          deleteTarget.id
        );

        showToast(
          "Support ticket deactivated",
          "success"
        );

        setDeleteTarget(null);

        await refetch();
      } catch (error) {
        console.error(
          "Support ticket deactivation failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to deactivate support ticket",
          "error"
        );
      } finally {
        setMutatingTicketId(
          null
        );
      }
    };

  const handleReactivate =
    async (ticket) => {
      if (!ticket?.id) {
        return;
      }

      try {
        setMutatingTicketId(
          ticket.id
        );

        await reactivateSupportTicketRecord(
          ticket.id
        );

        showToast(
          "Support ticket reactivated",
          "success"
        );

        await refetch();
      } catch (error) {
        console.error(
          "Support ticket reactivation failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to reactivate support ticket",
          "error"
        );
      } finally {
        setMutatingTicketId(
          null
        );
      }
    };

  const clearFilters =
    () => {
      setSearch("");
      setCustomerFilter("");
      setStatusFilter("");
      setActiveFilter("active");
      setPage(1);
    };

  const isSaving =
    saving ||
    createSupportTicket.isPending;

  /* =======================================================
     ERROR
  ======================================================= */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load support tickets.
      </div>
    );
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Support Tickets
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Customer support ticket log
          </p>
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
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">
              +
            </span>

            Add Ticket
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={
            <TicketStatIcon />
          }
          value={
            allTickets.length
          }
          label="Total Tickets"
          tone="sky"
        />

        <StatCard
          icon={
            <OpenStatIcon />
          }
          value={
            openTickets.length
          }
          label="Open Tickets"
          tone="amber"
        />

        <StatCard
          icon={
            <ResolvedStatIcon />
          }
          value={
            resolvedTickets.length
          }
          label="Resolved Tickets"
          tone="emerald"
        />

        <StatCard
          icon={
            <InactiveStatIcon />
          }
          value={
            inactiveTickets.length
          }
          label="Inactive Tickets"
          tone="slate"
        />
      </div>

      {/* FILTERS */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            {/* SEARCH */}

            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
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
                onChange={(
                  event
                ) => {
                  setSearch(
                    event.target.value
                  );

                  setPage(1);
                }}
                placeholder="Search subject, customer or description..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>

            {/* CUSTOMER */}

            <select
              value={
                customerFilter
              }
              onChange={(
                event
              ) => {
                setCustomerFilter(
                  event.target.value
                );

                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none sm:max-w-[230px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Customers
              </option>

              {customerOptions.map(
                (customer) => (
                  <option
                    key={
                      customer.value
                    }
                    value={
                      customer.value
                    }
                  >
                    {
                      customer.label
                    }
                  </option>
                )
              )}
            </select>

            {/* STATUS */}

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) => {
                setStatusFilter(
                  event.target.value
                );

                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none sm:max-w-[180px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Ticket Statuses
              </option>

              <option value="Open">
                Open
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Resolved">
                Resolved
              </option>

              <option value="Closed">
                Closed
              </option>
            </select>

            {(search ||
              customerFilter ||
              statusFilter ||
              activeFilter !==
                "active") && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* ACTIVE FILTER + VIEW */}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              {[
                "active",
                "inactive",
                "all",
              ].map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setActiveFilter(
                        status
                      );

                      setPage(1);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                      activeFilter ===
                      status
                        ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "card"
                  );

                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode ===
                  "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Card
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "table"
                  );

                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode ===
                  "table"
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
        <div className="py-10 text-center text-sm text-slate-400">
          Loading...
        </div>
      ) : paged.length ===
        0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No support tickets found
          </h3>

          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters.
          </p>
        </div>
      ) : viewMode ===
        "card" ? (
        /* ===================================================
           CARD VIEW
        =================================================== */

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map(
            (ticket) => {
              const isActive =
                ticket.is_active !==
                false;

              const status =
                getTicketStatus(
                  ticket
                );

              return (
                <div
                  key={
                    ticket.id
                  }
                  className={`relative ${CARD_HEIGHT} min-w-0 overflow-visible rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg dark:bg-white/[0.04] ${
                    isActive
                      ? "border-slate-200 dark:border-white/10"
                      : "border-red-100 dark:border-red-900/30"
                  }`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl ${
                      !isActive
                        ? "bg-slate-300 dark:bg-slate-600"
                        : getStatusAccentClass(status)
                    }`}
                  />

                  <div
                    className={`h-full p-4 pt-5 pb-12 ${
                      !isActive
                        ? "opacity-75"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <InitialsAvatar
                          name={getCustomerDisplayName(ticket)}
                        />

                        <div className="min-w-0">
                          <HoverDetailsTrigger
                            align="left"
                            panel={
                              <SupportTicketDetailsCard
                                ticket={
                                  ticket
                                }
                              />
                            }
                          >
                            <p className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {ticket.subject ||
                                `Ticket #${ticket.id}`}
                            </p>
                          </HoverDetailsTrigger>

                          <p className="mt-0.5 truncate text-[10px] text-slate-400">
                            Ticket #{ticket.id} ·{" "}
                            {getTicketAgeLabel(ticket)}
                          </p>
                        </div>
                      </div>

                      <Badge
                        className={getStatusBadgeClass(
                          status
                        )}
                      >
                        {status}
                      </Badge>
                    </div>

                    <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <CustomerIcon />

                        <span className="truncate">
                          {getCustomerDisplayName(
                            ticket
                          )}
                        </span>
                      </div>

                      <div className="flex items-start gap-1.5">
                        <DescriptionIcon />

                        <span className="line-clamp-2">
                          {ticket.description ||
                            "No description added."}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 shrink-0 text-slate-400"
                          fill="none"
                          viewBox="0 0 20 20"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        >
                          <circle cx="7" cy="6.5" r="2.3" />
                          <circle cx="14" cy="6.5" r="2" />
                          <path
                            strokeLinecap="round"
                            d="M3 16c.6-2.4 2-3.6 4-3.6s3.4 1.2 4 3.6M12.5 12.9c1.6.2 2.7 1.3 3.2 3.1"
                          />
                        </svg>

                        <span className="truncate">
                          {getAssigneeName(ticket) || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-30 grid h-11 grid-cols-3 gap-px border-t border-slate-100 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          ticket
                        )
                      }
                      className="flex items-center justify-center gap-1 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:bg-white/[0.04] dark:text-slate-300"
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
                      Edit
                    </button>

                    {isActive ? (
                      <button
                        type="button"
                        disabled={
                          mutatingTicketId ===
                          ticket.id
                        }
                        onClick={() =>
                          setDeleteTarget(
                            ticket
                          )
                        }
                        className="flex items-center justify-center gap-1 bg-white text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-red-400"
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
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          mutatingTicketId ===
                          ticket.id
                        }
                        onClick={() =>
                          handleReactivate(
                            ticket
                          )
                        }
                        className="flex items-center justify-center gap-1 bg-white text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-emerald-400"
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
                            d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 017-4M4 20v-5h5"
                          />
                        </svg>
                        Reactivate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          ticket
                        )
                      }
                      className="flex items-center justify-center gap-1 bg-white text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:bg-white/[0.04] dark:text-primary-400"
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
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
                        />
                      </svg>
                      Details
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : (
        /* ===================================================
           TABLE VIEW
        =================================================== */

        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-left text-sm">
            <thead className="tbl-head border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Ticket #
                </th>

                <th className="px-4 py-3 font-medium">
                  Customer
                </th>

                <th className="px-4 py-3 font-medium">
                  Subject
                </th>

                <th className="px-4 py-3 font-medium">
                  Description
                </th>

                <th className="px-4 py-3 font-medium">
                  Assigned To
                </th>

                <th className="px-4 py-3 font-medium">
                  Status
                </th>

                <th className="px-4 py-3 font-medium">
                  Age
                </th>

                <th className="px-4 py-3 font-medium">
                  Active
                </th>

                <th className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map(
                (ticket) => {
                  const isActive =
                    ticket.is_active !==
                    false;

                  const status =
                    getTicketStatus(
                      ticket
                    );

                  return (
                    <tr
                      key={
                        ticket.id
                      }
                      className="tbl-row"
                    >
                      <td className="px-4 py-3">
                        <HoverDetailsTrigger
                          align="left"
                          panel={
                            <SupportTicketDetailsCard
                              ticket={
                                ticket
                              }
                            />
                          }
                        >
                          <span className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
                            Ticket #
                            {
                              ticket.id
                            }
                          </span>
                        </HoverDetailsTrigger>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <InitialsAvatar
                            name={getCustomerDisplayName(ticket)}
                            size="h-7 w-7 text-[10px]"
                          />

                          <div className="min-w-0">
                            <span className="block truncate font-medium text-slate-700 dark:text-slate-200">
                              {getCustomerDisplayName(
                                ticket
                              )}
                            </span>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              Customer #
                              {
                                ticket.customer_id
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="max-w-[220px] px-4 py-3">
                        <span className="line-clamp-2 font-medium text-slate-700 dark:text-slate-200">
                          {ticket.subject ||
                            "-"}
                        </span>
                      </td>

                      <td className="max-w-[320px] px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="line-clamp-2">
                          {ticket.description ||
                            "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {getAssigneeName(ticket) || (
                          <span className="text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge
                          className={getStatusBadgeClass(
                            status
                          )}
                        >
                          {status}
                        </Badge>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                        {getTicketAgeLabel(ticket)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${
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

                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton
                            title="Edit"
                            onClick={() =>
                              handleEdit(
                                ticket
                              )
                            }
                          >
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
                                d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z"
                              />
                            </svg>
                          </IconButton>

                          {isActive ? (
                            <IconButton
                              title="Deactivate"
                              tone="red"
                              disabled={
                                mutatingTicketId ===
                                ticket.id
                              }
                              onClick={() =>
                                setDeleteTarget(
                                  ticket
                                )
                              }
                            >
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
                                  d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"
                                />
                              </svg>
                            </IconButton>
                          ) : (
                            <IconButton
                              title="Reactivate"
                              tone="emerald"
                              disabled={
                                mutatingTicketId ===
                                ticket.id
                              }
                              onClick={() =>
                                handleReactivate(
                                  ticket
                                )
                              }
                            >
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
                                  d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 017-4M4 20v-5h5"
                                />
                              </svg>
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
        <span>
          Page {page} of{" "}
          {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage((current) =>
                Math.max(
                  1,
                  current - 1
                )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06]"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              page >= pageCount
            }
            onClick={() =>
              setPage((current) =>
                Math.min(
                  pageCount,
                  current + 1
                )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06]"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT */}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editingTicket
            ? "Edit Support Ticket"
            : "Add Support Ticket"
        }
      >
        <SupportTicketForm
          key={
            editingTicket?.id ??
            "new-support-ticket"
          }
          formId="support-tickets-form"
          initialData={
            editingTicket || {}
          }
          onSubmit={handleSubmit}
          loading={isSaving}
        />
      </Modal>

      {/* DEACTIVATE */}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() =>
          setDeleteTarget(null)
        }
        onConfirm={
          confirmDeactivate
        }
        title="Deactivate Support Ticket"
        message={
          deleteTarget
            ? `Are you sure you want to deactivate ticket #${deleteTarget.id}?`
            : ""
        }
        confirmText="Deactivate"
        loading={
          mutatingTicketId !==
          null
        }
      />
    </div>
  );
}