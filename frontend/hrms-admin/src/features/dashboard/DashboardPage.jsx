import { useDashboardStats } from "./useDashboardStats";
import { useAttendanceTrend } from "./useAttendanceTrend";
import { useLeaveStatusBreakdown } from "./useLeaveStatusBreakdown";
import CountsSummary from "./components/CountsSummary";
import AttendanceTrendChart from "./components/AttendanceTrendChart";
import LeaveStatusChart from "./components/LeaveStatusChart";
import MyStatusSummary from "./components/MyStatusSummary";
import MyAttendanceCalendar from "./components/MyAttendanceCalendar";
import RadialStat from "./components/RadialStat";
import RecentLeaves from "./components/RecentLeaves";
import MyRecentAttendance from "./components/MyRecentAttendance";
import FinanceMtdCard from "./components/FinanceMtdCard";
import { getUser } from "@/utils/tokenHelpers";

function leaveApprovalRate(breakdown) {
  const rows = breakdown || [];

  const total = rows.reduce(
    (sum, d) => sum + (d.count || 0),
    0
  );

  if (!total) return undefined;

  const approved =
    rows.find((d) => d.status === "Approved")?.count || 0;

  return (approved / total) * 100;
}

const SparkleIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-5 w-5"
  >
    <path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2Z" />
    <path d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export default function DashboardPage() {
  const user = getUser();

  const isAdmin = user?.role === "admin";
  const employeeId = user?.employee?.id;

  const stats = useDashboardStats({
    enabled: isAdmin,
  });

  const trend = useAttendanceTrend(
    7,
    isAdmin ? undefined : employeeId
  );

  const leaveBreakdown = useLeaveStatusBreakdown();

  const attendanceRate =
    stats.data?.active_employees
      ? (stats.data.present_today /
          stats.data.active_employees) *
        100
      : undefined;

  const approvalRate = leaveApprovalRate(
    leaveBreakdown.data
  );

  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 17
      ? "Good afternoon"
      : "Good evening";

  return (
    <div className="space-y-6 pb-8">
      {/* PAGE HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-gradient-to-br from-white via-primary-50/40 to-accent-50/30 dark:from-primary-500/[0.07] dark:via-white/[0.02] dark:to-accent-500/[0.06] shadow-sm">
        {/* ambient glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-48 w-48 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-xl bg-primary-500/20 blur-lg" />

                <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 border border-primary-500/15 text-primary-600 dark:text-primary-300">
                  <SparkleIcon />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {greeting}, {user?.username || "User"}
                  </h1>

                  <span className="hidden sm:inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
                </div>

                <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Here’s what’s happening across your HR workspace today.
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.035] px-3 py-2">
              <CalendarIcon />

              <div className="leading-tight">
                <p className="text-[9px] uppercase tracking-[0.15em] font-semibold text-slate-400 dark:text-slate-500">
                  Today
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN DASHBOARD */}
      {isAdmin ? (
        <>
          {stats.isError && (
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                <span className="font-medium">
                  Failed to load dashboard statistics. Please try again.
                </span>
              </div>
            </div>
          )}

          {/* MAIN KPI AREA */}
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Workforce overview
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time HR activity at a glance
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live data
              </div>
            </div>

            <CountsSummary
              stats={stats.data}
              loading={stats.isLoading}
            />
          </div>

          {/* FINANCE */}
          {(user?.role === "admin" ||
            user?.role === "finance") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FinanceMtdCard />
            </div>
          )}

          {/* RADIAL STATS */}
          <div>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Performance indicators
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl transition-transform duration-200 hover:-translate-y-0.5">
                <RadialStat
                  title="Attendance rate"
                  percent={attendanceRate}
                  loading={stats.isLoading}
                  color="success"
                  caption={
                    stats.data
                      ? `${stats.data.present_today ?? 0} of ${
                          stats.data.active_employees ?? 0
                        } active employees present today`
                      : undefined
                  }
                />
              </div>

              <div className="rounded-2xl transition-transform duration-200 hover:-translate-y-0.5">
                <RadialStat
                  title="Leave approval rate"
                  percent={approvalRate}
                  loading={leaveBreakdown.isLoading}
                  color="accent"
                  caption="Share of leave requests approved"
                />
              </div>
            </div>
          </div>

          {/* ANALYTICS */}
          <div>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Analytics
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Attendance and leave activity trends
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="transition-transform duration-200 hover:-translate-y-0.5">
                <AttendanceTrendChart
                  data={trend.data}
                  loading={trend.isLoading}
                />
              </div>

              <div className="transition-transform duration-200 hover:-translate-y-0.5">
                <LeaveStatusChart
                  data={leaveBreakdown.data}
                  loading={leaveBreakdown.isLoading}
                />
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}
          <div>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                Recent activity
              </p>
            </div>

            <div className="transition-transform duration-200 hover:-translate-y-0.5">
              <RecentLeaves />
            </div>
          </div>
        </>
      ) : (
        /* EMPLOYEE DASHBOARD */
        <div className="space-y-6">
          <div>
            <div className="mb-3">
              <p className="section-label">Your workspace</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Your attendance, leave and recent HR activity
              </p>
            </div>

            <MyStatusSummary />
          </div>

          <div>
            <div className="mb-3">
              <p className="section-label">Calendar</p>
            </div>

            <MyAttendanceCalendar />
          </div>

          <div>
            <div className="mb-3">
              <p className="section-label">Personal analytics</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="transition-transform duration-200 hover:-translate-y-0.5">
                <AttendanceTrendChart
                  data={trend.data}
                  loading={trend.isLoading}
                  title="Your check-ins — last 7 days"
                />
              </div>

              <div className="transition-transform duration-200 hover:-translate-y-0.5">
                <LeaveStatusChart
                  data={leaveBreakdown.data}
                  loading={leaveBreakdown.isLoading}
                  title="Your leave requests"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3">
              <p className="section-label">Recent activity</p>
            </div>

            <div className="transition-transform duration-200 hover:-translate-y-0.5">
              <MyRecentAttendance title="Your recent check-in / check-out" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}