import { useDashboardStats } from "./useDashboardStats";
import { useAttendanceTrend } from "./useAttendanceTrend";
import { useLeaveStatusBreakdown } from "./useLeaveStatusBreakdown";
import CountsSummary from "./components/CountsSummary";
import AttendanceTrendChart from "./components/AttendanceTrendChart";
import LeaveStatusChart from "./components/LeaveStatusChart";
import MyStatusSummary from "./components/MyStatusSummary";
import RadialStat from "./components/RadialStat";
import RecentLeaves from "./components/RecentLeaves";
import FinanceMtdCard from "./components/FinanceMtdCard";
import { getUser } from "@/utils/tokenHelpers";

function leaveApprovalRate(breakdown) {
  const rows = breakdown || [];
  const total = rows.reduce((sum, d) => sum + (d.count || 0), 0);
  if (!total) return undefined;
  const approved = rows.find((d) => d.status === "Approved")?.count || 0;
  return (approved / total) * 100;
}

export default function DashboardPage() {
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const employeeId = user?.employee?.id;

  const stats = useDashboardStats({ enabled: isAdmin });
  const trend = useAttendanceTrend(7, isAdmin ? undefined : employeeId);
  const leaveBreakdown = useLeaveStatusBreakdown();

  const attendanceRate =
    stats.data?.active_employees ? (stats.data.present_today / stats.data.active_employees) * 100 : undefined;
  const approvalRate = leaveApprovalRate(leaveBreakdown.data);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-9 w-9 shrink-0 text-violet-400"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
        </svg>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, {user?.username || "User"}! Here's an overview of your HRMS.
          </p>
        </div>
      </div>

      {isAdmin ? (
        <>
          {stats.isError && (
            <div className="card p-4 text-red-600 dark:text-red-400 mb-4">
              Failed to load dashboard stats. Please try again.
            </div>
          )}
          <CountsSummary stats={stats.data} loading={stats.isLoading} />

          {(user?.role === "admin" || user?.role === "finance") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <FinanceMtdCard />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <RadialStat
              title="Attendance rate"
              percent={attendanceRate}
              loading={stats.isLoading}
              color="success"
              caption={
                stats.data
                  ? `${stats.data.present_today ?? 0} of ${stats.data.active_employees ?? 0} active employees present today`
                  : undefined
              }
            />
            <RadialStat
              title="Leave approval rate"
              percent={approvalRate}
              loading={leaveBreakdown.isLoading}
              color="accent"
              caption="Share of leave requests approved"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <AttendanceTrendChart data={trend.data} loading={trend.isLoading} />
            <LeaveStatusChart data={leaveBreakdown.data} loading={leaveBreakdown.isLoading} />
          </div>

          <div className="mt-4">
            <RecentLeaves />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <MyStatusSummary />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AttendanceTrendChart
              data={trend.data}
              loading={trend.isLoading}
              title="Your check-ins — last 7 days"
            />
            <LeaveStatusChart
              data={leaveBreakdown.data}
              loading={leaveBreakdown.isLoading}
              title="Your leave requests"
            />
          </div>

          <RecentLeaves title="Your recent leave requests" />
        </div>
      )}
    </div>
  );
}
