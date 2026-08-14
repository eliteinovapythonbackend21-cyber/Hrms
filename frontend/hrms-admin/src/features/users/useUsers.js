import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { usersApi } from "@/api/users.api";

/*
 * ============================================================
 * GET USERS
 * ============================================================
 *
 * This is used by:
 *
 * /users/admins
 *
 * and
 *
 * /users/employees
 *
 * UserListPage sends:
 *
 * {
 *   role: "admin"
 * }
 *
 * or:
 *
 * {
 *   role: "employee"
 * }
 *
 * The role is included in the React Query key so that
 * Admin and Employee records remain separate cached queries.
 */
export function useUsers(params = {}) {
  return useQuery({
    queryKey: ["users", params],

    queryFn: async () => {
      const response = await usersApi.list(params);

      return response.data.data;
    },
  });
}

/*
 * ============================================================
 * GET SINGLE USER
 * ============================================================
 *
 * Used by UserFormPage when editing:
 *
 * /users/:id/edit
 *
 * Example:
 *
 * /users/10/edit
 *
 * The request will only execute when an id exists.
 */
export function useUser(id) {
  return useQuery({
    queryKey: ["user", id],

    queryFn: async () => {
      const response = await usersApi.get(id);

      return response.data.data;
    },

    enabled: Boolean(id),
  });
}

/*
 * ============================================================
 * CREATE USER
 * ============================================================
 *
 * Used by:
 *
 * UserFormPage
 *
 * After creating a user, all cached user-list queries
 * are invalidated.
 *
 * This includes:
 *
 * ["users", { role: "admin" }]
 *
 * ["users", { role: "employee" }]
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      return usersApi.create(payload);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });
    },
  });
}

/*
 * ============================================================
 * UPDATE USER
 * ============================================================
 *
 * Used by:
 *
 * /users/:id/edit
 *
 * After updating, all user-list queries are refreshed.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      return usersApi.update(id, payload);
    },

    onSuccess: (_, variables) => {
      /*
       * Refresh all user lists.
       */
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      /*
       * Refresh the specific user's cached data.
       */
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["user", variables.id],
        });
      }
    },
  });
}

/*
 * ============================================================
 * DEACTIVATE USER
 * ============================================================
 *
 * Used from UserListPage.
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return usersApi.deactivate(id);
    },

    onSuccess: (_, id) => {
      /*
       * Refresh Admin and Employee user lists.
       */
      queryClient.invalidateQueries({
        queryKey: ["users"],
      });

      /*
       * Refresh the individual user's cached data.
       */
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["user", id],
        });
      }
    },
  });
}