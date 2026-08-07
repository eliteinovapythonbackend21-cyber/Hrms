import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ROLE_OPTIONS } from "@/constants/roles";
import { validateUser } from "../userValidation";
import { useDepartmentOptions, useDesignationOptions } from "@/hooks/useLookupOptions";

export default function UserForm({ initialData = {}, onSubmit, loading, isAdmin = false }) {
  const [form, setForm] = useState({
    username: initialData.username || "",
    email: initialData.email || "",
    mobile: initialData.mobile || "",
    password: "",
    role: initialData.role || "employee",
    is_active: initialData.is_active !== undefined ? initialData.is_active : true,
    first_name: "",
    last_name: "",
    department_id: "",
    designation_id: "",
  });
  const [errors, setErrors] = useState({});

  const departmentOptions = useDepartmentOptions();
  const designationOptions = useDesignationOptions();

  const isNewEmployee = !initialData.id && isAdmin && form.role === "employee";

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
    // Employee-master fields (department_id/etc.) are only meaningful on
    // create + when role is "employee" — the backend creates the linked
    // Employee row itself (auto-generating the employee code) whenever
    // first_name/department_id/designation_id are present.
    const { role, first_name, last_name, department_id, designation_id, ...rest } = form;
    if (!isAdmin) {
      onSubmit(rest);
    } else if (isNewEmployee) {
      onSubmit({ ...form });
    } else {
      onSubmit({ username: form.username, email: form.email, mobile: form.mobile, password: form.password, role: form.role, is_active: form.is_active });
    }
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

      {isNewEmployee && (
        <div className="mb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Employee record (this account will also appear in the Employees master)
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Employee code is generated automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Input
              label="First Name"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              error={errors.first_name}
              required
            />
            <Input
              label="Last Name"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              error={errors.last_name}
            />
            <Select
              label="Department"
              name="department_id"
              options={departmentOptions}
              value={form.department_id}
              onChange={handleChange}
              error={errors.department_id}
              required
            />
            <Select
              label="Designation"
              name="designation_id"
              options={designationOptions}
              value={form.designation_id}
              onChange={handleChange}
              error={errors.designation_id}
              required
            />
          </div>
        </div>
      )}

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
