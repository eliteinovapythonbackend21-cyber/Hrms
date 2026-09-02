import {
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useEmployee } from "./useEmployees";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";

import {
  formatDate,
  formatDateTime,
} from "@/utils/formatDate";

import { formatCurrency } from "@/utils/formatCurrency";

import TabbedDetailLayout from "@/components/TabbedDetailLayout";
import EmployeeSubList from "@/components/EmployeeSubList";

import { employeeLifecycleApi } from "@/api/employee.api";
import { getUser } from "@/utils/tokenHelpers";
import { use3DTilt, Motion3DStyles } from "@/hooks/use3DMotion";

const SKY = {
  text: "text-sky-600 dark:text-sky-400",

  badge:
    "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",

  ring:
    "ring-sky-100 dark:ring-sky-500/20",

  bar: "bg-sky-500",
};

const Icon = ({
  children,
}) => {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4 shrink-0 text-slate-400"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
};

const PhoneIcon = () => {
  return (
    <Icon>
      <path
        d="M4.5 3h2.4l1 3.6-1.7 1.3a9 9 0 0 0 4.4 4.4l1.3-1.7 3.6 1v2.4c0 .8-.7 1.4-1.5 1.3A13 13 0 0 1 3.2 4.5c-.1-.8.5-1.5 1.3-1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </Icon>
  );
};

const AlertIcon = () => {
  return (
    <Icon>
      <path
        d="M10 3 2 17h16L10 3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      <path
        d="M10 8v4M10 14.5v.01"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Icon>
  );
};

const MapPinIcon = () => {
  return (
    <Icon>
      <path
        d="M10 18s6-5.2 6-9.6A6 6 0 0 0 4 8.4C4 12.8 10 18 10 18Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      <circle
        cx="10"
        cy="8.4"
        r="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </Icon>
  );
};

const CalendarIcon = () => {
  return (
    <Icon>
      <rect
        x="3"
        y="4.5"
        width="14"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M3 8h14M7 3v3M13 3v3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Icon>
  );
};

const UserIcon = () => {
  return (
    <Icon>
      <circle
        cx="10"
        cy="7"
        r="3"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M3.5 17c1-3.3 4-5 6.5-5s5.5 1.7 6.5 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Icon>
  );
};

const CardIcon = () => {
  return (
    <Icon>
      <rect
        x="2.5"
        y="5"
        width="15"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M2.5 8.5h15"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </Icon>
  );
};

function Field({
  icon,
  label,
  value,
  mono = false,
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p
          className={`truncate text-sm text-slate-700 dark:text-slate-200 ${
            mono
              ? "font-mono"
              : ""
          }`}
        >
          {value || "-"}
        </p>
      </div>
    </div>
  );
}

function CountTile({ label, value, tint }) {
  const { ref, handlers } = use3DTilt({ max: 10, scale: 1.03 });
  return (
    <div className="u-tilt-perspective">
      <div
        ref={ref}
        {...handlers}
        className={`u-tilt u-glare relative overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br p-3 text-center shadow-sm dark:border-slate-800 ${tint}`}
      >
        <div className="u-tilt-content">
          <p className="text-xl font-bold">{value}</p>
          <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function HierarchyTrail({
  company,
  branch,
  department,
  designation,
}) {
  const steps = [
    company,
    branch,
    department,
    designation,
  ].filter(Boolean);

  if (!steps.length) {
    return (
      <p className="text-sm text-slate-400">
        No organization assigned
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map(
        (step, index) => (
          <div
            key={`${step}-${index}`}
            className="flex items-center gap-1.5"
          >
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${SKY.badge}`}
            >
              {step}
            </span>

            {index <
              steps.length - 1 && (
              <span className="text-slate-300 dark:text-slate-600">
                ›
              </span>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  /*
   * ==========================================================
   * VIEW CONTEXT
   * ==========================================================
   */

  const restricted =
    searchParams.get(
      "restricted"
    ) === "1";

  const fromCrm =
    searchParams.get(
      "from"
    ) === "crm";

  /*
   * SELF VIEW
   *
   * A non-admin opening their own record via "My Profile" gets a
   * trimmed, read-only view: no Edit, no Payslip, no compensation
   * breakdown, and none of the Documents / Performance / Training
   * lifecycle tabs (those are HR/admin surfaces).
   */

  const currentUser = getUser();

  const isSelfView =
    currentUser?.role !== "admin" &&
    String(currentUser?.employee?.id ?? "") === String(id);

  /*
   * CRM RESTRICTION
   *
   * Normal employee pages:
   *   Edit    -> visible
   *   Payslip -> visible
   *
   * Restricted pages:
   *   Edit    -> hidden
   *   Payslip -> hidden
   *
   * CRM employee page:
   *   Edit    -> visible
   *   Payslip -> hidden
   *
   * This keeps CRM behavior isolated.
   */

  const canEdit =
    (!restricted || fromCrm) && !isSelfView;

  const canViewPayslip =
    !restricted && !isSelfView;

  const showEmployment = !restricted && !isSelfView;

  const showLifecycle = !restricted && !isSelfView;

  /*
   * ==========================================================
   * EMPLOYEE QUERY
   * ==========================================================
   */

  const {
    data: employee,
    isLoading,
    isError,
  } = useEmployee(id);

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  /*
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (
    isError ||
    !employee
  ) {
    return (
      <div className="py-16 text-center text-slate-500 dark:text-slate-400">
        Employee not found.
      </div>
    );
  }

  /*
   * ==========================================================
   * EMPLOYEE COUNTS
   * ==========================================================
   */

  const counts = [
    {
      label: "Attendance",
      value:
        employee.attendance_count ??
        0,
    },

    {
      label: "Leaves",
      value:
        employee.leave_count ??
        0,
    },

    {
      label: "Network Logs",
      value:
        employee.network_log_count ??
        0,
    },
  ];

  /*
   * ==========================================================
   * SALARY
   * ==========================================================
   */

  const salary =
    Number(employee.salary) ||
    0;

  const allowance =
    Number(
      employee.allowance
    ) || 0;

  const totalComp =
    salary + allowance;

  const salaryPct =
    totalComp > 0
      ? Math.round(
          (salary /
            totalComp) *
            100
        )
      : 0;

  /*
   * ==========================================================
   * BACK
   * ==========================================================
   */

  const handleBack = () => {
    if (isSelfView) {
      navigate("/dashboard");

      return;
    }

    if (fromCrm) {
      navigate(
        "/crm/employees"
      );

      return;
    }

    navigate(
      restricted
        ? "/employees"
        : "/master/employees"
    );
  };

  /*
   * ==========================================================
   * EDIT
   * ==========================================================
   */

  const handleEdit = () => {
    navigate(
      `/employees/${id}/edit${
        fromCrm
          ? "?from=crm"
          : ""
      }`
    );
  };

  /*
   * ==========================================================
   * ORGANIZATION
   * ==========================================================
   */

  const companyName =
    employee.department
      ?.company?.name ||
    employee.company?.name ||
    null;

  const branchName =
    employee.department
      ?.branch?.name ||
    employee.branch?.name ||
    null;

  const departmentName =
    employee.department
      ?.department_name ||
    null;

  const designationName =
    employee.designation
      ?.designation_name ||
    null;

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Motion3DStyles />

      {/* HEADER */}

      <div className="u-rise relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-primary-50 via-white to-sky-50 p-5 shadow-sm dark:border-white/10 dark:from-primary-900/20 dark:via-slate-900 dark:to-sky-900/10 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary-200/40 blur-3xl dark:bg-primary-500/10" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="u-hover-float hidden sm:flex">
              <div className="u-float-target flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/30">
                <UserIcon />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isSelfView ? "My Profile" : "Employee Details"}
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isSelfView
                  ? "Your personal and organization information."
                  : "View employee personal, organization and employment information."}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={handleBack}
          >
            Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN */}

        <div className="u-rise space-y-4 lg:sticky lg:top-6 lg:col-span-1 lg:h-fit" style={{ animationDelay: "60ms" }}>
          {/* EMPLOYEE PROFILE */}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
            <div className="h-20 bg-gradient-to-r from-primary-500 via-sky-500 to-indigo-500" />
            <div className="px-6 pb-6">
            <div
              className={`mx-auto -mt-10 w-fit rounded-full bg-white p-1 ring-4 dark:bg-slate-900 ${SKY.ring}`}
            >
              <Avatar
                name={
                  employee.first_name ||
                  "E"
                }
                size="lg"
              />
            </div>

            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
              {employee.first_name || ""}
              {" "}
              {employee.last_name || ""}
            </h2>

            <p className="font-mono text-xs text-slate-400">
              {employee.employee_code ||
                "-"}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge
                className={
                  employee.is_active
                    ? "inline-flex items-center gap-1.5 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                    : "inline-flex items-center gap-1.5 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    employee.is_active ? "bg-emerald-500 u-pulse" : "bg-red-500"
                  }`}
                />
                {employee.is_active
                  ? "Active"
                  : "Inactive"}
              </Badge>

              {designationName && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${SKY.badge}`}
                >
                  {designationName}
                </span>
              )}
            </div>

            {(canEdit ||
              canViewPayslip) && (
              <div
                className={`mt-5 grid gap-2 ${
                  canEdit &&
                  canViewPayslip
                    ? "grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {canEdit && (
                  <Button
                    variant="secondary"
                    onClick={
                      handleEdit
                    }
                    className="w-full text-sm"
                  >
                    Edit
                  </Button>
                )}

                {canViewPayslip && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate(
                        `/employees/${id}/payslip`
                      )
                    }
                    className="w-full text-sm"
                  >
                    Payslip
                  </Button>
                )}
              </div>
            )}
            </div>
          </div>

          {/* ORGANIZATION */}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Organization
            </h3>

            <HierarchyTrail
              company={
                companyName
              }
              branch={
                branchName
              }
              department={
                departmentName
              }
              designation={
                designationName
              }
            />
          </div>

          {/* COUNTS */}

          <div className="grid grid-cols-3 gap-2">
            {counts.map((count, i) => {
              const tints = [
                "from-primary-50 to-white text-primary-600 dark:from-primary-900/20 dark:to-slate-900 dark:text-primary-300",
                "from-emerald-50 to-white text-emerald-600 dark:from-emerald-900/20 dark:to-slate-900 dark:text-emerald-300",
                "from-violet-50 to-white text-violet-600 dark:from-violet-900/20 dark:to-slate-900 dark:text-violet-300",
              ];
              return (
                <CountTile
                  key={count.label}
                  label={count.label}
                  value={count.value}
                  tint={tints[i % tints.length]}
                />
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN */}

        <div className="u-rise space-y-6 lg:col-span-2" style={{ animationDelay: "100ms" }}>
          {/* PERSONAL */}

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Personal
            </h3>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field
                icon={<UserIcon />}
                label="Gender"
                value={
                  employee.gender
                }
              />

              <Field
                icon={
                  <CalendarIcon />
                }
                label="Date of Birth"
                value={formatDate(
                  employee.dob
                )}
              />

              <Field
                icon={
                  <PhoneIcon />
                }
                label="Phone"
                value={
                  employee.phone
                }
              />

              <Field
                icon={
                  <AlertIcon />
                }
                label="Emergency Contact"
                value={
                  employee.emergency_contact
                }
              />

              <div className="sm:col-span-2">
                <Field
                  icon={
                    <MapPinIcon />
                  }
                  label="Address"
                  value={
                    employee.address
                  }
                />
              </div>

              <Field
                icon={
                  <MapPinIcon />
                }
                label="City"
                value={
                  employee.city
                }
              />

              <Field
                icon={
                  <MapPinIcon />
                }
                label="State"
                value={
                  employee.state
                }
              />

              <Field
                icon={
                  <MapPinIcon />
                }
                label="Country"
                value={
                  employee.country
                }
              />

              <Field
                icon={
                  <MapPinIcon />
                }
                label="Pincode"
                value={
                  employee.pincode
                }
              />
            </div>
          </div>

          {/* EMPLOYMENT */}

          {showEmployment && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Employment
              </h3>

              {totalComp > 0 && (
                <div className="mb-5 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {formatCurrency(
                        totalComp
                      )}
                    </span>

                    <span className="text-xs text-slate-400">
                      total monthly compensation
                    </span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full ${SKY.bar} transition-[width] duration-700 ease-out`}
                      style={{
                        width: `${Math.min(
                          salaryPct,
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      Salary ·{" "}
                      {formatCurrency(
                        salary
                      )}
                    </span>

                    <span>
                      Allowance ·{" "}
                      {formatCurrency(
                        allowance
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field
                  icon={
                    <CalendarIcon />
                  }
                  label="Joining Date"
                  value={formatDate(
                    employee.joining_date
                  )}
                />

                <Field
                  icon={
                    <CalendarIcon />
                  }
                  label="Record Created"
                  value={formatDateTime(
                    employee.created_at
                  )}
                />

                <Field
                  icon={
                    <CardIcon />
                  }
                  label="PF Number"
                  value={
                    employee.pf_number
                  }
                  mono
                />

                <Field
                  icon={
                    <CardIcon />
                  }
                  label="ESI Number"
                  value={
                    employee.esi_number
                  }
                  mono
                />

                <Field
                  icon={
                    <CardIcon />
                  }
                  label="Bank Account No."
                  value={
                    employee.account_number
                  }
                  mono
                />
              </div>
            </div>
          )}

          {/* LIFECYCLE */}

          {showLifecycle && (
            <TabbedDetailLayout
              tabs={[
                {
                  key: "documents",
                  label: "Documents",
                  content: (
                    <EmployeeSubList
                      queryKey="employee-documents"
                      api={
                        employeeLifecycleApi.documents
                      }
                      employeeId={id}
                      columns={[
                        {
                          key: "doc_type",
                          label:
                            "Document Type",
                        },

                        {
                          key: "file_url",
                          label: "File",

                          render: (
                            row
                          ) =>
                            row.file_url ? (
                              <a
                                href={
                                  row.file_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary-600 hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              "-"
                            ),
                        },
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
                      api={
                        employeeLifecycleApi.performance
                      }
                      employeeId={id}
                      columns={[
                        {
                          key: "review_period",
                          label:
                            "Review Period",
                        },

                        {
                          key: "rating",
                          label:
                            "Rating",
                        },

                        {
                          key: "remarks",
                          label:
                            "Remarks",

                          render: (
                            row
                          ) =>
                            row.remarks ||
                            "-",
                        },
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
                      api={
                        employeeLifecycleApi.training
                      }
                      employeeId={id}
                      columns={[
                        {
                          key: "program_name",
                          label:
                            "Program",
                        },

                        {
                          key: "start_date",
                          label:
                            "Start Date",

                          render: (
                            row
                          ) =>
                            formatDate(
                              row.start_date
                            ),
                        },

                        {
                          key: "end_date",
                          label:
                            "End Date",

                          render: (
                            row
                          ) =>
                            row.end_date
                              ? formatDate(
                                  row.end_date
                                )
                              : "-",
                        },

                        {
                          key: "status",
                          label:
                            "Status",
                        },
                      ]}
                      emptyText="No training records."
                    />
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