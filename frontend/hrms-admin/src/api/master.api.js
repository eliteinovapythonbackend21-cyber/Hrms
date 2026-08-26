import axiosClient from "./axiosClient";
import { API } from "./endpoints";

export const masterApi = {

  // ============================================================
  // Companies
  // ============================================================

  listCompanies: (params) =>
    axiosClient.get(
      API.MASTER.COMPANIES,
      { params }
    ),

  getCompany: (id) =>
    axiosClient.get(
      API.MASTER.COMPANY_GET(id)
    ),

  createCompany: (payload) =>
    axiosClient.post(
      API.MASTER.COMPANIES,
      payload
    ),

  updateCompany: (
    id,
    payload
  ) =>
    axiosClient.put(
      API.MASTER.COMPANY_UPDATE(id),
      payload
    ),

  deactivateCompany: (id) =>
    axiosClient.delete(
      API.MASTER.COMPANY_DELETE(id)
    ),


  // ============================================================
  // Branches
  // ============================================================

  listBranches: (params) =>
    axiosClient.get(
      API.MASTER.BRANCHES,
      { params }
    ),

  getBranch: (id) =>
    axiosClient.get(
      API.MASTER.BRANCH_GET(id)
    ),

  listCompanyBranches: (
    companyId,
    params
  ) =>
    axiosClient.get(
      API.MASTER.COMPANY_BRANCHES(
        companyId
      ),
      { params }
    ),

  createBranch: (
    companyId,
    payload
  ) =>
    axiosClient.post(
      API.MASTER.COMPANY_BRANCHES(
        companyId
      ),
      payload
    ),

  updateBranch: (
    id,
    payload
  ) =>
    axiosClient.put(
      API.MASTER.BRANCH_UPDATE(id),
      payload
    ),

  deactivateBranch: (id) =>
    axiosClient.delete(
      API.MASTER.BRANCH_DELETE(id)
    ),


  // ============================================================
  // Departments
  // ============================================================

  listDepartments: (params) =>
    axiosClient.get(
      API.MASTER.DEPARTMENTS,
      { params }
    ),

  createDepartment: (payload) =>
    axiosClient.post(
      API.MASTER.DEPARTMENTS,
      payload
    ),

  updateDepartment: (
    id,
    payload
  ) =>
    axiosClient.put(
      API.MASTER.DEPARTMENT_UPDATE(id),
      payload
    ),

  deactivateDepartment: (id) =>
    axiosClient.delete(
      API.MASTER.DEPARTMENT_DELETE(id)
    ),


  // ============================================================
  // Designations
  // ============================================================

  listDesignations: (params) =>
    axiosClient.get(
      API.MASTER.DESIGNATIONS,
      { params }
    ),

  createDesignation: (payload) =>
    axiosClient.post(
      API.MASTER.DESIGNATIONS,
      payload
    ),

  updateDesignation: (
    id,
    payload
  ) =>
    axiosClient.put(
      API.MASTER.DESIGNATION_UPDATE(id),
      payload
    ),

  deactivateDesignation: (id) =>
    axiosClient.delete(
      API.MASTER.DESIGNATION_DELETE(id)
    ),


  // ============================================================
  // Leave Types
  // ============================================================

  listLeaveTypes: (params) =>
    axiosClient.get(
      API.MASTER.LEAVE_TYPES,
      { params }
    ),

  createLeaveType: (payload) =>
    axiosClient.post(
      API.MASTER.LEAVE_TYPES,
      payload
    ),

  updateLeaveType: (
    id,
    payload
  ) =>
    axiosClient.put(
      API.MASTER.LEAVE_TYPE_UPDATE(id),
      payload
    ),

  deactivateLeaveType: (id) =>
    axiosClient.delete(
      API.MASTER.LEAVE_TYPE_DELETE(id)
    ),


  // ============================================================
  // Holidays
  // ============================================================

  listHolidays: (params) =>
    axiosClient.get(
      API.MASTER.HOLIDAYS,
      { params }
    ),

  createHoliday: (payload) =>
    axiosClient.post(
      API.MASTER.HOLIDAYS,
      payload
    ),

  updateHoliday: (
    id,
    payload
  ) =>
    axiosClient.put(
      API.MASTER.HOLIDAY_UPDATE(id),
      payload
    ),

  deactivateHoliday: (id) =>
    axiosClient.delete(
      API.MASTER.HOLIDAY_DELETE(id)
    ),


  // ============================================================
  // Government Holiday Sync
  // ============================================================

  syncGovernmentHolidays: (
    year,
    countryCode = "IN"
  ) =>
    axiosClient.post(
      API.MASTER.HOLIDAY_SYNC_GOVERNMENT,
      {
        year,
        country_code:
          countryCode,
      }
    ),
  

  unsyncGovernmentHolidays: (
    year,
    countryCode = "IN"
  ) =>
    axiosClient.post(
      API.MASTER.HOLIDAY_UNSYNC_GOVERNMENT,
      {
        year,
        country_code:
          countryCode,
      }
    ),

  // ============================================================
  // Government Holiday Preview
  // ============================================================

  previewGovernmentHolidays: (
    year,
    countryCode = "IN"
  ) =>
    axiosClient.get(
      API.MASTER.HOLIDAY_PREVIEW_GOVERNMENT,
      {
        params: {
          year,
          country_code:
            countryCode,
        },
      }
    ),
};


// ============================================================
// HOLIDAY API
// ============================================================

export const holidayApi = {

  list:
    masterApi.listHolidays,

  create:
    masterApi.createHoliday,

  update:
    masterApi.updateHoliday,

  remove:
    masterApi.deactivateHoliday,

  syncGovernmentHolidays:
    masterApi.syncGovernmentHolidays,
  
  unsyncGovernmentHolidays:
    masterApi.unsyncGovernmentHolidays,

  previewGovernment:
    masterApi.previewGovernmentHolidays,

  // Compatibility aliases
  syncGovernment:
    masterApi.syncGovernmentHolidays,

  previewGovernmentHolidays:
    masterApi.previewGovernmentHolidays,
};