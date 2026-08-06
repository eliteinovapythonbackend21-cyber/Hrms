import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/api/employees.api";

export function useEmployeePayslip(id, { month, year } = {}) {
  return useQuery({
    queryKey: ["employee-payslip", id, month, year],
    queryFn: async () => {
      const res = await employeesApi.getPayslip(id, { month, year });
      return res.data.data;
    },
    enabled: !!id && !!month && !!year,
  });
}
