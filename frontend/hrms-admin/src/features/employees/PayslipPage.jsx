import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEmployeePayslip } from "./useEmployeePayslip";
import { downloadPayslipPdf } from "./payslipPdf";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { formatCurrency } from "@/utils/formatCurrency";
import { use3DTilt, useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ value: String(i + 1), label }));

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => ({
  value: String(y),
  label: String(y),
}));

const MONTH_LABELS = MONTH_OPTIONS.reduce((acc, m) => {
  acc[m.value] = m.label;
  return acc;
}, {});

// Module identity: sky — matches the rest of the Employee module.
const SKY = "text-sky-600 dark:text-sky-400";

function LineRow({ label, value, muted = false }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={muted ? "text-slate-400" : "text-slate-600 dark:text-slate-300"}>
        {label}
      </span>
      <span className={muted ? "text-slate-400" : "font-medium text-slate-800 dark:text-white"}>
        {value}
      </span>
    </div>
  );
}

export default function PayslipPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const { data: payslip, isLoading, isError, error } = useEmployeePayslip(id, { month, year });

  const cardTilt = use3DTilt({ max: 6, scale: 1.012 });
  const downloadMagnet = useMagnetic(0.2);

  return (
    <div className="mx-auto max-w-2xl">
      <Motion3DStyles />

      <div className="u-rise mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payslip</h1>
        <Button
          variant="secondary"
          onClick={() => navigate(`/employees/${id}`)}
          className="w-full transition-transform duration-200 hover:-translate-y-0.5 sm:w-auto"
        >
          Back
        </Button>
      </div>

      {/* PERIOD PICKER */}
      <div className="u-rise mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900" style={{ animationDelay: "50ms" }}>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Select label="Month" options={MONTH_OPTIONS} value={month} onChange={(e) => setMonth(e.target.value)} />
          <Select label="Year" options={YEAR_OPTIONS} value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {isError && (
        <div className="u-rise rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
          Failed to load payslip{error?.response?.data?.message ? `: ${error.response.data.message}` : "."}
        </div>
      )}

      {payslip && (
        <div className="u-rise u-tilt-perspective" style={{ animationDelay: "100ms" }}>
        <div
          ref={cardTilt.ref}
          {...cardTilt.handlers}
          className="u-tilt u-glare overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {/* LETTERHEAD */}
          <div className="u-tilt-content border-b border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {payslip.employee.company || "Company"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {payslip.employee.branch || "Branch"}
            </p>
            <p className={`mt-2 text-xs font-semibold uppercase tracking-wide ${SKY}`}>
              Payslip · {MONTH_LABELS[month]} {year}
            </p>
          </div>

          {/* EMPLOYEE INFO */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-100 px-6 py-5 text-sm dark:border-slate-800 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Employee Code</p>
              <p className="font-mono text-slate-700 dark:text-slate-200">{payslip.employee.employee_code || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Department</p>
              <p className="text-slate-700 dark:text-slate-200">{payslip.employee.department || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Designation</p>
              <p className="text-slate-700 dark:text-slate-200">{payslip.employee.designation || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">PF Number</p>
              <p className="font-mono text-slate-700 dark:text-slate-200">{payslip.employee.pf_number || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">ESI Number</p>
              <p className="font-mono text-slate-700 dark:text-slate-200">{payslip.employee.esi_number || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Bank Account No.</p>
              <p className="font-mono text-slate-700 dark:text-slate-200">{payslip.employee.account_number || "-"}</p>
            </div>
          </div>

          {/* EARNINGS / DEDUCTIONS */}
          <div className="grid grid-cols-1 divide-y divide-slate-100 px-6 py-5 dark:divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:gap-x-6">
            <div className="sm:pr-6">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Earnings
              </h3>
              <LineRow label="Basic Salary" value={formatCurrency(payslip.earnings.basic_salary)} />
              <LineRow label="Allowance" value={formatCurrency(payslip.earnings.allowance)} />
              <div className="mt-1 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                <LineRow label="Gross Earnings" value={formatCurrency(payslip.earnings.gross_earnings)} />
              </div>
            </div>

            <div className="pt-4 sm:pl-6 sm:pt-0">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                Deductions
              </h3>
              <LineRow label="PF Deduction" value={formatCurrency(payslip.deductions.pf)} />
              <LineRow label="ESI Deduction" value={formatCurrency(payslip.deductions.esi)} />
              <div className="mt-1 border-t border-slate-100 pt-1.5 dark:border-slate-800">
                <LineRow label="Total Deductions" value={formatCurrency(payslip.deductions.total_deductions)} />
              </div>
            </div>
          </div>

          {/* NET PAY */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-emerald-50 px-6 py-5 dark:border-slate-800 dark:bg-emerald-500/10">
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Net Pay
            </span>
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(payslip.net_pay)}
            </span>
          </div>

          {/* DOWNLOAD */}
          <div className="px-6 py-5">
            <div ref={downloadMagnet.ref} {...downloadMagnet.handlers} className="w-full will-change-transform">
              <Button className="w-full shadow-sm transition-shadow duration-200 hover:shadow-lg" onClick={() => downloadPayslipPdf(payslip)}>
                Download Payslip PDF
              </Button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}