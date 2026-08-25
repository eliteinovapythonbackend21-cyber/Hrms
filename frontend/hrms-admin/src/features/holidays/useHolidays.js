import { holidayApi } from "@/api/master.api";
import { useCrudList, useCrudCreate, useCrudUpdate, useCrudRemove } from "@/hooks/useCrudResource";
import { useMutation } from "@tanstack/react-query";
import { useFileDownload } from "@/hooks/useFileDownload";

export const useHolidays = (params) => useCrudList("holidays", holidayApi, params);
export const useCreateHoliday = () => useCrudCreate("holidays", holidayApi);
export const useUpdateHoliday = () => useCrudUpdate("holidays", holidayApi);
export const useDeactivateHoliday = () => useCrudRemove("holidays", holidayApi);

export function useDownloadHolidayList() {
  const { downloadBlob } = useFileDownload();

  return useMutation({
    mutationFn: async (year) => {
      const res = await holidayApi.downloadList(year);
      downloadBlob(res, year ? `holiday_list_${year}.pdf` : "holiday_list.pdf");
      return res;
    },
  });
}