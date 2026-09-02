import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { isRequired } from "@/utils/validators";
import { useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

const validateLeaveType = (data) => {
  const errors = {};
  if (!isRequired(data.name)) errors.name = "Leave type name is required";
  return errors;
};

export default function LeaveTypeForm({ initialData = {}, onSubmit, loading, onCancel }) {
  const [form, setForm] = useState({
    name: initialData.name || "",
    category: initialData.category || "Leave",
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
  });
  const [errors, setErrors] = useState({});
  const submitMagnet = useMagnetic(0.2);

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

  const isEdit = !!initialData.id;

  return (
    <form id="LeaveType-form" onSubmit={handleSubmit} className="u-rise">
      <Motion3DStyles />
      <Input label="Leave Type Name" name="name" value={form.name} onChange={handleChange} error={errors.name} required />
      <Select
        label="Category"
        name="category"
        value={form.category}
        onChange={handleChange}
        placeholder="Leave"
        options={[
          { value: "Leave", label: "Leave" },
          { value: "Permission", label: "Permission" },
        ]}
      />
      <p className="-mt-3 mb-4 text-xs text-slate-400 dark:text-slate-500">
        Leave = multi-day absence · Permission = short in-day absence
      </p>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          Cancel
        </Button>
        <div ref={submitMagnet.ref} {...submitMagnet.handlers} className="inline-block will-change-transform">
          <Button type="submit" isLoading={loading} className="shadow-sm transition-shadow duration-200 hover:shadow-lg">
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
