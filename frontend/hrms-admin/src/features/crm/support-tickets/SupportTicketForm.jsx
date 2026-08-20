import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions } from "@/hooks/useLookupOptions";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Closed", label: "Closed" },
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

/* =========================================================
   FORM
========================================================= */

export default function SupportTicketForm({
  formId = "support-tickets-form",
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
      name: "subject",
      label: "Subject",
      type: "text",
      required: true,
    },

    {
      name: "description",
      label: "Description",
      type: "textarea",
    },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "Open",
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

    status:
      initialData?.status ||
      "Open",
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
        normalizeCustomerId(
          payload?.customer_id
        ),

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