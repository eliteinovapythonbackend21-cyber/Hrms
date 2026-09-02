import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { attendanceApi } from "@/api/attendance.api";
import { leavesApi } from "@/api/leaves.api";
import { holidayApi, masterApi } from "@/api/master.api";
import { getUser } from "@/utils/tokenHelpers";

function toISODate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Quick-access cards mirroring the employee sidebar's "My Attendance" /
// "My Holidays" sections. Each shows a live count for the current month,
// scoped to the logged-in employee's own records.
export default function MyQuickLinks() {
  const user = getUser();
  const employeeId = user?.employee?.id;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStart = toISODate(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthEnd = toISODate(year, month, daysInMonth);

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ["quick-links-attendance", employeeId, monthStart, monthEnd],
    queryFn: async () => {
      const res = await attendanceApi.list({
        employee_id: employeeId,
        from_date: monthStart,
        to_date: monthEnd,
        per_page: 1,
      });
      return res.data?.data || {};
    },
    enabled: !!employeeId,
  });

  const { data: leaveData, isLoading: leaveLoading } = useQuery({
    queryKey: ["quick-links-leaves", employeeId, monthStart, monthEnd],
    queryFn: async () => {
      const res = await leavesApi.list({
        employee_id: employeeId,
        from_date: monthStart,
        to_date: monthEnd,
        per_page: 1,
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
  );
}
