import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const authApi = {
  register: (payload) => axiosClient.post(API.AUTH.REGISTER, payload),
  login: (payload) => axiosClient.post(API.AUTH.LOGIN, payload),
  me: () => axiosClient.get(API.AUTH.ME),
  logout: () => axiosClient.post(API.AUTH.LOGOUT),
  // Unauthenticated lookups used by the Register form's Department/Designation
  // selects (the visitor has no JWT yet, so the admin-only masterApi endpoints
  // can't be used here).
  departments: () => axiosClient.get(API.AUTH.DEPARTMENTS),
  designations: (departmentId) =>
    axiosClient.get(API.AUTH.DESIGNATIONS, { params: departmentId ? { department_id: departmentId } : {} }),
};
