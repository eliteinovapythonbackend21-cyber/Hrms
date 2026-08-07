import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = crmApi.followUps;
export const useFollowUps = (params) => useCrudList("follow-ups", api, params);
export const useCreateFollowUp = () => useCrudCreate("follow-ups", api);
export const useDeactivateFollowUp = () => useCrudRemove("follow-ups", api);
