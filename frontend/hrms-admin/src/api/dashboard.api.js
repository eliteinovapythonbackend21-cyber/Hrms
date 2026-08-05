import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const dashboardApi = {
  stats: () => axiosClient.get(API.DASHBOARD.STATS),
};
