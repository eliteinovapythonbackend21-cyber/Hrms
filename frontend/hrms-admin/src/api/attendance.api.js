import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const attendanceApi = {
  // Get attendance records
  list: (params) =>
    axiosClient.get(API.ATTENDANCE.LIST, {
      params,
    }),

  // Get monthly attendance and salary summary
  monthlySummary: (params) =>
    axiosClient.get(API.ATTENDANCE.MONTHLY_SUMMARY, {
      params,
    }),

  // Download attendance report
  report: (params) =>
    axiosClient.get(API.ATTENDANCE.REPORT, {
      params,
      responseType: "blob",
    }),

  // Download salary report
  salaryReport: (params) =>
    axiosClient.get(API.ATTENDANCE.SALARY_REPORT, {
      params,
      responseType: "blob",
    }),
};