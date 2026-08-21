import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const attendanceApi = {
  list: (params) => axiosClient.get(API.ATTENDANCE.LIST, { params }),
  monthlySummary: (params) => axiosClient.get(API.ATTENDANCE.MONTHLY_SUMMARY, { params }),
  report: (params) =>
    axiosClient.get(API.ATTENDANCE.REPORT, { params, responseType: "blob" }),
  salaryReport: (params) =>
    axiosClient.get(API.ATTENDANCE.SALARY_REPORT, { params, responseType: "blob" }),
};