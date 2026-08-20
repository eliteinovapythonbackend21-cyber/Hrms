import GenericForm from "@/components/form/GenericForm";
import {
  useCustomerOptions,
  useQuotationOptions,
} from "@/hooks/useLookupOptions";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_OPTIONS = [
  { value: "Unpaid", label: "Unpaid" },
  { value: "Paid", label: "Paid" },
  { value: "Overdue", label: "Overdue" },
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeId(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : "";
}

function normalizeAmount(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : "";
}

/* =========================================================
   FORM
========================================================= */

export default function InvoiceForm({
  formId = "invoices-form",
  initialData,
  onSubmit,
  loading,
}) {
  const customerOptions =
    useCustomerOptions();

  const quotationOptions =
    useQuotationOptions();

  const fields = [
    {
      name: "customer_id",
      label: "Customer",
      type: "select",
      options: customerOptions,
      required: true,
    },

    {
      name: "quotation_id",
      label: "Quotation (optional)",
      type: "select",
      options: quotationOptions,
    },

    {
      name: "invoice_number",
      label: "Invoice Number",
      type: "text",
    },

    {
      name: "amount",
      label: "Amount",
      type: "number",
      required: true,
    },

    {
      name: "due_date",
      label: "Due Date",
      type: "date",
      required: true,
    },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "Unpaid",
    },
  ];

  /* =======================================================
     NORMALIZE EDIT DATA
  ======================================================= */

  const customerId =
    initialData?.customer_id ??
    initialData?.customer_id_fk ??
    initialData?.customer?.id ??
    "";

  const quotationId =
    initialData?.quotation_id ??
    initialData?.quotation_id_fk ??
    initialData?.quotation?.id ??
    "";

  const normalizedInitialData = {
    ...(initialData || {}),

    customer_id:
      normalizeId(customerId),

    quotation_id:
      normalizeId(quotationId),

    amount:
      normalizeAmount(
        initialData?.amount
      ),

    status:
      initialData?.status ||
      "Unpaid",
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    payload
  ) => {
    const normalizedPayload = {
      ...payload,

      customer_id:
        normalizeId(
          payload?.customer_id
        ),

      quotation_id:
        payload?.quotation_id
          ? normalizeId(
              payload.quotation_id
            )
          : null,

      amount:
        normalizeAmount(
          payload?.amount
        ),

      status:
        payload?.status ||
        "Unpaid",
    };

    await onSubmit(
      normalizedPayload
    );
  };

  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={
        normalizedInitialData
      }
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
}