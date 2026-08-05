import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard.api";

export function useDashboardStats(options = {}) {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await dashboardApi.stats();
      return res.data.data;
    },
    enabled: options.enabled ?? true,
  });
}
