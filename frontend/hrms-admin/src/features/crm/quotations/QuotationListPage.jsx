import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";

import QuotationForm from "./QuotationForm";

import {
  useQuotations,
  useCreateQuotation,
  useDeactivateQuotation,
} from "./useQuotations";

import { useCustomerOptions } from "@/hooks/useLookupOptions";

import { useTableExport } from "@/hooks/useTableExport";

import { crmApi } from "@/api/crm.api";

import { formatCurrency } from "@/utils/formatCurrency";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;

const CARD_PAGE_SIZE = 6;

const CARD_HEIGHT = "h-[270px]";

/* =========================================================
   EXPORT COLUMNS
========================================================= */

const EXPORT_COLUMNS = [
  {
    header: "Quotation Number",
    accessor: (r) =>
      r.quotation_number ||
      "-",
  },

  {
    header: "Customer ID",
    accessor: (r) =>
      r.customer_id ||
      "-",
  },

  {
    header: "Customer",
    accessor: (r) =>
      getCustomerDisplayName(r),
  },

  {
    header: "Amount",
    accessor: (r) =>
      formatCurrency(
        r.amount
      ),
  },

  {
    header: "Status",
    accessor: (r) =>
      r.status ||
      "-",
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
  quotation
) {
  if (!quotation) {
    return "";
  }

  const customer =
    quotation.customer ||
    quotation.customer_data;

  if (customer) {
    return (
      customer.customer_name ||
      customer.name ||
      `Customer #${
        customer.id ||
        quotation.customer_id
      }`
    );
  }

  return `Customer #${
    quotation.customer_id ??
    "-"
  }`;
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
   QUOTATION STATUS
========================================================= */

function getQuotationStatus(
  quotation
) {
  if (
    quotation?.is_active ===
    false
  ) {
    return "Inactive";
  }

  return (
    quotation?.status ||
    "Draft"
  );
}

/* =========================================================
   STATUS BADGES
========================================================= */

const STATUS_BADGE_CLASS = {
  Draft:
    "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",

  Sent:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",

  Accepted:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",

  Rejected:
    "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",

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
    STATUS_BADGE_CLASS.Draft
  );
}

/* =========================================================
   API HELPERS
========================================================= */

async function updateQuotationRecord(
  id,
  payload
) {
  if (
    typeof crmApi?.quotations
      ?.update !==
    "function"
  ) {
    throw new Error(
      "Quotation update API method is not configured."
    );
  }

  return crmApi.quotations.update(
    id,
    payload
  );
}

async function deactivateQuotationRecord(
  id
) {
  if (
    typeof crmApi?.quotations
      ?.deactivate !==
    "function"
  ) {
    throw new Error(
      "Quotation deactivate API method is not configured."
    );
  }

  return crmApi.quotations.deactivate(
    id
  );
}

async function reactivateQuotationRecord(
  id
) {
  return updateQuotationRecord(
    id,
    {
      is_active: true,
    }
  );
}

/* =========================================================
   ICONS
========================================================= */

const QuotationIcon = () => (
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

const StatusIcon = () => (
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
      d="M7 10h6"
    />
  </svg>
);

const QuotationStatIcon = () => (
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
      d="M6 3h12v18H6z"
    />

    <path
      strokeLinecap="round"
      d="M9 7h6M9 11h6M9 15h4"
    />
  </svg>
);

const AcceptedStatIcon = () => (
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

const SentStatIcon = () => (
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
      d="M4 12h15"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m13 6 6 6-6 6"
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

    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",

    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",

    slate:
      "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            tones[tone]
          }`}
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
      className="group/quotation-details relative inline-flex max-w-full outline-none"
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
          group-hover/quotation-details:pointer-events-auto
          group-hover/quotation-details:visible
          group-hover/quotation-details:opacity-100
          group-focus/quotation-details:pointer-events-auto
          group-focus/quotation-details:visible
          group-focus/quotation-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   QUOTATION DETAILS CARD
========================================================= */

function QuotationDetailsCard({
  quotation,
}) {
  const customer =
    quotation?.customer ||
    quotation?.customer_data;

  const customerName =
    customer?.customer_name ||
    customer?.name ||
    `Customer #${
      quotation?.customer_id ??
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
    getQuotationStatus(
      quotation
    );

  return (
    <div className="w-[360px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Quotation Details
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            {quotation?.quotation_number ||
              `Quotation #${
                quotation?.id ??
                "-"
              }`}
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
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Customer
          </span>

          <span className="break-words text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {customerName}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Customer ID
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            #
            {quotation?.customer_id ??
              "—"}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Contact
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customerPhone}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Email
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customerEmail}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Amount
          </span>

          <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(
              quotation?.amount
            )}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Status
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {quotation?.status ||
              "Draft"}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Quotation Number
        </p>

        <p className="break-words text-xs leading-5 text-slate-700 dark:text-slate-200">
          {quotation?.quotation_number ||
            "Auto generated"}
        </p>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">
            Created At
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              quotation?.created_at
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400">
            Updated At
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              quotation?.updated_at
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
            quotation?.is_active !==
            false
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {quotation?.is_active !==
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

export default function QuotationListPage() {
  const {
    showToast,
  } = useToast();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuotations({
    page: 1,
    per_page: 1000,
  });

  const allQuotations =
    allData?.items || [];

  const createQuotation =
    useCreateQuotation();

  const deactivateQuotation =
    useDeactivateQuotation();

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
    editingQuotation,
    setEditingQuotation,
  ] = useState(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const [
    mutatingQuotationId,
    setMutatingQuotationId,
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
      crmApi.quotations.list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns:
      EXPORT_COLUMNS,

    filename:
      "quotations",

    title:
      "Quotations",
  });

  /* =======================================================
     STATISTICS
  ======================================================= */

  const activeQuotations =
    useMemo(
      () =>
        allQuotations.filter(
          (item) =>
            item.is_active !==
            false
        ),
      [allQuotations]
    );

  const inactiveQuotations =
    useMemo(
      () =>
        allQuotations.filter(
          (item) =>
            item.is_active ===
            false
        ),
      [allQuotations]
    );

  const sentQuotations =
    useMemo(
      () =>
        activeQuotations.filter(
          (item) =>
            item.status ===
            "Sent"
        ),
      [activeQuotations]
    );

  const acceptedQuotations =
    useMemo(
      () =>
        activeQuotations.filter(
          (item) =>
            item.status ===
            "Accepted"
        ),
      [activeQuotations]
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

      return allQuotations.filter(
        (quotation) => {
          const isActive =
            quotation.is_active !==
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
              quotation.customer_id
            ) !==
              String(
                customerFilter
              )
          ) {
            return false;
          }

          if (
            statusFilter &&
            quotation.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            normalizedSearch
          ) {
            const haystack = [
              quotation.id,
              quotation.quotation_number,
              quotation.customer_id,
              getCustomerDisplayName(
                quotation
              ),
              quotation.amount,
              quotation.status,
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
      allQuotations,
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
    setEditingQuotation(null);
    setModalOpen(true);
  };

  const handleEdit = (
    quotation
  ) => {
    setEditingQuotation({
      ...quotation,

      customer_id:
        quotation.customer_id ??
        quotation.customer?.id ??
        "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingQuotation(null);
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
        };

        if (
          editingQuotation
        ) {
          await updateQuotationRecord(
            editingQuotation.id,
            normalizedPayload
          );

          showToast(
            "Quotation updated",
            "success"
          );
        } else {
          await createQuotation.mutateAsync(
            normalizedPayload
          );

          showToast(
            "Quotation created",
            "success"
          );
        }

        setModalOpen(false);
        setEditingQuotation(null);

        await refetch();
      } catch (error) {
        console.error(
          "Quotation save failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to save quotation",
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
        setMutatingQuotationId(
          deleteTarget.id
        );

        await deactivateQuotationRecord(
          deleteTarget.id
        );

        showToast(
          "Quotation deactivated",
          "success"
        );

        setDeleteTarget(null);

        await refetch();
      } catch (error) {
        console.error(
          "Quotation deactivation failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to deactivate quotation",
          "error"
        );
      } finally {
        setMutatingQuotationId(
          null
        );
      }
    };

  const handleReactivate =
    async (quotation) => {
      if (!quotation?.id) {
        return;
      }

      try {
        setMutatingQuotationId(
          quotation.id
        );

        await reactivateQuotationRecord(
          quotation.id
        );

        showToast(
          "Quotation reactivated",
          "success"
        );

        await refetch();
      } catch (error) {
        console.error(
          "Quotation reactivation failed:",
          error
        );

        showToast(
          error?.response
            ?.data?.message ||
            error?.message ||
            "Failed to reactivate quotation",
          "error"
        );
      } finally {
        setMutatingQuotationId(
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
    createQuotation.isPending;

  /* =======================================================
     ERROR
  ======================================================= */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load quotations.
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
            Quotations
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Customer quotation log
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

            Add Quotation
          </Button>
        </div>
      </div>

      {/* STAT CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={
            <QuotationStatIcon />
          }
          value={
            allQuotations.length
          }
          label="Total Quotations"
          tone="sky"
        />

        <StatCard
          icon={
            <SentStatIcon />
          }
          value={
            sentQuotations.length
          }
          label="Sent Quotations"
          tone="amber"
        />

        <StatCard
          icon={
            <AcceptedStatIcon />
          }
          value={
            acceptedQuotations.length
          }
          label="Accepted Quotations"
          tone="emerald"
        />

        <StatCard
          icon={
            <InactiveStatIcon />
          }
          value={
            inactiveQuotations.length
          }
          label="Inactive Quotations"
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
                placeholder="Search quotation or customer..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none sm:max-w-[230px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Quotation Statuses
              </option>

              <option value="Draft">
                Draft
              </option>

              <option value="Sent">
                Sent
              </option>

              <option value="Accepted">
                Accepted
              </option>

              <option value="Rejected">
                Rejected
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
            No quotations found
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
            (quotation) => {
              const isActive =
                quotation.is_active !==
                false;

              const status =
                getQuotationStatus(
                  quotation
                );

              return (
                <div
                  key={
                    quotation.id
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
                            <QuotationDetailsCard
                              quotation={
                                quotation
                              }
                            />
                          }
                        >
                          <p className="max-w-[220px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {quotation.quotation_number ||
                              `Quotation #${quotation.id}`}
                          </p>
                        </HoverDetailsTrigger>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Customer #
                          {
                            quotation.customer_id
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
                            quotation
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <QuotationIcon />

                        <span className="truncate">
                          Quotation #
                          {
                            quotation.id
                          }
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <AmountIcon />

                        <span className="truncate font-semibold">
                          {formatCurrency(
                            quotation.amount
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <StatusIcon />

                        <span className="truncate">
                          Status:{" "}
                          {
                            quotation.status ||
                            "Draft"
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-30 grid h-11 grid-cols-3 gap-px border-t border-slate-100 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          quotation
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
                          mutatingQuotationId ===
                          quotation.id
                        }
                        onClick={() =>
                          setDeleteTarget(
                            quotation
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
                          mutatingQuotationId ===
                          quotation.id
                        }
                        onClick={() =>
                          handleReactivate(
                            quotation
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
                          quotation
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
                  Quotation #
                </th>

                <th className="px-4 py-3 font-medium">
                  Customer
                </th>

                <th className="px-4 py-3 font-medium">
                  Amount
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
                (quotation) => {
                  const isActive =
                    quotation.is_active !==
                    false;

                  const status =
                    getQuotationStatus(
                      quotation
                    );

                  return (
                    <tr
                      key={
                        quotation.id
                      }
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <HoverDetailsTrigger
                          align="left"
                          panel={
                            <QuotationDetailsCard
                              quotation={
                                quotation
                              }
                            />
                          }
                        >
                          <span className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
                            {quotation.quotation_number ||
                              `Quotation #${quotation.id}`}
                          </span>
                        </HoverDetailsTrigger>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          ID #
                          {
                            quotation.id
                          }
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {getCustomerDisplayName(
                            quotation
                          )}
                        </span>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Customer #
                          {
                            quotation.customer_id
                          }
                        </p>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(
                          quotation.amount
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
                                quotation
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
                                mutatingQuotationId ===
                                quotation.id
                              }
                              onClick={() =>
                                setDeleteTarget(
                                  quotation
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
                                mutatingQuotationId ===
                                quotation.id
                              }
                              onClick={() =>
                                handleReactivate(
                                  quotation
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
          editingQuotation
            ? "Edit Quotation"
            : "Add Quotation"
        }
      >
        <QuotationForm
          key={
            editingQuotation?.id ??
            "new-quotation"
          }
          formId="quotations-form"
          initialData={
            editingQuotation ||
            {}
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
        title="Deactivate Quotation"
        message={
          deleteTarget
            ? `Are you sure you want to deactivate quotation #${
                deleteTarget.quotation_number ||
                deleteTarget.id
              }?`
            : ""
        }
        confirmText="Deactivate"
        loading={
          mutatingQuotationId !==
          null
        }
      />
    </div>
  );
}