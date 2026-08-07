import axiosClient from "./axiosClient";
import { API } from "./endpoints";
import { createCrudApi, createEditableCrudApi } from "@/utils/crudFactory";

const F = API.FINANCE;

export const financeApi = {
  // Full CRUD (master data)
  accounts: createEditableCrudApi({ listUrl: F.ACCOUNTS, itemUrl: F.ACCOUNTS_ITEM }),
  vendors: createEditableCrudApi({ listUrl: F.VENDORS, itemUrl: F.VENDORS_ITEM }),
  // Add-only (transactional)
  expenses: {
    ...createCrudApi({ listUrl: F.EXPENSES, itemUrl: F.EXPENSES_ITEM }),
    report: (params) => axiosClient.get(F.EXPENSES_REPORT, { params, responseType: "blob" }),
  },
  income: createCrudApi({ listUrl: F.INCOME, itemUrl: F.INCOME_ITEM }),
};
