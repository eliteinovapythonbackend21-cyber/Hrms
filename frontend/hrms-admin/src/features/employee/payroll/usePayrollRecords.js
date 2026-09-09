import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudUpdate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFileDownload } from "@/hooks/useFileDownload";

const api =
  employeeLifecycleApi.payroll;

/* =========================================================
   LIST
========================================================= */

export const usePayrollRecords = (params) =>
  useCrudList(
    "payroll",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const usePayrollRecord = (id) =>
  useCrudGet(
    "payroll",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreatePayrollRecord = () =>
  useCrudCreate(
    "payroll",
    api
  );

/* =========================================================
   UPDATE / EDIT
========================================================= */

export const useUpdatePayrollRecord = () =>
  useCrudUpdate(
    "payroll",
    api
  );

/* =========================================================
   DEACTIVATE / REMOVE
========================================================= */

export const useDeactivatePayrollRecord = () =>
  useCrudRemove(
    "payroll",
    api
  );

/* =========================================================
   PAYROLL REPORT
========================================================= */

export function usePayrollReport() {
  const {
    downloadBlob,
  } = useFileDownload();

  return useMutation({
    mutationFn: async (params) => {
      if (
        typeof api?.report !==
        "function"
      ) {
        throw new Error(
          "Payroll report API method is not configured."
        );
      }

      const response =
        await api.report(
          params
        );

      if (response) {
        downloadBlob(
          response,
          "payroll_report.xlsx"
        );
      }

      return response;
    },
  });
}

/* =========================================================
   GENERATE (Run Now) — admin/finance manual (re)generation of
   Salary Payroll for a given month/year. The same generation
   otherwise self-triggers automatically on the 1st-10th of
   every month.
========================================================= */

export function useGeneratePayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ month, year }) => api.generate({ month, year }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
    },
  });
}