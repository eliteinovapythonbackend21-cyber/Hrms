import axiosClient from "./axiosClient";

import { API } from "./endpoints";

export const attendanceApi = {
  /*
   * ==========================================================
   * GET ATTENDANCE RECORDS
   * ==========================================================
   */

  list: (params) =>
    axiosClient.get(
      API.ATTENDANCE.LIST,
      {
        params,
      }
    ),

  /*
   * ==========================================================
   * MONTHLY ATTENDANCE SUMMARY
   * ==========================================================
   */

  monthlySummary: (params) =>
    axiosClient.get(
      API.ATTENDANCE.MONTHLY_SUMMARY,
      {
        params,
      }
    ),

  /*
   * ==========================================================
   * ATTENDANCE REPORT
   * ==========================================================
   */

  report: (params) =>
    axiosClient.get(
      API.ATTENDANCE.REPORT,
      {
        params,
        responseType: "blob",
      }
    ),

  /*
   * ==========================================================
   * EXISTING SALARY REPORT
   * ==========================================================
   *
   * Used temporarily by the Monthly Payslip Report UI.
   *
   * ==========================================================
   */

  salaryReport: (params) =>
    axiosClient.get(
      API.ATTENDANCE.SALARY_REPORT,
      {
        params,
        responseType: "blob",
      }
    ),
};