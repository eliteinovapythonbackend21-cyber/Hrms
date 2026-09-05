import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const employeesApi = {
  list: (params) => axiosClient.get(API.EMPLOYEES.LIST, { params }),
  crmDirectory: () => axiosClient.get(API.EMPLOYEES.CRM_DIRECTORY),
  create: (payload) => axiosClient.post(API.EMPLOYEES.CREATE, payload),
  get: (id) => axiosClient.get(API.EMPLOYEES.GET(id)),
  update: (id, payload) => axiosClient.put(API.EMPLOYEES.UPDATE(id), payload),
  deactivate: (id) => axiosClient.delete(API.EMPLOYEES.DELETE(id)),
  listSalaries: (params) => axiosClient.get(API.EMPLOYEES.SALARY_LIST, { params }),
  getSalary: (id) => axiosClient.get(API.EMPLOYEES.SALARY_GET(id)),
  updateSalary: (id, payload) => axiosClient.put(API.EMPLOYEES.SALARY_UPDATE(id), payload),
  resetSalary: (id) => axiosClient.delete(API.EMPLOYEES.SALARY_RESET(id)),
  getPayslip: (id, params) => axiosClient.get(API.EMPLOYEES.PAYSLIP(id), { params }),
  checkin: (payload) => axiosClient.post(API.EMPLOYEES.CHECKIN, payload),
  checkout: (payload) => axiosClient.post(API.EMPLOYEES.CHECKOUT, payload),
  resetAttendance: (payload) => axiosClient.post(API.EMPLOYEES.ATTENDANCE_RESET, payload),
  manualAttendance: (payload) => axiosClient.post(API.EMPLOYEES.MANUAL_ATTENDANCE, payload),
  listManualAttendance: (params) => axiosClient.get(API.EMPLOYEES.MANUAL_ATTENDANCE, { params }),
  updateManualAttendance: (id, payload) => axiosClient.put(API.EMPLOYEES.MANUAL_ATTENDANCE_ITEM(id), payload),
  deactivateManualAttendance: (id) => axiosClient.delete(API.EMPLOYEES.MANUAL_ATTENDANCE_ITEM(id)),
  attendance: (id, params) => axiosClient.get(API.EMPLOYEES.ATTENDANCE(id), { params }),
};
