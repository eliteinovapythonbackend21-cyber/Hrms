import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ReportFilterBar from "./components/ReportFilterBar";

import {
  useAttendanceReport,
  useMonthlyPayslipReport,
} from "./useAttendanceReports";

import { useToast } from "@/components/feedback/Toast";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

/*
 * ============================================================
 * MONTH NAMES
 * ============================================================
 */

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

/*
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

export default function AttendanceReportsPage() {
  const navigate = useNavigate();

  const { showToast } = useToast();

  /*
   * ==========================================================
   * REPORT MUTATIONS
   * ==========================================================
   */

  const attendanceReport =
    useAttendanceReport();

  const monthlyPayslipReport =
    useMonthlyPayslipReport();

  /*
   * ==========================================================
   * MODALS
   * ==========================================================
   */

  const [
    showAttendanceModal,
    setShowAttendanceModal,
  ] = useState(false);

  const [
    showPayslipModal,
    setShowPayslipModal,
  ] = useState(false);

  /*
   * ==========================================================
   * MONTH STATE
   * ==========================================================
   */

  const now = new Date();

  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(
    now.getMonth() + 1
  );

  const [
    selectedYear,
    setSelectedYear,
  ] = useState(
    now.getFullYear()
  );

  /*
   * ==========================================================
   * ATTENDANCE REPORT
   * ==========================================================
   */

  const handleAttendanceReport =
    async (params) => {
      try {
        await attendanceReport.mutateAsync(
          params
        );

        showToast(
          "Attendance report downloaded",
          "success"
        );

        setShowAttendanceModal(
          false
        );
      } catch (err) {
        showToast(
          err?.response?.data?.message ||
            "Failed to generate attendance report",
          "error"
        );
      }
    };

  /*
   * ==========================================================
   * MONTHLY PAYSLIP REPORT
   * ==========================================================
   */

  const handlePayslipReport =
    async () => {
      try {
        await monthlyPayslipReport.mutateAsync(
          {
            month: selectedMonth,
            year: selectedYear,
          }
        );

        showToast(
          `Monthly payslip report for ${
            MONTH_NAMES[
              selectedMonth - 1
            ]
          } ${selectedYear} downloaded`,
          "success"
        );

        setShowPayslipModal(
          false
        );
      } catch (err) {
        showToast(
          err?.response?.data?.message ||
            "Failed to generate monthly payslip report",
          "error"
        );
      }
    };

  /*
   * ==========================================================
   * CHANGE MONTH
   * ==========================================================
   */

  const changeMonth = (
    direction
  ) => {
    let nextMonth =
      selectedMonth +
      direction;

    let nextYear =
      selectedYear;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }

    setSelectedMonth(
      nextMonth
    );

    setSelectedYear(
      nextYear
    );
  };

  /*
   * ==========================================================
   * CURRENT MONTH
   * ==========================================================
   */

  const isCurrentMonth =
    selectedMonth ===
      now.getMonth() + 1 &&
    selectedYear ===
      now.getFullYear();

  const goToCurrentMonth =
    () => {
      setSelectedMonth(
        now.getMonth() + 1
      );

      setSelectedYear(
        now.getFullYear()
      );
    };

  /*
   * ==========================================================
   * MONTH LABEL
   * ==========================================================
   */

  const selectedMonthLabel =
    `${
      MONTH_NAMES[
        selectedMonth - 1
      ]
    } ${selectedYear}`;

  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  return (
    <div className="min-h-full space-y-6">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-xl dark:bg-primary-500/10">
                📊
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Attendance Reports
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Generate HR attendance and monthly
                  payslip reports.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() =>
              navigate("/attendance")
            }
            className="w-full sm:w-auto"
          >
            Back to Attendance
          </Button>
        </div>
      </div>

      {/* =====================================================
          REPORT OVERVIEW
      ====================================================== */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ===================================================
            ATTENDANCE REPORT
        ==================================================== */}

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary-50 dark:bg-primary-500/10" />

          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-xl dark:bg-primary-500/10">
                📅
              </div>

              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                HR Report
              </span>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Attendance Report
            </h2>

            <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500 dark:text-slate-400">
              Download employee attendance records
              for a selected date range.
            </p>

            <div className="mt-6">
              <Button
                onClick={() =>
                  setShowAttendanceModal(
                    true
                  )
                }
                className="w-full"
              >
                Generate Attendance Report
              </Button>
            </div>
          </div>
        </div>

        {/* ===================================================
            MONTHLY PAYSLIP REPORT
        ==================================================== */}

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-emerald-50 dark:bg-emerald-500/10" />

          <div className="relative">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl dark:bg-emerald-500/10">
                💳
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                Monthly
              </span>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Monthly Payslip Report
            </h2>

            <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500 dark:text-slate-400">
              Generate the monthly payslip report
              for a selected payroll month.
            </p>

            <div className="mt-6">
              <Button
                onClick={() =>
                  setShowPayslipModal(
                    true
                  )
                }
                className="w-full"
              >
                Generate Monthly Payslip
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          QUICK MONTH SELECTOR
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Payslip Reporting Period
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {selectedMonthLabel}
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Selected month for the monthly payslip
              report.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                changeMonth(-1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Previous month"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={
                goToCurrentMonth
              }
              disabled={
                isCurrentMonth
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Current Month
            </button>

            <button
              type="button"
              onClick={() =>
                changeMonth(1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Next month"
            >
              ›
            </button>

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {MONTH_NAMES.map(
                (
                  name,
                  index
                ) => (
                  <option
                    key={name}
                    value={index + 1}
                  >
                    {name}
                  </option>
                )
              )}
            </select>

            <select
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(
                  Number(
                    event.target.value
                  )
                )
              }
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              {Array.from(
                {
                  length: 6,
                },
                (_, index) =>
                  now.getFullYear() -
                  3 +
                  index
              ).map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================
          ATTENDANCE REPORT MODAL
      ====================================================== */}

      <Modal
        open={
          showAttendanceModal
        }
        onClose={() =>
          setShowAttendanceModal(
            false
          )
        }
        title="Generate Attendance Report"
        size="sm"
      >
        <ReportFilterBar
          onGenerate={
            handleAttendanceReport
          }
          loading={
            attendanceReport.isPending
          }
          label="Download Attendance Report"
        />
      </Modal>

      {/* =====================================================
          MONTHLY PAYSLIP MODAL
      ====================================================== */}

      <Modal
        open={showPayslipModal}
        onClose={() =>
          setShowPayslipModal(
            false
          )
        }
        title="Generate Monthly Payslip Report"
        size="sm"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Reporting Month
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {selectedMonthLabel}
            </p>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              The report will be generated for the
              selected month.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Month
              </label>

              <select
                value={
                  selectedMonth
                }
                onChange={(
                  event
                ) =>
                  setSelectedMonth(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {MONTH_NAMES.map(
                  (
                    name,
                    index
                  ) => (
                    <option
                      key={name}
                      value={
                        index + 1
                      }
                    >
                      {name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Year
              </label>

              <select
                value={
                  selectedYear
                }
                onChange={(
                  event
                ) =>
                  setSelectedYear(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {Array.from(
                  {
                    length: 6,
                  },
                  (_, index) =>
                    now.getFullYear() -
                    3 +
                    index
                ).map(
                  (year) => (
                    <option
                      key={year}
                      value={year}
                    >
                      {year}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() =>
                setShowPayslipModal(
                  false
                )
              }
              disabled={
                monthlyPayslipReport.isPending
              }
            >
              Cancel
            </Button>

            <Button
              onClick={
                handlePayslipReport
              }
              disabled={
                monthlyPayslipReport.isPending
              }
            >
              {monthlyPayslipReport.isPending
                ? "Generating..."
                : "Download Payslip Report"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}