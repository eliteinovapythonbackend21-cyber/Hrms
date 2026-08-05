import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ROLE_OPTIONS } from "@/constants/roles";
import { validateUser } from "../userValidation";

export default function UserForm({ initialData = {}, onSubmit, loading, isAdmin = false }) {
  const [form, setForm] = useState({
    username: initialData.username || "",
    email: initialData.email || "",
    mobile: initialData.mobile || "",
    password: "",
    role: initialData.role || "employee",
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateUser(form, { isEdit: !!initialData.id });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Only admins are allowed to change role/role_id (backend rejects the
    // field entirely from non-admins), so non-admins never submit it.
    const { role, ...rest } = form;
    onSubmit(isAdmin ? form : rest);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Input
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          error={errors.username}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          required
        />
        <Input
          label="Mobile"
          name="mobile"
          value={form.mobile}
          onChange={handleChange}
          error={errors.mobile}
        />
        {!initialData.id && (
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
        {isAdmin && (
          <Select
            label="Role"
            name="role"
            options={ROLE_OPTIONS.map((r) => ({ value: r.name, label: r.label }))}
            value={form.role}
            onChange={handleChange}
          />
        )}
      </div>
      {isAdmin && (
        <div className="mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="h-4 w-4"
            />
            Active
          </label>
        </div>
      )}
      <Button type="submit" isLoading={loading} className="w-full">
        {initialData.id ? "Update User" : "Create User"}
      </Button>
    </form>
  );
}
