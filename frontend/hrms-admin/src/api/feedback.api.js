import axiosClient from "./axiosClient";
import { API } from "./endpoints";
import { toFormData } from "@/utils/validators";

export const feedbackApi = {
  list: (params) => axiosClient.get(API.FEEDBACK.LIST, { params }),
  get: (id) => axiosClient.get(API.FEEDBACK.GET(id)),
  // Multipart (optional screenshot upload) — Content-Type left unset so
  // the browser adds the multipart boundary itself, same pattern as
  // usersApi.updateProfile.
  create: (payload) =>
    axiosClient.post(API.FEEDBACK.CREATE, toFormData(payload), {
      headers: { "Content-Type": undefined },
    }),
  // Status / admin_response updates are plain JSON (admin-only, no file).
  update: (id, payload) => axiosClient.put(API.FEEDBACK.UPDATE(id), payload),
};
