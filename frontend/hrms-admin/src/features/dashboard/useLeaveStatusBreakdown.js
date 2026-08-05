import { useQueries } from "@tanstack/react-query";
import { leavesApi } from "@/api/leaves.api";

const STATUSES = ["Pending", "Approved", "Rejected"];

// Backend has no aggregate/count-by-status endpoint, so this reads the
// `total` from three lightweight paginated queries (search=<status>, which
// matches list_leaves' `apply_search_filters(..., ["status"])`). Non-admins
// are auto-scoped to their own leaves by the backend, so this hook works
// unchanged for both roles.
export function useLeaveStatusBreakdown() {
  const results = useQueries({
    queries: STATUSES.map((status) => ({
      queryKey: ["leave-status-breakdown", status],
      queryFn: async () => {
        const res = await leavesApi.list({ search: status, per_page: 1 });
        return { status, count: res.data.data.total };
      },
    })),
  });

  return {
    data: results.map((r, i) => r.data || { status: STATUSES[i], count: 0 }),
    isLoading: results.some((r) => r.isLoading),
  };
}
