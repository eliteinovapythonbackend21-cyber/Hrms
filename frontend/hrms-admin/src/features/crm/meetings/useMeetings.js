import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = crmApi.meetings;
export const useMeetings = (params) => useCrudList("meetings", api, params);
export const useCreateMeeting = () => useCrudCreate("meetings", api);
export const useDeactivateMeeting = () => useCrudRemove("meetings", api);
