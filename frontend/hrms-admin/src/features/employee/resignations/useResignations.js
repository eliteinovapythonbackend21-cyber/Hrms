import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudUpdate,
  useCrudRemove,
} from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.resignations;

/**
 * Resignation list
 */
export const useResignations = (params = {}) => {
  return useCrudList("resignations", api, params);
};

/**
 * Create resignation
 */
export const useCreateResignation = () => {
  return useCrudCreate("resignations", api);
};

/**
 * Update resignation
 *
 * Used for:
 * - editing resignation details
 * - approving resignation
 * - rejecting resignation
 * - reactivating deactivated resignation
 */
export const useUpdateResignation = () => {
  return useCrudUpdate("resignations", api);
};

/**
 * Deactivate resignation
 *
 * This performs the existing soft-delete behavior.
 */
export const useDeactivateResignation = () => {
  return useCrudRemove("resignations", api);
};