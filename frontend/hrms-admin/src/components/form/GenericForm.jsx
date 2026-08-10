import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { isRequired } from "@/utils/validators";

// Config-driven form shared by the create-only transactional features
// (employee lifecycle / CRM / finance). `fields`:
//   { name, label, type: "text"|"number"|"date"|"select"|"checkbox"|"textarea",
//     required, options, placeholder, defaultValue }
export default function GenericForm({ formId, fields, initialData = {}, onSubmit, loading, readOnlyBanner, onCancel, isEdit }) {
  const buildInitial = () => {
    const obj = {};
    fields.forEach((f) => {
      if (f.type === "checkbox") {
        obj[f.name] = initialData[f.name] !== undefined ? initialData[f.name] : f.defaultValue ?? true;
      } else {
        obj[f.name] = initialData[f.name] !== undefined && initialData[f.name] !== null ? initialData[f.name] : f.defaultValue ?? "";
      }
    });
    return obj;
  };

  const [form, setForm] = useState(buildInitial);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    const errs = {};
    fields.forEach((f) => {
      if (f.required && !isRequired(form[f.name])) {
        errs[f.name] = `${f.label} is required`;
      }
    });
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit(form);
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      {readOnlyBanner && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{readOnlyBanner}</p>
      )}
      {fields.map((f) => {
        if (f.type === "select") {
          return (
            <Select
              key={f.name}
              label={f.label}
              name={f.name}
              value={form[f.name]}
              onChange={handleChange}
              options={f.options || []}
              error={errors[f.name]}
              required={f.required}
              disabled={f.disabled}
            />
          );
        }
        if (f.type === "checkbox") {
          return (
            <div className="mb-4" key={f.name}>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  name={f.name}
                  checked={!!form[f.name]}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                {f.label}
              </label>
            </div>
          );
        }
        if (f.type === "textarea") {
          return (
            <div className="mb-4" key={f.name}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {f.label}
                {f.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                rows={3}
                className={`input ${errors[f.name] ? "border-red-500" : ""}`}
                placeholder={f.placeholder}
              />
              {errors[f.name] && <p className="mt-1 text-xs text-red-500">{errors[f.name]}</p>}
            </div>
          );
        }
        return (
          <Input
            key={f.name}
            label={f.label}
            name={f.name}
            type={f.type || "text"}
            value={form[f.name]}
            onChange={handleChange}
            error={errors[f.name]}
            required={f.required}
            placeholder={f.placeholder}
            disabled={f.disabled}
          />
        );
      })}
      <div className="flex justify-end gap-2 mt-6">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={loading}>
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
