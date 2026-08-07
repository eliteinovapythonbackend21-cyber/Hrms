import axiosClient from "@/api/axiosClient";

// Builds a standard { list, create, get, remove } API object for a
// create/list/delete-only (soft-delete) backend resource — the shape shared
// by every employee-lifecycle, CRM, and expense/income-style finance module
// (register_crud_blueprint with editable=False on the backend).
export function createCrudApi({ listUrl, itemUrl }) {
  return {
    list: (params) => axiosClient.get(listUrl, { params }),
    create: (payload) => axiosClient.post(listUrl, payload),
    get: (id) => axiosClient.get(itemUrl(id)),
    remove: (id) => axiosClient.delete(itemUrl(id)),
  };
}

// Same as above plus `update` — for full-CRUD master-data style resources
// (accounts, vendors, holidays, ...).
export function createEditableCrudApi({ listUrl, itemUrl }) {
  return {
    ...createCrudApi({ listUrl, itemUrl }),
    update: (id, payload) => axiosClient.put(itemUrl(id), payload),
  };
}
