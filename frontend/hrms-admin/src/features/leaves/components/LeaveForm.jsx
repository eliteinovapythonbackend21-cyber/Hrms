import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";

import { masterApi } from "@/api/master.api";
import { employeesApi } from "@/api/employees.api";

import { toDateInputValue } from "@/utils/formatDate";
import { validateLeave } from "../leaveValidation";

function calculateDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;

  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 0;
  }

  const difference = to.getTime() - from.getTime();

  if (difference < 0) return 0;

  return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
}

function SectionHeader({ number, title, description }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
        {number}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>

        {description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LeaveForm({
  initialData = {},
  onSubmit,
  loading,
  isAdmin,
}) {
  const { data: leaveTypes, isLoading: loadingLeaveTypes } = useQuery({
    queryKey: [
      "leave-types",
      { page: 1, per_page: 100, is_active: true },
    ],
    queryFn: async () =>
      (
        await masterApi.listLeaveTypes({
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
  });

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees", { page: 1, per_page: 100 }],
    queryFn: async () =>
      (
        await employeesApi.list({
          page: 1,
          per_page: 100,
        })
      ).data.data,
    enabled: isAdmin,
  });

  const [form, setForm] = useState({
    employee_id: initialData.employee_id || "",
    leave_type_id: initialData.leave_type_id || "",
    from_date: toDateInputValue(initialData.from_date),
    to_date: toDateInputValue(initialData.to_date),
    reason: initialData.reason || "",
    status: initialData.status || "Pending",
  });

  const [errors, setErrors] = useState({});

  const duration = useMemo(
    () => calculateDays(form.from_date, form.to_date),
    [form.from_date, form.to_date]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationErrors = validateLeave(form, {
      isAdmin,
    });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const { status, ...employeePayload } = form;

    onSubmit(isAdmin ? form : employeePayload);
  };

  const leaveTypeOptions = (leaveTypes?.items || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const employeeOptions = (employees?.items || []).map((employee) => ({
    value: employee.id,
    label: `${employee.employee_code || ""} - ${
      employee.first_name || ""
    } ${employee.last_name || ""}`.trim(),
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* EMPLOYEE */}
      {isAdmin && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-800/50">
          <SectionHeader
            number="01"
            title="Employee"
            description="Select the employee requesting leave."
          />

          <Select
            label="Employee"
            name="employee_id"
            options={employeeOptions}
            value={form.employee_id}
            onChange={handleChange}
            error={errors.employee_id}
            required
            disabled={loadingEmployees}
          />
        </section>
      )}

      {/* LEAVE DETAILS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <SectionHeader
          number={isAdmin ? "02" : "01"}
          title="Leave Details"
          description="Select the type and duration of the requested leave."
        />

        <div className="space-y-4">
          <Select
            label="Leave Type"
            name="leave_type_id"
            options={leaveTypeOptions}
            value={form.leave_type_id}
            onChange={handleChange}
            error={errors.leave_type_id}
            required
            disabled={loadingLeaveTypes}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker
              label="From Date"
              name="from_date"
              value={form.from_date}
              onChange={handleChange}
              error={errors.from_date}
              required
            />

            <DatePicker
              label="To Date"
              name="to_date"
              value={form.to_date}
              onChange={handleChange}
              error={errors.to_date}
              required
            />
          </div>

          <div className="rounded-xl border border-primary-100 bg-primary-50/70 p-4 dark:border-primary-900/40 dark:bg-primary-900/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                  Requested Duration
                </p>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Based on selected start and end dates
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                  {duration}
                </p>

                <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
                  {duration === 1 ? "Day" : "Days"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REASON */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <SectionHeader
          number={isAdmin ? "03" : "02"}
          title="Reason"
          description="Provide additional information about the leave request."
        />

        <Input
          label="Reason"
          name="reason"
          placeholder="Enter the reason for leave..."
          value={form.reason}
          onChange={handleChange}
        />
      </section>

      {/* ADMIN STATUS */}
      {isAdmin && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <SectionHeader
            number="04"
            title="Request Status"
            description="Administrators can directly set the request status."
          />

          <Select
            label="Status"
            name="status"
            options={[
              {
                value: "Pending",
                label: "Pending",
              },
              {
                value: "Approved",
                label: "Approved",
              },
              {
                value: "Rejected",
                label: "Rejected",
              },
            ]}
            value={form.status}
            onChange={handleChange}
          />
        </section>
      )}

      {/* ACTIONS */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end">
        <Button
          type="submit"
          isLoading={loading}
          className="w-full sm:w-auto"
        >
          {initialData.id ? "Update Leave" : "Submit Leave Request"}
        </Button>
      </div>
    </form>
  );
}