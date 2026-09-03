import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { crmApi } from "@/api/crm.api";

const api = crmApi.incentives;

const unwrap = (res) => res.data?.data ?? res.data;

/* ---------------- run ---------------- */

export function useRunIncentives() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }) => api.run(month, year),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incentive-weekly"] });
      qc.invalidateQueries({ queryKey: ["incentive-monthly"] });
      qc.invalidateQueries({ queryKey: ["incentive-yearly"] });
      qc.invalidateQueries({ queryKey: ["incentive-summary"] });
    },
  });
}

/* ---------------- reads ---------------- */

export function useWeeklyIncentives(params, options = {}) {
  return useQuery({
    queryKey: ["incentive-weekly", params],
    queryFn: async () => unwrap(await api.weekly(params)),
    ...options,
  });
}

export function useMonthlyPayouts(params, options = {}) {
  return useQuery({
    queryKey: ["incentive-monthly", params],
    queryFn: async () => unwrap(await api.monthly(params)),
    ...options,
  });
}

export function useYearlyPayouts(params, options = {}) {
  return useQuery({
    queryKey: ["incentive-yearly", params],
    queryFn: async () => unwrap(await api.yearly(params)),
    ...options,
  });
}

export function useIncentiveSummary(params, options = {}) {
  return useQuery({
    queryKey: ["incentive-summary", params],
    queryFn: async () => unwrap(await api.summary(params)),
    ...options,
  });
}

export function useIncentiveInvoiceList(params, options = {}) {
  return useQuery({
    queryKey: ["incentive-invoices", params],
    queryFn: async () => unwrap(await api.invoices(params)),
    ...options,
  });
}

/* ---------------- invoice ---------------- */

export function useGenerateIncentiveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payoutId) => api.generateInvoice(payoutId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incentive-monthly"] });
      qc.invalidateQueries({ queryKey: ["incentive-invoices"] });
    },
  });
}
