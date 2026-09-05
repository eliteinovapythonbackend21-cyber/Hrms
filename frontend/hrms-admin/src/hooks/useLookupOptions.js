import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/api/employees.api";
import { masterApi } from "@/api/master.api";
import { crmApi } from "@/api/crm.api";
import { financeApi } from "@/api/finance.api";
import { employeeLifecycleApi } from "@/api/employee.api";

// Shared FK-dropdown lookups used across the create-only lifecycle / CRM /
// finance forms. Each fetches a large single page (no search box in these
// v1 forms — lists are small enough in practice) and maps to
// { value, label } for <Select>.
const LARGE_PAGE = { page: 1, per_page: 500 };

// FK dropdowns should only ever offer active records — a deactivated
// employee/department/designation shouldn't be selectable going forward,
// even though existing records that already reference it stay untouched.
// The backend's register_crud_blueprint already supports this filter (see
// list_items: it reads request.args.get("is_active") and applies it), so
// this is just passing the param through.
const ACTIVE_ONLY = { ...LARGE_PAGE, is_active: true };

export function useEmployeeOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "employees"],
    queryFn: async () => (await employeesApi.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((e) => ({
    value: e.id,
    label: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.employee_code || `Employee #${e.id}`,
  }));
}

export function useCRMEmployeeOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "crm-employees"],
    queryFn: async () => (await employeesApi.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || [])
    .filter((e) => e.department?.department_name === "CRM")
    .map((e) => ({
      value: e.id,
      label: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.employee_code || `Employee #${e.id}`,
    }));
}

export function useDepartmentOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "departments"],
    queryFn: async () => (await masterApi.listDepartments(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((d) => ({ value: d.id, label: d.department_name }));
}

export function useDesignationOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "designations"],
    queryFn: async () => (await masterApi.listDesignations(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((d) => ({ value: d.id, label: d.designation_name }));
}

export function useApprovedResignationOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "resignations-approved"],
    queryFn: async () => (await employeeLifecycleApi.resignations.list({ ...LARGE_PAGE, search: "Approved" })).data.data,
  });
  return (data?.items || [])
    .filter((r) => r.status === "Approved")
    .map((r) => ({ value: r.id, label: `#${r.id} - Employee ${r.employee_id} (${r.last_working_date || "-"})` }));
}

export function useCustomerOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "customers"],
    queryFn: async () => (await crmApi.customers.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((c) => ({ value: c.id, label: c.customer_name }));
}

export function useMembershipPlanOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "membership-plans"],
    queryFn: async () => (await crmApi.membershipPlans.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((p) => ({ value: p.name, label: `${p.name} (₹${Number(p.rate || 0).toLocaleString("en-IN")})` }));
}

export function useLeadOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "leads"],
    queryFn: async () => (await crmApi.leads.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((l) => ({ value: l.id, label: l.lead_name }));
}

export function useQuotationOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "quotations"],
    queryFn: async () => (await crmApi.quotations.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((q) => ({ value: q.id, label: q.quotation_number }));
}

export function useInvoiceOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "invoices"],
    queryFn: async () => (await crmApi.invoices.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((i) => ({ value: i.id, label: i.invoice_number }));
}

export function useAccountOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "accounts"],
    queryFn: async () => (await financeApi.accounts.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((a) => ({ value: a.id, label: a.account_name }));
}

export function useVendorOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "vendors"],
    queryFn: async () => (await financeApi.vendors.list(ACTIVE_ONLY)).data.data,
  });
  return (data?.items || []).map((v) => ({ value: v.id, label: v.vendor_name }));
}