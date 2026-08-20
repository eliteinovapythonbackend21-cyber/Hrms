import GenericForm from "@/components/form/GenericForm";
import { useInvoiceOptions } from "@/hooks/useLookupOptions";

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

export default function PaymentForm({
  formId = "payments-form",
  initialData,
  onSubmit,
  loading,
}) {
  const invoiceOptions =
    useInvoiceOptions();

  const fields = [
    {
      name: "invoice_id",
      label: "Invoice",
      type: "select",
      options: invoiceOptions,
      required: true,
    },

    {
      name: "amount",
      label: "Amount",
      type: "number",
      required: true,
    },

    {
      name: "payment_date",
      label: "Payment Date",
      type: "date",
      required: true,
    },

    {
      name: "mode",
      label: "Mode",
      type: "text",
      placeholder:
        "e.g. Cash, Bank Transfer, UPI",
    },
  ];

  /* =======================================================
     NORMALIZE EDIT DATA
  ======================================================= */

  const invoiceId =
    initialData?.invoice_id ??
    initialData?.invoice_id_fk ??
    initialData?.invoice?.id ??
    "";

  const normalizedInitialData = {
    ...(initialData || {}),

    invoice_id:
      normalizeId(invoiceId),

    amount:
      normalizeAmount(
        initialData?.amount
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

      invoice_id:
        normalizeId(
          payload?.invoice_id
        ),

      amount:
        normalizeAmount(
          payload?.amount
        ),

      mode:
        payload?.mode || "",
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