import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import { masterApi } from "@/api/master.api";
import { toDateInputValue } from "@/utils/formatDate";
import { validateEmployee } from "../employeeValidation";

export default function EmployeeForm({ initialData = {}, onSubmit, loading }) {
  const { data: departments } = useQuery({
    queryKey: ["departments", { page: 1, per_page: 100 }],
    queryFn: async () => (await masterApi.listDepartments({ page: 1, per_page: 100 })).data.data,
  });

  const { data: designations } = useQuery({
    queryKey: ["designations", { page: 1, per_page: 100 }],
    queryFn: async () => (await masterApi.listDesignations({ page: 1, per_page: 100 })).data.data,
  });

  const [form, setForm] = useState({
    employee_code: initialData.employee_code || "",
    user_id: initialData.user_id || "",
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
    status: initialData.status !== undefined ? initialData.status : true,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateEmployee(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(form);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Employee Code" name="employee_code" value={form.employee_code} onChange={handleChange} error={errors.employee_code} required />
        <Input label="User ID" name="user_id" type="number" value={form.user_id} onChange={handleChange} error={errors.user_id} />
        <Select label="Department" name="department_id" options={deptOptions} value={form.department_id} onChange={handleChange} error={errors.department_id} required />
        <Select label="Designation" name="designation_id" options={desigOptions} value={form.designation_id} onChange={handleChange} error={errors.designation_id} required />
        <Input label="First Name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} required />
        <Input label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} />
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
        />
        <DatePicker label="Date of Birth" name="dob" value={form.dob} onChange={handleChange} />
        <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        <Input label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} />
        <Input label="Address" name="address" value={form.address} onChange={handleChange} />
        <Input label="City" name="city" value={form.city} onChange={handleChange} />
        <Input label="State" name="state" value={form.state} onChange={handleChange} />
        <Input label="Country" name="country" value={form.country} onChange={handleChange} />
        <Input label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />
        <DatePicker label="Joining Date" name="joining_date" value={form.joining_date} onChange={handleChange} />
        <Input label="Salary" name="salary" type="number" step="0.01" value={form.salary} onChange={handleChange} error={errors.salary} />
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="status" checked={form.status} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>
      <Button type="submit" isLoading={loading} className="w-full">
        {initialData.id ? "Update Employee" : "Create Employee"}
      </Button>
    </form>
  );
}
