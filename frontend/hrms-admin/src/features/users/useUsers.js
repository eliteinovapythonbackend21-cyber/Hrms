import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { usersApi } from "@/api/users.api";


/*
|--------------------------------------------------------------------------
| Get Users
|--------------------------------------------------------------------------
*/
export function useUsers(params = {}) {
  return useQuery({
    queryKey: ["users", params],

    queryFn: async () => {
      const res = await usersApi.list(params);

      return res.data.data;
    },

    keepPreviousData: true,
  });
}


/*
|--------------------------------------------------------------------------
| Get Single User
|--------------------------------------------------------------------------
*/
export function useUser(id) {
  return useQuery({
    queryKey: ["user", id],

    queryFn: async () => {
      const res = await usersApi.get(id);

      return res.data.data;
    },

    enabled: Boolean(id),
  });
}


/*
|--------------------------------------------------------------------------
| Create User
|--------------------------------------------------------------------------
*/
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      usersApi.create(payload),

    onSuccess: () => {
      /*
       * Refresh all user lists:
       *
       * /users/admins
       * /users/employees
       * /users
       */
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
}


/*
|--------------------------------------------------------------------------
| Update User
|--------------------------------------------------------------------------
*/
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) =>
      usersApi.update(id, payload),

    onSuccess: (_, variables) => {
      /*
       * Refresh user lists.
       */
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      /*
       * Refresh edited user's details.
       */
      queryClient.invalidateQueries({
        queryKey: ["user", variables.id],
      });
    },
  });
}


/*
|--------------------------------------------------------------------------
| Deactivate User
|--------------------------------------------------------------------------
*/
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      usersApi.deactivate(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
}