import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEmployeePayslip } from "./useEmployeePayslip";
import { downloadPayslipPdf } from "./payslipPdf";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import DetailList from "@/components/ui/DetailList";
import { formatCurrency } from "@/utils/formatCurrency";

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
].map((label, i) => ({ value: String(i + 1), label }));

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - i).map((y) => ({
  value: String(y),
  label: String(y),
}));

export default function PayslipPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const today = new Date();
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const { data: payslip, isLoading, isError, error } = useEmployeePayslip(id, { month, year });

  const infoRows = payslip
    ? [
        { label: "Employee Code", value: payslip.employee.employee_code || "-" },
        { label: "Department", value: payslip.employee.department || "-" },
        { label: "Designation", value: payslip.employee.designation || "-" },
        { label: "PF Number", value: payslip.employee.pf_number || "-" },
        { label: "ESI Number", value: payslip.employee.esi_number || "-" },
        { label: "Bank Account No.", value: payslip.employee.account_number || "-" },
        { label: "Basic Salary", value: formatCurrency(payslip.earnings.basic_salary) },
        { label: "Allowance", value: formatCurrency(payslip.earnings.allowance) },
        { label: "Gross Earnings", value: formatCurrency(payslip.earnings.gross_earnings) },
        { label: "PF Deduction", value: formatCurrency(payslip.deductions.pf) },
        { label: "ESI Deduction", value: formatCurrency(payslip.deductions.esi) },
        { label: "Total Deductions", value: formatCurrency(payslip.deductions.total_deductions) },
        { label: "Net Pay", value: formatCurrency(payslip.net_pay) },
      ]
    : [];

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payslip</h1>
        <Button variant="secondary" onClick={() => navigate(-1)} className="w-full sm:w-auto">
          Back
        </Button>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Select label="Month" options={MONTH_OPTIONS} value={month} onChange={(e) => setMonth(e.target.value)} />
          <Select label="Year" options={YEAR_OPTIONS} value={year} onChange={(e) => setYear(e.target.value)} />
        </div>

        {isLoading && (
          <div className="flex justify-center py-10">
            <LoadingSpinner />
          </div>
        )}

        {isError && (
          <div className="text-center py-10 text-slate-500 dark:text-slate-400">
            Failed to load payslip{error?.response?.data?.message ? `: ${error.response.data.message}` : "."}
          </div>
        )}

        {payslip && (
          <>
            <DetailList rows={infoRows} />
            <Button className="w-full mt-6" onClick={() => downloadPayslipPdf(payslip)}>
              Download Payslip PDF
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
