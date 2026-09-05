import { useQuery } from "@tanstack/react-query";

import { employeesApi } from "@/api/employees.api";
import { getUser } from "@/utils/tokenHelpers";

// A "CRM Marketing employee" is a CRM-department `employee`-role login
// whose Designation name contains "Marketing" (e.g. "Marketing Executive")
// — the only CRM employees who may reach Lead Upload (spreadsheet or
// photo/OCR). Mirrors useIsCrmEmployee's shape; server-side equivalent is
// utils.is_crm_marketing_user.
const CRM_DEPARTMENT_NAME = "CRM";

export function useIsCrmMarketingEmployee() {
  const user = getUser();

  const isEmployeeRole = user?.role === "employee";
  const employeeId = user?.employee?.id;

  const enabled = isEmployeeRole && !!employeeId;

  const { data, isLoading } = useQuery({
    queryKey: ["me", "employee-record", employeeId],
    queryFn: async () => (await employeesApi.get(employeeId)).data.data,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const departmentName = (
    data?.department?.department_name ||
    data?.department_name ||
    ""
  )
    .trim()
    .toLowerCase();

  const designationName = (
    data?.designation?.designation_name ||
    data?.designation_name ||
    ""
  )
    .trim()
    .toLowerCase();

  return {
    isCrmMarketingEmployee:
      isEmployeeRole &&
      departmentName === CRM_DEPARTMENT_NAME.toLowerCase() &&
      designationName.includes("marketing"),
    loading: enabled && isLoading,
  };
}
