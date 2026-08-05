import { useState } from "react";
import Input from "@/components/ui/Input";

export default function RoleForm({ initialData = {}, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: initialData.name || "",
    actions: initialData.actions || "",
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form id="role-form" onSubmit={handleSubmit}>
      <Input label="Role Name" name="name" value={form.name} onChange={handleChange} required />
      <Input label="Actions" name="actions" value={form.actions} onChange={handleChange} placeholder="Comma-separated actions" />
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>
    </form>
  );
}
