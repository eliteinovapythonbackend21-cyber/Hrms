import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const attendanceApi = {
  /**
   * Attendance list
   */
  list: (params = {}) =>
    axiosClient.get(API.ATTENDANCE.LIST, {
      params,
    }),

  /**
   * Monthly Finance Attendance Summary
   *
   * Returns:
   * - Present days
   * - Absent days
   * - Approved leave days
   * - Paid leave days
   * - Unpaid leave days
   * - Government holidays
   * - Office holidays
   * - Worked hours
   * - Gross salary
   * - Leave deduction
   * - Absent deduction
   * - Total deduction
   * - Net salary
   */
  monthlySummary: (params = {}) =>
    axiosClient.get(API.ATTENDANCE.MONTHLY_SUMMARY, {
      params: {
        month: params.month,
        year: params.year,

        ...(params.employee_id
          ? {
              employee_id: params.employee_id,
            }
          : {}),

        ...(params.department_id
          ? {
              department_id: params.department_id,
            }
          : {}),

        ...(params.search
          ? {
              search: params.search,
            }
          : {}),

        ...(params.holiday_type
          ? {
              holiday_type: params.holiday_type,
            }
          : {}),
      },
    }),

  /**
   * Monthly attendance report
   *
   * Used for PDF / Excel / report downloads
   * depending on the backend endpoint configuration.
   */
  report: (params = {}) =>
    axiosClient.get(API.ATTENDANCE.REPORT, {
      params: {
        month: params.month,
        year: params.year,

        ...(params.employee_id
          ? {
              employee_id: params.employee_id,
            }
          : {}),

        ...(params.department_id
          ? {
              department_id: params.department_id,
            }
          : {}),

        ...(params.search
          ? {
              search: params.search,
            }
          : {}),
      },
      responseType: "blob",
    }),

  /**
   * Salary impact report
   *
   * Includes:
   * - Gross salary
   * - Leave deduction
   * - Absent deduction
   * - Total deduction
   * - Net salary
   */
  salaryReport: (params = {}) =>
    axiosClient.get(API.ATTENDANCE.SALARY_REPORT, {
      params: {
        month: params.month,
        year: params.year,

        ...(params.employee_id
          ? {
              employee_id: params.employee_id,
            }
          : {}),

        ...(params.department_id
          ? {
              department_id: params.department_id,
            }
          : {}),

        ...(params.search
          ? {
              search: params.search,
            }
          : {}),
      },
      responseType: "blob",
    }),
};