import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import { masterApi } from "@/api/master.api";
import { employeesApi } from "@/api/employees.api";
import { toDateInputValue } from "@/utils/formatDate";
import { validateLeave } from "../leaveValidation";

export default function LeaveForm({ initialData = {}, onSubmit, loading, isAdmin }) {
  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types", { page: 1, per_page: 100, is_active: true }],
    queryFn: async () => (await masterApi.listLeaveTypes({ page: 1, per_page: 100, is_active: true })).data.data,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees", { page: 1, per_page: 100 }],
    queryFn: async () => (await employeesApi.list({ page: 1, per_page: 100 })).data.data,
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateLeave(form, { isAdmin });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Backend rejects any update from a non-admin that includes a `status`
    // key at all, regardless of its value, so it must be omitted entirely
    // rather than just hidden in the UI.
    const { status, ...rest } = form;
    onSubmit(isAdmin ? form : rest);
  };

  const leaveTypeOptions = (leaveTypes?.items || []).map((lt) => ({
    value: lt.id,
    label: lt.name,
  }));

  const empOptions = (employees?.items || []).map((emp) => ({
    value: emp.id,
    label: `${emp.employee_code} - ${emp.first_name} ${emp.last_name}`.trim(),
  }));

  return (
    <form onSubmit={handleSubmit}>
      {isAdmin && (
        <Select
          label="Employee"
          name="employee_id"
          options={empOptions}
          value={form.employee_id}
          onChange={handleChange}
          error={errors.employee_id}
          required
        />
      )}
      <Select
        label="Leave Type"
        name="leave_type_id"
        options={leaveTypeOptions}
        value={form.leave_type_id}
        onChange={handleChange}
        error={errors.leave_type_id}
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <DatePicker label="From Date" name="from_date" value={form.from_date} onChange={handleChange} error={errors.from_date} required />
        <DatePicker label="To Date" name="to_date" value={form.to_date} onChange={handleChange} error={errors.to_date} required />
      </div>
      <Input
        label="Reason"
        name="reason"
        placeholder="Reason for leave"
        value={form.reason}
        onChange={handleChange}
      />
      {isAdmin && (
        <Select
          label="Status"
          name="status"
          options={[
            { value: "Pending", label: "Pending" },
            { value: "Approved", label: "Approved" },
            { value: "Rejected", label: "Rejected" },
          ]}
          value={form.status}
          onChange={handleChange}
        />
      )}
      <Button type="submit" isLoading={loading} className="w-full">
        {initialData.id ? "Update Leave" : "Submit Leave Request"}
      </Button>
    </form>
  );
}
