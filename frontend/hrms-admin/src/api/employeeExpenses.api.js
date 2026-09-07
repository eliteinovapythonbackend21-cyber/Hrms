import axiosClient from "./axiosClient";
import { API } from "./endpoints";
import { toFormData } from "@/utils/validators";

export const employeeExpensesApi = {
  list: (params) => axiosClient.get(API.EMPLOYEE_EXPENSES.LIST, { params }),
  get: (id) => axiosClient.get(API.EMPLOYEE_EXPENSES.GET(id)),
  categories: () => axiosClient.get(API.EMPLOYEE_EXPENSES.CATEGORIES),
  // Multipart (optional receipt upload) — Content-Type left unset so the
  // browser adds the multipart boundary itself, same pattern as
  // feedbackApi.create.
  create: (payload) =>
    axiosClient.post(API.EMPLOYEE_EXPENSES.CREATE, toFormData(payload), {
      headers: { "Content-Type": undefined },
    }),
  update: (id, payload) =>
    axiosClient.put(API.EMPLOYEE_EXPENSES.UPDATE(id), toFormData(payload), {
      headers: { "Content-Type": undefined },
    }),
  deactivate: (id) => axiosClient.delete(API.EMPLOYEE_EXPENSES.DEACTIVATE(id)),
};
