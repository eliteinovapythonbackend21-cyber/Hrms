import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { masterApi } from "@/api/master.api";
import { isRequired } from "@/utils/validators";
import { useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

const validateDepartment = (data) => {
  const errors = {};

  if (!isRequired(data.company_id)) {
    errors.company_id = "Company is required";
  }

  if (!isRequired(data.branch_id)) {
    errors.branch_id = "Branch is required";
  }

  if (!isRequired(data.department_name)) {
    errors.department_name = "Department name is required";
  }

  return errors;
};

export default function DepartmentForm({
  initialData = {},
  onSubmit,
  loading,
  onCancel,
  isEdit,
}) {
  const [form, setForm] = useState({
    company_id: initialData.company_id || initialData.company?.id || "",
    branch_id: initialData.branch_id || initialData.branch?.id || "",
    department_name: initialData.department_name || "",
    description: initialData.description || "",
    status: initialData.status !== undefined ? initialData.status : true,
  });
  const [errors, setErrors] = useState({});

  const submitMagnet = useMagnetic(0.22);

  const { data: companies } = useQuery({
    queryKey: ["companies-dropdown"],
    queryFn: async () =>
      (
        await masterApi.listCompanies({
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
  });
 
  const { data: branches } = useQuery({
    queryKey: ["company-branches-dropdown", form.company_id],
    queryFn: async () =>
      (
        await masterApi.listCompanyBranches(form.company_id, {
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
    enabled: !!form.company_id,
  });

  const companyOptions = (companies?.items || [])
    .filter((c) => c.status)
    .map((c) => ({ value: c.id, label: c.name }));

  const branchOptions = (branches?.items || [])
    .filter((b) => b.status)
    .map((b) => ({ value: b.id, label: b.name }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Company changing invalidates whatever branch was picked, since
  // branches are scoped to a single company.
  const handleCompanyChange = (e) => {
    const { value } = e.target;

    setForm((prev) => ({
      ...prev,
      company_id: value,
      branch_id: "",
    }));

    setErrors((prev) => ({ ...prev, company_id: "", branch_id: "" }));
  };

  // If initialData arrives/changes after mount (e.g. opening Edit),
  // make sure the branch dropdown has the right company scoped in.
  useEffect(() => {
    if (initialData && (initialData.company_id || initialData.company?.id)) {
      setForm((prev) => ({
        ...prev,
        company_id: initialData.company_id || initialData.company?.id || "",
        branch_id: initialData.branch_id || initialData.branch?.id || "",
      }));
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateDepartment(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    onSubmit(form);
  };

  return (
    <form id="department-form" onSubmit={handleSubmit}>
      <Motion3DStyles />

      <div className="u-rise mb-4 flex items-center gap-3">
        <div className="u-hover-float">
          <div className="u-float-target flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm shadow-primary-600/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M9 15h2M15 7h2M15 11h2M15 15h2" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Department Information
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter the department details.
          </p>
        </div>
      </div>

      <div className="u-rise" style={{ animationDelay: "60ms" }}>
        {initialData.department_code && (
          <Input
            label="Department Code"
            name="department_code"
            value={initialData.department_code}
            disabled
          />
        )}

        <Select
          label="Company"
          name="company_id"
          options={companyOptions}
          value={form.company_id}
          onChange={handleCompanyChange}
          error={errors.company_id}
          required
        />

        <Select
          label="Branch"
          name="branch_id"
          options={branchOptions}
          value={form.branch_id}
          onChange={handleChange}
          error={errors.branch_id}
          required
          disabled={!form.company_id}
          placeholder={
            form.company_id ? "Select..." : "Select a company first"
          }
        />

        <Input
          label="Department Name"
          name="department_name"
          value={form.department_name}
          onChange={handleChange}
          error={errors.department_name}
          required
        />

        <Input
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
        />

        <div className="mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              name="status"
              checked={form.status}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Active
          </label>
        </div>
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
        <div
          ref={submitMagnet.ref}
          {...submitMagnet.handlers}
          className="inline-block will-change-transform"
        >
          <Button
            type="submit"
            isLoading={loading}
            className="shadow-sm transition-shadow duration-200 hover:shadow-lg"
          >
            {isEdit ? "Update Department" : "Create Department"}
          </Button>
        </div>
      </div>
    </form>
  );
}