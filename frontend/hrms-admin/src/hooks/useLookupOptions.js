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

export function useEmployeeOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "employees"],
    queryFn: async () => (await employeesApi.list(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((e) => ({
    value: e.id,
    label: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.employee_code || `Employee #${e.id}`,
  }));
}

export function useDepartmentOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "departments"],
    queryFn: async () => (await masterApi.listDepartments(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((d) => ({ value: d.id, label: d.department_name }));
}

export function useDesignationOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "designations"],
    queryFn: async () => (await masterApi.listDesignations(LARGE_PAGE)).data.data,
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
    queryFn: async () => (await crmApi.customers.list(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((c) => ({ value: c.id, label: c.customer_name }));
}

export function useLeadOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "leads"],
    queryFn: async () => (await crmApi.leads.list(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((l) => ({ value: l.id, label: l.lead_name }));
}

export function useQuotationOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "quotations"],
    queryFn: async () => (await crmApi.quotations.list(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((q) => ({ value: q.id, label: q.quotation_number }));
}

export function useInvoiceOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "invoices"],
    queryFn: async () => (await crmApi.invoices.list(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((i) => ({ value: i.id, label: i.invoice_number }));
}

export function useAccountOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "accounts"],
    queryFn: async () => (await financeApi.accounts.list(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((a) => ({ value: a.id, label: a.account_name }));
}

export function useVendorOptions() {
  const { data } = useQuery({
    queryKey: ["lookup", "vendors"],
    queryFn: async () => (await financeApi.vendors.list(LARGE_PAGE)).data.data,
  });
  return (data?.items || []).map((v) => ({ value: v.id, label: v.vendor_name }));
}
