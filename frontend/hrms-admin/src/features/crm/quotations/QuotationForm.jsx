import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions } from "@/hooks/useLookupOptions";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Sent", label: "Sent" },
  { value: "Accepted", label: "Accepted" },
  { value: "Rejected", label: "Rejected" },
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeCustomerId(value) {
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

export default function QuotationForm({
  formId = "quotations-form",
  initialData,
  onSubmit,
  loading,
}) {
  const customerOptions =
    useCustomerOptions();

  const fields = [
    {
      name: "customer_id",
      label: "Customer",
      type: "select",
      options: customerOptions,
      required: true,
    },

    {
      name: "quotation_number",
      label: "Incentive Number",
      type: "text",
      placeholder: "Enter incentive number",
    },

    {
      name: "amount",
      label: "Incentive Amount",
      type: "number",
      required: true,
      placeholder: "Enter incentive amount",
    },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "Draft",
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

  const normalizedInitialData = {
    ...(initialData || {}),

    customer_id:
      normalizeCustomerId(
        customerId
      ),

    amount:
      normalizeAmount(
        initialData?.amount
      ),

    status:
      initialData?.status ||
      "Draft",
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async (payload) => {
      const normalizedPayload = {
        ...payload,

        customer_id:
          normalizeCustomerId(
            payload?.customer_id
          ),

        amount:
          normalizeAmount(
            payload?.amount
          ),

        status:
          payload?.status ||
          "Draft",
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