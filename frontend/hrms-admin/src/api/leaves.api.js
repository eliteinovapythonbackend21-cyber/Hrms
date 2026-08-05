import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const leavesApi = {
  list: (params) => axiosClient.get(API.LEAVES.LIST, { params }),
  create: (payload) => axiosClient.post(API.LEAVES.CREATE, payload),
  get: (id) => axiosClient.get(API.LEAVES.GET(id)),
  update: (id, payload) => axiosClient.put(API.LEAVES.UPDATE(id), payload),
  deactivate: (id) => axiosClient.delete(API.LEAVES.DELETE(id)),
  approve: (id) => axiosClient.post(API.LEAVES.APPROVE(id)),
  reject: (id) => axiosClient.post(API.LEAVES.REJECT(id)),
};
