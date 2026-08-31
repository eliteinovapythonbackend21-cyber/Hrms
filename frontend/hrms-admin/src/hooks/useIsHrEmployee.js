import { useQuery } from "@tanstack/react-query";

import { employeesApi } from "@/api/employees.api";
import { getUser } from "@/utils/tokenHelpers";

// An "HR employee" is an `employee`-role login whose Employee record sits
// in the department literally named "HR" — the same pattern as
// useIsCrmEmployee for the CRM department. The stored auth user only
// carries a 4-field employee summary (id/code/name), so the department has
// to be fetched from the full Employee record once and cached.
const HR_DEPARTMENT_NAME = "HR";

export function useIsHrEmployee() {
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
    isHrEmployee:
      isEmployeeRole &&
      departmentName === HR_DEPARTMENT_NAME.toLowerCase(),
    // True only while we genuinely don't know yet, so callers can avoid a
    // flash of admin-only controls before the department is known.
    loading: enabled && isLoading,
  };
}
