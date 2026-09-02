import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import { masterApi } from "@/api/master.api";
import { toDateInputValue } from "@/utils/formatDate";
import { validateEmployee } from "../employeeValidation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

const todayInputValue = toDateInputValue(new Date());

export default function EmployeeForm({ initialData = {}, onSubmit, loading }) {
  const currentUser = useCurrentUser();
  const isEmployee = currentUser?.role === "employee";
  const submitMagnet = useMagnetic(0.2);

  // Company/Branch are pure UI filters to narrow the Department dropdown,
  // same pattern as DesignationForm.jsx — only department_id/designation_id
  // ever get sent to the backend. On edit, derive them from the employee's
  // department (which now carries its own company/branch, since Department
  // is a child of both).
  const [companyId, setCompanyId] = useState(
    initialData.department?.company?.id || ""
  );
  const [branchId, setBranchId] = useState(
    initialData.department?.branch?.id || ""
  );

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

  const [form, setForm] = useState({
    email: initialData.user?.email || "",
    password: "",
    department_id: initialData.department_id || "",
    designation_id: initialData.designation_id || "",
    first_name: initialData.first_name || "",
    last_name: initialData.last_name || "",
    gender: initialData.gender || "",
    dob: toDateInputValue(initialData.dob),
    phone: initialData.phone || "",
    emergency_contact: initialData.emergency_contact || "",
    address: initialData.address || "",
    city: initialData.city || "",
    state: initialData.state || "",
    country: initialData.country || "",
    pincode: initialData.pincode || "",
    joining_date: toDateInputValue(initialData.joining_date),
    salary: initialData.salary || "",
    allowance: initialData.allowance || "",
    pf_number: initialData.pf_number || "",
    esi_number: initialData.esi_number || "",
    account_number: initialData.account_number || "",
    status: initialData.status !== undefined ? initialData.status : true,
  });

  const { data: designations } = useQuery({
    queryKey: ["designations", { department_id: form.department_id, page: 1, per_page: 100, is_active: true }],
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

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Picking a Company invalidates whatever Branch/Department/Designation
  // was selected, since each is scoped to the level above it.
  const handleCompanyChange = (e) => {
    setCompanyId(e.target.value);
    setBranchId("");
    setForm((prev) => ({ ...prev, department_id: "", designation_id: "" }));
    setErrors((prev) => ({
      ...prev,
      company_id: undefined,
      branch_id: undefined,
      department_id: undefined,
      designation_id: undefined,
    }));
  };

  const handleBranchChange = (e) => {
    setBranchId(e.target.value);
    setForm((prev) => ({ ...prev, department_id: "", designation_id: "" }));
    setErrors((prev) => ({
      ...prev,
      branch_id: undefined,
      department_id: undefined,
      designation_id: undefined,
    }));
  };

  const handleDepartmentChange = (e) => {
    const { value } = e.target;
    setForm((prev) => ({
      ...prev,
      department_id: value,
      designation_id: "",
    }));
    setErrors((prev) => ({
      ...prev,
      department_id: undefined,
      designation_id: undefined,
    }));
  };

  // Re-sync the cascade if initialData arrives/changes after mount
  // (e.g. the Edit page's useEmployee query resolves after first render).
  useEffect(() => {
    if (initialData.department?.company?.id) {
      setCompanyId(initialData.department.company.id);
    }
    if (initialData.department?.branch?.id) {
      setBranchId(initialData.department.branch.id);
    }
  }, [initialData]);

  const isEdit = !!initialData.id;

  const handleSubmit = (e) => {
    e.preventDefault();

    // Company/Branch aren't part of employeeValidation (they're new,
    // form-local filters) — checked here instead.
    const cascadeErrors = {};
    if (!isEmployee) {
      if (!companyId) cascadeErrors.company_id = "Company is required";
      if (!branchId) cascadeErrors.branch_id = "Branch is required";
    }

    const validationErrors = validateEmployee(form, { isEdit });
    const combinedErrors = { ...cascadeErrors, ...validationErrors };
    setErrors(combinedErrors);
    if (Object.keys(combinedErrors).length > 0) return;

    // Employees can only self-edit phone and emergency contact; the backend
    // rejects any other field on a non-admin update.
    if (isEmployee) {
      onSubmit({ phone: form.phone, emergency_contact: form.emergency_contact });
      return;
    }

    // On edit, an untouched password field stays blank — omit it so the
    // backend leaves the linked account's password unchanged.
    if (isEdit && !form.password) {
      const { password, ...rest } = form;
      onSubmit(rest);
    } else {
      onSubmit(form);
    }
  };

  const companyOptions = (companies?.items || [])
    .filter((c) => c.status)
    .map((c) => ({ value: c.id, label: c.name }));

  const branchOptions = (branches?.items || [])
    .filter((b) => b.status)
    .map((b) => ({ value: b.id, label: b.name }));

  const deptOptions = (departments?.items || []).map((d) => ({
    value: d.id,
    label: d.department_name,
  }));

  const desigOptions = (designations?.items || []).map((d) => ({
    value: d.id,
    label: d.designation_name,
  }));

  return (
    <form onSubmit={handleSubmit}>
      <Motion3DStyles />
      <div className="u-rise grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        {isEdit && (
          <Input label="Employee Code" name="employee_code" value={initialData.employee_code || ""} disabled readOnly />
        )}
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required disabled={isEmployee} />
        {!isEdit && (
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
        <Select
          label="Company"
          options={companyOptions}
          value={companyId}
          onChange={handleCompanyChange}
          error={errors.company_id}
          required
          disabled={isEmployee}
        />
        <Select
          label="Branch"
          options={branchOptions}
          value={branchId}
          onChange={handleBranchChange}
          error={errors.branch_id}
          required
          disabled={isEmployee || !companyId}
          placeholder={companyId ? "Select..." : "Select a company first"}
        />
        <Select
          label="Department"
          name="department_id"
          options={deptOptions}
          value={form.department_id}
          onChange={handleDepartmentChange}
          error={errors.department_id}
          required
          disabled={isEmployee || !branchId}
          placeholder={branchId ? "Select..." : "Select a branch first"}
        />
        <Select
          label="Designation"
          name="designation_id"
          options={desigOptions}
          value={form.designation_id}
          onChange={handleChange}
          error={errors.designation_id}
          required
          disabled={isEmployee || !form.department_id}
          placeholder={form.department_id ? "Select..." : "Select a department first"}
        />
        <Input label="First Name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} required disabled={isEmployee} />
        <Input label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} error={errors.last_name} disabled={isEmployee} />
        <Select
          label="Gender"
          name="gender"
          options={[
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]}
          value={form.gender}
          onChange={handleChange}
          error={errors.gender}
          disabled={isEmployee}
        />
        <DatePicker
          label="Date of Birth"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          error={errors.dob}
          max={todayInputValue}
          disabled={isEmployee}
        />
        <Input label="Phone" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} />
        <Input label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} error={errors.emergency_contact} />
        <Input label="Address" name="address" value={form.address} onChange={handleChange} error={errors.address} disabled={isEmployee} />
        <Input label="City" name="city" value={form.city} onChange={handleChange} error={errors.city} disabled={isEmployee} />
        <Input label="State" name="state" value={form.state} onChange={handleChange} error={errors.state} disabled={isEmployee} />
        <Input label="Country" name="country" value={form.country} onChange={handleChange} error={errors.country} disabled={isEmployee} />
        <Input label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} error={errors.pincode} disabled={isEmployee} />
        <DatePicker
          label="Joining Date"
          name="joining_date"
          value={form.joining_date}
          onChange={handleChange}
          error={errors.joining_date}
          max={todayInputValue}
          disabled={isEmployee}
        />
        <Input label="Salary" name="salary" type="number" step="0.01" min="0" value={form.salary} onChange={handleChange} error={errors.salary} disabled={isEmployee} />
        <Input label="Allowance" name="allowance" type="number" step="0.01" min="0" value={form.allowance} onChange={handleChange} error={errors.allowance} disabled={isEmployee} />
        <Input label="PF Number" name="pf_number" value={form.pf_number} onChange={handleChange} error={errors.pf_number} disabled={isEmployee} />
        <Input label="ESI Number" name="esi_number" value={form.esi_number} onChange={handleChange} error={errors.esi_number} disabled={isEmployee} />
        <Input label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} error={errors.account_number} disabled={isEmployee} />
      </div>
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" name="status" checked={form.status} onChange={handleChange} className="h-4 w-4" disabled={isEmployee} />
          Active
        </label>
      </div>
      <div ref={submitMagnet.ref} {...submitMagnet.handlers} className="w-full will-change-transform">
        <Button type="submit" isLoading={loading} className="w-full shadow-sm transition-shadow duration-200 hover:shadow-lg">
          {initialData.id ? "Update Employee" : "Create Employee"}
        </Button>
      </div>
    </form>
  );
}