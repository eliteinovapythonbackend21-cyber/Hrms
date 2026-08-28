import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";
import { employeesApi } from "@/api/employees.api";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

function getEmployeeName(employee) {
  if (!employee) return "—";

  return (
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
    employee.employee_code ||
    `Employee #${employee.id}`
  );
}

function OrganizationItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>

      <p
        className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200"
        title={value || ""}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export default function ResignationForm({
  formId = "resignations-form",
  initialData = {},
  onSubmit,
  loading,
  isEdit,
}) {
  const employeeOptions = useEmployeeOptions();

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["resignation-form", "employees"],
    queryFn: async () =>
      (
        await employeesApi.list({
          page: 1,
          per_page: 1000,
          is_active: true,
        })
      ).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const employees = employeesData?.items || [];

  const selectedEmployeeId = initialData?.employee_id
    ? String(initialData.employee_id)
    : "";

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId) return null;

    return employees.find(
      (employee) => String(employee.id) === selectedEmployeeId
    );
  }, [employees, selectedEmployeeId]);

  /*
   * Organization information is taken from the employee record.
   *
   * This information is also sent to the backend as a snapshot so that
   * future changes to the employee's organization do not change the
   * historical resignation record.
   */
  const organization = useMemo(() => {
    if (!selectedEmployee) {
      return {
        company: null,
        branch: null,
        department: null,
        designation: null,
      };
    }

    return {
      company: selectedEmployee.department?.company || null,
      branch: selectedEmployee.department?.branch || null,
      department: selectedEmployee.department || null,
      designation: selectedEmployee.designation || null,
    };
  }, [selectedEmployee]);

  const fields = [
    {
      name: "employee_id",
      label: "Employee",
      type: "select",
      options: employeeOptions,
      required: true,
    },

    {
      name: "notice_date",
      label: "Notice Date",
      type: "date",
      required: true,
    },

    {
      name: "last_working_date",
      label: "Last Working Date",
      type: "date",
      required: true,
    },

    {
      name: "reason",
      label: "Resignation Reason",
      type: "select",
      required: true,
      options: [
        {
          value: "Better Career Opportunity",
          label: "Better Career Opportunity",
        },
        {
          value: "Higher Salary / Compensation",
          label: "Higher Salary / Compensation",
        },
        {
          value: "Career Growth",
          label: "Career Growth",
        },
        {
          value: "Personal Reasons",
          label: "Personal Reasons",
        },
        {
          value: "Higher Education",
          label: "Higher Education",
        },
        {
          value: "Relocation",
          label: "Relocation",
        },
        {
          value: "Family Reasons",
          label: "Family Reasons",
        },
        {
          value: "Health / Well-being",
          label: "Health / Well-being",
        },
        {
          value: "Work-Life Balance",
          label: "Work-Life Balance",
        },
        {
          value: "Job Role / Responsibilities",
          label: "Job Role / Responsibilities",
        },
        {
          value: "Change of Career",
          label: "Change of Career",
        },
        {
          value: "Starting Own Business",
          label: "Starting Own Business",
        },
        {
          value: "Overseas Opportunity",
          label: "Overseas Opportunity",
        },
        {
          value: "Further Studies",
          label: "Further Studies",
        },
        {
          value: "Marriage",
          label: "Marriage",
        },
        {
          value: "Retirement",
          label: "Retirement",
        },
        {
          value: "Dissatisfaction with Compensation",
          label: "Dissatisfaction with Compensation",
        },
        {
          value: "Dissatisfaction with Role",
          label: "Dissatisfaction with Role",
        },
        {
          value: "Work Environment",
          label: "Work Environment",
        },
        {
          value: "Management / Leadership",
          label: "Management / Leadership",
        },
        {
          value: "Commute / Location",
          label: "Commute / Location",
        },
        {
          value: "Contract / Temporary Employment End",
          label: "Contract / Temporary Employment End",
        },
        {
          value: "Other",
          label: "Other",
        },
      ],
    },

    {
      name: "description",
      label: "Resignation Description",
      type: "textarea",
      placeholder:
        "Add any further detail behind the resignation reason - context, circumstances, or notes for HR records...",
    },

    {
      name: "accomplishments",
      label: "Overall Records / Accomplishments",
      type: "textarea",
      placeholder:
        "Enter the employee's overall achievements, accomplishments, awards, contributions, projects, or records...",
    },

    ...(isEdit
      ? [
          {
            name: "status",
            label: "Status",
            type: "select",
            options: STATUS_OPTIONS,
          },
        ]
      : []),
  ];

  const handleSubmit = (payload) => {
    const employeeId = payload.employee_id;

    const employee =
      employees.find(
        (item) => String(item.id) === String(employeeId)
      ) || selectedEmployee;

    const companyId = employee?.department?.company?.id || null;
    const branchId = employee?.department?.branch?.id || null;
    const departmentId = employee?.department?.id || null;
    const designationId = employee?.designation?.id || null;

    const finalPayload = {
      ...payload,

      previous_company_id: companyId,
      previous_branch_id: branchId,
      previous_department_id: departmentId,
      previous_designation_id: designationId,

      ...(isEdit
        ? {}
        : {
            status: "Pending",
          }),
    };

    onSubmit(finalPayload);
  };

  return (
    <div className="space-y-4">
      {/* Previous Organization Preview */}
      {selectedEmployee && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                Previous Organization
              </h3>

              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Organization information captured for this resignation record
              </p>
            </div>

            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
              Historical Record
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OrganizationItem
              label="Company"
              value={organization.company?.name}
            />

            <OrganizationItem
              label="Branch"
              value={organization.branch?.name}
            />

            <OrganizationItem
              label="Department"
              value={
                organization.department?.department_name ||
                organization.department?.name
              }
            />

            <OrganizationItem
              label="Designation"
              value={
                organization.designation?.designation_name ||
                organization.designation?.name
              }
            />
          </div>
        </div>
      )}

      {!selectedEmployee && !employeesLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-400">
          Select an employee to view the previous organization details.
        </div>
      )}

      <GenericForm
        formId={formId}
        fields={fields}
        initialData={initialData}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}