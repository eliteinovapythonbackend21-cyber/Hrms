import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { masterApi } from "@/api/master.api";
import { isRequired } from "@/utils/validators";


const validateDesignation = (data) => {
  const errors = {};
  if (!isRequired(data.company_id)) errors.company_id = "Company is required";
  if (!isRequired(data.branch_id)) errors.branch_id = "Branch is required";
  if (!isRequired(data.designation_name)) errors.designation_name = "Designation name is required";
  if (!isRequired(data.department_id)) errors.department_id = "Department is required";
  return errors;
};

export default function DesignationForm({ initialData = {}, onSubmit, loading, onCancel, isEdit }) {
  // Company/Branch here are pure UI filters to narrow the Department
  // dropdown — only department_id ends up in the submitted payload.
  // On edit, derive them from the department's own company/branch
  // (Department.to_dict() now embeds those).
  const [companyId, setCompanyId] = useState(
    initialData.department?.company?.id || ""
  );
  const [branchId, setBranchId] = useState(
    initialData.department?.branch?.id || ""
  );

  const [form, setForm] = useState({
    designation_name: initialData.designation_name || "",
    department_id: initialData.department_id || "",
    description: initialData.description || "",
    status: initialData.status !== undefined ? initialData.status : true,
    is_admin_designation: initialData.is_admin_designation !== undefined ? initialData.is_admin_designation : false,
  });
  const [errors, setErrors] = useState({});

  const { data: companies } = useQuery({
    queryKey: ["companies-dropdown"],
    queryFn: async () =>
      (
        await masterApi.listCompanies({ page: 1, per_page: 100, is_active: true })
      ).data.data,
  });
 
  const { data: branches } = useQuery({
    queryKey: ["company-branches-dropdown", companyId],
    queryFn: async () =>
      (
        await masterApi.listCompanyBranches(companyId, {
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
    enabled: !!companyId,
  });
 
  const { data: departments } = useQuery({
    queryKey: ["departments", { branch_id: branchId, page: 1, per_page: 100, is_active: true }],
    queryFn: async () =>
      (
        await masterApi.listDepartments({
          branch_id: branchId,
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
    enabled: !!branchId,
  });

  const companyOptions = (companies?.items || [])
    .filter((c) => c.status)
    .map((c) => ({ value: c.id, label: c.name }));

  const branchOptions = (branches?.items || [])
    .filter((b) => b.status)
    .map((b) => ({ value: b.id, label: b.name }));

  const deptOptions = (departments?.items || [])
    .filter((d) => d.is_active)
    .map((d) => ({ value: d.id, label: d.department_name }));

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCompanyChange = (e) => {
    setCompanyId(e.target.value);
    setBranchId("");
    setForm((prev) => ({ ...prev, department_id: "" }));
    setErrors((prev) => ({ ...prev, company_id: "", branch_id: "", department_id: "" }));
  };

  const handleBranchChange = (e) => {
    setBranchId(e.target.value);
    setForm((prev) => ({ ...prev, department_id: "" }));
    setErrors((prev) => ({ ...prev, branch_id: "", department_id: "" }));
  };

  // Re-sync the cascade if initialData shows up after mount (Edit flow)
  useEffect(() => {
    if (initialData.department?.company?.id) {
      setCompanyId(initialData.department.company.id);
    }
    if (initialData.department?.branch?.id) {
      setBranchId(initialData.department.branch.id);
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateDesignation({
      ...form,
      company_id: companyId,
      branch_id: branchId,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // company_id/branch_id were only for narrowing the dropdowns —
    // the backend only stores department_id.
    onSubmit(form);
  };

  return (
    <form id="designation-form" onSubmit={handleSubmit}>
      {initialData.designation_code && (
        <Input label="Designation Code" name="designation_code" value={initialData.designation_code} disabled />
      )}

      <Select
        label="Company"
        options={companyOptions}
        value={companyId}
        onChange={handleCompanyChange}
        error={errors.company_id}
        required
      />

      <Select
        label="Branch"
        options={branchOptions}
        value={branchId}
        onChange={handleBranchChange}
        error={errors.branch_id}
        required
        disabled={!companyId}
        placeholder={companyId ? "Select..." : "Select a company first"}
      />

      <Select
        label="Department"
        name="department_id"
        options={deptOptions}
        value={form.department_id}
        onChange={handleChange}
        error={errors.department_id}
        required
        disabled={!branchId}
        placeholder={branchId ? "Select..." : "Select a branch first"}
      />

      <Input label="Designation Name" name="designation_name" value={form.designation_name} onChange={handleChange} error={errors.designation_name} required />
      <Input label="Description" name="description" value={form.description} onChange={handleChange} />
      <div className="mb-4">
        {/* <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="is_admin_designation" checked={form.is_admin_designation} onChange={handleChange} className="h-4 w-4" />
          Admin designation
        </label> */}
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="status" checked={form.status} onChange={handleChange} className="h-4 w-4" />
          Active
        </label>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={loading}>
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}