import axiosClient from "./axiosClient";
import { API } from "./endpoints";
import { toFormData } from "@/utils/validators";

export const usersApi = {
  list: (params) => axiosClient.get(API.USERS.LIST, { params }),
  create: (payload) => axiosClient.post(API.USERS.CREATE, payload),
  count: () => axiosClient.get(API.USERS.COUNT),
  login: (payload) => axiosClient.post(API.USERS.LOGIN, payload),
  get: (id) => axiosClient.get(API.USERS.GET(id)),
  update: (id, payload) => axiosClient.put(API.USERS.UPDATE(id), payload),
  deactivate: (id) => axiosClient.delete(API.USERS.DELETE(id)),
  getProfile: (id) => axiosClient.get(API.USERS.PROFILE_GET(id)),
  // Multipart (profile_picture upload) — Content-Type must be left unset so
  // the browser adds the multipart boundary itself; the axios instance
  // otherwise defaults every request to application/json.
  updateProfile: (id, payload) =>
    axiosClient.put(API.USERS.PROFILE_UPDATE(id), toFormData(payload), {
      headers: { "Content-Type": undefined },
    }),
};
