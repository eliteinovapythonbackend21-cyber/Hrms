import { holidayApi } from "@/api/master.api";
import { useCrudList, useCrudCreate, useCrudUpdate, useCrudRemove } from "@/hooks/useCrudResource";

export const useHolidays = (params) => useCrudList("holidays", holidayApi, params);
export const useCreateHoliday = () => useCrudCreate("holidays", holidayApi);
export const useUpdateHoliday = () => useCrudUpdate("holidays", holidayApi);
export const useDeactivateHoliday = () => useCrudRemove("holidays", holidayApi);