import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const masterApi = {
  // Departments
  listDepartments: (params) =>
    axiosClient.get(API.MASTER.DEPARTMENTS, { params }),
  createDepartment: (payload) =>
    axiosClient.post(API.MASTER.DEPARTMENTS, payload),
  updateDepartment: (id, payload) =>
    axiosClient.put(API.MASTER.DEPARTMENT_UPDATE(id), payload),
  deactivateDepartment: (id) =>
    axiosClient.delete(API.MASTER.DEPARTMENT_DELETE(id)),

  // Designations
  listDesignations: (params) =>
    axiosClient.get(API.MASTER.DESIGNATIONS, { params }),
  createDesignation: (payload) =>
    axiosClient.post(API.MASTER.DESIGNATIONS, payload),
  updateDesignation: (id, payload) =>
    axiosClient.put(API.MASTER.DESIGNATION_UPDATE(id), payload),
  deactivateDesignation: (id) =>
    axiosClient.delete(API.MASTER.DESIGNATION_DELETE(id)),

  // Leave Types
  listLeaveTypes: (params) =>
    axiosClient.get(API.MASTER.LEAVE_TYPES, { params }),
  createLeaveType: (payload) =>
    axiosClient.post(API.MASTER.LEAVE_TYPES, payload),
  updateLeaveType: (id, payload) =>
    axiosClient.put(API.MASTER.LEAVE_TYPE_UPDATE(id), payload),
  deactivateLeaveType: (id) =>
    axiosClient.delete(API.MASTER.LEAVE_TYPE_DELETE(id)),

  // Holidays
  listHolidays: (params) => axiosClient.get(API.MASTER.HOLIDAYS, { params }),
  createHoliday: (payload) => axiosClient.post(API.MASTER.HOLIDAYS, payload),
  updateHoliday: (id, payload) => axiosClient.put(API.MASTER.HOLIDAY_UPDATE(id), payload),
  deactivateHoliday: (id) => axiosClient.delete(API.MASTER.HOLIDAY_DELETE(id)),
};

export const holidayApi = {
  list: masterApi.listHolidays,
  create: masterApi.createHoliday,
  update: masterApi.updateHoliday,
  remove: masterApi.deactivateHoliday,
};
