import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import DataTable from "@/components/table/DataTable";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DetailList from "@/components/ui/DetailList";
import TabbedDetailLayout from "@/components/TabbedDetailLayout";
import CustomerSubList from "@/components/CustomerSubList";

import { useCustomer } from "./useCustomers";
import { crmApi } from "@/api/crm.api";

import { formatCurrency } from "@/utils/formatCurrency";

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString();
}

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

const UserIcon = () => (
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
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.5 4.5h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3c0 1-.8 1.7-1.8 1.6A14.8 14.8 0 013.9 6.3c-.1-1 .6-1.8 1.6-1.8Z"
    />
  </svg>
);

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 7l8 6 8-6"
    />
  </svg>
);

const MapPinIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12Z"
    />

    <circle
      cx="12"
      cy="9"
      r="2.2"
    />
  </svg>
);

const LinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 13a5 5 0 007.1.1l2-2A5 5 0 0012 4l-1.1 1.1"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14 11a5 5 0 00-7.1-.1l-2 2A5 5 0 0012 20l1.1-1.1"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="1.8"
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="17"
      rx="2"
    />

    <path
      strokeLinecap="round"
      d="M8 2v4M16 2v4M3 9h18"
    />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

/* =========================================================
   DETAIL CARD
========================================================= */

function CustomerDetailCard({
  icon,
  label,
  value,
  wide = false,
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
            {value || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CUSTOMER HEADER
========================================================= */

function CustomerHeaderCard({
  customer,
}) {
  const isActive =
    customer?.is_active !== false;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              <UserIcon />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Customer
              </p>

              <h1 className="mt-0.5 truncate text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                {customer?.customer_name ||
                  "Customer"}
              </h1>

              <p className="mt-0.5 text-xs text-slate-400">
                Customer ID #{customer?.id ?? "-"}
              </p>
            </div>
          </div>

          <Badge
            className={
              isActive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }
          >
            {isActive
              ? "Active"
              : "Inactive"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-slate-100 bg-slate-50/70 sm:grid-cols-3 dark:border-slate-800 dark:bg-white/[0.06]/40">
        <div className="border-b border-slate-100 px-5 py-3 sm:border-b-0 sm:border-r dark:border-slate-800">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Contact
          </p>

          <p className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
            {customer?.contact_number ||
              "-"}
          </p>
        </div>

        <div className="border-b border-slate-100 px-5 py-3 sm:border-b-0 sm:border-r dark:border-slate-800">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Email
          </p>

          <p className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
            {customer?.email ||
              "-"}
          </p>
        </div>

        <div className="px-5 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Source Lead
          </p>

          <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {customer?.lead_id
              ? `Lead #${customer.lead_id}`
              : "Direct Customer"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAYMENTS
========================================================= */

function CustomerPayments({
  customerId,
}) {
  const {
    data: invoiceData,
  } = useQuery({
    queryKey: [
      "invoices",
      "by-customer",
      customerId,
    ],

    queryFn:
      async () =>
        (
          await crmApi.invoices.list(
            {
              page: 1,
              per_page: 500,
            }
          )
        ).data.data,

    enabled: !!customerId,
  });

  const invoiceIds =
    new Set(
      (
        invoiceData?.items ||
        []
      )
        .filter(
          (invoice) =>
            String(
              invoice.customer_id
            ) ===
            String(customerId)
        )
        .map(
          (invoice) =>
            invoice.id
        )
    );

  const {
    data: paymentData,
    isLoading,
  } = useQuery({
    queryKey: [
      "payments",
      "by-customer",
      customerId,
    ],

    queryFn:
      async () =>
        (
          await crmApi.payments.list(
            {
              page: 1,
              per_page: 500,
            }
          )
        ).data.data,

    enabled: !!customerId,
  });

  const rows = (
    paymentData?.items ||
    []
  ).filter(
    (payment) =>
      invoiceIds.has(
        payment.invoice_id
      )
  );

  return (
    <DataTable
      loading={isLoading}
      data={rows}
      emptyText="No payments recorded."
      columns={[
        {
          key: "invoice_id",
          label: "Invoice ID",
        },
        {
          key: "amount",
          label: "Amount",
          render: (row) =>
            formatCurrency(
              row.amount
            ),
        },
        {
          key: "payment_date",
          label: "Date",
        },
      ]}
    />
  );
}

/* =========================================================
   CUSTOMER DETAIL PAGE
========================================================= */

export default function CustomerDetailPage() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const {
    data: customer,
    isLoading,
    isError,
  } = useCustomer(id);

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    isError ||
    !customer
  ) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
            !
          </div>

          <h2 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
            Customer not found
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            The requested customer record could not be loaded.
          </p>

          <Button
            variant="secondary"
            onClick={() =>
              navigate(
                "/crm/customers"
              )
            }
            className="mt-5"
          >
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const infoRows = [
    {
      label: "Contact Number",
      value:
        customer.contact_number ||
        "-",
    },
    {
      label: "Email",
      value:
        customer.email ||
        "-",
    },
    {
      label: "Address",
      value:
        customer.address ||
        "-",
    },
    {
      label: "Source Lead ID",
      value:
        customer.lead_id
          ? `#${customer.lead_id}`
          : "-",
    },
  ];

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-w-0 space-y-5">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/crm/customers"
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              title="Back to Customers"
              aria-label="Back to Customers"
            >
              <ArrowLeftIcon />
            </button>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Customer Details
              </h1>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Customer profile and CRM activity
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() =>
            navigate(
              "/crm/customers"
            )
          }
        >
          Back
        </Button>
      </div>

      {/* CUSTOMER HEADER CARD */}

      <CustomerHeaderCard
        customer={customer}
      />

      {/* CUSTOMER INFORMATION */}

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            Customer Information
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Contact and source information
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CustomerDetailCard
            icon={
              <PhoneIcon />
            }
            label="Contact Number"
            value={
              customer.contact_number
            }
          />

          <CustomerDetailCard
            icon={
              <MailIcon />
            }
            label="Email"
            value={
              customer.email
            }
          />

          <CustomerDetailCard
            icon={
              <MapPinIcon />
            }
            label="Address"
            value={
              customer.address
            }
            wide
          />

          <CustomerDetailCard
            icon={
              <LinkIcon />
            }
            label="Source Lead"
            value={
              customer.lead_id
                ? `Lead #${customer.lead_id}`
                : "Direct Customer"
            }
          />

          <CustomerDetailCard
            icon={
              <UserIcon />
            }
            label="Customer ID"
            value={
              customer.id
                ? `#${customer.id}`
                : "-"
            }
          />
        </div>
      </div>

      {/* RECORD INFORMATION */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
            <CalendarIcon />
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Record Information
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customer record metadata
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Customer ID
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              #{customer.id}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Status
            </p>

            <p
              className={`mt-1 text-sm font-semibold ${
                customer.is_active !==
                false
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {customer.is_active !==
              false
                ? "Active"
                : "Inactive"}
            </p>
          </div>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Source
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {customer.lead_id
                ? `Lead #${customer.lead_id}`
                : "Direct"}
            </p>
          </div>

          {customer.created_at && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                Created At
              </p>

              <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                {formatDateTime(
                  customer.created_at
                )}
              </p>
            </div>
          )}

          {customer.updated_at && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                Updated At
              </p>

              <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                {formatDateTime(
                  customer.updated_at
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CRM ACTIVITY */}

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">
            CRM Activity
          </h2>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Follow-ups, meetings, quotations, invoices, payments and support
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <TabbedDetailLayout
            tabs={[
              {
                key: "follow-ups",
                label: "Follow-ups",
                content: (
                  <div className="p-4 sm:p-5">
                    <CustomerSubList
                      queryKey="follow-ups"
                      api={
                        crmApi.followUps
                      }
                      customerId={id}
                      columns={[
                        {
                          key: "follow_up_date",
                          label: "Date",
                          render: (
                            row
                          ) =>
                            formatDate(
                              row.follow_up_date
                            ),
                        },
                        {
                          key: "notes",
                          label: "Notes",
                          render: (
                            row
                          ) =>
                            row.notes ||
                            "-",
                        },
                      ]}
                    />
                  </div>
                ),
              },

              {
                key: "meetings",
                label: "Meetings",
                content: (
                  <div className="p-4 sm:p-5">
                    <CustomerSubList
                      queryKey="meetings"
                      api={
                        crmApi.meetings
                      }
                      customerId={id}
                      columns={[
                        {
                          key: "meeting_date",
                          label: "Date",
                          render: (
                            row
                          ) =>
                            formatDate(
                              row.meeting_date
                            ),
                        },
                        {
                          key: "notes",
                          label: "Notes",
                          render: (
                            row
                          ) =>
                            row.notes ||
                            "-",
                        },
                      ]}
                    />
                  </div>
                ),
              },

              {
                key: "quotations",
                label: "Quotations",
                content: (
                  <div className="p-4 sm:p-5">
                    <CustomerSubList
                      queryKey="quotations"
                      api={
                        crmApi.quotations
                      }
                      customerId={id}
                      columns={[
                        {
                          key: "quotation_number",
                          label:
                            "Quotation #",
                        },
                        {
                          key: "amount",
                          label:
                            "Amount",
                          render: (
                            row
                          ) =>
                            formatCurrency(
                              row.amount
                            ),
                        },
                        {
                          key: "status",
                          label:
                            "Status",
                        },
                      ]}
                    />
                  </div>
                ),
              },

              {
                key: "invoices",
                label: "Invoices",
                content: (
                  <div className="p-4 sm:p-5">
                    <CustomerSubList
                      queryKey="invoices"
                      api={
                        crmApi.invoices
                      }
                      customerId={id}
                      columns={[
                        {
                          key: "invoice_number",
                          label:
                            "Invoice #",
                        },
                        {
                          key: "amount",
                          label:
                            "Amount",
                          render: (
                            row
                          ) =>
                            formatCurrency(
                              row.amount
                            ),
                        },
                        {
                          key: "due_date",
                          label:
                            "Due Date",
                          render: (
                            row
                          ) =>
                            formatDate(
                              row.due_date
                            ),
                        },
                        {
                          key: "status",
                          label:
                            "Status",
                        },
                      ]}
                    />
                  </div>
                ),
              },

              {
                key: "payments",
                label: "Payments",
                content: (
                  <div className="p-4 sm:p-5">
                    <CustomerPayments
                      customerId={id}
                    />
                  </div>
                ),
              },

              {
                key: "support-tickets",
                label: "Support Tickets",
                content: (
                  <div className="p-4 sm:p-5">
                    <CustomerSubList
                      queryKey="support-tickets"
                      api={
                        crmApi.supportTickets
                      }
                      customerId={id}
                      columns={[
                        {
                          key: "subject",
                          label:
                            "Subject",
                        },
                        {
                          key: "status",
                          label:
                            "Status",
                        },
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}