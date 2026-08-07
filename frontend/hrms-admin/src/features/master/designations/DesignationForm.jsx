import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { masterApi } from "@/api/master.api";
import { isRequired } from "@/utils/validators";

const validateDesignation = (data) => {
  const errors = {};
  if (!isRequired(data.designation_name)) errors.designation_name = "Designation name is required";
  if (!isRequired(data.department_id)) errors.department_id = "Department is required";
  return errors;
};

export default function DesignationForm({ initialData = {}, onSubmit, loading }) {
  const { data: departments } = useQuery({
    queryKey: ["departments", { page: 1, per_page: 100 }],
    queryFn: async () => (await masterApi.listDepartments({ page: 1, per_page: 100 })).data.data,
  });

  const [form, setForm] = useState({
    designation_name: initialData.designation_name || "",
    department_id: initialData.department_id || "",
    description: initialData.description || "",
    status: initialData.status !== undefined ? initialData.status : true,
    is_admin_designation: initialData.is_admin_designation !== undefined ? initialData.is_admin_designation : false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateDesignation(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(form);
  };

  const deptOptions = (departments?.items || []).map((d) => ({
    value: d.id,
    label: d.department_name,
  }));

  return (
    <form id="designation-form" onSubmit={handleSubmit}>
      {initialData.designation_code && (
        <Input label="Designation Code" name="designation_code" value={initialData.designation_code} disabled />
      )}
      <Input label="Designation Name" name="designation_name" value={form.designation_name} onChange={handleChange} error={errors.designation_name} required />
      <Select label="Department" name="department_id" options={deptOptions} value={form.department_id} onChange={handleChange} error={errors.department_id} required />
      <Input label="Description" name="description" value={form.description} onChange={handleChange} />
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="is_admin_designation" checked={form.is_admin_designation} onChange={handleChange} className="h-4 w-4" />
          Admin designation
        </label>
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="status" checked={form.status} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>
    </form>
  );
}
