import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance.api";

export function useAttendance(params, options = {}) {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: async () => {
      const res = await attendanceApi.list(params);
      return res.data.data;
    },
    enabled: options.enabled ?? true,
  });
}
