import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { masterApi } from "@/api/master.api";

export default function DesignationForm({ initialData = {}, onSubmit, loading }) {
  const { data: departments } = useQuery({
    queryKey: ["departments", { page: 1, per_page: 100 }],
    queryFn: async () => (await masterApi.listDepartments({ page: 1, per_page: 100 })).data.data,
  });

  const [form, setForm] = useState({
    designation_code: initialData.designation_code || "",
    designation_name: initialData.designation_name || "",
    department_id: initialData.department_id || "",
    description: initialData.description || "",
    status: initialData.status !== undefined ? initialData.status : true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const deptOptions = (departments?.items || []).map((d) => ({
    value: d.id,
    label: d.department_name,
  }));

  return (
    <form id="designation-form" onSubmit={handleSubmit}>
      <Input label="Designation Code" name="designation_code" value={form.designation_code} onChange={handleChange} required />
      <Input label="Designation Name" name="designation_name" value={form.designation_name} onChange={handleChange} required />
      <Select label="Department" name="department_id" options={deptOptions} value={form.department_id} onChange={handleChange} required />
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
