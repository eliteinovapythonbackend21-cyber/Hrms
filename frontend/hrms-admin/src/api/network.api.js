import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const networkApi = {
  list: (params) => axiosClient.get(API.NETWORK.LIST, { params }),
};
