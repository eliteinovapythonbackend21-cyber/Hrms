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
  // permissions: createCrudApi({ listUrl: L.PERMISSIONS, itemUrl: L.PERMISSIONS_ITEM }),
  permissions: {
    list: (params) =>
      axiosClient.get(
        L.PERMISSIONS,
        { params }
      ),

    get: (id) =>
      axiosClient.get(
        L.PERMISSIONS_ITEM(id)
      ),

    create: (payload) =>
      axiosClient.post(
        L.PERMISSIONS,
        payload
      ),

    update: (id, payload) =>
      axiosClient.put(
        L.PERMISSIONS_ITEM(id),
        payload
      ),

    remove: (id) =>
      axiosClient.delete(
        `${L.PERMISSIONS_ITEM(id)}/deactivate`
      ),

    reactivate: (id) =>
      axiosClient.put(
        `${L.PERMISSIONS_ITEM(id)}/reactivate`
      ),
  },
  
  // overtime: createCrudApi({ listUrl: L.OVERTIME, itemUrl: L.OVERTIME_ITEM }),
  overtime: {
    list: (params) =>
      axiosClient.get(
        L.OVERTIME,
        { params }
      ),

    get: (id) =>
      axiosClient.get(
        L.OVERTIME_ITEM(id)
      ),

    create: (payload) =>
      axiosClient.post(
        L.OVERTIME,
        payload
      ),

    update: (id, payload) =>
      axiosClient.put(
        L.OVERTIME_ITEM(id),
        payload
      ),

    remove: (id) =>
      axiosClient.delete(
        `${L.OVERTIME_ITEM(id)}/deactivate`
      ),

    reactivate: (id) =>
      axiosClient.put(
        `${L.OVERTIME_ITEM(id)}/reactivate`
      ),
  },
  
  payroll: {
    ...createCrudApi({
      listUrl: L.PAYROLL,
      itemUrl: L.PAYROLL_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        L.PAYROLL_ITEM(id),
        payload
      ),

    report: (params) =>
      axiosClient.get(
        L.PAYROLL_REPORT,
        {
          params,
          responseType: "blob",
        }
      ),
  },

  performance: {
    ...createCrudApi({ listUrl: L.PERFORMANCE, itemUrl: L.PERFORMANCE_ITEM }),
    // Same missing-update bug as promotions/transfers/resignations below —
    // createCrudApi()'s generic spread does not include a working update()
    // by default. Edit and Reactivate (which just calls update() with
    // { is_active: true }) were both silently broken because of this -
    // list/create/deactivate all worked fine since those ARE included in
    // the generic spread, which is exactly why only Edit/Reactivate/Add
    // looked broken while Deactivate worked.
    update: (id, payload) => axiosClient.put(L.PERFORMANCE_ITEM(id), payload),
  },

  // training_bp.py defines GET /, GET /<id>, POST /, PUT /<id>, and
  // DELETE /<id>/deactivate (no plain DELETE /<id> route exists) — so
  // remove() must hit the /deactivate suffix. reactivate() reuses the
  // existing PUT route, since update_training already applies
  // is_active from the payload — no dedicated backend route needed.
  training: {
    list: (params) =>
      axiosClient.get(
        API.EMPLOYEE_LIFECYCLE.TRAINING,
        { params }
      ),

    get: (id) =>
      axiosClient.get(
        API.EMPLOYEE_LIFECYCLE.TRAINING_ITEM(id)
      ),

    create: (payload) =>
      axiosClient.post(
        API.EMPLOYEE_LIFECYCLE.TRAINING,
        payload
      ),

    update: (id, payload) =>
      axiosClient.put(
        API.EMPLOYEE_LIFECYCLE.TRAINING_ITEM(
          id
        ),
        payload
      ),

    remove: (id) =>
      axiosClient.delete(
        `${API.EMPLOYEE_LIFECYCLE.TRAINING_ITEM(id)}/deactivate`
      ),

    reactivate: (id) =>
      axiosClient.put(
        API.EMPLOYEE_LIFECYCLE.TRAINING_ITEM(id),
        { is_active: true }
      ),
  },
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
  transfers: {
    ...createCrudApi({ listUrl: L.TRANSFERS, itemUrl: L.TRANSFERS_ITEM }),
    // Same fix as promotions.update above — createCrudApi()'s generic
    // spread does not include a working update() by default.
    update: (id, payload) => axiosClient.put(L.TRANSFERS_ITEM(id), payload),
  },
  resignations: {
    ...createCrudApi({ listUrl: L.RESIGNATIONS, itemUrl: L.RESIGNATIONS_ITEM }),
    update: (id, payload) => axiosClient.put(L.RESIGNATIONS_ITEM(id), payload),
  },
  exitManagement: createCrudApi({ listUrl: L.EXIT_MANAGEMENT, itemUrl: L.EXIT_MANAGEMENT_ITEM }),
};