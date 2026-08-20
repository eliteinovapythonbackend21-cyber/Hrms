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
   HELPERS
========================================================= */

/**
 * Normalize any date value coming from the API (or a JS Date
 * object) into the strict YYYY-MM-DD format required by
 * HTML <input type="date">.
 *
 * Handles:
 *  - "" / null / undefined                -> ""
 *  - Date instances                        -> local YYYY-MM-DD
 *  - "YYYY-MM-DD"                          -> as-is
 *  - "YYYY-MM-DDT00:00:00[.000Z]"          -> date part only
 *  - "YYYY-MM-DD 00:00:00"                 -> date part only
 *  - Any other parseable date string       -> local YYYY-MM-DD
 *  - Anything unparseable                  -> ""
 *
 * IMPORTANT: When falling back to `new Date(value)`, we rebuild
 * the string from getFullYear()/getMonth()/getDate() (LOCAL
 * time) rather than toISOString() (UTC), so the date never
 * shifts by a day due to timezone conversion. This was the
 * root cause of Promotion Date sometimes appearing blank
 * when editing.
 */
function normalizeDate(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return "";
  }

  /*
   * Fast path: value already starts with YYYY-MM-DD
   * (covers "YYYY-MM-DD", "YYYY-MM-DDT...", "YYYY-MM-DD ...").
   */
  const isoMatch = stringValue.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  /*
   * Fallback: try to parse whatever format was given
   * and rebuild using LOCAL date parts.
   */
  const parsed = new Date(stringValue);

  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return "";
}

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
     NORMALIZED INITIAL DATA
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

    /*
     * Support both the new field and any
     * old API data that may still contain
     * effective_date. normalizeDate() now
     * robustly handles Date objects, ISO
     * strings with a time component, and
     * other date-like strings instead of
     * relying on a naive string slice.
     */
    promotion_date: normalizeDate(
      initialData?.promotion_date ??
        initialData?.effective_date ??
        ""
    ),

    accomplishments:
      initialData?.accomplishments ||
      "",

    is_active:
      initialData?.is_active !== false,
  };

  return (
    <GenericForm
      /*
       * IMPORTANT:
       *
       * Force GenericForm to remount whenever a
       * different promotion record (or a brand new
       * "Add Promotion" form) is being edited.
       *
       * Without this, if GenericForm only seeds its
       * internal field state from `initialData` on
       * mount, switching between records (or from
       * "Add" to "Edit") can leave stale or blank
       * values in fields such as Promotion Date -
       * which is exactly the symptom reported for
       * the promotion edit popup.
       */
      key={
        initialData?.id ??
        "new-promotion"
      }
      formId={formId}
      fields={fields}
      initialData={normalizedInitialData}
      onSubmit={onSubmit}
      loading={loading}
    />
  );
}