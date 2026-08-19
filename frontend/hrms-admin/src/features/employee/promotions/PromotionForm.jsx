import GenericForm from "@/components/form/GenericForm";

import {
  useEmployeeOptions,
  useDesignationOptions,
} from "@/hooks/useLookupOptions";

/* =========================================================
   PROMOTION REASON OPTIONS
========================================================= */

const PROMOTION_REASON_OPTIONS = [
  {
    value: "Performance Improvement",
    label: "Performance Improvement",
  },
  {
    value: "Outstanding Performance",
    label: "Outstanding Performance",
  },
  {
    value: "Consistent High Performance",
    label: "Consistent High Performance",
  },
  {
    value: "Achievement of Targets",
    label: "Achievement of Targets",
  },
  {
    value: "Increased Responsibilities",
    label: "Increased Responsibilities",
  },
  {
    value: "Leadership Skills",
    label: "Leadership Skills",
  },
  {
    value: "Skill Enhancement",
    label: "Skill Enhancement",
  },
  {
    value: "Additional Qualifications",
    label: "Additional Qualifications",
  },
  {
    value: "Experience / Tenure",
    label: "Experience / Tenure",
  },
  {
    value: "Career Growth",
    label: "Career Growth",
  },
  {
    value: "Role Expansion",
    label: "Role Expansion",
  },
  {
    value: "Successful Project Completion",
    label: "Successful Project Completion",
  },
  {
    value: "Business Requirements",
    label: "Business Requirements",
  },
  {
    value: "Critical Role / Business Need",
    label: "Critical Role / Business Need",
  },
  {
    value: "Succession Planning",
    label: "Succession Planning",
  },
  {
    value: "Internal Career Progression",
    label: "Internal Career Progression",
  },
  {
    value: "Recognition / Merit",
    label: "Recognition / Merit",
  },
  {
    value: "Promotion After Performance Review",
    label: "Promotion After Performance Review",
  },
  {
    value: "Promotion After Probation",
    label: "Promotion After Probation",
  },
  {
    value: "Other",
    label: "Other",
  },
];

/* =========================================================
   FORM
========================================================= */

export default function PromotionForm({
  formId = "promotions-form",
  initialData = {},
  onSubmit,
  loading = false,
}) {
  const employeeOptions =
    useEmployeeOptions();

  const designationOptions =
    useDesignationOptions();

  /* =======================================================
     FIELDS
  ======================================================= */

  const fields = [
    {
      name: "employee_id",
      label: "Employee",
      type: "select",
      options: employeeOptions,
      required: true,
    },

    {
      name: "from_designation_id",
      label: "From Designation",
      type: "select",
      options: designationOptions,
      required: true,
    },

    {
      name: "to_designation_id",
      label: "To Designation",
      type: "select",
      options: designationOptions,
      required: true,
    },

    {
      name: "reason",
      label: "Promotion Reason",
      type: "select",
      options: PROMOTION_REASON_OPTIONS,
      required: true,
    },

    {
      name: "promotion_date",
      label: "Promotion Date",
      type: "date",
      required: true,
    },

    {
      name: "accomplishments",
      label: "Overall Records / Accomplishments",
      type: "textarea",
    },
  ];

  /* =======================================================
     INITIAL DATA
  ======================================================= */

  const normalizedInitialData = {
    employee_id:
      initialData?.employee_id ??
      initialData?.employee?.id ??
      "",

    from_designation_id:
      initialData?.from_designation_id ??
      initialData?.from_designation?.id ??
      "",

    to_designation_id:
      initialData?.to_designation_id ??
      initialData?.to_designation?.id ??
      "",

    reason:
      initialData?.reason ||
      "Other",

    promotion_date:
      initialData?.promotion_date ||
      "",

    accomplishments:
      initialData?.accomplishments ||
      "",

    is_active:
      initialData?.is_active !== false,
  };

  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={normalizedInitialData}
      onSubmit={onSubmit}
      loading={loading}
    />
  );
}