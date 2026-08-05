import DashboardCard from "@/components/charts/DashboardCard";

// Share of active headcount, as a whole-number percent. Undefined when the
// denominator isn't loaded yet so the card renders without a ring rather
// than a misleading 0%.
function shareOf(count, total) {
  if (!total) return undefined;
  return (count / total) * 100;
}

export default function CountsSummary({ stats, loading }) {
  const activeTotal = stats?.active_employees;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <DashboardCard
        title="Total Employees"
        value={stats?.total_employees}
        color="primary"
        loading={loading}
        to="/employees"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4m4 4a4 4 0 10-4-4" />
          </svg>
        }
      />
      <DashboardCard
        title="Active Employees"
        value={stats?.active_employees}
        color="accent"
        loading={loading}
        percent={shareOf(stats?.active_employees, stats?.total_employees)}
        to="/employees"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
      />
      <DashboardCard
        title="Present Today"
        value={stats?.present_today}
        color="success"
        loading={loading}
        percent={shareOf(stats?.present_today, activeTotal)}
        to="/attendance"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        }
      />
      <DashboardCard
        title="Absent Today"
        value={stats?.absent_today}
        color="danger"
        loading={loading}
        percent={shareOf(stats?.absent_today, activeTotal)}
        to="/attendance"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <DashboardCard
        title="On Leave"
        value={stats?.on_leave_today}
        color="warning"
        loading={loading}
        percent={shareOf(stats?.on_leave_today, activeTotal)}
        to="/leaves"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
      />
      <DashboardCard
        title="Total Roles"
        value={stats?.total_roles}
        color="info"
        loading={loading}
        to="/roles"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        }
      />
    </div>
  );
}
