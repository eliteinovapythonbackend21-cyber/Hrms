import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/api/employees.api";

export function useEmployeeSalaries(params) {
  return useQuery({
    queryKey: ["employee-salaries", params],
    queryFn: async () => {
      const res = await employeesApi.listSalaries(params);
      return res.data.data;
    },
  });
}

export function useEmployeeSalary(id) {
  return useQuery({
    queryKey: ["employee-salary", id],
    queryFn: async () => {
      const res = await employeesApi.getSalary(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => employeesApi.updateSalary(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-salaries"] });
      queryClient.invalidateQueries({ queryKey: ["employee-salary"] });
    },
  });
}

export function useResetSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => employeesApi.resetSalary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-salaries"] });
      queryClient.invalidateQueries({ queryKey: ["employee-salary"] });
    },
  });
}
