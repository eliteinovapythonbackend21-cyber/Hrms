import { useQuery } from "@tanstack/react-query";
import { networkApi } from "@/api/network.api";

export function useNetworkLogs(params) {
  return useQuery({
    queryKey: ["network-logs", params],
    queryFn: async () => {
      const res = await networkApi.list(params);
      return res.data.data;
    },
  });
}
