import GenericForm from "@/components/form/GenericForm";
import { useCRMEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  {
    value: "New",
    label: "New",
  },
  {
    value: "Contacted",
    label: "Contacted",
  },
  {
    value: "Qualified",
    label: "Qualified",
  },
  {
    value: "Converted",
    label: "Converted",
  },
  {
    value: "Lost",
    label: "Lost",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function normalizeEmployeeId(value) {
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

export default function LeadForm({
  formId = "leads-form",
  initialData,
  onSubmit,
  loading,
}) {
  const employeeOptions =
    useCRMEmployeeOptions();

  /* =======================================================
     FORM FIELDS
  ======================================================= */

  const fields = [
    {
      name: "lead_name",
      label: "Lead Name",
      type: "text",
      required: true,
    },

    {
      name: "contact_number",
      label: "Contact Number",
      type: "text",
    },

    {
      name: "email",
      label: "Email",
      type: "text",
    },

    {
      name: "source",
      label: "Source",
      type: "text",
      placeholder:
        "e.g. Website, Referral",
    },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "New",
    },

    {
      name: "created_by",
      label:
        "Lead Created By (CRM Employee)",
      type: "select",
      options: employeeOptions,
      required: true,
    },
  ];

  /* =======================================================
     NORMALIZE INITIAL DATA
  ======================================================= */

  const creatorId =
    initialData?.created_by ??
    initialData?.creator_id ??
    initialData?.creator?.id ??
    initialData?.creator?.employee_id ??
    "";

  const normalizedInitialData = {
    ...(initialData || {}),

    created_by:
      normalizeEmployeeId(
        creatorId
      ),

    status:
      initialData?.status ||
      "New",
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    payload
  ) => {
    const normalizedPayload = {
      ...payload,

      created_by:
        normalizeEmployeeId(
          payload?.created_by
        ),
    };

    await onSubmit(
      normalizedPayload
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

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