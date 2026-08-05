import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const authApi = {
  register: (payload) => axiosClient.post(API.AUTH.REGISTER, payload),
  login: (payload) => axiosClient.post(API.AUTH.LOGIN, payload),
  me: () => axiosClient.get(API.AUTH.ME),
  logout: () => axiosClient.post(API.AUTH.LOGOUT),
};
