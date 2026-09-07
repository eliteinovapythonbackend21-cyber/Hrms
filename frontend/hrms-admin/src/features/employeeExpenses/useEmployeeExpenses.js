import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeExpensesApi } from "@/api/employeeExpenses.api";

const KEY = ["employee-expenses"];

export function useEmployeeExpenses(params) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: async () => {
      const res = await employeeExpensesApi.list(params);
      return res.data.data;
    },
  });
}

export function useEmployeeExpenseCategories() {
  return useQuery({
    queryKey: [...KEY, "categories"],
    queryFn: async () => {
      const res = await employeeExpensesApi.categories();
      return res.data.data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useCreateEmployeeExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeeExpensesApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateEmployeeExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => employeeExpensesApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeactivateEmployeeExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => employeeExpensesApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
