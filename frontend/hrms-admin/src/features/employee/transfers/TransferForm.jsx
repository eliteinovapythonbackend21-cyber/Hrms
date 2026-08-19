import { useEffect, useMemo, useState } from "react";

import GenericForm from "@/components/form/GenericForm";

import {
  useEmployeeOptions,
  useDepartmentOptions,
} from "@/hooks/useLookupOptions";

import { employeesApi } from "@/api/employees.api";

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

function normalizeTransferReason(value) {
  if (value === null || value === undefined) {
    return "Other";
  }

  const text = String(value).trim();

  if (!text) {
    return "Other";
  }

  const matchedOption = TRANSFER_REASON_OPTIONS.find(
    (option) => option.value.toLowerCase() === text.toLowerCase()
  );

  return matchedOption?.value || text;
}

function getEmployeeDepartmentId(employee) {
  return (
    employee?.department?.id ||
    employee?.department_id ||
    employee?.current_department?.id ||
    employee?.current_department_id ||
    ""
  );
}

export default function TransferForm({
  formId = "transfer-form",
  initialData = {},
  onSubmit,
  loading = false,
}) {
  const employeeOptions = useEmployeeOptions();
  const departmentOptions = useDepartmentOptions();

  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    initialData?.employee_id ? String(initialData.employee_id) : ""
  );

  const normalizedInitialData = useMemo(() => {
    const employeeId = initialData?.employee_id;
    const fromDepartmentId = initialData?.from_department_id;
    const toDepartmentId = initialData?.to_department_id;

    return {
      employee_id: employeeId ? String(employeeId) : "",

      from_department_id: fromDepartmentId
        ? String(fromDepartmentId)
        : "",

      to_department_id: toDepartmentId
        ? String(toDepartmentId)
        : "",

      transfer_reason: normalizeTransferReason(
        initialData?.transfer_reason
      ),

      effective_date: initialData?.effective_date || "",

      remarks: initialData?.remarks || "",
    };
  }, [initialData]);

  useEffect(() => {
    setSelectedEmployeeId(
      initialData?.employee_id
        ? String(initialData.employee_id)
        : ""
    );
  }, [initialData?.employee_id]);

  useEffect(() => {
    let cancelled = false;

    const fetchEmployee = async () => {
      if (!selectedEmployeeId) {
        setEmployeeDetails(null);
        setLoadingEmployee(false);
        return;
      }

      setLoadingEmployee(true);

      try {
        const response = await employeesApi.get(selectedEmployeeId);

        if (cancelled) return;

        const employee =
          response?.data?.data ||
          response?.data ||
          null;

        setEmployeeDetails(employee);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Failed to load employee details:",
            error
          );

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

  /*
   * Existing Department should always come from the
   * employee's current department.
   *
   * During edit, fall back to the saved from_department_id
   * until employee details are loaded.
   */
  const existingDepartmentId =
    getEmployeeDepartmentId(employeeDetails) ||
    normalizedInitialData.from_department_id ||
    "";

  const handleEmployeeChange = (value) => {
    setSelectedEmployeeId(value ? String(value) : "");
  };

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
      label: "Existing Department",
      type: "select",
      options: departmentOptions,
      required: true,
      disabled: true,
      helperText: loadingEmployee
        ? "Loading employee department..."
        : existingDepartmentId
          ? "Automatically populated from the employee's current department."
          : "Select an employee to load the existing department.",
    },

    {
      name: "to_department_id",
      label: "Current Department",
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
      name: "remarks",
      label: "Remarks",
      type: "textarea",
    },
  ];

  const handleSubmit = async (payload) => {
    const finalPayload = {
      ...payload,

      employee_id: payload.employee_id
        ? Number(payload.employee_id)
        : payload.employee_id,

      from_department_id: existingDepartmentId
        ? Number(existingDepartmentId)
        : payload.from_department_id
          ? Number(payload.from_department_id)
          : payload.from_department_id,

      to_department_id: payload.to_department_id
        ? Number(payload.to_department_id)
        : payload.to_department_id,

      transfer_reason: normalizeTransferReason(
        payload.transfer_reason
      ),

      effective_date: payload.effective_date || "",

      remarks: payload.remarks || "",
    };

    await onSubmit(finalPayload);
  };

  const formInitialData = useMemo(
    () => ({
      ...normalizedInitialData,

      employee_id: normalizedInitialData.employee_id,

      from_department_id: existingDepartmentId
        ? String(existingDepartmentId)
        : normalizedInitialData.from_department_id,

      to_department_id: normalizedInitialData.to_department_id,

      transfer_reason: normalizedInitialData.transfer_reason,

      effective_date: normalizedInitialData.effective_date,

      remarks: normalizedInitialData.remarks,
    }),
    [normalizedInitialData, existingDepartmentId]
  );

  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={formInitialData}
      onSubmit={handleSubmit}
      loading={loading}
    />
  );
}