import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";

import PaymentForm from "./PaymentForm";

import {
  usePayments,
  useCreatePayment,
  useDeactivatePayment,
} from "./usePayments";

import { useInvoiceOptions } from "@/hooks/useLookupOptions";

import { useTableExport } from "@/hooks/useTableExport";

import { crmApi } from "@/api/crm.api";

import { formatCurrency } from "@/utils/formatCurrency";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

const CARD_HEIGHT = "h-[285px]";

/* =========================================================
   EXPORT COLUMNS
========================================================= */

const EXPORT_COLUMNS = [
  {
    header: "Payment ID",
    accessor: (r) =>
      r.id || "-",
  },

  {
    header: "Invoice ID",
    accessor: (r) =>
      r.invoice_id || "-",
  },

  {
    header: "Invoice",
    accessor: (r) =>
      getInvoiceDisplayName(r),
  },

  {
    header: "Amount",
    accessor: (r) =>
      formatCurrency(r.amount),
  },

  {
    header: "Payment Date",
    accessor: (r) =>
      r.payment_date || "-",
  },

  {
    header: "Mode",
    accessor: (r) =>
      r.mode || "-",
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

function getInvoiceDisplayName(
  payment
) {
  if (!payment) {
    return "";
  }

  const invoice =
    payment.invoice ||
    payment.invoice_data;

  if (invoice) {
    return (
      invoice.invoice_number ||
      invoice.number ||
      `Invoice #${
        invoice.id ||
        payment.invoice_id
      }`
    );
  }

  if (payment.invoice_id) {
    return `Invoice #${payment.invoice_id}`;
  }

  return "No invoice";
}

function getCustomerDisplayName(
  payment
) {
  if (!payment) {
    return "";
  }

  const customer =
    payment.customer ||
    payment.customer_data ||
    payment.invoice?.customer ||
    payment.invoice?.customer_data;

  if (customer) {
    return (
      customer.customer_name ||
      customer.name ||
      `Customer #${
        customer.id ||
        payment.customer_id
      }`
    );
  }

  if (payment.customer_id) {
    return `Customer #${payment.customer_id}`;
  }

  return "Customer unavailable";
}

function formatDate(value) {
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

  return date.toLocaleDateString();
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
   PAYMENT STATUS
========================================================= */

function getPaymentStatus(
  payment
) {
  if (
    payment?.is_active ===
    false
  ) {
    return "Inactive";
  }

  if (!payment?.payment_date) {
    return "Scheduled";
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const paymentDate =
    new Date(
      payment.payment_date
    );

  if (
    Number.isNaN(
      paymentDate.getTime()
    )
  ) {
    return "Completed";
  }

  paymentDate.setHours(
    0,
    0,
    0,
    0
  );

  if (
    paymentDate.getTime() ===
    today.getTime()
  ) {
    return "Today";
  }

  if (
    paymentDate.getTime() <
    today.getTime()
  ) {
    return "Completed";
  }

  return "Scheduled";
}

/* =========================================================
   STATUS BADGES
========================================================= */

const STATUS_BADGE_CLASS = {
  Scheduled:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",

  Today:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",

  Completed:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",

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
    STATUS_BADGE_CLASS.Scheduled
  );
}

/* =========================================================
   API HELPERS
========================================================= */

async function updatePaymentRecord(
  id,
  payload
) {
  if (
    typeof crmApi?.payments
      ?.update !==
    "function"
  ) {
    throw new Error(
      "Payment update API method is not configured."
    );
  }

  return crmApi.payments.update(
    id,
    payload
  );
}

async function deactivatePaymentRecord(
  id
) {
  if (
    typeof crmApi?.payments
      ?.deactivate !==
    "function"
  ) {
    throw new Error(
      "Payment deactivate API method is not configured."
    );
  }

  return crmApi.payments.deactivate(
    id
  );
}

async function reactivatePaymentRecord(
  id
) {
  return updatePaymentRecord(
    id,
    {
      is_active: true,
    }
  );
}

/* =========================================================
   ICONS
========================================================= */

const PaymentIcon = () => (
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
      cy="10"
      r="6.5"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6.5v7M12.5 8.5c-.4-.8-1.2-1.2-2.5-1.2-1.3 0-2.3.6-2.3 1.6s1 1.4 2.3 1.7 2.5.7 2.5 1.8-1 1.8-2.5 1.8c-1.3 0-2.2-.4-2.7-1.2"
    />
  </svg>
);

const InvoiceIcon = () => (
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
      d="M5 3.5h10v13H5z"
    />

    <path
      strokeLinecap="round"
      d="M7.5 7h5M7.5 10h5M7.5 13h3"
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

const AmountIcon = () => (
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
      d="M10 3v14M13 6.5c-.5-1-1.5-1.5-3-1.5-1.7 0-3 .8-3 2s1.2 1.8 3 2.2 3 .9 3 2.3-1.3 2.3-3 2.3c-1.5 0-2.6-.5-3.2-1.6"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <rect
      x="3"
      y="4"
      width="14"
      height="13"
      rx="1.5"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.5 2.5v3M13.5 2.5v3M3 8h14"
    />
  </svg>
);

const PaymentStatIcon = () => (
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
      d="M12 7v10M15 9c-.5-1-1.5-1.5-3-1.5-1.7 0-3 .8-3 2s1.2 1.8 3 2.2 3 .9 3 2.3-1.3 2.3-3 2.3c-1.5 0-2.6-.5-3.2-1.5"
    />
  </svg>
);

const TodayStatIcon = () => (
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
      d="M12 7v5l3 2"
    />
  </svg>
);

const CompletedStatIcon = () => (
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
      d="M5 12l4 4L19 6"
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
      className="group/payment-details relative inline-flex max-w-full outline-none"
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
          group-hover/payment-details:pointer-events-auto
          group-hover/payment-details:visible
          group-hover/payment-details:opacity-100
          group-focus/payment-details:pointer-events-auto
          group-focus/payment-details:visible
          group-focus/payment-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   PAYMENT DETAILS CARD
========================================================= */

function PaymentDetailsCard({
  payment,
}) {
  const status =
    getPaymentStatus(payment);

  const customerName =
    getCustomerDisplayName(
      payment
    );

  return (
    <div className="w-[380px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Payment Details
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            Payment #
            {payment?.id ?? "-"}
          </p>
        </div>

        <Badge
          className={getStatusBadgeClass(
            status
          )}
        >
          {status}
        </Badge>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

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
            {payment?.customer_id ??
              payment?.invoice
                ?.customer_id ??
              "—"}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Invoice
          </span>

          <span className="break-words text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {getInvoiceDisplayName(
              payment
            )}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Amount
          </span>

          <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(
              payment?.amount
            )}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Payment Date
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {formatDate(
              payment?.payment_date
            )}
          </span>
        </div>

        <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Mode
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {payment?.mode ||
              "-"}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">
            Created At
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              payment?.created_at
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400">
            Updated At
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              payment?.updated_at
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
            payment?.is_active !==
            false
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {payment?.is_active !==
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

export default function PaymentListPage() {
  const {
    showToast,
  } = useToast();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = usePayments({
    page: 1,
    per_page: 1000,
  });

  const allPayments =
    allData?.items || [];

  const createPayment =
    useCreatePayment();

  const deactivatePayment =
    useDeactivatePayment();

  const invoiceOptions =
    useInvoiceOptions();

  const [search, setSearch] =
    useState("");

  const [
    invoiceFilter,
    setInvoiceFilter,
  ] = useState("");

  const [
    modeFilter,
    setModeFilter,
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
    editingPayment,
    setEditingPayment,
  ] = useState(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const [
    mutatingPaymentId,
    setMutatingPaymentId,
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
      crmApi.payments.list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns:
      EXPORT_COLUMNS,

    filename: "payments",

    title: "Payments",
  });

  /* =======================================================
     STATISTICS
  ======================================================= */

  const inactivePayments =
    useMemo(
      () =>
        allPayments.filter(
          (item) =>
            item.is_active ===
            false
        ),
      [allPayments]
    );

  const todayPayments =
    useMemo(
      () =>
        allPayments.filter(
          (item) =>
            item.is_active !==
              false &&
            getPaymentStatus(
              item
            ) === "Today"
        ),
      [allPayments]
    );

  const completedPayments =
    useMemo(
      () =>
        allPayments.filter(
          (item) =>
            item.is_active !==
              false &&
            getPaymentStatus(
              item
            ) === "Completed"
        ),
      [allPayments]
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

      return allPayments.filter(
        (payment) => {
          const isActive =
            payment.is_active !==
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
            invoiceFilter &&
            String(
              payment.invoice_id
            ) !==
              String(
                invoiceFilter
              )
          ) {
            return false;
          }

          if (
            modeFilter &&
            String(
              payment.mode || ""
            ).toLowerCase() !==
              modeFilter
                .toLowerCase()
          ) {
            return false;
          }

          if (
            statusFilter &&
            getPaymentStatus(
              payment
            ) !== statusFilter
          ) {
            return false;
          }

          if (
            normalizedSearch
          ) {
            const haystack = [
              payment.id,
              payment.invoice_id,
              getInvoiceDisplayName(
                payment
              ),
              getCustomerDisplayName(
                payment
              ),
              payment.amount,
              payment.payment_date,
              payment.mode,
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
      allPayments,
      search,
      invoiceFilter,
      modeFilter,
      statusFilter,
      activeFilter,
    ]);

  /* =======================================================
     MODE OPTIONS
  ======================================================= */

  const modeOptions =
    useMemo(() => {
      const values =
        allPayments
          .map(
            (payment) =>
              payment.mode
          )
          .filter(Boolean);

      return [
        ...new Set(values),
      ].sort();
    }, [allPayments]);

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
    setEditingPayment(null);
    setModalOpen(true);
  };

  const handleEdit = (
    payment
  ) => {
    setEditingPayment({
      ...payment,

      invoice_id:
        payment.invoice_id ??
        payment.invoice?.id ??
        "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingPayment(null);
  };

  const handleSubmit =
    async (payload) => {
      try {
        setSaving(true);

        const normalizedPayload = {
          ...payload,

          invoice_id:
            payload?.invoice_id
              ? Number(
                  payload.invoice_id
                )
              : null,

          amount:
            payload?.amount !==
              "" &&
            payload?.amount !==
              null &&
            payload?.amount !==
              undefined
              ? Number(
                  payload.amount
                )
              : null,

          mode:
            payload?.mode ||
            "",
        };

        if (
          editingPayment
        ) {
          await updatePaymentRecord(
            editingPayment.id,
            normalizedPayload
          );

          showToast(
            "Payment updated",
            "success"
          );
        } else {
          await createPayment.mutateAsync(
            normalizedPayload
          );

          showToast(
            "Payment created",
            "success"
          );
        }

        setModalOpen(false);
        setEditingPayment(null);

        await refetch();
      } catch (error) {
        console.error(
          "Payment save failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to save payment",
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
        setMutatingPaymentId(
          deleteTarget.id
        );

        await deactivatePaymentRecord(
          deleteTarget.id
        );

        showToast(
          "Payment deactivated",
          "success"
        );

        setDeleteTarget(null);

        await refetch();
      } catch (error) {
        console.error(
          "Payment deactivation failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to deactivate payment",
          "error"
        );
      } finally {
        setMutatingPaymentId(
          null
        );
      }
    };

  const handleReactivate =
    async (payment) => {
      if (!payment?.id) {
        return;
      }

      try {
        setMutatingPaymentId(
          payment.id
        );

        await reactivatePaymentRecord(
          payment.id
        );

        showToast(
          "Payment reactivated",
          "success"
        );

        await refetch();
      } catch (error) {
        console.error(
          "Payment reactivation failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to reactivate payment",
          "error"
        );
      } finally {
        setMutatingPaymentId(
          null
        );
      }
    };

  const clearFilters =
    () => {
      setSearch("");
      setInvoiceFilter("");
      setModeFilter("");
      setStatusFilter("");
      setActiveFilter("active");
      setPage(1);
    };

  const isSaving =
    saving ||
    createPayment.isPending;

  /* =======================================================
     ERROR
  ======================================================= */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load payments.
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
            Payments
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Payments received against invoices
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

            Add Payment
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={
            <PaymentStatIcon />
          }
          value={
            allPayments.length
          }
          label="Total Payments"
          tone="sky"
        />

        <StatCard
          icon={
            <TodayStatIcon />
          }
          value={
            todayPayments.length
          }
          label="Today's Payments"
          tone="amber"
        />

        <StatCard
          icon={
            <CompletedStatIcon />
          }
          value={
            completedPayments.length
          }
          label="Completed Payments"
          tone="emerald"
        />

        <StatCard
          icon={
            <InactiveStatIcon />
          }
          value={
            inactivePayments.length
          }
          label="Inactive Payments"
          tone="slate"
        />
      </div>

      {/* FILTERS */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
                placeholder="Search invoice, customer or mode..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* INVOICE */}

            <select
              value={
                invoiceFilter
              }
              onChange={(
                event
              ) => {
                setInvoiceFilter(
                  event.target.value
                );

                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none sm:max-w-[230px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Invoices
              </option>

              {invoiceOptions.map(
                (invoice) => (
                  <option
                    key={
                      invoice.value
                    }
                    value={
                      invoice.value
                    }
                  >
                    {
                      invoice.label
                    }
                  </option>
                )
              )}
            </select>

            {/* MODE */}

            <select
              value={
                modeFilter
              }
              onChange={(
                event
              ) => {
                setModeFilter(
                  event.target.value
                );

                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none sm:max-w-[190px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Modes
              </option>

              {modeOptions.map(
                (mode) => (
                  <option
                    key={mode}
                    value={mode}
                  >
                    {mode}
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
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Payment Statuses
              </option>

              <option value="Scheduled">
                Scheduled
              </option>

              <option value="Today">
                Today
              </option>

              <option value="Completed">
                Completed
              </option>
            </select>

            {(search ||
              invoiceFilter ||
              modeFilter ||
              statusFilter ||
              activeFilter !==
                "active") && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* ACTIVE FILTER + VIEW */}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
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

            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
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
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No payments found
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
            (payment) => {
              const isActive =
                payment.is_active !==
                false;

              const status =
                getPaymentStatus(
                  payment
                );

              return (
                <div
                  key={
                    payment.id
                  }
                  className={`relative ${CARD_HEIGHT} min-w-0 overflow-visible rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg dark:bg-slate-900 ${
                    isActive
                      ? "border-slate-200 dark:border-slate-700"
                      : "border-red-100 dark:border-red-900/30"
                  }`}
                >
                  <div
                    className={`h-full p-4 pb-12 ${
                      !isActive
                        ? "opacity-75"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <HoverDetailsTrigger
                          align="left"
                          panel={
                            <PaymentDetailsCard
                              payment={
                                payment
                              }
                            />
                          }
                        >
                          <p className="max-w-[220px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            Payment #
                            {
                              payment.id
                            }
                          </p>
                        </HoverDetailsTrigger>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Invoice #
                          {
                            payment.invoice_id
                          }
                        </p>
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
                            payment
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <InvoiceIcon />

                        <span className="truncate">
                          {getInvoiceDisplayName(
                            payment
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <AmountIcon />

                        <span className="truncate font-semibold">
                          {formatCurrency(
                            payment.amount
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <CalendarIcon />

                        <span className="truncate">
                          {formatDate(
                            payment.payment_date
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <PaymentIcon />

                        <span className="truncate">
                          Mode:{" "}
                          {payment.mode ||
                            "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-30 grid h-11 grid-cols-3 gap-px border-t border-slate-100 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          payment
                        )
                      }
                      className="bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Edit
                    </button>

                    {isActive ? (
                      <button
                        type="button"
                        disabled={
                          mutatingPaymentId ===
                          payment.id
                        }
                        onClick={() =>
                          setDeleteTarget(
                            payment
                          )
                        }
                        className="bg-white text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:bg-slate-900 dark:text-red-400"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          mutatingPaymentId ===
                          payment.id
                        }
                        onClick={() =>
                          handleReactivate(
                            payment
                          )
                        }
                        className="bg-white text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:bg-slate-900 dark:text-emerald-400"
                      >
                        Reactivate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          payment
                        )
                      }
                      className="bg-white text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:bg-slate-900 dark:text-primary-400"
                    >
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

        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Payment #
                </th>

                <th className="px-4 py-3 font-medium">
                  Customer
                </th>

                <th className="px-4 py-3 font-medium">
                  Invoice
                </th>

                <th className="px-4 py-3 font-medium">
                  Amount
                </th>

                <th className="px-4 py-3 font-medium">
                  Payment Date
                </th>

                <th className="px-4 py-3 font-medium">
                  Mode
                </th>

                <th className="px-4 py-3 font-medium">
                  Status
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
                (payment) => {
                  const isActive =
                    payment.is_active !==
                    false;

                  const status =
                    getPaymentStatus(
                      payment
                    );

                  return (
                    <tr
                      key={
                        payment.id
                      }
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <HoverDetailsTrigger
                          align="left"
                          panel={
                            <PaymentDetailsCard
                              payment={
                                payment
                              }
                            />
                          }
                        >
                          <span className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
                            Payment #
                            {
                              payment.id
                            }
                          </span>
                        </HoverDetailsTrigger>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {getCustomerDisplayName(
                            payment
                          )}
                        </span>

                        {payment.customer_id && (
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Customer #
                            {
                              payment.customer_id
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {getInvoiceDisplayName(
                          payment
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(
                          payment.amount
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatDate(
                          payment.payment_date
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {payment.mode ||
                          "-"}
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
                                payment
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
                                mutatingPaymentId ===
                                payment.id
                              }
                              onClick={() =>
                                setDeleteTarget(
                                  payment
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
                                mutatingPaymentId ===
                                payment.id
                              }
                              onClick={() =>
                                handleReactivate(
                                  payment
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

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
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
          editingPayment
            ? "Edit Payment"
            : "Add Payment"
        }
      >
        <PaymentForm
          key={
            editingPayment?.id ??
            "new-payment"
          }
          formId="payments-form"
          initialData={
            editingPayment || {}
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
        title="Deactivate Payment"
        message={
          deleteTarget
            ? `Are you sure you want to deactivate payment #${deleteTarget.id}?`
            : ""
        }
        confirmText="Deactivate"
        loading={
          mutatingPaymentId !== null
        }
      />
    </div>
  );
}