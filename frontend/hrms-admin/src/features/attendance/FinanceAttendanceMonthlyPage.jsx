import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useMonthlyAttendance } from "./useMonthlyAttendance";
import AttendanceMonthlySummaryTable from "./components/AttendanceMonthlySummaryTable";
import TableToolbar from "@/components/table/TableToolbar";
import { formatCurrency } from "@/utils/formatCurrency";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const getMonthValue = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}`;

export default function FinanceAttendanceMonthlyPage() {
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");

  const {
    data: monthlyData,
    isLoading: monthlyLoading,
    isFetching: monthlyFetching,
    refetch: refetchMonthly,
  } = useMonthlyAttendance(month, year);

  /*
   * ==========================================================
   * MONTHLY DATA
   * ==========================================================
   */

  const items = useMemo(
    () => monthlyData?.items || [],
    [monthlyData]
  );

  /*
   * ==========================================================
   * FILTERED DATA
   * ==========================================================
   */

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return items;
    }

    return items.filter((item) => {
      const employeeName = String(
        item.employee_name || ""
      ).toLowerCase();

      const employeeCode = String(
        item.employee_code || ""
      ).toLowerCase();

      return (
        employeeName.includes(keyword) ||
        employeeCode.includes(keyword)
      );
    });
  }, [items, search]);

  /*
   * ==========================================================
   * SUMMARY
   * ==========================================================
   */

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const leaveDeduction = Number(
          item.leave_deduction || 0
        );

        const absentDeduction = Number(
          item.absent_deduction || 0
        );

        const totalDeduction =
          item.total_deduction != null
            ? Number(item.total_deduction)
            : leaveDeduction + absentDeduction;

        acc.employees += 1;

        acc.presentDays += Number(
          item.present_days || 0
        );

        acc.absentDays += Number(
          item.absent_days || 0
        );

        acc.leaveDays += Number(
          item.approved_leave_days || 0
        );

        acc.holidayDays += Number(
          item.holiday_days || 0
        );

        acc.workedHours += Number(
          item.worked_hours || 0
        );

        acc.leaveDeduction += leaveDeduction;

        acc.absentDeduction += absentDeduction;

        acc.totalDeduction += totalDeduction;

        acc.netSalary += Number(
          item.net_salary || 0
        );

        return acc;
      },
      {
        employees: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        holidayDays: 0,
        workedHours: 0,
        leaveDeduction: 0,
        absentDeduction: 0,
        totalDeduction: 0,
        netSalary: 0,
      }
    );
  }, [items]);

  /*
   * ==========================================================
   * ATTENDANCE PERCENTAGE
   * ==========================================================
   */

  const totalAttendanceDays =
    summary.presentDays +
    summary.absentDays +
    summary.leaveDays;

  const attendancePercentage =
    totalAttendanceDays > 0
      ? Math.round(
          (summary.presentDays /
            totalAttendanceDays) *
            100
        )
      : 0;

  /*
   * ==========================================================
   * MONTH
   * ==========================================================
   */

  const selectedMonthLabel =
    `${MONTH_NAMES[month - 1]} ${year}`;

  const isCurrentMonth =
    month === now.getMonth() + 1 &&
    year === now.getFullYear();

  const changeMonth = (direction) => {
    let nextMonth = month + direction;
    let nextYear = year;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    setMonth(nextMonth);
    setYear(nextYear);
    setSearch("");
  };

  const handleMonthChange = (event) => {
    const value = event.target.value;

    if (!value) {
      return;
    }

    const [selectedYear, selectedMonth] =
      value.split("-");

    setYear(Number(selectedYear));
    setMonth(Number(selectedMonth));
    setSearch("");
  };

  const goToCurrentMonth = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setSearch("");
  };

  /*
   * ==========================================================
   * CSV REPORT
   * ==========================================================
   */

  const downloadReport = () => {
    if (!items.length) {
      return;
    }

    const headers = [
      "Employee",
      "Employee Code",
      "Present Days",
      "Absent Days",
      "Leave Days",
      "Holiday Days",
      "Worked Hours",
      "Leave Deduction",
      "Absent Deduction",
      "Total Deduction",
      "Net Salary",
    ];

    const rows = items.map((item) => {
      const leaveDeduction = Number(
        item.leave_deduction || 0
      );

      const absentDeduction = Number(
        item.absent_deduction || 0
      );

      const totalDeduction =
        item.total_deduction != null
          ? Number(item.total_deduction)
          : leaveDeduction + absentDeduction;

      return [
        item.employee_name || "-",
        item.employee_code || "-",
        item.present_days ?? 0,
        item.absent_days ?? 0,
        item.approved_leave_days ?? 0,
        item.holiday_days ?? 0,
        Number(item.worked_hours || 0).toFixed(2),
        leaveDeduction.toFixed(2),
        absentDeduction.toFixed(2),
        totalDeduction.toFixed(2),
        Number(item.net_salary || 0).toFixed(2),
      ];
    });

    rows.push([
      "TOTAL",
      "",
      summary.presentDays,
      summary.absentDays,
      summary.leaveDays,
      summary.holidayDays,
      summary.workedHours.toFixed(2),
      summary.leaveDeduction.toFixed(2),
      summary.absentDeduction.toFixed(2),
      summary.totalDeduction.toFixed(2),
      summary.netSalary.toFixed(2),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const text = String(value ?? "");

            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      `attendance-monthly-${getMonthValue(
        year,
        month
      )}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /*
   * ==========================================================
   * PDF REPORT
   * ==========================================================
   */

  const downloadPDF = () => {
    if (!items.length) {
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    /*
     * HEADER
     */

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");

    doc.text(
      "Monthly Attendance & Salary Report",
      14,
      18
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.text(
      `Period: ${selectedMonthLabel}`,
      14,
      25
    );

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      pageWidth - 14,
      25,
      {
        align: "right",
      }
    );

    /*
     * SUMMARY
     */

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");

    doc.text(
      "Attendance & Salary Summary",
      14,
      36
    );

    const summaryRows = [
      [
        "Employees",
        String(summary.employees),
        "Present Days",
        String(summary.presentDays),
        "Absent Days",
        String(summary.absentDays),
      ],
      [
        "Leave Days",
        String(summary.leaveDays),
        "Holiday Days",
        String(summary.holidayDays),
        "Worked Hours",
        `${summary.workedHours.toFixed(2)}h`,
      ],
      [
        "Attendance",
        `${attendancePercentage}%`,
        "Leave Deduction",
        formatCurrency(summary.leaveDeduction),
        "Absent Deduction",
        formatCurrency(summary.absentDeduction),
      ],
      [
        "Total Deduction",
        formatCurrency(summary.totalDeduction),
        "Net Salary",
        formatCurrency(summary.netSalary),
        "",
        "",
      ],
    ];

    autoTable(doc, {
      startY: 40,
      body: summaryRows,
      theme: "grid",

      styles: {
        fontSize: 9,
        cellPadding: 3,
      },

      columnStyles: {
        0: {
          fontStyle: "bold",
        },
        2: {
          fontStyle: "bold",
        },
        4: {
          fontStyle: "bold",
        },
      },
    });

    /*
     * EMPLOYEE TABLE
     */

    const tableStartY =
      doc.lastAutoTable.finalY + 10;

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");

    doc.text(
      "Employee-wise Attendance Details",
      14,
      tableStartY
    );

    const tableRows = items.map((item) => {
      const leaveDeduction = Number(
        item.leave_deduction || 0
      );

      const absentDeduction = Number(
        item.absent_deduction || 0
      );

      const totalDeduction =
        item.total_deduction != null
          ? Number(item.total_deduction)
          : leaveDeduction + absentDeduction;

      return [
        item.employee_name || "-",
        item.employee_code || "-",
        item.present_days ?? 0,
        item.absent_days ?? 0,
        item.approved_leave_days ?? 0,
        item.holiday_days ?? 0,
        `${Number(
          item.worked_hours || 0
        ).toFixed(2)}h`,
        formatCurrency(leaveDeduction),
        formatCurrency(absentDeduction),
        formatCurrency(totalDeduction),
        formatCurrency(item.net_salary || 0),
      ];
    });

    tableRows.push([
      "TOTAL",
      "",
      summary.presentDays,
      summary.absentDays,
      summary.leaveDays,
      summary.holidayDays,
      `${summary.workedHours.toFixed(2)}h`,
      formatCurrency(summary.leaveDeduction),
      formatCurrency(summary.absentDeduction),
      formatCurrency(summary.totalDeduction),
      formatCurrency(summary.netSalary),
    ]);

    autoTable(doc, {
      startY: tableStartY + 4,

      head: [
        [
          "Employee",
          "Code",
          "Present",
          "Absent",
          "Leave",
          "Holiday",
          "Hours",
          "Leave Deduction",
          "Absent Deduction",
          "Total Deduction",
          "Net Salary",
        ],
      ],

      body: tableRows,

      theme: "grid",

      styles: {
        fontSize: 7,
        cellPadding: 2.2,
        valign: "middle",
      },

      headStyles: {
        fontStyle: "bold",
      },

      columnStyles: {
        0: {
          cellWidth: 40,
        },
        1: {
          cellWidth: 23,
        },
        2: {
          halign: "center",
        },
        3: {
          halign: "center",
        },
        4: {
          halign: "center",
        },
        5: {
          halign: "center",
        },
        6: {
          halign: "right",
        },
        7: {
          halign: "right",
        },
        8: {
          halign: "right",
        },
        9: {
          halign: "right",
        },
        10: {
          halign: "right",
        },
      },

      didParseCell: (data) => {
        if (
          data.row.index ===
          tableRows.length - 1
        ) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    /*
     * FOOTER
     */

    const totalPages =
      doc.internal.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {
      doc.setPage(page);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");

      doc.text(
        `Monthly Attendance & Salary Report • ${selectedMonthLabel}`,
        14,
        pageHeight - 8
      );

      doc.text(
        `Page ${page} of ${totalPages}`,
        pageWidth - 14,
        pageHeight - 8,
        {
          align: "right",
        }
      );
    }

    doc.save(
      `attendance-monthly-${getMonthValue(
        year,
        month
      )}.pdf`
    );
  };

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="min-h-full space-y-6">
      {/* HEADER */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Attendance — Monthly
              </h1>

              {monthlyFetching &&
                !monthlyLoading && (
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                    Updating...
                  </span>
                )}
            </div>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Attendance, leave and salary-impact summary
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={monthlyFetching}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-xl text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
              title="Previous month"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={goToCurrentMonth}
              disabled={
                isCurrentMonth ||
                monthlyFetching
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-200"
            >
              Current Month
            </button>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              disabled={monthlyFetching}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-xl text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
              title="Next month"
            >
              ›
            </button>

            <input
              type="month"
              value={getMonthValue(
                year,
                month
              )}
              onChange={handleMonthChange}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            />

            <TableToolbar
              onRefresh={refetchMonthly}
              refreshing={monthlyFetching}
            />
          </div>
        </div>
      </div>

      {/* REPORT ACTIONS */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Monthly Report
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Download attendance and salary-impact information for{" "}
              {selectedMonthLabel}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadReport}
              disabled={
                monthlyLoading ||
                monthlyFetching ||
                !items.length
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-200"
            >
              <span>↓</span>
              Download Report
            </button>

            <button
              type="button"
              onClick={downloadPDF}
              disabled={
                monthlyLoading ||
                monthlyFetching ||
                !items.length
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>PDF</span>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* PERIOD / ATTENDANCE */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <InfoCard
          title="Reporting Period"
          value={selectedMonthLabel}
          description="Monthly attendance cycle"
        />

        <InfoCard
          title="Employees"
          value={summary.employees}
          description="Employees included"
        />

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Attendance Rate
          </p>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {attendancePercentage}%
            </p>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              {summary.presentDays} present
            </span>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  attendancePercentage,
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ATTENDANCE KPI */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Present Days"
          value={summary.presentDays}
          description="Total present days"
        />

        <SummaryCard
          title="Absent Days"
          value={summary.absentDays}
          description="Total absent days"
        />

        <SummaryCard
          title="Leave Days"
          value={summary.leaveDays}
          description="Approved leave days"
        />

        <SummaryCard
          title="Holiday Days"
          value={summary.holidayDays}
          description="Total holidays"
        />

        <SummaryCard
          title="Worked Hours"
          value={`${summary.workedHours.toFixed(2)}h`}
          description="Total worked hours"
        />

        <SummaryCard
          title="Leave Deduction"
          value={formatCurrency(
            summary.leaveDeduction
          )}
          description="Salary deduction from leave"
        />

        <SummaryCard
          title="Absent Deduction"
          value={formatCurrency(
            summary.absentDeduction
          )}
          description="Salary deduction from absence"
        />

        <SummaryCard
          title="Total Deduction"
          value={formatCurrency(
            summary.totalDeduction
          )}
          description="Leave + absence deduction"
        />

        <SummaryCard
          title="Net Salary"
          value={formatCurrency(
            summary.netSalary
          )}
          description="Total monthly net salary"
        />
      </div>

      {/* TABLE */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Employee Attendance Details
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Attendance, leave and salary deduction details
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search employee or code..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-slate-500"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <AttendanceMonthlySummaryTable
          data={filteredItems}
          loading={monthlyLoading}
        />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
}) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {title}
      </p>

      <p className="mt-2 truncate text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        {description}
      </p>
    </div>
  );
}