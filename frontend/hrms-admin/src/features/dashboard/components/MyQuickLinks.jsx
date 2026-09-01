import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { attendanceApi } from "@/api/attendance.api";
import { leavesApi } from "@/api/leaves.api";
import { holidayApi, masterApi } from "@/api/master.api";
import { getUser } from "@/utils/tokenHelpers";
import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";

function toISODate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Quick-access cards mirroring the employee sidebar's "My Attendance" /
// "My Holidays" sections, shown on the Dashboard in place of the raw
// Calendar widget (which now lives on its own "My Holidays ▸ Calendar"
// page). Same set for every "employee"-role login — Normal, CRM and HR
// department employees alike. Each card shows a live count for the
// current month, narrowed by the Company/Branch/Department/Designation
// filters above — for a normal/CRM employee that just confirms/narrows
// their own records, for an HR-department employee (already a
// privileged, org-wide viewer on the backend) it meaningfully filters.
export default function MyQuickLinks() {
  const user = getUser();
  const employeeId = user?.employee?.id;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStart = toISODate(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = toISODate(year, month, daysInMonth);

  /*
   * ORGANIZATION FILTERS — Company → Branch → Department → Designation,
   * same cascading pattern as MyAttendanceCalendar.jsx.
   */

  const [companyFilterId, setCompanyFilterId] = useState("");
  const [branchFilterId, setBranchFilterId] = useState("");
  const [departmentFilterId, setDepartmentFilterId] = useState("");
  const [designationFilterId, setDesignationFilterId] = useState("");

  const { data: companyData, isLoading: companiesLoading } = useCompanies({
    page: 1,
    per_page: 1000,
    is_active: true,
  });
  const filterCompanies = companyData?.items || companyData?.data || [];

  const { data: branchData, isLoading: branchesLoading } = useCompanyBranches(
    companyFilterId || undefined,
    { page: 1, per_page: 1000, is_active: true }
  );
  const filterBranches = branchData?.items || branchData?.data || [];

  const { data: departmentData, isLoading: departmentsLoading } = useQuery({
    queryKey: ["quick-links-filter-departments", companyFilterId, branchFilterId],
    queryFn: async () => {
      const res = await masterApi.listDepartments({
        company_id: companyFilterId ? Number(companyFilterId) : undefined,
        branch_id: branchFilterId ? Number(branchFilterId) : undefined,
        page: 1,
        per_page: 1000,
        is_active: true,
      });
      return res?.data?.data || res?.data || {};
    },
    enabled: !!branchFilterId,
  });
  const filterDepartments = departmentData?.items || departmentData?.data || [];

  const { data: designationData, isLoading: designationsLoading } = useQuery({
    queryKey: ["quick-links-filter-designations", departmentFilterId],
    queryFn: async () => {
      const res = await masterApi.listDesignations({
        department_id: departmentFilterId ? Number(departmentFilterId) : undefined,
        page: 1,
        per_page: 1000,
        is_active: true,
      });
      return res?.data?.data || res?.data || {};
    },
    enabled: !!departmentFilterId,
  });
  const filterDesignations = designationData?.items || designationData?.data || [];

  const handleCompanyFilterChange = (e) => {
    setCompanyFilterId(e.target.value);
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };
  const handleBranchFilterChange = (e) => {
    setBranchFilterId(e.target.value);
    setDepartmentFilterId("");
    setDesignationFilterId("");
  };
  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilterId(e.target.value);
    setDesignationFilterId("");
  };
  const handleDesignationFilterChange = (e) => setDesignationFilterId(e.target.value);

  const orgFilterParams = {
    company_id: companyFilterId ? Number(companyFilterId) : undefined,
    branch_id: branchFilterId ? Number(branchFilterId) : undefined,
    department_id: departmentFilterId ? Number(departmentFilterId) : undefined,
    designation_id: designationFilterId ? Number(designationFilterId) : undefined,
  };

  /*
   * COUNTS — one lightweight query per card, all scoped to this month
   * and narrowed by the org filters above.
   */

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["quick-links-attendance", employeeId, monthStart, monthEnd, orgFilterParams],
    queryFn: async () => {
      const res = await attendanceApi.list({
        employee_id: employeeId,
        from_date: monthStart,
        to_date: monthEnd,
        per_page: 1,
        ...orgFilterParams,
      });
      return res.data?.data || {};
    },
    enabled: !!employeeId,
  });

  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ["quick-links-leaves", employeeId, monthStart, monthEnd, orgFilterParams],
    queryFn: async () => {
      const res = await leavesApi.list({
        employee_id: employeeId,
        from_date: monthStart,
        to_date: monthEnd,
        per_page: 1,
        ...orgFilterParams,
      });
      return res.data?.data || {};
    },
    enabled: !!employeeId,
  });

  const { data: holidaysData, isLoading: holidaysLoading } = useQuery({
    queryKey: ["quick-links-holidays", year],
    queryFn: async () => {
      const res = await holidayApi.list({ per_page: 1000, is_active: "true" });
      return res.data?.data?.items || [];
    },
  });

  const { data: leaveTypeData, isLoading: leaveTypesLoading } = useQuery({
    queryKey: ["quick-links-leave-types"],
    queryFn: async () => {
      const res = await masterApi.listLeaveTypes({ page: 1, per_page: 1, is_active: true });
      return res?.data?.data || {};
    },
  });

  const holidaysThisMonth = (holidaysData || []).filter((holiday) => {
    const key = String(holiday.holiday_date || "").slice(0, 10);
    return key >= monthStart && key <= monthEnd;
  }).length;

  const attendanceCount = attendanceData?.total ?? 0;
  const leaveCount = leaveData?.total ?? 0;
  const holidaysCount = holidaysThisMonth;
  const leaveTypeCount = leaveTypeData?.total ?? 0;
  const calendarCount = attendanceCount + leaveCount + holidaysCount;

  const filtersLoading = companiesLoading || branchesLoading || departmentsLoading || designationsLoading;

  const links = [
    {
      label: "Attendance",
      description: "Records this month",
      path: "/attendance",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      count: attendanceCount,
      loading: attendanceLoading,
    },
    {
      label: "Leave",
      description: "Requests this month",
      path: "/leaves",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      count: leaveCount,
      loading: leaveLoading,
    },
    {
      label: "Calendar",
      description: "Events this month",
      path: "/my-calendar",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      count: calendarCount,
      loading: attendanceLoading || leaveLoading || holidaysLoading,
    },
    {
      label: "Holidays",
      description: "This month",
      path: "/holidays",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      count: holidaysCount,
      loading: holidaysLoading,
    },
    {
      label: "Leave Type",
      description: "Active categories",
      path: "/leave-types",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      count: leaveTypeCount,
      loading: leaveTypesLoading,
    },
  ];

  return (
    <div className="space-y-3">
      {/* ORGANIZATION FILTERS */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select
          value={companyFilterId}
          onChange={handleCompanyFilterChange}
          disabled={companiesLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">All Companies</option>
          {filterCompanies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>

        <select
          value={branchFilterId}
          onChange={handleBranchFilterChange}
          disabled={!companyFilterId || branchesLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">
            {!companyFilterId ? "Select Company First" : branchesLoading ? "Loading..." : "All Branches"}
          </option>
          {filterBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>

        <select
          value={departmentFilterId}
          onChange={handleDepartmentFilterChange}
          disabled={!branchFilterId || departmentsLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">
            {!branchFilterId ? "Select Branch First" : departmentsLoading ? "Loading..." : "All Departments"}
          </option>
          {filterDepartments.map((department) => (
            <option key={department.id} value={department.id}>{department.department_name}</option>
          ))}
        </select>

        <select
          value={designationFilterId}
          onChange={handleDesignationFilterChange}
          disabled={!departmentFilterId || designationsLoading}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
        >
          <option value="">
            {!departmentFilterId ? "Select Department First" : designationsLoading ? "Loading..." : "All Designations"}
          </option>
          {filterDesignations.map((designation) => (
            <option key={designation.id} value={designation.id}>{designation.designation_name || designation.name}</option>
          ))}
        </select>
      </div>

      {/* QUICK LINK CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="group card-elevated flex flex-col gap-2 p-4 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-500/15 bg-primary-500/10 text-primary-600 dark:text-primary-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
              </div>

              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {link.loading ? "-" : link.count}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{link.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
