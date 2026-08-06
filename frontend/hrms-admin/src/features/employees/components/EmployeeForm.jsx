import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import { masterApi } from "@/api/master.api";
import { toDateInputValue } from "@/utils/formatDate";
import { validateEmployee } from "../employeeValidation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const todayInputValue = toDateInputValue(new Date());

export default function EmployeeForm({ initialData = {}, onSubmit, loading }) {
  const currentUser = useCurrentUser();
  const isEmployee = currentUser?.role === "employee";

  const { data: departments } = useQuery({
    queryKey: ["departments", { page: 1, per_page: 100 }],
    queryFn: async () => (await masterApi.listDepartments({ page: 1, per_page: 100 })).data.data,
  });

  const { data: designations } = useQuery({
    queryKey: ["designations", { page: 1, per_page: 100 }],
    queryFn: async () => (await masterApi.listDesignations({ page: 1, per_page: 100 })).data.data,
  });

  const [form, setForm] = useState({
    email: initialData.user?.email || "",
    password: "",
    department_id: initialData.department_id || "",
    designation_id: initialData.designation_id || "",
    first_name: initialData.first_name || "",
    last_name: initialData.last_name || "",
    gender: initialData.gender || "",
    dob: toDateInputValue(initialData.dob),
    phone: initialData.phone || "",
    emergency_contact: initialData.emergency_contact || "",
    address: initialData.address || "",
    city: initialData.city || "",
    state: initialData.state || "",
    country: initialData.country || "",
    pincode: initialData.pincode || "",
    joining_date: toDateInputValue(initialData.joining_date),
    salary: initialData.salary || "",
    allowance: initialData.allowance || "",
    pf_number: initialData.pf_number || "",
    esi_number: initialData.esi_number || "",
    account_number: initialData.account_number || "",
    status: initialData.status !== undefined ? initialData.status : true,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const isEdit = !!initialData.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateEmployee(form, { isEdit });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Employees can only self-edit phone and emergency contact; the backend
    // rejects any other field on a non-admin update.
    if (isEmployee) {
      onSubmit({ phone: form.phone, emergency_contact: form.emergency_contact });
      return;
    }

    // On edit, an untouched password field stays blank — omit it so the
    // backend leaves the linked account's password unchanged.
    if (isEdit && !form.password) {
      const { password, ...rest } = form;
      onSubmit(rest);
    } else {
      onSubmit(form);
    }
  };

  const deptOptions = (departments?.items || []).map((d) => ({
    value: d.id,
    label: d.department_name,
  }));

  const desigOptions = (designations?.items || []).map((d) => ({
    value: d.id,
    label: d.designation_name,
  }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        {isEdit && (
          <Input label="Employee Code" name="employee_code" value={initialData.employee_code || ""} disabled readOnly />
        )}
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required disabled={isEmployee} />
        {!isEdit && (
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
        )}
        <Select label="Department" name="department_id" options={deptOptions} value={form.department_id} onChange={handleChange} error={errors.department_id} required disabled={isEmployee} />
        <Select label="Designation" name="designation_id" options={desigOptions} value={form.designation_id} onChange={handleChange} error={errors.designation_id} required disabled={isEmployee} />
        <Input label="First Name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} required disabled={isEmployee} />
        <Input label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} error={errors.last_name} disabled={isEmployee} />
        <Select
          label="Gender"
          name="gender"
          options={[
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]}
          value={form.gender}
          onChange={handleChange}
          error={errors.gender}
          disabled={isEmployee}
        />
        <DatePicker
          label="Date of Birth"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          error={errors.dob}
          max={todayInputValue}
          disabled={isEmployee}
        />
        <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} />
        <Input label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} error={errors.emergency_contact} />
        <Input label="Address" name="address" value={form.address} onChange={handleChange} error={errors.address} disabled={isEmployee} />
        <Input label="City" name="city" value={form.city} onChange={handleChange} error={errors.city} disabled={isEmployee} />
        <Input label="State" name="state" value={form.state} onChange={handleChange} error={errors.state} disabled={isEmployee} />
        <Input label="Country" name="country" value={form.country} onChange={handleChange} error={errors.country} disabled={isEmployee} />
        <Input label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode} disabled={isEmployee} />
        <DatePicker
          label="Joining Date"
          name="joining_date"
          value={form.joining_date}
          onChange={handleChange}
          error={errors.joining_date}
          max={todayInputValue}
          disabled={isEmployee}
        />
        <Input label="Salary" name="salary" type="number" step="0.01" min="0" value={form.salary} onChange={handleChange} error={errors.salary} disabled={isEmployee} />
        <Input label="Allowance" name="allowance" type="number" step="0.01" min="0" value={form.allowance} onChange={handleChange} error={errors.allowance} disabled={isEmployee} />
        <Input label="PF Number" name="pf_number" value={form.pf_number} onChange={handleChange} error={errors.pf_number} disabled={isEmployee} />
        <Input label="ESI Number" name="esi_number" value={form.esi_number} onChange={handleChange} error={errors.esi_number} disabled={isEmployee} />
        <Input label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} error={errors.account_number} disabled={isEmployee} />
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="status" checked={form.status} onChange={handleChange} className="h-4 w-4" disabled={isEmployee} />
          Active
        </label>
      </div>
      <Button type="submit" isLoading={loading} className="w-full">
        {initialData.id ? "Update Employee" : "Create Employee"}
      </Button>
    </form>
  );
}
