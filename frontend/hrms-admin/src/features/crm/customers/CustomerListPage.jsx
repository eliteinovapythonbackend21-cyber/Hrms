import { useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";

import CustomerForm from "./CustomerForm";

import {
  useCustomers,
  useCreateCustomer,
  useDeactivateCustomer,
} from "./useCustomers";

import { crmApi } from "@/api/crm.api";
import { useTableExport } from "@/hooks/useTableExport";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;
const CARD_HEIGHT = "h-[270px]";

const EXPORT_COLUMNS = [
  {
    header: "Customer Name",
    accessor: (r) =>
      r.customer_name,
  },
  {
    header: "Contact Number",
    accessor: (r) =>
      r.contact_number,
  },
  {
    header: "Email",
    accessor: (r) =>
      r.email,
  },
  {
    header: "Address",
    accessor: (r) =>
      r.address,
  },
  {
    header: "Source Lead",
    accessor: (r) =>
      r.lead_id
        ? `Lead #${r.lead_id}`
        : "Direct Customer",
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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

/* =========================================================
   ICONS
========================================================= */

const CustomerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <circle
      cx="12"
      cy="8"
      r="4"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6"
    />
  </svg>
);

const PhoneIcon = () => (
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
      d="M4.5 3h2.4l1 3.6-1.7 1.3a9 9 0 0 0 4.4 4.4l1.3-1.7 3.6 1v2.4c0 .8-.7 1.4-1.5 1.3A13 13 0 0 1 3.2 4.5c-.1-.8.5-1.5 1.3-1.5Z"
    />
  </svg>
);

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400"
    fill="none"
    viewBox="0 0 20 20"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <rect
      x="2.5"
      y="4.5"
      width="15"
      height="11"
      rx="1.5"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 5.5l7 5 7-5"
    />
  </svg>
);

const AddressIcon = () => (
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
      d="M10 17s5-4.4 5-8.5a5 5 0 10-10 0c0 4.1 5 8.5 5 8.5Z"
    />

    <circle
      cx="10"
      cy="8.5"
      r="1.7"
    />
  </svg>
);

const LinkIcon = () => (
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
      d="M8.5 11.5a3.5 3.5 0 005 .1l1.4-1.4a3.5 3.5 0 00-5-5L9 6"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.5 8.5a3.5 3.5 0 00-5-.1L5.1 9.8a3.5 3.5 0 005 5l.9-.9"
    />
  </svg>
);

const CustomersStatIcon = () => (
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
      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
    />

    <circle
      cx="9"
      cy="7"
      r="4"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
    />
  </svg>
);

const ActiveStatIcon = () => (
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
      d="M9 12l2 2 4-4"
    />

    <circle
      cx="12"
      cy="12"
      r="9"
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
    red:
      "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
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
      className="group/customer-details relative inline-flex max-w-full outline-none"
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
          group-hover/customer-details:pointer-events-auto
          group-hover/customer-details:visible
          group-hover/customer-details:opacity-100
          group-focus/customer-details:pointer-events-auto
          group-focus/customer-details:visible
          group-focus/customer-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   CUSTOMER DETAILS CARD
========================================================= */

function CustomerDetailsCard({
  customer,
}) {
  const isActive =
    customer?.is_active !== false;

  return (
    <div className="w-[360px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Customer Details
          </p>

          <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800 dark:text-white">
            {customer?.customer_name ||
              "Customer"}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {isActive
            ? "Active"
            : "Inactive"}
        </span>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Customer ID
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            #{customer?.id ?? "—"}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Contact
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customer?.contact_number ||
              "—"}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Email
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customer?.email ||
              "—"}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Source Lead
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customer?.lead_id
              ? `Lead #${customer.lead_id}`
              : "Direct Customer"}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Address
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {customer?.address ||
              "—"}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">
            Created
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              customer?.created_at
            )}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400">
            Updated
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(
              customer?.updated_at
            )}
          </p>
        </div>
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

export default function CustomerListPage() {
  const {
    showToast,
  } = useToast();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useCustomers({
    page: 1,
    per_page: 1000,
  });

  const allCustomers =
    allData?.items || [];

  const createCustomer =
    useCreateCustomer();

  const deactivateCustomer =
    useDeactivateCustomer();

  const [search, setSearch] =
    useState("");

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
    editingCustomer,
    setEditingCustomer,
  ] = useState(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const [
    mutatingCustomerId,
    setMutatingCustomerId,
  ] = useState(null);

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll:
      crmApi.customers.list,
    queryParams: {
      search:
        search || undefined,
    },
    exportColumns:
      EXPORT_COLUMNS,
    filename: "customers",
    title: "Customers",
  });

  const activeCustomers =
    useMemo(
      () =>
        allCustomers.filter(
          (customer) =>
            customer.is_active !==
            false
        ),
      [allCustomers]
    );

  const inactiveCustomers =
    useMemo(
      () =>
        allCustomers.filter(
          (customer) =>
            customer.is_active ===
            false
        ),
      [allCustomers]
    );

  const filtered =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return allCustomers.filter(
        (customer) => {
          const isActive =
            customer.is_active !==
            false;

          if (
            activeFilter === "active" &&
            !isActive
          ) {
            return false;
          }

          if (
            activeFilter === "inactive" &&
            isActive
          ) {
            return false;
          }

          if (normalizedSearch) {
            const haystack = [
              customer.customer_name,
              customer.contact_number,
              customer.email,
              customer.address,
              customer.lead_id,
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
      allCustomers,
      search,
      activeFilter,
    ]);

  const pageSize =
    viewMode === "card"
      ? CARD_PAGE_SIZE
      : PAGE_SIZE;

  const pageCount = Math.max(
    1,
    Math.ceil(
      filtered.length / pageSize
    )
  );

  const paged = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleAdd = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const handleEdit = (
    customer
  ) => {
    setEditingCustomer(
      customer
    );

    setModalOpen(true);
  };

  const handleView = (
    customer
  ) => {
    window.location.href = `/crm/customers/${customer.id}`;
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSubmit =
    async (payload) => {
      try {
        setSaving(true);

        const normalizedPayload = {
          ...payload,
          lead_id:
            payload?.lead_id
              ? Number(
                  payload.lead_id
                )
              : null,
        };

        if (editingCustomer) {
          if (
            typeof crmApi
              ?.customers?.update !==
            "function"
          ) {
            throw new Error(
              "Customer update API method is not configured."
            );
          }

          await crmApi.customers.update(
            editingCustomer.id,
            normalizedPayload
          );

          showToast(
            "Customer updated",
            "success"
          );
        } else {
          await createCustomer.mutateAsync(
            normalizedPayload
          );

          showToast(
            "Customer created",
            "success"
          );
        }

        setModalOpen(false);
        setEditingCustomer(null);

        await refetch();
      } catch (error) {
        console.error(
          "Customer save failed:",
          error
        );

        showToast(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to save customer",
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
        setMutatingCustomerId(
          deleteTarget.id
        );

        await deactivateCustomer.mutateAsync(
          deleteTarget.id
        );

        showToast(
          "Customer deactivated",
          "success"
        );

        setDeleteTarget(null);

        await refetch();
      } catch (error) {
        console.error(
          "Customer deactivation failed:",
          error
        );

        showToast(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to deactivate customer",
          "error"
        );
      } finally {
        setMutatingCustomerId(
          null
        );
      }
    };

  const handleReactivate =
    async (customer) => {
      if (!customer?.id) {
        return;
      }

      try {
        setMutatingCustomerId(
          customer.id
        );

        if (
          typeof crmApi
            ?.customers?.update !==
          "function"
        ) {
          throw new Error(
            "Customer update API method is not configured."
          );
        }

        await crmApi.customers.update(
          customer.id,
          {
            is_active: true,
          }
        );

        showToast(
          "Customer reactivated",
          "success"
        );

        await refetch();
      } catch (error) {
        console.error(
          "Customer reactivation failed:",
          error
        );

        showToast(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to reactivate customer",
          "error"
        );
      } finally {
        setMutatingCustomerId(
          null
        );
      }
    };

  const clearFilters = () => {
    setSearch("");
    setActiveFilter("active");
    setPage(1);
  };

  const isSaving =
    saving ||
    createCustomer.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load customers.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Customers
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Converted and directly created customers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

          <Button
            type="button"
            onClick={handleAdd}
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">
              +
            </span>
            Add Customer
          </Button>
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<CustomersStatIcon />}
          value={allCustomers.length}
          label="Total Customers"
          tone="sky"
        />

        <StatCard
          icon={<ActiveStatIcon />}
          value={activeCustomers.length}
          label="Active Customers"
          tone="emerald"
        />

        <StatCard
          icon={<InactiveStatIcon />}
          value={inactiveCustomers.length}
          label="Inactive Customers"
          tone="red"
        />
      </div>

      {/* FILTERS */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
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
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search by name, phone, email, or address..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {(search ||
              activeFilter !==
                "active") && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                "active",
                "inactive",
                "all",
              ].map((status) => (
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
              ))}
            </div>

            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode("card");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Card
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "table"
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
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          No customers found.
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((customer) => {
            const isActive =
              customer.is_active !== false;

            return (
              <div
                key={customer.id}
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
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <CustomerIcon />
                      </div>

                      <div className="min-w-0">
                        <HoverDetailsTrigger
                          align="left"
                          panel={
                            <CustomerDetailsCard
                              customer={
                                customer
                              }
                            />
                          }
                        >
                          <p className="max-w-[220px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {customer.customer_name ||
                              "Unnamed Customer"}
                          </p>
                        </HoverDetailsTrigger>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Customer #
                          {customer.id}
                        </p>
                      </div>
                    </div>

                    {!isActive && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                        <span className="h-1 w-1 rounded-full bg-red-500" />
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <PhoneIcon />
                      <span className="truncate">
                        {customer.contact_number ||
                          "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MailIcon />
                      <span className="truncate">
                        {customer.email ||
                          "-"}
                      </span>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <AddressIcon />
                      <span className="line-clamp-2">
                        {customer.address ||
                          "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <LinkIcon />
                      <span className="truncate">
                        {customer.lead_id
                          ? `Converted from Lead #${customer.lead_id}`
                          : "Direct Customer"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 z-30 grid h-11 grid-cols-3 gap-px border-t border-slate-100 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      handleView(
                        customer
                      )
                    }
                    className="bg-white text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:bg-slate-900 dark:text-primary-400"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleEdit(
                        customer
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
                        mutatingCustomerId ===
                        customer.id
                      }
                      onClick={() =>
                        setDeleteTarget(
                          customer
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
                        mutatingCustomerId ===
                        customer.id
                      }
                      onClick={() =>
                        handleReactivate(
                          customer
                        )
                      }
                      className="bg-white text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:bg-slate-900 dark:text-emerald-400"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Customer
                </th>

                <th className="px-4 py-3 font-medium">
                  Contact
                </th>

                <th className="px-4 py-3 font-medium">
                  Email
                </th>

                <th className="px-4 py-3 font-medium">
                  Address
                </th>

                <th className="px-4 py-3 font-medium">
                  Source Lead
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
                (customer) => {
                  const isActive =
                    customer.is_active !==
                    false;

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-3">
                        <HoverDetailsTrigger
                          align="left"
                          panel={
                            <CustomerDetailsCard
                              customer={
                                customer
                              }
                            />
                          }
                        >
                          <span className="cursor-pointer font-medium text-slate-800 dark:text-slate-100">
                            {customer.customer_name ||
                              "-"}
                          </span>
                        </HoverDetailsTrigger>
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {customer.contact_number ||
                          "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {customer.email ||
                          "-"}
                      </td>

                      <td className="max-w-[240px] px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="line-clamp-2">
                          {customer.address ||
                            "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {customer.lead_id
                          ? `Lead #${customer.lead_id}`
                          : "Direct"}
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
                            title="View Customer"
                            tone="primary"
                            onClick={() =>
                              handleView(
                                customer
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
                                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                              />

                              <circle
                                cx="12"
                                cy="12"
                                r="2.5"
                              />
                            </svg>
                          </IconButton>

                          <IconButton
                            title="Edit"
                            onClick={() =>
                              handleEdit(
                                customer
                              )
                            }
                            disabled={
                              isSaving
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
                                mutatingCustomerId ===
                                customer.id
                              }
                              onClick={() =>
                                setDeleteTarget(
                                  customer
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
                                mutatingCustomerId ===
                                customer.id
                              }
                              onClick={() =>
                                handleReactivate(
                                  customer
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
                                  d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 017 4M4 20v-5h5"
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
          Page {page} of {pageCount}
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
          editingCustomer
            ? "Edit Customer"
            : "Add Customer"
        }
      >
        <CustomerForm
          key={
            editingCustomer?.id ??
            "new-customer"
          }
          formId="customers-form"
          initialData={
            editingCustomer || {}
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
        onConfirm={confirmDeactivate}
        title="Deactivate Customer"
        message={
          deleteTarget
            ? `Are you sure you want to deactivate "${deleteTarget.customer_name}"?`
            : ""
        }
        confirmText="Deactivate"
        loading={
          mutatingCustomerId !== null
        }
      />
    </div>
  );
}