import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { ROLE_OPTIONS } from "@/constants/roles";
import { validateUser } from "../userValidation";

import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";
import { masterApi } from "@/api/master.api";
import { useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

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
  const submitMagnet = useMagnetic(0.2);

  /* =========================================================
     COMPANY / BRANCH FILTERS

     These are UI-only cascading filters, not submitted to the
     backend directly - create_user() only reads department_id /
     designation_id off the Employee record (company/branch are
     derived from Department on the backend, same as every other
     module in this app). They exist purely to narrow the
     Department dropdown down from "every department in the
     company" to something findable.

     Also intentionally NOT using the useDepartmentOptions() /
     useDesignationOptions() lookup hooks here - switched to the
     same directly-queried masterApi.listDepartments /
     listDesignations pattern already proven to work on
     DesignationListPage / PerformanceReviewListPage /
     EmployeeListPage, since those flat unfiltered hooks were the
     more likely place for the "Add User isn't saving properly"
     symptom to actually originate (empty options silently
     blocking the required-field validation before the request
     is ever sent).
  ========================================================= */

  const [companyFilterId, setCompanyFilterId] = useState("");
  const [branchFilterId, setBranchFilterId] = useState("");

  const { data: companyData } = useCompanies({
    page: 1,
    per_page: 100,
    is_active: true,
  });

  const { data: branchData } = useCompanyBranches(
    companyFilterId,
    {
      page: 1,
      per_page: 100,
      is_active: true,
    }
  );

  const { data: departmentData } = useQuery({
    queryKey: [
      "user-form",
      "departments-filter",
      branchFilterId,
    ],

    queryFn: async () =>
      (
        await masterApi.listDepartments({
          branch_id: branchFilterId,
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,

    enabled: !!branchFilterId,
  });

  const { data: designationData } = useQuery({
    queryKey: [
      "user-form",
      "designations-filter",
      form.department_id,
    ],

    queryFn: async () =>
      (
        await masterApi.listDesignations({
          department_id: form.department_id,
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,

    enabled: !!form.department_id,
  });

  const companies = companyData?.items || companyData?.data || [];
  const branches = branchData?.items || branchData?.data || [];
  const departments = departmentData?.items || [];
  const designations = designationData?.items || [];

  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  const branchOptions = branches.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }));

  const departmentOptions = departments.map((department) => ({
    value: department.id,
    label: department.department_name,
  }));

  const designationOptions = designations.map((designation) => ({
    value: designation.id,
    label: designation.designation_name,
  }));

  const isNewEmployee = !initialData.id && isAdmin && form.role === "employee";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCompanyChange = (e) => {
    setCompanyFilterId(e.target.value);
    setBranchFilterId("");
    setForm((current) => ({
      ...current,
      department_id: "",
      designation_id: "",
    }));
  };

  const handleBranchChange = (e) => {
    setBranchFilterId(e.target.value);
    setForm((current) => ({
      ...current,
      department_id: "",
      designation_id: "",
    }));
  };

  const handleDepartmentChange = (e) => {
    setForm((current) => ({
      ...current,
      department_id: e.target.value,
      designation_id: "",
    }));
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
      // department_id / designation_id come from <select> elements, whose
      // values are always strings - coerce to Number so the backend's
      // Employee(department_id=..., designation_id=...) receives real
      // integers rather than "5"/"12" strings.
      onSubmit({
        ...form,
        department_id: form.department_id
          ? Number(form.department_id)
          : null,
        designation_id: form.designation_id
          ? Number(form.designation_id)
          : null,
      });
    } else {
      onSubmit({ username: form.username, email: form.email, mobile: form.mobile, password: form.password, role: form.role, is_active: form.is_active });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Motion3DStyles />
      <div className="u-rise grid grid-cols-1 sm:grid-cols-2 gap-x-4">
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
        <div className="u-rise mb-4 border-t border-slate-200 dark:border-white/10 pt-4">
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
              label="Company"
              name="company_filter"
              options={companyOptions}
              value={companyFilterId}
              onChange={handleCompanyChange}
              placeholder="Select company"
            />

            <Select
              label="Branch"
              name="branch_filter"
              options={branchOptions}
              value={branchFilterId}
              onChange={handleBranchChange}
              disabled={!companyFilterId}
              placeholder={
                companyFilterId
                  ? "Select branch"
                  : "Select a company first"
              }
            />

            <Select
              label="Department"
              name="department_id"
              options={departmentOptions}
              value={form.department_id}
              onChange={handleDepartmentChange}
              error={errors.department_id}
              disabled={!branchFilterId}
              placeholder={
                branchFilterId
                  ? "Select department"
                  : "Select a branch first"
              }
              required
            />
            <Select
              label="Designation"
              name="designation_id"
              options={designationOptions}
              value={form.designation_id}
              onChange={handleChange}
              error={errors.designation_id}
              disabled={!form.department_id}
              placeholder={
                form.department_id
                  ? "Select designation"
                  : "Select a department first"
              }
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
      <div ref={submitMagnet.ref} {...submitMagnet.handlers} className="w-full will-change-transform">
        <Button type="submit" isLoading={loading} className="w-full shadow-sm transition-shadow duration-200 hover:shadow-lg">
          {initialData.id ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
}