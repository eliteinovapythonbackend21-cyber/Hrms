import { useMemo } from "react";
import GenericListPage from "@/components/table/GenericListPage";
import Avatar from "@/components/ui/Avatar";
import PromotionForm from "./PromotionForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { usePromotions, useCreatePromotion, useDeactivatePromotion } from "./usePromotions";
import { useEmployeeOptions, useDesignationOptions } from "@/hooks/useLookupOptions";
import { formatDate } from "@/utils/formatDate";

// Module identity: sky — matches EmployeeDetailPage's accent, so Promotions
// reads as part of the same employee-lifecycle family.
const SKY_BADGE = "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400";

const ArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const TrendUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8M21 7v6h-6" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" strokeWidth="2" />
    <path strokeLinecap="round" d="M3 9h18M8 3v3M16 3v3" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-3a4 4 0 100-8 4 4 0 000 8zm7 3a4 4 0 10-8 0" />
  </svg>
);

function StatCard({ icon, value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${SKY_BADGE}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function DesignationBadge({ label, tone }) {
  const dotTones = {
    from: "bg-slate-400 dark:bg-slate-500",
    to: "bg-sky-500",
  };
  const badgeTones = {
    from: "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/20",
    to: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]}`} />
      {label}
    </span>
  );
}

const SmallCalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" strokeWidth="2" />
    <path strokeLinecap="round" d="M3 9h18M8 3v3M16 3v3" />
  </svg>
);

export default function PromotionListPage() {
  const employeeOptions = useEmployeeOptions();
  const designationOptions = useDesignationOptions();
  const employeeMap = useMemo(() => Object.fromEntries(employeeOptions.map((o) => [o.value, o.label])), [employeeOptions]);
  const designationMap = useMemo(() => Object.fromEntries(designationOptions.map((o) => [o.value, o.label])), [designationOptions]);

  // Separate, lightweight fetch just to power the stat cards above the
  // table — independent of the table's own paginated query inside
  // GenericListPage, so changing table pages/search doesn't affect these
  // numbers. per_page is generous so "this month" / "employees promoted"
  // reflect close to the full dataset rather than just one table page.
  const { data: statsData } = usePromotions({ page: 1, per_page: 1000 });
  const statsItems = statsData?.items || [];

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return statsItems.filter((p) => {
      if (!p.effective_date) return false;
      const d = new Date(p.effective_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [statsItems]);

  const uniqueEmployeeCount = useMemo(
    () => new Set(statsItems.map((p) => p.employee_id)).size,
    [statsItems]
  );

  const COLUMNS = [
    {
      key: "employee_id",
      label: "Employee",
      render: (r) => {
        const name = employeeMap[r.employee_id] || `Employee #${r.employee_id}`;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={name} size="sm" />
            <span className="font-medium text-slate-800 dark:text-slate-100">{name}</span>
          </div>
        );
      },
    },
    {
      key: "designation_change",
      label: "Designation Change",
      render: (r) => (
        <div className="flex items-center gap-2">
          <DesignationBadge tone="from" label={designationMap[r.from_designation_id] || `#${r.from_designation_id}`} />
          <ArrowIcon />
          <DesignationBadge tone="to" label={designationMap[r.to_designation_id] || `#${r.to_designation_id}`} />
        </div>
      ),
    },
    {
      key: "effective_date",
      label: "Effective Date",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
          <SmallCalendarIcon />
          {formatDate(r.effective_date)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* STAT CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<TrendUpIcon />} value={statsData?.total ?? "-"} label="Total Promotions" />
        <StatCard icon={<CalendarIcon />} value={thisMonthCount} label="This Month" />
        <StatCard icon={<UsersIcon />} value={uniqueEmployeeCount} label="Employees Promoted" />
      </div>

      {/* FULL TABLE — toolbar (Refresh/Excel/PDF), search, pagination, Add
          modal all unchanged, coming from GenericListPage as before. */}
      <GenericListPage
        module="Promotions"
        title="Promotions"
        subtitle="Employee promotion history"
        columns={COLUMNS}
        api={employeeLifecycleApi.promotions}
        useList={usePromotions}
        useCreate={useCreatePromotion}
        useRemove={useDeactivatePromotion}
        filename="promotions"
        searchPlaceholder="Search by remarks..."
        FormComponent={PromotionForm}
        formTitle="Promotion"
        addLabel="Add Promotion"
        actionsMode="none"
        entityLabel="Promotion record"
      />
    </div>
  );
}