import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  employeeExpensesApi,
} from "@/api/employeeExpenses.api";


/*
 * Keep the existing filename/hook names so existing imports
 * do not immediately break.
 *
 * The API itself now points to Office Expenses.
 */

const KEY = ["office-expenses"];


/*
 * Office Expense categories.
 *
 * These are kept in one place so the form, filters and
 * backend validation use the same terminology.
 */
export const OFFICE_EXPENSE_CATEGORIES = [
  "Stationery",
  "Printing",
  "Cleaning",
  "Pantry",
  "Maintenance",
  "Travel",
  "Fuel / Transport",
  "IT / Electronics",
  "Office Supplies",
  "Client Entertainment",
  "Other",
];


/*
 * Purchase type.
 *
 * These are separate from category.
 */
export const OFFICE_EXPENSE_PURCHASE_TYPES = [
  "Office In Purchase",
  "Office Out Purchase",
];


/*
 * Amount collection status.
 */
export const OFFICE_EXPENSE_COLLECTION_STATUSES = [
  "Collected",
  "Not Collected",
];


/*
 * Collection methods.
 */
export const OFFICE_EXPENSE_COLLECTION_MODES = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Card",
  "Other",
];


/*
 * Main office expenses list.
 */
export function useEmployeeExpenses(
  params,
  options = {}
) {
  return useQuery({
    queryKey: [
      ...KEY,
      "list",
      params,
    ],

    queryFn: async () => {
      const response =
        await employeeExpensesApi.list(
          params
        );

      return response.data.data;
    },

    ...options,
  });
}


/*
 * Compatibility alias using the new terminology.
 */
export const useOfficeExpenses =
  useEmployeeExpenses;


/*
 * Expense option lists.
 *
 * The values are defined locally so the form does not
 * depend on a separate categories API being available.
 */
export function useEmployeeExpenseCategories() {
  return useQuery({
    queryKey: [
      ...KEY,
      "categories",
    ],

    queryFn: async () => ({
      categories:
        OFFICE_EXPENSE_CATEGORIES,

      purchase_types:
        OFFICE_EXPENSE_PURCHASE_TYPES,

      collection_statuses:
        OFFICE_EXPENSE_COLLECTION_STATUSES,

      collection_modes:
        OFFICE_EXPENSE_COLLECTION_MODES,
    }),

    staleTime: Infinity,

    gcTime: Infinity,
  });
}


/*
 * New terminology alias.
 */
export const useOfficeExpenseCategories =
  useEmployeeExpenseCategories;


/*
 * Weekly / quarterly reporting hook.
 *
 * period:
 *   weekly
 *   monthly
 *   quarterly
 *
 * date:
 *   YYYY-MM-DD
 */
export function useEmployeeExpenseReport(
  period,
  date,
  params = {},
  options = {}
) {
  return useQuery({
    queryKey: [
      ...KEY,
      "report",
      period,
      date,
      params,
    ],

    queryFn: async () => {
      const response =
        await employeeExpensesApi.reports({
          ...params,
          period,
          date,
        });

      return response.data.data;
    },

    enabled:
      Boolean(period && date) &&
      options.enabled !== false,

    ...options,
  });
}


/*
 * New terminology alias.
 */
export const useOfficeExpenseReport =
  useEmployeeExpenseReport;


/*
 * Received / collected expenses.
 *
 * This intentionally uses the main list endpoint with
 * collection_status=Collected instead of requiring a
 * second backend route.
 */
export function useReceivedEmployeeExpenses(
  params = {},
  options = {}
) {
  const queryParams = {
    ...params,
    collection_status: "Collected",
    is_active: true,
  };

  return useQuery({
    queryKey: [
      ...KEY,
      "received",
      queryParams,
    ],

    queryFn: async () => {
      const response =
        await employeeExpensesApi.list(
          queryParams
        );

      return response.data.data;
    },

    ...options,
  });
}


/*
 * New terminology alias.
 */
export const useReceivedOfficeExpenses =
  useReceivedEmployeeExpenses;


/*
 * Create Office Expense.
 */
export function useCreateEmployeeExpense() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      employeeExpensesApi.create(
        payload
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: KEY,
      });
    },
  });
}


/*
 * New terminology alias.
 */
export const useCreateOfficeExpense =
  useCreateEmployeeExpense;


/*
 * Update Office Expense.
 */
export function useUpdateEmployeeExpense() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }) =>
      employeeExpensesApi.update(
        id,
        payload
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: KEY,
      });
    },
  });
}


/*
 * New terminology alias.
 */
export const useUpdateOfficeExpense =
  useUpdateEmployeeExpense;


/*
 * Deactivate Office Expense.
 */
export function useDeactivateEmployeeExpense() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      employeeExpensesApi.deactivate(
        id
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: KEY,
      });
    },
  });
}


/*
 * New terminology alias.
 */
export const useDeactivateOfficeExpense =
  useDeactivateEmployeeExpense;
