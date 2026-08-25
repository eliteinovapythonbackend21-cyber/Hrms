import { holidayApi } from "@/api/master.api";
import { useCrudList, useCrudCreate, useCrudUpdate, useCrudRemove } from "@/hooks/useCrudResource";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useHolidays = (params) => useCrudList("holidays", holidayApi, params);
export const useCreateHoliday = () => useCrudCreate("holidays", holidayApi);
export const useUpdateHoliday = () => useCrudUpdate("holidays", holidayApi);
export const useDeactivateHoliday = () => useCrudRemove("holidays", holidayApi);

export function useSyncGovernmentHolidays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, countryCode }) => holidayApi.syncGovernment(year, countryCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
    },
  });
}

export function usePreviewGovernmentHolidays(year, countryCode, enabled = true) {
  return useQuery({
    queryKey: ["holidays", "preview-government", year, countryCode],
    queryFn: () => holidayApi.previewGovernment(year, countryCode).then((res) => res.data.data),
    enabled: enabled && !!year && !!countryCode,
  });
}