import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudUpdate,
  useCrudRemove,
} from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.performance;

// ============================================================
// LIST PERFORMANCE REVIEWS
// ============================================================

export const usePerformanceReviews = (params) =>
  useCrudList("performance", api, params);

// ============================================================
// CREATE PERFORMANCE REVIEW
// ============================================================

export const useCreatePerformanceReview = () =>
  useCrudCreate("performance", api);

// ============================================================
// UPDATE PERFORMANCE REVIEW
// ============================================================

export const useUpdatePerformanceReview = () =>
  useCrudUpdate("performance", api);

// ============================================================
// DEACTIVATE PERFORMANCE REVIEW
// ============================================================

export const useDeactivatePerformanceReview = () =>
  useCrudRemove("performance", api);
