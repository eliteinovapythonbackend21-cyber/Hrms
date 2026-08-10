import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { isRequired } from "@/utils/validators";
import { ROLE_CATEGORY_OPTIONS } from "@/constants/roles";

const validateRole = (data) => {
  const errors = {};
  if (!isRequired(data.name)) errors.name = "Role name is required";
  if (!isRequired(data.category)) errors.category = "Category is required";
  return errors;
};

// `lockedCategory` is set when this form is opened from inside a sub-master
// category page (e.g. "HR Roles") — the new role is created directly under
// that category, so the picker is replaced with a read-only display instead
// of asking the admin to choose again. From the top-level Roles screen
// (lockedCategory absent) the admin must pick which of the 4 master
// categories the new role belongs to.
export default function RoleForm({ initialData = {}, onSubmit, loading, lockedCategory = null }) {
  const [form, setForm] = useState({
    name: initialData.name || "",
    category: initialData.category || lockedCategory || "",
    actions: initialData.actions || "",
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateRole(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(form);
  };

  return (
    <form id="role-form" onSubmit={handleSubmit}>
      <Input label="Role Name" name="name" value={form.name} onChange={handleChange} error={errors.name} required />

      {lockedCategory ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
          <div className="input flex items-center bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {lockedCategory}
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            New roles added here are created under {lockedCategory}.
          </p>
        </div>
      ) : (
        <Select
          label="Category"
          name="category"
          value={form.category}
          onChange={handleChange}
          options={ROLE_CATEGORY_OPTIONS}
          error={errors.category}
          required
        />
      )}

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
