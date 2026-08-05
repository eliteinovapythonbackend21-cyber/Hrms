import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/api/employees.api";

export function useEmployees(params) {
  return useQuery({
    queryKey: ["employees", params],
    queryFn: async () => {
      const res = await employeesApi.list(params);
      return res.data.data;
    },
  });
}

export function useEmployee(id) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const res = await employeesApi.get(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => employeesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => employeesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
