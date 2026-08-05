import { useState } from "react";
import Input from "@/components/ui/Input";
import { isRequired } from "@/utils/validators";

const validateDepartment = (data) => {
  const errors = {};
  if (!isRequired(data.department_code)) errors.department_code = "Department code is required";
  if (!isRequired(data.department_name)) errors.department_name = "Department name is required";
  return errors;
};

export default function DepartmentForm({ initialData = {}, onSubmit, loading }) {
  const [form, setForm] = useState({
    department_code: initialData.department_code || "",
    department_name: initialData.department_name || "",
    description: initialData.description || "",
    status: initialData.status !== undefined ? initialData.status : true,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateDepartment(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(form);
  };

  return (
    <form id="department-form" onSubmit={handleSubmit}>
      <Input label="Department Code" name="department_code" value={form.department_code} onChange={handleChange} error={errors.department_code} required />
      <Input label="Department Name" name="department_name" value={form.department_name} onChange={handleChange} error={errors.department_name} required />
      <Input label="Description" name="description" value={form.description} onChange={handleChange} />
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="status" checked={form.status} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>
    </form>
  );
}
