import { useQuery } from "@tanstack/react-query";

import { employeesApi } from "@/api/employees.api";
import { getUser } from "@/utils/tokenHelpers";

// A "CRM employee" is an `employee`-role login whose Employee record sits
// in the department literally named "CRM". The stored auth user only
// carries a 4-field employee summary (id/code/name), so the department has
// to be fetched from the full Employee record once and cached.
//
// The rest of the app uses this same rule (see EmployeeListPage's crmOnly
// branch / CRM_DEPARTMENT_NAME).
const CRM_DEPARTMENT_NAME = "CRM";

export function useIsCrmEmployee() {
  const user = getUser();

  const isEmployeeRole = user?.role === "employee";
  const employeeId = user?.employee?.id;

  const enabled = isEmployeeRole && !!employeeId;

  const { data, isLoading } = useQuery({
    queryKey: ["me", "employee-record", employeeId],
    queryFn: async () =>
      (await employeesApi.get(employeeId)).data.data,
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

  return {
    isCrmEmployee:
      isEmployeeRole &&
      departmentName === CRM_DEPARTMENT_NAME.toLowerCase(),
    // True only while we genuinely don't know yet, so callers can avoid a
    // flash of admin-only controls before the department is known.
    loading: enabled && isLoading,
  };
}
