import axiosClient from "./axiosClient";
import { API } from "./endpoints";
import { createCrudApi } from "@/utils/crudFactory";
import { toFormData } from "@/utils/validators";

const L = API.EMPLOYEE_LIFECYCLE;

// Employee lifecycle sub-modules — all create/list/delete only (no PUT on
// the backend, register_crud_blueprint(editable=False)).
export const employeeLifecycleApi = {
  documents: {
    ...createCrudApi({ listUrl: L.DOCUMENTS, itemUrl: L.DOCUMENTS_ITEM }),
    // Multipart (document file upload) — Content-Type must be left unset so
    // the browser adds the multipart boundary itself.
    create: (payload) =>
      axiosClient.post(L.DOCUMENTS, toFormData(payload), {
        headers: { "Content-Type": undefined },
      }),
    update: (id, payload) =>
      axiosClient.put(L.DOCUMENTS_ITEM(id), toFormData(payload), {
        headers: { "Content-Type": undefined },
      }),
  },
  permissions: createCrudApi({ listUrl: L.PERMISSIONS, itemUrl: L.PERMISSIONS_ITEM }),
  overtime: createCrudApi({ listUrl: L.OVERTIME, itemUrl: L.OVERTIME_ITEM }),
  payroll: {
    ...createCrudApi({ listUrl: L.PAYROLL, itemUrl: L.PAYROLL_ITEM }),
    report: (params) => axiosClient.get(L.PAYROLL_REPORT, { params, responseType: "blob" }),
  },
  performance: createCrudApi({ listUrl: L.PERFORMANCE, itemUrl: L.PERFORMANCE_ITEM }),
  training: createCrudApi({ listUrl: L.TRAINING, itemUrl: L.TRAINING_ITEM }),
  promotions: {
    ...createCrudApi({ listUrl: L.PROMOTIONS, itemUrl: L.PROMOTIONS_ITEM }),
    // Promotions have no file field, so this is a plain JSON PUT — but it
    // still needs to be explicitly defined, same as documents.update above.
    // createCrudApi()'s generic spread does not appear to include a working
    // update() by default (see the historical comment at the top of this
    // file: these modules were originally "create/list/delete only, no
    // PUT"), which is almost certainly why Edit/Reactivate were failing
    // with a generic client-side error instead of a real server response.
    update: (id, payload) => axiosClient.put(L.PROMOTIONS_ITEM(id), payload),
  },
  transfers: createCrudApi({ listUrl: L.TRANSFERS, itemUrl: L.TRANSFERS_ITEM }),
  resignations: createCrudApi({ listUrl: L.RESIGNATIONS, itemUrl: L.RESIGNATIONS_ITEM }),
  exitManagement: createCrudApi({ listUrl: L.EXIT_MANAGEMENT, itemUrl: L.EXIT_MANAGEMENT_ITEM }),
};