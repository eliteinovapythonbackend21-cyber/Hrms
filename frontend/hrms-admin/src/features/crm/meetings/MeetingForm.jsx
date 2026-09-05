import { useMemo } from "react";

import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions, useMembershipPlanOptions } from "@/hooks/useLookupOptions";

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

  const membershipPlanOptions =
    useMembershipPlanOptions();

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
      options: membershipPlanOptions,
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

  /*
   * IMPORTANT:
   *
   * GenericForm resyncs its internal form state whenever this object's
   * *reference* changes (see its `useEffect(..., [initialData])`).
   * Without memoizing here, a brand-new object was built on every
   * MeetingForm render - including renders caused only by
   * useCustomerOptions() resolving/refetching in the background (e.g.
   * after the native date picker steals window focus) - which silently
   * reset the whole form mid-fill, wiping out whatever the user had
   * already picked (most visibly the Customer select). Keying the memo
   * to the actual `initialData` prop (stable unless the record being
   * edited changes) fixes that.
   */
  const normalizedInitialData = useMemo(() => {
    const customerId =
      initialData?.customer_id ??
      initialData?.customer_id_fk ??
      initialData?.customer?.id ??
      "";

    const registrationDate =
      initialData?.meeting_date ??
      initialData?.registration_date ??
      "";

    return {
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
  }, [initialData]);

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