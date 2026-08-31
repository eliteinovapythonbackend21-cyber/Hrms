import { useMemo, useState } from "react";
import { formatCurrency } from "@/utils/formatCurrency";

export default function AttendanceMonthlySummaryTable({
  data = [],
  loading = false,
}) {
  const [sortConfig, setSortConfig] = useState({
    key: "employee_name",
    direction: "asc",
  });

  /*
   * ==========================================================
   * SORT
   * ==========================================================
   */

  const sortedData = useMemo(() => {
    const rows = [...data];

    const {
      key,
      direction,
    } = sortConfig;

    rows.sort((a, b) => {
      let valueA = a?.[key];
      let valueB = b?.[key];

      if (
        valueA === null ||
        valueA === undefined
      ) {
        valueA = "";
      }

      if (
        valueB === null ||
        valueB === undefined
      ) {
        valueB = "";
      }

      if (
        typeof valueA === "number" ||
        typeof valueB === "number"
      ) {
        valueA = Number(valueA) || 0;
        valueB = Number(valueB) || 0;
      } else {
        valueA = String(valueA).toLowerCase();
        valueB = String(valueB).toLowerCase();
      }

      if (valueA < valueB) {
        return direction === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return direction === "asc" ? 1 : -1;
      }

      return 0;
    });

    return rows;
  }, [data, sortConfig]);

  /*
   * ==========================================================
   * SORT HANDLER
   * ==========================================================
   */

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction:
            current.direction === "asc"
              ? "desc"
              : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  };

  /*
   * ==========================================================
   * SORT ICON
   * ==========================================================
   */

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return "↕";
    }

    return sortConfig.direction === "asc"
      ? "↑"
      : "↓";
  };

  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead className="tbl-head">
              <tr>
                {[
                  "Employee",
                  "Code",
                  "Present",
                  "Absent",
                  "Leave",
                  "Holiday",
                  "Worked Hours",
                  "Leave Deduction",
                  "Absent Deduction",
                  "Total Deduction",
                  "Net Salary",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <tr
                  key={index}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  {Array.from({
                    length: 11,
                  }).map(
                    (_, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-4"
                      >
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * EMPTY STATE
   * ==========================================================
   */

  if (!sortedData.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl dark:bg-slate-800">
          📊
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
          No attendance records found
        </h3>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          There are no monthly attendance records matching your search.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="min-w-[1200px] w-full border-collapse">
          <thead className="tbl-head">
            <tr>
              <SortableHeader
                label="Employee"
                sortKey="employee_name"
                sortIcon={getSortIcon("employee_name")}
                onSort={handleSort}
                align="left"
              />

              <SortableHeader
                label="Code"
                sortKey="employee_code"
                sortIcon={getSortIcon("employee_code")}
                onSort={handleSort}
                align="left"
              />

              <SortableHeader
                label="Present"
                sortKey="present_days"
                sortIcon={getSortIcon("present_days")}
                onSort={handleSort}
                align="center"
              />

              <SortableHeader
                label="Absent"
                sortKey="absent_days"
                sortIcon={getSortIcon("absent_days")}
                onSort={handleSort}
                align="center"
              />

              <SortableHeader
                label="Leave"
                sortKey="approved_leave_days"
                sortIcon={getSortIcon("approved_leave_days")}
                onSort={handleSort}
                align="center"
              />

              <SortableHeader
                label="Holiday"
                sortKey="holiday_days"
                sortIcon={getSortIcon("holiday_days")}
                onSort={handleSort}
                align="center"
              />

              <SortableHeader
                label="Worked Hours"
                sortKey="worked_hours"
                sortIcon={getSortIcon("worked_hours")}
                onSort={handleSort}
                align="right"
              />

              <SortableHeader
                label="Leave Deduction"
                sortKey="leave_deduction"
                sortIcon={getSortIcon("leave_deduction")}
                onSort={handleSort}
                align="right"
              />

              <SortableHeader
                label="Absent Deduction"
                sortKey="absent_deduction"
                sortIcon={getSortIcon("absent_deduction")}
                onSort={handleSort}
                align="right"
              />

              <SortableHeader
                label="Total Deduction"
                sortKey="total_deduction"
                sortIcon={getSortIcon("total_deduction")}
                onSort={handleSort}
                align="right"
              />

              <SortableHeader
                label="Net Salary"
                sortKey="net_salary"
                sortIcon={getSortIcon("net_salary")}
                onSort={handleSort}
                align="right"
              />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedData.map((item, index) => {
              const leaveDeduction = Number(
                item.leave_deduction || 0
              );

              const absentDeduction = Number(
                item.absent_deduction || 0
              );

              const totalDeduction =
                item.total_deduction != null
                  ? Number(item.total_deduction)
                  : leaveDeduction +
                    absentDeduction;

              return (
                <tr
                  key={
                    item.employee_id ??
                    item.id ??
                    item.employee_code ??
                    index
                  }
                  className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  {/* EMPLOYEE */}

                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                        {getInitials(
                          item.employee_name
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate text-sm font-semibold text-slate-800 dark:text-white">
                          {item.employee_name || "-"}
                        </p>

                        {item.employee_id != null && (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            ID: {item.employee_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* EMPLOYEE CODE */}

                  <td className="whitespace-nowrap px-4 py-4">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                      {item.employee_code || "-"}
                    </span>
                  </td>

                  {/* PRESENT */}

                  <td className="whitespace-nowrap px-4 py-4 text-center">
                    <DayValue
                      value={item.present_days}
                      type="present"
                    />
                  </td>

                  {/* ABSENT */}

                  <td className="whitespace-nowrap px-4 py-4 text-center">
                    <DayValue
                      value={item.absent_days}
                      type="absent"
                    />
                  </td>

                  {/* LEAVE */}

                  <td className="whitespace-nowrap px-4 py-4 text-center">
                    <DayValue
                      value={
                        item.approved_leave_days
                      }
                      type="leave"
                    />
                  </td>

                  {/* HOLIDAY */}

                  <td className="whitespace-nowrap px-4 py-4 text-center">
                    <DayValue
                      value={item.holiday_days}
                      type="holiday"
                    />
                  </td>

                  {/* WORKED HOURS */}

                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {Number(
                        item.worked_hours || 0
                      ).toFixed(2)}
                      h
                    </span>
                  </td>

                  {/* LEAVE DEDUCTION */}

                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {formatCurrency(
                        leaveDeduction
                      )}
                    </span>
                  </td>

                  {/* ABSENT DEDUCTION */}

                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      {formatCurrency(
                        absentDeduction
                      )}
                    </span>
                  </td>

                  {/* TOTAL DEDUCTION */}

                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatCurrency(
                        totalDeduction
                      )}
                    </span>
                  </td>

                  {/* NET SALARY */}

                  <td className="whitespace-nowrap px-4 py-4 text-right">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(
                        item.net_salary || 0
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* TABLE TOTAL */}

          <tfoot className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <tr>
              <td
                colSpan={2}
                className="px-4 py-4 text-sm font-bold uppercase text-slate-700 dark:text-white"
              >
                Total
              </td>

              <td className="px-4 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">
                {sum(data, "present_days")}
              </td>

              <td className="px-4 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">
                {sum(data, "absent_days")}
              </td>

              <td className="px-4 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">
                {sum(data, "approved_leave_days")}
              </td>

              <td className="px-4 py-4 text-center text-sm font-bold text-slate-900 dark:text-white">
                {sum(data, "holiday_days")}
              </td>

              <td className="px-4 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                {sum(data, "worked_hours").toFixed(2)}h
              </td>

              <td className="px-4 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(
                  sum(data, "leave_deduction")
                )}
              </td>

              <td className="px-4 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(
                  sum(data, "absent_deduction")
                )}
              </td>

              <td className="px-4 py-4 text-right text-sm font-bold text-red-600 dark:text-red-400">
                {formatCurrency(
                  data.reduce((total, item) => {
                    const leave = Number(
                      item.leave_deduction || 0
                    );

                    const absent = Number(
                      item.absent_deduction || 0
                    );

                    return (
                      total +
                      (item.total_deduction != null
                        ? Number(
                            item.total_deduction
                          )
                        : leave + absent)
                    );
                  }, 0)
                )}
              </td>

              <td className="px-4 py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                {formatCurrency(
                  sum(data, "net_salary")
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Showing {sortedData.length} employee
          {sortedData.length === 1 ? "" : "s"}.
        </p>
      </div>
    </div>
  );
}

/*
 * ==========================================================
 * SORTABLE HEADER
 * ==========================================================
 */

function SortableHeader({
  label,
  sortKey,
  sortIcon,
  onSort,
  align = "left",
}) {
  const alignment =
    align === "center"
      ? "justify-center text-center"
      : align === "right"
        ? "justify-end text-right"
        : "justify-start text-left";

  return (
    <th className="whitespace-nowrap px-4 py-3">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 ${alignment}`}
      >
        <span>{label}</span>

        <span className="text-[11px]">
          {sortIcon}
        </span>
      </button>
    </th>
  );
}

/*
 * ==========================================================
 * DAY VALUE
 * ==========================================================
 */

function DayValue({
  value,
  type,
}) {
  const number = Number(value || 0);

  const styles = {
    present:
      "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
    absent:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    leave:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    holiday:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  };

  return (
    <span
      className={`inline-flex min-w-[34px] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold ${styles[type]}`}
    >
      {number}
    </span>
  );
}

/*
 * ==========================================================
 * SUM
 * ==========================================================
 */

function sum(data, key) {
  return data.reduce(
    (total, item) =>
      total + Number(item?.[key] || 0),
    0
  );
}

/*
 * ==========================================================
 * INITIALS
 * ==========================================================
 */

function getInitials(name) {
  if (!name) {
    return "E";
  }

  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[
    parts.length - 1
  ][0]}`.toUpperCase();
}