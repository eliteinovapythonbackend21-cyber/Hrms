import { useState } from "react";
import Input from "@/components/ui/Input";
import { isRequired } from "@/utils/validators";

const validateLeaveType = (data) => {
  const errors = {};
  if (!isRequired(data.name)) errors.name = "Leave type name is required";
  return errors;
};

export default function LeaveTypeForm({ initialData = {}, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: initialData.name || "",
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateLeaveType(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    onSubmit(form);
  };

  return (
    <form id="leavetype-form" onSubmit={handleSubmit}>
      <Input label="Leave Type Name" name="name" value={form.name} onChange={handleChange} error={errors.name} required />
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>
    </form>
  );
}
