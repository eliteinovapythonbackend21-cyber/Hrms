import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_OPTIONS = [
  {
    value: "Pending",
    label: "Pending",
  },
  {
    value: "Paid",
    label: "Paid",
  },
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

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
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

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : "";
}

/* =========================================================
   FORM
========================================================= */

export default function PayrollRecordForm({
  formId = "payroll-form",
  initialData,
  onSubmit,
  loading,
}) {
  const employeeOptions =
    useEmployeeOptions();

  const fields = [
    {
      name: "employee_id",
      label: "Employee",
      type: "select",
      options: employeeOptions,
      required: true,
    },

    {
      name: "pay_month",
      label: "Pay Month",
      type: "text",
      placeholder: "YYYY-MM",
      required: true,
    },

    {
      name: "gross_salary",
      label: "Gross Salary",
      type: "number",
      required: true,
    },

    {
      name: "deductions",
      label: "Deductions",
      type: "number",
    },

    {
      name: "net_salary",
      label: "Net Salary",
      type: "number",
      required: true,
    },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "Pending",
    },
  ];

  /* =======================================================
     NORMALIZE EDIT DATA
  ======================================================= */

  const employeeId =
    initialData?.employee_id ??
    initialData?.employee_id_fk ??
    initialData?.employee?.id ??
    "";

  const normalizedInitialData = {
    ...(initialData || {}),

    employee_id:
      normalizeId(
        employeeId
      ),

    pay_month:
      initialData?.pay_month ||
      "",

    gross_salary:
      normalizeAmount(
        initialData?.gross_salary
      ),

    deductions:
      normalizeAmount(
        initialData?.deductions
      ),

    net_salary:
      normalizeAmount(
        initialData?.net_salary
      ),

    status:
      initialData?.status ||
      "Pending",
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    payload
  ) => {
    const normalizedPayload = {
      ...payload,

      employee_id:
        normalizeId(
          payload?.employee_id
        ),

      pay_month:
        payload?.pay_month ||
        "",

      gross_salary:
        normalizeAmount(
          payload?.gross_salary
        ),

      deductions:
        normalizeAmount(
          payload?.deductions
        ),

      net_salary:
        normalizeAmount(
          payload?.net_salary
        ),

      status:
        payload?.status ||
        "Pending",
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