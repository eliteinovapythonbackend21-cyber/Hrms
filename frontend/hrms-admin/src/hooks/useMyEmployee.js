import { useQuery } from "@tanstack/react-query";

import { employeesApi } from "@/api/employees.api";
import { getUser } from "@/utils/tokenHelpers";

// Full Employee record for the logged-in `employee`-role user (department,
// designation, phone, address, …). Shares the ["me","employee-record",id]
// cache key with useIsHrEmployee / useIsCrmEmployee so it's fetched once.
export function useMyEmployee() {
  const user = getUser();
  const employeeId = user?.employee?.id;
  const enabled = user?.role === "employee" && !!employeeId;

  const { data, isLoading } = useQuery({
    queryKey: ["me", "employee-record", employeeId],
    queryFn: async () => (await employeesApi.get(employeeId)).data.data,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return { employee: data || null, loading: enabled && isLoading };
}
