import axiosClient from "./axiosClient";

import { API } from "./endpoints";

import { toFormData } from "@/utils/validators";

/**
 * Office Expenses API
 *
 * Supports:
 * - Day-to-day office expenses
 * - Office In Purchase / Office Out Purchase
 * - Expense creation and editing
 * - Receipt upload
 * - Collection / received status
 * - Weekly reports
 * - Monthly reports
 * - Quarterly reports
 */

export const officeExpensesApi = {
  /**
   * Get office expenses list
   *
   * Supported params can include:
   * - page
   * - per_page
   * - search
   * - employee_id
   * - purchase_type
   * - collection_status
   * - collection_mode
   * - from_date
   * - to_date
   * - is_active
   */
  list: (params) =>
    axiosClient.get(API.OFFICE_EXPENSES.LIST, {
      params,
    }),

  /**
   * Get a single office expense
   */
  get: (id) =>
    axiosClient.get(
      API.OFFICE_EXPENSES.GET(id)
    ),

  /**
   * Get purchase types
   *
   * Example:
   * - Office In Purchase
   * - Office Out Purchase
   */
  purchaseTypes: () =>
    axiosClient.get(
      API.OFFICE_EXPENSES.PURCHASE_TYPES
    ),

  /**
   * Get collection modes
   *
   * Example:
   * - Cash
   * - UPI
   * - Bank Transfer
   * - Card
   * - Other
   */
  collectionModes: () =>
    axiosClient.get(
      API.OFFICE_EXPENSES.COLLECTION_MODES
    ),

  /**
   * Get weekly / monthly / quarterly reports
   *
   * params can include:
   *
   * period:
   * - day
   * - week
   * - month
   * - quarter
   *
   * year
   * month
   * quarter
   * from_date
   * to_date
   * purchase_type
   * collection_status
   */
  reports: (params) =>
    axiosClient.get(
      API.OFFICE_EXPENSES.REPORTS,
      {
        params,
      }
    ),

  /**
   * Get received / collected expenses
   */
  received: (params) =>
    axiosClient.get(
      API.OFFICE_EXPENSES.RECEIVED,
      {
        params,
      }
    ),

  /**
   * Create office expense
   *
   * Multipart form-data is used because
   * receipt upload is supported.
   */
  create: (payload) =>
    axiosClient.post(
      API.OFFICE_EXPENSES.CREATE,
      toFormData(payload),
      {
        headers: {
          "Content-Type": undefined,
        },
      }
    ),

  /**
   * Update office expense
   *
   * Multipart form-data is used because
   * receipt can also be replaced while editing.
   */
  update: (id, payload) =>
    axiosClient.put(
      API.OFFICE_EXPENSES.UPDATE(id),
      toFormData(payload),
      {
        headers: {
          "Content-Type": undefined,
        },
      }
    ),

  /**
   * Deactivate office expense
   */
  deactivate: (id) =>
    axiosClient.delete(
      API.OFFICE_EXPENSES.DEACTIVATE(id)
    ),
};


/*
 * Backward-compatible alias
 *
 * This allows existing components that still import
 * employeeExpensesApi to continue working while the
 * frontend is being migrated to Office Expenses.
 */
export const employeeExpensesApi = officeExpensesApi;