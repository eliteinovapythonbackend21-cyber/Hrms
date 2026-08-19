import { useEffect, useMemo, useState } from "react";

import GenericForm from "@/components/form/GenericForm";

import {
  useEmployeeOptions,
  useDepartmentOptions,
} from "@/hooks/useLookupOptions";

import { employeesApi } from "@/api/employees.api";

/* =========================================================
   TRANSFER REASON OPTIONS
========================================================= */

const TRANSFER_REASON_OPTIONS = [
  {
    value: "Business Requirement",
    label: "Business Requirement",
  },
  {
    value: "Employee Request",
    label: "Employee Request",
  },
  {
    value: "Department Requirement",
    label: "Department Requirement",
  },
  {
    value: "Workforce Planning",
    label: "Workforce Planning",
  },
  {
    value: "Business Expansion",
    label: "Business Expansion",
  },
  {
    value: "Operational Requirement",
    label: "Operational Requirement",
  },
  {
    value: "Project Requirement",
    label: "Project Requirement",
  },
  {
    value: "Skill Requirement",
    label: "Skill Requirement",
  },
  {
    value: "Performance",
    label: "Performance",
  },
  {
    value: "Career Development",
    label: "Career Development",
  },
  {
    value: "Employee Development",
    label: "Employee Development",
  },
  {
    value: "Relocation",
    label: "Relocation",
  },
  {
    value: "Management Decision",
    label: "Management Decision",
  },
  {
    value: "Other",
    label: "Other",
  },
];

/* =========================================================
   NORMALIZE TRANSFER REASON
========================================================= */

function normalizeTransferReason(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Other";
  }

  const text = String(value).trim();

  if (!text) {
    return "Other";
  }

  const matchedOption =
    TRANSFER_REASON_OPTIONS.find(
      (option) =>
        option.value.toLowerCase() ===
        text.toLowerCase()
    );

  return matchedOption?.value || text;
}

/* =========================================================
   FORM
========================================================= */

export default function TransferForm({
  formId = "transfer-form",
  initialData = {},
  onSubmit,
  loading,
}) {
  const employeeOptions =
    useEmployeeOptions();

  const departmentOptions =
    useDepartmentOptions();

  const [employeeDetails, setEmployeeDetails] =
    useState(null);

  const [loadingEmployee, setLoadingEmployee] =
    useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState(
      initialData?.employee_id
        ? String(initialData.employee_id)
        : ""
    );

  /* =======================================================
     NORMALIZE INITIAL DATA
  ======================================================= */

  const normalizedInitialData = useMemo(() => {
    const reason =
      initialData?.transfer_reason ??
      initialData?.reason ??
      "";

    return {
      employee_id:
        initialData?.employee_id
          ? String(initialData.employee_id)
          : "",

      from_department_id:
        initialData?.from_department_id
          ? String(initialData.from_department_id)
          : "",

      to_department_id:
        initialData?.to_department_id
          ? String(initialData.to_department_id)
          : "",

      transfer_reason:
        normalizeTransferReason(reason),

      effective_date:
        initialData?.effective_date || "",

      location:
        initialData?.location || "",

      accomplishments:
        initialData?.accomplishments || "",

      remarks:
        initialData?.remarks || "",
    };
  }, [initialData]);

  /* =======================================================
     KEEP EMPLOYEE STATE IN SYNC WHILE EDITING
  ======================================================= */

  useEffect(() => {
    setSelectedEmployeeId(
      initialData?.employee_id
        ? String(initialData.employee_id)
        : ""
    );
  }, [initialData?.employee_id]);

  /* =======================================================
     FETCH EMPLOYEE DETAILS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchEmployee = async () => {
      if (!selectedEmployeeId) {
        setEmployeeDetails(null);
        return;
      }

      setLoadingEmployee(true);

      try {
        const response =
          await employeesApi.get(
            selectedEmployeeId
          );

        if (!cancelled) {
          setEmployeeDetails(
            response?.data?.data ||
              response?.data ||
              null
          );
        }
      } catch (error) {
        if (!cancelled) {
          setEmployeeDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingEmployee(false);
        }
      }
    };

    fetchEmployee();

    return () => {
      cancelled = true;
    };
  }, [selectedEmployeeId]);

  /* =======================================================
     CURRENT DEPARTMENT
  ======================================================= */

  const currentDepartmentId =
    employeeDetails?.department?.id ||
    employeeDetails?.department_id ||
    normalizedInitialData.from_department_id ||
    "";

  /* =======================================================
     HANDLE EMPLOYEE CHANGE
  ======================================================= */

  const handleEmployeeChange = (value) => {
    setSelectedEmployeeId(
      value ? String(value) : ""
    );
  };

  /* =======================================================
     FORM FIELDS
  ======================================================= */

  const fields = [
    {
      name: "employee_id",
      label: "Employee",
      type: "select",
      options: employeeOptions,
      required: true,
      onChange: handleEmployeeChange,
    },

    {
      name: "from_department_id",
      label: "Current Department",
      type: "select",
      options: departmentOptions,
      required: true,

      disabled: !!currentDepartmentId,

      helperText: loadingEmployee
        ? "Loading employee department..."
        : "Current department is based on the employee's current assignment.",
    },

    {
      name: "to_department_id",
      label: "Transfer Department",
      type: "select",
      options: departmentOptions,
      required: true,

      helperText:
        "Select the department to which the employee is being transferred.",
    },

    {
      name: "transfer_reason",
      label: "Transfer Reason",
      type: "select",
      options: TRANSFER_REASON_OPTIONS,
      required: true,
    },

    {
      name: "effective_date",
      label: "Effective Date",
      type: "date",
      required: true,
    },

    {
      name: "location",
      label: "Location",
      type: "text",
      placeholder: "Enter transfer location",
    },

    {
      name: "accomplishments",
      label: "Overall Records / Accomplishments",
      type: "textarea",
      placeholder:
        "Enter overall records or accomplishments...",
      helperText:
        "Add the employee's overall records, achievements, or accomplishments related to the transfer.",
    },

    {
      name: "remarks",
      label: "Remarks",
      type: "textarea",
    },
  ];

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (payload) => {
    const finalPayload = {
      ...payload,

      employee_id:
        payload.employee_id
          ? Number(payload.employee_id)
          : payload.employee_id,

      from_department_id:
        payload.from_department_id
          ? Number(
              payload.from_department_id
            )
          : payload.from_department_id,

      to_department_id:
        payload.to_department_id
          ? Number(
              payload.to_department_id
            )
          : payload.to_department_id,

      transfer_reason:
        normalizeTransferReason(
          payload.transfer_reason ??
            payload.reason
        ),

      effective_date:
        payload.effective_date || "",

      location:
        payload.location || "",

      accomplishments:
        payload.accomplishments || "",

      remarks:
        payload.remarks || "",
    };

    /*
     * Do not send the legacy reason field.
     */
    delete finalPayload.reason;

    await onSubmit(finalPayload);
  };

  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={{
        ...normalizedInitialData,

        employee_id:
          normalizedInitialData.employee_id,

        from_department_id:
          currentDepartmentId
            ? String(currentDepartmentId)
            : normalizedInitialData.from_department_id,

        to_department_id:
          normalizedInitialData.to_department_id,

        transfer_reason:
          normalizedInitialData.transfer_reason,

        effective_date:
          normalizedInitialData.effective_date,

        location:
          normalizedInitialData.location,

        accomplishments:
          normalizedInitialData.accomplishments,

        remarks:
          normalizedInitialData.remarks,
      }}
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
}