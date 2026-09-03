import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions } from "@/hooks/useLookupOptions";

const MEMBERSHIP_PLAN_OPTIONS = [
  { value: "Gold", label: "Gold" },
  { value: "Silver", label: "Silver" },
  { value: "Bronze", label: "Bronze" },
];

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
   DATE HELPER
========================================================= */

function normalizeDateForInput(value) {
  if (!value) {
    return "";
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return "";
  }

  const isoMatch = stringValue.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = new Date(stringValue);

  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(
      parsed.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      parsed.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return "";
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
      label: "Registration Date",
      type: "date",
      required: true,
    },

    {
      name: "membership_plan",
      label: "Membership Plan",
      type: "select",
      options: MEMBERSHIP_PLAN_OPTIONS,
      required: true,
    },

    {
      name: "notes",
      label: "Registration Notes",
      type: "textarea",
      placeholder:
        "Enter registration notes...",
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

  const registrationDate =
    initialData?.meeting_date ??
    initialData?.registration_date ??
    "";

  const normalizedInitialData = {
    ...(initialData || {}),

    customer_id:
      normalizeCustomerId(
        customerId
      ),

    meeting_date:
      normalizeDateForInput(
        registrationDate
      ),

    membership_plan:
      initialData?.membership_plan ||
      "",
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

      /*
       * Backend continues using `meeting_date`.
       * Only the UI terminology is changed to
       * Registration Date.
       */
      meeting_date:
        normalizeDateForInput(
          payload?.meeting_date
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