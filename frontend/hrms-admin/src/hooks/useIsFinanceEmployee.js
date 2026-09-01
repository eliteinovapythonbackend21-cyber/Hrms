import { useQuery } from "@tanstack/react-query";

import { employeesApi } from "@/api/employees.api";
import { getUser } from "@/utils/tokenHelpers";

// A "Finance employee" is an `employee`-role login whose Employee record
// sits in the department literally named "Finance" — same pattern as
// useIsCrmEmployee / useIsHrEmployee. The stored auth user only carries a
// 4-field employee summary, so the department is fetched once and cached.
const FINANCE_DEPARTMENT_NAME = "Finance";

export function useIsFinanceEmployee() {
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
    isFinanceEmployee:
      isEmployeeRole &&
      departmentName === FINANCE_DEPARTMENT_NAME.toLowerCase(),
    loading: enabled && isLoading,
  };
}
