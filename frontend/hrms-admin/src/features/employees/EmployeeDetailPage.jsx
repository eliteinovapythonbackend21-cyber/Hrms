import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEmployee } from "./useEmployees";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { formatDate, formatDateTime } from "@/utils/formatDate";
import { formatCurrency } from "@/utils/formatCurrency";
import TabbedDetailLayout from "@/components/TabbedDetailLayout";
import EmployeeSubList from "@/components/EmployeeSubList";
import { employeeLifecycleApi } from "@/api/employee.api";

// Module identity: sky — matches EmployeeListPage's accent so this detail
// view reads as the same module, not a disconnected screen.
const SKY = {
  text: "text-sky-600 dark:text-sky-400",
  badge: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  ring: "ring-sky-100 dark:ring-sky-500/20",
  bar: "bg-sky-500",
};

const Icon = ({ children }) => (
  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-slate-400">
    {children}
  </svg>
);

const PhoneIcon = () => (
  <Icon>
    <path d="M4.5 3h2.4l1 3.6-1.7 1.3a9 9 0 0 0 4.4 4.4l1.3-1.7 3.6 1v2.4c0 .8-.7 1.4-1.5 1.3A13 13 0 0 1 3.2 4.5c-.1-.8.5-1.5 1.3-1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </Icon>
);

const AlertIcon = () => (
  <Icon>
    <path d="M10 3 2 17h16L10 3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M10 8v4M10 14.5v.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </Icon>
);

const MapPinIcon = () => (
  <Icon>
    <path d="M10 18s6-5.2 6-9.6A6 6 0 0 0 4 8.4C4 12.8 10 18 10 18Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="10" cy="8.4" r="2" stroke="currentColor" strokeWidth="1.3" />
  </Icon>
);

const CalendarIcon = () => (
  <Icon>
    <rect x="3" y="4.5" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </Icon>
);

const UserIcon = () => (
  <Icon>
    <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3.5 17c1-3.3 4-5 6.5-5s5.5 1.7 6.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </Icon>
);

const CardIcon = () => (
  <Icon>
    <rect x="2.5" y="5" width="15" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.5 8.5h15" stroke="currentColor" strokeWidth="1.3" />
  </Icon>
);

// Small labeled field, icon + label stacked over value — used throughout
// Personal/Employment instead of a flat label:value list, so fields with
// icons scan faster than plain text rows.
function Field({ icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`truncate text-sm text-slate-700 dark:text-slate-200 ${mono ? "font-mono" : ""}`}>
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

// Company -> Branch -> Department -> Designation as a connected chip
// trail — the actual hierarchy rendered as a real breadcrumb, not four
// disconnected label:value rows.
function HierarchyTrail({ company, branch, department, designation }) {
  const steps = [company, branch, department, designation].filter(Boolean);

  if (steps.length === 0) {
    return <p className="text-sm text-slate-400">No organization assigned</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${SKY.badge}`}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <span className="text-slate-300 dark:text-slate-600">›</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const restricted = searchParams.get("restricted") === "1";
  const { data: employee, isLoading, isError } = useEmployee(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Employee not found.
      </div>
    );
  }

  const counts = [
    { label: "Attendance", value: employee.attendance_count },
    { label: "Leaves", value: employee.leave_count },
    { label: "Network Logs", value: employee.network_log_count },
  ];

  const salary = Number(employee.salary) || 0;
  const allowance = Number(employee.allowance) || 0;
  const totalComp = salary + allowance;
  const salaryPct = totalComp > 0 ? Math.round((salary / totalComp) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Employee Details
        </h1>
        <Button variant="secondary" onClick={() => navigate(restricted ? "/employees" : "/master/employees")}>
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ================= SIDEBAR ================= */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:col-span-1 lg:h-fit">
          {/* PROFILE */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className={`mx-auto w-fit rounded-full ring-4 ${SKY.ring}`}>
              <Avatar name={employee.first_name || "E"} size="lg" />
            </div>

            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
              {employee.first_name} {employee.last_name}
            </h2>

            <p className="font-mono text-xs text-slate-400">
              {employee.employee_code}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge
                className={
                  employee.is_active
                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                }
              >
                {employee.is_active ? "Active" : "Inactive"}
              </Badge>

              {employee.designation?.designation_name && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SKY.badge}`}>
                  {employee.designation.designation_name}
                </span>
              )}
            </div>

            {!restricted && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/employees/${id}/edit`)}
                  className="w-full text-sm"
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/employees/${id}/payslip`)}
                  className="w-full text-sm"
                >
                  Payslip
                </Button>
              </div>
            )}
          </div>

          {/* ORGANIZATION HIERARCHY */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Organization
            </h3>
            <HierarchyTrail
              company={employee.department?.company?.name}
              branch={employee.department?.branch?.name}
              department={employee.department?.department_name}
              designation={employee.designation?.designation_name}
            />
          </div>

          {/* COUNTS */}
          <div className="grid grid-cols-3 gap-2">
            {counts.map((c) => (
              <div
                key={c.label}
                className="rounded-lg border border-slate-100 bg-white p-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <p className={`text-xl font-bold ${SKY.text}`}>{c.value}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                  {c.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="space-y-6 lg:col-span-2">
          {/* PERSONAL */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Personal
            </h3>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field icon={<UserIcon />} label="Gender" value={employee.gender} />
              <Field icon={<CalendarIcon />} label="Date of Birth" value={formatDate(employee.dob)} />
              <Field icon={<PhoneIcon />} label="Phone" value={employee.phone} />
              <Field icon={<AlertIcon />} label="Emergency Contact" value={employee.emergency_contact} />
              <div className="sm:col-span-2">
                <Field icon={<MapPinIcon />} label="Address" value={employee.address} />
              </div>
              <Field icon={<MapPinIcon />} label="City" value={employee.city} />
              <Field icon={<MapPinIcon />} label="State" value={employee.state} />
              <Field icon={<MapPinIcon />} label="Country" value={employee.country} />
              <Field icon={<MapPinIcon />} label="Pincode" value={employee.pincode} />
            </div>
          </div>

          {/* EMPLOYMENT — hidden entirely on the restricted (/employees) view */}
          {!restricted && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Employment
              </h3>

              {/* Compensation visual — salary vs allowance as a proportion
                  bar, not just two numbers sitting next to each other */}
              {totalComp > 0 && (
                <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(totalComp)}
                    </span>
                    <span className="text-xs text-slate-400">total monthly compensation</span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full ${SKY.bar}`}
                      style={{ width: `${salaryPct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Salary · {formatCurrency(salary)}</span>
                    <span>Allowance · {formatCurrency(allowance)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field icon={<CalendarIcon />} label="Joining Date" value={formatDate(employee.joining_date)} />
                <Field icon={<CalendarIcon />} label="Record Created" value={formatDateTime(employee.created_at)} />
                <Field icon={<CardIcon />} label="PF Number" value={employee.pf_number} mono />
                <Field icon={<CardIcon />} label="ESI Number" value={employee.esi_number} mono />
                <Field icon={<CardIcon />} label="Bank Account No." value={employee.account_number} mono />
              </div>
            </div>
          )}

          {/* TABS — Documents / Performance / Training / Promotion-Transfer
              hidden entirely on the restricted (/employees) view */}
          {!restricted && (
            <TabbedDetailLayout
              tabs={[
                {
                  key: "documents",
                  label: "Documents",
                  content: (
                    <EmployeeSubList
                      queryKey="employee-documents"
                      api={employeeLifecycleApi.documents}
                      employeeId={id}
                      columns={[
                        { key: "doc_type", label: "Document Type" },
                        { key: "file_url", label: "File", render: (r) => <a href={r.file_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">View</a> },
                      ]}
                      emptyText="No documents on file."
                    />
                  ),
                },
                {
                  key: "performance",
                  label: "Performance",
                  content: (
                    <EmployeeSubList
                      queryKey="performance"
                      api={employeeLifecycleApi.performance}
                      employeeId={id}
                      columns={[
                        { key: "review_period", label: "Review Period" },
                        { key: "rating", label: "Rating" },
                        { key: "remarks", label: "Remarks", render: (r) => r.remarks || "-" },
                      ]}
                      emptyText="No performance reviews recorded."
                    />
                  ),
                },
                {
                  key: "training",
                  label: "Training",
                  content: (
                    <EmployeeSubList
                      queryKey="training"
                      api={employeeLifecycleApi.training}
                      employeeId={id}
                      columns={[
                        { key: "program_name", label: "Program" },
                        { key: "start_date", label: "Start Date" },
                        { key: "end_date", label: "End Date", render: (r) => r.end_date || "-" },
                        { key: "status", label: "Status" },
                      ]}
                      emptyText="No training records."
                    />
                  ),
                },
                {
                  key: "promotion-transfer",
                  label: "Promotion / Transfer History",
                  content: (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Promotions</h4>
                        <EmployeeSubList
                          queryKey="promotions"
                          api={employeeLifecycleApi.promotions}
                          employeeId={id}
                          columns={[
                            { key: "from_designation_id", label: "From Designation" },
                            { key: "to_designation_id", label: "To Designation" },
                            { key: "effective_date", label: "Effective Date" },
                          ]}
                          emptyText="No promotions recorded."
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Transfers</h4>
                        <EmployeeSubList
                          queryKey="transfers"
                          api={employeeLifecycleApi.transfers}
                          employeeId={id}
                          columns={[
                            { key: "from_department_id", label: "From Department" },
                            { key: "to_department_id", label: "To Department" },
                            { key: "effective_date", label: "Effective Date" },
                          ]}
                          emptyText="No transfers recorded."
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}