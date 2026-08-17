import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Select from "@/components/ui/Select";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";
import { employeesApi } from "@/api/employees.api";
import { masterApi } from "@/api/master.api";
import { isRequired } from "@/utils/validators";

export default function TransferForm({ formId = "transfers-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();

  // Full employee records (with nested department.branch) — used so
  // picking an Employee can auto-fill their CURRENT branch/department into
  // the "Existing Assignment" fields, instead of making the person look it
  // up and re-select it manually.
  const { data: employeesData } = useQuery({
    queryKey: ["transfer-form", "employees-full"],
    queryFn: async () => (await employeesApi.list({ page: 1, per_page: 1000, is_active: true })).data.data,
  });
  const employeeFullMap = useMemo(
    () => Object.fromEntries((employeesData?.items || []).map((e) => [e.id, e])),
    [employeesData]
  );

  // Full department records (with nested branch) — needed to build the
  // Branch dropdown and to filter Department options down to whichever
  // branch was picked, for both the existing and future assignment.
  const { data: departmentsData } = useQuery({
    queryKey: ["transfer-form", "departments-full"],
    queryFn: async () => (await masterApi.listDepartments({ page: 1, per_page: 1000, is_active: true })).data.data,
  });
  const departments = departmentsData?.items || [];

  const branchOptions = useMemo(() => {
    const map = new Map();
    departments.forEach((d) => {
      if (d.branch?.id) map.set(d.branch.id, d.branch.name);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [departments]);

  const departmentOptionsForBranch = (branchId) =>
    departments
      .filter((d) => String(d.branch?.id) === String(branchId))
      .map((d) => ({ value: d.id, label: d.department_name }));

  const [form, setForm] = useState({
    employee_id: initialData?.employee_id || "",
    from_department_id: initialData?.from_department_id || "",
    to_department_id: initialData?.to_department_id || "",
    effective_date: initialData?.effective_date || "",
    remarks: initialData?.remarks || "",
  });
  // Branch is UI-only — it narrows the Department dropdown but is never
  // sent to the backend (Transfer only stores department IDs; branch is
  // derived from whichever department's own .branch on the list page).
  // When editing an existing transfer, pre-select the branch that the
  // saved from/to department already belongs to, so the cascading
  // dropdown starts in the right state instead of blank.
  const initialFromDept = departments.find((d) => d.id === initialData?.from_department_id);
  const initialToDept = departments.find((d) => d.id === initialData?.to_department_id);
  const [fromBranchId, setFromBranchId] = useState(initialFromDept?.branch?.id || "");
  const [toBranchId, setToBranchId] = useState(initialToDept?.branch?.id || "");
  const [errors, setErrors] = useState({});

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Auto-fills "Existing Branch" / "Existing Department" from whatever the
  // selected employee's CURRENT department already is — only overwrites
  // those two fields if the employee's own record actually has a
  // department assigned; otherwise leaves them for manual selection.
  const handleEmployeeChange = (e) => {
    const employeeId = e.target.value;
    const emp = employeeFullMap[employeeId];
    const currentDept = emp?.department;

    setForm((prev) => ({
      ...prev,
      employee_id: employeeId,
      from_department_id: currentDept?.id || prev.from_department_id,
    }));

    if (currentDept?.branch?.id) {
      setFromBranchId(currentDept.branch.id);
    }
  };

  // Changing a branch clears its department, since the old department
  // choice likely doesn't belong to the newly selected branch.
  const handleFromBranchChange = (e) => {
    setFromBranchId(e.target.value);
    setForm((prev) => ({ ...prev, from_department_id: "" }));
  };
  const handleToBranchChange = (e) => {
    setToBranchId(e.target.value);
    setForm((prev) => ({ ...prev, to_department_id: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    const errs = {};
    if (!isRequired(form.employee_id)) errs.employee_id = "Employee is required";
    if (!isRequired(fromBranchId)) errs.from_branch_id = "Existing branch is required";
    if (!isRequired(form.from_department_id)) errs.from_department_id = "Existing department is required";
    if (!isRequired(toBranchId)) errs.to_branch_id = "Future branch is required";
    if (!isRequired(form.to_department_id)) errs.to_department_id = "Future department is required";
    if (!isRequired(form.effective_date)) errs.effective_date = "Effective date is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    // Only the actual Transfer fields go to the backend — from_branch_id/
    // to_branch_id were only ever local filter state.
    onSubmit(form);
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <Select
        label="Employee"
        name="employee_id"
        value={form.employee_id}
        onChange={handleEmployeeChange}
        options={employeeOptions}
        error={errors.employee_id}
        required
      />

      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Existing Assignment</div>
      <Select
        label="Existing Branch"
        name="from_branch_id"
        value={fromBranchId}
        onChange={handleFromBranchChange}
        options={branchOptions}
        error={errors.from_branch_id}
        required
      />
      <Select
        label="Existing Department"
        name="from_department_id"
        value={form.from_department_id}
        onChange={handleChange}
        options={departmentOptionsForBranch(fromBranchId)}
        error={errors.from_department_id}
        required
        disabled={!fromBranchId}
      />

      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Future Assignment</div>
      <Select
        label="Future Branch"
        name="to_branch_id"
        value={toBranchId}
        onChange={handleToBranchChange}
        options={branchOptions}
        error={errors.to_branch_id}
        required
      />
      <Select
        label="Future Department"
        name="to_department_id"
        value={form.to_department_id}
        onChange={handleChange}
        options={departmentOptionsForBranch(toBranchId)}
        error={errors.to_department_id}
        required
        disabled={!toBranchId}
      />

      <div className="mb-4 mt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Effective Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          name="effective_date"
          value={form.effective_date}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        {errors.effective_date && <p className="mt-1 text-xs text-red-500">{errors.effective_date}</p>}
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Remarks</label>
        <textarea
          name="remarks"
          value={form.remarks}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
    </form>
  );
}