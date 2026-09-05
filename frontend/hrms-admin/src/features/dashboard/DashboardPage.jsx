import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useIsCrmEmployee } from "@/hooks/useIsCrmEmployee";
import { useIsHrEmployee } from "@/hooks/useIsHrEmployee";
import { useIsFinanceEmployee } from "@/hooks/useIsFinanceEmployee";
import { employeesApi } from "@/api/employees.api";
import { getUser } from "@/utils/tokenHelpers";
import { crmApi } from "@/api/crm.api";
import { employeeLifecycleApi } from "@/api/employee.api";
import { attendanceApi } from "@/api/attendance.api";
import { leavesApi } from "@/api/leaves.api";

import { useDashboardStats } from "./useDashboardStats";
import { useAttendanceTrend } from "./useAttendanceTrend";
import { useLeaveStatusBreakdown } from "./useLeaveStatusBreakdown";
import CountsSummary from "./components/CountsSummary";
import AttendanceTrendChart from "./components/AttendanceTrendChart";
import LeaveStatusChart from "./components/LeaveStatusChart";
import MyQuickLinks from "./components/MyQuickLinks";
import CheckInOutWidget from "@/features/attendance/CheckInOutWidget";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import RadialStat from "./components/RadialStat";
import RecentLeaves from "./components/RecentLeaves";
import MyRecentAttendance from "./components/MyRecentAttendance";
import FinanceMtdCard from "./components/FinanceMtdCard";
import { use3DTilt, Motion3DStyles } from "@/hooks/use3DMotion";

/* =========================================================
   HELPERS
========================================================= */

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

/* =========================================================
   ICONS
========================================================= */

const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2Z" />
    <path d="m19 16-.6 2.4L16 19l2.4.6L19 22l.6-2.4L22 19l-2.4-.6Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 0 0-3-3.87M9 20H4v-1a4 4 0 0 1 3-3.87m5-3a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 3a4 4 0 1 0-8 0" />
  </svg>
);

const GaugeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 13a7 7 0 0 1 7-7M12 13 8 9M4 18a9 9 0 1 1 16 0" />
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15l3-3 3 2 4-5" />
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 8-6-16-3 8H2" />
  </svg>
);

const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </svg>
);

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2m0 0v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0h-4a2 2 0 0 0 0 4h4V8Z" />
  </svg>
);

/* =========================================================
   SECTION HEADING
   Gradient icon tile + accent bar + title / subtitle, with an
   optional right-aligned slot. Gives every dashboard block the
   same polished header rhythm.
========================================================= */

function SectionHeading({
  icon,
  title,
  subtitle,
  tone = "primary",
  right,
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`icon-tile icon-tile-${tone} h-9 w-9`}>
          {icon}
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-primary-400 to-primary-600" />
            <h2 className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
          </div>

          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* =========================================================
   NAV SHORTCUT GRID
   Surfaces a department-scoped employee's sidebar sub-menu
   (CRM / HR) as quick-jump cards on the dashboard so the same
   destinations are one click away from the landing page.
========================================================= */

const NAV_ICON_PATHS = {
  employees:
    "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4m4 4a4 4 0 10-4-4",
  crm: "M3 7h18M3 12h18M3 17h12",
  attendance:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  leaves:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  employeeLifecycle:
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

function NavGlyph({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={NAV_ICON_PATHS[name] || NAV_ICON_PATHS.crm}
      />
    </svg>
  );
}

const NAV_TONE_STRIP = {
  primary:
    "bg-gradient-to-r from-primary-500 via-primary-400 to-transparent",
  accent:
    "bg-gradient-to-r from-accent-500 via-accent-400 to-transparent",
};

/* ---------------------------------------------------------
   Presentational card grid — one card per workspace screen,
   showing a live record count on the right.
--------------------------------------------------------- */
function WorkspaceCard({ card, tone, index }) {
  const { ref, handlers } = use3DTilt({ max: 9, scale: 1.02 });

  return (
    <div
      className="u-tilt-perspective u-rise"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <Link
        ref={ref}
        {...handlers}
        to={card.path}
        className="u-tilt u-glare group card relative flex items-center gap-3 overflow-hidden p-4"
      >
        <span
          className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 ${
            NAV_TONE_STRIP[tone] || NAV_TONE_STRIP.primary
          }`}
        />

        <span
          className={`u-tilt-content icon-tile h-10 w-10 transition-transform duration-300 group-hover:scale-110 ${
            tone === "accent"
              ? "icon-tile-accent"
              : "icon-tile-primary"
          }`}
        >
          <NavGlyph name={card.icon} />
        </span>

        <span className="u-tilt-content min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {card.label}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-slate-500">
            {card.hint}
          </span>
        </span>

        <span className="u-float-layer shrink-0 bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-xl font-bold tabular-nums text-transparent dark:from-white dark:to-slate-400">
          {card.loading ? "–" : card.count}
        </span>
      </Link>
    </div>
  );
}

function WorkspaceCardGrid({ cards = [], tone = "primary" }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card, i) => (
        <WorkspaceCard key={card.path} card={card} tone={tone} index={i} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   Data components — one lightweight `per_page: 1` list query
   per card, reading the paginated envelope's `total`.
--------------------------------------------------------- */
function useTotal(key, listFn, params) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-workspace-count", key, params],
    queryFn: async () =>
      (await listFn({ per_page: 1, ...params })).data.data,
    staleTime: 60_000,
  });
  return { count: data?.total ?? 0, loading: isLoading };
}

/* ---------------------------------------------------------
   Weekly / Monthly / Quarterly incentive breakdown — CRM employee's
   own current-period target, registrations, incentive slab/amount,
   payout status, and (Paid-only) invoice flag. Backed by
   GET /incentives/period-summary (incentive_engine.dashboard_period_summary).
--------------------------------------------------------- */
const PERIOD_TABS = ["Weekly", "Monthly", "Quarterly"];

function StatBlock({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
}

function CrmPeriodSummaryCard() {
  const [period, setPeriod] = useState("Weekly");

  const { data, isLoading } = useQuery({
    queryKey: ["crm-incentive-period-summary", period],
    queryFn: async () => (await crmApi.incentives.periodSummary({ period })).data.data,
    staleTime: 60_000,
  });

  const breakdownLabels =
    period === "Monthly"
      ? ["1st Week", "2nd Week", "3rd Week", "4th Week"]
      : period === "Quarterly"
      ? ["1st Month", "2nd Month", "3rd Month"]
      : [];

  const breakdownValues =
    period === "Monthly" ? data?.week_breakdown : period === "Quarterly" ? data?.month_breakdown : [];

  const slabEntries = data?.incentive_slab ? Object.entries(data.incentive_slab) : [];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            Weekly / Monthly / Quarterly Incentive
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Your current-period target, registrations and incentive figures
          </p>
        </div>

        <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPeriod(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                period === tab
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 py-6 text-center text-xs text-slate-400">Loading...</div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBlock label="Target Registration" value={data?.target_registration ?? 0} />
            <StatBlock label="Registered" value={data?.actual_registration ?? 0} />
            <StatBlock
              label="Incentive Amount"
              value={`₹${Number(data?.incentive_amount || 0).toLocaleString("en-IN")}`}
            />
            <StatBlock label="Incentive Payout" value={data?.incentive_payout?.status || "Pending"} />
          </div>

          {breakdownLabels.length > 0 && (
            <div
              className={`grid grid-cols-2 gap-2 ${
                breakdownLabels.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
              }`}
            >
              {breakdownLabels.map((label, index) => (
                <StatBlock key={label} label={label} value={breakdownValues?.[index] ?? 0} />
              ))}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Incentive Slab (per plan)
            </p>
            {slabEntries.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {slabEntries.map(([plan, amount]) => (
                  <span
                    key={plan}
                    className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                  >
                    {plan}: ₹{Number(amount).toLocaleString("en-IN")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                {data?.eligible === false
                  ? "Not yet eligible for this period."
                  : "No qualifying registrations yet."}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]">
            <span className="font-medium text-slate-500 dark:text-slate-400">Incentive Invoice</span>
            <span
              className={`font-semibold ${
                data?.incentive_invoice_paid
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400"
              }`}
            >
              {data?.incentive_invoice_paid ? "Paid" : "Not available until paid"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Today's Registrations — CRM employee dashboard stat, driven by
   Meeting rows the logged-in CRM employee added today.
--------------------------------------------------------- */
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function TodayRegistrationsCard() {
  const employeeId = getUser()?.employee?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-crm-registrations-today", employeeId],
    queryFn: async () =>
      (
        await crmApi.meetings.list({
          registered_by: employeeId,
          per_page: 1000,
        })
      ).data.data,
    enabled: !!employeeId,
    staleTime: 60_000,
  });

  const rows = data?.items || [];
  const today = new Date();

  const todayCount = rows.filter((row) => {
    if (row.is_active === false) return false;
    const created = row.created_at ? new Date(row.created_at) : null;
    return created && !Number.isNaN(created.getTime()) && isSameDay(created, today);
  }).length;

  const monthCount = rows.filter((row) => {
    if (row.is_active === false) return false;
    const created = row.created_at ? new Date(row.created_at) : null;
    return (
      created &&
      !Number.isNaN(created.getTime()) &&
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth()
    );
  }).length;

  const tilt = use3DTilt({ max: 8, scale: 1.015 });

  return (
    <div className="u-tilt-perspective">
      <div
        ref={tilt.ref}
        {...tilt.handlers}
        className="u-tilt u-glare relative overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white p-5 shadow-sm dark:border-primary-500/20 dark:from-primary-500/[0.08] dark:to-white/[0.02]"
      >
        <div className="u-tilt-content flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
              Today's Registrations
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "…" : todayCount}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {isLoading ? "Loading…" : `${monthCount} this month`}
            </p>
          </div>
          <Link
            to="/crm/meetings"
            className="rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            + Add Registration
          </Link>
        </div>
      </div>
    </div>
  );
}

function HrWorkspaceCards() {
  const employeeId = getUser()?.employee?.id;

  const attendance = useTotal("hr-attendance", attendanceApi.list, {
    employee_id: employeeId,
  });
  const leaves = useTotal("hr-leaves", leavesApi.list, {
    employee_id: employeeId,
  });
  const training = useTotal("hr-training", employeeLifecycleApi.training.list);
  const permissions = useTotal("hr-permissions", employeeLifecycleApi.permissions.list);
  const overtime = useTotal("hr-overtime", employeeLifecycleApi.overtime.list);

  const cards = [
    { label: "Attendance", path: "/attendance", icon: "attendance", hint: "Your records", ...attendance },
    { label: "Leaves", path: "/leaves", icon: "leaves", hint: "Your requests", ...leaves },
    { label: "Training", path: "/employee/training", icon: "employeeLifecycle", hint: "Training programs", ...training },
    { label: "Leave Permissions", path: "/employee/permissions", icon: "employeeLifecycle", hint: "Permission requests", ...permissions },
    { label: "Overtime", path: "/employee/overtime", icon: "employeeLifecycle", hint: "Overtime records", ...overtime },
  ];

  return <WorkspaceCardGrid cards={cards} tone="accent" />;
}

function FinanceWorkspaceCards() {
  const employees = useTotal("fin-employees", employeesApi.list);
  const payroll = useTotal(
    "fin-payroll",
    employeeLifecycleApi.payroll.list
  );

  const cards = [
    {
      label: "Employees",
      path: "/master/employees",
      icon: "employees",
      hint: "Employee records",
      ...employees,
    },
    {
      label: "Payroll",
      path: "/employee/payroll",
      icon: "employeeLifecycle",
      hint: "Payroll records",
      ...payroll,
    },
    {
      label: "Attendance",
      path: "/finance/attendance",
      icon: "attendance",
      hint: "Monthly attendance",
      count: "—",
    },
  ];

  return <WorkspaceCardGrid cards={cards} tone="primary" />;
}

const LivePill = () => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25">
    <span className="relative flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </span>
    Live
  </span>
);

/* =========================================================
   PAGE
========================================================= */

export default function DashboardPage() {
  const user = getUser();

  const isAdmin = user?.role === "admin";
  const employeeId = user?.employee?.id;

  // Department-scoped employee logins get their sidebar sub-menu mirrored
  // on the dashboard as quick-jump cards.
  const { isCrmEmployee } = useIsCrmEmployee();
  const { isHrEmployee } = useIsHrEmployee();
  const { isFinanceEmployee } = useIsFinanceEmployee();
  const { employee: myEmployee } = useMyEmployee();

  const displayName =
    [myEmployee?.first_name, myEmployee?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "User";

  // Company / Branch / Department / Designation for the header chip row.
  // Matches the same lookup pattern used elsewhere (e.g. TransferListPage):
  // company/branch live on the employee's Department, designation is its
  // own relation. Only shown for employee logins with a linked record.
  const orgChips = !isAdmin && myEmployee
    ? [
        {
          label: "Company",
          value:
            myEmployee.department?.company?.name ||
            myEmployee.company?.name,
        },
        {
          label: "Branch",
          value:
            myEmployee.department?.branch?.name ||
            myEmployee.branch?.name,
        },
        {
          label: "Department",
          value:
            myEmployee.department?.department_name ||
            myEmployee.department?.name,
        },
        {
          label: "Designation",
          value:
            myEmployee.designation?.designation_name ||
            myEmployee.designation?.name,
        },
      ].filter((chip) => chip.value)
    : [];

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

  /* --- Live clock (updates every minute) --- */
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 pb-10">
      <Motion3DStyles />

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}
      <div className="u-rise relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-50/40 to-accent-50/30 shadow-sm dark:border-white/[0.08] dark:from-primary-500/[0.08] dark:via-white/[0.02] dark:to-accent-500/[0.06]">
        {/* top accent strip */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary-500 via-violet-400 to-accent-500" />

        {/* ambient glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-48 w-48 rounded-full bg-accent-500/15 blur-3xl" />

        {/* dotted grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 0.7px, transparent 0.7px)",
            backgroundSize: "22px 22px",
            color: "rgba(100,116,139,0.18)",
            maskImage:
              "radial-gradient(120% 120% at 15% 0%, #000 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(120% 120% at 15% 0%, #000 30%, transparent 75%)",
          }}
        />

        <div className="relative flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-6">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="u-hover-float relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-primary-500/25 blur-lg" />
              <div className="u-float-target relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-600/30 ring-1 ring-white/20">
                <SparkleIcon />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-2xl">
                  {greeting},{" "}
                  <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                    {displayName}
                  </span>
                </h1>

                <LivePill />
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 lg:text-sm">
                {isAdmin
                  ? "Here’s what’s happening across your HR workspace today."
                  : "Your attendance, leave and recent HR activity at a glance."}
              </p>

              {/* Company / Branch / Department / Designation — compact
                  chips, not a separate profile section, so the header
                  carries the employee's organisation context without
                  spending extra page space on it. */}
              {orgChips.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {orgChips.map((chip) => (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10"
                    >
                      <span className="text-slate-400 dark:text-slate-500">
                        {chip.label}:
                      </span>
                      {chip.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* date / time cluster */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <span className="text-slate-400 dark:text-slate-500">
                <CalendarIcon />
              </span>
              <div className="leading-tight">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Today
                </p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {dateLabel}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] sm:flex">
              <span className="text-slate-400 dark:text-slate-500">
                <ClockIcon />
              </span>
              <div className="leading-tight">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Local time
                </p>
                <p className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                  {timeLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          ADMIN DASHBOARD
      ===================================================== */}
      {isAdmin ? (
        <>
          {stats.isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 shadow-sm dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="font-medium">
                  Failed to load dashboard statistics. Please try again.
                </span>
              </div>
            </div>
          )}

          {/* KPI AREA */}
          <section>
            <SectionHeading
              icon={<UsersIcon />}
              tone="primary"
              title="Workforce overview"
              subtitle="Real-time HR activity at a glance"
              right={
                <span className="hidden items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Auto-refreshing
                </span>
              }
            />

            <CountsSummary
              stats={stats.data}
              loading={stats.isLoading}
            />
          </section>

          {/* FINANCE */}
          {(user?.role === "admin" || user?.role === "finance") && (
            <section>
              <SectionHeading
                icon={<WalletIcon />}
                tone="emerald"
                title="Finance — month to date"
                subtitle="Payroll and cost signals for the current month"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FinanceMtdCard />
              </div>
            </section>
          )}

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />

          {/* PERFORMANCE + ANALYTICS */}
          <section>
            <SectionHeading
              icon={<GaugeIcon />}
              tone="violet"
              title="Performance indicators"
              subtitle="How today is tracking against the workforce"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="u-tilt-perspective rounded-2xl transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.015] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(2deg)_translateY(-4px)_scale(1.015)]">
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

              <div className="u-tilt-perspective rounded-2xl transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.015] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(2deg)_translateY(-4px)_scale(1.015)]">
                <RadialStat
                  title="Leave approval rate"
                  percent={approvalRate}
                  loading={leaveBreakdown.isLoading}
                  color="accent"
                  caption="Share of leave requests approved"
                />
              </div>
            </div>
          </section>

          {/* ANALYTICS */}
          <section>
            <SectionHeading
              icon={<ChartIcon />}
              tone="blue"
              title="Analytics"
              subtitle="Attendance and leave activity trends"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="u-tilt-perspective transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.012] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(1.5deg)_translateY(-4px)_scale(1.012)]">
                <AttendanceTrendChart
                  data={trend.data}
                  loading={trend.isLoading}
                />
              </div>

              <div className="u-tilt-perspective transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.012] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(1.5deg)_translateY(-4px)_scale(1.012)]">
                <LeaveStatusChart
                  data={leaveBreakdown.data}
                  loading={leaveBreakdown.isLoading}
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />

          {/* RECENT ACTIVITY */}
          <section>
            <SectionHeading
              icon={<ActivityIcon />}
              tone="rose"
              title="Recent activity"
              subtitle="Latest leave requests across the organisation"
            />

            <div className="u-tilt-perspective transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.012] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(1.5deg)_translateY(-4px)_scale(1.012)]">
              <RecentLeaves />
            </div>
          </section>
        </>
      ) : (
        /* ===================================================
           EMPLOYEE DASHBOARD

           "My profile" (personal/contact/organisation details) has
           been removed here on purpose — it duplicated the Employee
           Profile screen and didn't match what this page's own
           subtitle promises ("Your attendance, leave and recent HR
           activity at a glance"). Every section below now earns its
           place against that promise: check-in/out, workspace
           shortcuts, personal analytics, and recent activity.
        =================================================== */
        <div className="space-y-6">
          {/* CHECK-IN / CHECK-OUT — right on the dashboard, above
              everything. For CRM employees, "Add Registration" sits
              right next to it (side-by-side on larger screens, stacked
              on mobile) instead of further down in the CRM workspace
              section, since it's the other action they take daily. */}
          <section>
            <SectionHeading
              icon={<UsersIcon />}
              tone="primary"
              title="Check in / check out"
              subtitle="Mark your attendance for today"
            />

            {isCrmEmployee ? (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <CheckInOutWidget />
                <TodayRegistrationsCard />
              </div>
            ) : (
              <CheckInOutWidget />
            )}
          </section>

          {isCrmEmployee && (
            <section className="space-y-4">
              <SectionHeading
                icon={<GridIcon />}
                tone="primary"
                title="CRM workspace"
                subtitle="Your current-period target, registrations and incentive figures"
              />

              <CrmPeriodSummaryCard />
            </section>
          )}

          {isHrEmployee && (
            <section>
              <SectionHeading
                icon={<GridIcon />}
                tone="violet"
                title="HR workspace"
                subtitle="Your HR screens — attendance, leave, training, permissions and overtime"
              />

              <HrWorkspaceCards />
            </section>
          )}

          {isFinanceEmployee && (
            <section>
              <SectionHeading
                icon={<GridIcon />}
                tone="emerald"
                title="Finance workspace"
                subtitle="Your Finance screens — employees, payroll and monthly attendance"
              />

              <FinanceWorkspaceCards />
            </section>
          )}

          <section>
            <SectionHeading
              icon={<GridIcon />}
              tone="accent"
              title="Quick links"
              subtitle="Jump straight to your attendance, leave and holiday screens"
            />

            <MyQuickLinks />
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-white/10" />

          <section>
            <SectionHeading
              icon={<ChartIcon />}
              tone="blue"
              title="Personal analytics"
              subtitle="Your check-in and leave patterns"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="u-tilt-perspective transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.012] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(1.5deg)_translateY(-4px)_scale(1.012)]">
                <AttendanceTrendChart
                  data={trend.data}
                  loading={trend.isLoading}
                  title="Your check-ins — last 7 days"
                />
              </div>

              <div className="u-tilt-perspective transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.012] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(1.5deg)_translateY(-4px)_scale(1.012)]">
                <LeaveStatusChart
                  data={leaveBreakdown.data}
                  loading={leaveBreakdown.isLoading}
                  title="Your leave requests"
                />
              </div>
            </div>
          </section>

          <section>
            <SectionHeading
              icon={<ActivityIcon />}
              tone="rose"
              title="Recent activity"
              subtitle="Your latest check-in / check-out records"
            />

            <div className="u-tilt-perspective transition-transform duration-300 will-change-transform [transform-style:preserve-3d] hover:-translate-y-1 hover:scale-[1.012] hover:shadow-xl hover:[transform:perspective(900px)_rotateX(1.5deg)_translateY(-4px)_scale(1.012)]">
              <MyRecentAttendance title="Your recent check-in / check-out" />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}