import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const rolesApi = {
  list: (params) => axiosClient.get(API.ROLES.LIST, { params }),
  create: (payload) => axiosClient.post(API.ROLES.CREATE, payload),
  get: (id) => axiosClient.get(API.ROLES.GET(id)),
  update: (id, payload) => axiosClient.put(API.ROLES.UPDATE(id), payload),
  deactivate: (id) => axiosClient.delete(API.ROLES.DELETE(id)),
  permissionsCatalog: () => axiosClient.get(API.ROLES.PERMISSIONS_CATALOG),
  getRolePermissions: (id) => axiosClient.get(API.ROLES.ROLE_PERMISSIONS(id)),
  setRolePermissions: (id, permission_ids) =>
    axiosClient.put(API.ROLES.ROLE_PERMISSIONS(id), { permission_ids }),
};
