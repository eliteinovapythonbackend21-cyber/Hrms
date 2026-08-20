import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions } from "@/hooks/useLookupOptions";

/* =========================================================
   HELPER
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

export default function MeetingForm({
  formId = "meetings-form",
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
      name: "meeting_date",
      label: "Meeting Date",
      type: "date",
      required: true,
    },

    {
      name: "notes",
      label: "Notes",
      type: "textarea",
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